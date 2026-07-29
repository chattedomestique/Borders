import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
function isLightHex(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150
}

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

const ALIGNS = [
  { id: 'left',    label: 'L' },
  { id: 'center',  label: 'C' },
  { id: 'right',   label: 'R' },
  { id: 'justify', label: 'J' },
]

const TEXT_BG_MODES = [
  { id: 'none', label: 'None' },
  { id: 'pill', label: 'Pill' },
  { id: 'rect', label: 'Box'  },
]

const ECHO_BLENDS = [
  { id: 'stack',   label: 'Stack'   },
  { id: 'screen',  label: 'Screen'  },
  { id: 'lighten', label: 'Lighten' },
]

function Toggle({ on, onChange, label }) {
  return (
    <button
      className={`controls__toggle${on ? ' controls__toggle--on' : ''}`}
      onClick={() => onChange(!on)}
      role="switch" aria-checked={on} aria-label={label}
    >
      <span className="controls__toggle-thumb"/>
    </button>
  )
}

/**
 * Range slider that resets to its default on double-tap / double-click of the
 * handle. `def` is the default value; `on(value)` receives the numeric value
 * (from drags and from the reset). All other props pass through to the input.
 */
function Slider({ def, on, ...rest }) {
  const lastTap = useRef(0)
  const reset = () => { if (def != null) on(def) }
  return (
    <input
      type="range" {...rest}
      onChange={e => on(Number(e.target.value))}
      onDoubleClick={reset}
      onPointerDown={() => {
        const now = Date.now()
        if (now - lastTap.current < 320) { reset(); lastTap.current = 0 }
        else lastTap.current = now
      }}
    />
  )
}

