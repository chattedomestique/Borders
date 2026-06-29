import { useState, useRef, useCallback, useEffect } from 'react'
import { useSettings } from '../../state/settingsStore.js'
import Uploader from '../uploader/Uploader.jsx'
import Canvas from '../editor/Canvas.jsx'
import Controls from '../controls/Controls.jsx'
import Header from './Header.jsx'
import GestureHint from './GestureHint.jsx'
import Panel from '../../ui/Panel/Panel.jsx'
import Toolbar from '../../ui/Toolbar/Toolbar.jsx'
import Icon from '../../ui/Icon/Icon.jsx'
import './AppShell.css'

const STEPS = { UPLOAD: 'upload', EDIT: 'edit', SAVING: 'saving' }

const TABS = [
  { id: 'frame', label: 'Frame', icon: 'frame' },
  { id: 'bg',    label: 'Fill',  icon: 'fill'  },
  { id: 'grain', label: 'Grain', icon: 'grain' },
  { id: 'text',  label: 'Text',  icon: 'text'  },
]

/**
 * Editor orchestrator: owns the genuinely UI-level state (step, media, active
 * tab, selection, view + pick modes) and lays out the shell. All settings flow
 * through the SettingsContext, so there is no settings prop-drilling here.
 */
export default function AppShell() {
  const { reset, addLayer, removeLayer, pickColor, undo, redo, textLayers = [] } = useSettings()

  const [step, setStep] = useState(STEPS.UPLOAD)
  const [media, setMedia] = useState(null)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [pickMode, setPickMode] = useState(false)
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [activeTab, setActiveTab] = useState(null)
  const [viewMode, setViewMode] = useState('fit')
  const [showHint, setShowHint] = useState(false)
  const canvasRef = useRef(null)
  const appRef = useRef(null)
  const overlayRef = useRef(null)

  // Track the live height of the bottom overlay (toolbar + any open panel) and
  // expose it as --overlay-h so the canvas reserves exactly that much space and
  // the controls never cover the part of the image being edited.
  useEffect(() => {
    const el = overlayRef.current
    const root = appRef.current
    if (!el || !root) return
    const ro = new ResizeObserver(entries => {
      root.style.setProperty('--overlay-h', `${Math.round(entries[0].contentRect.height)}px`)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [step, media])

  const dismissHint = useCallback(() => {
    setShowHint(false)
    sessionStorage.setItem('bs-hint-seen', '1')
  }, [])

  // Auto-dismiss the gesture hint; the CSS animation handles the visual fade.
  useEffect(() => {
    if (!showHint) return
    const t = setTimeout(dismissHint, 2800)
    return () => clearTimeout(t)
  }, [showHint, dismissHint])

  const handleMediaLoaded = useCallback((mediaObj) => {
    setMedia(mediaObj)
    reset()
    setSelectedLayerId(null)
    setActiveTab(null)
    setStep(STEPS.EDIT)
    if (!sessionStorage.getItem('bs-hint-seen')) setShowHint(true)
  }, [reset])

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

  const handleAddLayer = useCallback(() => {
    // Reuse an existing blank layer instead of stacking up "Empty" chips.
    const blank = textLayers.find(l => !l.content.trim())
    setSelectedLayerId(blank ? blank.id : addLayer())
  }, [addLayer, textLayers])

  const handleRemoveLayer = useCallback((id) => {
    removeLayer(id)
    setSelectedLayerId(prev => prev === id ? null : prev)
  }, [removeLayer])

  const handlePickColor = useCallback((hex) => {
    pickColor(hex)
    setPickMode(false)
  }, [pickColor])

  const toggleTab = useCallback((id) => {
    setActiveTab(prev => prev === id ? null : id)
  }, [])

  // Keyboard undo/redo (desktop / hardware keyboards)
  useEffect(() => {
    if (step === STEPS.UPLOAD) return
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) redo(); else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, undo, redo])

  const saving = step === STEPS.SAVING

  return (
    <div className="app" ref={appRef}>
      <Header
        editing={step !== STEPS.UPLOAD}
        viewMode={viewMode}
        onToggleView={() => setViewMode(v => v === 'fit' ? 'fill' : 'fit')}
        onReset={handleReset}
      />

      <main className="app__main">
        {step === STEPS.UPLOAD ? (
          <div className="app__upload">
            <Uploader onMediaLoaded={handleMediaLoaded} />
          </div>
        ) : media ? (
          <div className={`app__canvas-wrap${viewMode === 'fit' ? ' app__canvas-wrap--fit' : ''}`}>
            <Canvas
              ref={canvasRef}
              media={media}
              pickMode={pickMode}
              onPickColor={handlePickColor}
              onSelectLayer={setSelectedLayerId}
            />
          </div>
        ) : null}
      </main>

      {/* Gesture hint — shown once per session after first image load */}
      {showHint && <GestureHint />}

      {/* Frosted glass overlay — direct child of .app so absolute bottom:0 is viewport bottom */}
      {step !== STEPS.UPLOAD && media && (
        <div className="app__overlay" ref={overlayRef}>
          <Panel open={!!activeTab}>
            <Controls
              tab={activeTab}
              pickMode={pickMode}
              onPickMode={() => setPickMode(p => !p)}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onAddLayer={handleAddLayer}
              onRemoveLayer={handleRemoveLayer}
            />
          </Panel>

          <Toolbar tabs={TABS} active={activeTab} onTab={toggleTab}>
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
                  <Icon name="save" />
                  <span>Save</span>
                </>
              )}
            </button>
          </Toolbar>
        </div>
      )}
    </div>
  )
}
