import { useState, useRef, useCallback } from 'react'
import Uploader from './components/Uploader/Uploader'
import BorderCanvas from './components/BorderCanvas/BorderCanvas'
import Controls from './components/Controls/Controls'
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
  bold: false, italic: false, opacity: 100,
  shadow: false, stroke: false, strokeColor: '#000000',
  letterSpacing: 0, bg: 'none', bgColor: '#000000', bgOpacity: 50,
})

const DEFAULT_SETTINGS = {
  borderThickness: 40,
  bgMode: 'average',
  bgColor: '#ffffff',
  blurAmount: 60,
  cornerRadius: 0,
  cropSquare: false,
  zoom: 1, panX: 0.5, panY: 0.5,
  showMedia: true,
  grainAmount: 0, grainVariability: 0,
  textLayers: [],
}

const TABS = [
  {
    id: 'frame', label: 'Frame',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.75"/>
        <rect x="6" y="6" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: 'bg', label: 'BG',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.75"/>
        <path d="M2 12 C6 7 9 13 12 9 C14 6.5 17 11 18 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'grain', label: 'Grain',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="4.5" cy="4.5" r="1.3" fill="currentColor"/>
        <circle cx="10"  cy="3"   r="1"   fill="currentColor" opacity="0.5"/>
        <circle cx="15.5" cy="5" r="1.3"  fill="currentColor"/>
        <circle cx="3"   cy="10" r="1"    fill="currentColor" opacity="0.5"/>
        <circle cx="9"   cy="9.5" r="1.6" fill="currentColor"/>
        <circle cx="15"  cy="10" r="1.1"  fill="currentColor" opacity="0.7"/>
        <circle cx="5.5" cy="15.5" r="1.3" fill="currentColor"/>
        <circle cx="11"  cy="14.5" r="1"  fill="currentColor" opacity="0.5"/>
        <circle cx="16"  cy="15.5" r="1.3" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'text', label: 'Type',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 5h12"  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M10 5v10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M7 15h6"  stroke="currentColor" strokeWidth="1.5"  strokeLinecap="round" opacity="0.55"/>
      </svg>
    ),
  },
]

export default function App() {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [media, setMedia] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [pickMode, setPickMode] = useState(false)
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [activeTab, setActiveTab] = useState(null)
  const canvasRef = useRef(null)

  const handleMediaLoaded = useCallback((mediaObj) => {
    setMedia(mediaObj)
    setSettings(DEFAULT_SETTINGS)
    setSelectedLayerId(null)
    setActiveTab(null)
    setStep(STEPS.EDIT)
  }, [])

  const handleReset = useCallback(() => {
    setMedia(prev => { if (prev?.url) URL.revokeObjectURL(prev.url); return null })
    setSelectedLayerId(null)
    setActiveTab(null)
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
    setSelectedLayerId(prev => prev === id ? null : prev)
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

  const toggleTab = useCallback((id) => {
    setActiveTab(prev => prev === id ? null : id)
  }, [])

  const saving = step === STEPS.SAVING

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
            <button className="app__reset-btn" onClick={handleReset} aria-label="Start over">
              New
            </button>
          )}
        </div>
      </header>

      <main className="app__main">
        {step === STEPS.UPLOAD ? (
          <div className="app__upload">
            <Uploader onMediaLoaded={handleMediaLoaded} />
          </div>
        ) : media ? (
          <div className="app__edit">
            {/* Canvas fills all available space */}
            <div className="app__canvas-wrap">
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
            </div>

            {/* Frosted glass overlay — slides up from bottom */}
            <div className="app__overlay">
              {/* Sliding controls panel */}
              <div className={`app__panel${activeTab ? ' app__panel--open' : ''}`}>
                <Controls
                  tab={activeTab}
                  settings={settings}
                  onUpdate={updateSetting}
                  pickMode={pickMode}
                  onPickMode={() => setPickMode(p => !p)}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={setSelectedLayerId}
                  onAddLayer={addTextLayer}
                  onRemoveLayer={removeTextLayer}
                  onUpdateLayer={updateTextLayer}
                />
              </div>

              {/* Toolbar — always visible */}
              <div className="app__toolbar">
                <div className="app__toolbar-tabs">
                  {TABS.map(t => (
                    <button
                      key={t.id}
                      className={`app__toolbar-tab${activeTab === t.id ? ' app__toolbar-tab--active' : ''}`}
                      onClick={() => toggleTab(t.id)}
                      aria-pressed={activeTab === t.id}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  className={`app__toolbar-save${saving ? ' app__toolbar-save--saving' : ''}`}
                  onClick={handleSave}
                  disabled={saving}
                  aria-label="Save to Photos"
                >
                  {saving ? (
                    <>
                      <span className="app__toolbar-save-spinner"/>
                      <span>{recordingProgress > 0 ? `${Math.round(recordingProgress * 100)}%` : '…'}</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
