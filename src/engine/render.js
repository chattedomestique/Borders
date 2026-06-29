// Core render orchestrator. Pure canvas work — no React.
import { sampleAverageColor, rgbToHsl, hslToRgb, grabFrame } from './color.js'
import { drawFrostedBg } from './background.js'
import { applyGrain } from './grain.js'
import { drawTextLayer } from './text.js'

// The inner media (without border) is scaled so its longest side = OUT_SIZE.
// The border pixels are then ADDED around it, so the border is always uniform
// on all four sides regardless of the media's aspect ratio.
export const OUT_SIZE = 1800

/**
 * Core render. The border is added AROUND the scaled media so it is
 * always uniform on all four sides, regardless of aspect ratio.
 */
export function renderFrame(canvas, source, settings, cache, geoRef, bboxMap) {
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
}
