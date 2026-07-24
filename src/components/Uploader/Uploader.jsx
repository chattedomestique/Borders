import { useRef, useState, useCallback } from 'react'
import { downscaleImageFile } from '../../media'
import './Uploader.css'

const ACCEPT = 'image/*,video/*'
const MAX_SIZE_MB = 200

export default function Uploader({ onMediaLoaded, initialError = null }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(initialError)
  const [decoding, setDecoding] = useState(false)

  const processFile = useCallback(async (file) => {
    setError(null)
    if (!file) return

    // §4.4 stage 1 — pick-time validation (synchronous).
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`That file is too large (max ${MAX_SIZE_MB} MB).`)
      return
    }
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      setError("That doesn't look like a photo or video.")
      return
    }

    if (isVideo) {
      onMediaLoaded({ url: URL.createObjectURL(file), type: 'video', file })
      return
    }

    // §4.4 stage 2 — decode-time validation (async). Downscaling forces the
    // decode now, so a bad/HEIC-off-Safari file fails here into a visible error
    // instead of an infinite spinner downstream.
    setDecoding(true)
    try {
      const blob = await downscaleImageFile(file)
      onMediaLoaded({ url: URL.createObjectURL(blob), type: 'image', file })
    } catch {
      setError("Couldn't read that image. HEIC files only open in Safari.")
    } finally {
      setDecoding(false)
    }
  }, [onMediaLoaded])

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files?.[0])
  }

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  return (
    <div className="uploader">
      <div
        className={`uploader__drop${dragging ? ' uploader__drop--active' : ''}${decoding ? ' uploader__drop--busy' : ''}`}
        onClick={() => !decoding && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-busy={decoding}
        aria-label="Tap to choose a photo or video"
        onKeyDown={(e) => e.key === 'Enter' && !decoding && inputRef.current?.click()}
      >
        {decoding ? (
          <>
            <span className="uploader__spinner" aria-hidden="true" />
            <p className="uploader__title" role="status">Reading photo…</p>
            <p className="uploader__subtitle">Optimizing for your device</p>
          </>
        ) : (
          <>
            <svg className="uploader__frame-icon" width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="1.75"/>
              <rect x="9" y="9" width="26" height="26" rx="4" stroke="currentColor" strokeWidth="1.25" opacity="0.45"/>
            </svg>
            <p className="uploader__title">Frame your photos.</p>
            <p className="uploader__subtitle">Tap to choose · photos &amp; video</p>
          </>
        )}
      </div>

      {error && (
        <p className="uploader__error" role="alert">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="uploader__input"
        onChange={handleInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="uploader__buildstamp" aria-label={`Build ${__BUILD_ID__}`}>{__BUILD_ID__}</div>

      <div className="uploader__features">
        {['Border & grain', 'Custom text', 'Pinch to zoom', 'Save to Photos'].map(f => (
          <span key={f} className="uploader__feature-chip">{f}</span>
        ))}
      </div>
    </div>
  )
}
