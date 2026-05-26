import { useState } from 'react'
import './Controls.css'

const BG_MODES = [
  { id: 'average',       label: 'Average' },
  { id: 'contrast',      label: 'Contrast' },
  { id: 'complementary', label: 'Complement' },
  { id: 'frosted',       label: 'Frosted' },
]

const FONTS = [
  { id: 'system-ui, -apple-system, sans-serif',   label: 'Sans' },
  { id: "'New York', Georgia, serif",              label: 'Serif' },
  { id: "ui-monospace, 'Courier New', monospace",  label: 'Mono' },
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

const TABS = [
  {
    id: 'frame', label: 'Frame',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.75"/>
        <rect x="5" y="5" width="8" height="8" rx="1.25" stroke="currentColor" strokeWidth="1.25" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: 'bg', label: 'BG',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.75"/>
        <path d="M1.5 11 C5 6 8 12 11 8 C13 5 15.5 10 16.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <rect x="1.5" y="11" width="15" height="5.5" rx="0" fill="currentColor" opacity="0.12"/>
      </svg>
    ),
  },
  {
    id: 'grain', label: 'Grain',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="4"  cy="4"   r="1.2"  fill="currentColor"/>
        <circle cx="9"  cy="2.5" r="0.9"  fill="currentColor" opacity="0.55"/>
        <circle cx="14" cy="4.5" r="1.2"  fill="currentColor"/>
        <circle cx="2.5" cy="9"  r="0.9"  fill="currentColor" opacity="0.55"/>
        <circle cx="8"  cy="8.5" r="1.5"  fill="currentColor"/>
        <circle cx="13.5" cy="9" r="1"    fill="currentColor" opacity="0.7"/>
        <circle cx="5"  cy="14" r="1.2"   fill="currentColor"/>
        <circle cx="10" cy="13" r="0.9"   fill="currentColor" opacity="0.5"/>
        <circle cx="15" cy="14" r="1.2"   fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'text', label: 'Type',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M3 4.5h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M9 4.5v9"  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M6 13.5h6" stroke="currentColor" strokeWidth="1.5"  strokeLinecap="round" opacity="0.55"/>
      </svg>
    ),
  },
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

