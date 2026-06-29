import './Toggle.css'

/** A labeled on/off switch. `onChange(next)` receives the new boolean. */
export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      className={`controls__toggle${checked ? ' controls__toggle--on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch" aria-checked={checked} aria-label={label}
    >
      <span className="controls__toggle-thumb"/>
    </button>
  )
}
