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
 * One separable box-blur pass (horizontal, then vertical) on ImageData.
 * Seeding starts at index 0 so the running sum is never inflated by
 * phantom edge pixels. Three passes of this ≈ a Gaussian blur.
 */
function boxBlurPass(data, w, h, r) {
  const tmp = new Uint8ClampedArray(data.length)

  // Horizontal pass: data → tmp
  for (let y = 0; y < h; y++) {
    const row = y * w
    let R = 0, G = 0, B = 0
    // Seed: sum pixels 0 … min(r, w-1) only — no phantom repeats
    for (let k = 0; k <= Math.min(r, w - 1); k++) {
      const i = (row + k) * 4
      R += data[i]; G += data[i + 1]; B += data[i + 2]
    }
    for (let x = 0; x < w; x++) {
      const cnt = Math.min(x + r, w - 1) - Math.max(x - r, 0) + 1
      const o = (row + x) * 4
      tmp[o] = R / cnt; tmp[o + 1] = G / cnt; tmp[o + 2] = B / cnt; tmp[o + 3] = 255
      if (x - r >= 0)       { const i = (row + x - r) * 4;     R -= data[i]; G -= data[i+1]; B -= data[i+2] }
      if (x + r + 1 < w)    { const i = (row + x + r + 1) * 4; R += data[i]; G += data[i+1]; B += data[i+2] }
    }
  }

  // Vertical pass: tmp → data
  for (let x = 0; x < w; x++) {
    let R = 0, G = 0, B = 0
    for (let k = 0; k <= Math.min(r, h - 1); k++) {
      const i = (k * w + x) * 4
      R += tmp[i]; G += tmp[i + 1]; B += tmp[i + 2]
    }
    for (let y = 0; y < h; y++) {
      const cnt = Math.min(y + r, h - 1) - Math.max(y - r, 0) + 1
      const o = (y * w + x) * 4
      data[o] = R / cnt; data[o + 1] = G / cnt; data[o + 2] = B / cnt; data[o + 3] = 255
      if (y - r >= 0)       { const i = ((y - r) * w + x) * 4;     R -= tmp[i]; G -= tmp[i+1]; B -= tmp[i+2] }
      if (y + r + 1 < h)    { const i = ((y + r + 1) * w + x) * 4; R += tmp[i]; G += tmp[i+1]; B += tmp[i+2] }
    }
  }
}

/**
 * Frosted glass via JavaScript box blur — works on all iOS Safari versions.
 * ctx.filter('blur') is silently ignored pre-iOS 18; bilinear upscaling of a
 * tiny canvas looks blocky. JS box blur on a 240px canvas is ~3 ms on mobile
 * and produces genuinely smooth data before upscaling.
 */
function drawFrostedBg(ctx, source, canvasW, canvasH, blurAmount, cache) {
  const srcW = source.videoWidth ?? source.naturalWidth ?? canvasW
  const srcH = source.videoHeight ?? source.naturalHeight ?? canvasH
  const longest = Math.max(canvasW, canvasH)

  // 240px on the longest side — good quality/speed balance (8× upscale max)
  const SMALL = 240
  const scale = SMALL / longest
  const sw = Math.max(4, Math.round(canvasW * scale))
  const sh = Math.max(4, Math.round(canvasH * scale))

  if (!cache.frost) cache.frost = document.createElement('canvas')
  if (cache.frost.width !== sw || cache.frost.height !== sh) {
    cache.frost.width = sw; cache.frost.height = sh
  }
  const fc = cache.frost.getContext('2d')
  fc.imageSmoothingEnabled = true; fc.imageSmoothingQuality = 'high'

  // Cover-fill source into working canvas
  const cs = Math.max(sw / srcW, sh / srcH)
  fc.drawImage(source, (sw - srcW * cs) / 2, (sh - srcH * cs) / 2, srcW * cs, srcH * cs)

  // 3 box-blur passes ≈ Gaussian; radius scales with blurAmount
  const r = Math.max(2, Math.round(3 + (blurAmount - 10) * 9 / 110))
  const id = fc.getImageData(0, 0, sw, sh)
  boxBlurPass(id.data, sw, sh, r)
  boxBlurPass(id.data, sw, sh, r)
  boxBlurPass(id.data, sw, sh, r)
  fc.putImageData(id, 0, 0)

  // Upscale blurred result to output canvas
  ctx.save()
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
  if ('filter' in ctx) ctx.filter = 'saturate(1.6) brightness(0.85)'
  const pad = Math.round(longest * 0.02)
  ctx.drawImage(cache.frost, -pad, -pad, canvasW + pad * 2, canvasH + pad * 2)
  if ('filter' in ctx) { ctx.filter = 'none' } else {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, 0, canvasW, canvasH)
  }
  ctx.restore()
}

/**
 * Film grain ported from filmgrainer by Lars Pontoppidan (MIT).
 * Gaussian noise blended via soft-light naturally attenuates grain in
 * shadows and highlights just like real film. Multi-scale layers add
 * variability: a sharp fine base + optional smooth medium/coarse clumps.
 */
