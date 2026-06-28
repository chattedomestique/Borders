import {
  forwardRef, useImperativeHandle, useRef, useEffect, useCallback, useState
} from 'react'
import './BorderCanvas.css'

// The inner media (without border) is scaled so its longest side = OUT_SIZE.
// The border pixels are then ADDED around it, so the border is always uniform
// on all four sides regardless of the media's aspect ratio.
const OUT_SIZE = 1800

function sampleAverageColor(imageData) {
  const { data } = imageData
  let r = 0, g = 0, b = 0, count = 0
  for (let i = 0; i < data.length; i += 16) {
    const a = data[i + 3]
    if (a < 128) continue
    r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
  }
  if (count === 0) return [200, 200, 200]
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      default: h = ((r - g) / d + 4) / 6
    }
  }
  return [h * 360, s * 100, l * 100]
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) { r = g = b = l }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function grabFrame(source, w, h) {
  const tmp = document.createElement('canvas')
  tmp.width = w; tmp.height = h
  const ctx = tmp.getContext('2d')
  ctx.drawImage(source, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

/**
 * One separable box-blur pass (horizontal, then vertical) on ImageData.
 * Seeding starts at index 0 so the running sum is never inflated by
 * phantom edge pixels. Three passes of this ≈ a Gaussian blur.
 */
function boxBlurPass(data, w, h, r) {
  const tmp = new Uint8ClampedArray(data.length)

  // Horizontal pass: data → tmp
  for (let y = 0; y < h; y++) {
    const row = y * w
    let R = 0, G = 0, B = 0
    // Seed: sum pixels 0 … min(r, w-1) only — no phantom repeats
    for (let k = 0; k <= Math.min(r, w - 1); k++) {
      const i = (row + k) * 4
      R += data[i]; G += data[i + 1]; B += data[i + 2]
    }
    for (let x = 0; x < w; x++) {
      const cnt = Math.min(x + r, w - 1) - Math.max(x - r, 0) + 1
      const o = (row + x) * 4
      tmp[o] = R / cnt; tmp[o + 1] = G / cnt; tmp[o + 2] = B / cnt; tmp[o + 3] = 255
      if (x - r >= 0)       { const i = (row + x - r) * 4;     R -= data[i]; G -= data[i+1]; B -= data[i+2] }
      if (x + r + 1 < w)    { const i = (row + x + r + 1) * 4; R += data[i]; G += data[i+1]; B += data[i+2] }
    }
  }

  // Vertical pass: tmp → data
  for (let x = 0; x < w; x++) {
    let R = 0, G = 0, B = 0
    for (let k = 0; k <= Math.min(r, h - 1); k++) {
      const i = (k * w + x) * 4
      R += tmp[i]; G += tmp[i + 1]; B += tmp[i + 2]
    }
    for (let y = 0; y < h; y++) {
      const cnt = Math.min(y + r, h - 1) - Math.max(y - r, 0) + 1
      const o = (y * w + x) * 4
      data[o] = R / cnt; data[o + 1] = G / cnt; data[o + 2] = B / cnt; data[o + 3] = 255
      if (y - r >= 0)       { const i = ((y - r) * w + x) * 4;     R -= tmp[i]; G -= tmp[i+1]; B -= tmp[i+2] }
      if (y + r + 1 < h)    { const i = ((y + r + 1) * w + x) * 4; R += tmp[i]; G += tmp[i+1]; B += tmp[i+2] }
    }
  }
}

/**
 * Frosted glass via JavaScript box blur — works on all iOS Safari versions.
 * ctx.filter('blur') is silently ignored pre-iOS 18; bilinear upscaling of a
 * tiny canvas looks blocky. JS box blur on a 240px canvas is ~3 ms on mobile
 * and produces genuinely smooth data before upscaling.
 */
function applyVibrance(data, amount) {
  if (!amount) return
  const v = amount / 100
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const sat = max === 0 ? 0 : (max - min) / max
    const boost = v * (1 - Math.min(sat * 1.5, 1))
    if (boost > 0) {
      const avg = (r + g + b) / 3
      data[i]     = Math.min(255, Math.max(0, Math.round((r + (r - avg) * boost) * 255)))
      data[i + 1] = Math.min(255, Math.max(0, Math.round((g + (g - avg) * boost) * 255)))
      data[i + 2] = Math.min(255, Math.max(0, Math.round((b + (b - avg) * boost) * 255)))
    }
  }
}

function drawFrostedBg(ctx, source, canvasW, canvasH, blurAmount, frostSettings, cache) {
  const { brightness = -15, contrast = 0, saturation = 60, vibrance = 0 } = frostSettings ?? {}
  const srcW = source.videoWidth ?? source.naturalWidth ?? canvasW
  const srcH = source.videoHeight ?? source.naturalHeight ?? canvasH
  const longest = Math.max(canvasW, canvasH)

  // 240px on the longest side — good quality/speed balance (8× upscale max)
  const SMALL = 240
  const scale = SMALL / longest
  const sw = Math.max(4, Math.round(canvasW * scale))
  const sh = Math.max(4, Math.round(canvasH * scale))

  if (!cache.frost) cache.frost = document.createElement('canvas')
  if (cache.frost.width !== sw || cache.frost.height !== sh) {
    cache.frost.width = sw; cache.frost.height = sh
  }
  const fc = cache.frost.getContext('2d')
  fc.imageSmoothingEnabled = true; fc.imageSmoothingQuality = 'high'

  // Cover-fill source into working canvas
  const cs = Math.max(sw / srcW, sh / srcH)
  fc.drawImage(source, (sw - srcW * cs) / 2, (sh - srcH * cs) / 2, srcW * cs, srcH * cs)

  // 3 box-blur passes ≈ Gaussian; radius scales with blurAmount
  const r = Math.max(2, Math.round(3 + (blurAmount - 10) * 9 / 110))
  const id = fc.getImageData(0, 0, sw, sh)
  boxBlurPass(id.data, sw, sh, r)
  boxBlurPass(id.data, sw, sh, r)
  boxBlurPass(id.data, sw, sh, r)

  // Apply all adjustments pixel-by-pixel on the small canvas (ctx.filter is
  // silently ignored on iOS Safari < 18, so we do it in JS instead)
  const d = id.data
  const br = 1 + brightness / 100
  const co = 1 + contrast / 100
  const sa = Math.max(0, 1 + saturation / 100)
  const needBr = brightness !== 0
  const needCo = contrast !== 0
  const needSa = sa !== 1
  for (let i = 0; i < d.length; i += 4) {
    let rv = d[i], gv = d[i + 1], bv = d[i + 2]
    if (needBr) { rv = rv * br; gv = gv * br; bv = bv * br }
    if (needCo) {
      rv = (rv - 128) * co + 128
      gv = (gv - 128) * co + 128
      bv = (bv - 128) * co + 128
    }
    if (needSa) {
      const luma = 0.2126 * rv + 0.7152 * gv + 0.0722 * bv
      rv = luma + (rv - luma) * sa
      gv = luma + (gv - luma) * sa
      bv = luma + (bv - luma) * sa
    }
    d[i] = rv; d[i + 1] = gv; d[i + 2] = bv
  }
  applyVibrance(d, vibrance)
  fc.putImageData(id, 0, 0)

  // Upscale blurred result to output canvas
  const pad = Math.round(longest * 0.02)
  ctx.save()
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(cache.frost, -pad, -pad, canvasW + pad * 2, canvasH + pad * 2)
  ctx.restore()
}

/**
 * Film grain ported from filmgrainer by Lars Pontoppidan (MIT).
 * Gaussian noise blended via soft-light naturally attenuates grain in
 * shadows and highlights just like real film. Multi-scale layers add
 * variability: a sharp fine base + optional smooth medium/coarse clumps.
 */
function applyGrain(ctx, w, h, grainAmount, grainVariability, monochrome, animate, cache, grainSpread) {
  if (!grainAmount) return
  // σ=30 at 100% matches old 25% feel (old: 25*2.4*0.5=30)
  const sigma = grainAmount * 0.3
  const v = (grainVariability ?? 0) / 100
  const s = (grainSpread ?? 0) / 100
  const REF = 2000

  // Luminance-spread path: grain weighted by a shadow-to-highlight slope.
  // Grain is generated at w÷4 resolution (same as the fine layer) so it stays
  // sharp at full output size. Luminance is sampled separately at 160 px for
  // speed, then mapped into grain-pixel space for the per-pixel weight.
  // weight = max(0, 1 - s·L): shadows keep full grain, highlights lose it
  // linearly — every part of the tonal range responds as the slider moves.
  if (s > 0) {
    // Luminance sample canvas — small is fine, just need tonal distribution
    const LSAMP = 160
    const lscale = LSAMP / Math.max(w, h)
    const lsw = Math.max(2, Math.round(w * lscale))
    const lsh = Math.max(2, Math.round(h * lscale))
    if (!cache.lumSamp) cache.lumSamp = document.createElement('canvas')
    const lc = cache.lumSamp
    if (lc.width !== lsw || lc.height !== lsh) { lc.width = lsw; lc.height = lsh }
    const lcc = lc.getContext('2d')
    lcc.drawImage(ctx.canvas, 0, 0, lsw, lsh)
    const lumD = lcc.getImageData(0, 0, lsw, lsh).data

    // Grain canvas at w÷4 — same scale as the existing fine layer, drawn without
    // smoothing so each noise pixel maps to a crisp 4×4 block on the output.
    // Static images use a fixed 500×500 reference grid so changing the border
    // thickness (which changes totalW) doesn't cause the grain to jump.
    const GSCALE = 4
    const gw = animate ? Math.max(2, Math.round(w / GSCALE)) : Math.max(2, Math.round(REF / GSCALE))
    const gh = animate ? Math.max(2, Math.round(h / GSCALE)) : Math.max(2, Math.round(REF / GSCALE))

    if (!cache.sNoise) cache.sNoise = document.createElement('canvas')
    const nc = cache.sNoise
    const noiseSig = `${gw}x${gh}:${sigma.toFixed(2)}:${monochrome ? 1 : 0}`
    const needNoise = animate || nc.__sig !== noiseSig
    if (nc.width !== gw || nc.height !== gh) { nc.width = gw; nc.height = gh }
    const ncc = nc.getContext('2d')
    let noiseD
    if (needNoise) {
      nc.__sig = noiseSig
      const nid = ncc.createImageData(gw, gh)
      noiseD = nid.data
      for (let i = 0; i < noiseD.length; i += 4) {
        if (monochrome) {
          const u = Math.random() || 1e-10
          const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * Math.random())
          const val = Math.max(0, Math.min(255, Math.round(128 + n * sigma)))
          noiseD[i] = noiseD[i + 1] = noiseD[i + 2] = val
        } else {
          for (let c = 0; c < 3; c++) {
            const u = Math.random() || 1e-10
            const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * Math.random())
            noiseD[i + c] = Math.max(0, Math.min(255, Math.round(128 + n * sigma)))
          }
        }
        noiseD[i + 3] = 255
      }
      ncc.putImageData(nid, 0, 0)
    } else {
      noiseD = ncc.getImageData(0, 0, gw, gh).data
    }

    // Per-grain-pixel luminance weight: map grain coords → lum canvas coords
    if (!cache.wGrain) cache.wGrain = document.createElement('canvas')
    const wc = cache.wGrain
    if (wc.width !== gw || wc.height !== gh) { wc.width = gw; wc.height = gh }
    const wcc = wc.getContext('2d')
    const wid = wcc.createImageData(gw, gh)
    const wd = wid.data
    for (let gy = 0; gy < gh; gy++) {
      const ly = Math.min(lsh - 1, Math.floor(gy * lsh / gh))
      for (let gx = 0; gx < gw; gx++) {
        const lx = Math.min(lsw - 1, Math.floor(gx * lsw / gw))
        const li = (ly * lsw + lx) * 4
        const luma = (0.2126 * lumD[li] + 0.7152 * lumD[li + 1] + 0.0722 * lumD[li + 2]) / 255
        // Spread=100 → full grain in shadows, none in highlights; midtones halfway.
        // Linear slope is far more perceptible than a narrow bell curve.
        const weight = Math.max(0, 1 - s * luma)
        const gi = (gy * gw + gx) * 4
        wd[gi]     = Math.round(128 + (noiseD[gi]     - 128) * weight)
        wd[gi + 1] = Math.round(128 + (noiseD[gi + 1] - 128) * weight)
        wd[gi + 2] = Math.round(128 + (noiseD[gi + 2] - 128) * weight)
        wd[gi + 3] = 255
      }
    }
    wcc.putImageData(wid, 0, 0)

    ctx.save()
    ctx.globalCompositeOperation = 'soft-light'
    ctx.imageSmoothingEnabled = false  // sharp pixels — same as fine layer
    ctx.drawImage(wc, 0, 0, w, h)
    ctx.restore()
    return
  }

  // Standard multi-layer path (grainSpread = 0)
  // Stable reference grid for static (image) grain. Because the layer is just
  // random noise, stretching a fixed-size grid to the canvas is invisible — but
  // it lets us cache the field so it doesn't re-randomize ("dance") when an
  // unrelated control (border, crop…) is dragged. Video keeps live grain.

  const drawLayer = (cacheKey, scale, smooth, alpha) => {
    if (!cache[cacheKey]) cache[cacheKey] = document.createElement('canvas')
    const cv = cache[cacheKey]
    let needGen = animate
    let nw, nh
    if (animate) {
      nw = Math.max(2, Math.round(w / scale))
      nh = Math.max(2, Math.round(h / scale))
    } else {
      nw = nh = Math.max(2, Math.round(REF / scale))
      const sig = `${nw}:${sigma.toFixed(2)}:${monochrome ? 1 : 0}`
      if (cv.__sig !== sig) { cv.__sig = sig; needGen = true }
    }
    if (cv.width !== nw || cv.height !== nh) { cv.width = nw; cv.height = nh; needGen = true }

    if (needGen) {
      const gc = cv.getContext('2d')
      const id = gc.createImageData(nw, nh)
      const d = id.data
      for (let i = 0; i < d.length; i += 4) {
        if (monochrome) {
          const u = Math.random() || 1e-10
          const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * Math.random())
          const val = Math.max(0, Math.min(255, Math.round(128 + n * sigma)))
          d[i] = d[i + 1] = d[i + 2] = val
        } else {
          for (let c = 0; c < 3; c++) {
            const u = Math.random() || 1e-10
            const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * Math.random())
            d[i + c] = Math.max(0, Math.min(255, Math.round(128 + n * sigma)))
          }
        }
        d[i + 3] = 255
      }
      gc.putImageData(id, 0, 0)
    }

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.globalCompositeOperation = 'soft-light'
    ctx.imageSmoothingEnabled = smooth
    if (smooth) ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(cv, 0, 0, w, h)
    ctx.restore()
  }

  drawLayer('grain4', 4, false, 1.0)                                     // fine, sharp, always
  if (v > 0) drawLayer('grain10', 10, true, v * 0.65)                   // medium, smooth
  if (v > 0.4) drawLayer('grain22', 22, true, (v - 0.4) / 0.6 * 0.45) // coarse, smooth
}

