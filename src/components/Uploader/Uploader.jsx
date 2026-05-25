import { useRef, useState, useCallback } from 'react'
import './Uploader.css'

const ACCEPT = 'image/*,video/*'
const MAX_SIZE_MB = 200

export default function Uploader({ onMediaLoaded }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  const processFile = useCallback((file) => {
    setError(null)
    if (!file) return

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_SIZE_MB}MB.`)
      return
    }

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      setError('Please upload an image or video file.')
      return
    }

    const url = URL.createObjectURL(file)
    onMediaLoaded({ url, type: isImage ? 'image' : 'video', file })
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
        className={`uploader__drop${dragging ? ' uploader__drop--active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label="Tap to choose a photo or video"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <svg className="uploader__frame-icon" width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="1.75"/>
          <rect x="9" y="9" width="26" height="26" rx="4" stroke="currentColor" strokeWidth="1.25" opacity="0.45"/>
        </svg>
        <p className="uploader__title">Frame your photos.</p>
        <p className="uploader__subtitle">Tap to choose · photos &amp; video</p>
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

      <div className="uploader__features">
        {['Border & grain', 'Custom text', 'Pinch to zoom', 'Save to Photos'].map(f => (
          <span key={f} className="uploader__feature-chip">{f}</span>
        ))}
      </div>
    </div>
  )
}