function applyGrain(ctx, w, h, grainAmount, grainVariability, cache) {
  if (!grainAmount) return
  // σ=30 at 100% matches old 25% feel (old: 25*2.4*0.5=30)
  const sigma = grainAmount * 0.3
  const v = (grainVariability ?? 0) / 100

  const drawLayer = (cacheKey, scale, smooth, alpha) => {
    const nw = Math.max(2, Math.round(w / scale))
    const nh = Math.max(2, Math.round(h / scale))
    if (!cache[cacheKey]) cache[cacheKey] = document.createElement('canvas')
    if (cache[cacheKey].width !== nw || cache[cacheKey].height !== nh) {
      cache[cacheKey].width = nw; cache[cacheKey].height = nh
    }
    const gc = cache[cacheKey].getContext('2d')
    const id = gc.createImageData(nw, nh)
    const d = id.data
    for (let i = 0; i < d.length; i += 4) {
      const u = Math.random() || 1e-10
      const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * Math.random())
      const val = Math.max(0, Math.min(255, Math.round(128 + n * sigma)))
      d[i] = d[i + 1] = d[i + 2] = val; d[i + 3] = 255
    }
    gc.putImageData(id, 0, 0)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.globalCompositeOperation = 'soft-light'
    ctx.imageSmoothingEnabled = smooth
    if (smooth) ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(cache[cacheKey], 0, 0, w, h)
    ctx.restore()
  }

  drawLayer('grain4', 4, false, 1.0)                                     // fine, sharp, always
  if (v > 0) drawLayer('grain10', 10, true, v * 0.65)                   // medium, smooth
  if (v > 0.4) drawLayer('grain22', 22, true, (v - 0.4) / 0.6 * 0.45) // coarse, smooth
}

/**
 * Core render. The border is added AROUND the scaled media so it is
 * always uniform on all four sides, regardless of aspect ratio.
 */
function renderFrame(canvas, source, settings, cache) {
  if (!canvas || !source) return
  const { borderThickness, bgMode, blurAmount = 60, cornerRadius, cropSquare,
          cropOffsetX = 0.5, cropOffsetY = 0.5,
          showMedia = true, grainAmount = 0, grainVariability = 0 } = settings

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

  // 2. Grain on background (drawn before media so it stays in the border/mat)
  applyGrain(ctx, totalW, totalH, grainAmount, grainVariability, cache)

  // 3. Media with corner radius clipping (skipped when showMedia is off)
  if (showMedia) {
    const rx = cornerRadius > 0 ? Math.min(scaledW, scaledH) / 2 * (cornerRadius / 400) : 0

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
      const cropLeft = Math.round(cropOffsetX * (srcW - side))
      const cropTop  = Math.round(cropOffsetY * (srcH - side))
      ctx.drawImage(source, cropLeft, cropTop, side, side,
                    offsetX, offsetY, scaledW, scaledH)
    } else {
      ctx.drawImage(source, 0, 0, srcW, srcH, offsetX, offsetY, scaledW, scaledH)
    }
    ctx.restore()
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const BorderCanvas = forwardRef(function BorderCanvas({ media, settings, onUpdate }, ref) {
  const canvasRef    = useRef(null)
  const sourceRef    = useRef(null)
  const settingsRef  = useRef(settings)
  const mediaRef     = useRef(media)
  const onUpdateRef  = useRef(onUpdate)
  const animFrameRef = useRef(null)
  const cacheRef     = useRef({})
  const dragRef      = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [ready, setReady] = useState(false)

  settingsRef.current = settings
  mediaRef.current    = media
  onUpdateRef.current = onUpdate

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

  // ── Drag-to-reframe (crop square only) ───────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    const s = settingsRef.current
    if (!s.cropSquare) return
    const source = sourceRef.current
    if (!source) return

    const srcW = source.videoWidth ?? source.naturalWidth ?? source.width ?? 1
    const srcH = source.videoHeight ?? source.naturalHeight ?? source.height ?? 1
    if (srcW === srcH) return  // perfect square — nothing to drag

    const side = Math.min(srcW, srcH)
    const maxOffsetX = srcW - side
    const maxOffsetY = srcH - side

    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startCropLeft: (s.cropOffsetX ?? 0.5) * maxOffsetX,
      startCropTop:  (s.cropOffsetY ?? 0.5) * maxOffsetY,
      maxOffsetX,
      maxOffsetY,
      side,
      cssWidth: e.currentTarget.getBoundingClientRect().width,
    }
  }, [])

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current
    if (!drag) return

    const { borderThickness = 40 } = settingsRef.current
    // 1 CSS px → source image px:
    // canvas logical width = OUT_SIZE + 2*border; media occupies OUT_SIZE of that
    // side source px displayed across OUT_SIZE logical px across drag.cssWidth CSS px
    const srcPxPerCSSPx = drag.side * (OUT_SIZE + borderThickness * 2) / (OUT_SIZE * drag.cssWidth)

    const newLeft = Math.max(0, Math.min(drag.maxOffsetX,
      drag.startCropLeft - (e.clientX - drag.startX) * srcPxPerCSSPx))
    const newTop  = Math.max(0, Math.min(drag.maxOffsetY,
      drag.startCropTop  - (e.clientY - drag.startY) * srcPxPerCSSPx))

    onUpdateRef.current?.('cropOffsetX', drag.maxOffsetX > 0 ? newLeft / drag.maxOffsetX : 0.5)
    onUpdateRef.current?.('cropOffsetY', drag.maxOffsetY > 0 ? newTop  / drag.maxOffsetY : 0.5)
  }, [])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
  }, [])

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

  const canDrag = settings.cropSquare
  return (
    <div
      className="border-canvas"
      style={canDrag ? { cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' } : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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

export default BorderCanvas
