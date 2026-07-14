// ─── Palette extraction + border-colour harmonies ──────────────────────────
//
// The old border colours came from a single *average* of every pixel, which on
// any busy photo collapses to a muddy grey-brown. This module instead pulls the
// image's genuinely dominant colours via median-cut quantisation, then derives a
// small set of tasteful border colours from colour-theory relationships
// (drawn-from-photo, soft mat, deep frame, complementary pop, analogous blend,
// muted tone). Every suggestion is a real colour keyed to the image, so the
// frame always harmonises with the photo instead of fighting it.

// ── colour math ──
export function rgbToHsl(r, g, b) {
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

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) { r = g = b = l }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
export const hslCss = (h, s, l) => {
  const [r, g, b] = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}
export function rgbToHex(r, g, b) {
  const h = n => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

// ── downsample the source into a flat pixel array ──
function samplePixels(source, maxDim = 84) {
  const sw = source.videoWidth ?? source.naturalWidth ?? source.width ?? 0
  const sh = source.videoHeight ?? source.naturalHeight ?? source.height ?? 0
  if (!sw || !sh) return null
  const scale = Math.min(1, maxDim / Math.max(sw, sh))
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(source, 0, 0, w, h)
  let data
  try { data = ctx.getImageData(0, 0, w, h).data }
  catch { return null } // tainted canvas — bail gracefully
  const px = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 125) continue
    px.push([data[i], data[i + 1], data[i + 2]])
  }
  return px.length ? px : null
}

// ── median-cut quantisation → dominant clusters, sorted by population ──
function medianCut(pixels, depth) {
  const boxes = [pixels]
  while (boxes.length < (1 << depth)) {
    // Split the box with the largest single-channel spread.
    let bi = -1, bestRange = -1, bestCh = 0
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i]
      if (box.length < 2) continue
      const mn = [255, 255, 255], mx = [0, 0, 0]
      for (const p of box) for (let c = 0; c < 3; c++) {
        if (p[c] < mn[c]) mn[c] = p[c]
        if (p[c] > mx[c]) mx[c] = p[c]
      }
      // Weight the range so green/red separate more readily than blue (luma).
      const w = [1.0, 1.2, 0.8]
      for (let c = 0; c < 3; c++) {
        const range = (mx[c] - mn[c]) * w[c]
        if (range > bestRange) { bestRange = range; bi = i; bestCh = c }
      }
    }
    if (bi === -1) break
    const box = boxes[bi]
    box.sort((a, b) => a[bestCh] - b[bestCh])
    const mid = box.length >> 1
    boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid))
  }
  return boxes.filter(b => b.length).map(box => {
    let r = 0, g = 0, b = 0
    for (const p of box) { r += p[0]; g += p[1]; b += p[2] }
    const n = box.length
    return { rgb: [r / n, g / n, b / n], pop: n }
  }).sort((a, b) => b.pop - a.pop)
}

export function extractPalette(source, count = 6) {
  const px = samplePixels(source)
  if (!px) return null
  const depth = Math.ceil(Math.log2(Math.max(2, count * 3)))
  const clusters = medianCut(px, depth)
  const total = clusters.reduce((s, c) => s + c.pop, 0) || 1
  return clusters.map(c => {
    const [r, g, b] = c.rgb
    const [h, s, l] = rgbToHsl(r, g, b)
    return { r, g, b, h, s, l, pop: c.pop, frac: c.pop / total, hex: rgbToHex(r, g, b) }
  })
}

// How "frame-worthy" a cluster is: prominent area, real chroma, not crushed to
// pure black or blown to white. Drives which colour becomes "From photo".
function photogenic(c) {
  const area = Math.sqrt(c.frac)                    // dampen so a huge sky doesn't always win
  const chroma = 0.30 + 0.70 * (c.s / 100)
  const midness = 1 - clamp(Math.abs(c.l - 55) / 70, 0, 0.85)
  return area * chroma * midness
}

// ── the curated border suggestions ──
export function buildBorderSuggestions(source) {
  const pal = extractPalette(source)
  if (!pal) return []

  // Population-weighted average (image temperature / undertone).
  let ar = 0, ag = 0, ab = 0, w = 0
  for (const c of pal) { ar += c.r * c.pop; ag += c.g * c.pop; ab += c.b * c.pop; w += c.pop }
  const [avgH] = rgbToHsl(ar / w, ag / w, ab / w)

  // "From photo": the most frame-worthy real colour, nudged into a usable range.
  const hero = pal.slice().sort((a, b) => photogenic(b) - photogenic(a))[0]
  const heroH = hero.s < 6 ? avgH : hero.h        // grayscale hero → borrow avg hue
  const heroS = hero.s
  const heroL = clamp(hero.l, 22, 78)

  const out = []
  const add = (id, label, h, s, l) => out.push({ id, label, hex: hslCss(h, s, l) })

  // 1 · Drawn straight from the photo — guaranteed to belong.
  out.push({ id: 'photo', label: 'Photo', hex: hslCss(heroH, heroS, heroL) })
  // 2 · Soft mat: near-white carrying the image's undertone (gallery matte).
  add('soft', 'Soft', heroH, clamp(heroS * 0.18, 5, 14), 94)
  // 3 · Deep frame: rich near-black with the same undertone.
  add('deep', 'Deep', heroH, clamp(heroS * 0.5, 14, 32), 12)
  // 4 · Pop: complementary accent, chroma boosted, mid-lightness.
  add('pop', 'Pop', heroH + 180, clamp(Math.max(heroS, 58) * 1.05, 55, 92), clamp(heroL < 50 ? 58 : 52, 45, 62))
  // 5 · Blend: analogous neighbour, offset in lightness for gentle separation.
  add('blend', 'Blend', heroH + 32, clamp(heroS * 0.9, 30, 80), clamp(heroL > 55 ? heroL - 20 : heroL + 20, 26, 76))
  // 6 · Muted: dusty tone-on-tone, understated.
  add('muted', 'Muted', heroH, clamp(heroS * 0.42, 12, 36), 66)

  // De-dup any collisions (e.g. grayscale images) so the strip stays varied.
  const seen = new Set()
  return out.filter(s => { const k = s.hex.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}
