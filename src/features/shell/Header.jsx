import Icon from '../../ui/Icon/Icon.jsx'
import IconButton from '../../ui/IconButton/IconButton.jsx'
import { useSettings } from '../../state/settingsStore.js'
import './Header.css'

/**
 * Top bar: brand logo plus the edit-screen action cluster (undo/redo, fit/fill
 * view toggle, and "New"). Undo/redo state comes from the settings context;
 * everything else is editor UI state passed in.
 */
export default function Header({ editing, viewMode, onToggleView, onReset }) {
  const { undo, redo, canUndo, canRedo } = useSettings()

  return (
    <header className="app__header">
      <div className="app__header-inner">
        <div className="app__logo" aria-label="Border Studio">
          <Icon name="logo" className="app__logo-icon" />
          <span className="app__logo-text">Border Studio</span>
        </div>
        {editing && (
          <div className="app__header-actions">
            <IconButton icon="undo" onClick={undo} disabled={!canUndo} label="Undo" />
            <IconButton icon="redo" onClick={redo} disabled={!canRedo} label="Redo" />
            <IconButton
              icon={viewMode === 'fit' ? 'viewFit' : 'viewFill'}
              active={viewMode === 'fit'}
              onClick={onToggleView}
              label={viewMode === 'fit' ? 'View: Fit (tap for Fill)' : 'View: Fill (tap for Fit)'}
            />
            <button className="app__reset-btn" onClick={onReset} aria-label="Start over">
              New
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
