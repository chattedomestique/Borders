import {
  forwardRef, useImperativeHandle, useRef, useEffect, useCallback, useState
} from 'react'
import './BorderCanvas.css'

// The inner media (without border) is scaled so its longest side = OUT_SIZE.
// The border pixels are then ADDED around it, so the border is always uniform
// on all four sides regardless of the media's aspect ratio.
const OUT_SIZE = 1800

function sampleAverageColor(imageData) {
  const { data } = imageData
  let r = 0, g = 0, b = 0, count = 0
  for (let i = 0; i < data.length; i += 16) {
    const a = data[i + 3]
    if (a < 128) continue
    r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
  }
  if (count === 0) return [200, 200, 200]
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      default: h = ((r - g) / d + 4) / 6
    }
  }
  return [h * 360, s * 100, l * 100]
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) { r = g = b = l }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function grabFrame(source, w, h) {
  const tmp = document.createElement('canvas')
  tmp.width = w; tmp.height = h
  const ctx = tmp.getContext('2d')
  ctx.drawImage(source, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

/**
 * Frosted glass background. Blur is produced entirely by a three-pass
 * downsample pyramid so it works on iOS Safari (which ignores ctx.filter
 * before iOS 18). Canvas elements are reused via `cache` to avoid GC churn.
 */
function drawFrostedBg(ctx, source, canvasW, canvasH, blurAmount, cache) {
  const srcW = source.videoWidth ?? source.naturalWidth ?? canvasW
  const srcH = source.videoHeight ?? source.naturalHeight ?? canvasH

  // Cover-fill source into any target canvas size
  const coverFill = (tCtx, tw, th) => {
    const scale = Math.max(tw / srcW, th / srcH)
    const dw = srcW * scale, dh = srcH * scale
    tCtx.drawImage(source, (tw - dw) / 2, (th - dh) / 2, dw, dh)
  }

  // Pass 1: quarter resolution (fixed stepping stone)
  const p1w = Math.max(4, Math.round(canvasW / 4))
  const p1h = Math.max(4, Math.round(canvasH / 4))

  // Pass 2: blurAmount 10→120 maps divisor 2→20 — smaller = blurrier
  const shrink = 2 + (blurAmount - 10) * (18 / 110)
  const p2w = Math.max(2, Math.round(p1w / shrink))
  const p2h = Math.max(2, Math.round(p1h / shrink))

  if (!cache.frost1) cache.frost1 = document.createElement('canvas')
  if (!cache.frost2) cache.frost2 = document.createElement('canvas')
  if (cache.frost1.width !== p1w || cache.frost1.height !== p1h) {
    cache.frost1.width = p1w; cache.frost1.height = p1h
  }
  if (cache.frost2.width !== p2w || cache.frost2.height !== p2h) {
    cache.frost2.width = p2w; cache.frost2.height = p2h
  }

  const c1 = cache.frost1.getContext('2d')
  c1.imageSmoothingEnabled = true; c1.imageSmoothingQuality = 'high'
  coverFill(c1, p1w, p1h)

  const c2 = cache.frost2.getContext('2d')
  c2.imageSmoothingEnabled = true; c2.imageSmoothingQuality = 'high'
  c2.drawImage(cache.frost1, 0, 0, p2w, p2h)

  // Final upscale: the 40-80× scale-up IS the blur — works on all platforms
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // Slight overscan prevents a hard seam at canvas edges
  const pad = Math.round(Math.max(canvasW, canvasH) * 0.02)
  // Use ctx.filter only for saturation/brightness (not for blur) — iOS-safe
  if ('filter' in ctx) ctx.filter = 'saturate(1.6) brightness(0.85)'
  ctx.drawImage(cache.frost2, -pad, -pad, canvasW + pad * 2, canvasH + pad * 2)
  if ('filter' in ctx) { ctx.filter = 'none' } else {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, 0, canvasW, canvasH)
  }
  ctx.restore()
}

/**
 * Core render. The border is added AROUND the scaled media so it is
 * always uniform on all four sides, regardless of aspect ratio.
 */
function renderFrame(canvas, source, settings, cache) {
  if (!canvas || !source) return
  const { borderThickness, bgMode, blurAmount = 60, cornerRadius, cropSquare } = settings

  const srcW = source.videoWidth ?? source.naturalWidth ?? source.width ?? 1
  const srcH = source.videoHeight ?? source.naturalHeight ?? source.height ?? 1

  let mediaW, mediaH
  if (cropSquare) {
    const s = Math.min(srcW, srcH); mediaW = s; mediaH = s
  } else {
    mediaW = srcW; mediaH = srcH
  }

  // Scale inner media so its longest side = OUT_SIZE
  const mediaScale = OUT_SIZE / Math.max(mediaW, mediaH)
  const scaledW = Math.round(mediaW * mediaScale)
  const scaledH = Math.round(mediaH * mediaScale)

  // Canvas = scaled media + uniform border on all four sides
  const border = borderThickness
  const totalW = scaledW + border * 2
  const totalH = scaledH + border * 2
  const offsetX = border
  const offsetY = border

  if (canvas.width !== totalW || canvas.height !== totalH) {
    canvas.width = totalW
    canvas.height = totalH
  }
  const ctx = canvas.getContext('2d')

  // 1. Background
  if (bgMode === 'frosted') {
    drawFrostedBg(ctx, source, totalW, totalH, blurAmount, cache)
  } else {
    const imageData = grabFrame(source, Math.min(srcW, 200), Math.min(srcH, 200))
    const [avgR, avgG, avgB] = sampleAverageColor(imageData)
    const [avgH, avgS, avgL] = rgbToHsl(avgR, avgG, avgB)

    let bgColor
    if (bgMode === 'average') {
      bgColor = `rgb(${avgR},${avgG},${avgB})`
    } else if (bgMode === 'contrast') {
      const lum = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB
      const [r, g, b] = hslToRgb((avgH + 180) % 360, Math.min(avgS * 0.7, 80), lum > 128 ? 15 : 92)
      bgColor = `rgb(${r},${g},${b})`
    } else if (bgMode === 'complementary') {
      const [r, g, b] = hslToRgb(
        (avgH + 180) % 360,
        Math.min(avgS * 1.1, 100),
        avgL > 60 ? Math.max(avgL - 30, 30) : Math.min(avgL + 25, 70)
      )
      bgColor = `rgb(${r},${g},${b})`
    }
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, totalW, totalH)
  }

  // 2. Media with corner radius clipping
  const rx = cornerRadius > 0 ? Math.min(scaledW, scaledH) / 2 * (cornerRadius / 100) : 0

  ctx.save()
  if (rx > 0) {
    const x = offsetX, y = offsetY, w = scaledW, h = scaledH
    ctx.beginPath()
    ctx.moveTo(x + rx, y)
    ctx.lineTo(x + w - rx, y);  ctx.quadraticCurveTo(x + w, y,     x + w, y + rx)
    ctx.lineTo(x + w, y + h - rx); ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h)
    ctx.lineTo(x + rx, y + h);  ctx.quadraticCurveTo(x,     y + h, x,     y + h - rx)
    ctx.lineTo(x, y + rx);      ctx.quadraticCurveTo(x,     y,     x + rx, y)
    ctx.closePath()
    ctx.clip()
  }

  if (cropSquare) {
    const side = Math.min(srcW, srcH)
    ctx.drawImage(source, (srcW - side) / 2, (srcH - side) / 2, side, side,
                  offsetX, offsetY, scaledW, scaledH)
  } else {
    ctx.drawImage(source, 0, 0, srcW, srcH, offsetX, offsetY, scaledW, scaledH)
  }

  ctx.restore()
}

