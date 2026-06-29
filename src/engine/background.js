// Frosted-glass background rendering. Pure canvas work — no React.
import { applyVibrance } from './color.js'

/**
 * One separable box-blur pass (horizontal, then vertical) on ImageData.
 * Seeding starts at index 0 so the running sum is never inflated by
 * phantom edge pixels. Three passes of this ≈ a Gaussian blur.
 */
export function boxBlurPass(data, w, h, r) {
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
export function drawFrostedBg(ctx, source, canvasW, canvasH, blurAmount, frostSettings, cache) {
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
