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
export function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex)
  const [h, sat, l] = rgbToHsl(r, g, b)
  return { h, s: sat, l }
}
export function hexToRgb(hex) {
  const s = (hex || '#000000').replace('#', '')
  return [parseInt(s.slice(0, 2), 16) || 0, parseInt(s.slice(2, 4), 16) || 0, parseInt(s.slice(4, 6), 16) || 0]
}

// ── OKLCH: perceptually-uniform colour space, so rotating hue for a
// complementary/analogous/triadic accent preserves the *perceived* lightness
// and chroma instead of the muddy, uneven results HSL rotation gives. This is
// how modern colour tools (Adobe, OKLCH pickers) actually derive harmonies. ──
function srgbToLinear(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
function linearToSrgb(c) { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return clamp(Math.round(v * 255), 0, 255) }

function rgbToOklch(r, g, b) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  return { L, C: Math.hypot(a, bb), H: (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360 }
}
function oklchToHex(L, C, H) {
  const h = H * Math.PI / 180, a = C * Math.cos(h), bb = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb
  const s_ = L - 0.0894841775 * a - 1.2914855480 * bb
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3
  return rgbToHex(
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  )
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

// Accents via OKLCH harmony — balanced, usable companions to ANY base colour.
// Hue is rotated in a perceptual space at a normalised lightness/chroma, so the
// results read as designed accents rather than the garish HSL rotations before.
function accents(heroHex) {
  const [r, g, b] = hexToRgb(heroHex)
  const { C, H } = rgbToOklch(r, g, b)
  // sRGB OKLCH chroma tops out ~0.37; ~0.13 reads rich but not neon. Normalise
  // so a dark or washed-out hero still yields clean mid accents.
  const base = clamp(C * 0.9 + 0.03, 0.10, 0.16)
  const mk = (id, label, dH, L = 0.64, Cx = base) => ({ group: 'accent', id, label, hex: oklchToHex(L, Cx, H + dH) })
  return [
    mk('comp',      'Comp',      180),
    mk('comp-lt',   'Comp Lt',   180, 0.83, clamp(base * 0.6, 0.05, 0.11)),
    mk('comp-dk',   'Comp Dk',   180, 0.42, clamp(base * 0.95, 0.07, 0.15)),
    mk('analogous', 'Analogous', 34),
    mk('split',     'Split',     150),
    mk('triadic',   'Triadic',   120),
  ]
}

// Tones + accents for a given base colour. `undertoneHue` seeds a grayscale base.
function suggestionsFor(heroHex, undertoneHue) {
  const { h: heroH0, s: heroS, l: heroL0 } = hexToHsl(heroHex)
  const heroH = heroS < 6 ? undertoneHue : heroH0
  const heroL = clamp(heroL0, 22, 78)
  const tones = [
    { group: 'tone', id: 'photo', label: 'Photo', hex: hslCss(heroH, heroS, heroL) },
    { group: 'tone', id: 'soft',  label: 'Soft',  hex: hslCss(heroH, clamp(heroS * 0.18, 5, 14), 94) },
    { group: 'tone', id: 'deep',  label: 'Deep',  hex: hslCss(heroH, clamp(heroS * 0.5, 14, 32), 12) },
    { group: 'tone', id: 'muted', label: 'Muted', hex: hslCss(heroH, clamp(heroS * 0.42, 12, 36), 66) },
  ]
  const out = [...tones, ...accents(heroHex)]
  const seen = new Set()
  return out.filter(s => { const k = s.hex.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}

// ── the curated border suggestions ──
export function buildBorderSuggestions(source) {
  const pal = extractPalette(source)
  if (!pal) return []
  // Population-weighted average (image temperature / undertone).
  let ar = 0, ag = 0, ab = 0, w = 0
  for (const c of pal) { ar += c.r * c.pop; ag += c.g * c.pop; ab += c.b * c.pop; w += c.pop }
  const [avgH] = rgbToHsl(ar / w, ag / w, ab / w)
  const hero = pal.slice().sort((a, b) => photogenic(b) - photogenic(a))[0]
  return suggestionsFor(hero.hex, avgH)
}

// Eyedropper "re-roll": treat the picked colour as the base and regenerate the
// whole palette (tones + OKLCH harmonies) around it.
export function buildSuggestionsFromColor(hex) {
  const { h } = hexToHsl(hex)
  return suggestionsFor(hex, h)
}
