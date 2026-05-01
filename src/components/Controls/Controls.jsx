import './Controls.css'

const BG_MODES = [
  { id: 'average',       label: 'Average' },
  { id: 'contrast',      label: 'Contrast' },
  { id: 'complementary', label: 'Complement' },
  { id: 'frosted',       label: 'Frosted' },
]

export default function Controls({ settings, onUpdate, pickMode, onPickMode }) {
  const { borderThickness, bgMode, bgColor = '#ffffff', blurAmount, cornerRadius, cropSquare,
          showMedia, grainAmount, grainVariability } = settings

  return (
    <div className="controls">
      {/* Border Thickness */}
      <section className="controls__section" aria-label="Border thickness">
        <div className="controls__row">
          <label className="controls__label" htmlFor="border-slider">Border</label>
          <span className="controls__value">{borderThickness}px</span>
        </div>
        <input
          id="border-slider"
          type="range"
          min={0}
          max={400}
          step={1}
          value={borderThickness}
          onChange={e => onUpdate('borderThickness', Number(e.target.value))}
          aria-valuenow={borderThickness}
          aria-valuemin={0}
          aria-valuemax={400}
        />
      </section>

      <div className="controls__divider"/>

      {/* Background Mode */}
      <section className="controls__section" aria-label="Background style">
        <p className="controls__label">Background</p>
        <div className="controls__seg" role="radiogroup" aria-label="Background style">
          {BG_MODES.map(mode => (
            <button
              key={mode.id}
              role="radio"
              aria-checked={bgMode === mode.id}
              className={`controls__seg-btn${bgMode === mode.id ? ' controls__seg-btn--active' : ''}`}
              onClick={() => onUpdate('bgMode', mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Custom color row */}
        <div className={`controls__color-row${bgMode === 'color' ? ' controls__color-row--active' : ''}`}>
          <label
            className="controls__color-swatch"
            style={{ background: bgColor }}
            title="Choose custom color"
            aria-label="Custom background color"
          >
            <input
              type="color"
              value={bgColor}
              onChange={e => { onUpdate('bgColor', e.target.value); onUpdate('bgMode', 'color') }}
            />
          </label>
          <button
            className={`controls__eyedropper${pickMode ? ' controls__eyedropper--active' : ''}`}
            onClick={onPickMode}
            aria-label="Pick color from image"
            aria-pressed={pickMode}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
            </svg>
          </button>
          <span className="controls__color-hint">
            {pickMode ? 'Tap the image to pick' : (bgMode === 'color' ? bgColor : 'Custom')}
          </span>
        </div>
      </section>

      {bgMode === 'frosted' && (
        <>
          <div className="controls__divider"/>
          <section className="controls__section" aria-label="Blur amount">
            <div className="controls__row">
              <label className="controls__label" htmlFor="blur-slider">Blur</label>
              <span className="controls__value">{blurAmount}px</span>
            </div>
            <input
              id="blur-slider"
              type="range"
              min={10}
              max={240}
              step={2}
              value={blurAmount}
              onChange={e => onUpdate('blurAmount', Number(e.target.value))}
              aria-valuenow={blurAmount}
              aria-valuemin={10}
              aria-valuemax={240}
            />
          </section>
        </>
      )}

      <div className="controls__divider"/>

      {/* Grain */}
      <section className="controls__section" aria-label="Grain">
        <div className="controls__row">
          <label className="controls__label" htmlFor="grain-slider">Grain</label>
          <span className="controls__value">
            {grainAmount === 0 ? 'Off' : `${grainAmount}%`}
          </span>
        </div>
        <input
          id="grain-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={grainAmount}
          onChange={e => onUpdate('grainAmount', Number(e.target.value))}
          aria-valuenow={grainAmount}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </section>

      {grainAmount > 0 && (
        <>
          <div className="controls__divider"/>
          <section className="controls__section" aria-label="Grain variability">
            <div className="controls__row">
              <label className="controls__label" htmlFor="variability-slider">Variability</label>
              <span className="controls__value">
                {grainVariability === 0 ? 'Uniform' : `${grainVariability}%`}
              </span>
            </div>
            <input
              id="variability-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={grainVariability}
              onChange={e => onUpdate('grainVariability', Number(e.target.value))}
              aria-valuenow={grainVariability}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </section>
        </>
      )}

      <div className="controls__divider"/>

      {/* Corner Radius */}
      <section className="controls__section" aria-label="Corner radius">
        <div className="controls__row">
          <label className="controls__label" htmlFor="radius-slider">Corners</label>
          <span className="controls__value">
            {cornerRadius === 0 ? 'Square' : cornerRadius === 100 ? 'Round' : `${cornerRadius}%`}
          </span>
        </div>
        <input
          id="radius-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={cornerRadius}
          onChange={e => onUpdate('cornerRadius', Number(e.target.value))}
          aria-valuenow={cornerRadius}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </section>

      <div className="controls__divider"/>

      {/* Square Crop */}
      <section className="controls__section" aria-label="Crop mode">
        <div className="controls__row">
          <span className="controls__label">Square crop</span>
          <button
            className={`controls__toggle${cropSquare ? ' controls__toggle--on' : ''}`}
            onClick={() => onUpdate('cropSquare', !cropSquare)}
            role="switch"
            aria-checked={cropSquare}
            aria-label="Toggle square crop"
          >
            <span className="controls__toggle-thumb"/>
          </button>
        </div>
        <p className="controls__hint">
          {cropSquare ? 'Media cropped to square' : 'Original aspect ratio kept'}
        </p>
      </section>

      <div className="controls__divider"/>

      {/* Show Media */}
      <section className="controls__section" aria-label="Media visibility">
        <div className="controls__row">
          <span className="controls__label">Show photo</span>
          <button
            className={`controls__toggle${showMedia ? ' controls__toggle--on' : ''}`}
            onClick={() => onUpdate('showMedia', !showMedia)}
            role="switch"
            aria-checked={showMedia}
            aria-label="Toggle photo visibility"
          >
            <span className="controls__toggle-thumb"/>
          </button>
        </div>
        <p className="controls__hint">
          {showMedia ? 'Photo visible over background' : 'Background only'}
        </p>
      </section>
    </div>
  )
}
