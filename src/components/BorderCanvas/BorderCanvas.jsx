import {
  forwardRef, useImperativeHandle, useRef, useEffect, useCallback, useState
} from 'react'
import './BorderCanvas.css'

// Output canvas size (square, high-res)
const OUT_SIZE = 1800

/**
 * Sample the average color from an ImageData region.
 */
function sampleAverageColor(imageData) {
  const { data } = imageData
  let r = 0, g = 0, b = 0, count = 0
  // Sample every 4th pixel for speed
  for (let i = 0; i < data.length; i += 16) {
    const a = data[i + 3]
    if (a < 128) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count++
  }
  if (count === 0) return [200, 200, 200]
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
}

/**
 * Convert RGB → HSL
 */
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
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

/**
 * Draw the current frame of a media source onto an offscreen canvas and return its ImageData.
 */
function grabFrame(source, w, h) {
  const tmp = document.createElement('canvas')
  tmp.width = w; tmp.height = h
  const ctx = tmp.getContext('2d')
  ctx.drawImage(source, 0, 0, w, h)
  return { ctx, canvas: tmp, imageData: ctx.getImageData(0, 0, w, h) }
}

/**
 * Draw frosted-glass background: blurred + scaled version of the media.
 */
function drawFrostedBg(ctx, source, canvasW, canvasH, blurAmount) {
  // Downsample to small canvas for performance, then apply blur
  const tmp = document.createElement('canvas')
  tmp.width = 80; tmp.height = 80
  const tCtx = tmp.getContext('2d')
  tCtx.drawImage(source, 0, 0, 80, 80)

  ctx.save()
  ctx.filter = `blur(${blurAmount}px) saturate(1.6) brightness(0.85)`
  // Scale to cover
  const srcAr = source.videoWidth !== undefined
    ? (source.videoWidth || 1) / (source.videoHeight || 1)
    : (source.naturalWidth || 1) / (source.naturalHeight || 1)
  const dstAr = canvasW / canvasH
  let sw, sh, sx, sy
  if (srcAr > dstAr) { sh = canvasH; sw = sh * srcAr; sy = 0; sx = (canvasW - sw) / 2 }
  else { sw = canvasW; sh = sw / srcAr; sx = 0; sy = (canvasH - sh) / 2 }
  // Draw slightly larger to ensure blur doesn't leave transparent edges
  const pad = blurAmount * 2
  ctx.drawImage(tmp, sx - pad, sy - pad, sw + pad * 2, sh + pad * 2)
  ctx.filter = 'none'
  ctx.restore()
}

/**
 * Core render function. Called whenever settings or media change.
 */
function renderFrame(canvas, source, settings) {
  if (!canvas || !source) return
  const { borderThickness, bgMode, blurAmount = 60, cornerRadius, cropSquare } = settings

  const srcW = source.videoWidth ?? source.naturalWidth ?? source.width ?? 1
  const srcH = source.videoHeight ?? source.naturalHeight ?? source.height ?? 1

  // Determine inner media dimensions
  let mediaW, mediaH
  if (cropSquare) {
    const side = Math.min(srcW, srcH)
    mediaW = side; mediaH = side
  } else {
    mediaW = srcW; mediaH = srcH
  }

  // Canvas is always square for simplicity of layout;
  // fit the bordered media inside it
  const totalW = OUT_SIZE
  const totalH = OUT_SIZE

  // Border fraction
  const border = borderThickness  // in output pixels

  // Scale media to fit inside canvas minus border on all sides
  const availW = totalW - border * 2
  const availH = totalH - border * 2
  const scale = Math.min(availW / mediaW, availH / mediaH)
  const drawW = mediaW * scale
  const drawH = mediaH * scale

  const offsetX = (totalW - drawW) / 2
  const offsetY = (totalH - drawH) / 2

  canvas.width = totalW
  canvas.height = totalH
  const ctx = canvas.getContext('2d')

  // 1. Draw background
  if (bgMode === 'frosted') {
    drawFrostedBg(ctx, source, totalW, totalH, blurAmount)
  } else {
    // Sample colors from source
    const sampleW = Math.min(srcW, 200)
    const sampleH = Math.min(srcH, 200)
    const { imageData } = grabFrame(source, sampleW, sampleH)
    const [avgR, avgG, avgB] = sampleAverageColor(imageData)
    const [avgH, avgS, avgL] = rgbToHsl(avgR, avgG, avgB)

    let bgColor
    if (bgMode === 'average') {
      bgColor = `rgb(${avgR},${avgG},${avgB})`
    } else if (bgMode === 'contrast') {
      // Use luminance to pick black or white, then shift hue
      const brightness = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB
      if (brightness > 128) {
        const [r, g, b] = hslToRgb((avgH + 180) % 360, Math.min(avgS * 0.7, 80), 15)
        bgColor = `rgb(${r},${g},${b})`
      } else {
        const [r, g, b] = hslToRgb((avgH + 180) % 360, Math.min(avgS * 0.7, 80), 92)
        bgColor = `rgb(${r},${g},${b})`
      }
    } else if (bgMode === 'complementary') {
      const compH = (avgH + 180) % 360
      const compS = Math.min(avgS * 1.1, 100)
      const compL = avgL > 60 ? Math.max(avgL - 30, 30) : Math.min(avgL + 25, 70)
      const [r, g, b] = hslToRgb(compH, compS, compL)
      bgColor = `rgb(${r},${g},${b})`
    }

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, totalW, totalH)
  }

  // 2. Draw media with corner radius
  const rx = cornerRadius > 0
    ? Math.min(drawW, drawH) / 2 * (cornerRadius / 100)
    : 0

  ctx.save()
  if (rx > 0) {
    ctx.beginPath()
    ctx.moveTo(offsetX + rx, offsetY)
    ctx.lineTo(offsetX + drawW - rx, offsetY)
    ctx.quadraticCurveTo(offsetX + drawW, offsetY, offsetX + drawW, offsetY + rx)
    ctx.lineTo(offsetX + drawW, offsetY + drawH - rx)
    ctx.quadraticCurveTo(offsetX + drawW, offsetY + drawH, offsetX + drawW - rx, offsetY + drawH)
    ctx.lineTo(offsetX + rx, offsetY + drawH)
    ctx.quadraticCurveTo(offsetX, offsetY + drawH, offsetX, offsetY + drawH - rx)
    ctx.lineTo(offsetX, offsetY + rx)
    ctx.quadraticCurveTo(offsetX, offsetY, offsetX + rx, offsetY)
    ctx.closePath()
    ctx.clip()
  }

  if (cropSquare) {
    // Draw centre-cropped square
    const side = Math.min(srcW, srcH)
    const cropX = (srcW - side) / 2
    const cropY = (srcH - side) / 2
    ctx.drawImage(source, cropX, cropY, side, side, offsetX, offsetY, drawW, drawH)
  } else {
    ctx.drawImage(source, 0, 0, srcW, srcH, offsetX, offsetY, drawW, drawH)
  }

  ctx.restore()
}

