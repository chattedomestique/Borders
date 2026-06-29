import Icon from '../Icon/Icon.jsx'
import './IconButton.css'

/**
 * Round icon-only button used for header actions. `icon` is a registry name;
 * `active` paints it accent; `label` is the accessible name (icon is decorative).
 */
export default function IconButton({ icon, onClick, active = false, disabled = false, label }) {
  return (
    <button
      className={`app__icon-btn${active ? ' app__icon-btn--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <Icon name={icon} />
    </button>
  )
}
