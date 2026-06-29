import { ICONS } from '../../icons/index.jsx'

/**
 * Render a registered icon by name. `size` overrides width+height; `className`
 * is forwarded to the root <svg>. Unknown names render nothing.
 *
 *   <Icon name="undo" />
 *   <Icon name="logo" className="app__logo-icon" />
 */
export default function Icon({ name, size, className }) {
  const render = ICONS[name]
  return render ? render({ size, className }) : null
}
