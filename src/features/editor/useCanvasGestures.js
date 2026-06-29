import { useRef, useState, useCallback } from 'react'

const MAX_ZOOM = 6

/**
 * Pinch-to-zoom, drag-to-pan, double-tap-to-reset, eyedropper sampling, and
 * text hit-testing + drag. Emits setting/layer updates through the callbacks
 * it's given, so it stays free of any app-state knowledge.
 *
 * Shares the renderer's refs (canvas/geometry/bboxes/settings) so it reads the
 * exact geometry the last frame was drawn with.
 */
export function useCanvasGestures({
  canvasRef, geoRef, textBBoxesRef, settingsRef,
  onUpdate, onUpdateLayer, onPickColor, onSelectLayer, pickMode,
}) {
  const onUpdateRef      = useRef(onUpdate)
  const onUpdateLayerRef = useRef(onUpdateLayer)
  const onPickColorRef   = useRef(onPickColor)
  const onSelectLayerRef = useRef(onSelectLayer)
  const pickModeRef      = useRef(pickMode)
  const pointersRef = useRef(new Map())  // active pointer positions
  const pinchRef    = useRef(null)       // pinch-zoom start state
  const dragRef     = useRef(null)       // single-pointer drag start state
  const lastTapRef  = useRef({ time: 0, x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingText, setIsDraggingText] = useState(false)

  onUpdateRef.current      = onUpdate
  onUpdateLayerRef.current = onUpdateLayer
  onPickColorRef.current   = onPickColor
  onSelectLayerRef.current = onSelectLayer
  pickModeRef.current      = pickMode

  const onPointerDown = useCallback((e) => {
    // Eye-dropper mode: sample the rendered canvas pixel, skip all pan/zoom logic
    if (pickModeRef.current) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = Math.max(0, Math.min(canvas.width  - 1, Math.round((e.clientX - rect.left) * canvas.width  / rect.width)))
      const y = Math.max(0, Math.min(canvas.height - 1, Math.round((e.clientY - rect.top)  * canvas.height / rect.height)))
      const [r, g, b] = canvas.getContext('2d').getImageData(x, y, 1, 1).data
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
      onPickColorRef.current?.(hex)
      return
    }

    // Text hit-test: find the topmost layer under the tap
    if (textBBoxesRef.current.size > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      const geo = geoRef.current
      const canvasX = (e.clientX - rect.left) * geo.totalW / rect.width
      const canvasY = (e.clientY - rect.top)  * geo.totalH / rect.height
      // Iterate in reverse so the last-rendered (topmost) layer wins
      const layers = settingsRef.current.textLayers ?? []
      let hitLayer = null
      for (let i = layers.length - 1; i >= 0; i--) {
        const bb = textBBoxesRef.current.get(layers[i].id)
        if (bb && canvasX >= bb.x && canvasX <= bb.x + bb.w && canvasY >= bb.y && canvasY <= bb.y + bb.h) {
          hitLayer = layers[i]
          break
        }
      }
      if (hitLayer) {
        e.currentTarget.setPointerCapture(e.pointerId)
        onSelectLayerRef.current?.(hitLayer.id)
        dragRef.current = {
          startX: e.clientX, startY: e.clientY,
          startTextX: hitLayer.x ?? 0.5, startTextY: hitLayer.y ?? 0.5,
          layerId: hitLayer.id, rect, isText: true,
        }
        setIsDragging(true)
        setIsDraggingText(true)
        return
      }
    }

    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Double-tap: reset zoom and pan
    if (pointersRef.current.size === 1) {
      const now = Date.now()
      const last = lastTapRef.current
      if (now - last.time < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 40) {
        onUpdateRef.current?.('zoom', 1)
        onUpdateRef.current?.('panX', 0.5)
        onUpdateRef.current?.('panY', 0.5)
        lastTapRef.current = { time: 0, x: 0, y: 0 }
        return
      }
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY }
    }

    const geo = geoRef.current
    const s = settingsRef.current
    const currentZoom = s.zoom ?? 1
    const currentPanX = s.panX ?? 0.5
    const currentPanY = s.panY ?? 0.5
    const viewW = geo.mediaW / currentZoom
    const viewH = geo.mediaH / currentZoom
    const srcLeft = Math.max(0, Math.min(geo.srcW - viewW, currentPanX * geo.srcW - viewW / 2))
    const srcTop  = Math.max(0, Math.min(geo.srcH - viewH, currentPanY * geo.srcH - viewH / 2))

    if (pointersRef.current.size >= 2) {
      // Second finger down → start pinch, cancel single-pointer drag
      dragRef.current = null
      const pts = [...pointersRef.current.values()]
      const [a, b] = pts
      const startDist = Math.hypot(b.x - a.x, b.y - a.y)
      const pcx = (a.x + b.x) / 2
      const pcy = (a.y + b.y) / 2
      const rect = e.currentTarget.getBoundingClientRect()
      // Convert pinch center to normalized position in media area, then to source coords
      const mx = Math.max(0, Math.min(1, ((pcx - rect.left) * geo.totalW / rect.width  - geo.offsetX) / geo.scaledW))
      const my = Math.max(0, Math.min(1, ((pcy - rect.top)  * geo.totalH / rect.height - geo.offsetY) / geo.scaledH))
      pinchRef.current = {
        startDist,
        startZoom: currentZoom,
        pinchSrcX: srcLeft + mx * viewW,
        pinchSrcY: srcTop  + my * viewH,
        rect,
      }
    } else {
      // Single finger → drag to pan
      const rect = e.currentTarget.getBoundingClientRect()
      dragRef.current = { startX: e.clientX, startY: e.clientY, startSrcLeft: srcLeft, startSrcTop: srcTop, viewW, viewH, rect }
    }
    setIsDragging(true)
  }, [canvasRef, geoRef, textBBoxesRef, settingsRef])

  const onPointerMove = useCallback((e) => {
    // Text drag takes priority — don't update pointersRef so pinch stays inactive
    if (dragRef.current?.isText) {
      const drag = dragRef.current
      onUpdateLayerRef.current?.(drag.layerId, 'x', Math.max(0.02, Math.min(0.98, drag.startTextX + (e.clientX - drag.startX) / drag.rect.width)))
      onUpdateLayerRef.current?.(drag.layerId, 'y', Math.max(0.02, Math.min(0.98, drag.startTextY + (e.clientY - drag.startY) / drag.rect.height)))
      return
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const geo = geoRef.current

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()]
      const [a, b] = pts
      const currentDist = Math.hypot(b.x - a.x, b.y - a.y)
      const pcx = (a.x + b.x) / 2
      const pcy = (a.y + b.y) / 2
      const pinch = pinchRef.current

      const newZoom = Math.max(1, Math.min(MAX_ZOOM, pinch.startZoom * currentDist / pinch.startDist))
      const newViewW = geo.mediaW / newZoom
      const newViewH = geo.mediaH / newZoom

      // Keep the source point under the pinch center fixed as zoom changes
      const nmx = Math.max(0, Math.min(1, ((pcx - pinch.rect.left) * geo.totalW / pinch.rect.width  - geo.offsetX) / geo.scaledW))
      const nmy = Math.max(0, Math.min(1, ((pcy - pinch.rect.top)  * geo.totalH / pinch.rect.height - geo.offsetY) / geo.scaledH))
      const newSrcLeft = Math.max(0, Math.min(geo.srcW - newViewW, pinch.pinchSrcX - nmx * newViewW))
      const newSrcTop  = Math.max(0, Math.min(geo.srcH - newViewH, pinch.pinchSrcY - nmy * newViewH))

      onUpdateRef.current?.('zoom', newZoom)
      onUpdateRef.current?.('panX', (newSrcLeft + newViewW / 2) / geo.srcW)
      onUpdateRef.current?.('panY', (newSrcTop  + newViewH / 2) / geo.srcH)

    } else if (dragRef.current) {
      const drag = dragRef.current
      // Source pixels per CSS pixel: view fills scaledW logical px across the canvas's CSS width
      const srcPxPerCSS = drag.viewW * geo.totalW / (geo.scaledW * drag.rect.width)
      const newSrcLeft = Math.max(0, Math.min(geo.srcW - drag.viewW, drag.startSrcLeft - (e.clientX - drag.startX) * srcPxPerCSS))
      const newSrcTop  = Math.max(0, Math.min(geo.srcH - drag.viewH, drag.startSrcTop  - (e.clientY - drag.startY) * srcPxPerCSS))
      onUpdateRef.current?.('panX', (newSrcLeft + drag.viewW / 2) / geo.srcW)
      onUpdateRef.current?.('panY', (newSrcTop  + drag.viewH / 2) / geo.srcH)
    }
  }, [geoRef])

  const onPointerUp = useCallback((e) => {
    pointersRef.current.delete(e.pointerId)

    if (pointersRef.current.size < 2) {
      pinchRef.current = null
    }
    if (pointersRef.current.size === 1) {
      // Transition from pinch back to drag with the remaining finger
      const geo = geoRef.current
      const s = settingsRef.current
      const viewW = geo.mediaW / (s.zoom ?? 1)
      const viewH = geo.mediaH / (s.zoom ?? 1)
      const srcLeft = Math.max(0, Math.min(geo.srcW - viewW, (s.panX ?? 0.5) * geo.srcW - viewW / 2))
      const srcTop  = Math.max(0, Math.min(geo.srcH - viewH, (s.panY ?? 0.5) * geo.srcH - viewH / 2))
      const [remainingPos] = [...pointersRef.current.values()]
      dragRef.current = {
        startX: remainingPos.x, startY: remainingPos.y,
        startSrcLeft: srcLeft, startSrcTop: srcTop,
        viewW, viewH,
        rect: e.currentTarget.getBoundingClientRect(),
      }
    }
    if (pointersRef.current.size === 0) {
      dragRef.current = null
      setIsDragging(false)
      setIsDraggingText(false)
    }
  }, [geoRef, settingsRef])

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    isDragging,
    isDraggingText,
  }
}
