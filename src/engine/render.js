// Core render orchestrator. Pure canvas work — no React.
import { sampleAverageColor, rgbToHsl, hslToRgb, grabFrame } from './color.js'
import { drawFrostedBg } from './background.js'
import { applyGrain } from './grain.js'
import { drawTextLayer } from './text.js'

// The inner media (without border) is scaled so its longest side = OUT_SIZE.
// The border pixels are then ADDED around it, so the border is always uniform
// on all four sides regardless of the media's aspect ratio.
export const OUT_SIZE = 1800

// Snap grid resolution. 1/12 conveniently lands on center (6/12), the
// rule-of-thirds (4/12, 8/12) and the quarters (3/12, 9/12).
export const GRID_DIVISIONS = 12

/**
 * Selection indicator around the active text layer — a thin accent outline with
 * small corner dots. Transient (never exported), like the grid.
 */
function drawSelectionBox(ctx, bb, w, h) {
  const u = Math.max(2, Math.round(Math.min(w, h) / 650))
  const r = Math.max(0, Math.min(18, bb.w / 2, bb.h / 2))
  ctx.save()
  ctx.strokeStyle = 'rgba(208, 94, 41, 0.95)'
  ctx.lineWidth = u
  ctx.beginPath()
  ctx.roundRect(bb.x, bb.y, bb.w, bb.h, r)
  ctx.stroke()
  ctx.fillStyle = 'rgba(208, 94, 41, 0.95)'
  for (const [cx, cy] of [[bb.x, bb.y], [bb.x + bb.w, bb.y], [bb.x, bb.y + bb.h], [bb.x + bb.w, bb.y + bb.h]]) {
    ctx.beginPath(); ctx.arc(cx, cy, u * 1.7, 0, 6.2832); ctx.fill()
  }
  ctx.restore()
}

/**
 * Transient alignment grid drawn on top of the composite while a text layer is
 * being dragged. It is NOT part of `settings`, so it never lands in history and
 * never bakes into an exported frame (export renders with overlay = null).
 */
function drawGridOverlay(ctx, w, h, divisions = GRID_DIVISIONS) {
  const unit = Math.max(1, Math.round(Math.min(w, h) / 1000))
  const stroke = (x1, y1, x2, y2, lw, color) => {
    ctx.lineWidth = lw; ctx.strokeStyle = color
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  }
  ctx.save()
  ctx.lineCap = 'butt'
  // Interior grid lines — a dark underlay + light line keeps them visible on
  // any background (light photo, dark photo, or the bright border).
  for (let i = 1; i < divisions; i++) {
    const x = Math.round(w * i / divisions) + 0.5
    const y = Math.round(h * i / divisions) + 0.5
    stroke(x, 0, x, h, unit * 2, 'rgba(0, 0, 0, 0.22)')
    stroke(0, y, w, y, unit * 2, 'rgba(0, 0, 0, 0.22)')
    stroke(x, 0, x, h, unit, 'rgba(255, 255, 255, 0.5)')
    stroke(0, y, w, y, unit, 'rgba(255, 255, 255, 0.5)')
  }
  // Emphasised centre cross — accent over a dark halo
  const cx = Math.round(w / 2) + 0.5, cy = Math.round(h / 2) + 0.5
  stroke(cx, 0, cx, h, unit * 3, 'rgba(0, 0, 0, 0.3)')
  stroke(0, cy, w, cy, unit * 3, 'rgba(0, 0, 0, 0.3)')
  stroke(cx, 0, cx, h, unit * 2, 'rgba(232, 120, 60, 0.95)')
  stroke(0, cy, w, cy, unit * 2, 'rgba(232, 120, 60, 0.95)')
  ctx.restore()
}

/**
 * Core render. The border is added AROUND the scaled media so it is
 * always uniform on all four sides, regardless of aspect ratio.
 */
