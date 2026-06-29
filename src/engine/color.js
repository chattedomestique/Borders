// Pure color math + frame sampling. No React, no DOM-component coupling
// (uses only canvas APIs available everywhere). Extracted verbatim from the
// original BorderCanvas so it can be unit-tested and reused in isolation.

export function sampleAverageColor(imageData) {
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

export function grabFrame(source, w, h) {
  const tmp = document.createElement('canvas')
  tmp.width = w; tmp.height = h
  const ctx = tmp.getContext('2d')
  ctx.drawImage(source, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

export function applyVibrance(data, amount) {
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
