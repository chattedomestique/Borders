import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './PresetSheet.css'

// A modal for saving/loading the full "look" (text, effects, colours, fill).
// The default behaviour carries only frame basics between photos; this is where
// you opt into remembering everything.
export default function PresetSheet({ presets, hasLast, onSave, onLoad, onDelete, onApplyLast, onClose }) {
  const [name, setName] = useState('')
  const cardRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = () => {
    const n = name.trim()
    if (!n) return
    onSave(n)
    setName('')
  }

  return createPortal(
    <div className="presetsheet" role="dialog" aria-modal="true" aria-label="Presets"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="presetsheet__card" ref={cardRef}>
        <div className="presetsheet__head">
          <span className="presetsheet__title">Presets</span>
          <button className="presetsheet__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="presetsheet__note">
          New photos keep only your border &amp; crop. Save a preset to reuse text, effects, colors &amp; fill.
        </p>

        <div className="presetsheet__saverow">
          <input
            className="presetsheet__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
            placeholder="Name this look…"
            maxLength={40}
            aria-label="Preset name"
          />
          <button className="presetsheet__btn presetsheet__btn--primary" onClick={save} disabled={!name.trim()}>
            Save current
          </button>
        </div>

        {hasLast && (
          <button className="presetsheet__lastlook" onClick={onApplyLast}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
            Apply my last look
          </button>
        )}

        <div className="presetsheet__list">
          {presets.length === 0 ? (
            <p className="presetsheet__empty">No saved presets yet.</p>
          ) : (
            presets.map((p) => (
              <div key={p.id} className="presetsheet__item">
                <button className="presetsheet__load" onClick={() => onLoad(p)}>{p.name}</button>
                <button className="presetsheet__del" onClick={() => onDelete(p.id)}
                  aria-label={`Delete preset ${p.name}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
