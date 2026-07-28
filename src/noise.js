// Deterministic procedural noise for organic edges (torn paper, marker bleed,
// riso mottle).
//
// Everything here is SEEDED and pure: the same (x, y, seed) always yields the
// same value. That matters because these fields are regenerated on every redraw
// — an unseeded Math.random() edge would visibly shimmer as you drag an
// unrelated slider, which reads as a bug (Playbook §5.7).
//
// Two flavours, both needed:
//   • hashNoise  — white noise. Uncorrelated per pixel → grainy, dissolve-style
//                  edges (specks).
//   • valueNoise — coherent noise: a random value per lattice point, smoothly
//                  interpolated between them. Neighbouring pixels are related,
//                  so thresholding it produces continuous, organic contours
//                  rather than confetti. This is what makes a torn-paper edge
//                  look torn instead of eaten by moths.
//   • fbm        — fractional Brownian motion: several octaves of valueNoise at
//                  doubling frequency and halving amplitude. Real torn fibre has
//                  detail at multiple scales; one octave looks like a soft wave.

// ── integer hash → [0,1) ──────────────────────────────────────────────────────
// A 2D hash built on the mulberry32 mix. Cheap, no tables, well-distributed.
export function hashNoise(x, y, seed = 0) {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ (seed | 0)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 1 | h)
  h = (h + Math.imul(h ^ (h >>> 7), 61 | h)) ^ h
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296
}

// Smoothstep (Hermite) — C1-continuous, so interpolated noise has no creases.
const fade = (t) => t * t * (3 - 2 * t)

// ── coherent value noise ─────────────────────────────────────────────────────
// Lattice values hashed at integer coords, bilinearly blended with a smoothstep.
export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const u = fade(xf), v = fade(yf)
  const a = hashNoise(xi,     yi,     seed)
  const b = hashNoise(xi + 1, yi,     seed)
  const c = hashNoise(xi,     yi + 1, seed)
  const d = hashNoise(xi + 1, yi + 1, seed)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}

// ── fractional Brownian motion ───────────────────────────────────────────────
// Sums `octaves` of value noise, each at 2× frequency and ~½ amplitude, then
// normalises back to [0,1].
export function fbm(x, y, seed = 0, octaves = 3, lacunarity = 2, gain = 0.5) {
  let sum = 0, amp = 1, freq = 1, norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + o * 1013)
    norm += amp
    amp *= gain
    freq *= lacunarity
  }
  return norm > 0 ? sum / norm : 0
}

// Stable 32-bit seed from a layer id, so an edge is tied to its layer and never
// changes underneath the user.
export function seedFromId(id) {
  let h = 2166136261 >>> 0
  const s = String(id)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
