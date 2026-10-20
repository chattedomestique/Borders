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
      {/* The whole card is the button: a native <button> (Space and Enter come
          free), drawn as a pressable card — it lifts on hover and focus, which in
          the house rules is what says "you can press this". */}
      <button type="button"
        className={`card uploader__drop${dragging ? ' uploader__drop--active' : ''}`}
        onClick={() => !decoding && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        aria-busy={decoding || undefined}
      >
        {decoding ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <p className="card__title" role="status">Reading photo</p>
            <p className="card__text">Getting it ready for editing</p>
          </>
        ) : (
          <>
            <span className="uploader__icon"><span className="ic ic--image" aria-hidden="true" /></span>
            <p className="card__title">Frame your photos.</p>
            <p className="card__text">Tap to choose a photo or video</p>
          </>
        )}
      </button>

      {error && (
        <p className="uploader__error" role="alert">
          <span className="ic ic--circle-alert" aria-hidden="true" /><span>{error}</span>
        </p>
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

      <ul className="uploader__features" role="list" aria-label="What you can do">
        {['Borders and color from your photo', 'Grain, highlights and text', 'Save straight to Photos'].map(f => (
          <li key={f} className="t-meta">{f}</li>
        ))}
      </ul>

      <p className="uploader__buildstamp t-mono" aria-label={`Build ${__BUILD_ID__}`}>{__BUILD_ID__}</p>
    </div>
  )
}
