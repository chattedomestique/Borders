import { useState, useRef, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { Icon, Segmented, Tabs, Switch, SwatchSet } from '../ui'
import { useModalDialog } from '../useModalDialog'
import './Controls.css'
import { hexToHsl, hslCss } from '../../palette'

const CROP_RATIOS = [
  { id: 'free', label: 'Free', alt: null  },
  { id: '1:1',  label: '1:1',  alt: null  },
  { id: '4:5',  label: '4:5',  alt: '5:4' },
  { id: '3:4',  label: '3:4',  alt: '4:3' },
  { id: '9:16', label: '9:16', alt: '16:9'},
  { id: '2:3',  label: '2:3',  alt: '3:2' },
]

// Perceived-luminance test so a checkmark on a swatch stays legible.

// System stacks + self-hosted OFL fonts from open-source foundries
// (see src/fonts.css and src/assets/fonts/CREDITS.md).
const FONTS = [
  { id: 'system-ui, -apple-system, sans-serif',  label: 'Sans',  group: 'System' },
  { id: "'New York', Georgia, serif",             label: 'Serif', group: 'System' },
  { id: "ui-monospace, 'Courier New', monospace", label: 'Mono',  group: 'System' },

  { id: "'Jost', sans-serif",        label: 'Jost',        group: 'Indestructible Type' },
  { id: "'Besley', serif",           label: 'Besley',      group: 'Indestructible Type' },
  { id: "'Bodoni Moda', serif",      label: 'Bodoni',      group: 'Indestructible Type' },

  { id: "'Nyght Serif', serif",      label: 'Nyght Serif', group: 'Tunera' },
  { id: "'Paysage', sans-serif",     label: 'Paysage',     group: 'Tunera' },
  { id: "'Kobata', sans-serif",      label: 'Kobata',      group: 'Tunera' },
  { id: "'Manosque', serif",         label: 'Manosque',    group: 'Tunera' },

  { id: "'Caffeine', sans-serif",    label: 'Caffeine',    group: 'Too Much Type' },
  { id: "'M Krone', sans-serif",     label: 'M Krone',     group: 'Too Much Type' },
  { id: "'Mini Mochi', cursive",     label: 'Mini Mochi',  group: 'Too Much Type' },

  // Indestructible Type (revivals)
  { id: "'Jones', serif",        label: 'Jones',       group: 'Indestructible Type' },
  { id: "'Copperplate', serif",  label: 'Copperplate', group: 'Indestructible Type' },
  { id: "'Tiffany', sans-serif", label: 'Tiffany',     group: 'Indestructible Type' },
  { id: "'Engraving', serif",    label: 'Engraving',   group: 'Indestructible Type' },
  { id: "'Railroad', sans-serif",label: 'Railroad',    group: 'Indestructible Type' },

  // Tunera
  { id: "'Brassia', sans-serif",             label: 'Brassia',              group: 'Tunera' },
  { id: "'Canarina', sans-serif",            label: 'Canarina',             group: 'Tunera' },
  { id: "'Malebolge', sans-serif",           label: 'Malebolge',            group: 'Tunera' },
  { id: "'Picaflor', serif",                 label: 'Picaflor',             group: 'Tunera' },
  { id: "'Isenheim', serif",                 label: 'Isenheim',             group: 'Tunera' },
  { id: "'Lobular', sans-serif",             label: 'Lobular',              group: 'Tunera' },
  { id: "'Teranoptia', sans-serif",          label: 'Teranoptia',           group: 'Tunera' },
  { id: "'Pescante', sans-serif",            label: 'Pescante',             group: 'Tunera' },
  { id: "'Roubaix Industrielle', sans-serif",label: 'Roubaix Industrielle', group: 'Tunera' },
  { id: "'Piscolabis', sans-serif",          label: 'Piscolabis',           group: 'Tunera' },
  { id: "'Amakan', sans-serif",              label: 'Amakan',               group: 'Tunera' },
  { id: "'Tanklager', sans-serif",           label: 'Tanklager',            group: 'Tunera' },
  { id: "'Azabache', serif",                 label: 'Azabache',             group: 'Tunera' },
  { id: "'Choso', sans-serif",               label: 'Choso',                group: 'Tunera' },
  { id: "'Luperca', serif",                  label: 'Luperca',              group: 'Tunera' },
  { id: "'Ampoule', sans-serif",             label: 'Ampoule',              group: 'Tunera' },

  // Too Much Type (experimental / variable)
  { id: "'AUTHENTIC Remixed', sans-serif", label: 'AUTHENTIC Remixed', group: 'Too Much Type' },
  { id: "'Bashful', sans-serif",           label: 'Bashful',           group: 'Too Much Type' },
  { id: "'PowerPack', sans-serif",         label: 'PowerPack',         group: 'Too Much Type' },
  { id: "'That Then This', sans-serif",    label: 'That Then This',    group: 'Too Much Type' },
  { id: "'Urging Osmosis A', sans-serif",  label: 'Urging Osmosis A',  group: 'Too Much Type' },
  { id: "'Urging Osmosis B', sans-serif",  label: 'Urging Osmosis B',  group: 'Too Much Type' },
  { id: "'Urging Osmosis C', sans-serif",  label: 'Urging Osmosis C',  group: 'Too Much Type' },
  { id: "'Urging Osmosis E', sans-serif",  label: 'Urging Osmosis E',  group: 'Too Much Type' },
  { id: "'Urging Osmosis K', sans-serif",  label: 'Urging Osmosis K',  group: 'Too Much Type' },
  { id: "'Urging Osmosis L', sans-serif",  label: 'Urging Osmosis L',  group: 'Too Much Type' },
  { id: "'Dreidel', sans-serif",           label: 'Dreidel',           group: 'Too Much Type' },
  { id: "'Limkin', sans-serif",            label: 'Limkin',            group: 'Too Much Type' },
  { id: "'Limkin Pixel', monospace",       label: 'Limkin Pixel',      group: 'Too Much Type' },
  { id: "'Music Box', sans-serif",         label: 'Music Box',         group: 'Too Much Type' },
  { id: "'Work Sans Galápagos', sans-serif",label: 'Work Sans Galápagos', group: 'Too Much Type' },
  { id: "'Avara Burst', sans-serif",       label: 'Avara Burst',       group: 'Too Much Type' },
  { id: "'FT88 RISD', sans-serif",         label: 'FT88 RISD',         group: 'Too Much Type' },
  { id: "'Typey', sans-serif",             label: 'Typey',             group: 'Too Much Type' },
]

// FONTS grouped, in declaration order, for the scrolling picker.
const FONT_GROUPS = FONTS.reduce((acc, f) => {
  const g = acc.find(x => x.name === f.group)
  if (g) g.fonts.push(f); else acc.push({ name: f.group, fonts: [f] })
  return acc
}, [])

// Letters fit four cells on a phone; the radio's own name says it in words.
const ALIGNS = [
  { id: 'left',    label: 'L', aria: 'Align left' },
  { id: 'center',  label: 'C', aria: 'Align centre' },
  { id: 'right',   label: 'R', aria: 'Align right' },
  { id: 'justify', label: 'J', aria: 'Justify' },
]

const TEXT_BG_MODES = [
  { id: 'none', label: 'None' },
  { id: 'pill', label: 'Pill' },
  { id: 'rect', label: 'Box'  },
]

// Auto ties every box to the line height, so the block is always one solid
// slab. Manual scales off that auto box, which is how you pull the lines apart
// into separate bars (or widen them into banners).
const TEXT_BOX_SIZES = [
  { id: 'auto',   label: 'Auto'   },
  { id: 'manual', label: 'Manual' },
]

const ECHO_BLENDS = [
  { id: 'stack',   label: 'Stack'   },
  { id: 'screen',  label: 'Screen'  },
  { id: 'lighten', label: 'Lighten' },
]

/**
 * Range slider that resets to its default on double-tap / double-click of the
 * handle. `def` is the default value; `on(value)` receives the numeric value
 * (from drags and from the reset). All other props pass through to the input.
 */
// Snap a number onto a slider's grid and range (shared by the nudges and the
// typed entry, so both land on values the slider itself can reach).
function snapTo(n, min, max, step) {
  let v = Math.min(max, Math.max(min, n))
  if (step) v = Math.round((v - min) / step) * step + min
  return Math.round(v * 1000) / 1000
}

/**
 * The style guide's slider row: [−] track [+]. The − / + are the single-
 * pointer alternative to dragging (WCAG 2.5.7) and the one-step nudge you
 * asked for; they go aria-disabled (not removed) at the ends. The track resets
 * to its default on a double-tap.
 */
function Slider({ def, on, className = '', style, label, ...rest }) {
  const lastTap = useRef(0)
  const auto = useId()
  const id = rest.id ?? `sl${auto}`
  const reset = () => { if (def != null) on(def) }
  // The style guide draws the rail and its filled part behind a transparent
  // native track, from --p (0…1). Its own script would set --p; React owns the
  // value here, so React sets it.
  const min = Number(rest.min ?? 0), max = Number(rest.max ?? 100), step = Number(rest.step ?? 1)
  const v = Number(rest.value ?? min)
  const p = max > min ? (v - min) / (max - min) : 0
  const name = label || rest['aria-label'] || 'value'
  const nudge = (dir) => {
    const n = snapTo(v + dir * step, min, max, step)
    if (n !== v) on(n)
  }
  return (
    <div className={`slider controls__slider${className ? ` ${className}` : ''}`}
      style={{ ...style, '--p': Math.min(1, Math.max(0, p)) }}>
      <div className="slider__row">
        <button type="button" className="btn" data-shape="circle" data-size="sm" data-sg-nudge="-1"
          aria-label={`Decrease ${name}`} aria-controls={id} aria-disabled={v <= min || undefined}
          onClick={() => nudge(-1)}><Icon name="minus" /></button>
        <div className="slider__track">
          <input
            type="range" className="slider__input" {...rest} id={id}
            aria-label={rest['aria-label'] ?? (label || undefined)}
            onChange={e => on(Number(e.target.value))}
            onDoubleClick={reset}
            onPointerDown={() => {
              const now = Date.now()
              if (now - lastTap.current < 320) { reset(); lastTap.current = 0 }
              else lastTap.current = now
            }}
          />
        </div>
        <button type="button" className="btn" data-shape="circle" data-size="sm" data-sg-nudge="1"
          aria-label={`Increase ${name}`} aria-controls={id} aria-disabled={v >= max || undefined}
          onClick={() => nudge(1)}><Icon name="plus" /></button>
      </div>
    </div>
  )
}

// Precise value entry: the style guide's form dialog (a card on a native
// <dialog>). Replaces the old inline number input, which on iOS auto-zoomed onto
// the field and never zoomed back out. The input is 16px+ so iOS never zooms.
function ValueModal({ label, value, min, max, step, suffix, format, onCommit, onClose }) {
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef(null)
  // The hook returns focus to the value that opened this, whichever way it ends.
  const ref = useModalDialog(true, onClose)

  useEffect(() => {
    const el = inputRef.current
    if (el) { el.focus(); el.select() }
  }, [])

  const submit = () => {
    const n = parseFloat(draft)
    if (Number.isNaN(n)) { onClose(); return }
    onCommit(n)
  }
  const bump = (dir) => {
    const base = parseFloat(draft)
    const from = Number.isNaN(base) ? value : base
    setDraft(String(Math.min(max, Math.max(min, from + dir * step))))
  }
  const name = label || 'Value'

  return createPortal(
    <dialog ref={ref} className="dialog card valuemodal" data-size="sm" aria-labelledby="valuemodal-t">
      <form method="dialog" className="dialog__form" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <header className="card__bar">
          <p className="card__label" id="valuemodal-t">{name}</p>
        </header>
        <div className="card__body valuemodal__body">
          <div className="valuemodal__field">
            <button type="button" className="btn" data-shape="circle" aria-label={`Decrease ${name}`}
              onClick={() => bump(-1)}><Icon name="minus" /></button>
            <input
              ref={inputRef} className="input num valuemodal__input"
              type="number" inputMode={min < 0 ? 'text' : 'decimal'}
              value={draft} min={min} max={max} step={step}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={name} aria-describedby="valuemodal-range"
            />
            <button type="button" className="btn" data-shape="circle" aria-label={`Increase ${name}`}
              onClick={() => bump(1)}><Icon name="plus" /></button>
          </div>
          <p className="t-meta num valuemodal__range" id="valuemodal-range">
            {format ? `${format(min)} to ${format(max)}` : `${min}${suffix} to ${max}${suffix}`}
          </p>
        </div>
        <div className="dialog__actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" data-variant="primary">Set</button>
        </div>
      </form>
    </dialog>,
    document.body,
  )
}

/**
 * The value beside a slider's name: plain text, as the style guide's slider
 * readout, that you can tap to type an exact number. `format` keeps pretty
 * labels ("Normal", "Square", "+20%") while the editor works on the raw number.
 */
function EditableValue({ value, min, max, step = 1, onChange, format, suffix = '', label }) {
  const [editing, setEditing] = useState(false)
  const display = format ? format(value) : `${value}${suffix}`
  return (
    <>
      <button type="button" className="controls__value num"
        onClick={() => setEditing(true)} aria-label={`${label || 'Value'} ${display}, tap to type`}>
        {display}
      </button>
      {editing && (
        <ValueModal
          label={label} value={value} min={min} max={max} step={step} suffix={suffix} format={format}
          onCommit={(n) => { const v = snapTo(n, min, max, step); if (v !== value) onChange(v); setEditing(false) }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

/**
 * Asked when adding a layer while others already exist: start from defaults, or
 * clone an existing layer's settings. Cloning is the common case once you've
 * dialled a look in — retyping a dozen sliders to match is the tedious path.
 */
function AddLayerSheet({ title, layers, labelFor, dotFor, onDefault, onCopy, onClose }) {
  const ref = useModalDialog(true, onClose)
  return createPortal(
    <dialog ref={ref} className="dialog card addsheet" data-size="sm" aria-labelledby="addsheet-t">
      <header className="card__bar">
        <p className="card__label" id="addsheet-t">{title}</p>
      </header>
      <div className="card__body addsheet__body">
        <button className="btn" type="button" data-variant="primary" data-block="" autoFocus onClick={onDefault}>
          Start from defaults
        </button>
        <p className="t-label addsheet__sep">Or copy the settings of</p>
        <div className="addsheet__list">
          {layers.map((l, i) => (
            <button key={l.id} type="button" className="btn" data-block="" onClick={() => onCopy(l.id)}>
              <span className="btn__label">
                {dotFor && <span className="controls__markdot" style={{ '--swatch': dotFor(l) }} aria-hidden="true" />}
                {labelFor(l, i)}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="dialog__actions">
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
      </div>
    </dialog>,
    document.body,
  )
}

/**
 * The parameter picker overlay — Snapseed's list, floating over the photo.
 *
 * The whole point is that it costs ZERO permanent layout: it appears above the
 * dock, over the image, only while you're choosing, then vanishes. That is the
 * structural difference from a dock-resident list, and it's where the image area
 * actually comes from.
 *
 * Selection works by tap OR by dragging through the rows and releasing on one
 * (pointer capture keeps the drag alive across rows), mirroring Snapseed's
 * vertical-swipe pick.
 */
function ParamPicker({ params, currentKey, onPick, onClose }) {
  const [hover, setHover] = useState(currentKey)
  const rowsRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Which row is under a given clientY (used while dragging through the list).
  const keyAt = (clientY) => {
    const el = rowsRef.current
    if (!el) return null
    for (const child of el.children) {
      const r = child.getBoundingClientRect()
      if (clientY >= r.top && clientY <= r.bottom) return child.dataset.key
    }
    return null
  }

  return createPortal(
    <div className="parampick" role="dialog" aria-modal="true" aria-label="Choose parameter"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="parampick__rows" ref={rowsRef}
        onPointerMove={(e) => { if (e.buttons) { const k = keyAt(e.clientY); if (k) setHover(k) } }}
        onPointerUp={(e) => { const k = keyAt(e.clientY); if (k) { onPick(k); onClose() } }}>
        {params.map(p => {
          const on = hover === p.key
          return (
            <button key={p.key} data-key={p.key} type="button"
              className={`parampick__row${on ? ' parampick__row--on' : ''}`}
              aria-current={p.key === currentKey}
              onClick={() => { onPick(p.key); onClose() }}>
              <span className="parampick__label">
                {p.key === currentKey && <Icon name="check" className="parampick__mark" />}
                {p.label}
              </span>
              <span className="parampick__val">{p.format ? p.format(p.value) : `${p.value}${p.suffix ?? ''}`}</span>
            </button>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}

/**
 * One parameter, one line — Snapseed's control strip.
 *
 * Permanently on screen: the parameter's name (with an up/down chevron marking
 * it as the picker affordance), its value with ± steppers and tap-to-type, and
 * the slider beneath. Every OTHER parameter lives in a transient overlay that
 * costs no layout, so the dock stays the same small height no matter how many
 * parameters a panel has — which is what keeps the photo visible.
 *
 * The picker is opened by tapping the name, or by swiping up from it. The strip
 * is the gesture surface rather than the image, so the canvas keeps pan, pinch,
 * layer-drag and eyedropper untouched.
 */
function ParamStrip({ params, lead }) {
  const all = params.filter(Boolean)
  const [key, setKey] = useState(all[0]?.key)
  const [pickOpen, setPickOpen] = useState(false)
  const swipe = useRef(null)

  const cur = all.find(p => p.key === key) ?? all[0]
  if (!cur) return null
  const multi = all.length > 1

  return (
    <div className="paramstrip">
      <div className="paramstrip__head">
        {lead}
        {multi ? (
          <button type="button" className="paramstrip__pick"
            onPointerDown={(e) => { swipe.current = { y: e.clientY, fired: false } }}
            onPointerMove={(e) => {
              const s = swipe.current
              if (s && !s.fired && s.y - e.clientY > 8) { s.fired = true; setPickOpen(true) }
            }}
            onPointerUp={() => { swipe.current = null }}
            onClick={() => { if (!pickOpen) setPickOpen(true) }}
            aria-haspopup="dialog" aria-expanded={pickOpen}>
            <Icon name="chevrons-up-down" />
            {cur.label}
          </button>
        ) : (
          <span className="paramstrip__name">{cur.label}</span>
        )}
        <EditableValue value={cur.value} min={cur.min} max={cur.max} step={cur.step ?? 1}
          suffix={cur.suffix} format={cur.format} label={cur.label} onChange={cur.onChange} />
      </div>
      <Slider min={cur.min} max={cur.max} step={cur.step ?? 1} def={cur.def}
        value={cur.value} on={cur.onChange} label={cur.label}
        className={cur.sliderClass} style={cur.sliderStyle} />

      {pickOpen && (
        <ParamPicker params={all} currentKey={key}
          onPick={setKey} onClose={() => setPickOpen(false)} />
      )}
    </div>
  )
}

// Call sites pass `params`; the strip is a drop-in for the old row list.
const ParamRows = ParamStrip

// One harmony group of border-colour suggestions: the style guide's swatch set.
// "Chosen" is the border's current colour, so a swatch reads as selected only
// while it is what the border actually is.
function SwatchGroup({ title, hint, action, items, bgMode, bgColor, onApply }) {
  if (!items?.length) return null
  const current = bgMode === 'color'
    ? items.find(s => (bgColor || '').toLowerCase() === s.hex.toLowerCase())?.id ?? null
    : null
  return (
    <>
      <div className="controls__group-head">
        <span className="t-label">{title}</span>
        {action || (hint && <span className="t-meta">{hint}</span>)}
      </div>
      <SwatchSet legend={title} items={items} value={current} onPick={s => onApply?.(s.hex)} />
    </>
  )
}

// Hue / Saturation / Brightness sliders that fine-tune the selected border
// colour. Keeps a working HSL value so dragging a channel to an extreme (e.g.
// saturation 0) doesn't lose the others to hex round-tripping. Re-syncs when the
// colour changes from outside (a swatch tap, eyedropper, or undo). Double-tap a
// handle resets that channel to the last externally-applied colour.
// Normalize any hex-ish string to '#rrggbb' (or null). Accepts 3- or 6-digit,
// with or without '#'. Used by the hex input / paste path.
function normalizeHex(str) {
  if (!str) return null
  let s = String(str).trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map(c => c + c).join('')
  return /^[0-9a-fA-F]{6}$/.test(s) ? '#' + s.toLowerCase() : null
}

// The shared colour editor used EVERYWHERE a colour is chosen: Hue / Saturation
// / Brightness sliders plus a hex field (type, paste, copy). `hex` in, `onColor`
// out. Keeps a working HSL so dragging to an extreme doesn't lose the other
// channels to hex round-tripping, and re-syncs on external changes (undo, etc).
function ColorSliders({ hex, onColor, compact = false }) {
  const safe = normalizeHex(hex) || '#ffffff'
  const initial = hexToHsl(safe)
  const [hsl, setHsl] = useState(initial)
  const [base, setBase] = useState(initial)      // slider reset target
  const [emitted, setEmitted] = useState(null)   // hex we last pushed out
  const [seen, setSeen] = useState(hex)
  const [hexDraft, setHexDraft] = useState(safe.slice(1))  // input shows without '#'
  const [copied, setCopied] = useState(false)

  if (hex && hex !== seen) {
    setSeen(hex)
    const norm = normalizeHex(hex) || '#ffffff'
    if (norm.toLowerCase() !== emitted) {
      const next = hexToHsl(norm)
      setHsl(next); setBase(next); setHexDraft(norm.slice(1))
    }
  }

  const emit = (nextHex) => { setEmitted(nextHex.toLowerCase()); onColor(nextHex) }
  const setChan = (k, v) => {
    const next = { ...hsl, [k]: v }
    setHsl(next)
    const nh = hslCss(next.h, next.s, next.l)
    setHexDraft(nh.slice(1))
    emit(nh)
  }
  const onHexInput = (v) => {
    const norm = normalizeHex(v)
    // A value carrying its own '#' arrived by paste, not by typing — the field
    // renders the '#' as a separate span, so it can never be typed in. Take
    // those whole, which expands shorthand ('#f0a' → ff00aa). Typed input is
    // sanitised character by character instead, so '000' on the way to
    // '00c2a8' isn't expanded to '000000' under the cursor.
    setHexDraft(norm && v.includes('#') ? norm.slice(1) : v.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))
    if (norm) { setHsl(hexToHsl(norm)); emit(norm) }
  }
  const copy = () => {
    try { navigator.clipboard?.writeText('#' + (normalizeHex(hexDraft) || safe).slice(1)) } catch { /* denied */ }
    setCopied(true); setTimeout(() => setCopied(false), 1100)
  }

  const h = Math.round(hsl.h), s = Math.round(hsl.s), l = Math.round(hsl.l)
  // The one place a gradient is drawn: a colour channel's track IS the range
  // of colours it reaches (data, like a swatch), not decoration.
  const trackSat = `linear-gradient(to right, ${hslCss(hsl.h, 0, hsl.l)}, ${hslCss(hsl.h, 100, hsl.l)})`
  const trackLit = `linear-gradient(to right, #000, ${hslCss(hsl.h, hsl.s, 50)}, #fff)`

  const channels = [
    { key: 'h', label: 'Hue', suffix: '°', min: 0, max: 360, step: 1, def: Math.round(base.h),
      value: h, onChange: v => setChan('h', v), sliderClass: 'controls__slider--hue' },
    { key: 's', label: 'Saturation', suffix: '%', min: 0, max: 100, step: 1, def: Math.round(base.s),
      value: s, onChange: v => setChan('s', v), sliderClass: 'controls__slider--tint', sliderStyle: { '--track': trackSat } },
    { key: 'l', label: 'Brightness', suffix: '%', min: 0, max: 100, step: 1, def: Math.round(base.l),
      value: l, onChange: v => setChan('l', v), sliderClass: 'controls__slider--tint', sliderStyle: { '--track': trackLit } },
  ]

  return (
    <div className="controls__hsl">
      {compact ? (
        // In the dock: one channel at a time (the parameter strip), so the
        // panel never scrolls the hex field out of reach.
        <ParamRows params={channels} />
      ) : channels.map(c => (
        <div key={c.key}>
          <div className="controls__row"><span className="controls__label">{c.label}</span>
            <EditableValue value={c.value} min={c.min} max={c.max} suffix={c.suffix} label={c.label} onChange={c.onChange} /></div>
          <Slider className={c.sliderClass} style={c.sliderStyle} min={c.min} max={c.max} step={c.step}
            def={c.def} value={c.value} on={c.onChange} label={c.label} />
        </div>
      ))}

      <div className="controls__hexrow">
        <div className="input-group controls__hexfield">
          <span className="input-group__start t-mono" aria-hidden="true">#</span>
          <input className="input t-mono controls__hexinput" value={hexDraft} onChange={e => onHexInput(e.target.value)}
            spellCheck={false} autoCapitalize="none" autoCorrect="off" inputMode="text"
            aria-label="Hex color" />
          {/* No maxLength: the browser applies it to the raw paste, so '#ff4d8d'
              would arrive already cut to '#ff4d8'. onHexInput does the clamping. */}
        </div>
        <button type="button" className="btn" data-size="sm" onClick={copy} aria-label="Copy hex color">
          <span className="btn__label"><Icon name={copied ? 'check' : 'copy'} />{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  )
}

// A colour swatch that opens the shared editor in a modal — used for text /
// outline / background / blob colours.
function ColorField({ value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const v = normalizeHex(value) || '#000000'
  return (
    <>
      <button type="button" className="btn controls__colorbtn" data-shape="circle"
        onClick={() => setOpen(true)} aria-label={`${label || 'Color'} ${v}, tap to change`}>
        <span className="controls__colorchip" style={{ '--swatch': v }} aria-hidden="true" />
      </button>
      {open && <ColorModal label={label} value={v} onChange={onChange} onClose={() => setOpen(false)} />}
    </>
  )
}

function ColorModal({ label, value, onChange, onClose }) {
  const ref = useModalDialog(true, onClose)
  const v = normalizeHex(value) || '#000000'
  return createPortal(
    <dialog ref={ref} className="dialog card colormodal" data-size="sm" aria-labelledby="colormodal-t">
      <header className="card__bar">
        <p className="card__label" id="colormodal-t">{label || 'Color'}</p>
      </header>
      <div className="card__body colormodal__body">
        <div className="colormodal__preview" style={{ '--swatch': v }} role="img" aria-label={`Current color ${v}`} />
        <ColorSliders hex={value} onColor={onChange} />
      </div>
      <div className="dialog__actions">
        <button type="button" className="btn" data-variant="primary" data-block="" onClick={onClose}>Done</button>
      </div>
    </dialog>,
    document.body,
  )
}

// Border-fill controls, split into compact sub-tabs so each view fits the
// bottom dock without scrolling and the photo stays large.
const BG_SUBTABS = [
  { id: 'photo',   label: 'Photo'   },
  { id: 'accents', label: 'Accents' },
  { id: 'adjust',  label: 'Adjust'  },
  { id: 'frosted', label: 'Frosted' },
]

function BgControls({ settings, onUpdate, pickMode, onPickMode, borderSuggestions, onApplyBorderColor }) {
  const { bgMode, bgColor = '#ffffff', blurAmount,
          frostBrightness = -15, frostContrast = 0, frostSaturation = 60, frostVibrance = 0 } = settings
  const [sub, setSub] = useState(bgMode === 'frosted' ? 'frosted' : 'photo')

  // Selecting a colour sub-tab implies a flat-colour border; Frosted swaps the
  // treatment. Keeps bgMode and the visible sub-tab in sync.
  const pick = (id) => {
    setSub(id)
    if (id === 'frosted') { if (bgMode !== 'frosted') onUpdate('bgMode', 'frosted') }
    else if (bgMode === 'frosted') onUpdate('bgMode', 'color')
  }

  const tones = borderSuggestions.filter(s => s.group === 'tone')
  const accents = borderSuggestions.filter(s => s.group === 'accent')

  const eyedrop = (
    <button type="button" className="btn" data-size="sm" onClick={onPickMode} aria-pressed={pickMode}
      aria-label="Pick a color from the photo">
      <span className="btn__label"><Icon name="pipette" />{pickMode ? 'Tap the photo' : 'Eyedrop'}</span>
    </button>
  )

  return (
    <section className="controls__section controls__section--dock" aria-label="Border fill">
      <Tabs label="Border fill" tabs={BG_SUBTABS} value={sub} onChange={pick} idBase="fill" />
      <div role="tabpanel" id="fill-panel" aria-labelledby={`fill-tab-${sub}`}
        className="controls__panel">

      {sub === 'photo' && (
        <SwatchGroup title="From your photo" hint="tap to apply" items={tones}
          bgMode={bgMode} bgColor={bgColor} onApply={onApplyBorderColor} />
      )}

      {sub === 'accents' && (
        <SwatchGroup title="Complementary & pop" action={eyedrop} items={accents}
          bgMode={bgMode} bgColor={bgColor} onApply={onApplyBorderColor} />
      )}

      {sub === 'adjust' && (
        <ColorSliders hex={bgColor} compact
          onColor={hex => { onUpdate('bgColor', hex); if (bgMode !== 'color') onUpdate('bgMode', 'color') }} />
      )}

      {sub === 'frosted' && (
        <ParamRows params={[
          { key: 'blur', label: 'Blur', suffix: 'px', min: 10, max: 240, step: 2, def: 60,
            value: blurAmount, onChange: v => onUpdate('blurAmount', v) },
          { key: 'bright', label: 'Brightness', min: -100, max: 200, step: 1, def: -15,
            format: v => `${v > 0 ? `+${v}` : v}`,
            value: frostBrightness, onChange: v => onUpdate('frostBrightness', v) },
          { key: 'contrast', label: 'Contrast', min: -100, max: 200, step: 1, def: 0,
            format: v => `${v > 0 ? `+${v}` : v}`,
            value: frostContrast, onChange: v => onUpdate('frostContrast', v) },
          { key: 'satur', label: 'Saturation', min: -100, max: 300, step: 1, def: 60,
            format: v => `${v > 0 ? `+${v}` : v}`,
            value: frostSaturation, onChange: v => onUpdate('frostSaturation', v) },
          { key: 'vibrance', label: 'Vibrance', min: 0, max: 200, step: 1, def: 0,
            format: v => v === 0 ? 'Off' : `+${v}`,
            value: frostVibrance, onChange: v => onUpdate('frostVibrance', v) },
        ]} />
      )}
      </div>
    </section>
  )
}

// Frame controls, sub-tabbed so each view fits the dock without scrolling.
const FRAME_SUBTABS = [
  { id: 'border', label: 'Border' },
  { id: 'crop',   label: 'Crop'   },
  { id: 'grid',   label: 'Grid'   },
]

function FrameControls({ borderThickness, cornerRadius, cropRatio = 'free', aspectMode = 'crop', showMedia, onUpdate,
                         snapEnabled, onSnapToggle, gridDivisions, onGridDivisions,
                         sub = 'border', onSub }) {
  const setSub = onSub
  return (
    <section className="controls__section controls__section--dock" aria-label="Frame">
      <Tabs label="Frame" tabs={FRAME_SUBTABS} value={sub} onChange={setSub} idBase="frame" />
      <div role="tabpanel" id="frame-panel" aria-labelledby={`frame-tab-${sub}`}
        className="controls__panel">

      {sub === 'border' && (
        <>
          <ParamRows params={[
            { key: 'border', label: 'Border', suffix: 'px', min: 0, max: 400, step: 1, def: 150,
              value: borderThickness, onChange: v => onUpdate('borderThickness', v) },
            { key: 'corners', label: 'Corners', min: 0, max: 100, step: 1, def: 0,
              format: v => v === 0 ? 'Square' : v === 100 ? 'Round' : `${v}%`,
              value: cornerRadius, onChange: v => onUpdate('cornerRadius', v) },
          ]} />

          <Switch label="Show photo" checked={showMedia} onChange={v => onUpdate('showMedia', v)} />
        </>
      )}

      {sub === 'crop' && (
        <>
          {/* What the chosen ratio applies to: trim the photo, or matte it into
              a frame of that ratio (photo keeps its own aspect, uncropped). */}
          <Segmented label="Aspect mode" value={aspectMode === 'fit' ? 'fit' : 'crop'}
            onChange={v => onUpdate('aspectMode', v)}
            options={[{ id: 'crop', label: 'Crop photo' }, { id: 'fit', label: 'Fit photo' }]} />
          <p className="controls__hint">
            {aspectMode === 'fit'
              ? 'Frame takes this ratio; photo is matted inside, uncropped.'
              : 'Photo is trimmed to this ratio.'}
          </p>
          <label className="controls__label">
            {cropRatio === 'free' ? 'Aspect ratio' : (aspectMode === 'fit' ? 'Frame ratio' : 'Crop ratio')}
          </label>
          {/* Choice chips on one scrolling line. The chosen ratio carries a flip
              cue: tap it again to turn it on its side. */}
          <div className="chips scroller controls__chips" role="group" aria-label="Ratio">
            {CROP_RATIOS.map(r => {
              const isPortrait  = cropRatio === r.id
              const isLandscape = r.alt !== null && cropRatio === r.alt
              const isActive    = isPortrait || isLandscape
              const displayLabel = isLandscape ? r.alt : r.id
              const canFlip = r.alt !== null
              const handleClick = () => {
                if (!isActive) { onUpdate('cropRatio', r.id) }
                else if (canFlip) { onUpdate('cropRatio', isPortrait ? r.alt : r.id) }
              }
              return (
                <button key={r.id} type="button" className="chip num" onClick={handleClick} aria-pressed={isActive}
                  aria-label={isActive && canFlip ? `${displayLabel}, tap to flip` : displayLabel}>
                  {displayLabel}
                  {isActive && canFlip && <Icon name="refresh-cw" className="controls__flip" />}
                </button>
              )
            })}
          </div>
        </>
      )}

      {sub === 'grid' && (
        <>
          <Switch label="Snap to grid" checked={!!snapEnabled} onChange={() => onSnapToggle?.()} />
          {snapEnabled && (
            <>
              <label className="controls__label">Divisions</label>
              <Segmented label="Grid divisions" value={gridDivisions} onChange={n => onGridDivisions?.(n)}
                options={GRID_OPTIONS.map(n => ({ id: n, label: `${n}×${n}` }))} />
            </>
          )}
        </>
      )}
      </div>
    </section>
  )
}

// Grain controls, sub-tabbed for a compact, scroll-free dock.
const GRAIN_SUBTABS = [
  { id: 'amount',  label: 'Amount'  },
  { id: 'texture', label: 'Texture' },
]

function GrainControls({ grainAmount, grainVariability, grainSpread, grainMonochrome, onUpdate }) {
  const [sub, setSub] = useState('amount')
  return (
    <section className="controls__section controls__section--dock" aria-label="Grain">
      <Tabs label="Grain" tabs={GRAIN_SUBTABS} value={sub} onChange={setSub} idBase="grain" />
      <div role="tabpanel" id="grain-panel" aria-labelledby={`grain-tab-${sub}`}
        className="controls__panel">

      {sub === 'amount' && (
        <>
          <ParamRows params={[
            { key: 'amount', label: 'Amount', min: 0, max: 100, step: 1, def: 0,
              format: v => v === 0 ? 'Off' : `${v}%`,
              value: grainAmount, onChange: v => onUpdate('grainAmount', v) },
            { key: 'variability', label: 'Variability', min: 0, max: 100, step: 1, def: 0,
              format: v => v === 0 ? 'Uniform' : `${v}%`,
              value: grainVariability, onChange: v => onUpdate('grainVariability', v) },
          ]} />
        </>
      )}

      {sub === 'texture' && (
        <>
          <div className="controls__row">
            <label className="controls__label" htmlFor="spread-slider">Spread</label>
            <EditableValue value={grainSpread} min={0} max={100} label="Spread"
              format={v => v === 0 ? 'Off' : `${v}%`}
              onChange={v => onUpdate('grainSpread', v)} />
          </div>
          <Slider id="spread-slider" label="Spread" min={0} max={100} step={1} def={0}
            value={grainSpread} on={v => onUpdate('grainSpread', v)} />

          <Switch label="Monochrome" checked={grainMonochrome} onChange={v => onUpdate('grainMonochrome', v)} />
        </>
      )}
      </div>
    </section>
  )
}

/**
 * The layers of one kind (marks, text) as one scrolling row: Add, then a chip
 * per layer — the chosen one is the layer the panel edits — then Remove for
 * that chosen layer. One remove control at full target size, instead of a
 * small × inside every chip (those were 20px targets).
 */
function LayerStrip({ kind, layers, selectedId, labelFor, dotFor, onAdd, onSelect, onRemove }) {
  const selIndex = layers.findIndex(l => l.id === selectedId)
  const sel = selIndex >= 0 ? layers[selIndex] : null
  return (
    <div className="controls__layers">
      <button type="button" className="btn" data-size="sm" onClick={onAdd} aria-label={`Add ${kind}`}>
        <span className="btn__label"><Icon name="plus" />Add</span>
      </button>
      {layers.length > 0 && (
        <div className="chips scroller controls__layer-chips" role="group" aria-label={`${kind}s`}>
          {layers.map((l, i) => (
            <button key={l.id} type="button" className="chip" aria-pressed={l.id === selectedId}
              onClick={() => onSelect(l.id)}>
              {dotFor && <span className="controls__markdot" style={{ '--swatch': dotFor(l) }} aria-hidden="true" />}
              <span className="truncate">{labelFor(l, i)}</span>
            </button>
          ))}
        </div>
      )}
      {sel && (
        <button type="button" className="btn" data-shape="circle" data-size="sm"
          onClick={() => onRemove(sel.id)} aria-label={`Remove ${labelFor(sel, selIndex)}`}>
          <Icon name="trash-2" />
        </button>
      )}
    </div>
  )
}

const MARK_SUBTABS = [
  { id: 'shape',   label: 'Shape'   },
  { id: 'ink',     label: 'Ink'     },
  { id: 'edge',    label: 'Edge'    },
  { id: 'texture', label: 'Riso'    },
]

// A highlighter only ever darkens in the real world (multiply / darken /
// colour-burn). The rest are here for graphic effect, and labelled plainly.
const MARK_BLENDS = [
  { id: 'multiply',   label: 'Multiply' },
  { id: 'darken',     label: 'Darken'   },
  { id: 'color-burn', label: 'Burn'     },
  { id: 'normal',     label: 'Normal'   },
  { id: 'screen',     label: 'Screen'   },
  { id: 'overlay',    label: 'Overlay'  },
]

const MARK_EDGES = [
  { id: 'clean',  label: 'Clean'  },
  { id: 'marker', label: 'Marker' },
  { id: 'noisy',  label: 'Noisy'  },
  { id: 'torn',   label: 'Torn'   },
]

const EDGE_HINT = {
  clean:  'Hard rectangle.',
  marker: 'Soft ink bleed with a denser rim, like a chisel tip.',
  noisy:  'Feathered edge dithered into grain — diffuse and speckled.',
  torn:   'Contour displaced by layered noise, with a fibre fringe.',
}

function MarkControls({ layers, selectedId, selected, ul, onAdd, onRemove, onSelect }) {
  const [sub, setSub] = useState('shape')
  const [addOpen, setAddOpen] = useState(false)

  const noneHint = (
    <p className="controls__hint" data-align="center">
      {layers.length === 0 ? 'Tap Add to lay down a highlight.' : 'Tap a mark above to edit it.'}
    </p>
  )

  return (
    <section className="controls__section controls__section--dock" aria-label="Highlight marks">
      <LayerStrip kind="mark" layers={layers} selectedId={selectedId}
        labelFor={(l, i) => `Mark ${i + 1}`} dotFor={l => l.color}
        onAdd={() => layers.length ? setAddOpen(true) : onAdd()}
        onSelect={onSelect} onRemove={onRemove} />

      <Tabs label="Mark" tabs={MARK_SUBTABS} value={sub} onChange={setSub} idBase="mark" />
      <div role="tabpanel" id="mark-panel" aria-labelledby={`mark-tab-${sub}`}
        className="controls__panel">

      {!selected ? noneHint : (<>
        {sub === 'shape' && (
          <>
            <p className="controls__hint">Drag the mark on the photo, or tap a value.</p>
            <ParamRows params={[
              { key: 'w', label: 'Width', suffix: '%', min: 4, max: 100, step: 1, def: 62,
                value: Math.round((selected.w ?? 0.62) * 100), onChange: v => ul('w', v / 100) },
              { key: 'h', label: 'Height', suffix: '%', min: 0.5, max: 60, step: 0.5, def: 7.5,
                value: Math.round((selected.h ?? 0.075) * 1000) / 10, onChange: v => ul('h', v / 100) },
              { key: 'x', label: 'Position X', suffix: '%', min: 0, max: 100, step: 1, def: 50,
                value: Math.round((selected.x ?? 0.5) * 100), onChange: v => ul('x', v / 100) },
              { key: 'y', label: 'Position Y', suffix: '%', min: 0, max: 100, step: 1, def: 50,
                value: Math.round((selected.y ?? 0.5) * 100), onChange: v => ul('y', v / 100) },
              { key: 'angle', label: 'Angle', suffix: '°', min: -45, max: 45, step: 1, def: 0,
                value: selected.angle ?? 0, onChange: v => ul('angle', v) },
            ]} />
          </>
        )}

        {sub === 'ink' && (
          <>
            {/* The ink colour leads the blend row: one row instead of two. Six
                blends are past the segmented control's four, and a scrolling row
                of chips ended in a sliver at the edge — so the style guide's
                native select: the picker that opens is the system's own (the
                wheel on an iPhone). */}
            <div className="controls__color-row">
              <ColorField value={selected.color} label="Ink color" onChange={v => ul('color', v)} />
              <label className="controls__color-hint" htmlFor="mark-blend">Blend</label>
              <div className="select controls__select">
                <select id="mark-blend" value={selected.blend ?? 'multiply'} onChange={e => ul('blend', e.target.value)}
                  aria-describedby="mark-blend-hint">
                  {MARK_BLENDS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <Icon name="chevron-down" />
              </div>
            </div>
            <p className="sr-only" id="mark-blend-hint">Multiply is how real highlighter ink behaves: it only darkens.</p>
            <ParamRows params={[
              { key: 'opacity', label: 'Opacity', suffix: '%', min: 5, max: 100, step: 1, def: 85,
                value: selected.opacity ?? 85, onChange: v => ul('opacity', v) },
            ]} />
          </>
        )}

        {sub === 'edge' && (
          <>
            {/* The words describe the edge to a screen reader; on screen the
                photo shows it, and a line of prose here cost the photo a row. */}
            <Segmented label="Edge style" value={selected.edge ?? 'marker'} onChange={v => ul('edge', v)}
              options={MARK_EDGES} describedBy="mark-edge-hint" />
            <p className="sr-only" id="mark-edge-hint">{EDGE_HINT[selected.edge ?? 'marker']}</p>

            <ParamRows params={[
              (selected.edge ?? 'marker') !== 'clean' && {
                key: 'edgeAmount', label: 'Edge amount', suffix: '%', min: 0, max: 100, step: 1, def: 45,
                value: selected.edgeAmount ?? 45, onChange: v => ul('edgeAmount', v) },
              { key: 'grain', label: 'Grain', min: 0, max: 100, step: 1, def: 0,
                format: v => v === 0 ? 'Off' : `${v}%`,
                value: selected.grain ?? 0, onChange: v => ul('grain', v) },
              (selected.grain ?? 0) > 0 && {
                key: 'grainSize', label: 'Grain size', min: 0, max: 100, step: 1, def: 30,
                value: selected.grainSize ?? 30, onChange: v => ul('grainSize', v) },
            ]} />

            {(selected.grain ?? 0) > 0 && (
              <Switch label="Dissolve" checked={!!selected.grainDissolve} onChange={v => ul('grainDissolve', v)} />
            )}
          </>
        )}

        {sub === 'texture' && (
          <>
            <Switch label="Riso print" checked={(selected.texture ?? 'none') === 'riso'}
              onChange={v => ul('texture', v ? 'riso' : 'none')} describedBy="mark-riso-hint" />
            <p className="sr-only" id="mark-riso-hint">
              Rotated halftone screen, uneven drum coverage, and a misregistered pass.
            </p>

            {(selected.texture ?? 'none') === 'riso' && (
              <ParamRows params={[
                { key: 'risoScale', label: 'Dot size', min: 0, max: 100, step: 1, def: 40,
                  value: selected.risoScale ?? 40, onChange: v => ul('risoScale', v) },
                { key: 'risoAngle', label: 'Screen angle', suffix: '°', min: 0, max: 90, step: 1, def: 45,
                  value: selected.risoAngle ?? 45, onChange: v => ul('risoAngle', v) },
                { key: 'risoOffset', label: 'Misregister', min: 0, max: 100, step: 1, def: 30,
                  format: v => v === 0 ? 'Aligned' : `${v}%`,
                  value: selected.risoOffset ?? 30, onChange: v => ul('risoOffset', v) },
              ]} />
            )}
          </>
        )}
      </>)}

      </div>
      {addOpen && (
        <AddLayerSheet
          title="New highlight" layers={layers}
          labelFor={(l, i) => `Mark ${i + 1}`} dotFor={l => l.color}
          onDefault={() => { setAddOpen(false); onAdd() }}
          onCopy={(id) => { setAddOpen(false); onAdd(id) }}
          onClose={() => setAddOpen(false)}
        />
      )}
    </section>
  )
}

// The effects are tabs of their own rather than a second picker inside an FX
// tab: one less row in every Text panel, which is what lets each fit the dock
// without scrolling. isOn puts a dot on the tab of an effect that is applied,
// so you can see what is on without visiting.
const TEXT_SUBTABS = [
  { id: 'content', label: 'Content' },
  { id: 'font',    label: 'Font'    },
  { id: 'format',  label: 'Format'  },
  { id: 'color',   label: 'Color',  isOn: l => !!(l.shadow || l.stroke) },
  { id: 'box',     label: 'Box',    isOn: l => (l.bg ?? 'none') !== 'none' },
  { id: 'blob',    label: 'Blob',   isOn: l => !!l.blobStroke },
  { id: 'motion',  label: 'Motion', isOn: l => !!l.motionBlur },
  { id: 'echo',    label: 'Echo',   isOn: l => !!l.echo },
]

function TextControls({ textLayers, selectedLayerId, selectedLayer, ul, onAddLayer, onRemoveLayer, onSelectLayer }) {
  const [sub, setSub] = useState('content')
  const [addOpen, setAddOpen] = useState(false)

  const noLayerHint = (
    <p className="controls__hint" data-align="center">
      {textLayers.length === 0 ? 'Tap Add to create a text layer.' : 'Tap a layer above to edit it.'}
    </p>
  )

  return (
    <section className="controls__section controls__section--dock" aria-label="Text layers">
      {/* Layer strip — always visible */}
      <LayerStrip kind="text layer" layers={textLayers} selectedId={selectedLayerId}
        labelFor={(l, i) => (l.content.trim() ? l.content.trim().slice(0, 14) : `Layer ${i + 1}`)}
        onAdd={() => textLayers.length ? setAddOpen(true) : onAddLayer()}
        onSelect={onSelectLayer} onRemove={onRemoveLayer} />

      {/* Sub-tab bar */}
      <Tabs label="Text" tabs={TEXT_SUBTABS.map(t => ({ ...t, on: !!(selectedLayer && t.isOn?.(selectedLayer)) }))}
        value={sub} onChange={setSub} idBase="text" block={false} />
      <div role="tabpanel" id="text-panel" aria-labelledby={`text-tab-${sub}`}
        className="controls__panel">

      {/* Content sub-tab */}
      {sub === 'content' && (
        selectedLayer ? (
          <>
            <textarea
              className="input controls__textarea" aria-label="Text"
              placeholder="Type something…"
              value={selectedLayer.content}
              onChange={e => ul('content', e.target.value)}
              rows={3}
              spellCheck={false}
            />
            <p className="controls__hint" data-align="center">
              Tap text on canvas to reposition
            </p>
          </>
        ) : noLayerHint
      )}

      {/* Style sub-tab */}
      {sub === 'font' && (
        selectedLayer ? (
          <>
            <div className="controls__fontlist controls__fontlist--solo" role="radiogroup" aria-label={`Font family, ${FONTS.length} families`}
              onScroll={(e) => {
                const el = e.currentTarget
                const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 8
                el.classList.toggle('controls__fontlist--atend', atEnd)
              }}>
              {FONT_GROUPS.map(group => (
                <div key={group.name} className="controls__font-group">
                  <div className="controls__font-group-label">{group.name}</div>
                  {group.fonts.map(f => (
                    <button key={f.id} role="radio" aria-checked={selectedLayer.font === f.id}
                      className={`controls__font-item${selectedLayer.font === f.id ? ' controls__font-item--active' : ''}`}
                      style={{ fontFamily: f.id }} onClick={() => ul('font', f.id)}>{f.label}</button>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : noLayerHint
      )}

      {sub === 'format' && (
        selectedLayer ? (
          <>
            <div className="controls__text-row">
              {/* Bold and italic are toggles, each a circle holding its letter. */}
              <div className="controls__toggles" role="group" aria-label="Style">
                <button type="button" className="btn controls__letter" data-shape="circle" data-size="sm"
                  style={{ fontWeight: 800 }} onClick={() => ul('bold', !selectedLayer.bold)}
                  aria-pressed={!!selectedLayer.bold} aria-label="Bold">B</button>
                <button type="button" className="btn controls__letter" data-shape="circle" data-size="sm"
                  style={{ fontStyle: 'italic' }} onClick={() => ul('italic', !selectedLayer.italic)}
                  aria-pressed={!!selectedLayer.italic} aria-label="Italic">I</button>
              </div>
              <Segmented label="Alignment" value={selectedLayer.align} onChange={v => ul('align', v)}
                options={ALIGNS} />
            </div>

            <ParamRows params={[
              { key: 'size', label: 'Size', min: 20, max: 300, step: 2, def: 80,
                value: selectedLayer.size, onChange: v => ul('size', v) },
              { key: 'opacity', label: 'Opacity', suffix: '%', min: 10, max: 100, step: 1, def: 100,
                value: selectedLayer.opacity, onChange: v => ul('opacity', v) },
              { key: 'x', label: 'Position X', suffix: '%', min: 0, max: 100, step: 1, def: 50,
                value: Math.round((selectedLayer.x ?? 0.5) * 100), onChange: v => ul('x', v / 100) },
              { key: 'y', label: 'Position Y', suffix: '%', min: 0, max: 100, step: 1, def: 88,
                value: Math.round((selectedLayer.y ?? 0.88) * 100), onChange: v => ul('y', v / 100) },
              { key: 'letterSpacing', label: 'Letter spacing', min: -5, max: 40, step: 1, def: 0,
                format: v => v === 0 ? 'Normal' : `${v}px`,
                value: selectedLayer.letterSpacing, onChange: v => ul('letterSpacing', v) },
              { key: 'wordSpacing', label: 'Word spacing', min: -10, max: 80, step: 1, def: 0,
                format: v => v === 0 ? 'Normal' : `${v}px`,
                value: selectedLayer.wordSpacing ?? 0, onChange: v => ul('wordSpacing', v) },
              { key: 'lineHeight', label: 'Line height', min: 0.8, max: 2.5, step: 0.05, def: 1.3,
                format: v => v.toFixed(2),
                value: selectedLayer.lineHeight ?? 1.3, onChange: v => ul('lineHeight', v) },
            ]} />
          </>
        ) : noLayerHint
      )}

      {/* The effects: one tab each. */}
      {['color', 'box', 'blob', 'motion', 'echo'].includes(sub) && (
        selectedLayer ? (
          <>
            {sub === 'color' && (
              <>
                {/* One row: the text's colour and the two effects. The outline's
                    colour leads its own width slider, beside what it belongs to. */}
                <div className="controls__color-row">
                  <ColorField value={selectedLayer.color} label="Text color" onChange={v => ul('color', v)} />
                  <div className="chips controls__effects-inline" role="group" aria-label="Effects">
                    <button type="button" className="chip" aria-pressed={!!selectedLayer.shadow}
                      onClick={() => ul('shadow', !selectedLayer.shadow)}>Shadow</button>
                    <button type="button" className="chip" aria-pressed={!!selectedLayer.stroke}
                      onClick={() => ul('stroke', !selectedLayer.stroke)}>Outline</button>
                  </div>
                </div>
                {selectedLayer.stroke && (
                  <ParamRows lead={<ColorField value={selectedLayer.strokeColor} label="Outline color" onChange={v => ul('strokeColor', v)} />}
                    params={[
                    { key: 'strokeWidth', label: 'Outline width', suffix: '%', min: 0, max: 100, step: 1, def: 35,
                      value: selectedLayer.strokeWidth ?? 35, onChange: v => ul('strokeWidth', v) },
                  ]} />
                )}
              </>
            )}

            {sub === 'box' && (
              <>
                <Segmented label="Text background" value={selectedLayer.bg} onChange={v => ul('bg', v)}
                  options={TEXT_BG_MODES} />
                {selectedLayer.bg !== 'none' && (
                  <>
                    <div className="controls__color-row">
                      <ColorField value={selectedLayer.bgColor} label="Background color" onChange={v => ul('bgColor', v)} />
                      <span className="controls__color-hint">Size</span>
                      <Segmented label="Box size" value={selectedLayer.boxSize ?? 'auto'} onChange={v => ul('boxSize', v)}
                        options={TEXT_BOX_SIZES} block={false} />
                    </div>
                    <ParamRows params={[
                      { key: 'bgOpacity', label: 'Opacity', suffix: '%', min: 10, max: 100, step: 1, def: 50,
                        value: selectedLayer.bgOpacity, onChange: v => ul('bgOpacity', v) },
                      (selectedLayer.boxSize ?? 'auto') === 'manual' && {
                        key: 'boxHeight', label: 'Box height', suffix: '%', min: 20, max: 200, step: 1, def: 100,
                        value: selectedLayer.boxHeight ?? 100, onChange: v => ul('boxHeight', v) },
                      (selectedLayer.boxSize ?? 'auto') === 'manual' && {
                        key: 'boxWidth', label: 'Box width', suffix: '%', min: 20, max: 300, step: 1, def: 100,
                        value: selectedLayer.boxWidth ?? 100, onChange: v => ul('boxWidth', v) },
                    ]} />
                  </>
                )}
              </>
            )}

            {sub === 'blob' && (
              <>
                {/* Gooey distance-based outline that merges nearby letters */}
                {/* One row: the switch, and once it is on, the blob's colour and its
                    grain toggles beside it. */}
                <div className="controls__color-row">
                  <div className="controls__grow"><Switch layout="start" label="Blob stroke" checked={!!selectedLayer.blobStroke}
                    onChange={v => ul('blobStroke', v)} /></div>
                  {selectedLayer.blobStroke && (
                    <ColorField value={selectedLayer.blobColor ?? '#000000'} label="Blob color" onChange={v => ul('blobColor', v)} />
                  )}
                </div>
                {selectedLayer.blobStroke && (
                  <>
                    {(selectedLayer.blobGrain ?? 0) > 0 && (
                      <div className="chips controls__chips" role="group" aria-label="Blob grain">
                        <button type="button" className="chip" aria-pressed={!!selectedLayer.blobGrainDissolve}
                          onClick={() => ul('blobGrainDissolve', !selectedLayer.blobGrainDissolve)}>Dissolve</button>
                        <button type="button" className="chip" aria-pressed={selectedLayer.blobGrainMono ?? true}
                          onClick={() => ul('blobGrainMono', !(selectedLayer.blobGrainMono ?? true))}>Mono</button>
                      </div>
                    )}
                    <ParamRows params={[
                      { key: 'blobDistance', label: 'Distance', suffix: '%', min: 0, max: 100, step: 1, def: 40,
                        value: selectedLayer.blobDistance ?? 40, onChange: v => ul('blobDistance', v) },
                      { key: 'blobCurve', label: 'Curviness', suffix: '%', min: 0, max: 100, step: 1, def: 30,
                        value: selectedLayer.blobCurve ?? 30, onChange: v => ul('blobCurve', v) },
                      { key: 'blobGrain', label: 'Grain', min: 0, max: 100, step: 1, def: 0,
                        format: v => v === 0 ? 'Off' : `${v}%`,
                        value: selectedLayer.blobGrain ?? 0, onChange: v => ul('blobGrain', v) },
                      (selectedLayer.blobGrain ?? 0) > 0 && {
                        key: 'blobGrainSize', label: 'Grain size', suffix: '%', min: 0, max: 100, step: 1, def: 30,
                        value: selectedLayer.blobGrainSize ?? 30, onChange: v => ul('blobGrainSize', v) },
                      (selectedLayer.blobGrain ?? 0) > 0 && {
                        key: 'blobGrainRough', label: 'Roughness', min: 0, max: 100, step: 1, def: 0,
                        format: v => v === 0 ? 'Smooth' : `${v}%`,
                        value: selectedLayer.blobGrainRough ?? 0, onChange: v => ul('blobGrainRough', v) },
                    ]} />
                  </>
                )}
              </>
            )}

            {sub === 'motion' && (
              <>
                {/* Rear-curtain-sync motion blur: sharp text with a fading trail */}
                <Switch label="Motion blur" checked={!!selectedLayer.motionBlur} onChange={v => ul('motionBlur', v)} />
                {selectedLayer.motionBlur && (
                  <>
                    <ParamRows params={[
                      // Direction snaps to 5° so the streak stays put when you lift your thumb
                      { key: 'motionAngle', label: 'Direction', suffix: '°', min: 0, max: 360, step: 5, def: 0,
                        value: selectedLayer.motionAngle ?? 0, onChange: v => ul('motionAngle', v) },
                      { key: 'motionLength', label: 'Distance', min: 0, max: 400, step: 2, def: 60,
                        format: v => v === 0 ? 'Off' : `${v}px`,
                        value: selectedLayer.motionLength ?? 0, onChange: v => ul('motionLength', v) },
                      { key: 'motionSpeed', label: 'Speed', suffix: '%', min: 0, max: 100, step: 1, def: 60,
                        value: selectedLayer.motionSpeed ?? 60, onChange: v => ul('motionSpeed', v) },
                      { key: 'trailGrain', label: 'Trail grain', min: 0, max: 100, step: 1, def: 0,
                        format: v => v === 0 ? 'Off' : `${v}%`,
                        value: selectedLayer.trailGrain ?? 0, onChange: v => ul('trailGrain', v) },
                      (selectedLayer.trailGrain ?? 0) > 0 && {
                        key: 'trailGrainSize', label: 'Grain size', suffix: '%', min: 0, max: 100, step: 1, def: 30,
                        value: selectedLayer.trailGrainSize ?? 30, onChange: v => ul('trailGrainSize', v) },
                      (selectedLayer.trailGrain ?? 0) > 0 && {
                        key: 'trailGrainVariability', label: 'Roughness', min: 0, max: 100, step: 1, def: 0,
                        format: v => v === 0 ? 'Smooth' : `${v}%`,
                        value: selectedLayer.trailGrainVariability ?? 0, onChange: v => ul('trailGrainVariability', v) },
                      (selectedLayer.trailGrain ?? 0) > 0 && {
                        key: 'trailGrainSpread', label: 'Spread', min: 0, max: 100, step: 1, def: 0,
                        format: v => v === 0 ? 'Even' : `${v}%`,
                        value: selectedLayer.trailGrainSpread ?? 0, onChange: v => ul('trailGrainSpread', v) },
                    ]} />
                    {(selectedLayer.trailGrain ?? 0) > 0 && (
                      <div className="chips controls__chips" role="group" aria-label="Trail grain">
                        <button type="button" className="chip" aria-pressed={!!selectedLayer.trailGrainDissolve}
                          onClick={() => ul('trailGrainDissolve', !selectedLayer.trailGrainDissolve)}>Dissolve</button>
                        <button type="button" className="chip" aria-pressed={selectedLayer.trailGrainMono ?? true}
                          onClick={() => ul('trailGrainMono', !(selectedLayer.trailGrainMono ?? true))}>Mono</button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {sub === 'echo' && (
              <>
                {/* Discrete decaying ghost copies (After Effects-style) */}
                {/* One row: the switch, and once it is on, how the copies blend. */}
                <div className="controls__color-row">
                  <div className="controls__grow"><Switch layout="start" label="Echo" checked={!!selectedLayer.echo} onChange={v => ul('echo', v)} /></div>
                  {selectedLayer.echo && (
                    <div className="select controls__select">
                      <select value={selectedLayer.echoBlend ?? 'stack'} onChange={e => ul('echoBlend', e.target.value)}
                        aria-label="Echo blend">
                        {ECHO_BLENDS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                      <Icon name="chevron-down" />
                    </div>
                  )}
                </div>
                {selectedLayer.echo && (
                  <>
                    <ParamRows params={[
                      { key: 'echoCount', label: 'Amount', min: 1, max: 16, step: 1, def: 5,
                        format: v => `${v}×`, value: selectedLayer.echoCount ?? 5, onChange: v => ul('echoCount', v) },
                      { key: 'echoAngle', label: 'Direction', suffix: '°', min: 0, max: 360, step: 5, def: 0,
                        value: selectedLayer.echoAngle ?? 0, onChange: v => ul('echoAngle', v) },
                      { key: 'echoSpacing', label: 'Spacing', suffix: 'px', min: 0, max: 200, step: 1, def: 40,
                        value: selectedLayer.echoSpacing ?? 40, onChange: v => ul('echoSpacing', v) },
                      { key: 'echoEase', label: 'Curve', min: -100, max: 100, step: 1, def: 50,
                        format: v => v === 0 ? 'Linear' : `${v > 0 ? '+' : '−'}${Math.abs(v)}`,
                        value: selectedLayer.echoEase ?? 50, onChange: v => ul('echoEase', v) },
                      { key: 'echoGhosting', label: 'Ghosting', suffix: '%', min: 0, max: 100, step: 1, def: 60,
                        value: selectedLayer.echoGhosting ?? 60, onChange: v => ul('echoGhosting', v) },
                      { key: 'echoBlur', label: 'Blur', min: 0, max: 60, step: 1, def: 0,
                        format: v => v === 0 ? 'Off' : `${v}`, value: selectedLayer.echoBlur ?? 0, onChange: v => ul('echoBlur', v) },
                      { key: 'echoZoom', label: 'Zoom', min: -50, max: 100, step: 1, def: 0,
                        format: v => v === 0 ? 'Off' : `${v > 0 ? '+' : '−'}${Math.abs(v)}%`,
                        value: selectedLayer.echoZoom ?? 0, onChange: v => ul('echoZoom', v) },
                      { key: 'echoSpin', label: 'Spin', min: -30, max: 30, step: 1, def: 0,
                        format: v => v === 0 ? 'Off' : `${v > 0 ? '+' : '−'}${Math.abs(v)}°`,
                        value: selectedLayer.echoSpin ?? 0, onChange: v => ul('echoSpin', v) },
                      { key: 'echoHue', label: 'Chromatic', min: 0, max: 90, step: 1, def: 0,
                        format: v => v === 0 ? 'Off' : `${v}°`, value: selectedLayer.echoHue ?? 0, onChange: v => ul('echoHue', v) },
                    ]} />
                  </>
                )}
              </>
            )}
          </>
        ) : noLayerHint
      )}

      </div>
      {addOpen && (
        <AddLayerSheet
          title="New text layer" layers={textLayers}
          labelFor={(l, i) => (l.content?.trim() ? l.content.trim().slice(0, 18) : `Layer ${i + 1}`)}
          onDefault={() => { setAddOpen(false); onAddLayer() }}
          onCopy={(id) => { setAddOpen(false); onAddLayer(id) }}
          onClose={() => setAddOpen(false)}
        />
      )}
    </section>
  )
}

const GRID_OPTIONS = [3, 4, 6, 8]

export default function Controls({
  tab, settings, onUpdate, pickMode, onPickMode,
  borderSuggestions = [], onApplyBorderColor,
  selectedLayerId, onSelectLayer, onAddLayer, onRemoveLayer, onUpdateLayer,
  selectedHighlightId, onSelectHighlight, onAddHighlight, onRemoveHighlight,
  frameSub = 'border', onFrameSub,
  snapEnabled = true, onSnapToggle, gridDivisions = 3, onGridDivisions,
}) {
  if (!tab) return null

  const {
    borderThickness,
    cornerRadius, cropRatio = 'free', aspectMode = 'crop', showMedia,
    grainAmount, grainVariability, grainMonochrome = true, grainSpread = 0,
    textLayers = [], highlightLayers = [],
  } = settings

  const selectedLayer = textLayers.find(l => l.id === selectedLayerId) ?? null
  const ul = (key, value) => selectedLayer && onUpdateLayer(selectedLayer.id, key, value)

  const selectedHighlight = highlightLayers.find(l => l.id === selectedHighlightId) ?? null
  const ulHl = (key, value) => selectedHighlight && onUpdateLayer(selectedHighlight.id, key, value)

  return (
    <div className="controls">

      {/* ── Frame ── */}
      {tab === 'frame' && (
        <FrameControls
          borderThickness={borderThickness} cornerRadius={cornerRadius}
          cropRatio={cropRatio} aspectMode={aspectMode} showMedia={showMedia} onUpdate={onUpdate}
          snapEnabled={snapEnabled} onSnapToggle={onSnapToggle}
          gridDivisions={gridDivisions} onGridDivisions={onGridDivisions}
          sub={frameSub} onSub={onFrameSub} />
      )}

      {/* ── Background / border fill (sub-tabbed, dock-compact) ── */}
      {tab === 'bg' && (
        <BgControls settings={settings} onUpdate={onUpdate}
          pickMode={pickMode} onPickMode={onPickMode}
          borderSuggestions={borderSuggestions} onApplyBorderColor={onApplyBorderColor} />
      )}

      {/* ── Grain ── */}
      {tab === 'grain' && (
        <GrainControls
          grainAmount={grainAmount} grainVariability={grainVariability}
          grainSpread={grainSpread} grainMonochrome={grainMonochrome} onUpdate={onUpdate} />
      )}

      {/* ── Type ── */}
      {tab === 'mark' && <MarkControls
        layers={highlightLayers} selectedId={selectedHighlightId}
        selected={selectedHighlight} ul={ulHl}
        onAdd={onAddHighlight} onRemove={onRemoveHighlight} onSelect={onSelectHighlight}
      />}

      {tab === 'text' && <TextControls
        textLayers={textLayers} selectedLayerId={selectedLayerId}
        selectedLayer={selectedLayer} ul={ul}
        onAddLayer={onAddLayer} onRemoveLayer={onRemoveLayer} onSelectLayer={onSelectLayer}
      />}
    </div>
  )
}
