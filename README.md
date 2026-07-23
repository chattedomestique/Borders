# Border Studio

A mobile-first, installable PWA for framing a photo or video — border, corners,
crop, an image-derived color/frosted fill, film grain, and text layers with
motion / echo / blob effects — then saving straight to the camera roll. Built for
an audience of one, iOS Safari first.

**Deployed:** https://chattedomestique.github.io/Borders/

## Run it

```bash
npm ci          # reproducible install (lockfile committed)
npm run dev     # local dev at /Borders/
npm run build   # production build → dist/
npm run preview # serve the built app
npm run lint    # ESLint
```

## Architecture (5 lines)

- `src/palette.js` — pure color engine: median-cut palette extraction + border-color harmonies drawn from the photo.
- `src/components/BorderCanvas/` — the Canvas 2D render engine (`renderFrame`) + gestures; the export renders a fresh, overlay-free frame.
- `src/components/Controls/` — the sub-tabbed bottom dock (Frame / Fill / Grain / Text), token-driven primitives (Slider, EditableValue, Toggle, SwatchGroup).
- `src/App.jsx` + `src/useHistory.js` — settings state over a coalescing undo/redo hook; `src/persist.js` mirrors settings to localStorage.
- `vite.config.js` — `vite-plugin-pwa` (Workbox) owns the service worker, manifest, and precache.

## Alignment with The Personal PWA Playbook

This repo is being brought into line with the Playbook. Done:

- **N1** — the build owns the service worker (`vite-plugin-pwa`); no hand-rolled SW, no hand-bumped cache version.
- **N3 / N4** — save via `navigator.share({ files })` first, `<a download>` desktop fallback; JPEG (0.92), not PNG; `AbortError` swallowed as a clean cancel.
- **N8** — overlays (grid, guides, text bboxes) never export; the export renders a fresh frame with `overlay = null`.
- **N11 (tier 1)** — settings persisted to localStorage and restored onto the next photo.
- **§3** — base-aware manifest `id`/`scope`/`start_url`; `theme_color` matches the HTML meta; separate `any` + `maskable` icons; `apple-touch-icon.png` (180); status-bar style `default` (not `black-translucent`).
- **§7** — direct manipulation (pinch / drag / double-tap), one `{zoom, panX, panY}` model; **§5.3** source-space crop clamp; **§8.2** coalescing undo/redo with keybindings.

## Deliberate deviations (Playbook §11.4)

- **JavaScript, not TypeScript.** The app predates the Playbook; a TS migration is the largest outstanding item. Until then `npm run lint` is the quality gate.
- **`base` is hard-coded `/Borders/`** rather than `PAGES`-conditional, because the only build target is GitHub Pages and the deploy runs a plain `npm run build`.
- **52 self-hosted OFL fonts** instead of the system stack (§3.6 / §9). Deliberate product choice for the typographic library; fonts are self-hosted and included in the Workbox precache glob, so typography is still correct offline.

## Known gaps (in progress)

- **N5** — downscale on import (~2048 px) is not yet in the intake path.
- **N6** — decode-failure feedback needs to reach the UI (currently a decode error can leave the canvas idle).
- **N9 / N10** — a protected `main` as the sole deploy trigger, and a CI `verify` (lint + build) job gating `deploy`, still need repo-admin setup.
- **N11 (tier 2)** — media + edits to IndexedDB for full session restore across a reload.
