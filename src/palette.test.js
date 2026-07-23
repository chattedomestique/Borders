import { describe, it, expect } from 'vitest'
import { rgbToHsl, hslToRgb, rgbToHex, hexToHsl, hslCss } from './palette'

// §12: unit-test the pure engine — the tricky, non-obvious invariants. The
// palette color math has no DOM dependency, so it's testable without a browser.
// (extractPalette / buildBorderSuggestions need a canvas source and are exercised
// in the in-browser checks instead.)

describe('rgb <-> hsl', () => {
  it('maps the primaries to canonical HSL', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual([0, 100, 50])
    expect(rgbToHsl(0, 255, 0)).toEqual([120, 100, 50])
    expect(rgbToHsl(0, 0, 255)).toEqual([240, 100, 50])
  })

  it('has zero saturation for greys (hue is irrelevant)', () => {
    const [, s, l] = rgbToHsl(128, 128, 128)
    expect(s).toBe(0)
    expect(Math.round(l)).toBe(50)
  })

  it('round-trips rgb -> hsl -> rgb within 1 LSB', () => {
    const samples = [
      [201, 98, 44], [42, 61, 102], [18, 60, 42], [244, 194, 78],
      [0, 0, 0], [255, 255, 255], [7, 200, 133], [130, 20, 210],
    ]
    for (const [r, g, b] of samples) {
      const [h, s, l] = rgbToHsl(r, g, b)
      const [r2, g2, b2] = hslToRgb(h, s, l)
      expect(Math.abs(r2 - r)).toBeLessThanOrEqual(1)
      expect(Math.abs(g2 - g)).toBeLessThanOrEqual(1)
      expect(Math.abs(b2 - b)).toBeLessThanOrEqual(1)
    }
  })
})

describe('hslToRgb', () => {
  it('wraps hue modulo 360 (0 === 360 === -360)', () => {
    expect(hslToRgb(360, 100, 50)).toEqual(hslToRgb(0, 100, 50))
    expect(hslToRgb(-360, 100, 50)).toEqual(hslToRgb(0, 100, 50))
    expect(hslToRgb(390, 80, 40)).toEqual(hslToRgb(30, 80, 40))
  })

  it('clamps lightness extremes to black and white', () => {
    expect(hslToRgb(200, 50, 0)).toEqual([0, 0, 0])
    expect(hslToRgb(200, 50, 100)).toEqual([255, 255, 255])
  })
})

describe('rgbToHex', () => {
  it('formats and clamps channels to a 6-digit hex', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
    expect(rgbToHex(201, 98, 44)).toBe('#c9622c')
    expect(rgbToHex(-5, 300, 128)).toBe('#00ff80') // out-of-range clamps
  })
})

describe('hex <-> hsl round-trip (the slider path)', () => {
  it('hexToHsl -> hslCss is identity for representable colors', () => {
    for (const hex of ['#c9622c', '#2a3d66', '#123c2a', '#f4c24e', '#000000', '#ffffff']) {
      const { h, s, l } = hexToHsl(hex)
      expect(hslCss(h, s, l).toLowerCase()).toBe(hex.toLowerCase())
    }
  })

  it('hexToHsl tolerates a missing leading # and bad input', () => {
    expect(hexToHsl('ff0000')).toEqual(hexToHsl('#ff0000'))
    const bad = hexToHsl('')
    expect(bad).toEqual({ h: 0, s: 0, l: 0 })
  })
})
