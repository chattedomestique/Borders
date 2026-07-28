import { describe, it, expect } from 'vitest'
import { hashNoise, valueNoise, fbm, seedFromId } from './noise'

// The properties that actually matter for the edge renderer: determinism (or
// the edge shimmers on every redraw), range (or alpha math breaks), and
// coherence (or a "torn" edge comes out as confetti).

describe('hashNoise', () => {
  it('is deterministic for the same inputs', () => {
    expect(hashNoise(12, 34, 7)).toBe(hashNoise(12, 34, 7))
    expect(hashNoise(0, 0, 0)).toBe(hashNoise(0, 0, 0))
  })

  it('stays within [0,1)', () => {
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 40; y++) {
        const v = hashNoise(x, y, 3)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    }
  })

  it('decorrelates neighbours and seeds', () => {
    expect(hashNoise(5, 5, 1)).not.toBe(hashNoise(6, 5, 1))
    expect(hashNoise(5, 5, 1)).not.toBe(hashNoise(5, 5, 2))
  })

  it('has roughly uniform mean over many samples', () => {
    let sum = 0, n = 0
    for (let x = 0; x < 100; x++) for (let y = 0; y < 100; y++) { sum += hashNoise(x, y, 11); n++ }
    expect(Math.abs(sum / n - 0.5)).toBeLessThan(0.02)
  })
})

describe('valueNoise', () => {
  it('is deterministic and in range', () => {
    expect(valueNoise(3.7, 2.1, 5)).toBe(valueNoise(3.7, 2.1, 5))
    for (let i = 0; i < 200; i++) {
      const v = valueNoise(i * 0.37, i * 0.11, 2)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('reproduces the lattice value at integer coords', () => {
    expect(valueNoise(4, 9, 6)).toBeCloseTo(hashNoise(4, 9, 6), 10)
  })

  it('is coherent — nearby samples stay close (unlike white noise)', () => {
    let coherent = 0, white = 0
    for (let i = 0; i < 100; i++) {
      const x = i * 0.13, y = i * 0.29
      coherent += Math.abs(valueNoise(x, y, 4) - valueNoise(x + 0.02, y, 4))
      white += Math.abs(hashNoise(i, 0, 4) - hashNoise(i + 1, 0, 4))
    }
    expect(coherent / 100).toBeLessThan(white / 100)
  })
})

describe('fbm', () => {
  it('stays in range and is deterministic', () => {
    for (let i = 0; i < 100; i++) {
      const v = fbm(i * 0.21, i * 0.44, 9, 3)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
    expect(fbm(1.5, 2.5, 9, 3)).toBe(fbm(1.5, 2.5, 9, 3))
  })

  it('adds detail — more octaves changes the field', () => {
    expect(fbm(1.5, 2.5, 9, 1)).not.toBe(fbm(1.5, 2.5, 9, 4))
  })
})

describe('seedFromId', () => {
  it('is stable per id and differs across ids', () => {
    expect(seedFromId('hl-123')).toBe(seedFromId('hl-123'))
    expect(seedFromId('hl-123')).not.toBe(seedFromId('hl-124'))
    expect(Number.isInteger(seedFromId('x'))).toBe(true)
  })
})
