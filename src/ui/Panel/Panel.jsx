import './Panel.css'

/**
 * Sliding drawer that animates open via a grid-rows 0fr→1fr trick (symmetric
 * open/close). `open` toggles the expanded state.
 */
export default function Panel({ open, children }) {
  return (
    <div className={`app__panel${open ? ' app__panel--open' : ''}`}>
      <div className="app__panel-inner">
        {children}
      </div>
    </div>
  )
}
