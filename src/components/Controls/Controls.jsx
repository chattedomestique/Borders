import './Controls.css'

const BG_MODES = [
  { id: 'average',       label: 'Average' },
  { id: 'contrast',      label: 'Contrast' },
  { id: 'complementary', label: 'Complement' },
  { id: 'frosted',       label: 'Frosted' },
]

export default function Controls({ settings, onUpdate }) {
  const { borderThickness, bgMode, blurAmount, cornerRadius, cropSquare } = settings

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
        <div
          className="controls__seg"
          role="radiogroup"
          aria-label="Background style"
        >
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
              max={120}
              step={2}
              value={blurAmount}
              onChange={e => onUpdate('blurAmount', Number(e.target.value))}
              aria-valuenow={blurAmount}
              aria-valuemin={10}
              aria-valuemax={120}
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

      {/* Crop Mode */}
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
    </div>
  )
}
