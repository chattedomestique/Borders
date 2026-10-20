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
- `src/components/Controls/` — the sub-tabbed bottom dock (Frame / Fill / Grain / Mark / Text), built from the style guide's elements (`src/components/ui.jsx`).
- `src/App.jsx` + `src/useHistory.js` — settings state over a coalescing undo/redo hook; `src/persist.js` mirrors settings to localStorage.
- `vite.config.js` — `vite-plugin-pwa` (Workbox) owns the service worker, manifest, and precache.

## Design system

The UI is built on the owner's style guide (`chattedomestique/styleguide`, branch
`claude/generic-style-guide`), vendored into `src/vendor/styleguide` (CSS, fonts,
icons) and `public/sg` (its layout scripts) by `scripts/sync-styleguide.mjs`,
which records the source commit in `src/vendor/styleguide/VERSION.md`. To update:
rebuild the style guide, then run `node scripts/sync-styleguide.mjs ../styleguide`.

- Only the elements the app uses are shipped: button, card, appbar, toolbar,
  tabs, segmented, slider, chip, swatch, switch, dialog, field, input, select,
  divider, spinner, menu (about a third of the full bundle).
- The editor is three planes told apart by brightness, after the style
  guide's own photo-editor reference (`references/screens/img6`): the stage
  (the photo), the tray (the dock, one step up) and the floating plane
  (action sheets, dialogs, the toast: framed, over a scrim). Frames mean "on
  top": controls resting in the tray have none, an icon is a bare glyph, a
  word control sits in a well, and the chosen one is the ink fill. The rules
  and the one type scale are in `src/editor.css`.
- Everything that opens on top of the editor (the parameter picker, More, the
  layer list) is the style guide's menu presented as an action sheet, on a
  modal `<dialog>`.
- The dock is one geometry for every tool and tab: a head row (the tabs, and
  for Mark and Text a button naming the layer being edited) over one content
  area of a fixed height, an options row at the top and the parameter strip
  pinned to the bottom. So the photo is the same size and place in every
  state, and the slider is always under the same spot. The regression suite
  checks the photo's rectangle across every tool and tab.
- The look is set on `<html>`: `data-palette="sand"` — a warm-tinted neutral
  with an ink accent, so the chrome carries no colour beside the photo.
  Light / dark and higher contrast follow the device.
- The app's CSS reads the style guide's roles only, and is unlayered so it wins
  over every `sg.*` layer; it holds no element-level resets for that reason.
- React owns state. Of the style guide's scripts, only those that measure layout
  are loaded (core / `SG.fit`, segmented, toolbar); the ones that own state
  (tabs, chip, dialog, slider) are reimplemented in `ui.jsx`, because two owners
  of `aria-selected` fight.
- One documented exception to "no gradients": a colour channel's slider track,
  which shows the colours it reaches (data, like a swatch).

## Alignment with The Personal PWA Playbook

This repo is being brought into line with the Playbook. Done:

- **N1** — the build owns the service worker (`vite-plugin-pwa`); no hand-rolled SW, no hand-bumped cache version.
- **N3 / N4** — save via `navigator.share({ files })` first, `<a download>` desktop fallback; JPEG (0.95), not PNG, rendered by a separate full-resolution pass (up to the 4096 px / 16.7 Mpx canvas ceiling); `AbortError` swallowed as a clean cancel.
- **N8** — overlays (grid, guides, text bboxes) never export; the export renders a fresh frame with `overlay = null`.
- **N5 / N6** — import passes the original bytes through untouched up to 4096 px (every phone photo to ~12 MP) and only resamples above that; two-stage intake validation (pick-time + decode-time) that reaches the UI, with a decoding state.
- **N10** — `npm run lint` is green and a CI `verify` job (lint + test + build + smoke) gates `deploy`, with a concurrency guard.
- **§12** — Vitest on the pure color engine (`palette.js`): primaries, grey saturation, rgb↔hsl round-trip, hue wrap, hex↔hsl (the slider path) identity.
- **N11 (tier 1)** — settings persisted to localStorage and restored onto the next photo.
- **§3** — base-aware manifest `id`/`scope`/`start_url`; `theme_color` matches the HTML meta; separate `any` + `maskable` icons; `apple-touch-icon.png` (180); status-bar style `default` (not `black-translucent`).
- **§7** — direct manipulation (pinch / drag / double-tap), one `{zoom, panX, panY}` model; **§5.3** source-space crop clamp.
- **§8.2** — undo/redo history lives in reducer state (not refs read during render); coalescing bursts + keybindings.

## Deliberate deviations (Playbook §11.4)

- **JavaScript, not TypeScript.** The app predates the Playbook; a TS migration is the largest outstanding item. Until then `npm run lint` is the quality gate.
- **`base` is hard-coded `/Borders/`** rather than `PAGES`-conditional, because the only build target is GitHub Pages and the deploy runs a plain `npm run build`.
- **52 self-hosted OFL fonts** instead of the system stack (§3.6 / §9). Deliberate product choice for the typographic library; fonts are self-hosted and included in the Workbox precache glob, so typography is still correct offline.

## Known gaps (in progress)

- **N9** — a protected `main` as the *sole* deploy trigger still needs repo-admin setup; the workflow currently also allows `claude/**` so the active work branch can preview. Moving to the OIDC Pages actions (least-privilege) likewise needs the Pages source switched to "GitHub Actions".
- **N11 (tier 2)** — media + edits to IndexedDB for full session restore across a reload.
- **TypeScript (§2.1)** — the app is JavaScript; a TS migration would add `tsc --noEmit` to the gate.
- **Render-math tests (§12)** — the crop/pan clamp (§5.3) is inline in `renderFrame`; extracting it would let it be property-tested.
