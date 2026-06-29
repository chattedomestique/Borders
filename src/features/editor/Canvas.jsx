import { forwardRef, useImperativeHandle } from 'react'
import { useSettings } from '../../state/settingsStore.js'
import { useCanvasRenderer } from './useCanvasRenderer.js'
import { useCanvasGestures } from './useCanvasGestures.js'
import { saveMedia } from '../../engine/export.js'
import './Canvas.css'

/**
 * Thin React wrapper: wires the framework-free engine (via useCanvasRenderer)
 * to pointer gestures (via useCanvasGestures) and exposes an imperative save().
 * All drawing/math lives in engine/; all state lives in the settings context.
 */
const Canvas = forwardRef(function Canvas(
  { media, pickMode, onSelectLayer, onPickColor }, ref
) {
  const { settings, update, updateLayer } = useSettings()

  const {
    canvasRef, sourceRef, settingsRef, mediaRef, cacheRef, geoRef, textBBoxesRef,
    ready, startLoop, stopLoop,
  } = useCanvasRenderer(media, settings)

  const { handlers, isDragging, isDraggingText } = useCanvasGestures({
    canvasRef, geoRef, textBBoxesRef, settingsRef,
    onUpdate: update,
    onUpdateLayer: updateLayer,
    onPickColor,
    onSelectLayer,
    pickMode,
  })

  useImperativeHandle(ref, () => ({
    save(onProgress) {
      return saveMedia({
        canvas: canvasRef.current,
        source: sourceRef.current,
        mediaType: mediaRef.current?.type,
        settingsRef, cacheRef, geoRef,
        startLoop, stopLoop, onProgress,
      })
    },
  }), [canvasRef, sourceRef, mediaRef, settingsRef, cacheRef, geoRef, startLoop, stopLoop])

  const cursor = pickMode ? 'crosshair' : (isDraggingText ? 'grabbing' : isDragging ? 'grabbing' : 'grab')

  return (
    <div
      className="border-canvas"
      style={{ cursor, touchAction: 'none' }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerCancel}
    >
      <canvas
        ref={canvasRef}
        className={`border-canvas__el${ready ? ' border-canvas__el--ready' : ''}`}
        aria-label="Preview of your bordered media"
      />
      {!ready && (
        <div className="border-canvas__loading" aria-hidden="true">
          <div className="border-canvas__spinner"/>
        </div>
      )}
    </div>
  )
})

export default Canvas
