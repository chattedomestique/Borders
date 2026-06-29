// Export pipeline — image (canvas.toBlob) and video (MediaRecorder) with Web
// Share fallback to download. Framework-agnostic: takes the live canvas, the
// media source, and the refs/loop controls the renderer owns.
import { renderFrame } from './render.js'

/**
 * Save the current composite. For video, records a re-rendered MediaRecorder
 * stream from t=0 to the end, re-attaching audio; for images, exports a PNG.
 * Shares via the Web Share API when files are shareable, else downloads.
 *
 * @returns {Promise<void>} resolves when the save/share finishes.
 */
export function saveMedia({ canvas, source, mediaType, settingsRef, cacheRef, geoRef, startLoop, stopLoop, onProgress }) {
  if (!canvas) return Promise.resolve()

  // ── Video ────────────────────────────────────────────────────────────
  if (mediaType === 'video' && source) {
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
          renderFrame(canvas, source, settingsRef.current, cacheRef.current, geoRef, null)
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
  return (async () => {
    // Render a fresh, overlay-free frame to an offscreen canvas so on-canvas
    // editing aids (selection box, grid) can never bake into the export. The
    // visible canvas — which may carry a selection box — is left untouched.
    const exportCanvas = document.createElement('canvas')
    renderFrame(exportCanvas, source, settingsRef.current, cacheRef.current, geoRef, null, null)
    const blob = await new Promise(resolve => exportCanvas.toBlob(resolve, 'image/png'))
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
  })()
}
