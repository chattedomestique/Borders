import Icon from '../Icon/Icon.jsx'
import './Toolbar.css'

/**
 * Bottom toolbar: a row of icon+label tabs and a trailing action slot
 * (the Save button). `tabs` is `{ id, label, icon }[]`; `active` is the open
 * tab id (or null); `onTab(id)` toggles. `children` fills the action slot.
 */
export default function Toolbar({ tabs, active, onTab, children }) {
  return (
    <div className="app__toolbar">
      <div className="app__toolbar-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`app__toolbar-tab${active === t.id ? ' app__toolbar-tab--active' : ''}`}
            onClick={() => onTab(t.id)}
            aria-pressed={active === t.id}
          >
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}