export function renderFrame(canvas, source, settings, cache, geoRef, bboxMap, overlay = null) {
  if (!canvas || !source) return
  const { borderThickness, bgMode, bgColor = '#ffffff', blurAmount = 60, cornerRadius, cropRatio = 'free',
          zoom = 1, panX = 0.5, panY = 0.5,
          showMedia = true, grainAmount = 0, grainVariability = 0, grainMonochrome = true, grainSpread = 0,
          frostBrightness = -15, frostContrast = 0, frostSaturation = 60, frostVibrance = 0,
          textLayers = [] } = settings

  const isVideo = typeof source.videoWidth === 'number'
  const srcW = source.videoWidth ?? source.naturalWidth ?? source.width ?? 1
  const srcH = source.videoHeight ?? source.naturalHeight ?? source.height ?? 1

  let mediaW, mediaH
  if (!cropRatio || cropRatio === 'free') {
    mediaW = srcW; mediaH = srcH
  } else {
    const [tw, th] = cropRatio.split(':').map(Number)
    const targetRatio = tw / th
    const sourceRatio = srcW / srcH
    if (targetRatio >= sourceRatio) {
      mediaW = srcW; mediaH = Math.round(srcW / targetRatio)
    } else {
      mediaH = srcH; mediaW = Math.round(srcH * targetRatio)
    }
  }

  // Scale inner media so its longest side = OUT_SIZE
  const mediaScale = OUT_SIZE / Math.max(mediaW, mediaH)
  const scaledW = Math.round(mediaW * mediaScale)
  const scaledH = Math.round(mediaH * mediaScale)

  // Canvas = scaled media + uniform border on all four sides
  const border = borderThickness
  const totalW = scaledW + border * 2
  const totalH = scaledH + border * 2
  const offsetX = border
  const offsetY = border

  if (canvas.width !== totalW || canvas.height !== totalH) {
    canvas.width = totalW
    canvas.height = totalH
  }
  if (geoRef) geoRef.current = { totalW, totalH, scaledW, scaledH, offsetX, offsetY, srcW, srcH, mediaW, mediaH }
  const ctx = canvas.getContext('2d')

  // 1. Background
  if (bgMode === 'frosted') {
    drawFrostedBg(ctx, source, totalW, totalH, blurAmount,
      { brightness: frostBrightness, contrast: frostContrast, saturation: frostSaturation, vibrance: frostVibrance },
      cache)
  } else if (bgMode === 'color') {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, totalW, totalH)
  } else {
    const imageData = grabFrame(source, Math.min(srcW, 200), Math.min(srcH, 200))
    const [avgR, avgG, avgB] = sampleAverageColor(imageData)
    const [avgH, avgS, avgL] = rgbToHsl(avgR, avgG, avgB)

    let bgColor
    if (bgMode === 'average') {
      bgColor = `rgb(${avgR},${avgG},${avgB})`
    } else if (bgMode === 'contrast') {
      const lum = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB
      const [r, g, b] = hslToRgb((avgH + 180) % 360, Math.min(avgS * 0.7, 80), lum > 128 ? 15 : 92)
      bgColor = `rgb(${r},${g},${b})`
    } else if (bgMode === 'complementary') {
      const [r, g, b] = hslToRgb(
        (avgH + 180) % 360,
        Math.min(avgS * 1.1, 100),
        avgL > 60 ? Math.max(avgL - 30, 30) : Math.min(avgL + 25, 70)
      )
      bgColor = `rgb(${r},${g},${b})`
    }
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, totalW, totalH)
  }

  // 2. Media with zoom/pan and optional corner radius clip
  if (showMedia) {
    // View box in source image coordinates: mediaW/zoom × mediaH/zoom pixels
    // centered at pan position, clamped to stay within source bounds
    const viewW = mediaW / zoom
    const viewH = mediaH / zoom
    const srcLeft = Math.max(0, Math.min(srcW - viewW, panX * srcW - viewW / 2))
    const srcTop  = Math.max(0, Math.min(srcH - viewH, panY * srcH - viewH / 2))

    const rx = cornerRadius > 0 ? Math.min(scaledW, scaledH) / 2 * (cornerRadius / 400) : 0

    ctx.save()
    if (rx > 0) {
      const x = offsetX, y = offsetY, w = scaledW, h = scaledH
      ctx.beginPath()
      ctx.moveTo(x + rx, y)
      ctx.lineTo(x + w - rx, y);  ctx.quadraticCurveTo(x + w, y,     x + w, y + rx)
      ctx.lineTo(x + w, y + h - rx); ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h)
      ctx.lineTo(x + rx, y + h);  ctx.quadraticCurveTo(x,     y + h, x,     y + h - rx)
      ctx.lineTo(x, y + rx);      ctx.quadraticCurveTo(x,     y,     x + rx, y)
      ctx.closePath()
      ctx.clip()
    }

    ctx.drawImage(source, srcLeft, srcTop, viewW, viewH, offsetX, offsetY, scaledW, scaledH)
    ctx.restore()
  }

  // 3. Film grain over the full composite — after media so it sits on the photo
  //    and border together. Spread mode samples canvas luminance to concentrate
  //    grain in shadow/midtone regions (Fuji T-grain behaviour).
  applyGrain(ctx, totalW, totalH, grainAmount, grainVariability, grainMonochrome, isVideo, cache, grainSpread)

  // 4. Text layers (drawn last, on top of everything)
  if (bboxMap) bboxMap.clear()
  textLayers.forEach(layer => drawTextLayer(ctx, totalW, totalH, layer, bboxMap))

  // 5. Transient overlays (never persisted, never exported): the drag-time
  //    alignment grid, and the selection box around the active text layer.
  if (overlay?.grid) drawGridOverlay(ctx, totalW, totalH)
  if (overlay?.selectedId && bboxMap) {
    const bb = bboxMap.get(overlay.selectedId)
    if (bb) drawSelectionBox(ctx, bb, totalW, totalH)
  }
}
