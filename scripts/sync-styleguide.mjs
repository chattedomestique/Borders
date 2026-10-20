#!/usr/bin/env node
// Copy the parts of the style guide Border Studio uses from a styleguide
// checkout into this repo, and record which commit they came from.
//
//   node scripts/sync-styleguide.mjs ../styleguide
//
// Only the elements listed below are copied, not the whole 288 KB bundle: the
// style guide ships each element as its own file for exactly this (see its
// dist/elements/manifest.json). Never edit the copies by hand; change the
// style guide, rebuild it there, and run this again.
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execSync } from 'node:child_process'

const src = resolve(process.argv[2] ?? '../styleguide')
const dist = join(src, 'dist')
if (!existsSync(join(dist, 'core.min.css'))) {
  console.error(`No style guide build at ${dist}`); process.exit(1)
}

// Every element a Border Studio screen is built from.
const ELEMENTS = ['button', 'card', 'toolbar', 'segmented', 'tabs', 'slider', 'appbar', 'chip',
                  'swatch', 'dialog', 'spinner', 'switch', 'divider', 'field', 'input', 'select', 'menu']
// The style guide's scripts that only measure layout. The ones that own state
// (tabs, slider, chip, dialog) are left out on purpose: React owns that state,
// and two owners of aria-selected fight.
// 70-scrubber is here only because 71-toolbar calls SG.afterParse, which the
// scrubber script defines; the manifest does not list it (an upstream gap). It
// is inert without .scrubber elements.
// 42-chip: only its scrolling-row measure is used (the chip cut at the edge
// shows 30-60% of itself, never a sliver). Its click handling is opt-in per
// row (data-sg-chips), and no row opts in, so it owns no state here.
const SCRIPTS = ['42-chip', '44-segmented', '70-scrubber', '71-toolbar']

const css = resolve('src/vendor/styleguide')
const js = resolve('public/sg')
rmSync(css, { recursive: true, force: true }); rmSync(js, { recursive: true, force: true })
mkdirSync(join(css, 'elements'), { recursive: true }); mkdirSync(join(js, 'js'), { recursive: true })

cpSync(join(dist, 'core.min.css'), join(css, 'core.min.css'))
cpSync(join(dist, 'icons.css'), join(css, 'icons.css'))
cpSync(join(dist, 'fonts'), join(css, 'fonts'), { recursive: true })
for (const e of ELEMENTS) cpSync(join(dist, 'elements', `${e}.min.css`), join(css, 'elements', `${e}.min.css`))
cpSync(join(dist, 'core.min.js'), join(js, 'core.min.js'))
for (const s of SCRIPTS) cpSync(join(dist, 'js', `${s}.min.js`), join(js, 'js', `${s}.min.js`))
cpSync(join(src, 'src', 'icons', 'LICENSE-lucide.txt'), join(css, 'LICENSE-lucide.txt'))

let commit = 'unknown', branch = 'unknown'
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: src }).toString().trim()
  branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: src }).toString().trim()
} catch { /* not a git checkout */ }
const version = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8')).version
writeFileSync(join(css, 'VERSION.md'),
`# Vendored style guide

From chattedomestique/styleguide, branch \`${branch}\`, commit \`${commit}\` (v${version}).
Copied by \`scripts/sync-styleguide.mjs\`. Do not edit these files by hand.

Elements: ${ELEMENTS.join(', ')}.
Scripts (in public/sg/js): core, ${SCRIPTS.join(', ')}.

Archivo is SIL OFL 1.1 (fonts/OFL-Archivo.txt). Icons are Lucide, ISC (LICENSE-lucide.txt).
`)
console.log(`Vendored style guide ${branch}@${commit} (v${version}): ${ELEMENTS.length} elements, ${SCRIPTS.length + 1} scripts`)
