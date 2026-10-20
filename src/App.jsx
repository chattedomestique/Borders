import { useState, useRef, useCallback, useEffect } from 'react'
import Uploader from './components/Uploader/Uploader'
import BorderCanvas from './components/BorderCanvas/BorderCanvas'
import Controls from './components/Controls/Controls'
import { useHistory } from './useHistory'
import { buildSuggestionsFromColor } from './palette'
import { saveSettings, seedForNewMedia, loadSettings, loadPresets, savePreset, deletePreset, applyPresetLook } from './persist'
import PresetSheet from './components/PresetSheet/PresetSheet'
import { Icon, Segmented } from './components/ui'
import { useModalDialog } from './components/useModalDialog'
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
  shadow: false, stroke: false, strokeColor: '#000000', strokeWidth: 35,
  letterSpacing: 0, wordSpacing: 0, lineHeight: 1.3, bg: 'none', bgColor: '#000000', bgOpacity: 50,
  boxSize: 'auto', boxWidth: 100, boxHeight: 100,
  motionBlur: false, motionAngle: 0, motionLength: 60, motionSpeed: 60,
  trailGrain: 0, trailGrainSize: 30, trailGrainVariability: 0, trailGrainMono: true,
  trailGrainSpread: 0, trailGrainDissolve: false,
  echo: false, echoCount: 5, echoAngle: 0, echoSpacing: 40, echoGhosting: 60,
  echoBlur: 0, echoZoom: 0, echoSpin: 0, echoHue: 0, echoBlend: 'stack', echoEase: 50,
  blobStroke: false, blobDistance: 40, blobCurve: 30, blobColor: '#000000',
  blobGrain: 0, blobGrainSize: 30, blobGrainRough: 0, blobGrainMono: true, blobGrainDissolve: false,
})

const DEFAULT_SETTINGS = {
  borderThickness: 150,          // a generous default frame
  bgMode: 'average',
  bgColor: '#ffffff',
  blurAmount: 60,
  frostBrightness: -15, frostContrast: 0, frostSaturation: 60, frostVibrance: 0,
  cornerRadius: 0,
  cropRatio: '9:16',             // vertical 16:9 (story) by default
  aspectMode: 'crop',   // 'crop' = trim photo to ratio · 'fit' = matte photo into ratio
  zoom: 1, panX: 0.5, panY: 0.5,
  showMedia: true,
  grainAmount: 0, grainVariability: 0, grainMonochrome: true, grainSpread: 0,
  textLayers: [],
  highlightLayers: [],
}

// A highlighter mark. Defaults are a classic chisel-tip yellow on multiply —
// the only blend that behaves like real transparent ink over paper.
const DEFAULT_HIGHLIGHT = (id, index = 0) => ({
  id,
  x: 0.5, y: Math.min(0.85, 0.42 + index * 0.13),
  w: 0.62, h: 0.075, angle: 0,
  color: '#ffe14d', opacity: 85, blend: 'multiply',
  edge: 'marker', edgeAmount: 45,
  grain: 0, grainSize: 30, grainVariability: 0, grainMono: true, grainDissolve: false,
  texture: 'none', risoScale: 40, risoAngle: 45, risoOffset: 30,
})

// The editor's tools. Each is a style-guide mask on its 24px grid; Grain and
// Mark are drawn here (index.css) because the icon set has no film grain or
// highlighter.
const TABS = [
  { id: 'frame', label: 'Frame', icon: 'crop' },
  { id: 'bg',    label: 'Fill',  icon: 'droplet' },
  { id: 'grain', label: 'Grain', icon: 'grain' },
  { id: 'mark',  label: 'Mark',  icon: 'highlighter' },
  { id: 'text',  label: 'Text',  icon: 'type' },
]

