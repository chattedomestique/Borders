import { useRef, useState, useEffect, useCallback } from 'react'
import { renderFrame, OUT_SIZE } from '../../engine/render.js'

/**
 * Owns the canvas element, the rAF loop (video), single redraws (images), and
 * the visibility pause. All drawing is delegated to the framework-free engine.
 *
 * Returns the refs + loop controls the gesture hook and the save handle need,
 * so the renderer is the single owner of canvas/source/cache/geometry state.
 */
export function useCanvasRenderer(media, settings) {
  const canvasRef    = useRef(null)
  const sourceRef    = useRef(null)
  const settingsRef  = useRef(settings)
  const mediaRef     = useRef(media)
  const animFrameRef = useRef(null)
  const cacheRef     = useRef({})
  const geoRef       = useRef({ totalW: OUT_SIZE, totalH: OUT_SIZE, scaledW: OUT_SIZE, scaledH: OUT_SIZE,
                                offsetX: 0, offsetY: 0, srcW: 1, srcH: 1, mediaW: 1, mediaH: 1 })
  const textBBoxesRef = useRef(new Map())  // Map<layerId, bbox> in canvas coords
  const overlayRef    = useRef(null)       // transient { grid } shown while dragging
  const [ready, setReady] = useState(false)

  settingsRef.current = settings
  mediaRef.current    = media

  const redraw = useCallback(() => {
    renderFrame(canvasRef.current, sourceRef.current, settingsRef.current, cacheRef.current, geoRef, textBBoxesRef.current, overlayRef.current)
  }, [])

  const stopLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [])

  const startLoop = useCallback(() => {
    stopLoop()
    const loop = () => {
      renderFrame(canvasRef.current, sourceRef.current, settingsRef.current, cacheRef.current, geoRef, textBBoxesRef.current, overlayRef.current)
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
  }, [stopLoop])

  // Load media
  useEffect(() => {
    setReady(false)
    stopLoop()
    cacheRef.current = {}  // clear blur cache when media changes
    if (!media?.url) return

    if (media.type === 'image') {
      const img = new Image()
      img.onload = () => { sourceRef.current = img; redraw(); setReady(true) }
      img.onerror = () => setReady(false)
      img.src = media.url
    } else {
      const video = document.createElement('video')
      video.playsInline = true
      video.muted = true
      video.loop = true
      video.preload = 'auto'
      video.crossOrigin = 'anonymous'
      video.src = media.url

      const onLoaded = () => {
        sourceRef.current = video
        video.play().catch(() => {})
        startLoop()
        setReady(true)
      }
      video.addEventListener('loadeddata', onLoaded, { once: true })
      video.load()

      return () => {
        video.removeEventListener('loadeddata', onLoaded)
        video.pause()
        stopLoop()
      }
    }
  }, [media, redraw, startLoop, stopLoop])

  // Re-render on settings change (images only; videos redraw continuously)
  useEffect(() => {
    if (!ready || mediaRef.current?.type === 'video') return
    redraw()
  }, [settings, ready, redraw])

  // Pause rAF when the page/app is hidden (battery + CPU savings)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stopLoop()
      } else if (ready && mediaRef.current?.type === 'video') {
        startLoop()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [ready, startLoop, stopLoop])

  return {
    canvasRef, sourceRef, settingsRef, mediaRef, cacheRef, geoRef, textBBoxesRef, overlayRef,
    ready, redraw, startLoop, stopLoop,
  }
}
