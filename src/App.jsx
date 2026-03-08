import { useState, useRef, useCallback } from 'react'
import Uploader from './components/Uploader/Uploader'
import BorderCanvas from './components/BorderCanvas/BorderCanvas'
import Controls from './components/Controls/Controls'
import SaveButton from './components/SaveButton/SaveButton'
import './App.css'

const STEPS = { UPLOAD: 'upload', EDIT: 'edit', SAVING: 'saving' }

const DEFAULT_SETTINGS = {
  borderThickness: 40,   // px in output space (0–200)
  bgMode: 'average',     // 'average' | 'contrast' | 'complementary' | 'frosted'
  cornerRadius: 0,       // 0–100 (percent of half the shorter side)
  cropSquare: false,
}

export default function App() {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [media, setMedia] = useState(null)  // { url, type: 'image'|'video', file }
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const canvasRef = useRef(null)

  const handleMediaLoaded = useCallback((mediaObj) => {
    setMedia(mediaObj)
    setSettings(DEFAULT_SETTINGS)
    setStep(STEPS.EDIT)
  }, [])

  const handleReset = useCallback(() => {
    setMedia(null)
    setStep(STEPS.UPLOAD)
  }, [])

  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return
    setStep(STEPS.SAVING)
    try {
      await canvasRef.current.save()
    } finally {
      setStep(STEPS.EDIT)
    }
  }, [])

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div className="app">
      <header className="app__header clay clay--strong">
        <div className="app__header-inner">
          <div className="app__logo" aria-label="Border Studio">
            <svg className="app__logo-icon" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <rect x="1" y="1" width="20" height="20" rx="4" fill="none" stroke="url(#lg)" strokeWidth="3"/>
              <rect x="6" y="6" width="10" height="10" rx="2" fill="url(#lg)"/>
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#c084fc"/>
                  <stop offset="100%" stopColor="#6366f1"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="app__logo-text">Border Studio</span>
          </div>
          {step !== STEPS.UPLOAD && (
            <button
              className="app__reset-btn"
              onClick={handleReset}
              aria-label="Start over with a new photo"
            >
              New
            </button>
          )}
        </div>
      </header>

      <main className="app__main">
        {step === STEPS.UPLOAD && (
          <Uploader onMediaLoaded={handleMediaLoaded} />
        )}

        {step !== STEPS.UPLOAD && media && (
          <>
            <section className="app__canvas-wrap" aria-label="Preview">
              <BorderCanvas
                ref={canvasRef}
                media={media}
                settings={settings}
              />
            </section>

            <Controls
              settings={settings}
              onUpdate={updateSetting}
              mediaType={media.type}
            />

            <SaveButton
              onSave={handleSave}
              saving={step === STEPS.SAVING}
              mediaType={media.type}
            />
          </>
        )}
      </main>
    </div>
  )
}