// ─── Component ────────────────────────────────────────────────────────────────

const BorderCanvas = forwardRef(function BorderCanvas({ media, settings }, ref) {
  const canvasRef = useRef(null)
  const sourceRef = useRef(null)  // HTMLImageElement | HTMLVideoElement
  const settingsRef = useRef(settings)
  const mediaRef = useRef(media)
  const animFrameRef = useRef(null)
  const [ready, setReady] = useState(false)

  // Keep refs synced without re-running effects
  settingsRef.current = settings
  mediaRef.current = media

  const redraw = useCallback(() => {
    renderFrame(canvasRef.current, sourceRef.current, settingsRef.current)
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
      renderFrame(canvasRef.current, sourceRef.current, settingsRef.current)
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
  }, [stopLoop])

  // Load media source
  useEffect(() => {
    setReady(false)
    stopLoop()
    if (!media?.url) return

    if (media.type === 'image') {
      const img = new Image()
      img.onload = () => {
        sourceRef.current = img
        redraw()
        setReady(true)
      }
      img.onerror = () => setReady(false)
      img.src = media.url
    } else {
      // video — play it live so the preview animates
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

  // Re-render on settings change (images only; videos use the loop)
  useEffect(() => {
    if (!ready) return
    if (mediaRef.current?.type !== 'video') redraw()
  }, [settings, ready, redraw])

  // ── Save ──────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    async save() {
      const canvas = canvasRef.current
      const source = sourceRef.current
      if (!canvas) return

      // ── Video: record canvas stream as WebM ──────────────────────────────
      if (mediaRef.current?.type === 'video' && source) {
        return new Promise((resolve) => {
          // Pick best supported format
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm'
          const ext = 'webm'

          const stream = canvas.captureStream(30)
          const recorder = new MediaRecorder(stream, { mimeType })
          const chunks = []

          recorder.ondataavailable = e => {
            if (e.data.size > 0) chunks.push(e.data)
          }

          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `border-studio.${ext}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            // Resume looping preview
            source.loop = true
            source.play().catch(() => {})
            startLoop()
            resolve()
          }

          // Stop recording when video reaches the end
          const onEnded = () => {
            stopLoop()
            recorder.stop()
          }
          source.addEventListener('ended', onEnded, { once: true })

          // Start from beginning, disable loop for this pass
          source.loop = false
          stopLoop()
          source.currentTime = 0

          recorder.start()

          // rAF loop that feeds frames into the stream
          const recordLoop = () => {
            renderFrame(canvas, source, settingsRef.current)
            if (!source.ended) {
              requestAnimationFrame(recordLoop)
            }
          }

          source.play().then(() => {
            requestAnimationFrame(recordLoop)
          }).catch(() => {
            source.removeEventListener('ended', onEnded)
            recorder.stop()
          })
        })
      }

      // ── Image: export as PNG ─────────────────────────────────────────────
      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) return

      const url = URL.createObjectURL(blob)

      // iOS: use Web Share API with Files if available (saves to Photos)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'border-studio.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] })
            URL.revokeObjectURL(url)
            return
          } catch (e) {
            // User cancelled or not supported — fall through to download
            if (e.name !== 'AbortError') console.warn('Share failed:', e)
          }
        }
      }

      // Fallback: trigger a download
      const a = document.createElement('a')
      a.href = url
      a.download = 'border-studio.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
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
