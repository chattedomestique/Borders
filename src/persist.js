// N11 (tier 1): persist the user's frame settings so a reload or an iOS tab
// eviction doesn't wipe the setup. Settings only — the media blob is not stored
// here (that's tier 2 / IndexedDB, noted in the README as a follow-up).

const KEY = 'border-studio:settings:v1'

// Fields that must re-derive per photo rather than carry over from the last one:
// the border colour is keyed to the image by the palette engine, and the
// zoom/pan transform is meaningless against a different photo.
const PER_IMAGE = { bgMode: 'average', bgColor: '#ffffff', zoom: 1, panX: 0.5, panY: 0.5 }

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

// Seed a freshly-loaded photo with the last-used frame/grain/text setup, but
// reset the per-image fields so the palette re-keys the border to the new photo.
export function seedForNewMedia(defaults) {
  const saved = loadSettings()
  return saved ? { ...defaults, ...saved, ...PER_IMAGE } : defaults
}
