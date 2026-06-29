import './Swatch.css'

/**
 * Color swatch: a preview chip whose tap opens the native color input.
 * `onChange(hex)` receives the picked color. `title`/`label` set the tooltip
 * and accessible name.
 */
export default function Swatch({ color, onChange, title, label }) {
  return (
    <label className="controls__color-swatch" style={{ background: color }}
      title={title} aria-label={label}>
      <input type="color" value={color} onChange={e => onChange(e.target.value)} />
    </label>
  )
}
