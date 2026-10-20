// The style guide's elements, as React components.
//
// Each one renders the style guide's own markup (see the element's header in
// src/vendor/styleguide/elements/*.css, or its docs page) and lets React own
// the state. The style guide's state-owning scripts (tabs, chip, dialog,
// slider) are deliberately not loaded — two owners of aria-selected fight — so
// the keyboard patterns they would add are implemented here instead.
import { useId, useRef } from 'react'

/** A masked symbol. Decorative: the control that holds it carries the name. */
export function Icon({ name, className = '' }) {
  return <span className={`ic ic--${name}${className ? ` ${className}` : ''}`} aria-hidden="true" />
}

/**
 * Pick one of two to four values. Native radios inside, so arrow keys, roving
 * focus and the screen-reader semantics come from the browser.
 */
export function Segmented({ label, options, value, onChange, size = 'sm', block = true, name }) {
  const auto = useId()
  const group = name ?? `seg${auto}`
  return (
    <fieldset className="segmented" data-size={size} data-block={block ? '' : undefined}>
      <legend className="sr-only">{label}</legend>
      {options.map(o => (
        <label key={String(o.id)} className="segmented__opt">
          <input type="radio" name={group} value={String(o.id)}
            checked={value === o.id} onChange={() => onChange(o.id)}
            aria-label={o.aria} />
          <span className="segmented__label">
            {o.icon && <Icon name={o.icon} />}{o.label}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

/**
 * Tabs that swap the panel beneath them (the dock's sub-views). ARIA tabs with
 * automatic activation: one tab stop, arrows / Home / End move and choose.
 * The panel is the caller's next sibling; give it role="tabpanel" with
 * aria-labelledby = tabId(value) so the pairing is announced.
 */
export function Tabs({ label, tabs, value, onChange, idBase }) {
  const listRef = useRef(null)
  const onKeyDown = (e) => {
    const i = tabs.findIndex(t => t.id === value)
    const last = tabs.length - 1
    const next = e.key === 'ArrowRight' ? Math.min(last, i + 1)
               : e.key === 'ArrowLeft'  ? Math.max(0, i - 1)
               : e.key === 'Home' ? 0 : e.key === 'End' ? last : null
    if (next == null || next === i) return
    e.preventDefault()
    onChange(tabs[next].id)
    // Focus follows the choice once React has re-rendered the roving tabindex.
    requestAnimationFrame(() => listRef.current?.querySelector(`[data-tab="${tabs[next].id}"]`)?.focus())
  }
  return (
    <div className="tabs" data-size="sm" data-block="">
      <div className="tabs__bar">
        <div className="tabs__list" role="tablist" aria-label={label} ref={listRef} onKeyDown={onKeyDown}>
          {tabs.map(t => {
            const on = t.id === value
            return (
              <button key={t.id} type="button" role="tab" className="tabs__tab"
                id={`${idBase}-tab-${t.id}`} data-tab={t.id}
                aria-selected={on} aria-controls={`${idBase}-panel`}
                tabIndex={on ? 0 : -1} onClick={() => onChange(t.id)}>
                {t.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** An on/off setting that applies at once: a native checkbox with role=switch. */
export function Switch({ label, checked, onChange, hideLabel = false }) {
  return (
    <label className="switch" data-state="hidden">
      <input type="checkbox" role="switch" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span className={`switch__label${hideLabel ? ' sr-only' : ''}`}>{label}</span>
      <span className="switch__state" aria-hidden="true"><span data-on>On</span><span data-off>Off</span></span>
    </label>
  )
}

/**
 * Pick one colour from a set. The colours are the user's (their photo's), so
 * each comes in as --swatch on its label — the one place a component takes a
 * colour from data — while the frame, the check and the name stay roles.
 */
export function SwatchSet({ legend, items, value, onPick, hideLegend = true, name }) {
  const auto = useId()
  const group = name ?? `sw${auto}`
  return (
    <fieldset className="swatch-set">
      <legend className={hideLegend ? 'sr-only' : undefined}>{legend}</legend>
      <div className="swatch-set__list">
        {items.map(it => (
          <label key={it.id} className="swatch-set__opt" style={{ '--swatch': it.hex }}>
            <input type="radio" name={group} value={it.id}
              checked={value === it.id} onChange={() => onPick(it)} />
            <span className="swatch-set__chip"><Icon name="check" /></span>
            <span className="swatch-set__name">{it.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
