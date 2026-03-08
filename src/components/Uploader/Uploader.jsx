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
    onMediaLoaded({
      url,
      type: isImage ? 'image' : 'video',
      file,
    })
  }, [onMediaLoaded])

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    processFile(file)
    // reset input so the same file can be re-selected
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    processFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  return (
    <div className="uploader">
      <div
        className={`uploader__drop${dragging ? ' uploader__drop--active' : ''} clay clay--strong`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label="Tap to choose a photo or video"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <div className="uploader__icon" aria-hidden="true">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="18" fill="url(#ug)"/>
            <path d="M28 18v12m0 0l-5-5m5 5l5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="14" y="34" width="28" height="4" rx="2" fill="white" fillOpacity="0.5"/>
            <defs>
              <linearGradient id="ug" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#c084fc"/>
                <stop offset="100%" stopColor="#6366f1"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <p className="uploader__title">Add a photo or video</p>
        <p className="uploader__subtitle">Tap to choose from your library</p>
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
        {['Border styles', 'Corner radius', 'Square crop', 'Save to Photos'].map(f => (
          <span key={f} className="uploader__feature-chip">{f}</span>
        ))}
      </div>
    </div>
  )
}
