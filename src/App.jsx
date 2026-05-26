import { useState, useRef, useCallback } from 'react'
import Uploader from './components/Uploader/Uploader'
import BorderCanvas from './components/BorderCanvas/BorderCanvas'
import Controls from './components/Controls/Controls'
import SaveButton from './components/SaveButton/SaveButton'
import './App.css'

const STEPS = { UPLOAD: 'upload', EDIT: 'edit', SAVING: 'saving' }

const DEFAULT_LAYER = (id, index = 0) => ({
  id,
  content: '',
  font: 'system-ui, -apple-system, sans-serif',
  size: 80,
  color: '#ffffff',
  align: 'center',
  x: 0.5,
  y: Math.min(0.88, 0.4 + index * 0.18),
  bold: false,
  italic: false,
  opacity: 100,
  shadow: false,
  stroke: false,
  strokeColor: '#000000',
  letterSpacing: 0,
  bg: 'none',
  bgColor: '#000000',
  bgOpacity: 50,
})

const DEFAULT_SETTINGS = {
  borderThickness: 40,
  bgMode: 'average',
  bgColor: '#ffffff',
  blurAmount: 60,
  cornerRadius: 0,
  cropSquare: false,
  zoom: 1,
  panX: 0.5,
  panY: 0.5,
  showMedia: true,
  grainAmount: 0,
  grainVariability: 0,
  textLayers: [],
}

export default function App() {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [media, setMedia] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [pickMode, setPickMode] = useState(false)
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const canvasRef = useRef(null)

  const handleMediaLoaded = useCallback((mediaObj) => {
    setMedia(mediaObj)
    setSettings(DEFAULT_SETTINGS)
    setSelectedLayerId(null)
    setStep(STEPS.EDIT)
  }, [])

  const handleReset = useCallback(() => {
    setMedia(prev => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return null
    })
    setSelectedLayerId(null)
    setStep(STEPS.UPLOAD)
  }, [])

  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return
    setStep(STEPS.SAVING)
    setRecordingProgress(0)
    try {
      await canvasRef.current.save(setRecordingProgress)
    } finally {
      setStep(STEPS.EDIT)
      setRecordingProgress(0)
    }
  }, [])

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const addTextLayer = useCallback(() => {
    const id = `text-${Date.now()}`
    setSettings(prev => ({
      ...prev,
      textLayers: [...prev.textLayers, DEFAULT_LAYER(id, prev.textLayers.length)],
    }))
    setSelectedLayerId(id)
  }, [])

  const removeTextLayer = useCallback((id) => {
    setSettings(prev => ({ ...prev, textLayers: prev.textLayers.filter(l => l.id !== id) }))
    setSelectedLayerId(prev => (prev === id ? null : prev))
  }, [])

  const updateTextLayer = useCallback((id, key, value) => {
    setSettings(prev => ({
      ...prev,
      textLayers: prev.textLayers.map(l => l.id === id ? { ...l, [key]: value } : l),
    }))
  }, [])

  const handlePickColor = useCallback((hex) => {
    setSettings(prev => ({ ...prev, bgColor: hex, bgMode: 'color' }))
    setPickMode(false)
  }, [])

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-inner">
          <div className="app__logo" aria-label="Border Studio">
            <svg className="app__logo-icon" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2.5"/>
              <rect x="6" y="6" width="10" height="10" rx="2.5" fill="currentColor"/>
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
                onUpdate={updateSetting}
                pickMode={pickMode}
                onPickColor={handlePickColor}
                selectedLayerId={selectedLayerId}
                onSelectLayer={setSelectedLayerId}
                onUpdateLayer={updateTextLayer}
              />
            </section>

            <Controls
              settings={settings}
              onUpdate={updateSetting}
              mediaType={media.type}
              pickMode={pickMode}
              onPickMode={() => setPickMode(p => !p)}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onAddLayer={addTextLayer}
              onRemoveLayer={removeTextLayer}
              onUpdateLayer={updateTextLayer}
            />

            <SaveButton
              onSave={handleSave}
              saving={step === STEPS.SAVING}
              mediaType={media.type}
              progress={recordingProgress}
            />
          </>
        )}
      </main>
    </div>
  )
}
