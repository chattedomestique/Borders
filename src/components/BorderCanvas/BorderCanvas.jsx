import {
  forwardRef, useImperativeHandle, useRef, useEffect, useCallback, useState
} from 'react'
import './BorderCanvas.css'
import { buildBorderSuggestions } from '../../palette'
import { hashNoise, fbm, seedFromId } from '../../noise'

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

/**
 * Measure a text layer's block geometry without drawing. Sets font + spacing on
 * the passed context (so measureText is accurate) and returns everything the
 * painter needs. Shared by the normal draw, the motion-blur offscreen pass, and
 * hit-testing so all three stay perfectly aligned.
 */
function measureBlock(ctx, layer) {
  const {
    content, font = 'system-ui, sans-serif', size = 80,
    align = 'center', bold = false, italic = false,
    letterSpacing = 0, wordSpacing = 0, lineHeight: lineHeightMul = 1.3,
  } = layer

  ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px ${font}`
  const canWordSpace = 'wordSpacing' in ctx
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`
  if (canWordSpace)           ctx.wordSpacing = `${wordSpacing}px`

  const lines = content.split('\n')
  const lineHeight = size * lineHeightMul
  const blockH = lines.length * lineHeight
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

  return { lines, lineHeight, blockH, isJustify, lineWidths, maxLineW, justifySpacing, canWordSpace }
}

// Left edge of the text block in canvas coords, given the per-align anchor px.
function blockLeftFor(align, isJustify, px, maxLineW) {
  return (align === 'center' || isJustify) ? px - maxLineW / 2
       : align === 'right'                 ? px - maxLineW
       : px
}

/**
 * Paint a measured text block with its horizontal anchor at px and its vertical
 * centre at blockCenterY. Self-contained (re-applies font + spacing) so it works
 * on an offscreen canvas too. opts.alpha scales the whole block; opts.drawBg /
 * opts.drawShadow let the motion-trail pass omit the background and drop shadow.
 */
