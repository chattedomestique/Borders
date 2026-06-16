import { useState } from 'react'
import './Controls.css'

const CROP_RATIOS = [
  { id: 'free', label: 'Free' },
  { id: '1:1',  label: '1:1'  },
  { id: '4:5',  label: '4:5'  },
  { id: '5:4',  label: '5:4'  },
  { id: '3:4',  label: '3:4'  },
  { id: '4:3',  label: '4:3'  },
  { id: '9:16', label: '9:16' },
  { id: '16:9', label: '16:9' },
  { id: '2:3',  label: '2:3'  },
  { id: '3:2',  label: '3:2'  },
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
  { id: 'left',   label: 'L' },
  { id: 'center', label: 'C' },
  { id: 'right',  label: 'R' },
]

const TEXT_BG_MODES = [
  { id: 'none', label: 'None' },
  { id: 'pill', label: 'Pill' },
  { id: 'rect', label: 'Box'  },
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
              <div className="controls__seg controls__seg--fill" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {ALIGNS.map(a => (
                  <button key={a.id} role="radio" aria-checked={selectedLayer.align === a.id}
                    className={`controls__seg-btn${selectedLayer.align === a.id ? ' controls__seg-btn--active' : ''}`}
                    onClick={() => ul('align', a.id)}>{a.label}</button>
                ))}
              </div>
            </div>

            <div className="controls__row">
              <label className="controls__label" htmlFor="text-size-slider">Size</label>
              <span className="controls__value">{selectedLayer.size}</span>
            </div>
            <input id="text-size-slider" type="range" min={20} max={300} step={2}
              value={selectedLayer.size} onChange={e => ul('size', Number(e.target.value))} />

            <div className="controls__row">
              <label className="controls__label" htmlFor="text-opacity-slider">Opacity</label>
              <span className="controls__value">{selectedLayer.opacity}%</span>
            </div>
            <input id="text-opacity-slider" type="range" min={10} max={100} step={1}
              value={selectedLayer.opacity} onChange={e => ul('opacity', Number(e.target.value))} />

            <div className="controls__row">
              <label className="controls__label" htmlFor="text-spacing-slider">Spacing</label>
              <span className="controls__value">
                {selectedLayer.letterSpacing === 0 ? 'Normal' : `${selectedLayer.letterSpacing}px`}
              </span>
            </div>
            <input id="text-spacing-slider" type="range" min={-5} max={40} step={1}
              value={selectedLayer.letterSpacing} onChange={e => ul('letterSpacing', Number(e.target.value))} />
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
              <div className="controls__color-row controls__color-row--active">
                <label className="controls__color-swatch" style={{ background: selectedLayer.strokeColor }}>
                  <input type="color" value={selectedLayer.strokeColor} onChange={e => ul('strokeColor', e.target.value)} />
                </label>
                <span className="controls__color-hint">Outline color</span>
              </div>
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
                  <span className="controls__value" style={{ fontSize: 11 }}>{selectedLayer.bgOpacity}%</span>
                </div>
                <input type="range" min={10} max={100} step={1} value={selectedLayer.bgOpacity}
                  onChange={e => ul('bgOpacity', Number(e.target.value))} aria-label="Background opacity"/>
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
    grainAmount, grainVariability, grainMonochrome = true,
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
            <span className="controls__value">{borderThickness}px</span>
          </div>
          <input id="border-slider" type="range" min={0} max={400} step={1}
            value={borderThickness} onChange={e => onUpdate('borderThickness', Number(e.target.value))} />

          <div className="controls__row controls__row--spaced">
            <label className="controls__label" htmlFor="radius-slider">Corners</label>
            <span className="controls__value">
              {cornerRadius === 0 ? 'Square' : cornerRadius === 100 ? 'Round' : `${cornerRadius}%`}
            </span>
          </div>
          <input id="radius-slider" type="range" min={0} max={100} step={1}
            value={cornerRadius} onChange={e => onUpdate('cornerRadius', Number(e.target.value))} />

          <div className="controls__divider controls__divider--inset"/>

          <label className="controls__label" style={{ marginBottom: 4 }}>Crop</label>
          <div className="controls__layer-strip">
            {CROP_RATIOS.map(r => (
              <button key={r.id}
                className={`controls__ratio-chip${cropRatio === r.id ? ' controls__ratio-chip--active' : ''}`}
                onClick={() => onUpdate('cropRatio', r.id)}>{r.label}</button>
            ))}
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
                <span className="controls__value">{blurAmount}px</span>
              </div>
              <input id="blur-slider" type="range" min={10} max={240} step={2}
                value={blurAmount} onChange={e => onUpdate('blurAmount', Number(e.target.value))} />

              <div className="controls__divider controls__divider--inset"/>

              <div className="controls__row">
                <label className="controls__label" htmlFor="frost-brightness">Brightness</label>
                <span className="controls__value">{frostBrightness > 0 ? `+${frostBrightness}` : frostBrightness}%</span>
              </div>
              <input id="frost-brightness" type="range" min={-100} max={200} step={1}
                value={frostBrightness} onChange={e => onUpdate('frostBrightness', Number(e.target.value))} />

              <div className="controls__row">
                <label className="controls__label" htmlFor="frost-contrast">Contrast</label>
                <span className="controls__value">{frostContrast > 0 ? `+${frostContrast}` : frostContrast}%</span>
              </div>
              <input id="frost-contrast" type="range" min={-100} max={200} step={1}
                value={frostContrast} onChange={e => onUpdate('frostContrast', Number(e.target.value))} />

              <div className="controls__row">
                <label className="controls__label" htmlFor="frost-saturation">Saturation</label>
                <span className="controls__value">{frostSaturation > 0 ? `+${frostSaturation}` : frostSaturation}%</span>
              </div>
              <input id="frost-saturation" type="range" min={-100} max={300} step={1}
                value={frostSaturation} onChange={e => onUpdate('frostSaturation', Number(e.target.value))} />

              <div className="controls__row">
                <label className="controls__label" htmlFor="frost-vibrance">Vibrance</label>
                <span className="controls__value">{frostVibrance === 0 ? 'Off' : `+${frostVibrance}%`}</span>
              </div>
              <input id="frost-vibrance" type="range" min={0} max={200} step={1}
                value={frostVibrance} onChange={e => onUpdate('frostVibrance', Number(e.target.value))} />
            </>
          )}
        </section>
      )}

      {/* ── Grain ── */}
      {tab === 'grain' && (
        <section className="controls__section" aria-label="Grain">
          <div className="controls__row">
            <label className="controls__label" htmlFor="grain-slider">Amount</label>
            <span className="controls__value">{grainAmount === 0 ? 'Off' : `${grainAmount}%`}</span>
          </div>
          <input id="grain-slider" type="range" min={0} max={100} step={1}
            value={grainAmount} onChange={e => onUpdate('grainAmount', Number(e.target.value))} />

          <div className="controls__row controls__row--spaced">
            <label className="controls__label" htmlFor="variability-slider">Variability</label>
            <span className="controls__value">
              {grainVariability === 0 ? 'Uniform' : `${grainVariability}%`}
            </span>
          </div>
          <input id="variability-slider" type="range" min={0} max={100} step={1}
            value={grainVariability} onChange={e => onUpdate('grainVariability', Number(e.target.value))} />

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