function drawTextLayer(ctx, totalW, totalH, layer, bboxMap) {
  const {
    id, content, font = 'system-ui, sans-serif', size = 80,
    color = '#ffffff', align = 'center', x = 0.5, y = 0.88,
    bold = false, italic = false, opacity = 100,
    shadow = false, stroke = false, strokeColor = '#000000',
    letterSpacing = 0, wordSpacing = 0, bg = 'none', bgColor = '#000000', bgOpacity = 50,
  } = layer

  if (!content?.trim()) {
    bboxMap?.delete(id)
    return
  }

  const lines = content.split('\n')
  const lineHeight = size * 1.3
  const blockH = lines.length * lineHeight
  const px = x * totalW
  const startY = y * totalH - blockH / 2 + lineHeight / 2

  ctx.save()
  ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px ${font}`
  const canLetterSpace = 'letterSpacing' in ctx
  const canWordSpace   = 'wordSpacing' in ctx
  if (canLetterSpace) ctx.letterSpacing = `${letterSpacing}px`
  if (canWordSpace)   ctx.wordSpacing = `${wordSpacing}px`
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = opacity / 100

  // Justify ("equal spacing") stretches every line to the width of the widest
  // line — the paragraph's natural width — by widening the gaps between words,
  // so all lines fill evenly (including the last). Lines are drawn left-anchored
  // from the block's left edge; everything else keeps the center/left/right anchor.
  const isJustify = align === 'justify' && canWordSpace
  const lineWidths = lines.map(l => ctx.measureText(l).width)  // at base spacing
  const maxLineW = Math.max(...lineWidths, 0)

  // Per-line word spacing (px) when justified; null = draw at base spacing.
  // A line needs at least one inter-word gap to stretch — single-word lines
  // (and the widest line, which is already at target) keep their base spacing.
  const justifySpacing = lines.map((line, i) => {
    if (!isJustify) return null
    const gaps = (line.match(/ /g) || []).length
    if (gaps === 0 || lineWidths[i] >= maxLineW) return null
    return wordSpacing + (maxLineW - lineWidths[i]) / gaps
  })

  ctx.textAlign = isJustify ? 'left' : align
  const boxLeft = (align === 'center' || isJustify) ? px - maxLineW / 2
                : align === 'right'  ? px - maxLineW
                : px
  // Where each line's pen starts. Justified lines render from the block's
  // left edge; otherwise the existing center/right/left anchor at px is used.
  const textX = isJustify ? boxLeft : px

  const lineSpacing = i => (justifySpacing[i] != null ? justifySpacing[i] : wordSpacing)
  const lineRendered = i => (justifySpacing[i] != null ? maxLineW : lineWidths[i])

  // Store bbox for hit-testing
  if (bboxMap) {
    const pad = 24
    bboxMap.set(id, {
      x: boxLeft - pad, y: startY - lineHeight / 2 - pad,
      w: maxLineW + pad * 2, h: blockH + pad * 2,
    })
  }

  // Per-line background
  if (bg !== 'none') {
    const pad = size * 0.28
    ctx.save()
    ctx.globalAlpha = (bgOpacity / 100) * (opacity / 100)
    ctx.fillStyle = bgColor
    lines.forEach((line, i) => {
      const lw = lineRendered(i)
      const lx = isJustify          ? boxLeft - pad
               : align === 'center' ? px - lw / 2 - pad
               : align === 'right'  ? px - lw - pad
               : px - pad
      const ly = startY + i * lineHeight - lineHeight / 2
      const rw = lw + pad * 2
      const rh = lineHeight
      if (bg === 'pill') {
        ctx.beginPath()
        ctx.roundRect(lx, ly, rw, rh, rh / 2)
        ctx.fill()
      } else {
        ctx.fillRect(lx, ly, rw, rh)
      }
    })
    ctx.restore()
  }

  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = size * 0.45
    ctx.shadowOffsetX = size * 0.05
    ctx.shadowOffsetY = size * 0.07
  }

  if (stroke) {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = Math.max(2, size * 0.07)
    ctx.lineJoin = 'round'
    lines.forEach((line, i) => {
      if (canWordSpace) ctx.wordSpacing = `${lineSpacing(i)}px`
      ctx.strokeText(line, textX, startY + i * lineHeight)
    })
  }

  ctx.fillStyle = color
  lines.forEach((line, i) => {
    if (canWordSpace) ctx.wordSpacing = `${lineSpacing(i)}px`
    ctx.fillText(line, textX, startY + i * lineHeight)
  })
  ctx.restore()
}

/**
 * Core render. The border is added AROUND the scaled media so it is
 * always uniform on all four sides, regardless of aspect ratio.
 */
function renderFrame(canvas, source, settings, cache, geoRef, bboxMap) {
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

// ─── Component ────────────────────────────────────────────────────────────────

const MAX_ZOOM = 6

const BorderCanvas = forwardRef(function BorderCanvas(
  { media, settings, onUpdate, pickMode, onPickColor, selectedLayerId, onSelectLayer, onUpdateLayer }, ref
) {
  const canvasRef    = useRef(null)
  const sourceRef    = useRef(null)
  const settingsRef  = useRef(settings)
  const mediaRef     = useRef(media)
  const onUpdateRef      = useRef(onUpdate)
  const onPickColorRef   = useRef(onPickColor)
  const pickModeRef      = useRef(pickMode)
  const onSelectLayerRef = useRef(onSelectLayer)
  const onUpdateLayerRef = useRef(onUpdateLayer)
  const selectedLayerIdRef = useRef(selectedLayerId)
  const animFrameRef = useRef(null)
  const cacheRef     = useRef({})
  const geoRef       = useRef({ totalW: OUT_SIZE, totalH: OUT_SIZE, scaledW: OUT_SIZE, scaledH: OUT_SIZE,
                                offsetX: 0, offsetY: 0, srcW: 1, srcH: 1, mediaW: 1, mediaH: 1 })
  const textBBoxesRef = useRef(new Map())  // Map<layerId, bbox> in canvas coords
  const pointersRef   = useRef(new Map())  // active pointer positions
  const pinchRef      = useRef(null)       // pinch-zoom start state
  const dragRef       = useRef(null)       // single-pointer drag start state
  const lastTapRef    = useRef({ time: 0, x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingText, setIsDraggingText] = useState(false)
  const [ready, setReady] = useState(false)

  settingsRef.current      = settings
  mediaRef.current         = media
  onUpdateRef.current      = onUpdate
  onPickColorRef.current   = onPickColor
  pickModeRef.current      = pickMode
  onSelectLayerRef.current = onSelectLayer
  onUpdateLayerRef.current = onUpdateLayer
  selectedLayerIdRef.current = selectedLayerId

  const redraw = useCallback(() => {
    renderFrame(canvasRef.current, sourceRef.current, settingsRef.current, cacheRef.current, geoRef, textBBoxesRef.current)
  }, [])

  const stopLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [])

  const startLoop = useCallback(() => {
    stopLoop()
    const loop = () => {
      renderFrame(canvasRef.current, sourceRef.current, settingsRef.current, cacheRef.current, geoRef, textBBoxesRef.current)
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
  }, [stopLoop])

  // ── Pinch-to-zoom, drag-to-pan, double-tap-to-reset ──────────────────────────

  const handlePointerDown = useCallback((e) => {
    // Eye-dropper mode: sample the rendered canvas pixel, skip all pan/zoom logic
    if (pickModeRef.current) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = Math.max(0, Math.min(canvas.width  - 1, Math.round((e.clientX - rect.left) * canvas.width  / rect.width)))
      const y = Math.max(0, Math.min(canvas.height - 1, Math.round((e.clientY - rect.top)  * canvas.height / rect.height)))
      const [r, g, b] = canvas.getContext('2d').getImageData(x, y, 1, 1).data
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
      onPickColorRef.current?.(hex)
      return
    }

    // Text hit-test: find the topmost layer under the tap
    if (textBBoxesRef.current.size > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      const geo = geoRef.current
      const canvasX = (e.clientX - rect.left) * geo.totalW / rect.width
      const canvasY = (e.clientY - rect.top)  * geo.totalH / rect.height
      // Iterate in reverse so the last-rendered (topmost) layer wins
      const layers = settingsRef.current.textLayers ?? []
      let hitLayer = null
      for (let i = layers.length - 1; i >= 0; i--) {
        const bb = textBBoxesRef.current.get(layers[i].id)
        if (bb && canvasX >= bb.x && canvasX <= bb.x + bb.w && canvasY >= bb.y && canvasY <= bb.y + bb.h) {
          hitLayer = layers[i]
          break
        }
      }
      if (hitLayer) {
        e.currentTarget.setPointerCapture(e.pointerId)
        onSelectLayerRef.current?.(hitLayer.id)
        dragRef.current = {
          startX: e.clientX, startY: e.clientY,
          startTextX: hitLayer.x ?? 0.5, startTextY: hitLayer.y ?? 0.5,
          layerId: hitLayer.id, rect, isText: true,
        }
        setIsDragging(true)
        setIsDraggingText(true)
        return
      }
    }

    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Double-tap: reset zoom and pan
    if (pointersRef.current.size === 1) {
      const now = Date.now()
      const last = lastTapRef.current
      if (now - last.time < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 40) {
        onUpdateRef.current?.('zoom', 1)
        onUpdateRef.current?.('panX', 0.5)
        onUpdateRef.current?.('panY', 0.5)
        lastTapRef.current = { time: 0, x: 0, y: 0 }
        return
      }
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY }
    }

    const geo = geoRef.current
    const s = settingsRef.current
    const currentZoom = s.zoom ?? 1
    const currentPanX = s.panX ?? 0.5
    const currentPanY = s.panY ?? 0.5
    const viewW = geo.mediaW / currentZoom
    const viewH = geo.mediaH / currentZoom
    const srcLeft = Math.max(0, Math.min(geo.srcW - viewW, currentPanX * geo.srcW - viewW / 2))
    const srcTop  = Math.max(0, Math.min(geo.srcH - viewH, currentPanY * geo.srcH - viewH / 2))

    if (pointersRef.current.size >= 2) {
      // Second finger down → start pinch, cancel single-pointer drag
      dragRef.current = null
      const pts = [...pointersRef.current.values()]
      const [a, b] = pts
      const startDist = Math.hypot(b.x - a.x, b.y - a.y)
      const pcx = (a.x + b.x) / 2
      const pcy = (a.y + b.y) / 2
      const rect = e.currentTarget.getBoundingClientRect()
      // Convert pinch center to normalized position in media area, then to source coords
      const mx = Math.max(0, Math.min(1, ((pcx - rect.left) * geo.totalW / rect.width  - geo.offsetX) / geo.scaledW))
      const my = Math.max(0, Math.min(1, ((pcy - rect.top)  * geo.totalH / rect.height - geo.offsetY) / geo.scaledH))
      pinchRef.current = {
        startDist,
        startZoom: currentZoom,
        pinchSrcX: srcLeft + mx * viewW,
        pinchSrcY: srcTop  + my * viewH,
        rect,
      }
    } else {
      // Single finger → drag to pan
      const rect = e.currentTarget.getBoundingClientRect()
      dragRef.current = { startX: e.clientX, startY: e.clientY, startSrcLeft: srcLeft, startSrcTop: srcTop, viewW, viewH, rect }
    }
    setIsDragging(true)
  }, [])

  const handlePointerMove = useCallback((e) => {
    // Text drag takes priority — don't update pointersRef so pinch stays inactive
    if (dragRef.current?.isText) {
      const drag = dragRef.current
      onUpdateLayerRef.current?.(drag.layerId, 'x', Math.max(0.02, Math.min(0.98, drag.startTextX + (e.clientX - drag.startX) / drag.rect.width)))
      onUpdateLayerRef.current?.(drag.layerId, 'y', Math.max(0.02, Math.min(0.98, drag.startTextY + (e.clientY - drag.startY) / drag.rect.height)))
      return
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const geo = geoRef.current

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()]
      const [a, b] = pts
      const currentDist = Math.hypot(b.x - a.x, b.y - a.y)
      const pcx = (a.x + b.x) / 2
      const pcy = (a.y + b.y) / 2
      const pinch = pinchRef.current

      const newZoom = Math.max(1, Math.min(MAX_ZOOM, pinch.startZoom * currentDist / pinch.startDist))
      const newViewW = geo.mediaW / newZoom
      const newViewH = geo.mediaH / newZoom

      // Keep the source point under the pinch center fixed as zoom changes
      const nmx = Math.max(0, Math.min(1, ((pcx - pinch.rect.left) * geo.totalW / pinch.rect.width  - geo.offsetX) / geo.scaledW))
      const nmy = Math.max(0, Math.min(1, ((pcy - pinch.rect.top)  * geo.totalH / pinch.rect.height - geo.offsetY) / geo.scaledH))
      const newSrcLeft = Math.max(0, Math.min(geo.srcW - newViewW, pinch.pinchSrcX - nmx * newViewW))
      const newSrcTop  = Math.max(0, Math.min(geo.srcH - newViewH, pinch.pinchSrcY - nmy * newViewH))

      onUpdateRef.current?.('zoom', newZoom)
      onUpdateRef.current?.('panX', (newSrcLeft + newViewW / 2) / geo.srcW)
      onUpdateRef.current?.('panY', (newSrcTop  + newViewH / 2) / geo.srcH)

    } else if (dragRef.current) {
      const drag = dragRef.current
      // Source pixels per CSS pixel: view fills scaledW logical px across the canvas's CSS width
      const srcPxPerCSS = drag.viewW * geo.totalW / (geo.scaledW * drag.rect.width)
      const newSrcLeft = Math.max(0, Math.min(geo.srcW - drag.viewW, drag.startSrcLeft - (e.clientX - drag.startX) * srcPxPerCSS))
      const newSrcTop  = Math.max(0, Math.min(geo.srcH - drag.viewH, drag.startSrcTop  - (e.clientY - drag.startY) * srcPxPerCSS))
      onUpdateRef.current?.('panX', (newSrcLeft + drag.viewW / 2) / geo.srcW)
      onUpdateRef.current?.('panY', (newSrcTop  + drag.viewH / 2) / geo.srcH)
    }
  }, [])

  const handlePointerUp = useCallback((e) => {
    pointersRef.current.delete(e.pointerId)

    if (pointersRef.current.size < 2) {
      pinchRef.current = null
    }
    if (pointersRef.current.size === 1) {
      // Transition from pinch back to drag with the remaining finger
      const geo = geoRef.current
      const s = settingsRef.current
      const viewW = geo.mediaW / (s.zoom ?? 1)
      const viewH = geo.mediaH / (s.zoom ?? 1)
      const srcLeft = Math.max(0, Math.min(geo.srcW - viewW, (s.panX ?? 0.5) * geo.srcW - viewW / 2))
      const srcTop  = Math.max(0, Math.min(geo.srcH - viewH, (s.panY ?? 0.5) * geo.srcH - viewH / 2))
      const [remainingPos] = [...pointersRef.current.values()]
      dragRef.current = {
        startX: remainingPos.x, startY: remainingPos.y,
        startSrcLeft: srcLeft, startSrcTop: srcTop,
        viewW, viewH,
        rect: e.currentTarget.getBoundingClientRect(),
      }
    }
    if (pointersRef.current.size === 0) {
      dragRef.current = null
      setIsDragging(false)
      setIsDraggingText(false)
    }
  }, [])

  // Load media
  useEffect(() => {
    setReady(false)
    stopLoop()
    cacheRef.current = {}  // clear blur cache when media changes
    if (!media?.url) return

    if (media.type === 'image') {
      const img = new Image()
      img.onload = () => { sourceRef.current = img; redraw(); setReady(true) }
      img.onerror = () => setReady(false)
      img.src = media.url
    } else {
      const video = document.createElement('video')
      video.playsInline = true
      video.muted = true
      video.loop = true
      video.preload = 'auto'
      video.crossOrigin = 'anonymous'
      video.src = media.url

      const onLoaded = () => {
        sourceRef.current = video
        video.play().catch(() => {})
        startLoop()
        setReady(true)
      }
      video.addEventListener('loadeddata', onLoaded, { once: true })
      video.load()

      return () => {
        video.removeEventListener('loadeddata', onLoaded)
        video.pause()
        stopLoop()
      }
    }
  }, [media, redraw, startLoop, stopLoop])

  // Re-render on settings change (images only; videos redraw continuously)
  useEffect(() => {
    if (!ready || mediaRef.current?.type === 'video') return
    redraw()
  }, [settings, ready, redraw])

  // Pause rAF when the page/app is hidden (battery + CPU savings)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stopLoop()
      } else if (ready && mediaRef.current?.type === 'video') {
        startLoop()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [ready, startLoop, stopLoop])

  // ── Save ──────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    async save(onProgress) {
      const canvas = canvasRef.current
      const source = sourceRef.current
      if (!canvas) return

      // ── Video ────────────────────────────────────────────────────────────
      if (mediaRef.current?.type === 'video' && source) {
        return new Promise((resolve) => {
          const FORMAT_PREFERENCE = [
            { mime: 'video/mp4;codecs=avc1', fileMime: 'video/mp4', ext: 'mp4' },
            { mime: 'video/mp4',             fileMime: 'video/mp4', ext: 'mp4' },
            { mime: 'video/webm;codecs=vp9', fileMime: 'video/webm', ext: 'webm' },
            { mime: 'video/webm',            fileMime: 'video/webm', ext: 'webm' },
          ]
          const fmt = FORMAT_PREFERENCE.find(f => MediaRecorder.isTypeSupported(f.mime))
            ?? { mime: 'video/webm', fileMime: 'video/webm', ext: 'webm' }

          source.muted = false
          const canvasStream = canvas.captureStream(30)

          let audioCleanup = null
          try {
            if (typeof source.captureStream === 'function') {
              source.captureStream().getAudioTracks().forEach(t => canvasStream.addTrack(t))
            } else if (typeof source.mozCaptureStream === 'function') {
              source.mozCaptureStream().getAudioTracks().forEach(t => canvasStream.addTrack(t))
            } else {
              const AudioCtx = window.AudioContext || window.webkitAudioContext
              const audioCtx = new AudioCtx()
              const src = audioCtx.createMediaElementSource(source)
              const dst = audioCtx.createMediaStreamDestination()
              src.connect(dst); src.connect(audioCtx.destination)
              dst.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t))
              audioCleanup = () => audioCtx.close()
            }
          } catch (e) {
            console.warn('Audio capture unavailable:', e)
          }

          const recorder = new MediaRecorder(canvasStream, { mimeType: fmt.mime })
          const chunks = []
          let rafId = null

          recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

          recorder.onstop = async () => {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null }
            const blob = new Blob(chunks, { type: fmt.fileMime })
            const filename = `border-studio.${fmt.ext}`

            source.muted = true; source.loop = true
            source.play().catch(() => {})
            if (audioCleanup) audioCleanup()
            startLoop()

            if (navigator.share && navigator.canShare) {
              const shareFile = new File([blob], filename, { type: fmt.fileMime })
              if (navigator.canShare({ files: [shareFile] })) {
                try {
                  await navigator.share({ files: [shareFile] })
                  resolve(); return
                } catch (e) {
                  if (e.name !== 'AbortError') console.warn('Share failed:', e)
                }
              }
            }

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = filename
            document.body.appendChild(a); a.click()
            document.body.removeChild(a); URL.revokeObjectURL(url)
            resolve()
          }

          const finishRecording = () => {
            if (recorder.state === 'recording') {
              recorder.requestData()
              recorder.stop()
            }
          }
          source.addEventListener('ended', finishRecording, { once: true })

          const startRecording = () => {
            recorder.start(250)
            const renderLoop = () => {
              renderFrame(canvas, source, settingsRef.current, cacheRef.current, geoRef, null)
              if (onProgress && source.duration) onProgress(source.currentTime / source.duration)
              if (!source.ended && recorder.state === 'recording') {
                rafId = requestAnimationFrame(renderLoop)
              }
            }
            rafId = requestAnimationFrame(renderLoop)
          }

          source.loop = false
          stopLoop()
          source.currentTime = 0

          source.addEventListener('seeked', () => {
            source.play()
              .then(startRecording)
              .catch(() => {
                source.muted = true
                if (audioCleanup) audioCleanup()
                source.removeEventListener('ended', finishRecording)
                resolve()
              })
          }, { once: true })
        })
      }

      // ── Image ────────────────────────────────────────────────────────────
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return
      const url = URL.createObjectURL(blob)

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'border-studio.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] })
            URL.revokeObjectURL(url); return
          } catch (e) {
            if (e.name !== 'AbortError') console.warn('Share failed:', e)
          }
        }
      }

      const a = document.createElement('a')
      a.href = url; a.download = 'border-studio.png'
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    }
  }), [startLoop, stopLoop])

  const cursor = pickMode ? 'crosshair' : (isDraggingText ? 'grabbing' : isDragging ? 'grabbing' : 'grab')
  return (
    <div
      className="border-canvas"
      style={{ cursor, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        className={`border-canvas__el${ready ? ' border-canvas__el--ready' : ''}`}
        aria-label="Preview of your bordered media"
      />
      {!ready && (
        <div className="border-canvas__loading" aria-hidden="true">
          <div className="border-canvas__spinner"/>
        </div>
      )}
    </div>
  )
})

export default BorderCanvas
