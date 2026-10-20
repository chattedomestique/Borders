import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
// The style guide first: core declares the layer order (sg.reset … sg.utilities)
// that everything after it slots into. Then only the elements the app uses.
import './vendor/styleguide/core.min.css'
import './vendor/styleguide/icons.css'
import './vendor/styleguide/elements/button.min.css'
import './vendor/styleguide/elements/card.min.css'
import './vendor/styleguide/elements/appbar.min.css'
import './vendor/styleguide/elements/toolbar.min.css'
import './vendor/styleguide/elements/tabs.min.css'
import './vendor/styleguide/elements/segmented.min.css'
import './vendor/styleguide/elements/slider.min.css'
import './vendor/styleguide/elements/chip.min.css'
import './vendor/styleguide/elements/swatch.min.css'
import './vendor/styleguide/elements/switch.min.css'
import './vendor/styleguide/elements/dialog.min.css'
import './vendor/styleguide/elements/field.min.css'
import './vendor/styleguide/elements/input.min.css'
import './vendor/styleguide/elements/select.min.css'
import './vendor/styleguide/elements/divider.min.css'
import './vendor/styleguide/elements/spinner.min.css'
// The app's own CSS is unlayered, so it wins over every sg.* layer.
import './index.css'
import './fonts.css'
import App from './App.jsx'

// N1: the build owns the service worker (vite-plugin-pwa / Workbox). autoUpdate
// + immediate means an installed client silently picks up the new version — no
// update-prompt UI, no hand-maintained cache version.
registerSW({ immediate: true })

// The app bar must stay one row with whole words (the style guide's rule 19).
// CSS cannot ask "does the title fit?", so the style guide's SG.fit measures it
// and writes the richest layout that fits to data-fit (App.css draws each):
//   full     the title on one line, Save with its word
//   compact  Save as an icon (its name stays in aria-label)
//   tight    and the title may wrap at its space ("Border / Studio")
// It re-checks on resize, on the reader's text size and when fonts load.
//
// Vite hoists this module into <head>, ahead of the style guide's deferred
// scripts in <body>, so SG may not exist yet. Every deferred script has run by
// DOMContentLoaded, so register then if it is not already there.
const registerBarFit = () => window.SG?.fit?.register('.app__bar', {
  steps: ['full', 'compact', 'tight'],
  parts: '.appbar__title',
  strict: true,
})
if (window.SG?.fit) registerBarFit()
else document.addEventListener('DOMContentLoaded', registerBarFit, { once: true })

// Scrolling chip rows are measured by the style guide (42-chip) so the chip cut
// at the edge shows 30-60% of itself — a sliver reads as a stray bracket. It
// only finds rows present at load; React mounts them later, as panels open.
// Watch for them, measure each once it appears and again when it resizes.
const watchChipRows = () => {
  if (!window.SG?.chips?.fit) return
  const seen = new WeakSet()
  const ro = new ResizeObserver(entries => entries.forEach(e => window.SG.chips.fit(e.target)))
  const scan = () => document.querySelectorAll('.chips.scroller').forEach(row => {
    if (seen.has(row)) return
    seen.add(row); ro.observe(row); window.SG.chips.fit(row)
  })
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true })
  scan()
}
if (window.SG?.chips) watchChipRows()
else document.addEventListener('DOMContentLoaded', watchChipRows, { once: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
