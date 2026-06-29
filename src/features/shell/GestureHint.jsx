import './GestureHint.css'

/** One-per-session toast teaching the canvas gestures. */
export default function GestureHint() {
  return (
    <div className="app__gesture-hint" aria-hidden="true">
      <span>Pinch to zoom</span>
      <span className="app__gesture-sep">·</span>
      <span>Drag to pan</span>
      <span className="app__gesture-sep">·</span>
      <span>Double-tap to reset</span>
    </div>
  )
}