// ─── Component ────────────────────────────────────────────────────────────────

const BorderCanvas = forwardRef(function BorderCanvas({ media, settings }, ref) {
  const canvasRef    = useRef(null)
  const sourceRef    = useRef(null)
  const settingsRef  = useRef(settings)
  const mediaRef     = useRef(media)
  const animFrameRef = useRef(null)
  const cacheRef     = useRef({})   // frosted glass canvas cache
  const [ready, setReady] = useState(false)

  settingsRef.current = settings
  mediaRef.current    = media

  const redraw = useCallback(() => {
    renderFrame(canvasRef.current, sourceRef.current, settingsRef.current, cacheRef.current)
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
      renderFrame(canvasRef.current, sourceRef.current, settingsRef.current, cacheRef.current)
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

  // ── Save ──────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    async save(onProgress) {
      const canvas = canvasRef.current
      const source = sourceRef.current
      if (!canvas) return

      // ── Video ────────────────────────────────────────────────────────────
      if (mediaRef.current?.type === 'video' && source) {
        return new Promise((resolve) => {
          const FORMAT_PREFERENCE = [
            { mime: 'video/mp4;codecs=avc1', fileMime: 'video/mp4', ext: 'mp4' },
            { mime: 'video/mp4',             fileMime: 'video/mp4', ext: 'mp4' },
            { mime: 'video/webm;codecs=vp9', fileMime: 'video/webm', ext: 'webm' },
            { mime: 'video/webm',            fileMime: 'video/webm', ext: 'webm' },
          ]
          const fmt = FORMAT_PREFERENCE.find(f => MediaRecorder.isTypeSupported(f.mime))
            ?? { mime: 'video/webm', fileMime: 'video/webm', ext: 'webm' }

          source.muted = false
          const canvasStream = canvas.captureStream(30)

          let audioCleanup = null
          try {
            if (typeof source.captureStream === 'function') {
              source.captureStream().getAudioTracks().forEach(t => canvasStream.addTrack(t))
            } else if (typeof source.mozCaptureStream === 'function') {
              source.mozCaptureStream().getAudioTracks().forEach(t => canvasStream.addTrack(t))
            } else {
              const AudioCtx = window.AudioContext || window.webkitAudioContext
              const audioCtx = new AudioCtx()
              const src = audioCtx.createMediaElementSource(source)
              const dst = audioCtx.createMediaStreamDestination()
              src.connect(dst); src.connect(audioCtx.destination)
              dst.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t))
              audioCleanup = () => audioCtx.close()
            }
          } catch (e) {
            console.warn('Audio capture unavailable:', e)
          }

          const recorder = new MediaRecorder(canvasStream, { mimeType: fmt.mime })
          const chunks = []
          let rafId = null

          recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

          recorder.onstop = async () => {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null }
            const blob = new Blob(chunks, { type: fmt.fileMime })
            const filename = `border-studio.${fmt.ext}`

            source.muted = true; source.loop = true
            source.play().catch(() => {})
            if (audioCleanup) audioCleanup()
            startLoop()

            if (navigator.share && navigator.canShare) {
              const shareFile = new File([blob], filename, { type: fmt.fileMime })
              if (navigator.canShare({ files: [shareFile] })) {
                try {
                  await navigator.share({ files: [shareFile] })
                  resolve(); return
                } catch (e) {
                  if (e.name !== 'AbortError') console.warn('Share failed:', e)
                }
              }
            }

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = filename
            document.body.appendChild(a); a.click()
            document.body.removeChild(a); URL.revokeObjectURL(url)
            resolve()
          }

          const finishRecording = () => {
            if (recorder.state === 'recording') {
              recorder.requestData()
              recorder.stop()
            }
          }
          source.addEventListener('ended', finishRecording, { once: true })

          const startRecording = () => {
            recorder.start(250)
            const renderLoop = () => {
              renderFrame(canvas, source, settingsRef.current, cacheRef.current)
              if (onProgress && source.duration) onProgress(source.currentTime / source.duration)
              if (!source.ended && recorder.state === 'recording') {
                rafId = requestAnimationFrame(renderLoop)
              }
            }
            rafId = requestAnimationFrame(renderLoop)
          }

          source.loop = false
          stopLoop()
          source.currentTime = 0

          source.addEventListener('seeked', () => {
            source.play()
              .then(startRecording)
              .catch(() => {
                source.muted = true
                if (audioCleanup) audioCleanup()
                source.removeEventListener('ended', finishRecording)
                resolve()
              })
          }, { once: true })
        })
      }

      // ── Image ────────────────────────────────────────────────────────────
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return
      const url = URL.createObjectURL(blob)

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'border-studio.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] })
            URL.revokeObjectURL(url); return
          } catch (e) {
            if (e.name !== 'AbortError') console.warn('Share failed:', e)
          }
        }
      }

      const a = document.createElement('a')
      a.href = url; a.download = 'border-studio.png'
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    }
  }), [startLoop, stopLoop])

  return (
    <div className="border-canvas">
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

export default BorderCanvas
