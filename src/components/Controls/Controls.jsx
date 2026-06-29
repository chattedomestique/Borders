import { useState, useRef, useEffect } from 'react'
import './Controls.css'

const CROP_RATIOS = [
  { id: 'free', label: 'Free', alt: null  },
  { id: '1:1',  label: '1:1',  alt: null  },
  { id: '4:5',  label: '4:5',  alt: '5:4' },
  { id: '3:4',  label: '3:4',  alt: '4:3' },
  { id: '9:16', label: '9:16', alt: '16:9'},
  { id: '2:3',  label: '2:3',  alt: '3:2' },
]

const BG_MODES = [
  { id: 'average',       label: 'Match' },
  { id: 'contrast',      label: 'Contrast' },
  { id: 'complementary', label: 'Pop' },
  { id: 'frosted',       label: 'Frosted' },
]

const FONTS = [
  { id: 'system-ui, -apple-system, sans-serif',  label: 'Sans' },
  { id: "'New York', Georgia, serif",             label: 'Serif' },
  { id: "ui-monospace, 'Courier New', monospace", label: 'Mono' },
]

const ALIGNS = [
  { id: 'left',    label: 'L' },
  { id: 'center',  label: 'C' },
  { id: 'right',   label: 'R' },
  { id: 'justify', label: 'J' },
]

const TEXT_BG_MODES = [
  { id: 'none', label: 'None' },
  { id: 'pill', label: 'Pill' },
  { id: 'rect', label: 'Box'  },
]

const ECHO_BLENDS = [
  { id: 'stack',   label: 'Stack'   },
  { id: 'screen',  label: 'Screen'  },
  { id: 'lighten', label: 'Lighten' },
]

function Toggle({ on, onChange, label }) {
  return (
    <button
      className={`controls__toggle${on ? ' controls__toggle--on' : ''}`}
      onClick={() => onChange(!on)}
      role="switch" aria-checked={on} aria-label={label}
    >
      <span className="controls__toggle-thumb"/>
    </button>
  )
}

/**
 * Range slider that resets to its default on double-tap / double-click of the
 * handle. `def` is the default value; `on(value)` receives the numeric value
 * (from drags and from the reset). All other props pass through to the input.
 */
function Slider({ def, on, ...rest }) {
  const lastTap = useRef(0)
  const reset = () => { if (def != null) on(def) }
  return (
    <input
      type="range" {...rest}
      onChange={e => on(Number(e.target.value))}
      onDoubleClick={reset}
      onPointerDown={() => {
        const now = Date.now()
        if (now - lastTap.current < 320) { reset(); lastTap.current = 0 }
        else lastTap.current = now
      }}
    />
  )
}

/**
 * The value pill next to every slider. Tap it to type an exact amount; on
 * commit the entry is clamped to [min, max] and snapped to `step`. `format`
 * keeps the pretty display labels (e.g. "Normal", "Square", "+20%") while the
 * editor always works on the raw number.
 */
function EditableValue({ value, min, max, step = 1, onChange, format, suffix = '', style }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (editing && ref.current) { ref.current.focus(); ref.current.select() }
  }, [editing])

  const commit = () => {
    setEditing(false)
    const n = parseFloat(draft)
    if (Number.isNaN(n)) return
    let v = Math.min(max, Math.max(min, n))
    if (step) v = Math.round((v - min) / step) * step + min
    v = Math.round(v * 1000) / 1000
    if (v !== value) onChange(v)
  }

  if (editing) {
    return (
      <input
        ref={ref}
        className="controls__value controls__value--input"
        style={style}
        type="number" inputMode="numeric"
        value={draft} min={min} max={max} step={step}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); ref.current?.blur() }
          else if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
        }}
        aria-label="Edit value"
      />
    )
  }

  return (
    <button
      type="button" className="controls__value controls__value--btn" style={style}
      onClick={() => { setDraft(String(value)); setEditing(true) }}
      aria-label="Tap to type a value"
    >
      {format ? format(value) : `${value}${suffix}`}
    </button>
  )
}

const TEXT_SUBTABS = [
  { id: 'content', label: 'Content' },
  { id: 'style',   label: 'Style'   },
  { id: 'fx',      label: 'FX'      },
]

