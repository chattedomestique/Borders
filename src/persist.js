// Persistence & presets.
//
// By default only the FRAME BASICS carry over to the next photo (border size,
// corners, crop, aspect mode) — not the text, effects, colours, or fill, which
// reset so each photo starts clean. The full look can be carried explicitly via
// "Apply last look" or saved/loaded as a named preset.

const KEY = 'border-studio:settings:v1'          // last full settings (for "apply last")
const PRESETS_KEY = 'border-studio:presets:v1'   // named presets

// The only fields auto-carried to a new photo.
const FRAME_KEYS = ['borderThickness', 'cornerRadius', 'cropRatio', 'aspectMode']

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveSettings(settings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)) }
  catch { /* quota exceeded or Private Mode — persistence is best-effort */ }
}

// Seed a freshly-loaded photo. Only the frame basics carry from last time; the
// rest comes from `defaults` (so text/effects/fill start clean and the border
// colour re-keys to the new photo via the palette engine).
export function seedForNewMedia(defaults) {
  const saved = loadSettings()
  if (!saved) return defaults
  const frame = {}
  for (const k of FRAME_KEYS) if (k in saved) frame[k] = saved[k]
  return { ...defaults, ...frame }
}

// ── Named presets: full-look snapshots the user opts into ──
export function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function writePresets(list) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)) }
  catch { /* best-effort */ }
}

// Snapshot the "look" — everything except the per-photo transform, which is
// meaningless against a different image.
function lookOf(settings) {
  const { zoom, panX, panY, ...look } = settings   // eslint-disable-line no-unused-vars
  return look
}

export function savePreset(name, settings) {
  const list = loadPresets()
  const preset = { id: `p${Date.now()}`, name: (name || 'Preset').slice(0, 40), look: lookOf(settings) }
  list.push(preset)
  writePresets(list)
  return preset
}

export function deletePreset(id) {
  writePresets(loadPresets().filter(p => p.id !== id))
}

// Merge a preset's look onto the current settings, keeping the current photo's
// transform (zoom/pan) so applying a look never moves the photo.
export function applyPresetLook(current, preset) {
  return { ...current, ...preset.look, zoom: current.zoom, panX: current.panX, panY: current.panY }
}
