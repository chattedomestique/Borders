import { useRef, useState, useCallback } from 'react'
import Icon from '../../ui/Icon/Icon.jsx'
import './Uploader.css'

const ACCEPT = 'image/*,video/*'
const MAX_SIZE_MB = 200

const FEATURES = ['Borders & grain', 'Custom type', 'Pinch to zoom', 'Save to Photos']

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
      <header className="uploader__hero">
        <span className="uploader__eyebrow">Border Studio</span>
        <h1 className="uploader__title">Frame your<br />photos &amp; video.</h1>
        <p className="uploader__lede">Borders, grain and type — then save straight to your camera roll.</p>
      </header>

      <div
        className={`uploader__drop${dragging ? ' uploader__drop--active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label="Choose a photo or video"
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      >
        <span className="uploader__glow" aria-hidden="true" />
        <Icon name="frameLarge" size={56} className="uploader__frame-icon" />
        <p className="uploader__drop-title">Drop a photo or video</p>
        <p className="uploader__drop-sub">or tap to browse your library</p>
        <span className="uploader__cta">Choose file</span>
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
        {FEATURES.map(f => (
          <span key={f} className="uploader__feature-chip">{f}</span>
        ))}
      </div>
    </div>
  )
}
