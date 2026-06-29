// Film-grain compositing. Pure canvas work — no React.

/**
 * Film grain ported from filmgrainer by Lars Pontoppidan (MIT).
 * Gaussian noise blended via soft-light naturally attenuates grain in
 * shadows and highlights just like real film. Multi-scale layers add
 * variability: a sharp fine base + optional smooth medium/coarse clumps.
 */
export function applyGrain(ctx, w, h, grainAmount, grainVariability, monochrome, animate, cache, grainSpread) {
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
