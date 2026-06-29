import Field from '../Field/Field.jsx'

/**
 * Labeled range slider: a Field header (label + formatted value pill) over a
 * native range input. `format(value)` produces the pill text; `onChange`
 * receives the numeric value. The range track/thumb styling is global
 * (index.css) and ≥ the comfortable thumb size the design already shipped.
 */
export default function Slider({
  id, label, value, min, max, step = 1, onChange, format, spaced = false,
}) {
  return (
    <>
      <Field label={label} value={format ? format(value) : value} htmlFor={id} spaced={spaced} />
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </>
  )
}