// A centered dialog for precise value entry. Replaces the old inline number
// input, which on iOS auto-zoomed onto the field and never zoomed back out.
// The backdrop dims + blurs; the input is >=17px so iOS never auto-zooms.
function ValueModal({ label, value, min, max, step, suffix, format, onCommit, onClose }) {
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    triggerRef.current = document.activeElement
    const el = inputRef.current
    if (el) { el.focus(); el.select() }
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      try { triggerRef.current?.focus?.() } catch { /* trigger gone */ }
    }
  }, [onClose])

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

  return createPortal(
    <div className="valuemodal" role="dialog" aria-modal="true"
      aria-label={label ? `Edit ${label}` : 'Edit value'}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="valuemodal__card">
        <div className="valuemodal__title">{label || 'Value'}</div>
        <div className="valuemodal__field">
          <button type="button" className="valuemodal__step" aria-label="Decrease" onClick={() => bump(-1)}>−</button>
          <input
            ref={inputRef} className="valuemodal__input"
            type="number" inputMode={min < 0 ? 'text' : 'decimal'}
            value={draft} min={min} max={max} step={step}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            aria-label={label || 'Value'}
          />
          <button type="button" className="valuemodal__step" aria-label="Increase" onClick={() => bump(1)}>+</button>
        </div>
        <div className="valuemodal__range">
          {format ? `${format(min)} – ${format(max)}` : `${min}${suffix} – ${max}${suffix}`}
        </div>
        <div className="valuemodal__actions">
          <button type="button" className="valuemodal__btn" onClick={onClose}>Cancel</button>
          <button type="button" className="valuemodal__btn valuemodal__btn--primary" onClick={submit}>OK</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * The value control next to every slider: a `[− value +]` stepper. The ± nudge
 * by `step` for quick one-at-a-time changes; tapping the value opens a modal for
 * precise entry. `format` keeps pretty labels (e.g. "Normal", "Square", "+20%")
 * while the editor always works on the raw number.
 */
function EditableValue({ value, min, max, step = 1, onChange, format, suffix = '', style, label }) {
  const [editing, setEditing] = useState(false)

  const clampSnap = (n) => {
    let v = Math.min(max, Math.max(min, n))
    if (step) v = Math.round((v - min) / step) * step + min
    return Math.round(v * 1000) / 1000
  }
  const nudge = (dir) => {
    const v = clampSnap(value + dir * step)
    if (v !== value) onChange(v)
  }
  const display = format ? format(value) : `${value}${suffix}`

  return (
    <div className="controls__valuectl" style={style}>
      <button type="button" className="controls__stepbtn" onClick={() => nudge(-1)}
        disabled={value <= min} aria-label={`Decrease ${label || 'value'}`}>−</button>
      <button type="button" className="controls__value controls__value--btn"
        onClick={() => setEditing(true)} aria-label={`${label || 'Value'} ${display}, tap to type`}>
        {display}
      </button>
      <button type="button" className="controls__stepbtn" onClick={() => nudge(1)}
        disabled={value >= max} aria-label={`Increase ${label || 'value'}`}>+</button>
      {editing && (
        <ValueModal
          label={label} value={value} min={min} max={max} step={step} suffix={suffix} format={format}
          onCommit={(n) => { const v = clampSnap(n); if (v !== value) onChange(v); setEditing(false) }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}

/**
 * Asked when adding a layer while others already exist: start from defaults, or
 * clone an existing layer's settings. Cloning is the common case once you've
 * dialled a look in — retyping a dozen sliders to match is the tedious path.
 */
function AddLayerSheet({ title, layers, labelFor, dotFor, onDefault, onCopy, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="addsheet" role="dialog" aria-modal="true" aria-label={title}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="addsheet__card">
        <div className="addsheet__title">{title}</div>
        <button className="addsheet__btn addsheet__btn--primary" onClick={onDefault}>
          Default settings
        </button>
        <div className="addsheet__sep">or copy settings from</div>
        <div className="addsheet__list">
          {layers.map((l, i) => (
            <button key={l.id} className="addsheet__item" onClick={() => onCopy(l.id)}>
              {dotFor && <span className="controls__markdot" style={{ background: dotFor(l) }} aria-hidden="true" />}
              {labelFor(l, i)}
            </button>
          ))}
        </div>
        <button className="addsheet__btn addsheet__btn--ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>,
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
              <span className="parampick__label">{p.label}</span>
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
function ParamStrip({ params }) {
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="7 14 12 19 17 14"/><polyline points="7 10 12 5 17 10"/>
            </svg>
            {cur.label}
          </button>
        ) : (
          <span className="paramstrip__name">{cur.label}</span>
        )}
        <EditableValue value={cur.value} min={cur.min} max={cur.max} step={cur.step ?? 1}
          suffix={cur.suffix} format={cur.format} label={cur.label} onChange={cur.onChange} />
      </div>
      <Slider min={cur.min} max={cur.max} step={cur.step ?? 1} def={cur.def}
        value={cur.value} on={cur.onChange} aria-label={cur.label} />

      {pickOpen && (
        <ParamPicker params={all} currentKey={key}
          onPick={setKey} onClose={() => setPickOpen(false)} />
      )}
    </div>
  )
}

// Call sites pass `params`; the strip is a drop-in for the old row list.
const ParamRows = ParamStrip

// A labelled grid of tappable border-colour suggestions (one harmony group).
function SwatchGroup({ title, hint, action, items, bgMode, bgColor, onApply }) {
  if (!items?.length) return null
  return (
    <>
      <div className="controls__fontlist-head controls__swatch-head">
        <span>{title}</span>
        {action || (hint && <span className="controls__fontlist-count">{hint}</span>)}
      </div>
      <div className="controls__swatches" role="radiogroup" aria-label={title}>
        {items.map(s => {
          const active = bgMode === 'color' && (bgColor || '').toLowerCase() === s.hex.toLowerCase()
          return (
            <button key={s.id} role="radio" aria-checked={active}
              className={`controls__swatch${active ? ' controls__swatch--active' : ''}`}
              onClick={() => onApply?.(s.hex)}
              title={`${s.label} · ${s.hex}`} aria-label={`${s.label} border ${s.hex}`}>
              <span className="controls__swatch-chip" style={{ background: s.hex }}>
                {active && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={isLightHex(s.hex) ? '#111' : '#fff'} strokeWidth="3.2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </span>
              <span className="controls__swatch-label">{s.label}</span>
            </button>
          )
        })}
      </div>
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
function ColorSliders({ hex, onColor }) {
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
    setHexDraft(v.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))
    const norm = normalizeHex(v)
    if (norm) { setHsl(hexToHsl(norm)); emit(norm) }
  }
  const copy = () => {
    try { navigator.clipboard?.writeText('#' + (normalizeHex(hexDraft) || safe).slice(1)) } catch { /* denied */ }
    setCopied(true); setTimeout(() => setCopied(false), 1100)
  }

  const h = Math.round(hsl.h), s = Math.round(hsl.s), l = Math.round(hsl.l)
  const trackSat = `linear-gradient(to right, ${hslCss(hsl.h, 0, hsl.l)}, ${hslCss(hsl.h, 100, hsl.l)})`
  const trackLit = `linear-gradient(to right, #000, ${hslCss(hsl.h, hsl.s, 50)}, #fff)`

  return (
    <div className="controls__hsl">
      <div className="controls__row"><label className="controls__label">Hue</label>
        <EditableValue value={h} min={0} max={360} suffix="°" label="Hue" onChange={v => setChan('h', v)} /></div>
      <Slider className="controls__slider--hue" min={0} max={360} step={1}
        def={Math.round(base.h)} value={h} on={v => setChan('h', v)} />

      <div className="controls__row"><label className="controls__label">Saturation</label>
        <EditableValue value={s} min={0} max={100} suffix="%" label="Saturation" onChange={v => setChan('s', v)} /></div>
      <Slider className="controls__slider--tint" style={{ '--track': trackSat }} min={0} max={100} step={1}
        def={Math.round(base.s)} value={s} on={v => setChan('s', v)} />

      <div className="controls__row"><label className="controls__label">Brightness</label>
        <EditableValue value={l} min={0} max={100} suffix="%" label="Brightness" onChange={v => setChan('l', v)} /></div>
      <Slider className="controls__slider--tint" style={{ '--track': trackLit }} min={0} max={100} step={1}
        def={Math.round(base.l)} value={l} on={v => setChan('l', v)} />

      <div className="controls__hexrow">
        <span className="controls__hexhash" aria-hidden="true">#</span>
        <input className="controls__hexinput" value={hexDraft} onChange={e => onHexInput(e.target.value)}
          spellCheck={false} autoCapitalize="none" autoCorrect="off" inputMode="text" maxLength={6}
          aria-label="Hex color" />
        <button type="button" className="controls__hexcopy" onClick={copy}
          aria-label="Copy hex color">{copied ? 'Copied' : 'Copy'}</button>
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
      <button type="button" className="controls__color-swatch controls__color-swatch--btn"
        style={{ background: v }} onClick={() => setOpen(true)}
        aria-label={`${label || 'Color'} ${v}, tap to change`} />
      {open && <ColorModal label={label} value={v} onChange={onChange} onClose={() => setOpen(false)} />}
    </>
  )
}

function ColorModal({ label, value, onChange, onClose }) {
  const triggerRef = useRef(null)
  useEffect(() => {
    triggerRef.current = document.activeElement
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); try { triggerRef.current?.focus?.() } catch { /* gone */ } }
  }, [onClose])

  return createPortal(
    <div className="valuemodal" role="dialog" aria-modal="true" aria-label={label ? `Edit ${label}` : 'Edit color'}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="valuemodal__card colormodal__card">
        <div className="valuemodal__title">{label || 'Color'}</div>
        <div className="colormodal__preview" style={{ background: normalizeHex(value) || '#000000' }} />
        <ColorSliders hex={value} onColor={onChange} />
        <div className="valuemodal__actions" style={{ gridTemplateColumns: '1fr' }}>
          <button type="button" className="valuemodal__btn valuemodal__btn--primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>,
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
    <button
      className={`controls__eyedropper-mini${pickMode ? ' controls__eyedropper-mini--active' : ''}`}
      onClick={onPickMode} aria-pressed={pickMode} aria-label="Pick a color from the photo">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
      </svg>
      {pickMode ? 'Tap photo' : 'Eyedrop'}
    </button>
  )

  return (
    <section className="controls__section controls__section--dock" aria-label="Border fill">
      <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} role="tablist">
        {BG_SUBTABS.map(t => {
          const active = sub === t.id
          return (
            <button key={t.id} role="tab" aria-selected={active}
              className={`controls__seg-btn${active ? ' controls__seg-btn--active' : ''}`}
              onClick={() => pick(t.id)}>{t.label}</button>
          )
        })}
      </div>

      {sub === 'photo' && (
        <SwatchGroup title="From your photo" hint="tap to apply" items={tones}
          bgMode={bgMode} bgColor={bgColor} onApply={onApplyBorderColor} />
      )}

      {sub === 'accents' && (
        <SwatchGroup title="Complementary & pop" action={eyedrop} items={accents}
          bgMode={bgMode} bgColor={bgColor} onApply={onApplyBorderColor} />
      )}

      {sub === 'adjust' && (
        <ColorSliders hex={bgColor}
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
      <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} role="tablist">
        {FRAME_SUBTABS.map(t => (
          <button key={t.id} role="tab" aria-selected={sub === t.id}
            className={`controls__seg-btn${sub === t.id ? ' controls__seg-btn--active' : ''}`}
            onClick={() => setSub(t.id)}>{t.label}</button>
        ))}
      </div>

      {sub === 'border' && (
        <>
          <ParamRows params={[
            { key: 'border', label: 'Border', suffix: 'px', min: 0, max: 400, step: 1, def: 150,
              value: borderThickness, onChange: v => onUpdate('borderThickness', v) },
            { key: 'corners', label: 'Corners', min: 0, max: 100, step: 1, def: 0,
              format: v => v === 0 ? 'Square' : v === 100 ? 'Round' : `${v}%`,
              value: cornerRadius, onChange: v => onUpdate('cornerRadius', v) },
          ]} />

          <div className="controls__row controls__row--spaced">
            <label className="controls__label">Show photo</label>
            <Toggle on={showMedia} onChange={v => onUpdate('showMedia', v)} label="Toggle photo visibility"/>
          </div>
        </>
      )}

      {sub === 'crop' && (
        <>
          {/* What the chosen ratio applies to: trim the photo, or matte it into
              a frame of that ratio (photo keeps its own aspect, uncropped). */}
          <div className="controls__seg" role="radiogroup" aria-label="Aspect mode"
            style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <button role="radio" aria-checked={aspectMode !== 'fit'}
              className={`controls__seg-btn${aspectMode !== 'fit' ? ' controls__seg-btn--active' : ''}`}
              onClick={() => onUpdate('aspectMode', 'crop')}>Crop photo</button>
            <button role="radio" aria-checked={aspectMode === 'fit'}
              className={`controls__seg-btn${aspectMode === 'fit' ? ' controls__seg-btn--active' : ''}`}
              onClick={() => onUpdate('aspectMode', 'fit')}>Fit photo</button>
          </div>
          <p className="controls__hint" style={{ margin: '0 0 2px' }}>
            {aspectMode === 'fit'
              ? 'Frame takes this ratio; photo is matted inside, uncropped.'
              : 'Photo is trimmed to this ratio.'}
          </p>
          <label className="controls__label" style={{ marginBottom: 2 }}>
            {cropRatio === 'free' ? 'Aspect ratio' : (aspectMode === 'fit' ? 'Frame ratio' : 'Crop ratio')}
          </label>
          <div className="controls__layer-strip">
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
                <button key={r.id}
                  className={`controls__ratio-chip${isActive ? ' controls__ratio-chip--active' : ''}`}
                  onClick={handleClick} aria-pressed={isActive}>
                  {displayLabel}
                  {isActive && canFlip && (
                    <svg className="controls__ratio-flip" width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {sub === 'grid' && (
        <>
          <div className="controls__row">
            <label className="controls__label">Snap to grid</label>
            <Toggle on={!!snapEnabled} onChange={() => onSnapToggle?.()} label="Toggle snapping"/>
          </div>
          {snapEnabled && (
            <>
              <label className="controls__label" style={{ margin: '4px 0 2px' }}>Divisions</label>
              <div className="controls__seg" role="radiogroup" aria-label="Grid divisions"
                style={{ gridTemplateColumns: `repeat(${GRID_OPTIONS.length}, 1fr)` }}>
                {GRID_OPTIONS.map(n => (
                  <button key={n} role="radio" aria-checked={gridDivisions === n}
                    className={`controls__seg-btn${gridDivisions === n ? ' controls__seg-btn--active' : ''}`}
                    onClick={() => onGridDivisions?.(n)}>{n}×{n}</button>
                ))}
              </div>
            </>
          )}
        </>
      )}
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
      <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }} role="tablist">
        {GRAIN_SUBTABS.map(t => (
          <button key={t.id} role="tab" aria-selected={sub === t.id}
            className={`controls__seg-btn${sub === t.id ? ' controls__seg-btn--active' : ''}`}
            onClick={() => setSub(t.id)}>{t.label}</button>
        ))}
      </div>

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
          <Slider id="spread-slider" min={0} max={100} step={1} def={0}
            value={grainSpread} on={v => onUpdate('grainSpread', v)} />

          <div className="controls__row controls__row--spaced">
            <label className="controls__label">Monochrome</label>
            <Toggle on={grainMonochrome} onChange={v => onUpdate('grainMonochrome', v)} label="Toggle monochrome grain"/>
          </div>
        </>
      )}
    </section>
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
    <p className="controls__hint" style={{ textAlign: 'center', padding: '4px 0 2px' }}>
      {layers.length === 0 ? 'Tap Add to lay down a highlight.' : 'Tap a mark above to edit it.'}
    </p>
  )

  return (
    <section className="controls__section controls__section--dock" aria-label="Highlight marks">
      <div className="controls__layer-strip">
        <button className="controls__layer-add"
          onClick={() => layers.length ? setAddOpen(true) : onAdd()} aria-label="Add highlight">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Add</span>
        </button>
        {layers.map((l, i) => (
          <div key={l.id}
            className={`controls__layer-chip${l.id === selectedId ? ' controls__layer-chip--active' : ''}`}>
            <button className="controls__layer-chip__label"
              onClick={() => onSelect(l.id)} aria-pressed={l.id === selectedId}>
              <span className="controls__markdot" style={{ background: l.color }} aria-hidden="true" />
              Mark {i + 1}
            </button>
            <button className="controls__layer-chip__remove"
              onClick={() => onRemove(l.id)} aria-label={`Remove mark ${i + 1}`}>×</button>
          </div>
        ))}
      </div>

      <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} role="tablist">
        {MARK_SUBTABS.map(t => (
          <button key={t.id} role="tab" aria-selected={sub === t.id}
            className={`controls__seg-btn${sub === t.id ? ' controls__seg-btn--active' : ''}`}
            onClick={() => setSub(t.id)}>{t.label}</button>
        ))}
      </div>

      {!selected ? noneHint : (<>
        {sub === 'shape' && (
          <>
            <p className="controls__hint" style={{ margin: '0 0 2px' }}>Drag the mark on the photo, or tap a value.</p>
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
            <div className="controls__color-row controls__color-row--active">
              <ColorField value={selected.color} label="Highlight color" onChange={v => ul('color', v)} />
              <span className="controls__color-hint" style={{ flex: 1 }}>Ink color</span>
              <EditableValue value={selected.opacity ?? 85} min={5} max={100} suffix="%"
                style={{ fontSize: 11 }} label="Opacity" onChange={v => ul('opacity', v)} />
            </div>
            <Slider min={5} max={100} step={1} def={85}
              value={selected.opacity ?? 85} on={v => ul('opacity', v)} aria-label="Highlight opacity" />

            <label className="controls__label" style={{ margin: '4px 0 2px' }}>Blend</label>
            <div className="controls__seg" role="radiogroup" aria-label="Blend mode"
              style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {MARK_BLENDS.map(m => (
                <button key={m.id} role="radio" aria-checked={(selected.blend ?? 'multiply') === m.id}
                  className={`controls__seg-btn${(selected.blend ?? 'multiply') === m.id ? ' controls__seg-btn--active' : ''}`}
                  onClick={() => ul('blend', m.id)}>{m.label}</button>
              ))}
            </div>
            <p className="controls__hint" style={{ margin: '2px 0 0' }}>
              Multiply is how real highlighter ink behaves — it only darkens.
            </p>
          </>
        )}

        {sub === 'edge' && (
          <>
            <div className="controls__seg" role="radiogroup" aria-label="Edge style"
              style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {MARK_EDGES.map(m => (
                <button key={m.id} role="radio" aria-checked={(selected.edge ?? 'marker') === m.id}
                  className={`controls__seg-btn${(selected.edge ?? 'marker') === m.id ? ' controls__seg-btn--active' : ''}`}
                  onClick={() => ul('edge', m.id)}>{m.label}</button>
              ))}
            </div>
            <p className="controls__hint" style={{ margin: '0 0 2px' }}>{EDGE_HINT[selected.edge ?? 'marker']}</p>

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
              <div className="controls__row controls__row--spaced">
                <label className="controls__label">Dissolve</label>
                <Toggle on={!!selected.grainDissolve} onChange={v => ul('grainDissolve', v)}
                  label="Toggle dissolve grain"/>
              </div>
            )}
          </>
        )}

        {sub === 'texture' && (
          <>
            <div className="controls__row controls__row--spaced">
              <label className="controls__label">Riso print</label>
              <Toggle on={(selected.texture ?? 'none') === 'riso'}
                onChange={v => ul('texture', v ? 'riso' : 'none')} label="Toggle riso texture"/>
            </div>
            <p className="controls__hint" style={{ margin: '0 0 2px' }}>
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

const TEXT_SUBTABS = [
  { id: 'content', label: 'Content' },
  { id: 'font',    label: 'Font'    },
  { id: 'format',  label: 'Format'  },
  { id: 'fx',      label: 'FX'      },
]

function TextControls({ textLayers, selectedLayerId, selectedLayer, ul, onAddLayer, onRemoveLayer, onSelectLayer }) {
  const [sub, setSub] = useState('content')
  const [addOpen, setAddOpen] = useState(false)

  const noLayerHint = (
    <p className="controls__hint" style={{ textAlign: 'center', padding: '4px 0 2px' }}>
      {textLayers.length === 0 ? 'Tap Add to create a text layer.' : 'Tap a layer above to edit it.'}
    </p>
  )

  return (
    <section className="controls__section controls__section--dock" aria-label="Text layers">
      {/* Layer strip — always visible */}
      <div className="controls__layer-strip">
        <button className="controls__layer-add"
          onClick={() => textLayers.length ? setAddOpen(true) : onAddLayer()} aria-label="Add text layer">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Add</span>
        </button>
        {textLayers.map(layer => (
          <div key={layer.id}
            className={`controls__layer-chip${layer.id === selectedLayerId ? ' controls__layer-chip--active' : ''}`}>
            <button className="controls__layer-chip__label"
              onClick={() => onSelectLayer(layer.id)} aria-pressed={layer.id === selectedLayerId}>
              {layer.content.trim() ? layer.content.trim().slice(0, 12) : 'Empty'}
            </button>
            <button className="controls__layer-chip__remove"
              onClick={() => onRemoveLayer(layer.id)} aria-label="Remove layer">×</button>
          </div>
        ))}
      </div>

      {/* Sub-tab bar */}
      <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} role="tablist">
        {TEXT_SUBTABS.map(t => (
          <button key={t.id} role="tab" aria-selected={sub === t.id}
            className={`controls__seg-btn${sub === t.id ? ' controls__seg-btn--active' : ''}`}
            onClick={() => setSub(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Content sub-tab */}
      {sub === 'content' && (
        selectedLayer ? (
          <>
            <textarea
              className="controls__textarea"
              placeholder="Type something…"
              value={selectedLayer.content}
              onChange={e => ul('content', e.target.value)}
              rows={3}
              spellCheck={false}
            />
            <p className="controls__hint" style={{ textAlign: 'center', marginTop: 0 }}>
              Tap text on canvas to reposition
            </p>
          </>
        ) : noLayerHint
      )}

      {/* Style sub-tab */}
      {sub === 'font' && (
        selectedLayer ? (
          <>
            <div className="controls__fontlist-head">
              <span>Font</span>
              <span className="controls__fontlist-count">{FONTS.length} families · scroll</span>
            </div>
            <div className="controls__fontlist controls__fontlist--solo" role="radiogroup" aria-label="Font family"
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
              <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(2, 1fr)', flex: '0 0 auto', width: 80 }}>
                <button className={`controls__seg-btn${selectedLayer.bold ? ' controls__seg-btn--active' : ''}`}
                  style={{ fontWeight: 700 }} onClick={() => ul('bold', !selectedLayer.bold)}
                  aria-pressed={selectedLayer.bold}>B</button>
                <button className={`controls__seg-btn${selectedLayer.italic ? ' controls__seg-btn--active' : ''}`}
                  style={{ fontStyle: 'italic' }} onClick={() => ul('italic', !selectedLayer.italic)}
                  aria-pressed={selectedLayer.italic}>I</button>
              </div>
              <div className="controls__seg controls__seg--fill" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {ALIGNS.map(a => (
                  <button key={a.id} role="radio" aria-checked={selectedLayer.align === a.id}
                    className={`controls__seg-btn${selectedLayer.align === a.id ? ' controls__seg-btn--active' : ''}`}
                    onClick={() => ul('align', a.id)}>{a.label}</button>
                ))}
              </div>
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

      {/* FX sub-tab */}
      {sub === 'fx' && (
        selectedLayer ? (
          <>
            <div className="controls__text-row">
              <ColorField value={selectedLayer.color} label="Text color" onChange={v => ul('color', v)} />
              <div className="controls__effects-row">
                <button
                  className={`controls__effect-btn${selectedLayer.shadow ? ' controls__effect-btn--active' : ''}`}
                  onClick={() => ul('shadow', !selectedLayer.shadow)} aria-pressed={selectedLayer.shadow}
                >Shadow</button>
                <button
                  className={`controls__effect-btn${selectedLayer.stroke ? ' controls__effect-btn--active' : ''}`}
                  onClick={() => ul('stroke', !selectedLayer.stroke)} aria-pressed={selectedLayer.stroke}
                >Outline</button>
              </div>
            </div>

            {selectedLayer.stroke && (
              <>
                <div className="controls__color-row controls__color-row--active">
                  <ColorField value={selectedLayer.strokeColor} label="Outline color" onChange={v => ul('strokeColor', v)} />
                  <span className="controls__color-hint">Outline color</span>
                </div>
                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="stroke-width">Outline width</label>
                  <EditableValue value={selectedLayer.strokeWidth ?? 35} min={0} max={100} suffix="%"
                    onChange={v => ul('strokeWidth', v)} />
                </div>
                <Slider id="stroke-width" min={0} max={100} step={1} def={35}
                  value={selectedLayer.strokeWidth ?? 35} on={v => ul('strokeWidth', v)} />
              </>
            )}

            <div className="controls__divider controls__divider--inset"/>

            <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
              role="radiogroup" aria-label="Text background">
              {TEXT_BG_MODES.map(m => (
                <button key={m.id} role="radio" aria-checked={selectedLayer.bg === m.id}
                  className={`controls__seg-btn${selectedLayer.bg === m.id ? ' controls__seg-btn--active' : ''}`}
                  onClick={() => ul('bg', m.id)}>{m.label}</button>
              ))}
            </div>

            {selectedLayer.bg !== 'none' && (
              <>
                <div className="controls__color-row controls__color-row--active">
                  <ColorField value={selectedLayer.bgColor} label="Background color" onChange={v => ul('bgColor', v)} />
                  <span className="controls__color-hint" style={{ flex: 1 }}>BG color</span>
                  <EditableValue value={selectedLayer.bgOpacity} min={10} max={100} suffix="%"
                    style={{ fontSize: 11 }} onChange={v => ul('bgOpacity', v)} />
                </div>
                <Slider min={10} max={100} step={1} value={selectedLayer.bgOpacity} def={50}
                  on={v => ul('bgOpacity', v)} aria-label="Background opacity"/>
              </>
            )}

            <div className="controls__divider controls__divider--inset"/>

            {/* Blob stroke — gooey distance-based outline that merges nearby letters */}
            <div className="controls__row controls__row--spaced">
              <label className="controls__label">Blob stroke</label>
              <Toggle on={!!selectedLayer.blobStroke} onChange={v => ul('blobStroke', v)} label="Toggle blob stroke"/>
            </div>

            {selectedLayer.blobStroke && (
              <>
                <div className="controls__row">
                  <label className="controls__label" htmlFor="blob-distance">Distance</label>
                  <EditableValue value={selectedLayer.blobDistance ?? 40} min={0} max={100} suffix="%"
                    onChange={v => ul('blobDistance', v)} />
                </div>
                <Slider id="blob-distance" min={0} max={100} step={1} def={40}
                  value={selectedLayer.blobDistance ?? 40} on={v => ul('blobDistance', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="blob-curve">Curviness</label>
                  <EditableValue value={selectedLayer.blobCurve ?? 30} min={0} max={100} suffix="%"
                    onChange={v => ul('blobCurve', v)} />
                </div>
                <Slider id="blob-curve" min={0} max={100} step={1} def={30}
                  value={selectedLayer.blobCurve ?? 30} on={v => ul('blobCurve', v)} />

                <div className="controls__color-row controls__color-row--active">
                  <ColorField value={selectedLayer.blobColor ?? '#000000'} label="Blob color" onChange={v => ul('blobColor', v)} />
                  <span className="controls__color-hint">Blob color</span>
                </div>

                {/* Grain on the blob — shared engine with the motion trail */}
                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="blob-grain">Grain</label>
                  <EditableValue value={selectedLayer.blobGrain ?? 0} min={0} max={100}
                    format={v => v === 0 ? 'Off' : `${v}%`} onChange={v => ul('blobGrain', v)} />
                </div>
                <Slider id="blob-grain" min={0} max={100} step={1} def={0}
                  value={selectedLayer.blobGrain ?? 0} on={v => ul('blobGrain', v)} />

                {(selectedLayer.blobGrain ?? 0) > 0 && (
                  <>
                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label" htmlFor="blob-grain-size">Grain size</label>
                      <EditableValue value={selectedLayer.blobGrainSize ?? 30} min={0} max={100} suffix="%"
                        onChange={v => ul('blobGrainSize', v)} />
                    </div>
                    <Slider id="blob-grain-size" min={0} max={100} step={1} def={30}
                      value={selectedLayer.blobGrainSize ?? 30} on={v => ul('blobGrainSize', v)} />

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label" htmlFor="blob-grain-rough">Roughness</label>
                      <EditableValue value={selectedLayer.blobGrainRough ?? 0} min={0} max={100}
                        format={v => v === 0 ? 'Smooth' : `${v}%`} onChange={v => ul('blobGrainRough', v)} />
                    </div>
                    <Slider id="blob-grain-rough" min={0} max={100} step={1} def={0}
                      value={selectedLayer.blobGrainRough ?? 0} on={v => ul('blobGrainRough', v)} />

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label">Dissolve</label>
                      <Toggle on={!!selectedLayer.blobGrainDissolve}
                        onChange={v => ul('blobGrainDissolve', v)} label="Toggle blob grain dissolve"/>
                    </div>
                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label">Monochrome grain</label>
                      <Toggle on={selectedLayer.blobGrainMono ?? true}
                        onChange={v => ul('blobGrainMono', v)} label="Toggle blob monochrome grain"/>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="controls__divider controls__divider--inset"/>

            {/* Rear-curtain-sync motion blur — sharp text with a fading trail behind it */}
            <div className="controls__row controls__row--spaced">
              <label className="controls__label">Motion blur</label>
              <Toggle on={!!selectedLayer.motionBlur} onChange={v => ul('motionBlur', v)} label="Toggle motion blur"/>
            </div>

            {selectedLayer.motionBlur && (
              <>
                <div className="controls__row">
                  <label className="controls__label" htmlFor="motion-direction">Direction</label>
                  <EditableValue value={selectedLayer.motionAngle ?? 0} min={0} max={360} step={5} suffix="°"
                    onChange={v => ul('motionAngle', v)} />
                </div>
                {/* Snap to 5° so the streak angle stays put when you lift your thumb */}
                <Slider id="motion-direction" min={0} max={360} step={5} def={0}
                  value={selectedLayer.motionAngle ?? 0} on={v => ul('motionAngle', v)} />

                <div className="controls__row">
                  <label className="controls__label" htmlFor="motion-distance">Distance</label>
                  <EditableValue value={selectedLayer.motionLength ?? 0} min={0} max={400} step={2}
                    format={v => v === 0 ? 'Off' : `${v}px`}
                    onChange={v => ul('motionLength', v)} />
                </div>
                <Slider id="motion-distance" min={0} max={400} step={2} def={60}
                  value={selectedLayer.motionLength ?? 0} on={v => ul('motionLength', v)} />

                <div className="controls__row">
                  <label className="controls__label" htmlFor="motion-speed">Speed</label>
                  <EditableValue value={selectedLayer.motionSpeed ?? 60} min={0} max={100} suffix="%"
                    onChange={v => ul('motionSpeed', v)} />
                </div>
                <Slider id="motion-speed" min={0} max={100} step={1} def={60}
                  value={selectedLayer.motionSpeed ?? 60} on={v => ul('motionSpeed', v)} />

                {/* Grain adjustment on the trail — long-exposure ambient noise */}
                <div className="controls__divider controls__divider--inset"/>
                <div className="controls__row">
                  <label className="controls__label" htmlFor="trail-grain">Trail grain</label>
                  <EditableValue value={selectedLayer.trailGrain ?? 0} min={0} max={100}
                    format={v => v === 0 ? 'Off' : `${v}%`}
                    onChange={v => ul('trailGrain', v)} />
                </div>
                <Slider id="trail-grain" min={0} max={100} step={1} def={0}
                  value={selectedLayer.trailGrain ?? 0} on={v => ul('trailGrain', v)} />

                {(selectedLayer.trailGrain ?? 0) > 0 && (
                  <>
                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label" htmlFor="trail-grain-size">Grain size</label>
                      <EditableValue value={selectedLayer.trailGrainSize ?? 30} min={0} max={100} suffix="%"
                        onChange={v => ul('trailGrainSize', v)} />
                    </div>
                    <Slider id="trail-grain-size" min={0} max={100} step={1} def={30}
                      value={selectedLayer.trailGrainSize ?? 30}
                      on={v => ul('trailGrainSize', v)} />

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label" htmlFor="trail-grain-var">Roughness</label>
                      <EditableValue value={selectedLayer.trailGrainVariability ?? 0} min={0} max={100}
                        format={v => v === 0 ? 'Smooth' : `${v}%`}
                        onChange={v => ul('trailGrainVariability', v)} />
                    </div>
                    <Slider id="trail-grain-var" min={0} max={100} step={1} def={0}
                      value={selectedLayer.trailGrainVariability ?? 0}
                      on={v => ul('trailGrainVariability', v)} />

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label" htmlFor="trail-grain-spread">Spread</label>
                      <EditableValue value={selectedLayer.trailGrainSpread ?? 0} min={0} max={100}
                        format={v => v === 0 ? 'Even' : `${v}%`}
                        onChange={v => ul('trailGrainSpread', v)} />
                    </div>
                    <Slider id="trail-grain-spread" min={0} max={100} step={1} def={0}
                      value={selectedLayer.trailGrainSpread ?? 0}
                      on={v => ul('trailGrainSpread', v)} />

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label">Dissolve</label>
                      <Toggle on={!!selectedLayer.trailGrainDissolve}
                        onChange={v => ul('trailGrainDissolve', v)} label="Toggle dissolve grain mode"/>
                    </div>

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label">Monochrome grain</label>
                      <Toggle on={selectedLayer.trailGrainMono ?? true}
                        onChange={v => ul('trailGrainMono', v)} label="Toggle monochrome trail grain"/>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="controls__divider controls__divider--inset"/>

            {/* Echo — discrete decaying ghost copies (After Effects-style) */}
            <div className="controls__row controls__row--spaced">
              <label className="controls__label">Echo</label>
              <Toggle on={!!selectedLayer.echo} onChange={v => ul('echo', v)} label="Toggle echo"/>
            </div>

            {selectedLayer.echo && (
              <>
                <div className="controls__row">
                  <label className="controls__label" htmlFor="echo-count">Amount</label>
                  <EditableValue value={selectedLayer.echoCount ?? 5} min={1} max={16}
                    format={v => `${v}×`} onChange={v => ul('echoCount', v)} />
                </div>
                <Slider id="echo-count" min={1} max={16} step={1} def={5}
                  value={selectedLayer.echoCount ?? 5} on={v => ul('echoCount', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-direction">Direction</label>
                  <EditableValue value={selectedLayer.echoAngle ?? 0} min={0} max={360} step={5} suffix="°"
                    onChange={v => ul('echoAngle', v)} />
                </div>
                <Slider id="echo-direction" min={0} max={360} step={5} def={0}
                  value={selectedLayer.echoAngle ?? 0} on={v => ul('echoAngle', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-spacing">Spacing</label>
                  <EditableValue value={selectedLayer.echoSpacing ?? 40} min={0} max={200} suffix="px"
                    onChange={v => ul('echoSpacing', v)} />
                </div>
                <Slider id="echo-spacing" min={0} max={200} step={1} def={40}
                  value={selectedLayer.echoSpacing ?? 40} on={v => ul('echoSpacing', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-ease">Curve</label>
                  <EditableValue value={selectedLayer.echoEase ?? 50} min={-100} max={100} step={1}
                    format={v => v === 0 ? 'Linear' : `${v > 0 ? '+' : ''}${v}`}
                    onChange={v => ul('echoEase', v)} />
                </div>
                <Slider id="echo-ease" min={-100} max={100} step={1} def={50}
                  value={selectedLayer.echoEase ?? 50} on={v => ul('echoEase', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-ghosting">Ghosting</label>
                  <EditableValue value={selectedLayer.echoGhosting ?? 60} min={0} max={100} suffix="%"
                    onChange={v => ul('echoGhosting', v)} />
                </div>
                <Slider id="echo-ghosting" min={0} max={100} step={1} def={60}
                  value={selectedLayer.echoGhosting ?? 60} on={v => ul('echoGhosting', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-blur">Blur</label>
                  <EditableValue value={selectedLayer.echoBlur ?? 0} min={0} max={60}
                    format={v => v === 0 ? 'Off' : `${v}`} onChange={v => ul('echoBlur', v)} />
                </div>
                <Slider id="echo-blur" min={0} max={60} step={1} def={0}
                  value={selectedLayer.echoBlur ?? 0} on={v => ul('echoBlur', v)} />

                <div className="controls__seg" role="radiogroup" aria-label="Echo blend"
                  style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 8 }}>
                  {ECHO_BLENDS.map(m => (
                    <button key={m.id} role="radio" aria-checked={(selectedLayer.echoBlend ?? 'stack') === m.id}
                      className={`controls__seg-btn${(selectedLayer.echoBlend ?? 'stack') === m.id ? ' controls__seg-btn--active' : ''}`}
                      onClick={() => ul('echoBlend', m.id)}>{m.label}</button>
                  ))}
                </div>

                {/* Experimental per-echo transforms */}
                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-zoom">Zoom</label>
                  <EditableValue value={selectedLayer.echoZoom ?? 0} min={-50} max={100} step={1}
                    format={v => v === 0 ? 'Off' : `${v > 0 ? '+' : ''}${v}%`} onChange={v => ul('echoZoom', v)} />
                </div>
                <Slider id="echo-zoom" min={-50} max={100} step={1} def={0}
                  value={selectedLayer.echoZoom ?? 0} on={v => ul('echoZoom', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-spin">Spin</label>
                  <EditableValue value={selectedLayer.echoSpin ?? 0} min={-30} max={30} step={1}
                    format={v => v === 0 ? 'Off' : `${v > 0 ? '+' : ''}${v}°`} onChange={v => ul('echoSpin', v)} />
                </div>
                <Slider id="echo-spin" min={-30} max={30} step={1} def={0}
                  value={selectedLayer.echoSpin ?? 0} on={v => ul('echoSpin', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-hue">Chromatic</label>
                  <EditableValue value={selectedLayer.echoHue ?? 0} min={0} max={90} step={1}
                    format={v => v === 0 ? 'Off' : `${v}°`} onChange={v => ul('echoHue', v)} />
                </div>
                <Slider id="echo-hue" min={0} max={90} step={1} def={0}
                  value={selectedLayer.echoHue ?? 0} on={v => ul('echoHue', v)} />
              </>
            )}
          </>
        ) : noLayerHint
      )}

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