// Starting over: the style guide's confirm dialog — a card on a native
// <dialog>, so the page behind is inert and Esc / a backdrop tap cancel. The
// safe choice (keep what you built) is the primary one and takes focus.
function NewChoiceDialog({ open, onClose, onChoose }) {
  const ref = useModalDialog(open, onClose)
  return (
    <dialog ref={ref} className="dialog card" data-size="sm"
      aria-labelledby="new-photo-t" aria-describedby="new-photo-d">
      <header className="card__bar">
        <p className="card__label">New photo</p>
        <button className="card__ctl" type="button" onClick={onClose} aria-label="Cancel">
          <Icon name="close" />
        </button>
      </header>
      <div className="card__body">
        <h2 className="card__title" id="new-photo-t">Start a new photo</h2>
        <p className="card__text" id="new-photo-d">
          Keep your border, colors, text and effects for the next photo, or start clean.
        </p>
      </div>
      <div className="dialog__actions">
        <button className="btn" type="button" onClick={() => onChoose('default')}>Reset to defaults</button>
        <button className="btn" type="button" data-variant="primary" autoFocus
          onClick={() => onChoose('full')}>Keep my settings</button>
      </div>
    </dialog>
  )
}

export default function App() {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [media, setMedia] = useState(null)
  const { settings, set: setSettings, undo, redo, reset: resetHistory, canUndo, canRedo } = useHistory(DEFAULT_SETTINGS)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [pickMode, setPickMode] = useState(false)
  const [toast, setToast] = useState(null)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [presets, setPresets] = useState(() => loadPresets())
  const [newChoiceOpen, setNewChoiceOpen] = useState(false)
  const nextSeedRef = useRef(null)   // 'full' | 'default' | null (frame-only) for the next photo
  const [mediaError, setMediaError] = useState(null)
  const [borderSuggestions, setBorderSuggestions] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [selectedHighlightId, setSelectedHighlightId] = useState(null)
  const [activeTab, setActiveTab] = useState(null)
  const [frameSub, setFrameSub] = useState('border')
  const [viewMode, setViewMode] = useState('fit')
  const [showHint, setShowHint] = useState(false)
  const [snapEnabled, setSnapEnabled] = useState(() => {
    try { return localStorage.getItem('bs-snap') !== '0' } catch { return true }
  })
  const [gridDivisions, setGridDivisions] = useState(() => {
    try { return Number(localStorage.getItem('bs-grid')) || 3 } catch { return 3 }
  })
  const canvasRef = useRef(null)
  const toolsRef = useRef(null)
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
      // The BORDER box: the overlay has a top rule and safe-area padding, and
      // contentRect leaves both out — on a phone with a home indicator that put
      // the bottom ~36px of the photo under the dock.
      const box = entries[0].borderBoxSize?.[0]
      const h = `${Math.round(box ? box.blockSize : el.getBoundingClientRect().height)}px`
      root.style.setProperty('--overlay-h', h)
      // Also on :root — portalled overlays (the parameter picker) live outside
      // .app and would otherwise fall back to a wrong default and overrun the dock.
      document.documentElement.style.setProperty('--overlay-h', h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [step, media])

  useEffect(() => { try { localStorage.setItem('bs-snap', snapEnabled ? '1' : '0') } catch { /* ignore */ } }, [snapEnabled])
  useEffect(() => { try { localStorage.setItem('bs-grid', String(gridDivisions)) } catch { /* ignore */ } }, [gridDivisions])

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
    setMediaError(null)
    setMedia(mediaObj)
    setBorderSuggestions([])   // recomputed once the new source decodes
    // Seed mode chosen at "New": keep the full look, reset to defaults, or (the
    // default path) carry only the frame basics.
    const seed = nextSeedRef.current
    nextSeedRef.current = null
    let base
    if (seed === 'full') {
      const saved = loadSettings() || DEFAULT_SETTINGS
      base = { ...saved, zoom: 1, panX: 0.5, panY: 0.5 }   // keep the look, reset transform
    } else if (seed === 'default') {
      base = DEFAULT_SETTINGS
    } else {
      base = seedForNewMedia(DEFAULT_SETTINGS)
    }
    resetHistory(base)
    setSelectedLayerId(null)
    setActiveTab(null)
    setStep(STEPS.EDIT)
    if (!sessionStorage.getItem('bs-hint-seen')) setShowHint(true)
  }, [resetHistory])

  const handleReset = useCallback((seedMode) => {
    nextSeedRef.current = seedMode ?? null
    setMedia(prev => { if (prev?.url) URL.revokeObjectURL(prev.url); return null })
    setSelectedLayerId(null)
    setActiveTab(null)
    setMediaError(null)
    setNewChoiceOpen(false)
    setStep(STEPS.UPLOAD)
  }, [])

  // N6: a decode failure returns to the uploader carrying a visible message,
  // rather than leaving the canvas idle behind a spinner.
  const handleMediaError = useCallback((message) => {
    setMedia(prev => { if (prev?.url) URL.revokeObjectURL(prev.url); return null })
    setSelectedLayerId(null)
    setActiveTab(null)
    setStep(STEPS.UPLOAD)
    setMediaError(message || "Couldn't load that file.")
  }, [])

  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return
    setStep(STEPS.SAVING)
    setRecordingProgress(0)
    try {
      const result = await canvasRef.current.save(setRecordingProgress)
      // §6.3: on iOS a successful share looks like nothing happened — confirm it.
      // "Saved" (not "saved to camera roll", which we can't verify). Dismissing
      // the share sheet (cancelled) is not a save, so it gets no toast.
      if (result?.status === 'shared' || result?.status === 'downloaded') {
        setToast('Saved')
      }
    } finally {
      setStep(STEPS.EDIT)
      setRecordingProgress(0)
    }
  }, [])

  const handleSavePreset = useCallback((name) => {
    savePreset(name, settings)
    setPresets(loadPresets())
    setToast('Preset saved')
  }, [settings])

  const handleLoadPreset = useCallback((preset) => {
    setSettings(prev => applyPresetLook(prev, preset), { immediate: true })
    setPresetsOpen(false)
    setToast('Preset applied')
  }, [setSettings])

  const handleDeletePreset = useCallback((id) => {
    deletePreset(id)
    setPresets(loadPresets())
  }, [])

  const handleApplyLast = useCallback(() => {
    const last = loadSettings()
    if (!last) return
    setSettings(prev => ({ ...last, zoom: prev.zoom, panX: prev.panX, panY: prev.panY }), { immediate: true })
    setPresetsOpen(false)
    setToast('Last look applied')
  }, [setSettings])

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [setSettings])

  // `sourceId` clones an existing layer's settings (everything but its identity,
  // its words, and its exact position — a clone stacked pixel-perfectly on the
  // original just looks broken).
  const addTextLayer = useCallback((sourceId) => {
    const id = `text-${Date.now()}`
    setSettings(prev => {
      const src = sourceId ? prev.textLayers.find(l => l.id === sourceId) : null
      const layer = src
        ? { ...src, id, content: '', y: Math.min(0.95, (src.y ?? 0.5) + 0.08) }
        : DEFAULT_LAYER(id, prev.textLayers.length)
      return { ...prev, textLayers: [...prev.textLayers, layer] }
    }, { immediate: true })
    setSelectedLayerId(id)
    setSelectedHighlightId(null)
  }, [setSettings])

  const removeTextLayer = useCallback((id) => {
    setSettings(prev => ({ ...prev, textLayers: prev.textLayers.filter(l => l.id !== id) }), { immediate: true })
    setSelectedLayerId(prev => prev === id ? null : prev)
  }, [setSettings])

  // One updater for both layer kinds: the canvas drag handler doesn't care which
  // array an id lives in, so route by whichever holds it.
  const updateTextLayer = useCallback((id, key, value) => {
    setSettings(prev => (
      (prev.highlightLayers ?? []).some(l => l.id === id)
        ? { ...prev, highlightLayers: prev.highlightLayers.map(l => l.id === id ? { ...l, [key]: value } : l) }
        : { ...prev, textLayers: prev.textLayers.map(l => l.id === id ? { ...l, [key]: value } : l) }
    ))
  }, [setSettings])

  // Tapping a mark on the canvas selects it in whichever list it belongs to.
  const selectLayerFromCanvas = useCallback((id) => {
    if (String(id).startsWith('hl-')) { setSelectedHighlightId(id); setSelectedLayerId(null) }
    else { setSelectedLayerId(id); setSelectedHighlightId(null) }
  }, [])

  const addHighlightLayer = useCallback((sourceId) => {
    const id = `hl-${Date.now()}`
    setSettings(prev => {
      const list = prev.highlightLayers ?? []
      const src = sourceId ? list.find(l => l.id === sourceId) : null
      const layer = src
        ? { ...src, id, y: Math.min(0.95, (src.y ?? 0.5) + 0.09) }
        : DEFAULT_HIGHLIGHT(id, list.length)
      return { ...prev, highlightLayers: [...list, layer] }
    }, { immediate: true })
    setSelectedHighlightId(id)
    setSelectedLayerId(null)
  }, [setSettings])

  const removeHighlightLayer = useCallback((id) => {
    setSettings(prev => ({ ...prev, highlightLayers: (prev.highlightLayers ?? []).filter(l => l.id !== id) }), { immediate: true })
    setSelectedHighlightId(prev => prev === id ? null : prev)
  }, [setSettings])

  const handlePickColor = useCallback((hex) => {
    setSettings(prev => ({ ...prev, bgColor: hex, bgMode: 'color' }), { immediate: true })
    // Re-roll the suggested tones + accents around the picked colour.
    setBorderSuggestions(buildSuggestionsFromColor(hex))
    setPickMode(false)
    setToast('Palette re-rolled')
  }, [setSettings])

  // Apply a border colour (custom picker or a suggested swatch). Discrete choice
  // → commit immediately so each tap is its own undo step.
  const applyBorderColor = useCallback((hex) => {
    setSettings(prev => ({ ...prev, bgColor: hex, bgMode: 'color' }), { immediate: true })
  }, [setSettings])

  // Suggestions arrive once the source decodes. Store them, and if the border is
  // still the pristine default, key it to the photo so the frame is beautiful out
  // of the box (still a normal, undoable setting the user can change).
  const handlePalette = useCallback((sugg) => {
    setBorderSuggestions(sugg)
    const photo = sugg?.find(s => s.id === 'photo')
    if (!photo) return
    setSettings(prev => (
      prev.bgMode === 'average' && prev.bgColor === '#ffffff'
        ? { ...prev, bgMode: 'color', bgColor: photo.hex }
        : prev
    ), { immediate: true })
  }, [setSettings])

  const toggleTab = useCallback((id) => {
    setActiveTab(prev => prev === id ? null : id)
  }, [])

  // N11: persist settings (debounced) so a reload / iOS tab eviction mid-edit
  // doesn't lose the setup. Restored onto the next photo via seedForNewMedia.
  useEffect(() => {
    if (step !== STEPS.EDIT) return
    const t = setTimeout(() => saveSettings(settings), 400)
    return () => clearTimeout(t)
  }, [settings, step])

  // Auto-dismiss the status toast.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

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

  // The tray mounts after the page has loaded (once there is a photo), so the
  // style guide's toolbar script never saw it. Its documented hook for a
  // toolbar added later: roving focus, and paging when the tools cannot fit.
  const hasTray = step !== STEPS.UPLOAD && !!media
  useEffect(() => {
    if (hasTray && toolsRef.current) window.SG?.toolbar?.init(toolsRef.current)
  }, [hasTray])

  return (
    <div className="app" ref={appRef}>
      {/* App bar: the page heading, the two edits you reach for constantly, and
          Save. Everything rarer (a new photo, presets, how the canvas sits) is
          one tap away under More, so the bar stays one row on a 320px phone. */}
      <header className="appbar app__bar">
        <h1 className="appbar__title">Border Studio</h1>
        {step !== STEPS.UPLOAD && (
          <div className="appbar__end">
            <button className="btn" type="button" data-shape="circle" data-size="sm"
              onClick={undo} disabled={!canUndo} aria-label="Undo">
              <Icon name="undo-2" />
            </button>
            <button className="btn" type="button" data-shape="circle" data-size="sm"
              onClick={redo} disabled={!canRedo} aria-label="Redo">
              <Icon name="redo-2" />
            </button>
            <button className="btn" type="button" data-shape="circle" data-size="sm"
              popoverTarget="app-more" aria-label="More">
              <Icon name="ellipsis" />
            </button>
            {/* Save is the one action of the screen, so it is the one filled
                shape, at the bar's end where photo editors put Export. Busy,
                it says how far a video has got. */}
            <button className="btn app__save" type="button" data-variant="primary" data-size="sm"
              id="tool-save" onClick={() => { if (!saving) handleSave() }}
              aria-busy={saving || undefined} aria-disabled={saving || undefined}
              aria-label={saving ? 'Saving to Photos' : 'Save to Photos'}>
              <span className="btn__label num">
                <Icon name="download" />
                <span className="app__save-word">
                  {saving ? (recordingProgress > 0 ? `${Math.round(recordingProgress * 100)}%` : 'Saving') : 'Save'}
                </span>
              </span>
            </button>
          </div>
        )}
      </header>

      {/* More: a native popover, so light-dismiss, Esc and focus return are the
          browser's. A card, because it holds a group of things. */}
      {step !== STEPS.UPLOAD && (
        <div id="app-more" className="card app__more" popover="auto" aria-label="More">
          <div className="card__body app__more-body">
            <button className="btn" type="button" data-block="" data-variant="primary"
              popoverTarget="app-more" popoverTargetAction="hide"
              onClick={() => setNewChoiceOpen(true)}>
              <span className="btn__label"><Icon name="plus" />New photo</span>
            </button>
            <button className="btn" type="button" data-block=""
              popoverTarget="app-more" popoverTargetAction="hide"
              onClick={() => setPresetsOpen(true)}>
              <span className="btn__label"><Icon name="bookmark" />Presets</span>
            </button>
            <div className="app__more-row">
              <span className="t-label" id="app-more-view">Canvas</span>
              <Segmented label="Canvas" value={viewMode} onChange={setViewMode}
                options={[{ id: 'fit', label: 'Fit' }, { id: 'fill', label: 'Fill' }]} />
            </div>
          </div>
        </div>
      )}

      <main className="app__main">
        {step === STEPS.UPLOAD ? (
          <div className="app__upload">
            <Uploader onMediaLoaded={handleMediaLoaded} initialError={mediaError} />
          </div>
        ) : media ? (
          <div className={`app__canvas-wrap${viewMode === 'fit' ? ' app__canvas-wrap--fit' : ''}`}>
            <BorderCanvas
              ref={canvasRef}
              media={media}
              settings={settings}
              onUpdate={updateSetting}
              pickMode={pickMode}
              onPickColor={handlePickColor}
              onPalette={handlePalette}
              onError={handleMediaError}
              cropMode={activeTab === 'frame' && frameSub === 'crop'}
              selectedLayerId={selectedLayerId}
              onSelectLayer={selectLayerFromCanvas}
              onUpdateLayer={updateTextLayer}
              snapEnabled={snapEnabled}
              gridDivisions={gridDivisions}
            />
          </div>
        ) : null}
      </main>

      <NewChoiceDialog open={newChoiceOpen} onClose={() => setNewChoiceOpen(false)}
        onChoose={handleReset} />

      {presetsOpen && (
        <PresetSheet
          presets={presets}
          hasLast={!!loadSettings()}
          onSave={handleSavePreset}
          onLoad={handleLoadPreset}
          onDelete={handleDeletePreset}
          onApplyLast={handleApplyLast}
          onClose={() => setPresetsOpen(false)}
        />
      )}

      {/* §10.1 live region — a single persistent role=status the app writes
          state changes into ("Saved"). Visible only when it has content. */}
      <div className={`card app__toast${toast ? ' app__toast--show' : ''}`} role="status" aria-live="polite">
        {toast && <span className="app__toast-body"><Icon name="check" />{toast}</span>}
      </div>

      {/* Gesture hint — shown once per session after first image load */}
      {showHint && (
        <p className="card app__hint" aria-hidden="true">
          Pinch to zoom · Drag to pan · Double-tap to reset
        </p>
      )}

      {/* Frosted glass overlay — direct child of .app so absolute bottom:0 is viewport bottom */}
      {step !== STEPS.UPLOAD && media && (
        <div className="app__overlay" ref={overlayRef}>
              {/* Sliding controls panel */}
              <div className={`app__panel${activeTab ? ' app__panel--open' : ''}`}>
                <div className="app__panel-inner">
                <div className="app__panel-grab" aria-hidden="true" />
                <Controls
                  tab={activeTab}
                  settings={settings}
                  onUpdate={updateSetting}
                  pickMode={pickMode}
                  onPickMode={() => setPickMode(p => !p)}
                  borderSuggestions={borderSuggestions}
                  onApplyBorderColor={applyBorderColor}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={setSelectedLayerId}
                  onAddLayer={addTextLayer}
                  onRemoveLayer={removeTextLayer}
                  onUpdateLayer={updateTextLayer}
                  selectedHighlightId={selectedHighlightId}
                  onSelectHighlight={setSelectedHighlightId}
                  onAddHighlight={addHighlightLayer}
                  onRemoveHighlight={removeHighlightLayer}
                  frameSub={frameSub}
                  onFrameSub={setFrameSub}
                  snapEnabled={snapEnabled}
                  onSnapToggle={() => setSnapEnabled(s => !s)}
                  gridDivisions={gridDivisions}
                  onGridDivisions={setGridDivisions}
                />
                </div>
              </div>

              {/* The editor's tools: the style guide's toolbar — "the tools of a
                  photo editor". Each tool is a toggle (tap it again to close its
                  panel), named by a real <label for> under it. Save is the one
                  action in the tray, so it is the one filled shape at rest. */}
              <div className="app__tools">
                <div className="toolbar app__tray">
                  <button className="btn toolbar__scroll" type="button" data-shape="circle" data-size="sm"
                    data-dir="back" aria-label="Scroll tools back" tabIndex={-1} hidden>
                    <Icon name="chevron-left" />
                  </button>
                  <div className="toolbar__list" role="toolbar" aria-label="Edit tools" ref={toolsRef}>
                    {TABS.map(t => (
                      <div className="toolbar__item" key={t.id}>
                        <button className="btn" type="button" data-shape="circle" id={`tool-${t.id}`}
                          aria-pressed={activeTab === t.id} onClick={() => toggleTab(t.id)}>
                          <Icon name={t.icon} />
                        </button>
                        <label className="toolbar__label" htmlFor={`tool-${t.id}`}>{t.label}</label>
                      </div>
                    ))}
                  </div>
                  <button className="btn toolbar__scroll" type="button" data-shape="circle" data-size="sm"
                    data-dir="forward" aria-label="Scroll tools forward" tabIndex={-1} hidden>
                    <Icon name="chevron-right" />
                  </button>
                </div>
              </div>
        </div>
      )}
    </div>
  )
}