function TextControls({ textLayers, selectedLayerId, selectedLayer, ul, onAddLayer, onRemoveLayer, onSelectLayer }) {
  const [sub, setSub] = useState('content')

  const noLayerHint = (
    <p className="controls__hint" style={{ textAlign: 'center', padding: '4px 0 2px' }}>
      {textLayers.length === 0 ? 'Tap Add to create a text layer.' : 'Tap a layer above to edit it.'}
    </p>
  )

  return (
    <section className="controls__section" aria-label="Text layers">
      {/* Layer strip — always visible */}
      <div className="controls__layer-strip">
        <button className="controls__layer-add" onClick={onAddLayer} aria-label="Add text layer">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Add</span>
        </button>
        {textLayers.map(layer => (
          <div key={layer.id}
            className={`controls__layer-chip${layer.id === selectedLayerId ? ' controls__layer-chip--active' : ''}`}>
            <button className="controls__layer-chip__label"
              onClick={() => onSelectLayer(layer.id)} aria-pressed={layer.id === selectedLayerId}>
              {layer.content.trim() ? layer.content.trim().slice(0, 12) : 'Empty'}
            </button>
            <button className="controls__layer-chip__remove"
              onClick={() => onRemoveLayer(layer.id)} aria-label="Remove layer">×</button>
          </div>
        ))}
      </div>

      {/* Sub-tab bar */}
      <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} role="tablist">
        {TEXT_SUBTABS.map(t => (
          <button key={t.id} role="tab" aria-selected={sub === t.id}
            className={`controls__seg-btn${sub === t.id ? ' controls__seg-btn--active' : ''}`}
            onClick={() => setSub(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Content sub-tab */}
      {sub === 'content' && (
        selectedLayer ? (
          <>
            <textarea
              className="controls__textarea"
              placeholder="Type something…"
              value={selectedLayer.content}
              onChange={e => ul('content', e.target.value)}
              rows={3}
              spellCheck={false}
            />
            <p className="controls__hint" style={{ textAlign: 'center', marginTop: 0 }}>
              Tap text on canvas to reposition
            </p>
          </>
        ) : noLayerHint
      )}

      {/* Style sub-tab */}
      {sub === 'style' && (
        selectedLayer ? (
          <>
            <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
              role="radiogroup" aria-label="Font family">
              {FONTS.map(f => (
                <button key={f.id} role="radio" aria-checked={selectedLayer.font === f.id}
                  className={`controls__seg-btn${selectedLayer.font === f.id ? ' controls__seg-btn--active' : ''}`}
                  style={{ fontFamily: f.id }} onClick={() => ul('font', f.id)}>{f.label}</button>
              ))}
            </div>

            <div className="controls__text-row">
              <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(2, 1fr)', flex: '0 0 auto', width: 80 }}>
                <button className={`controls__seg-btn${selectedLayer.bold ? ' controls__seg-btn--active' : ''}`}
                  style={{ fontWeight: 700 }} onClick={() => ul('bold', !selectedLayer.bold)}
                  aria-pressed={selectedLayer.bold}>B</button>
                <button className={`controls__seg-btn${selectedLayer.italic ? ' controls__seg-btn--active' : ''}`}
                  style={{ fontStyle: 'italic' }} onClick={() => ul('italic', !selectedLayer.italic)}
                  aria-pressed={selectedLayer.italic}>I</button>
              </div>
              <div className="controls__seg controls__seg--fill" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {ALIGNS.map(a => (
                  <button key={a.id} role="radio" aria-checked={selectedLayer.align === a.id}
                    className={`controls__seg-btn${selectedLayer.align === a.id ? ' controls__seg-btn--active' : ''}`}
                    onClick={() => ul('align', a.id)}>{a.label}</button>
                ))}
              </div>
            </div>

            <div className="controls__row">
              <label className="controls__label" htmlFor="text-size-slider">Size</label>
              <EditableValue value={selectedLayer.size} min={20} max={300} step={2}
                onChange={v => ul('size', v)} />
            </div>
            <Slider id="text-size-slider" min={20} max={300} step={2} def={80}
              value={selectedLayer.size} on={v => ul('size', v)} />

            <div className="controls__row">
              <label className="controls__label" htmlFor="text-opacity-slider">Opacity</label>
              <EditableValue value={selectedLayer.opacity} min={10} max={100} suffix="%"
                onChange={v => ul('opacity', v)} />
            </div>
            <Slider id="text-opacity-slider" min={10} max={100} step={1} def={100}
              value={selectedLayer.opacity} on={v => ul('opacity', v)} />

            <div className="controls__row">
              <label className="controls__label" htmlFor="text-letter-spacing">Letter spacing</label>
              <EditableValue value={selectedLayer.letterSpacing} min={-5} max={40}
                format={v => v === 0 ? 'Normal' : `${v}px`}
                onChange={v => ul('letterSpacing', v)} />
            </div>
            <Slider id="text-letter-spacing" min={-5} max={40} step={1} def={0}
              value={selectedLayer.letterSpacing} on={v => ul('letterSpacing', v)} />

            <div className="controls__row">
              <label className="controls__label" htmlFor="text-word-spacing">Word spacing</label>
              <EditableValue value={selectedLayer.wordSpacing ?? 0} min={-10} max={80}
                format={v => v === 0 ? 'Normal' : `${v}px`}
                onChange={v => ul('wordSpacing', v)} />
            </div>
            <Slider id="text-word-spacing" min={-10} max={80} step={1} def={0}
              value={selectedLayer.wordSpacing ?? 0} on={v => ul('wordSpacing', v)} />
          </>
        ) : noLayerHint
      )}

      {/* FX sub-tab */}
      {sub === 'fx' && (
        selectedLayer ? (
          <>
            <div className="controls__text-row">
              <label className="controls__color-swatch" style={{ background: selectedLayer.color }}
                title="Text color" aria-label="Text color">
                <input type="color" value={selectedLayer.color} onChange={e => ul('color', e.target.value)} />
              </label>
              <div className="controls__effects-row">
                <button
                  className={`controls__effect-btn${selectedLayer.shadow ? ' controls__effect-btn--active' : ''}`}
                  onClick={() => ul('shadow', !selectedLayer.shadow)} aria-pressed={selectedLayer.shadow}
                >Shadow</button>
                <button
                  className={`controls__effect-btn${selectedLayer.stroke ? ' controls__effect-btn--active' : ''}`}
                  onClick={() => ul('stroke', !selectedLayer.stroke)} aria-pressed={selectedLayer.stroke}
                >Outline</button>
              </div>
            </div>

            {selectedLayer.stroke && (
              <>
                <div className="controls__color-row controls__color-row--active">
                  <label className="controls__color-swatch" style={{ background: selectedLayer.strokeColor }}>
                    <input type="color" value={selectedLayer.strokeColor} onChange={e => ul('strokeColor', e.target.value)} />
                  </label>
                  <span className="controls__color-hint">Outline color</span>
                </div>
                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="stroke-width">Outline width</label>
                  <EditableValue value={selectedLayer.strokeWidth ?? 35} min={0} max={100} suffix="%"
                    onChange={v => ul('strokeWidth', v)} />
                </div>
                <Slider id="stroke-width" min={0} max={100} step={1} def={35}
                  value={selectedLayer.strokeWidth ?? 35} on={v => ul('strokeWidth', v)} />
              </>
            )}

            <div className="controls__divider controls__divider--inset"/>

            <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
              role="radiogroup" aria-label="Text background">
              {TEXT_BG_MODES.map(m => (
                <button key={m.id} role="radio" aria-checked={selectedLayer.bg === m.id}
                  className={`controls__seg-btn${selectedLayer.bg === m.id ? ' controls__seg-btn--active' : ''}`}
                  onClick={() => ul('bg', m.id)}>{m.label}</button>
              ))}
            </div>

            {selectedLayer.bg !== 'none' && (
              <>
                <div className="controls__color-row controls__color-row--active">
                  <label className="controls__color-swatch" style={{ background: selectedLayer.bgColor }}>
                    <input type="color" value={selectedLayer.bgColor} onChange={e => ul('bgColor', e.target.value)} />
                  </label>
                  <span className="controls__color-hint" style={{ flex: 1 }}>BG color</span>
                  <EditableValue value={selectedLayer.bgOpacity} min={10} max={100} suffix="%"
                    style={{ fontSize: 11 }} onChange={v => ul('bgOpacity', v)} />
                </div>
                <Slider min={10} max={100} step={1} value={selectedLayer.bgOpacity} def={50}
                  on={v => ul('bgOpacity', v)} aria-label="Background opacity"/>
              </>
            )}

            <div className="controls__divider controls__divider--inset"/>

            {/* Blob stroke — gooey distance-based outline that merges nearby letters */}
            <div className="controls__row controls__row--spaced">
              <label className="controls__label">Blob stroke</label>
              <Toggle on={!!selectedLayer.blobStroke} onChange={v => ul('blobStroke', v)} label="Toggle blob stroke"/>
            </div>

            {selectedLayer.blobStroke && (
              <>
                <div className="controls__row">
                  <label className="controls__label" htmlFor="blob-distance">Distance</label>
                  <EditableValue value={selectedLayer.blobDistance ?? 40} min={0} max={100} suffix="%"
                    onChange={v => ul('blobDistance', v)} />
                </div>
                <Slider id="blob-distance" min={0} max={100} step={1} def={40}
                  value={selectedLayer.blobDistance ?? 40} on={v => ul('blobDistance', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="blob-curve">Curviness</label>
                  <EditableValue value={selectedLayer.blobCurve ?? 30} min={0} max={100} suffix="%"
                    onChange={v => ul('blobCurve', v)} />
                </div>
                <Slider id="blob-curve" min={0} max={100} step={1} def={30}
                  value={selectedLayer.blobCurve ?? 30} on={v => ul('blobCurve', v)} />

                <div className="controls__color-row controls__color-row--active">
                  <label className="controls__color-swatch" style={{ background: selectedLayer.blobColor ?? '#000000' }}>
                    <input type="color" value={selectedLayer.blobColor ?? '#000000'}
                      onChange={e => ul('blobColor', e.target.value)} />
                  </label>
                  <span className="controls__color-hint">Blob color</span>
                </div>

                {/* Grain on the blob — shared engine with the motion trail */}
                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="blob-grain">Grain</label>
                  <EditableValue value={selectedLayer.blobGrain ?? 0} min={0} max={100}
                    format={v => v === 0 ? 'Off' : `${v}%`} onChange={v => ul('blobGrain', v)} />
                </div>
                <Slider id="blob-grain" min={0} max={100} step={1} def={0}
                  value={selectedLayer.blobGrain ?? 0} on={v => ul('blobGrain', v)} />

                {(selectedLayer.blobGrain ?? 0) > 0 && (
                  <>
                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label" htmlFor="blob-grain-size">Grain size</label>
                      <EditableValue value={selectedLayer.blobGrainSize ?? 30} min={0} max={100} suffix="%"
                        onChange={v => ul('blobGrainSize', v)} />
                    </div>
                    <Slider id="blob-grain-size" min={0} max={100} step={1} def={30}
                      value={selectedLayer.blobGrainSize ?? 30} on={v => ul('blobGrainSize', v)} />

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label" htmlFor="blob-grain-rough">Roughness</label>
                      <EditableValue value={selectedLayer.blobGrainRough ?? 0} min={0} max={100}
                        format={v => v === 0 ? 'Smooth' : `${v}%`} onChange={v => ul('blobGrainRough', v)} />
                    </div>
                    <Slider id="blob-grain-rough" min={0} max={100} step={1} def={0}
                      value={selectedLayer.blobGrainRough ?? 0} on={v => ul('blobGrainRough', v)} />

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label">Dissolve</label>
                      <Toggle on={!!selectedLayer.blobGrainDissolve}
                        onChange={v => ul('blobGrainDissolve', v)} label="Toggle blob grain dissolve"/>
                    </div>
                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label">Monochrome grain</label>
                      <Toggle on={selectedLayer.blobGrainMono ?? true}
                        onChange={v => ul('blobGrainMono', v)} label="Toggle blob monochrome grain"/>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="controls__divider controls__divider--inset"/>

            {/* Rear-curtain-sync motion blur — sharp text with a fading trail behind it */}
            <div className="controls__row controls__row--spaced">
              <label className="controls__label">Motion blur</label>
              <Toggle on={!!selectedLayer.motionBlur} onChange={v => ul('motionBlur', v)} label="Toggle motion blur"/>
            </div>

            {selectedLayer.motionBlur && (
              <>
                <div className="controls__row">
                  <label className="controls__label" htmlFor="motion-direction">Direction</label>
                  <EditableValue value={selectedLayer.motionAngle ?? 0} min={0} max={360} step={5} suffix="°"
                    onChange={v => ul('motionAngle', v)} />
                </div>
                {/* Snap to 5° so the streak angle stays put when you lift your thumb */}
                <Slider id="motion-direction" min={0} max={360} step={5} def={0}
                  value={selectedLayer.motionAngle ?? 0} on={v => ul('motionAngle', v)} />

                <div className="controls__row">
                  <label className="controls__label" htmlFor="motion-distance">Distance</label>
                  <EditableValue value={selectedLayer.motionLength ?? 0} min={0} max={400} step={2}
                    format={v => v === 0 ? 'Off' : `${v}px`}
                    onChange={v => ul('motionLength', v)} />
                </div>
                <Slider id="motion-distance" min={0} max={400} step={2} def={60}
                  value={selectedLayer.motionLength ?? 0} on={v => ul('motionLength', v)} />

                <div className="controls__row">
                  <label className="controls__label" htmlFor="motion-speed">Speed</label>
                  <EditableValue value={selectedLayer.motionSpeed ?? 60} min={0} max={100} suffix="%"
                    onChange={v => ul('motionSpeed', v)} />
                </div>
                <Slider id="motion-speed" min={0} max={100} step={1} def={60}
                  value={selectedLayer.motionSpeed ?? 60} on={v => ul('motionSpeed', v)} />

                {/* Grain adjustment on the trail — long-exposure ambient noise */}
                <div className="controls__divider controls__divider--inset"/>
                <div className="controls__row">
                  <label className="controls__label" htmlFor="trail-grain">Trail grain</label>
                  <EditableValue value={selectedLayer.trailGrain ?? 0} min={0} max={100}
                    format={v => v === 0 ? 'Off' : `${v}%`}
                    onChange={v => ul('trailGrain', v)} />
                </div>
                <Slider id="trail-grain" min={0} max={100} step={1} def={0}
                  value={selectedLayer.trailGrain ?? 0} on={v => ul('trailGrain', v)} />

                {(selectedLayer.trailGrain ?? 0) > 0 && (
                  <>
                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label" htmlFor="trail-grain-size">Grain size</label>
                      <EditableValue value={selectedLayer.trailGrainSize ?? 30} min={0} max={100} suffix="%"
                        onChange={v => ul('trailGrainSize', v)} />
                    </div>
                    <Slider id="trail-grain-size" min={0} max={100} step={1} def={30}
                      value={selectedLayer.trailGrainSize ?? 30}
                      on={v => ul('trailGrainSize', v)} />

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label" htmlFor="trail-grain-var">Roughness</label>
                      <EditableValue value={selectedLayer.trailGrainVariability ?? 0} min={0} max={100}
                        format={v => v === 0 ? 'Smooth' : `${v}%`}
                        onChange={v => ul('trailGrainVariability', v)} />
                    </div>
                    <Slider id="trail-grain-var" min={0} max={100} step={1} def={0}
                      value={selectedLayer.trailGrainVariability ?? 0}
                      on={v => ul('trailGrainVariability', v)} />

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label" htmlFor="trail-grain-spread">Spread</label>
                      <EditableValue value={selectedLayer.trailGrainSpread ?? 0} min={0} max={100}
                        format={v => v === 0 ? 'Even' : `${v}%`}
                        onChange={v => ul('trailGrainSpread', v)} />
                    </div>
                    <Slider id="trail-grain-spread" min={0} max={100} step={1} def={0}
                      value={selectedLayer.trailGrainSpread ?? 0}
                      on={v => ul('trailGrainSpread', v)} />

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label">Dissolve</label>
                      <Toggle on={!!selectedLayer.trailGrainDissolve}
                        onChange={v => ul('trailGrainDissolve', v)} label="Toggle dissolve grain mode"/>
                    </div>

                    <div className="controls__row controls__row--spaced">
                      <label className="controls__label">Monochrome grain</label>
                      <Toggle on={selectedLayer.trailGrainMono ?? true}
                        onChange={v => ul('trailGrainMono', v)} label="Toggle monochrome trail grain"/>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="controls__divider controls__divider--inset"/>

            {/* Echo — discrete decaying ghost copies (After Effects-style) */}
            <div className="controls__row controls__row--spaced">
              <label className="controls__label">Echo</label>
              <Toggle on={!!selectedLayer.echo} onChange={v => ul('echo', v)} label="Toggle echo"/>
            </div>

            {selectedLayer.echo && (
              <>
                <div className="controls__row">
                  <label className="controls__label" htmlFor="echo-count">Amount</label>
                  <EditableValue value={selectedLayer.echoCount ?? 5} min={1} max={16}
                    format={v => `${v}×`} onChange={v => ul('echoCount', v)} />
                </div>
                <Slider id="echo-count" min={1} max={16} step={1} def={5}
                  value={selectedLayer.echoCount ?? 5} on={v => ul('echoCount', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-direction">Direction</label>
                  <EditableValue value={selectedLayer.echoAngle ?? 0} min={0} max={360} step={5} suffix="°"
                    onChange={v => ul('echoAngle', v)} />
                </div>
                <Slider id="echo-direction" min={0} max={360} step={5} def={0}
                  value={selectedLayer.echoAngle ?? 0} on={v => ul('echoAngle', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-spacing">Spacing</label>
                  <EditableValue value={selectedLayer.echoSpacing ?? 40} min={0} max={200} suffix="px"
                    onChange={v => ul('echoSpacing', v)} />
                </div>
                <Slider id="echo-spacing" min={0} max={200} step={1} def={40}
                  value={selectedLayer.echoSpacing ?? 40} on={v => ul('echoSpacing', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-ease">Curve</label>
                  <EditableValue value={selectedLayer.echoEase ?? 50} min={-100} max={100} step={1}
                    format={v => v === 0 ? 'Linear' : `${v > 0 ? '+' : ''}${v}`}
                    onChange={v => ul('echoEase', v)} />
                </div>
                <Slider id="echo-ease" min={-100} max={100} step={1} def={50}
                  value={selectedLayer.echoEase ?? 50} on={v => ul('echoEase', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-ghosting">Ghosting</label>
                  <EditableValue value={selectedLayer.echoGhosting ?? 60} min={0} max={100} suffix="%"
                    onChange={v => ul('echoGhosting', v)} />
                </div>
                <Slider id="echo-ghosting" min={0} max={100} step={1} def={60}
                  value={selectedLayer.echoGhosting ?? 60} on={v => ul('echoGhosting', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-blur">Blur</label>
                  <EditableValue value={selectedLayer.echoBlur ?? 0} min={0} max={60}
                    format={v => v === 0 ? 'Off' : `${v}`} onChange={v => ul('echoBlur', v)} />
                </div>
                <Slider id="echo-blur" min={0} max={60} step={1} def={0}
                  value={selectedLayer.echoBlur ?? 0} on={v => ul('echoBlur', v)} />

                <div className="controls__seg" role="radiogroup" aria-label="Echo blend"
                  style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 8 }}>
                  {ECHO_BLENDS.map(m => (
                    <button key={m.id} role="radio" aria-checked={(selectedLayer.echoBlend ?? 'stack') === m.id}
                      className={`controls__seg-btn${(selectedLayer.echoBlend ?? 'stack') === m.id ? ' controls__seg-btn--active' : ''}`}
                      onClick={() => ul('echoBlend', m.id)}>{m.label}</button>
                  ))}
                </div>

                {/* Experimental per-echo transforms */}
                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-zoom">Zoom</label>
                  <EditableValue value={selectedLayer.echoZoom ?? 0} min={-50} max={100} step={1}
                    format={v => v === 0 ? 'Off' : `${v > 0 ? '+' : ''}${v}%`} onChange={v => ul('echoZoom', v)} />
                </div>
                <Slider id="echo-zoom" min={-50} max={100} step={1} def={0}
                  value={selectedLayer.echoZoom ?? 0} on={v => ul('echoZoom', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-spin">Spin</label>
                  <EditableValue value={selectedLayer.echoSpin ?? 0} min={-30} max={30} step={1}
                    format={v => v === 0 ? 'Off' : `${v > 0 ? '+' : ''}${v}°`} onChange={v => ul('echoSpin', v)} />
                </div>
                <Slider id="echo-spin" min={-30} max={30} step={1} def={0}
                  value={selectedLayer.echoSpin ?? 0} on={v => ul('echoSpin', v)} />

                <div className="controls__row controls__row--spaced">
                  <label className="controls__label" htmlFor="echo-hue">Chromatic</label>
                  <EditableValue value={selectedLayer.echoHue ?? 0} min={0} max={90} step={1}
                    format={v => v === 0 ? 'Off' : `${v}°`} onChange={v => ul('echoHue', v)} />
                </div>
                <Slider id="echo-hue" min={0} max={90} step={1} def={0}
                  value={selectedLayer.echoHue ?? 0} on={v => ul('echoHue', v)} />
              </>
            )}
          </>
        ) : noLayerHint
      )}
    </section>
  )
}

export default function Controls({
  tab, settings, onUpdate, pickMode, onPickMode,
  selectedLayerId, onSelectLayer, onAddLayer, onRemoveLayer, onUpdateLayer,
}) {
  if (!tab) return null

  const {
    borderThickness, bgMode, bgColor = '#ffffff', blurAmount,
    frostBrightness = -15, frostContrast = 0, frostSaturation = 60, frostVibrance = 0,
    cornerRadius, cropRatio = 'free', showMedia,
    grainAmount, grainVariability, grainMonochrome = true, grainSpread = 0,
    textLayers = [],
  } = settings

  const selectedLayer = textLayers.find(l => l.id === selectedLayerId) ?? null
  const ul = (key, value) => selectedLayer && onUpdateLayer(selectedLayer.id, key, value)

  return (
    <div className="controls">

      {/* ── Frame ── */}
      {tab === 'frame' && (
        <section className="controls__section" aria-label="Frame">
          <div className="controls__row">
            <label className="controls__label" htmlFor="border-slider">Border</label>
            <EditableValue value={borderThickness} min={0} max={400} suffix="px"
              onChange={v => onUpdate('borderThickness', v)} />
          </div>
          <Slider id="border-slider" min={0} max={400} step={1} def={40}
            value={borderThickness} on={v => onUpdate('borderThickness', v)} />

          <div className="controls__row controls__row--spaced">
            <label className="controls__label" htmlFor="radius-slider">Corners</label>
            <EditableValue value={cornerRadius} min={0} max={100}
              format={v => v === 0 ? 'Square' : v === 100 ? 'Round' : `${v}%`}
              onChange={v => onUpdate('cornerRadius', v)} />
          </div>
          <Slider id="radius-slider" min={0} max={100} step={1} def={0}
            value={cornerRadius} on={v => onUpdate('cornerRadius', v)} />

          <div className="controls__divider controls__divider--inset"/>

          <label className="controls__label" style={{ marginBottom: 4 }}>Crop</label>
          <div className="controls__layer-strip">
            {CROP_RATIOS.map(r => {
              const isPortrait  = cropRatio === r.id
              const isLandscape = r.alt !== null && cropRatio === r.alt
              const isActive    = isPortrait || isLandscape
              const displayLabel = isLandscape ? r.alt : r.id
              const canFlip = r.alt !== null
              const handleClick = () => {
                if (!isActive) { onUpdate('cropRatio', r.id) }
                else if (canFlip) { onUpdate('cropRatio', isPortrait ? r.alt : r.id) }
              }
              return (
                <button key={r.id}
                  className={`controls__ratio-chip${isActive ? ' controls__ratio-chip--active' : ''}`}
                  onClick={handleClick} aria-pressed={isActive}>
                  {displayLabel}
                  {isActive && canFlip && (
                    <svg className="controls__ratio-flip" width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>

          <div className="controls__row controls__row--spaced">
            <label className="controls__label">Show photo</label>
            <Toggle on={showMedia} onChange={v => onUpdate('showMedia', v)} label="Toggle photo visibility"/>
          </div>
        </section>
      )}

      {/* ── Background ── */}
      {tab === 'bg' && (
        <section className="controls__section" aria-label="Background">
          <div className="controls__seg" role="radiogroup" aria-label="Background style">
            {BG_MODES.map(mode => (
              <button key={mode.id} role="radio" aria-checked={bgMode === mode.id}
                className={`controls__seg-btn${bgMode === mode.id ? ' controls__seg-btn--active' : ''}`}
                onClick={() => onUpdate('bgMode', mode.id)}
              >{mode.label}</button>
            ))}
          </div>

          <div className={`controls__color-row${bgMode === 'color' ? ' controls__color-row--active' : ''}`}>
            <label className="controls__color-swatch" style={{ background: bgColor }}
              title="Choose custom color" aria-label="Custom background color">
              <input type="color" value={bgColor}
                onChange={e => { onUpdate('bgColor', e.target.value); onUpdate('bgMode', 'color') }} />
            </label>
            <button
              className={`controls__eyedropper${pickMode ? ' controls__eyedropper--active' : ''}`}
              onClick={onPickMode} aria-label="Pick color from image" aria-pressed={pickMode}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
              </svg>
            </button>
            <span className="controls__color-hint">
              {pickMode ? 'Tap image to pick' : (bgMode === 'color' ? bgColor : 'Custom')}
            </span>
          </div>

          {bgMode === 'frosted' && (
            <>
              <div className="controls__row controls__row--spaced">
                <label className="controls__label" htmlFor="blur-slider">Blur</label>
                <EditableValue value={blurAmount} min={10} max={240} step={2} suffix="px"
                  onChange={v => onUpdate('blurAmount', v)} />
              </div>
              <Slider id="blur-slider" min={10} max={240} step={2} def={60}
                value={blurAmount} on={v => onUpdate('blurAmount', v)} />

              <div className="controls__divider controls__divider--inset"/>

              <div className="controls__row">
                <label className="controls__label" htmlFor="frost-brightness">Brightness</label>
                <EditableValue value={frostBrightness} min={-100} max={200}
                  format={v => `${v > 0 ? `+${v}` : v}%`}
                  onChange={v => onUpdate('frostBrightness', v)} />
              </div>
              <Slider id="frost-brightness" min={-100} max={200} step={1} def={-15}
                value={frostBrightness} on={v => onUpdate('frostBrightness', v)} />

              <div className="controls__row">
                <label className="controls__label" htmlFor="frost-contrast">Contrast</label>
                <EditableValue value={frostContrast} min={-100} max={200}
                  format={v => `${v > 0 ? `+${v}` : v}%`}
                  onChange={v => onUpdate('frostContrast', v)} />
              </div>
              <Slider id="frost-contrast" min={-100} max={200} step={1} def={0}
                value={frostContrast} on={v => onUpdate('frostContrast', v)} />

              <div className="controls__row">
                <label className="controls__label" htmlFor="frost-saturation">Saturation</label>
                <EditableValue value={frostSaturation} min={-100} max={300}
                  format={v => `${v > 0 ? `+${v}` : v}%`}
                  onChange={v => onUpdate('frostSaturation', v)} />
              </div>
              <Slider id="frost-saturation" min={-100} max={300} step={1} def={60}
                value={frostSaturation} on={v => onUpdate('frostSaturation', v)} />

              <div className="controls__row">
                <label className="controls__label" htmlFor="frost-vibrance">Vibrance</label>
                <EditableValue value={frostVibrance} min={0} max={200}
                  format={v => v === 0 ? 'Off' : `+${v}%`}
                  onChange={v => onUpdate('frostVibrance', v)} />
              </div>
              <Slider id="frost-vibrance" min={0} max={200} step={1} def={0}
                value={frostVibrance} on={v => onUpdate('frostVibrance', v)} />
            </>
          )}
        </section>
      )}

      {/* ── Grain ── */}
      {tab === 'grain' && (
        <section className="controls__section" aria-label="Grain">
          <div className="controls__row">
            <label className="controls__label" htmlFor="grain-slider">Amount</label>
            <EditableValue value={grainAmount} min={0} max={100}
              format={v => v === 0 ? 'Off' : `${v}%`}
              onChange={v => onUpdate('grainAmount', v)} />
          </div>
          <Slider id="grain-slider" min={0} max={100} step={1} def={0}
            value={grainAmount} on={v => onUpdate('grainAmount', v)} />

          <div className="controls__row controls__row--spaced">
            <label className="controls__label" htmlFor="variability-slider">Variability</label>
            <EditableValue value={grainVariability} min={0} max={100}
              format={v => v === 0 ? 'Uniform' : `${v}%`}
              onChange={v => onUpdate('grainVariability', v)} />
          </div>
          <Slider id="variability-slider" min={0} max={100} step={1} def={0}
            value={grainVariability} on={v => onUpdate('grainVariability', v)} />

          <div className="controls__row controls__row--spaced">
            <label className="controls__label" htmlFor="spread-slider">Spread</label>
            <EditableValue value={grainSpread} min={0} max={100}
              format={v => v === 0 ? 'Off' : `${v}%`}
              onChange={v => onUpdate('grainSpread', v)} />
          </div>
          <Slider id="spread-slider" min={0} max={100} step={1} def={0}
            value={grainSpread} on={v => onUpdate('grainSpread', v)} />

          <div className="controls__divider controls__divider--inset"/>

          <div className="controls__row">
            <label className="controls__label">Monochrome</label>
            <Toggle on={grainMonochrome} onChange={v => onUpdate('grainMonochrome', v)} label="Toggle monochrome grain"/>
          </div>
        </section>
      )}

      {/* ── Type ── */}
      {tab === 'text' && <TextControls
        textLayers={textLayers} selectedLayerId={selectedLayerId}
        selectedLayer={selectedLayer} ul={ul}
        onAddLayer={onAddLayer} onRemoveLayer={onRemoveLayer} onSelectLayer={onSelectLayer}
      />}
    </div>
  )
}
