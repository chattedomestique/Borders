import { useState, useRef, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { Icon, Segmented, Tabs, Switch, SwatchSet, ActionSheet } from '../ui'
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
        <button type="button" className="btn ed-bare" data-shape="circle" data-size="sm" data-sg-nudge="-1"
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
        <button type="button" className="btn ed-bare" data-shape="circle" data-size="sm" data-sg-nudge="1"
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
 * The parameter picker: which setting the slider sets. An action sheet (the
 * style guide's menu as a sheet), so it is plainly ON TOP: it rises from the
 * bottom on the floating paper, framed, over a scrim that dims the photo and
 * the tray. It costs no layout while closed, which is what keeps the photo
 * large.
 *
 * Pick by tap, or Snapseed's way: the finger that swiped the strip's name to
 * open it keeps going, and lifting on a row picks that row. The drag is read
 * from the window, because the pointer is still captured by the name it went
 * down on.
 */
function ParamPicker({ params, currentKey, onPick, onClose, title = 'Adjust' }) {
  const listRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const done = useRef({ onPick, onClose })
  useEffect(() => { done.current = { onPick, onClose } })

  useEffect(() => {
    const keyAt = (y) => {
      for (const el of listRef.current?.querySelectorAll('[data-key]') ?? []) {
        const r = el.getBoundingClientRect()
        if (y >= r.top && y <= r.bottom) return el.dataset.key
      }
      return null
    }
    let from = null
    let dragging = false
    const onMove = (e) => {
      if (e.pointerType === 'mouse' && !e.buttons) return
      if (from == null) from = e.clientY
      // A row is "under the finger" only once it has moved: the swipe that
      // opened the sheet must not pick whatever row came up beneath it.
      if (!dragging && Math.abs(e.clientY - from) < 6) return
      dragging = true
      setDrag(keyAt(e.clientY))
    }
    const onUp = (e) => {
      const k = dragging ? keyAt(e.clientY) : null
      from = null
      dragging = false
      setDrag(null)
      if (k) { done.current.onPick(k); done.current.onClose() }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  return createPortal(
    <ActionSheet open onClose={onClose} title={title} label={`${title}: choose a setting`} listRef={listRef}>
      {params.map(p => (
        <button key={p.key} data-key={p.key} type="button" className="menu__item"
          role="menuitemradio" aria-checked={p.key === currentKey}
          data-drag={drag === p.key ? '' : undefined}
          onClick={() => { onPick(p.key); onClose() }}>
          <Icon name="check" className="menu__check" />
          {p.label}
          <span className="menu__meta">{p.format ? p.format(p.value) : `${p.value}${p.suffix ?? ''}`}</span>
        </button>
      ))}
    </ActionSheet>,
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

  const hexRow = (
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
  )

  // In the dock: the hex field is the options row and the channels share one
  // parameter strip, pinned under it like every other panel's.
  if (compact) return <>{hexRow}<Rule /><ParamRows params={channels} /></>

  return (
    <div className="controls__hsl">
      {channels.map(c => (
        <div key={c.key}>
          <div className="controls__row"><span className="controls__label">{c.label}</span>
            <EditableValue value={c.value} min={c.min} max={c.max} suffix={c.suffix} label={c.label} onChange={c.onChange} /></div>
          <Slider className={c.sliderClass} style={c.sliderStyle} min={c.min} max={c.max} step={c.step}
            def={c.def} value={c.value} on={c.onChange} label={c.label} />
        </div>
      ))}
      {hexRow}
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
      <button type="button" className="btn ed-bare controls__colorbtn" data-shape="circle"
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
    <DockPanel label="Border fill" tabs={BG_SUBTABS} sub={sub} onSub={pick} idBase="fill">
      {sub === 'photo' && (
        <SwatchGroup title="From your photo" hint="Tap to apply" items={tones}
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
    </DockPanel>
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
  const ratioName = cropRatio === 'free' ? 'Aspect ratio' : (aspectMode === 'fit' ? 'Frame ratio' : 'Crop ratio')
  return (
    <DockPanel label="Frame" tabs={FRAME_SUBTABS} sub={sub} onSub={onSub} idBase="frame">
      {sub === 'border' && (
        <>
          <Switch label="Show photo" checked={showMedia} onChange={v => onUpdate('showMedia', v)} />
          <Rule />
          <ParamRows params={[
            { key: 'border', label: 'Border', suffix: 'px', min: 0, max: 400, step: 1, def: 150,
              value: borderThickness, onChange: v => onUpdate('borderThickness', v) },
            { key: 'corners', label: 'Corners', min: 0, max: 100, step: 1, def: 0,
              format: v => v === 0 ? 'Square' : v === 100 ? 'Round' : `${v}%`,
              value: cornerRadius, onChange: v => onUpdate('cornerRadius', v) },
          ]} />
        </>
      )}

      {sub === 'crop' && (
        <>
          {/* The ratio is what you came for, so it leads: choice chips on one
              scrolling line. The chosen ratio carries a flip cue: tap it again
              to turn it on its side. */}
          <div className="chips scroller controls__chips controls__ratios" role="group" aria-label={ratioName}>
            {CROP_RATIOS.map(r => {
              const isPortrait  = cropRatio === r.id
              const isLandscape = r.alt !== null && cropRatio === r.alt
              const isActive    = isPortrait || isLandscape
              const displayLabel = isLandscape ? r.alt : r.label
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
          <Rule />
          {/* What the ratio does to the photo: trim it, or matte it inside a
              frame of that ratio, uncropped. A setting of the ratio, so a row
              like any other setting: its name, then the choice. The sentence
              that explains it is for a screen reader; on screen the photo
              shows it. */}
          <div className="controls__row">
            <span className="controls__label" aria-hidden="true">Photo</span>
            <Segmented label="Photo" value={aspectMode === 'fit' ? 'fit' : 'crop'} block={false}
              onChange={v => onUpdate('aspectMode', v)} describedBy="frame-aspect-hint"
              options={[{ id: 'crop', label: 'Crop' }, { id: 'fit', label: 'Fit' }]} />
          </div>
          <p className="sr-only" id="frame-aspect-hint">
            {aspectMode === 'fit'
              ? 'The frame takes the ratio; the photo is matted inside it, uncropped.'
              : 'The photo is trimmed to the ratio.'}
          </p>
        </>
      )}

      {sub === 'grid' && (
        <>
          <Switch label="Snap to grid" checked={!!snapEnabled} onChange={() => onSnapToggle?.()} />
          {snapEnabled && (
            <>
              <Rule />
              <div className="controls__row">
                <span className="controls__label" aria-hidden="true">Divisions</span>
                <Segmented label="Grid divisions" value={gridDivisions} onChange={n => onGridDivisions?.(n)}
                  block={false} options={GRID_OPTIONS.map(n => ({ id: n, label: `${n}×${n}` }))} />
              </div>
            </>
          )}
        </>
      )}
    </DockPanel>
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
    <DockPanel label="Grain" tabs={GRAIN_SUBTABS} sub={sub} onSub={setSub} idBase="grain">
      {sub === 'amount' && (
        <ParamRows params={[
          { key: 'amount', label: 'Amount', min: 0, max: 100, step: 1, def: 0,
            format: v => v === 0 ? 'Off' : `${v}%`,
            value: grainAmount, onChange: v => onUpdate('grainAmount', v) },
          { key: 'variability', label: 'Variability', min: 0, max: 100, step: 1, def: 0,
            format: v => v === 0 ? 'Uniform' : `${v}%`,
            value: grainVariability, onChange: v => onUpdate('grainVariability', v) },
        ]} />
      )}

      {sub === 'texture' && (
        <>
          <Switch label="Monochrome" checked={grainMonochrome} onChange={v => onUpdate('grainMonochrome', v)} />
          <Rule />
          <ParamRows params={[
            { key: 'spread', label: 'Spread', min: 0, max: 100, step: 1, def: 0,
              format: v => v === 0 ? 'Off' : `${v}%`,
              value: grainSpread, onChange: v => onUpdate('grainSpread', v) },
          ]} />
        </>
      )}
    </DockPanel>
  )
}

/**
 * Every panel is the same two parts at the same heights (editor.css): a head
 * row (the layer button, for a tool that has layers, then the tabs) and the
 * content area under it: an options row at the top and the parameter strip
 * pinned to the bottom. The content area is one fixed height in every panel,
 * so the photo above never changes size when you switch tools or tabs, and
 * the slider is always in the same place under your thumb.
 */
function DockPanel({ label, lead, tabs, sub, onSub, idBase, children }) {
  return (
    <section className="controls__section" aria-label={label}>
      <div className="controls__head">
        {lead}
        <Tabs label={label} tabs={tabs} value={sub} onChange={onSub} idBase={idBase} />
      </div>
      <div role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${sub}`}
        className="controls__panel">
        {children}
      </div>
    </section>
  )
}

/** Nothing to edit yet: one line in the middle of the content area. */
function DockEmpty({ children }) {
  return <p className="controls__empty">{children}</p>
}

/** The hairline between two settings in a panel (decoration: the rows are
 *  already separate controls to a screen reader). */
function Rule() {
  return <div className="controls__rule" aria-hidden="true" />
}

/**
 * The layers of one kind (marks, text): a button at the start of the head row
 * naming the layer the panel edits. It opens a sheet to switch layer, add one
 * or remove this one. With none yet, it adds the first. (A row of chips for
 * this cost every Mark and Text panel a row, which is what made the photo
 * jump when you changed tools.)
 */
function LayerPicker({ kind, title, layers, selectedId, labelFor, dotFor, onAdd, onSelect, onRemove }) {
  const [open, setOpen] = useState(false)
  const i = layers.findIndex(l => l.id === selectedId)
  const sel = i >= 0 ? layers[i] : null
  const close = () => setOpen(false)
  const dot = (l) => dotFor && <span className="controls__markdot" style={{ '--swatch': dotFor(l) }} aria-hidden="true" />

  if (!layers.length) {
    return (
      <button type="button" className="btn controls__layerbtn" data-size="sm" onClick={onAdd} aria-label={`Add ${kind}`}>
        <span className="btn__label"><Icon name="plus" />Add</span>
      </button>
    )
  }
  // The words on the button start its name (WCAG 2.5.3), so a voice user can
  // say what they see.
  const shown = sel ? labelFor(sel, i) : `${layers.length} ${kind}${layers.length === 1 ? '' : 's'}`
  return (
    <>
      <button type="button" className="btn controls__layerbtn" data-size="sm" onClick={() => setOpen(true)}
        aria-haspopup="dialog" aria-expanded={open}
        aria-label={`${shown}: switch, add or remove ${kind}s`}>
        <span className="btn__label">{sel && dot(sel)}<span className="controls__layername">{shown}</span></span>
        <Icon name="chevron-down" />
      </button>
      {open && createPortal(
        <ActionSheet open onClose={close} title={title}>
          <div className="menu__group" role="group" aria-label={title}>
            {layers.map((l, j) => (
              <button key={l.id} type="button" className="menu__item" role="menuitemradio"
                aria-checked={l.id === selectedId} onClick={() => { onSelect(l.id); close() }}>
                <Icon name="check" className="menu__check" />{dot(l)}{labelFor(l, j)}
              </button>
            ))}
          </div>
          <button type="button" className="menu__item" role="menuitem" onClick={() => { close(); onAdd() }}>
            <Icon name="plus" />New {kind}
          </button>
          {sel && (
            <button type="button" className="menu__item" role="menuitem" data-tone="bad"
              onClick={() => { close(); onRemove(sel.id) }}>
              <Icon name="trash-2" />Remove {labelFor(sel, i)}
            </button>
          )}
        </ActionSheet>,
        document.body,
      )}
    </>
  )
}

const MARK_SUBTABS = [
  { id: 'shape',   label: 'Shape'   },
  { id: 'ink',     label: 'Ink'     },
  { id: 'edge',    label: 'Edge'    },
  { id: 'texture', label: 'Texture' },
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
  const labelFor = (l, i) => `Mark ${i + 1}`

  const picker = (
    <LayerPicker kind="mark" title="Marks" layers={layers} selectedId={selectedId}
      labelFor={labelFor} dotFor={l => l.color}
      onAdd={() => layers.length ? setAddOpen(true) : onAdd()}
      onSelect={onSelect} onRemove={onRemove} />
  )
  const grain = selected?.grain ?? 0
  const riso = (selected?.texture ?? 'none') === 'riso'

  return (
    <DockPanel label="Mark" lead={picker} tabs={MARK_SUBTABS} sub={sub} onSub={setSub} idBase="mark">
      {!selected ? (
        <DockEmpty>{layers.length === 0 ? 'Tap Add to lay down a highlight.' : 'Tap a mark on the photo to edit it.'}</DockEmpty>
      ) : (<>
        {sub === 'shape' && (
          <>
            <p className="controls__hint">Drag the mark on the photo, or set it here.</p>
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
            {/* The ink colour leads the blend row. Six blends are past the
                segmented control's four, so the style guide's native select:
                the picker that opens is the system's own (the wheel on an
                iPhone). */}
            <div className="controls__row controls__row--start">
              <ColorField value={selected.color} label="Ink color" onChange={v => ul('color', v)} />
              <label className="controls__label" htmlFor="mark-blend">Blend</label>
              <div className="select controls__select">
                <select id="mark-blend" value={selected.blend ?? 'multiply'} onChange={e => ul('blend', e.target.value)}
                  aria-describedby="mark-blend-hint">
                  {MARK_BLENDS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <Icon name="chevron-down" />
              </div>
            </div>
            <p className="sr-only" id="mark-blend-hint">Multiply is how real highlighter ink behaves: it only darkens.</p>
            <Rule />
            <ParamRows params={[
              { key: 'opacity', label: 'Opacity', suffix: '%', min: 5, max: 100, step: 1, def: 85,
                value: selected.opacity ?? 85, onChange: v => ul('opacity', v) },
            ]} />
          </>
        )}

        {sub === 'edge' && (
          <>
            {/* The words describe the edge to a screen reader; on screen the
                photo shows it. */}
            <Segmented label="Edge style" value={selected.edge ?? 'marker'} onChange={v => ul('edge', v)}
              options={MARK_EDGES} describedBy="mark-edge-hint" />
            <p className="sr-only" id="mark-edge-hint">{EDGE_HINT[selected.edge ?? 'marker']}</p>
            {(selected.edge ?? 'marker') !== 'clean' && <Rule />}
            {(selected.edge ?? 'marker') !== 'clean' && (
              <ParamRows params={[
                { key: 'edgeAmount', label: 'Edge amount', suffix: '%', min: 0, max: 100, step: 1, def: 45,
                  value: selected.edgeAmount ?? 45, onChange: v => ul('edgeAmount', v) },
              ]} />
            )}
          </>
        )}

        {/* Everything that breaks up the ink: the riso print and the grain. */}
        {sub === 'texture' && (
          <>
            <div className="controls__row controls__row--start">
              <Switch layout="start" label="Riso print" checked={riso}
                onChange={v => ul('texture', v ? 'riso' : 'none')} describedBy="mark-riso-hint" />
              {grain > 0 && (
                <div className="chips controls__chips controls__push" role="group" aria-label="Grain">
                  <button type="button" className="chip" aria-pressed={!!selected.grainDissolve}
                    onClick={() => ul('grainDissolve', !selected.grainDissolve)}>Dissolve</button>
                </div>
              )}
            </div>
            <p className="sr-only" id="mark-riso-hint">
              Rotated halftone screen, uneven drum coverage, and a misregistered pass.
            </p>
            <Rule />
            <ParamRows params={[
              { key: 'grain', label: 'Grain', min: 0, max: 100, step: 1, def: 0,
                format: v => v === 0 ? 'Off' : `${v}%`,
                value: grain, onChange: v => ul('grain', v) },
              grain > 0 && {
                key: 'grainSize', label: 'Grain size', min: 0, max: 100, step: 1, def: 30,
                value: selected.grainSize ?? 30, onChange: v => ul('grainSize', v) },
              riso && { key: 'risoScale', label: 'Dot size', min: 0, max: 100, step: 1, def: 40,
                value: selected.risoScale ?? 40, onChange: v => ul('risoScale', v) },
              riso && { key: 'risoAngle', label: 'Screen angle', suffix: '°', min: 0, max: 90, step: 1, def: 45,
                value: selected.risoAngle ?? 45, onChange: v => ul('risoAngle', v) },
              riso && { key: 'risoOffset', label: 'Misregister', min: 0, max: 100, step: 1, def: 30,
                format: v => v === 0 ? 'Aligned' : `${v}%`,
                value: selected.risoOffset ?? 30, onChange: v => ul('risoOffset', v) },
            ]} />
          </>
        )}
      </>)}

      {addOpen && (
        <AddLayerSheet
          title="New highlight" layers={layers}
          labelFor={labelFor} dotFor={l => l.color}
          onDefault={() => { setAddOpen(false); onAdd() }}
          onCopy={(id) => { setAddOpen(false); onAdd(id) }}
          onClose={() => setAddOpen(false)}
        />
      )}
    </DockPanel>
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
  const labelFor = (l, i) => (l.content?.trim() ? l.content.trim().slice(0, 18) : `Layer ${i + 1}`)
  const L = selectedLayer

  const picker = (
    <LayerPicker kind="text layer" title="Text layers" layers={textLayers} selectedId={selectedLayerId}
      labelFor={labelFor}
      onAdd={() => textLayers.length ? setAddOpen(true) : onAddLayer()}
      onSelect={onSelectLayer} onRemove={onRemoveLayer} />
  )
  const tabs = TEXT_SUBTABS.map(t => ({ ...t, on: !!(L && t.isOn?.(L)) }))

  // A box's size is Auto until you change it: Auto is the manual size at
  // 100% (one line tall, the text's width), which renders identically, so the
  // strip says "Auto" there instead of a separate Auto / Manual control.
  const manual = (L?.boxSize ?? 'auto') === 'manual'
  const boxDim = (key) => ({
    value: manual ? (L[key] ?? 100) : 100,
    format: v => v === 100 ? 'Auto' : `${v}%`,
    onChange: v => ul(manual ? { [key]: v } : { boxSize: 'manual', boxWidth: 100, boxHeight: 100, [key]: v }),
  })

  return (
    <DockPanel label="Text" lead={picker} tabs={tabs} sub={sub} onSub={setSub} idBase="text">
      {!L ? (
        <DockEmpty>{textLayers.length === 0 ? 'Tap Add to create a text layer.' : 'Tap text on the photo to edit it.'}</DockEmpty>
      ) : (<>
        {sub === 'content' && (
          <>
            <textarea
              className="input controls__textarea" aria-label="Text" aria-describedby="text-content-hint"
              placeholder="Type something…"
              value={L.content}
              onChange={e => ul('content', e.target.value)}
              rows={2}
              spellCheck={false}
            />
            <p className="controls__hint" id="text-content-hint">Drag the text on the photo to move it.</p>
          </>
        )}

        {sub === 'font' && (
          <div className="controls__fontlist" role="radiogroup" aria-label={`Font family, ${FONTS.length} families`}>
            {FONT_GROUPS.map(group => (
              <div key={group.name} className="controls__font-group">
                <div className="controls__font-group-label">{group.name}</div>
                {group.fonts.map(f => (
                  <button key={f.id} role="radio" aria-checked={L.font === f.id}
                    className="controls__font-item"
                    style={{ fontFamily: f.id }} onClick={() => ul('font', f.id)}>{f.label}</button>
                ))}
              </div>
            ))}
          </div>
        )}

        {sub === 'format' && (
          <>
            <div className="controls__row controls__row--start">
              {/* Bold and italic are toggles, each a circle holding its letter. */}
              <div className="controls__toggles" role="group" aria-label="Style">
                <button type="button" className="btn controls__letter" data-shape="circle" data-size="sm"
                  style={{ fontWeight: 800 }} onClick={() => ul('bold', !L.bold)}
                  aria-pressed={!!L.bold} aria-label="Bold">B</button>
                <button type="button" className="btn controls__letter" data-shape="circle" data-size="sm"
                  style={{ fontStyle: 'italic' }} onClick={() => ul('italic', !L.italic)}
                  aria-pressed={!!L.italic} aria-label="Italic">I</button>
              </div>
              <div className="controls__grow">
                <Segmented label="Alignment" value={L.align} onChange={v => ul('align', v)} options={ALIGNS} />
              </div>
            </div>
            <Rule />
            <ParamRows params={[
              { key: 'size', label: 'Size', min: 20, max: 300, step: 2, def: 80,
                value: L.size, onChange: v => ul('size', v) },
              { key: 'opacity', label: 'Opacity', suffix: '%', min: 10, max: 100, step: 1, def: 100,
                value: L.opacity, onChange: v => ul('opacity', v) },
              { key: 'x', label: 'Position X', suffix: '%', min: 0, max: 100, step: 1, def: 50,
                value: Math.round((L.x ?? 0.5) * 100), onChange: v => ul('x', v / 100) },
              { key: 'y', label: 'Position Y', suffix: '%', min: 0, max: 100, step: 1, def: 88,
                value: Math.round((L.y ?? 0.88) * 100), onChange: v => ul('y', v / 100) },
              { key: 'letterSpacing', label: 'Letter spacing', min: -5, max: 40, step: 1, def: 0,
                format: v => v === 0 ? 'Normal' : `${v}px`,
                value: L.letterSpacing, onChange: v => ul('letterSpacing', v) },
              { key: 'wordSpacing', label: 'Word spacing', min: -10, max: 80, step: 1, def: 0,
                format: v => v === 0 ? 'Normal' : `${v}px`,
                value: L.wordSpacing ?? 0, onChange: v => ul('wordSpacing', v) },
              { key: 'lineHeight', label: 'Line height', min: 0.8, max: 2.5, step: 0.05, def: 1.3,
                format: v => v.toFixed(2),
                value: L.lineHeight ?? 1.3, onChange: v => ul('lineHeight', v) },
            ]} />
          </>
        )}

        {sub === 'color' && (
          <>
            {/* The text's colour and the two effects on one row; the outline's
                colour leads its width, beside what it belongs to. */}
            <div className="controls__row controls__row--start">
              <ColorField value={L.color} label="Text color" onChange={v => ul('color', v)} />
              <div className="chips controls__chips" role="group" aria-label="Effects">
                <button type="button" className="chip" aria-pressed={!!L.shadow}
                  onClick={() => ul('shadow', !L.shadow)}>Shadow</button>
                <button type="button" className="chip" aria-pressed={!!L.stroke}
                  onClick={() => ul('stroke', !L.stroke)}>Outline</button>
              </div>
            </div>
            {L.stroke && <Rule />}
            {L.stroke && (
              <ParamRows lead={<ColorField value={L.strokeColor} label="Outline color" onChange={v => ul('strokeColor', v)} />}
                params={[
                { key: 'strokeWidth', label: 'Outline width', suffix: '%', min: 0, max: 100, step: 1, def: 35,
                  value: L.strokeWidth ?? 35, onChange: v => ul('strokeWidth', v) },
              ]} />
            )}
          </>
        )}

        {sub === 'box' && (
          <>
            <div className="controls__row controls__row--start">
              <div className="controls__grow">
                <Segmented label="Text background" value={L.bg} onChange={v => ul('bg', v)} options={TEXT_BG_MODES} />
              </div>
              {L.bg !== 'none' && (
                <ColorField value={L.bgColor} label="Background color" onChange={v => ul('bgColor', v)} />
              )}
            </div>
            {L.bg !== 'none' && <Rule />}
            {L.bg !== 'none' && (
              <ParamRows params={[
                { key: 'bgOpacity', label: 'Opacity', suffix: '%', min: 10, max: 100, step: 1, def: 50,
                  value: L.bgOpacity, onChange: v => ul('bgOpacity', v) },
                { key: 'boxHeight', label: 'Box height', suffix: '%', min: 20, max: 200, step: 1, def: 100, ...boxDim('boxHeight') },
                { key: 'boxWidth', label: 'Box width', suffix: '%', min: 20, max: 300, step: 1, def: 100, ...boxDim('boxWidth') },
              ]} />
            )}
          </>
        )}

        {sub === 'blob' && (
          <>
            {/* A gooey distance-based outline that merges nearby letters. Its
                colour leads the strip; its grain toggles share the switch's
                row once there is grain. */}
            <div className="controls__row controls__row--start">
              <Switch layout="start" label="Blob" checked={!!L.blobStroke} onChange={v => ul('blobStroke', v)} />
              {L.blobStroke && (L.blobGrain ?? 0) > 0 && (
                <div className="chips scroller controls__chips controls__push" role="group" aria-label="Blob grain">
                  <button type="button" className="chip" aria-pressed={!!L.blobGrainDissolve}
                    onClick={() => ul('blobGrainDissolve', !L.blobGrainDissolve)}>Dissolve</button>
                  <button type="button" className="chip" aria-pressed={L.blobGrainMono ?? true}
                    onClick={() => ul('blobGrainMono', !(L.blobGrainMono ?? true))}>Mono</button>
                </div>
              )}
            </div>
            {L.blobStroke && <Rule />}
            {L.blobStroke && (
              <ParamRows lead={<ColorField value={L.blobColor ?? '#000000'} label="Blob color" onChange={v => ul('blobColor', v)} />}
                params={[
                { key: 'blobDistance', label: 'Distance', suffix: '%', min: 0, max: 100, step: 1, def: 40,
                  value: L.blobDistance ?? 40, onChange: v => ul('blobDistance', v) },
                { key: 'blobCurve', label: 'Curviness', suffix: '%', min: 0, max: 100, step: 1, def: 30,
                  value: L.blobCurve ?? 30, onChange: v => ul('blobCurve', v) },
                { key: 'blobGrain', label: 'Grain', min: 0, max: 100, step: 1, def: 0,
                  format: v => v === 0 ? 'Off' : `${v}%`,
                  value: L.blobGrain ?? 0, onChange: v => ul('blobGrain', v) },
                (L.blobGrain ?? 0) > 0 && {
                  key: 'blobGrainSize', label: 'Grain size', suffix: '%', min: 0, max: 100, step: 1, def: 30,
                  value: L.blobGrainSize ?? 30, onChange: v => ul('blobGrainSize', v) },
                (L.blobGrain ?? 0) > 0 && {
                  key: 'blobGrainRough', label: 'Roughness', min: 0, max: 100, step: 1, def: 0,
                  format: v => v === 0 ? 'Smooth' : `${v}%`,
                  value: L.blobGrainRough ?? 0, onChange: v => ul('blobGrainRough', v) },
              ]} />
            )}
          </>
        )}

        {sub === 'motion' && (
          <>
            {/* Rear-curtain-sync motion blur: sharp text with a fading trail. */}
            <div className="controls__row controls__row--start">
              <Switch layout="start" label="Motion blur" checked={!!L.motionBlur} onChange={v => ul('motionBlur', v)} />
              {L.motionBlur && (L.trailGrain ?? 0) > 0 && (
                <div className="chips scroller controls__chips controls__push" role="group" aria-label="Trail grain">
                  <button type="button" className="chip" aria-pressed={!!L.trailGrainDissolve}
                    onClick={() => ul('trailGrainDissolve', !L.trailGrainDissolve)}>Dissolve</button>
                  <button type="button" className="chip" aria-pressed={L.trailGrainMono ?? true}
                    onClick={() => ul('trailGrainMono', !(L.trailGrainMono ?? true))}>Mono</button>
                </div>
              )}
            </div>
            {L.motionBlur && <Rule />}
            {L.motionBlur && (
              <ParamRows params={[
                // Direction snaps to 5° so the streak stays put when you lift your thumb
                { key: 'motionAngle', label: 'Direction', suffix: '°', min: 0, max: 360, step: 5, def: 0,
                  value: L.motionAngle ?? 0, onChange: v => ul('motionAngle', v) },
                { key: 'motionLength', label: 'Distance', min: 0, max: 400, step: 2, def: 60,
                  format: v => v === 0 ? 'Off' : `${v}px`,
                  value: L.motionLength ?? 0, onChange: v => ul('motionLength', v) },
                { key: 'motionSpeed', label: 'Speed', suffix: '%', min: 0, max: 100, step: 1, def: 60,
                  value: L.motionSpeed ?? 60, onChange: v => ul('motionSpeed', v) },
                { key: 'trailGrain', label: 'Trail grain', min: 0, max: 100, step: 1, def: 0,
                  format: v => v === 0 ? 'Off' : `${v}%`,
                  value: L.trailGrain ?? 0, onChange: v => ul('trailGrain', v) },
                (L.trailGrain ?? 0) > 0 && {
                  key: 'trailGrainSize', label: 'Grain size', suffix: '%', min: 0, max: 100, step: 1, def: 30,
                  value: L.trailGrainSize ?? 30, onChange: v => ul('trailGrainSize', v) },
                (L.trailGrain ?? 0) > 0 && {
                  key: 'trailGrainVariability', label: 'Roughness', min: 0, max: 100, step: 1, def: 0,
                  format: v => v === 0 ? 'Smooth' : `${v}%`,
                  value: L.trailGrainVariability ?? 0, onChange: v => ul('trailGrainVariability', v) },
                (L.trailGrain ?? 0) > 0 && {
                  key: 'trailGrainSpread', label: 'Spread', min: 0, max: 100, step: 1, def: 0,
                  format: v => v === 0 ? 'Even' : `${v}%`,
                  value: L.trailGrainSpread ?? 0, onChange: v => ul('trailGrainSpread', v) },
              ]} />
            )}
          </>
        )}

        {sub === 'echo' && (
          <>
            {/* Discrete decaying ghost copies (After Effects-style), and once
                it is on, how the copies blend. */}
            <div className="controls__row controls__row--start">
              <Switch layout="start" label="Echo" checked={!!L.echo} onChange={v => ul('echo', v)} />
              {L.echo && (
                <div className="select controls__select controls__push">
                  <select value={L.echoBlend ?? 'stack'} onChange={e => ul('echoBlend', e.target.value)}
                    aria-label="Echo blend">
                    {ECHO_BLENDS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <Icon name="chevron-down" />
                </div>
              )}
            </div>
            {L.echo && <Rule />}
            {L.echo && (
              <ParamRows params={[
                { key: 'echoCount', label: 'Amount', min: 1, max: 16, step: 1, def: 5,
                  format: v => `${v}×`, value: L.echoCount ?? 5, onChange: v => ul('echoCount', v) },
                { key: 'echoAngle', label: 'Direction', suffix: '°', min: 0, max: 360, step: 5, def: 0,
                  value: L.echoAngle ?? 0, onChange: v => ul('echoAngle', v) },
                { key: 'echoSpacing', label: 'Spacing', suffix: 'px', min: 0, max: 200, step: 1, def: 40,
                  value: L.echoSpacing ?? 40, onChange: v => ul('echoSpacing', v) },
                { key: 'echoEase', label: 'Curve', min: -100, max: 100, step: 1, def: 50,
                  format: v => v === 0 ? 'Linear' : `${v > 0 ? '+' : '−'}${Math.abs(v)}`,
                  value: L.echoEase ?? 50, onChange: v => ul('echoEase', v) },
                { key: 'echoGhosting', label: 'Ghosting', suffix: '%', min: 0, max: 100, step: 1, def: 60,
                  value: L.echoGhosting ?? 60, onChange: v => ul('echoGhosting', v) },
                { key: 'echoBlur', label: 'Blur', min: 0, max: 60, step: 1, def: 0,
                  format: v => v === 0 ? 'Off' : `${v}`, value: L.echoBlur ?? 0, onChange: v => ul('echoBlur', v) },
                { key: 'echoZoom', label: 'Zoom', min: -50, max: 100, step: 1, def: 0,
                  format: v => v === 0 ? 'Off' : `${v > 0 ? '+' : '−'}${Math.abs(v)}%`,
                  value: L.echoZoom ?? 0, onChange: v => ul('echoZoom', v) },
                { key: 'echoSpin', label: 'Spin', min: -30, max: 30, step: 1, def: 0,
                  format: v => v === 0 ? 'Off' : `${v > 0 ? '+' : '−'}${Math.abs(v)}°`,
                  value: L.echoSpin ?? 0, onChange: v => ul('echoSpin', v) },
                { key: 'echoHue', label: 'Chromatic', min: 0, max: 90, step: 1, def: 0,
                  format: v => v === 0 ? 'Off' : `${v}°`, value: L.echoHue ?? 0, onChange: v => ul('echoHue', v) },
              ]} />
            )}
          </>
        )}
      </>)}

      {addOpen && (
        <AddLayerSheet
          title="New text layer" layers={textLayers}
          labelFor={labelFor}
          onDefault={() => { setAddOpen(false); onAddLayer() }}
          onCopy={(id) => { setAddOpen(false); onAddLayer(id) }}
          onClose={() => setAddOpen(false)}
        />
      )}
    </DockPanel>
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