function paintBlock(ctx, layer, geom, px, blockCenterY, opts = {}) {
  const { drawBg = false, drawShadow = false, alpha = 1 } = opts
  const {
    font = 'system-ui, sans-serif', size = 80, color = '#ffffff', align = 'center',
    bold = false, italic = false, letterSpacing = 0, wordSpacing = 0,
    shadow = false, stroke = false, strokeColor = '#000000', strokeWidth = 35,
    bg = 'none', bgColor = '#000000', bgOpacity = 50,
  } = layer
  const { lines, lineHeight, blockH, isJustify, lineWidths, maxLineW, justifySpacing, canWordSpace } = geom

  ctx.save()
  ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px ${font}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`
  if (canWordSpace)           ctx.wordSpacing = `${wordSpacing}px`
  ctx.textBaseline = 'middle'
  ctx.textAlign = isJustify ? 'left' : align

  const startY = blockCenterY - blockH / 2 + lineHeight / 2
  const boxLeft = blockLeftFor(align, isJustify, px, maxLineW)
  const textX = isJustify ? boxLeft : px
  const lineSpacing  = i => (justifySpacing[i] != null ? justifySpacing[i] : wordSpacing)
  const lineRendered = i => (justifySpacing[i] != null ? maxLineW : lineWidths[i])

  // Per-line background
  if (drawBg && bg !== 'none') {
    const pad = size * 0.28
    ctx.save()
    ctx.globalAlpha = (bgOpacity / 100) * alpha
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

  ctx.globalAlpha = alpha
  if (drawShadow && shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = size * 0.45
    ctx.shadowOffsetX = size * 0.05
    ctx.shadowOffsetY = size * 0.07
  }

  if (stroke) {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = Math.max(2, size * 0.002 * strokeWidth)   // 35 ≈ the previous fixed size×0.07
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
 * Rear-curtain-sync motion blur for a text layer.
 *
 * Real rear-curtain (second-curtain) flash fires the strobe at the END of a
 * long exposure: the ambient light records the subject smearing along its path,
 * then the flash freezes a sharp frame at the final position. The result is a
 * blur trail that follows the motion and fades out behind a crisp subject.
 *
 * We reproduce that honestly rather than faking a shadow:
 *   1. Render the glyphs once into an offscreen bitmap (font shaping is the
 *      expensive part — do it a single time).
 *   2. Composite that bitmap many times along the motion vector with sub-pixel
 *      offsets, source-over, alpha rising toward the head (so the near-head
 *      smear is dense and the tail dissolves). This is a genuine directional
 *      integral of the glyph shapes — every letter streaks, not just a copy.
 *   3. The sharp "flash" frame is drawn afterwards by the caller, on top.
 *
 * `motionAngle` is the direction of travel; the trail extends opposite it (the
 * path the subject came from). `motionLength` is the trail length in px.
 * `motionSpeed` shapes the falloff: faster → a longer, wispier streak; slower →
 * a tight, dense smear hugging the subject.
 */
// Noise tile, cached by signature for static frames and regenerated every frame
// for video so the grain shimmers. `uniform` gives a flat [0,255] distribution
// (used as a dissolve threshold field — dot density then tracks coverage
// linearly); otherwise it's Gaussian (Box–Muller) centred on mid-grey.
function makeNoiseTile(cache, key, nw, nh, sigma, mono, animate, uniform) {
  if (!cache[key]) cache[key] = document.createElement('canvas')
  const cv = cache[key]
  const sig = `${nw}x${nh}:${sigma.toFixed(1)}:${mono ? 1 : 0}:${uniform ? 'u' : 'g'}`
  if (!animate && cv.__sig === sig && cv.width === nw && cv.height === nh) return cv
  if (cv.width !== nw || cv.height !== nh) { cv.width = nw; cv.height = nh }
  cv.__sig = sig
  const c = cv.getContext('2d')
  const id = c.createImageData(nw, nh)
  const d = id.data
  const sample = () => {
    if (uniform) return Math.floor(Math.random() * 256)
    const u = Math.random() || 1e-10
    const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * Math.random())
    return Math.max(0, Math.min(255, Math.round(128 + n * sigma)))
  }
  for (let i = 0; i < d.length; i += 4) {
    if (mono) {
      d[i] = d[i + 1] = d[i + 2] = sample()
    } else {
      d[i] = sample(); d[i + 1] = sample(); d[i + 2] = sample()
    }
    d[i + 3] = 255
  }
  c.putImageData(id, 0, 0)
  return cv
}

/**
 * Film grain confined to a motion-blur trail. The trail buffer `tb` holds the
 * streak (colour + a soft alpha gradient); only its covered pixels are touched.
 *
 * A noise field is built at the chosen coarseness (plus an optional coarser
 * octave for Roughness), then combined per pixel in one of two modes:
 *   • soft  — additive luminance grain on the trail colour (noise lightens and
 *             darkens it). Additive, not soft-light, because soft-light is a
 *             no-op on near-white/near-black — which is most text — so it would
 *             show nothing on a white trail.
 *   • dissolve — the noise erodes the trail's alpha, breaking the streak into
 *             grain specks instead of shading it.
 *
 * `spread` weights the grain along the motion axis toward the dim tail (a real
 * long exposure is noisiest where the ambient light was faintest), using the
 * head/tail `axis` in buffer coordinates.
 */
function applyTrailGrain(tb, cache, opts) {
  const { amount, size, variability, mono, spread = 0, dissolve = false, axis, animate } = opts
  if (!amount) return
  const w = tb.width, h = tb.height
  // Grain cell size in buffer px: Size 0 → per-pixel (~1px, a true 1:1 dither),
  // Size 100 → coarse (~16px clumps).
  const cell = 1 + (Math.max(0, Math.min(100, size)) / 100) * 15
  const nw = Math.max(2, Math.round(w / cell))
  const nh = Math.max(2, Math.round(h / cell))
  const v = Math.max(0, Math.min(100, variability)) / 100

  // Build the noise into a buffer-sized canvas (GPU upscales the small tile),
  // then sample it per pixel below. Dissolve needs a flat distribution so the
  // threshold dither's dot density tracks the trail's coverage linearly.
  const fine = makeNoiseTile(cache, 'tgFine', nw, nh, 64, mono, animate, dissolve)
  if (!cache.tgMask) cache.tgMask = document.createElement('canvas')
  const noise = cache.tgMask
  if (noise.width !== w || noise.height !== h) { noise.width = w; noise.height = h }
  const nctx = noise.getContext('2d')
  nctx.globalCompositeOperation = 'source-over'
  nctx.globalAlpha = 1
  nctx.clearRect(0, 0, w, h)
  nctx.imageSmoothingEnabled = false
  nctx.drawImage(fine, 0, 0, w, h)
  if (v > 0) {
    const cw = Math.max(2, Math.round(nw / 2.6))
    const ch = Math.max(2, Math.round(nh / 2.6))
    const coarse = makeNoiseTile(cache, 'tgCoarse', cw, ch, 64, mono, animate, dissolve)
    nctx.imageSmoothingEnabled = true
    nctx.imageSmoothingQuality = 'high'
    nctx.globalAlpha = v * 0.7
    nctx.drawImage(coarse, 0, 0, w, h)
    nctx.globalAlpha = 1
  }

  const tbctx = tb.getContext('2d')
  const tImg = tbctx.getImageData(0, 0, w, h)
  const td = tImg.data
  const nd = nctx.getImageData(0, 0, w, h).data

  const amt = Math.min(1, amount / 100)
  const sp = Math.max(0, Math.min(100, spread)) / 100
  // Spread axis (head → tail) in buffer coords; p runs 0 at the head to 1 at the tail.
  const hx = axis?.hx ?? 0, hy = axis?.hy ?? 0
  const ax = (axis?.tx ?? 0) - hx, ay = (axis?.ty ?? 0) - hy
  const len2 = ax * ax + ay * ay
  const useSpread = sp > 0 && len2 > 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const a = td[i + 3]
      if (a === 0) continue

      let g = amt
      if (useSpread) {
        let p = ((x - hx) * ax + (y - hy) * ay) / len2
        p = p < 0 ? 0 : p > 1 ? 1 : p
        g *= 1 - sp * (1 - p)   // full at tail (p=1), reduced toward head
      }
      if (g <= 0.001) continue

      if (dissolve) {
        // True Dissolve blend: opacity is a probability, never a partial
        // alpha — every pixel is fully kept or fully dropped (no gradation,
        // no anti-aliasing). Coverage sets the base dot density; Amount raises
        // the exponent so the denser body also breaks into grain instead of
        // staying solid. Kept pixels go fully opaque; the streak's own colour
        // (RGB) is untouched.
        const c = a / 255
        const pKeep = Math.pow(c, 1 + g * 2.5)   // g folds in Amount × spread weighting
        td[i + 3] = nd[i] < pKeep * 255 ? 255 : 0
      } else {
        // Additive luminance grain: signed noise added to the trail colour.
        // Visible on white (darkens) and black (lightens) alike, unlike
        // soft-light. Scales with amount; the trail's own alpha then fades it.
        const k = g * 0.85
        for (let c = 0; c < 3; c++) {
          const r = td[i + c] + (nd[i + c] - 128) * k
          td[i + c] = r < 0 ? 0 : r > 255 ? 255 : r
        }
      }
    }
  }
  tbctx.putImageData(tImg, 0, 0)
}

// Composite the glyph bitmap `off` along the motion vector into `target`, with
// the head copy landing at (ox0, oy0). Alpha rises toward the head (rear-sync).
function paintTrailCopies(target, off, ox0, oy0, vx, vy, K, peak, gamma, dens, opacityFactor) {
  target.save()
  target.imageSmoothingEnabled = true
  target.imageSmoothingQuality = 'high'
  for (let i = 0; i < K; i++) {
    const t = i / (K - 1)                      // 0 = tail, 1 = head
    const a = peak * dens * Math.pow(t, gamma) * opacityFactor
    if (a <= 0.002) continue
    target.globalAlpha = a > 1 ? 1 : a
    // Trail extends opposite the travel direction (the path the subject came from).
    target.drawImage(off, ox0 - vx * (1 - t), oy0 - vy * (1 - t))
  }
  target.restore()
}

function drawTextTrail(ctx, layer, geom, px, blockCenterY, cache, animate) {
  const {
    size = 80, opacity = 100, align = 'center', stroke = false, strokeWidth = 35,
    motionAngle = 0, motionLength = 0, motionSpeed = 60,
    trailGrain = 0, trailGrainSize = 30, trailGrainVariability = 0, trailGrainMono = true,
    trailGrainSpread = 0, trailGrainDissolve = false,
  } = layer
  const { maxLineW, blockH, isJustify } = geom
  if (maxLineW <= 0 || motionLength <= 0) return

  const angle = motionAngle * Math.PI / 180
  const vx = Math.cos(angle) * motionLength
  const vy = Math.sin(angle) * motionLength

  // Offscreen bitmap of the glyphs, padded for stroke + minor glyph overhang.
  const P = Math.ceil(size * 0.4 + (stroke ? size * 0.001 * strokeWidth : 0) + 8)
  const bw = Math.ceil(maxLineW + P * 2)
  const bh = Math.ceil(blockH + P * 2)
  if (bw < 2 || bh < 2 || bw > 4096 || bh > 4096) return

  if (!cache.textTrail) cache.textTrail = document.createElement('canvas')
  const off = cache.textTrail
  if (off.width !== bw || off.height !== bh) { off.width = bw; off.height = bh }
  const octx = off.getContext('2d')
  octx.clearRect(0, 0, bw, bh)

  // Local anchor px chosen so the block's left edge sits at P (and top at P)
  // inside the bitmap, whatever the alignment.
  const localAnchor = (align === 'center' || isJustify) ? P + maxLineW / 2
                    : align === 'right'                 ? P + maxLineW
                    : P
  paintBlock(octx, layer, geom, localAnchor, P + blockH / 2, { drawBg: false, drawShadow: false, alpha: 1 })

  // Where the sharp block's top-left lands on the main canvas → bitmap origin.
  const boxLeftMain = blockLeftFor(align, isJustify, px, maxLineW)
  const baseX = boxLeftMain - P
  const baseY = (blockCenterY - blockH / 2) - P

  const speed = Math.max(0, Math.min(100, motionSpeed)) / 100
  // Per-copy opacity at the head, calibrated at SAMPLE-px spacing. Kept low: the
  // ambient trail is dimmer than the flash-lit sharp frame, and many overlapping
  // copies still build a dense near-head smear without blowing out to solid.
  const peak = 0.09 + speed * 0.07
  // Falloff: slow → trail hugs the subject (tight, dense); fast → longer, wispier streak.
  const gamma = 2.6 - speed * 1.4
  const SAMPLE = 2                                                      // target px between copies
  const K = Math.max(12, Math.min(128, Math.round(motionLength / SAMPLE)))
  const spacing = motionLength / (K - 1)
  // Density normalisation: per-copy alpha scales with actual spacing so the
  // trail's overall density is the same whether or not K hits the cap.
  const dens = spacing / SAMPLE
  const opacityFactor = opacity / 100

  // No grain → composite straight onto the canvas (the validated fast path).
  if (!trailGrain) {
    paintTrailCopies(ctx, off, baseX, baseY, vx, vy, K, peak, gamma, dens, opacityFactor)
    return
  }

  // Grain → render the trail into its own buffer first so the grain can be
  // masked to the streak, then blit the grained trail onto the canvas once.
  const tbX = Math.floor(baseX + Math.min(0, -vx))
  const tbY = Math.floor(baseY + Math.min(0, -vy))
  const tbW = Math.ceil(bw + Math.abs(vx)) + 2
  const tbH = Math.ceil(bh + Math.abs(vy)) + 2
  if (tbW > 8192 || tbH > 8192) {   // pathological: fall back to the direct path
    paintTrailCopies(ctx, off, baseX, baseY, vx, vy, K, peak, gamma, dens, opacityFactor)
    return
  }

  if (!cache.trailBuf) cache.trailBuf = document.createElement('canvas')
  const tb = cache.trailBuf
  if (tb.width !== tbW || tb.height !== tbH) { tb.width = tbW; tb.height = tbH }
  const tbctx = tb.getContext('2d')
  tbctx.clearRect(0, 0, tbW, tbH)

  paintTrailCopies(tbctx, off, baseX - tbX, baseY - tbY, vx, vy, K, peak, gamma, dens, 1)
  // Spread axis: head (sharp end) → tail, in trail-buffer coordinates.
  const headCx = (baseX - tbX) + bw / 2
  const headCy = (baseY - tbY) + bh / 2
  applyTrailGrain(tb, cache, {
    amount: trailGrain, size: trailGrainSize,
    variability: trailGrainVariability, mono: trailGrainMono,
    spread: trailGrainSpread, dissolve: trailGrainDissolve,
    axis: { hx: headCx, hy: headCy, tx: headCx - vx, ty: headCy - vy },
    animate,
  })

  ctx.save()
  ctx.globalAlpha = opacityFactor
  ctx.drawImage(tb, tbX, tbY)
  ctx.restore()
}

// One separable box-blur pass over RGBA (all four channels), so transparency
// blurs too. Same running-sum technique as boxBlurPass but alpha-aware.
function boxBlurPass4(d, w, h, r) {
  const tmp = new Uint8ClampedArray(d.length)
  for (let y = 0; y < h; y++) {                       // horizontal: d → tmp
    const row = y * w
    let R = 0, G = 0, B = 0, A = 0
    for (let k = 0; k <= Math.min(r, w - 1); k++) {
      const i = (row + k) * 4; R += d[i]; G += d[i + 1]; B += d[i + 2]; A += d[i + 3]
    }
    for (let x = 0; x < w; x++) {
      const cnt = Math.min(x + r, w - 1) - Math.max(x - r, 0) + 1
      const o = (row + x) * 4
      tmp[o] = R / cnt; tmp[o + 1] = G / cnt; tmp[o + 2] = B / cnt; tmp[o + 3] = A / cnt
      if (x - r >= 0)    { const i = (row + x - r) * 4;     R -= d[i]; G -= d[i+1]; B -= d[i+2]; A -= d[i+3] }
      if (x + r + 1 < w) { const i = (row + x + r + 1) * 4; R += d[i]; G += d[i+1]; B += d[i+2]; A += d[i+3] }
    }
  }
  for (let x = 0; x < w; x++) {                        // vertical: tmp → d
    let R = 0, G = 0, B = 0, A = 0
    for (let k = 0; k <= Math.min(r, h - 1); k++) {
      const i = (k * w + x) * 4; R += tmp[i]; G += tmp[i + 1]; B += tmp[i + 2]; A += tmp[i + 3]
    }
    for (let y = 0; y < h; y++) {
      const cnt = Math.min(y + r, h - 1) - Math.max(y - r, 0) + 1
      const o = (y * w + x) * 4
      d[o] = R / cnt; d[o + 1] = G / cnt; d[o + 2] = B / cnt; d[o + 3] = A / cnt
      if (y - r >= 0)    { const i = ((y - r) * w + x) * 4;     R -= tmp[i]; G -= tmp[i+1]; B -= tmp[i+2]; A -= tmp[i+3] }
      if (y + r + 1 < h) { const i = ((y + r + 1) * w + x) * 4; R += tmp[i]; G += tmp[i+1]; B += tmp[i+2]; A += tmp[i+3] }
    }
  }
}

// Gaussian-ish blur of an RGBA buffer with transparency. Premultiplies so soft
// glyph edges don't pick up dark halos, runs two box passes, then unpremultiplies.
function blurRGBA(d, w, h, r) {
  if (r < 1) return
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255
    d[i] *= a; d[i + 1] *= a; d[i + 2] *= a
  }
  boxBlurPass4(d, w, h, r)
  boxBlurPass4(d, w, h, r)
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255
    if (a > 0) {
      d[i] = Math.min(255, d[i] / a)
      d[i + 1] = Math.min(255, d[i + 1] / a)
      d[i + 2] = Math.min(255, d[i + 2] / a)
    }
  }
}

// Build a blurred and/or hue-tinted variant of the glyph bitmap for one echo.
// Returns `off` untouched when no blur or tint is needed. Blur uses the same
// box-blur stack as the frosted background (ctx.filter 'blur' is ignored on
// older iOS Safari); tint recolours the glyphs via source-atop for chromatic
// echoes.
function prepareEchoBitmap(off, bw, bh, blurR, tint, cache) {
  if (blurR < 0.5 && !tint) return off
  if (!cache.echoScratch) cache.echoScratch = document.createElement('canvas')
  const sc = cache.echoScratch
  if (sc.width !== bw || sc.height !== bh) { sc.width = bw; sc.height = bh }
  const c = sc.getContext('2d')
  c.globalCompositeOperation = 'source-over'
  c.globalAlpha = 1
  c.clearRect(0, 0, bw, bh)
  c.drawImage(off, 0, 0)

  if (blurR >= 0.5) {
    const img = c.getImageData(0, 0, bw, bh)
    blurRGBA(img.data, bw, bh, Math.round(blurR))
    c.putImageData(img, 0, 0)
  }

  if (tint) {
    c.globalCompositeOperation = 'source-atop'
    c.fillStyle = tint
    c.fillRect(0, 0, bw, bh)
    c.globalCompositeOperation = 'source-over'
  }
  return sc
}

/**
 * Echo effect — the discrete cousin of the motion trail. Instead of a
 * continuous smear it stamps N decaying ghost copies of the text, spaced along
 * a direction (the After Effects Echo model: count, spacing, decay, operator).
 *
 * On top of that core it layers 2026-flavoured, mobile-safe extras: each
 * successive ghost can grow/shrink (Zoom), rotate (Spin), and hue-shift
 * (chromatic/prismatic ghosts), and the operator can be Stack (normal),
 * Screen, or Lighten for additive glow. The sharp text is drawn over the top
 * by the caller. Ghosts farther out fade (decay^i), and optionally blur more.
 */
function drawTextEcho(ctx, layer, geom, px, blockCenterY, cache) {
  const {
    size = 80, opacity = 100, align = 'center', stroke = false, strokeWidth = 35,
    echoCount = 0, echoAngle = 0, echoSpacing = 40, echoGhosting = 60,
    echoBlur = 0, echoZoom = 0, echoSpin = 0, echoHue = 0, echoBlend = 'stack',
    echoEase = 50,
  } = layer
  const { maxLineW, blockH, isJustify } = geom
  const n = Math.max(0, Math.min(16, Math.round(echoCount)))
  if (maxLineW <= 0 || n <= 0) return

  const P = Math.ceil(size * 0.4 + (stroke ? size * 0.001 * strokeWidth : 0) + 8)
  const bw = Math.ceil(maxLineW + P * 2)
  const bh = Math.ceil(blockH + P * 2)
  if (bw < 2 || bh < 2 || bw > 4096 || bh > 4096) return

  if (!cache.textEcho) cache.textEcho = document.createElement('canvas')
  const off = cache.textEcho
  if (off.width !== bw || off.height !== bh) { off.width = bw; off.height = bh }
  const octx = off.getContext('2d')
  octx.clearRect(0, 0, bw, bh)
  const localAnchor = (align === 'center' || isJustify) ? P + maxLineW / 2
                    : align === 'right'                 ? P + maxLineW : P
  paintBlock(octx, layer, geom, localAnchor, P + blockH / 2, { drawBg: false, drawShadow: false, alpha: 1 })

  // Bitmap block centre (transform pivot) and where it lands on the canvas.
  const bcx = P + maxLineW / 2
  const bcy = P + blockH / 2
  const cxMain = blockLeftFor(align, isJustify, px, maxLineW) + maxLineW / 2
  const cyMain = blockCenterY

  const ang = echoAngle * Math.PI / 180
  const ux = Math.cos(ang), uy = Math.sin(ang)
  // Spacing follows an easing curve along the run. Linear keeps even gaps;
  // positive (default) eases out — ghosts start tight and spread apart as they
  // go; negative does the reverse (start spread, bunch up at the end). The full
  // run reaches the same span (echoSpacing × count) at either extreme.
  const span = echoSpacing * n
  const k = Math.max(-100, Math.min(100, echoEase)) / 100 * 3
  const denom = Math.abs(k) < 0.01 ? 0 : Math.exp(k) - 1
  const ease = t => denom === 0 ? t : (Math.exp(k * t) - 1) / denom
  const decay = 0.2 + Math.max(0, Math.min(100, echoGhosting)) / 100 * 0.78
  const scaleStep = 1 + echoZoom / 100 * 0.18
  const spinRad = echoSpin * Math.PI / 180
  const op0 = opacity / 100

  ctx.save()
  if (echoBlend === 'screen') ctx.globalCompositeOperation = 'screen'
  else if (echoBlend === 'lighten') ctx.globalCompositeOperation = 'lighten'
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // Far ghosts first so nearer ones composite on top of them.
  for (let i = n; i >= 1; i--) {
    const fade = Math.pow(decay, i) * op0
    if (fade <= 0.004) continue
    const blurR = echoBlur > 0 ? echoBlur * (i / n) : 0
    const tint = echoHue > 0 ? `hsl(${((i * echoHue) % 360 + 360) % 360}, 85%, 60%)` : null
    const src = prepareEchoBitmap(off, bw, bh, blurR, tint, cache)
    const di = span * ease(i / n)
    ctx.save()
    ctx.globalAlpha = fade
    ctx.translate(cxMain + ux * di, cyMain + uy * di)
    if (spinRad) ctx.rotate(spinRad * i)
    if (echoZoom) { const s = Math.pow(scaleStep, i); ctx.scale(s, s) }
    ctx.drawImage(src, -bcx, -bcy)
    ctx.restore()
  }
  ctx.restore()
}

function hexToRgbTriple(hex) {
  const h = (hex || '#000000').replace('#', '')
  if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]
}

// One separable box-blur pass over a single Float32 channel (src → src via tmp).
function boxBlur1(src, tmp, w, h, r) {
  if (r < 1) return
  for (let y = 0; y < h; y++) {
    const row = y * w
    let sum = 0
    for (let k = 0; k <= Math.min(r, w - 1); k++) sum += src[row + k]
    for (let x = 0; x < w; x++) {
      const cnt = Math.min(x + r, w - 1) - Math.max(x - r, 0) + 1
      tmp[row + x] = sum / cnt
      if (x - r >= 0) sum -= src[row + x - r]
      if (x + r + 1 < w) sum += src[row + x + r + 1]
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let k = 0; k <= Math.min(r, h - 1); k++) sum += tmp[k * w + x]
    for (let y = 0; y < h; y++) {
      const cnt = Math.min(y + r, h - 1) - Math.max(y - r, 0) + 1
      src[y * w + x] = sum / cnt
      if (y - r >= 0) sum -= tmp[(y - r) * w + x]
      if (y + r + 1 < h) sum += tmp[(y + r + 1) * w + x]
    }
  }
}

// 1D squared-distance transform (Felzenszwalb & Huttenlocher) — the lower
// envelope of parabolas. Exact and O(n). Scratch arrays d/v/z are reused.
function edt1d(f, d, v, z, n) {
  let k = 0
  v[0] = 0
  z[0] = -Infinity
  z[1] = Infinity
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = Infinity
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    const dx = q - v[k]
    d[q] = dx * dx + f[v[k]]
  }
}

// Exact Euclidean distance (in px) from every pixel to the nearest "inside"
// pixel of `mask` (alpha ≥ 128). Separable: columns then rows. Cached scratch.
function distanceField(mask, w, h, cache) {
  const N = w * h
  if (!cache.edtG || cache.edtG.length < N) cache.edtG = new Float64Array(N)
  const g = cache.edtG
  for (let i = 0; i < N; i++) g[i] = mask[i] ? 0 : 1e20
  const m = Math.max(w, h)
  if (!cache.edtF || cache.edtF.length < m) {
    cache.edtF = new Float64Array(m)
    cache.edtD = new Float64Array(m)
    cache.edtV = new Int32Array(m)
    cache.edtZ = new Float64Array(m + 1)
  }
  const f = cache.edtF, d = cache.edtD, v = cache.edtV, z = cache.edtZ
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x]
    edt1d(f, d, v, z, h)
    for (let y = 0; y < h; y++) g[y * w + x] = d[y]
  }
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) f[x] = g[row + x]
    edt1d(f, d, v, z, w)
    for (let x = 0; x < w; x++) g[row + x] = d[x]
  }
  if (!cache.edtDist || cache.edtDist.length < N) cache.edtDist = new Float32Array(N)
  const dist = cache.edtDist
  for (let i = 0; i < N; i++) dist[i] = Math.sqrt(g[i])
  return dist
}

/**
 * Blob stroke — a distance-field outline that merges nearby letters into curvy
 * blobs. Built the way crisp SDF/sticker outlines are done (Red Blob Games,
 * MSDF text): compute the exact distance from each pixel to the glyph edge, then
 * keep pixels within Distance. Thresholding the *distance* (not a blurred alpha)
 * gives a HARD edge at full opacity that stays hard at any size — no feathering.
 *
 * Curviness rounds the junctions: the dilated mask is blurred then re-thresholded
 * at its steep midpoint (still crisp) to fillet the concave joins into gooey
 * curves. An optional grain layer (shared with the motion trail) sits on top,
 * with a true dissolve mode for hard grain holes.
 *
 * Pure JS on the alpha channel — no ctx.filter / SVG / WebGL.
 */
function drawTextBlob(ctx, layer, geom, px, blockCenterY, cache, animate) {
  const {
    size = 80, opacity = 100, align = 'center',
    blobDistance = 40, blobCurve = 30, blobColor = '#000000',
    blobGrain = 0, blobGrainSize = 30, blobGrainRough = 0,
    blobGrainMono = true, blobGrainDissolve = false,
  } = layer
  const { maxLineW, blockH, isJustify } = geom
  if (maxLineW <= 0) return

  const dd = Math.max(0, Math.min(100, blobDistance)) / 100
  const D = dd * size * 0.5                                       // outward stroke distance (px)
  const B = Math.round(Math.max(0, Math.min(100, blobCurve)) / 100 * size * 0.35)  // junction rounding
  const P = Math.ceil(size * 0.4 + D + B + 10)
  const bw = Math.ceil(maxLineW + P * 2)
  const bh = Math.ceil(blockH + P * 2)
  if (bw < 2 || bh < 2 || bw > 4096 || bh > 4096) return
  const w = bw, h = bh, len = w * h

  // Glyph silhouette (fill only — we read its alpha as the mask).
  if (!cache.blobGlyph) cache.blobGlyph = document.createElement('canvas')
  const og = cache.blobGlyph
  if (og.width !== w || og.height !== h) { og.width = w; og.height = h }
  const ogc = og.getContext('2d')
  ogc.clearRect(0, 0, w, h)
  const localAnchor = (align === 'center' || isJustify) ? P + maxLineW / 2
                    : align === 'right'                 ? P + maxLineW : P
  paintBlock(ogc, { ...layer, color: '#ffffff', stroke: false, bg: 'none', shadow: false },
    geom, localAnchor, P + blockH / 2, { drawBg: false, drawShadow: false, alpha: 1 })

  // Binary mask → distance field → dilated mask with a 1px hard edge.
  if (!cache.blobMask || cache.blobMask.length < len) cache.blobMask = new Uint8Array(len)
  const mask = cache.blobMask
  const sd = ogc.getImageData(0, 0, w, h).data
  for (let i = 0, j = 3; i < len; i++, j += 4) mask[i] = sd[j] >= 128 ? 1 : 0
  const dist = distanceField(mask, w, h, cache)

  if (!cache.blobA || cache.blobA.length < len) {
    cache.blobA = new Float32Array(len)
    cache.blobTmp = new Float32Array(len)
  }
  const a = cache.blobA, tmp = cache.blobTmp
  // a = 255 inside the dilated shape, 0 outside, 1px AA exactly at distance D.
  for (let i = 0; i < len; i++) {
    let u = D - dist[i] + 0.5
    a[i] = (u < 0 ? 0 : u > 1 ? 1 : u) * 255
  }

  let e0, e1
  if (B >= 1) {
    // Round the junctions: blur the dilated mask, then re-threshold at its steep
    // midpoint so the edge stays ~1px crisp while concave joins fillet into curves.
    boxBlur1(a, tmp, w, h, B)
    boxBlur1(a, tmp, w, h, B)
    boxBlur1(a, tmp, w, h, B)
    const s = Math.max(1.2, 255 / (2.5 * B) * 0.6)
    e0 = 127.5 - s; e1 = 127.5 + s
  } else {
    e0 = 0; e1 = 255          // a is already a 1px hard edge
  }
  const inv = 1 / (e1 - e0)
  const [cr, cg, cb] = hexToRgbTriple(blobColor)

  if (!cache.blobOut) cache.blobOut = document.createElement('canvas')
  const out = cache.blobOut
  if (out.width !== w || out.height !== h) { out.width = w; out.height = h }
  const octx = out.getContext('2d')
  const oimg = octx.createImageData(w, h)
  const od = oimg.data
  for (let i = 0, j = 0; i < len; i++, j += 4) {
    let u = (a[i] - e0) * inv
    u = u < 0 ? 0 : u > 1 ? 1 : u
    od[j] = cr; od[j + 1] = cg; od[j + 2] = cb
    od[j + 3] = u * u * (3 - 2 * u) * 255           // smoothstep — full opacity fill, hard edge
  }
  octx.putImageData(oimg, 0, 0)

  // Optional grain on the blob (same engine as the trail grain).
  if (blobGrain > 0) {
    applyTrailGrain(out, cache, {
      amount: blobGrain, size: blobGrainSize, variability: blobGrainRough,
      mono: blobGrainMono, spread: 0, dissolve: blobGrainDissolve, animate,
    })
  }

  const baseX = blockLeftFor(align, isJustify, px, maxLineW) - P
  const baseY = (blockCenterY - blockH / 2) - P
  ctx.save()
  ctx.globalAlpha = opacity / 100
  ctx.drawImage(out, baseX, baseY)
  ctx.restore()
}

/**
 * Signed distance to a rounded box, in the box's local space. Negative inside,
 * 0 on the edge, positive outside. Every edge style below is just a different
 * way of turning this one number into alpha — which is why they stay consistent
 * with each other and why the rect can be feathered, dithered or torn without
 * three separate rasterisers.
 */
// Peak ink coverage of a riso pass. Below 1 on purpose — see the halftone note.
const RISO_COVERAGE = 0.8

function roundedBoxSDF(lx, ly, hw, hh, r) {
  const rr = Math.min(r, hw, hh)
  const dx = Math.abs(lx) - (hw - rr)
  const dy = Math.abs(ly) - (hh - rr)
  const ox = Math.max(dx, 0), oy = Math.max(dy, 0)
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(dx, dy), 0) - rr
}

/**
 * A highlighter mark: a translucent block of ink laid over the photo.
 *
 * Authenticity notes —
 *  • A real highlighter only ever DARKENS what's under it (transparent ink over
 *    paper), which is exactly `multiply`. That's the default blend; the others
 *    are there for graphic effect, not realism.
 *  • Chisel-tip markers leave rounded ends and pool slightly darker at the
 *    stroke boundary where the ink wicks and dries — the 'marker' edge models
 *    both.
 *  • The mark is drawn into its own buffer and composited once, so the blend
 *    mode applies to the whole mark rather than to each internal step.
 *
 * Edge styles, all from the same SDF:
 *   clean  — hard rectangle, 1px antialiased.
 *   marker — feathered bleed + a denser rim (ink pooling).
 *   noisy  — the feathered edge stochastically dithered: each pixel survives
 *            with probability = its soft alpha. Diffuse, grainy dissolve.
 *   torn   — the contour displaced by coherent fBm noise, so it wanders like a
 *            paper tear, plus a sparse fibre fringe just past the edge.
 */
function drawHighlightLayer(ctx, W, H, layer, bboxMap, cache) {
  const {
    id, x = 0.5, y = 0.5, w = 0.6, h = 0.08, angle = 0,
    color = '#ffe14d', opacity = 85, blend = 'multiply',
    edge = 'marker', edgeAmount = 45,
    grain = 0, grainSize = 30, grainVariability = 0, grainMono = true, grainDissolve = false,
    texture = 'none', risoScale = 40, risoAngle = 45, risoOffset = 30,
  } = layer

  const rw = Math.max(2, w * W)
  const rh = Math.max(2, h * H)
  const hw = rw / 2, hh = rh / 2
  const seed = seedFromId(id)
  const eAmt = Math.max(0, Math.min(100, edgeAmount)) / 100
  const riso = texture === 'riso'

  // How far past the rect the edge can reach, so the buffer never clips it.
  const feather = edge === 'clean' ? 1 : 1 + eAmt * rh * (edge === 'noisy' ? 0.34 : 0.24)
  const tearAmp = eAmt * rh * 0.5
  const reach = edge === 'torn' ? tearAmp * 0.75 : feather
  const P = Math.ceil(reach + 6)
  const bw = Math.ceil(rw) + P * 2, bh = Math.ceil(rh) + P * 2
  if (bw <= 0 || bh <= 0 || bw > 6000 || bh > 6000) return

  if (!cache.hlBuf) cache.hlBuf = document.createElement('canvas')
  const buf = cache.hlBuf
  if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh }
  const bc = buf.getContext('2d', { willReadFrequently: true })
  bc.clearRect(0, 0, bw, bh)

  const [cr, cg, cb] = hexToRgbTriple(color)
  const img = bc.createImageData(bw, bh)
  const d = img.data
  const cxB = bw / 2, cyB = bh / 2
  // Corner rounding: chisel-tip markers and torn scraps both read wrong with
  // perfectly square ends.
  const round = edge === 'clean' ? 0 : rh * 0.34
  const ns = Math.max(4, rh * 0.5)             // tear lattice ~ half the mark's height
  const rPitch = Math.max(3, risoScale / 100 * rh * 0.55 + 3)
  const rca = Math.cos(risoAngle * Math.PI / 180), rsa = Math.sin(risoAngle * Math.PI / 180)

  for (let py = 0; py < bh; py++) {
    const ly = py + 0.5 - cyB
    for (let px = 0; px < bw; px++) {
      const lx = px + 0.5 - cxB
      const sd = roundedBoxSDF(lx, ly, hw, hh, round)
      let a

      if (edge === 'clean') {
        a = Math.max(0, Math.min(1, 0.5 - sd))
      } else if (edge === 'marker') {
        a = Math.max(0, Math.min(1, 0.5 - sd / feather))
        // Ink pools just inside the boundary — a subtle darker rim.
        if (a > 0 && sd > -feather * 1.6) {
          const t = (sd + feather * 0.5) / (feather * 0.9)
          a = Math.min(1, a * (1 + 0.22 * Math.exp(-t * t)))
        }
      } else if (edge === 'noisy') {
        const soft = Math.max(0, Math.min(1, 0.5 - sd / feather))
        // Stochastic dither of the feathered edge: solid core, grainy fade.
        a = hashNoise(px, py, seed) < soft ? 1 : 0
      } else { // torn
        const n = fbm(px / ns, py / ns, seed, 3) - 0.5
        const dd = sd + n * tearAmp
        a = Math.max(0, Math.min(1, 0.5 - dd))
        if (a < 1 && dd > 0 && dd < tearAmp * 0.55) {
          // Sparse fibres clinging past the tear line.
          const fib = fbm(px / (ns * 0.26), py / (ns * 0.26), seed + 991, 2)
          if (fib > 0.63) a = Math.max(a, 0.5)
        }
      }

      if (a > 0 && riso) {
        // Amplitude-modulated halftone on a rotated screen — the single most
        // recognisable riso tell. The dot grows with ink density, so the
        // feathered edge naturally breaks into shrinking dots.
        //
        // Coverage is capped below 1: a duplicator lays a thin, uneven film, so
        // even a "solid" fill keeps visible screen structure. Without the cap
        // the interior fills in completely and the screen disappears.
        const u = (px * rca - py * rsa) * Math.PI / rPitch
        const v = (px * rsa + py * rca) * Math.PI / rPitch
        const cell = (Math.sin(u) * Math.sin(v) + 1) / 2
        const mottle = 0.86 + 0.28 * fbm(px / 26, py / 26, seed + 77, 2)
        a = Math.min(1, a * mottle) * RISO_COVERAGE > cell ? 1 : 0
      }

      if (a <= 0) continue
      const i = (py * bw + px) * 4
      d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = Math.round(a * 255)
    }
  }
  bc.putImageData(img, 0, 0)

  // Grain rides on the mark itself, reusing the trail-grain engine (soft
  // luminance grain, or a true binary dissolve).
  if (grain > 0) {
    applyTrailGrain(buf, cache, {
      amount: grain, size: grainSize, variability: grainVariability,
      mono: grainMono, dissolve: grainDissolve, spread: 0,
    })
  }

  // Riso misregistration: each colour is a separate pass on a flexible master,
  // so layers land a hair off. Offset direction is seeded per layer.
  let mx = 0, my = 0
  if (riso && risoOffset > 0) {
    const ang = hashNoise(seed, 3, 17) * Math.PI * 2
    const mag = risoOffset / 100 * rh * 0.09
    mx = Math.cos(ang) * mag; my = Math.sin(ang) * mag
  }

  const cx = x * W, cy = y * H
  const rad = angle * Math.PI / 180
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(100, opacity)) / 100
  ctx.globalCompositeOperation = blend === 'normal' ? 'source-over' : blend
  ctx.translate(cx + mx, cy + my)
  if (rad) ctx.rotate(rad)
  ctx.drawImage(buf, -bw / 2, -bh / 2)
  ctx.restore()

  // Axis-aligned bounds of the (possibly rotated) mark, for tap/drag hit-tests.
  if (bboxMap) {
    const ca = Math.abs(Math.cos(rad)), sa = Math.abs(Math.sin(rad))
    const ew = hw * ca + hh * sa, eh = hw * sa + hh * ca
    bboxMap.set(id, { x: cx - ew, y: cy - eh, w: ew * 2, h: eh * 2, kind: 'highlight' })
  }
}

function drawTextLayer(ctx, totalW, totalH, layer, bboxMap, cache, animate) {
  const {
    id, content, align = 'center', x = 0.5, y = 0.88, opacity = 100,
    motionBlur = false, motionLength = 0, echo = false, echoCount = 0,
    blobStroke = false,
  } = layer

  if (!content?.trim()) {
    bboxMap?.delete(id)
    return
  }

  ctx.save()
  const geom = measureBlock(ctx, layer)
  const { maxLineW, blockH } = geom
  const px = x * totalW
  const cy = y * totalH

  // Hit-test bbox tracks the sharp text (not the trail) so dragging always grabs
  // the readable glyphs.
  if (bboxMap) {
    const pad = 24
    const boxLeft = blockLeftFor(align, geom.isJustify, px, maxLineW)
    bboxMap.set(id, {
      x: boxLeft - pad, y: cy - blockH / 2 - pad,
      w: maxLineW + pad * 2, h: blockH + pad * 2,
    })
  }

  // Echo ghosts furthest back, then the motion trail, then the blob stroke
  // hugging the glyphs, then the sharp text on top.
  if (echo && echoCount > 0 && cache) {
    drawTextEcho(ctx, layer, geom, px, cy, cache)
  }
  if (motionBlur && motionLength > 0 && cache) {
    drawTextTrail(ctx, layer, geom, px, cy, cache, animate)
  }
  if (blobStroke && cache) {
    drawTextBlob(ctx, layer, geom, px, cy, cache, animate)
  }
  paintBlock(ctx, layer, geom, px, cy, { drawBg: true, drawShadow: true, alpha: opacity / 100 })
  ctx.restore()
}

/**
 * Core render. The border is added AROUND the scaled media so it is
 * always uniform on all four sides, regardless of aspect ratio.
 */
function renderFrame(canvas, source, settings, cache, geoRef, bboxMap) {
  if (!canvas || !source) return
  const { borderThickness, bgMode, bgColor = '#ffffff', blurAmount = 60, cornerRadius, cropRatio = 'free',
          aspectMode = 'crop', zoom = 1, panX = 0.5, panY = 0.5,
          showMedia = true, grainAmount = 0, grainVariability = 0, grainMonochrome = true, grainSpread = 0,
          frostBrightness = -15, frostContrast = 0, frostSaturation = 60, frostVibrance = 0,
          textLayers = [], highlightLayers = [] } = settings

  const isVideo = typeof source.videoWidth === 'number'
  const srcW = source.videoWidth ?? source.naturalWidth ?? source.width ?? 1
  const srcH = source.videoHeight ?? source.naturalHeight ?? source.height ?? 1

  const border = borderThickness
  const hasRatio = cropRatio && cropRatio !== 'free'
  // "fit": the chosen ratio shapes the OUTPUT frame; the photo keeps its own
  // aspect and is matted (not cropped) inside, inset by >= the border.
  const fitMode = aspectMode === 'fit' && hasRatio

  // The media rectangle in source pixels. In fit mode (and free) it's the photo's
  // natural aspect; in crop mode it's cropped to the chosen ratio.
  let mediaW, mediaH
  if (fitMode || !hasRatio) {
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

  let totalW, totalH, scaledW, scaledH, offsetX, offsetY
  if (fitMode) {
    // Output canvas takes the chosen aspect ratio (longest side = OUT_SIZE).
    const [tw, th] = cropRatio.split(':').map(Number)
    const frameRatio = tw / th
    if (frameRatio >= 1) { totalW = OUT_SIZE; totalH = Math.round(OUT_SIZE / frameRatio) }
    else { totalH = OUT_SIZE; totalW = Math.round(OUT_SIZE * frameRatio) }
    // Contain-fit the photo (natural aspect) inside the frame minus the border on
    // every side — so the matte is >= border everywhere and exactly border on the
    // tight axis. If the border is too thick to leave room, the photo shrinks to 0.
    const innerW = Math.max(0, totalW - border * 2)
    const innerH = Math.max(0, totalH - border * 2)
    const mediaAspect = mediaW / mediaH
    if (innerW / innerH > mediaAspect) {
      scaledH = innerH; scaledW = Math.round(innerH * mediaAspect)
    } else {
      scaledW = innerW; scaledH = Math.round(innerW / mediaAspect)
    }
    offsetX = Math.round((totalW - scaledW) / 2)
    offsetY = Math.round((totalH - scaledH) / 2)
  } else {
    // Crop / free: scale media so its longest side = OUT_SIZE, add a uniform border.
    const mediaScale = OUT_SIZE / Math.max(mediaW, mediaH)
    scaledW = Math.round(mediaW * mediaScale)
    scaledH = Math.round(mediaH * mediaScale)
    totalW = scaledW + border * 2
    totalH = scaledH + border * 2
    offsetX = border
    offsetY = border
  }

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

  if (bboxMap) bboxMap.clear()

  // 4. Highlight marks — over the photo, under the type. That order is the
  //    physical one: you highlight the page, then write on top of it.
  highlightLayers.forEach(layer => drawHighlightLayer(ctx, totalW, totalH, layer, bboxMap, cache))

  // 5. Text layers (drawn last, on top of everything)
  textLayers.forEach(layer => drawTextLayer(ctx, totalW, totalH, layer, bboxMap, cache, isVideo))
}

// ─── Component ────────────────────────────────────────────────────────────────

const MAX_ZOOM = 6
// Inspect zoom is display-only, so it can go further than the crop zoom.
const MAX_VIEW_ZOOM = 8
const SNAP_PX = 7   // how close (screen px) a drag must get to a target before it snaps

// Snap `value` (normalized 0–1) to the nearest target within `threshold`.
// Returns [snappedValue, guidePosition|null].
function snapAxis(value, targets, threshold) {
  let best = value, bestDist = threshold, guide = null
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]
    const dist = Math.abs(value - t)
    if (dist < bestDist) { bestDist = dist; best = t; guide = t }
  }
  return [best, guide]
}

// Build the snap targets for one axis: the grid lines (i/N), the centre, the
// edge margins, and every other layer's position on that axis (smart guides).
function snapTargets(divisions, siblingPositions) {
  const t = [0.5]
  const n = Math.max(2, Math.min(12, Math.round(divisions)))
  for (let i = 1; i < n; i++) t.push(i / n)
  t.push(0.04, 0.96)                 // edge margins (matches the 0.02–0.98 drag clamp)
  for (let i = 0; i < siblingPositions.length; i++) t.push(siblingPositions[i])
  return t
}

const BorderCanvas = forwardRef(function BorderCanvas(
  { media, settings, onUpdate, pickMode, onPickColor, onPalette, onError, selectedLayerId, onSelectLayer, onUpdateLayer,
    cropMode = false, snapEnabled = true, gridDivisions = 3 }, ref
) {
  const canvasRef    = useRef(null)
  const wrapRef      = useRef(null)
  const sourceRef    = useRef(null)
  const onPaletteRef = useRef(onPalette)
  const onErrorRef   = useRef(onError)
  const settingsRef  = useRef(settings)
  const mediaRef     = useRef(media)
  const onUpdateRef      = useRef(onUpdate)
  const onPickColorRef   = useRef(onPickColor)
  const pickModeRef      = useRef(pickMode)
  const onSelectLayerRef = useRef(onSelectLayer)
  const onUpdateLayerRef = useRef(onUpdateLayer)
  const selectedLayerIdRef = useRef(selectedLayerId)
  const snapEnabledRef   = useRef(snapEnabled)
  const gridDivisionsRef = useRef(gridDivisions)
  const animFrameRef = useRef(null)
  const cacheRef     = useRef({})
  const geoRef       = useRef({ totalW: OUT_SIZE, totalH: OUT_SIZE, scaledW: OUT_SIZE, scaledH: OUT_SIZE,
                                offsetX: 0, offsetY: 0, srcW: 1, srcH: 1, mediaW: 1, mediaH: 1 })
  const textBBoxesRef = useRef(new Map())  // Map<layerId, bbox> in canvas coords
  const pointersRef   = useRef(new Map())  // active pointer positions
  const pinchRef      = useRef(null)       // pinch-zoom start state
  const dragRef       = useRef(null)       // single-pointer drag start state
  const lastTapRef    = useRef({ time: 0, x: 0, y: 0 })
  const cropModeRef   = useRef(cropMode)
  const viewRef       = useRef({ z: 1, x: 0, y: 0 })   // display-only inspect transform
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingText, setIsDraggingText] = useState(false)
  const [ready, setReady] = useState(false)
  const [snapGuides, setSnapGuides] = useState({ x: null, y: null })  // active guide lines (normalized 0–1)
  // The inspect zoom is UI state, not document state: it never persists, never
  // enters undo, and never reaches renderFrame — so it cannot affect the export.
  const [view, setView] = useState({ z: 1, x: 0, y: 0 })
  const viewZoom = view.z

  // Entering Crop resets the inspect zoom: the crop gestures measure the
  // element's rect, which a CSS transform would falsify. Synced during render
  // (React-endorsed) rather than in an effect, so there's no extra paint.
  const [prevCrop, setPrevCrop] = useState(cropMode)
  if (cropMode !== prevCrop) {
    setPrevCrop(cropMode)
    // Compare against state, not the ref — reading a ref during render is the
    // staleness bug the react-hooks/refs rule catches. The ref is re-synced by
    // the mirroring effect below.
    if (cropMode && view.z !== 1) setView({ z: 1, x: 0, y: 0 })
  }

  // Mirror the latest props/settings into refs so the rAF loop, pointer
  // handlers, and the save path always read current values without re-binding.
  // Synced in an effect (not during render) — and this is the FIRST effect, so
  // every later effect (redraw on settings change, etc.) sees fresh refs. The
  // refs are seeded with the initial props at declaration, so mount is correct.
  useEffect(() => {
    settingsRef.current      = settings
    snapEnabledRef.current   = snapEnabled
    gridDivisionsRef.current = gridDivisions
    mediaRef.current         = media
    onUpdateRef.current      = onUpdate
    onPickColorRef.current   = onPickColor
    onPaletteRef.current     = onPalette
    onErrorRef.current       = onError
    cropModeRef.current      = cropMode
    viewRef.current          = view
    pickModeRef.current      = pickMode
    onSelectLayerRef.current = onSelectLayer
    onUpdateLayerRef.current = onUpdateLayer
    selectedLayerIdRef.current = selectedLayerId
  })

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

  // Write the inspect transform straight to the element. It is a CSS transform
  // on the <canvas>, never a change to `settings`, so the rendered bitmap — and
  // therefore the export — is untouched.
  // The document's on-screen box. All hit-testing and crop math measures this,
  // not the container — the container now fills the viewport area so a zoom can
  // use the whole screen, while the canvas alone is the document.
  const mediaRect = useCallback(() => (
    canvasRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 1, height: 1 }
  ), [])

  const applyView = useCallback((z, x, y) => {
    // Clamp so the scaled document never pulls its own edge inside the frame —
    // measured against the CONTAINER, which is why zooming can now fill the
    // screen instead of staying boxed in the document's footprint.
    const el = canvasRef.current
    const box = wrapRef.current
    const sw = (el?.offsetWidth ?? 0) * z
    const sh = (el?.offsetHeight ?? 0) * z
    const maxX = Math.max(0, (sw - (box?.clientWidth ?? 0)) / 2)
    const maxY = Math.max(0, (sh - (box?.clientHeight ?? 0)) / 2)
    const next = {
      z,
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    }
    viewRef.current = next
    setView(next)
  }, [])

  const resetView = useCallback(() => {
    const next = { z: 1, x: 0, y: 0 }
    viewRef.current = next
    setView(next)
  }, [])

  const handlePointerDown = useCallback((e) => {
    // Eye-dropper mode: sample the rendered canvas pixel, skip all pan/zoom logic
    if (pickModeRef.current) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = Math.max(0, Math.min(canvas.width  - 1, Math.round((e.clientX - rect.left) * canvas.width  / rect.width)))
      const y = Math.max(0, Math.min(canvas.height - 1, Math.round((e.clientY - rect.top)  * canvas.height / rect.height)))
      const [r, g, b] = canvas.getContext('2d').getImageData(x, y, 1, 1).data
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
      onPickColorRef.current?.(hex)
      return
    }

    // Text hit-test: find the topmost layer under the tap
    if (textBBoxesRef.current.size > 0) {
      const rect = mediaRect()
      const geo = geoRef.current
      const canvasX = (e.clientX - rect.left) * geo.totalW / rect.width
      const canvasY = (e.clientY - rect.top)  * geo.totalH / rect.height
      // Iterate in reverse so the last-rendered (topmost) layer wins. Highlights
      // render under the type, so they come first and lose ties to text.
      const layers = [
        ...(settingsRef.current.highlightLayers ?? []),
        ...(settingsRef.current.textLayers ?? []),
      ]
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
        // In Crop, double-tap resets the photo's own framing; everywhere else it
        // resets the inspect zoom, which is all that gesture can touch there.
        if (cropModeRef.current) {
          onUpdateRef.current?.('zoom', 1)
          onUpdateRef.current?.('panX', 0.5)
          onUpdateRef.current?.('panY', 0.5)
        } else {
          resetView()
        }
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
      const rect = mediaRect()
      if (!cropModeRef.current) {
        // Outside Crop a pinch inspects the document — it must not re-frame the
        // photo, because that would silently change what gets exported.
        const v = viewRef.current
        const box = wrapRef.current?.getBoundingClientRect() ?? rect
        pinchRef.current = { view: true, startDist, startZ: v.z, startVX: v.x, startVY: v.y, pcx, pcy, rect: box }
        setIsDragging(true)
        return
      }
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
      const rect = mediaRect()
      if (!cropModeRef.current) {
        // Single finger pans the inspect view (only meaningful once zoomed in).
        const v = viewRef.current
        dragRef.current = { view: true, startX: e.clientX, startY: e.clientY, startVX: v.x, startVY: v.y, rect }
      } else {
        dragRef.current = { startX: e.clientX, startY: e.clientY, startSrcLeft: srcLeft, startSrcTop: srcTop, viewW, viewH, rect }
      }
    }
    setIsDragging(true)
  }, [resetView])

  const handlePointerMove = useCallback((e) => {
    // Text drag takes priority — don't update pointersRef so pinch stays inactive
    if (dragRef.current?.isText) {
      const drag = dragRef.current
      let nx = Math.max(0.02, Math.min(0.98, drag.startTextX + (e.clientX - drag.startX) / drag.rect.width))
      let ny = Math.max(0.02, Math.min(0.98, drag.startTextY + (e.clientY - drag.startY) / drag.rect.height))
      let gx = null, gy = null
      if (snapEnabledRef.current) {
        const layers = settingsRef.current.textLayers ?? []
        const sibsX = [], sibsY = []
        for (const l of layers) {
          if (l.id === drag.layerId) continue
          sibsX.push(l.x ?? 0.5); sibsY.push(l.y ?? 0.5)
        }
        const N = gridDivisionsRef.current
        ;[nx, gx] = snapAxis(nx, snapTargets(N, sibsX), SNAP_PX / drag.rect.width)
        ;[ny, gy] = snapAxis(ny, snapTargets(N, sibsY), SNAP_PX / drag.rect.height)
      }
      onUpdateLayerRef.current?.(drag.layerId, 'x', nx)
      onUpdateLayerRef.current?.(drag.layerId, 'y', ny)
      setSnapGuides({ x: gx, y: gy })
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

      if (pinch.view) {
        const z = Math.max(1, Math.min(MAX_VIEW_ZOOM, pinch.startZ * currentDist / pinch.startDist))
        // Anchor the pinch: keep whatever was under the fingers under them, and
        // follow the centre as it moves so a two-finger drag also pans.
        const r = pinch.rect
        const ex = pinch.pcx - (r.left + r.width / 2)
        const ey = pinch.pcy - (r.top + r.height / 2)
        const k = z / pinch.startZ
        const nx = ex - (ex - pinch.startVX) * k + (pcx - pinch.pcx)
        const ny = ey - (ey - pinch.startVY) * k + (pcy - pinch.pcy)
        applyView(z, nx, ny)
        return
      }

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

    } else if (dragRef.current?.view) {
      const drag = dragRef.current
      const v = viewRef.current
      if (v.z <= 1) return   // nothing to pan at 1x
      applyView(v.z, drag.startVX + (e.clientX - drag.startX), drag.startVY + (e.clientY - drag.startY))

    } else if (dragRef.current) {
      const drag = dragRef.current
      // Source pixels per CSS pixel: view fills scaledW logical px across the canvas's CSS width
      const srcPxPerCSS = drag.viewW * geo.totalW / (geo.scaledW * drag.rect.width)
      const newSrcLeft = Math.max(0, Math.min(geo.srcW - drag.viewW, drag.startSrcLeft - (e.clientX - drag.startX) * srcPxPerCSS))
      const newSrcTop  = Math.max(0, Math.min(geo.srcH - drag.viewH, drag.startSrcTop  - (e.clientY - drag.startY) * srcPxPerCSS))
      let panX = (newSrcLeft + drag.viewW / 2) / geo.srcW
      let panY = (newSrcTop  + drag.viewH / 2) / geo.srcH
      // Pan snaps to centred (0.5) so you can re-centre the photo easily.
      let gx = null, gy = null
      if (snapEnabledRef.current) {
        if (Math.abs(panX - 0.5) < SNAP_PX / drag.rect.width)  { panX = 0.5; gx = 0.5 }
        if (Math.abs(panY - 0.5) < SNAP_PX / drag.rect.height) { panY = 0.5; gy = 0.5 }
        setSnapGuides({ x: gx, y: gy })
      }
      onUpdateRef.current?.('panX', panX)
      onUpdateRef.current?.('panY', panY)
    }
  }, [applyView])

  const handlePointerUp = useCallback((e) => {
    pointersRef.current.delete(e.pointerId)

    if (pointersRef.current.size < 2) {
      pinchRef.current = null
    }
    if (pointersRef.current.size === 1 && !cropModeRef.current) {
      // Outside Crop the remaining finger continues panning the inspect view.
      const v = viewRef.current
      const [rp] = [...pointersRef.current.values()]
      dragRef.current = {
        view: true, startX: rp.x, startY: rp.y, startVX: v.x, startVY: v.y,
        rect: mediaRect(),
      }
    } else if (pointersRef.current.size === 1) {
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
        rect: mediaRect(),
      }
    }
    if (pointersRef.current.size === 0) {
      dragRef.current = null
      setIsDragging(false)
      setIsDraggingText(false)
      setSnapGuides({ x: null, y: null })
    }
  }, [])

  // Load media
  useEffect(() => {
    // Reset readiness while the new source loads (so the redraw effect doesn't
    // paint the old source against new settings). This doesn't cascade — the
    // effect's deps don't include `ready`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false)
    stopLoop()
    cacheRef.current = {}  // clear blur cache when media changes
    if (!media?.url) return

    if (media.type === 'image') {
      const img = new Image()
      img.onload = () => {
        sourceRef.current = img; redraw(); setReady(true)
        try { onPaletteRef.current?.(buildBorderSuggestions(img)) } catch { /* ignore */ }
      }
      // N6: a decode failure must reach the UI, not flip an internal flag and
      // leave a spinner. (Images normally decode in the uploader now; this is
      // the backstop.)
      img.onerror = () => { setReady(false); onErrorRef.current?.("Couldn't read that image.") }
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
        try { onPaletteRef.current?.(buildBorderSuggestions(video)) } catch { /* ignore */ }
        video.play().catch(() => {})
        startLoop()
        setReady(true)
      }
      // N6: video containers/codecs that Photos plays may still fail in a
      // <video> element — surface it instead of spinning forever.
      const onVideoError = () => {
        setReady(false)
        onErrorRef.current?.("Couldn't play that video — the format may not be supported.")
      }
      video.addEventListener('loadeddata', onLoaded, { once: true })
      video.addEventListener('error', onVideoError, { once: true })
      video.load()

      return () => {
        video.removeEventListener('loadeddata', onLoaded)
        video.removeEventListener('error', onVideoError)
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

  // Web fonts load asynchronously; a custom font renders as a fallback until its
  // file arrives. Kick off loading the fonts used by the text layers and redraw
  // once they're ready so the canvas (and export) show the real typeface.
  useEffect(() => {
    if (!ready || !document.fonts) return
    const fonts = [...new Set((settings.textLayers ?? []).map(l => l.font).filter(Boolean))]
    if (!fonts.length) return
    let cancelled = false
    Promise.all(fonts.flatMap(f => [
      document.fonts.load(`400 40px ${f}`).catch(() => {}),
      document.fonts.load(`700 40px ${f}`).catch(() => {}),
    ])).then(() => { if (!cancelled && mediaRef.current?.type !== 'video') redraw() })
    return () => { cancelled = true }
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
                  resolve({ status: 'shared' }); return
                } catch (e) {
                  if (e.name === 'AbortError') { resolve({ status: 'cancelled' }); return }
                  console.warn('Share failed:', e)
                }
              }
            }

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = filename
            document.body.appendChild(a); a.click()
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(url), 1000)
            resolve({ status: 'downloaded' })
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
      // Ensure any custom fonts are loaded, then re-render so the export never
      // captures a fallback face.
      if (document.fonts) { try { await document.fonts.ready } catch { /* ignore */ } }
      renderFrame(canvas, source, settingsRef.current, cacheRef.current, geoRef, null)
      // N4: JPEG, not PNG — a bordered photo is opaque, so there's no alpha to
      // keep, and 0.92 JPEG is ~300 KB where the PNG is multiple MB.
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      if (!blob) return

      // N3: Web Share first (the iOS "Save Image" path); AbortError means the
      // user dismissed the sheet — a clean cancel, never fall through to a
      // download that reopens the image in a tab.
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'border-studio.jpg', { type: 'image/jpeg' })
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] })
            return { status: 'shared' }
          } catch (e) {
            if (e.name === 'AbortError') return { status: 'cancelled' }
            console.warn('Share failed:', e)
          }
        }
      }

      // Desktop fallback: <a download>, revoked on a timeout (some browsers need
      // the object URL alive briefly past the click).
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'border-studio.jpg'
      document.body.appendChild(a); a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return { status: 'downloaded' }
    }
  }), [startLoop, stopLoop])

  const handleCanvasKeyDown = useCallback((e) => {
    const s = settingsRef.current || {}
    const zoom = s.zoom ?? 1, panX = s.panX ?? 0.5, panY = s.panY ?? 0.5
    const c01 = v => Math.max(0, Math.min(1, v))
    const step = 0.06 / Math.max(1, zoom)   // finer nudges the further you're zoomed in
    let handled = true
    switch (e.key) {
      case 'ArrowLeft':  onUpdateRef.current?.('panX', c01(panX - step)); break
      case 'ArrowRight': onUpdateRef.current?.('panX', c01(panX + step)); break
      case 'ArrowUp':    onUpdateRef.current?.('panY', c01(panY - step)); break
      case 'ArrowDown':  onUpdateRef.current?.('panY', c01(panY + step)); break
      case '+': case '=': onUpdateRef.current?.('zoom', Math.min(MAX_ZOOM, zoom * 1.15)); break
      case '-': case '_': onUpdateRef.current?.('zoom', Math.max(1, zoom / 1.15)); break
      case '0':
        onUpdateRef.current?.('zoom', 1)
        onUpdateRef.current?.('panX', 0.5)
        onUpdateRef.current?.('panY', 0.5)
        break
      default: handled = false
    }
    if (handled) e.preventDefault()
  }, [])

  const cursor = pickMode ? 'crosshair' : (isDraggingText ? 'grabbing' : isDragging ? 'grabbing' : 'grab')
  return (
    <div
      className="border-canvas"
      ref={wrapRef}
      style={{ cursor, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      // §10.1: a keyboard-adjustable equivalent for the pan/zoom gesture —
      // arrows pan, +/- zoom, 0 resets. Feeds the same {zoom, panX, panY} model.
      tabIndex={0}
      role="group"
      aria-label="Photo preview. Arrow keys pan, plus and minus zoom, 0 resets."
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight + - 0"
      onKeyDown={handleCanvasKeyDown}
    >
      <div
        className="border-canvas__stage"
        style={view.z === 1 ? undefined : { transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}
      >
        <canvas
          ref={canvasRef}
          className={`border-canvas__el${ready ? ' border-canvas__el--ready' : ''}`}
          aria-hidden="true"
        />
        {snapEnabled && isDragging && ready && (
          <svg className="border-canvas__grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {Array.from({ length: Math.max(2, Math.min(12, gridDivisions)) - 1 }, (_, i) => {
              const p = ((i + 1) / Math.max(2, Math.min(12, gridDivisions))) * 100
              return (
                <g key={i}>
                  <line className="border-canvas__grid-line" x1={p} y1="0" x2={p} y2="100" />
                  <line className="border-canvas__grid-line" x1="0" y1={p} x2="100" y2={p} />
                </g>
              )
            })}
            {snapGuides.x != null && (
              <line className="border-canvas__snap-line" x1={snapGuides.x * 100} y1="0" x2={snapGuides.x * 100} y2="100" />
            )}
            {snapGuides.y != null && (
              <line className="border-canvas__snap-line" x1="0" y1={snapGuides.y * 100} x2="100" y2={snapGuides.y * 100} />
            )}
          </svg>
        )}
      </div>
      {viewZoom > 1 && (
        <button className="border-canvas__zoombadge" onClick={resetView}
          aria-label={`Inspect zoom ${viewZoom.toFixed(1)} times — tap to reset`}>
          {viewZoom.toFixed(1)}× · Reset
        </button>
      )}
      {!ready && (
        <div className="border-canvas__loading" aria-hidden="true">
          <div className="border-canvas__spinner"/>
        </div>
      )}
    </div>
  )
})

export default BorderCanvas
