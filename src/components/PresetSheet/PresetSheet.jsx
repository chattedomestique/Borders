import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../ui'
import { useModalDialog } from '../useModalDialog'
import './PresetSheet.css'

// Saving and loading the full "look" (text, effects, colors, fill). The
// default carries only frame basics between photos; this is where you opt into
// remembering everything. The style guide's form dialog: a card on a native
// <dialog>, so Esc, the backdrop and the focus trap are the browser's.
export default function PresetSheet({ presets, hasLast, onSave, onLoad, onDelete, onApplyLast, onClose }) {
  const [name, setName] = useState('')
  const ref = useModalDialog(true, onClose)

  const save = () => {
    const n = name.trim()
    if (!n) return
    onSave(n)
    setName('')
  }

  return createPortal(
    <dialog ref={ref} className="dialog card presetsheet" aria-labelledby="presets-t" aria-describedby="presets-d">
      <header className="card__bar">
        <p className="card__label" id="presets-t">Presets</p>
      </header>
      <div className="card__body presetsheet__body">
        <p className="card__text" id="presets-d">
          New photos keep only your border and crop. Save a preset to reuse text, effects, colors and fill.
        </p>

        <form className="presetsheet__saverow" onSubmit={(e) => { e.preventDefault(); save() }}>
          <label className="sr-only" htmlFor="preset-name">Preset name</label>
          <input id="preset-name" className="input presetsheet__input" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Name this look" maxLength={40}
            autoComplete="off" />
          <button className="btn" type="submit" data-variant="primary" disabled={!name.trim()}>Save</button>
        </form>

        {hasLast && (
          <button className="btn" type="button" data-block="" onClick={onApplyLast}>
            <span className="btn__label"><Icon name="rotate-ccw" />Apply my last look</span>
          </button>
        )}

        {presets.length === 0 ? (
          <p className="t-meta presetsheet__empty">No saved presets yet.</p>
        ) : (
          <ul className="presetsheet__list" role="list" aria-label="Saved presets">
            {presets.map((p) => (
              <li key={p.id} className="presetsheet__item">
                <button className="btn presetsheet__load" type="button" data-block="" onClick={() => onLoad(p)}>
                  {p.name}
                </button>
                <button className="btn" type="button" data-shape="circle" data-size="sm"
                  onClick={() => onDelete(p.id)} aria-label={`Delete preset ${p.name}`}>
                  <Icon name="trash-2" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="dialog__actions">
        <button className="btn" type="button" onClick={onClose}>Done</button>
      </div>
    </dialog>,
    document.body,
  )
}
