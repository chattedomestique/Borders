import './Segmented.css'

/**
 * Segmented control — a radiogroup of equal-width segments. `options` is a list
 * of `{ id, label }`; `value` is the selected id; `onChange(id)` fires on tap.
 *
 * `columns` overrides the track's column count (defaults to one per option).
 * `optionStyle(option)` can return per-segment inline styles (used for the font
 * preview segments). `role`/`itemRole` let callers express radiogroup vs tablist.
 */
export default function Segmented({
  options, value, onChange, columns, ariaLabel,
  role = 'radiogroup', itemRole = 'radio', optionStyle, fill = false, className, style,
}) {
  const cols = columns ?? options.length
  return (
    <div
      className={`controls__seg${fill ? ' controls__seg--fill' : ''}${className ? ` ${className}` : ''}`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, ...style }}
      role={role}
      aria-label={ariaLabel}
    >
      {options.map(opt => {
        const selected = value === opt.id
        const itemProps = itemRole === 'tab'
          ? { role: 'tab', 'aria-selected': selected }
          : { role: 'radio', 'aria-checked': selected }
        return (
          <button
            key={opt.id}
            {...itemProps}
            className={`controls__seg-btn${selected ? ' controls__seg-btn--active' : ''}`}
            style={optionStyle ? optionStyle(opt) : undefined}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
