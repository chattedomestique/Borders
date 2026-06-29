import Icon from '../Icon/Icon.jsx'
import './Chip.css'

/** Horizontally-scrollable container for a row of chips. */
export function ChipStrip({ children, ariaLabel }) {
  return <div className="controls__layer-strip" aria-label={ariaLabel}>{children}</div>
}

/** A selectable pill (crop ratios). `trailing` renders after the label. */
export function Chip({ active, onClick, children, trailing }) {
  return (
    <button
      className={`controls__ratio-chip${active ? ' controls__ratio-chip--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
      {trailing}
    </button>
  )
}

/** The accent "add" action chip. */
export function AddChip({ onClick, children, label }) {
  return (
    <button className="controls__layer-add" onClick={onClick} aria-label={label}>
      <Icon name="plus" />
      <span>{children}</span>
    </button>
  )
}

/** A chip with a label button and a × remove button (text layers). */
export function LayerChip({ active, onSelect, onRemove, children }) {
  return (
    <div className={`controls__layer-chip${active ? ' controls__layer-chip--active' : ''}`}>
      <button className="controls__layer-chip__label" onClick={onSelect} aria-pressed={active}>
        {children}
      </button>
      <button className="controls__layer-chip__remove" onClick={onRemove} aria-label="Remove layer">×</button>
    </div>
  )
}