export default function Controls({ settings, onUpdate, pickMode, onPickMode }) {
  const [tab, setTab] = useState('frame')

  const {
    borderThickness, bgMode, bgColor = '#ffffff', blurAmount,
    cornerRadius, cropSquare, showMedia,
    grainAmount, grainVariability,
    textContent = '', textFont, textSize = 80, textColor = '#ffffff',
    textAlign = 'center', textBold = false, textItalic = false,
    textOpacity = 100, textShadow = false, textStroke = false,
    textStrokeColor = '#000000', textLetterSpacing = 0,
    textBg = 'none', textBgColor = '#000000', textBgOpacity = 50,
  } = settings

  const hasText = textContent.trim().length > 0

  return (
    <div className="controls">

      {/* ── Tab bar ── */}
      <div className="controls__tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`controls__tab${tab === t.id ? ' controls__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

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

          <div className="controls__row">
            <label className="controls__label">Square crop</label>
            <Toggle on={cropSquare} onChange={v => onUpdate('cropSquare', v)} label="Toggle square crop"/>
          </div>
          <div className="controls__row">
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
              >
                {mode.label}
              </button>
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

          {grainAmount > 0 && (
            <>
              <div className="controls__row controls__row--spaced">
                <label className="controls__label" htmlFor="variability-slider">Variability</label>
                <span className="controls__value">
                  {grainVariability === 0 ? 'Uniform' : `${grainVariability}%`}
                </span>
              </div>
              <input id="variability-slider" type="range" min={0} max={100} step={1}
                value={grainVariability} onChange={e => onUpdate('grainVariability', Number(e.target.value))} />
            </>
          )}
        </section>
      )}

      {/* ── Text / Type ── */}
      {tab === 'text' && (
        <section className="controls__section" aria-label="Text overlay">
          <textarea
            className="controls__textarea"
            placeholder="Add text…"
            value={textContent}
            onChange={e => onUpdate('textContent', e.target.value)}
            rows={2}
            spellCheck={false}
          />

          {hasText && (
            <>
              {/* Font family */}
              <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
                role="radiogroup" aria-label="Font family">
                {FONTS.map(f => (
                  <button key={f.id} role="radio" aria-checked={textFont === f.id}
                    className={`controls__seg-btn${textFont === f.id ? ' controls__seg-btn--active' : ''}`}
                    style={{ fontFamily: f.id }}
                    onClick={() => onUpdate('textFont', f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Bold / Italic / Alignment */}
              <div className="controls__text-row">
                <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(2, 1fr)', flex: '0 0 auto', width: 80 }}
                  role="group" aria-label="Font style">
                  <button
                    className={`controls__seg-btn${textBold ? ' controls__seg-btn--active' : ''}`}
                    style={{ fontWeight: 700 }}
                    onClick={() => onUpdate('textBold', !textBold)}
                    aria-pressed={textBold}
                  >B</button>
                  <button
                    className={`controls__seg-btn${textItalic ? ' controls__seg-btn--active' : ''}`}
                    style={{ fontStyle: 'italic' }}
                    onClick={() => onUpdate('textItalic', !textItalic)}
                    aria-pressed={textItalic}
                  >I</button>
                </div>
                <div className="controls__seg controls__seg--fill"
                  style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
                  role="radiogroup" aria-label="Text alignment">
                  {ALIGNS.map(a => (
                    <button key={a.id} role="radio" aria-checked={textAlign === a.id}
                      className={`controls__seg-btn${textAlign === a.id ? ' controls__seg-btn--active' : ''}`}
                      onClick={() => onUpdate('textAlign', a.id)}
                    >{a.label}</button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="controls__row">
                <label className="controls__label" htmlFor="text-size-slider">Size</label>
                <span className="controls__value">{textSize}</span>
              </div>
              <input id="text-size-slider" type="range" min={20} max={300} step={2}
                value={textSize} onChange={e => onUpdate('textSize', Number(e.target.value))} />

              {/* Opacity */}
              <div className="controls__row">
                <label className="controls__label" htmlFor="text-opacity-slider">Opacity</label>
                <span className="controls__value">{textOpacity}%</span>
              </div>
              <input id="text-opacity-slider" type="range" min={10} max={100} step={1}
                value={textOpacity} onChange={e => onUpdate('textOpacity', Number(e.target.value))} />

              {/* Letter Spacing */}
              <div className="controls__row">
                <label className="controls__label" htmlFor="text-spacing-slider">Spacing</label>
                <span className="controls__value">{textLetterSpacing === 0 ? 'Normal' : `${textLetterSpacing}px`}</span>
              </div>
              <input id="text-spacing-slider" type="range" min={-5} max={40} step={1}
                value={textLetterSpacing} onChange={e => onUpdate('textLetterSpacing', Number(e.target.value))} />

              <div className="controls__divider controls__divider--inset"/>

              {/* Color + Effects row */}
              <div className="controls__text-row">
                <label className="controls__color-swatch" style={{ background: textColor }}
                  title="Text color" aria-label="Text color">
                  <input type="color" value={textColor}
                    onChange={e => onUpdate('textColor', e.target.value)} />
                </label>

                <div className="controls__effects-row">
                  <button
                    className={`controls__effect-btn${textShadow ? ' controls__effect-btn--active' : ''}`}
                    onClick={() => onUpdate('textShadow', !textShadow)}
                    aria-pressed={textShadow}
                  >Shadow</button>
                  <button
                    className={`controls__effect-btn${textStroke ? ' controls__effect-btn--active' : ''}`}
                    onClick={() => onUpdate('textStroke', !textStroke)}
                    aria-pressed={textStroke}
                  >Outline</button>
                </div>
              </div>

              {/* Stroke color (only when stroke is on) */}
              {textStroke && (
                <div className="controls__color-row controls__color-row--active">
                  <label className="controls__color-swatch" style={{ background: textStrokeColor }}
                    title="Outline color" aria-label="Outline color">
                    <input type="color" value={textStrokeColor}
                      onChange={e => onUpdate('textStrokeColor', e.target.value)} />
                  </label>
                  <span className="controls__color-hint">Outline color</span>
                </div>
              )}

              <div className="controls__divider controls__divider--inset"/>

              {/* Text background */}
              <div className="controls__row">
                <label className="controls__label">Background</label>
              </div>
              <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
                role="radiogroup" aria-label="Text background style">
                {TEXT_BG_MODES.map(m => (
                  <button key={m.id} role="radio" aria-checked={textBg === m.id}
                    className={`controls__seg-btn${textBg === m.id ? ' controls__seg-btn--active' : ''}`}
                    onClick={() => onUpdate('textBg', m.id)}
                  >{m.label}</button>
                ))}
              </div>

              {textBg !== 'none' && (
                <>
                  <div className="controls__color-row controls__color-row--active">
                    <label className="controls__color-swatch" style={{ background: textBgColor }}
                      title="Background color" aria-label="Background color">
                      <input type="color" value={textBgColor}
                        onChange={e => onUpdate('textBgColor', e.target.value)} />
                    </label>
                    <span className="controls__color-hint" style={{ flex: 1 }}>BG color</span>
                    <span className="controls__value" style={{ fontSize: 11 }}>{textBgOpacity}%</span>
                  </div>
                  <input type="range" min={10} max={100} step={1}
                    value={textBgOpacity} onChange={e => onUpdate('textBgOpacity', Number(e.target.value))}
                    aria-label="Background opacity" />
                </>
              )}

              <p className="controls__hint" style={{ textAlign: 'center', marginTop: 0 }}>
                Tap text on canvas to reposition
              </p>
            </>
          )}
        </section>
      )}

    </div>
  )
}
