import './Field.css'

/**
 * The "label + value pill" row that heads every slider control. Pass a
 * `htmlFor` so the label is wired to its input; `spaced` adds the top margin
 * the original used between stacked controls.
 */
export default function Field({ label, value, htmlFor, spaced = false }) {
  return (
    <div className={`controls__row${spaced ? ' controls__row--spaced' : ''}`}>
      {htmlFor
        ? <label className="controls__label" htmlFor={htmlFor}>{label}</label>
        : <span className="controls__label">{label}</span>}
      {value != null && <span className="controls__value">{value}</span>}
    </div>
  )
}
