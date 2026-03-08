import './Controls.css'

const BG_MODES = [
  { id: 'average',       label: 'Average',       desc: 'Most dominant color' },
  { id: 'contrast',      label: 'Contrast',       desc: 'High contrast tone' },
  { id: 'complementary', label: 'Complement',     desc: 'Complementary color' },
  { id: 'frosted',       label: 'Frosted Glass',  desc: 'Blurred background' },
]

export default function Controls({ settings, onUpdate, mediaType }) {
  const { borderThickness, bgMode, blurAmount, cornerRadius, cropSquare } = settings

  return (
    <div className="controls clay">
      {/* Border Thickness */}
      <section className="controls__section" aria-label="Border thickness">
        <div className="controls__row">
          <label className="controls__label" htmlFor="border-slider">
            Border
          </label>
          <span className="controls__value">{borderThickness}px</span>
        </div>
        <input
          id="border-slider"
          type="range"
          min={0}
          max={200}
          step={1}
          value={borderThickness}
          onChange={e => onUpdate('borderThickness', Number(e.target.value))}
          aria-valuenow={borderThickness}
          aria-valuemin={0}
          aria-valuemax={200}
        />
      </section>

      <div className="controls__divider"/>

      {/* Background Mode */}
      <section className="controls__section" aria-label="Background style">
        <p className="controls__label controls__label--solo">Background</p>
        <div
          className="controls__bg-grid"
          role="radiogroup"
          aria-label="Background style"
        >
          {BG_MODES.map(mode => (
            <button
              key={mode.id}
              role="radio"
              aria-checked={bgMode === mode.id}
              className={`controls__bg-option${bgMode === mode.id ? ' controls__bg-option--active' : ''}`}
              onClick={() => onUpdate('bgMode', mode.id)}
            >
              <BgIcon mode={mode.id} active={bgMode === mode.id}/>
              <span className="controls__bg-label">{mode.label}</span>
            </button>
          ))}
        </div>
      </section>

      {bgMode === 'frosted' && (
        <>
          <div className="controls__divider"/>
          <section className="controls__section" aria-label="Blur amount">
            <div className="controls__row">
              <label className="controls__label" htmlFor="blur-slider">
                Blur
              </label>
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
          <label className="controls__label" htmlFor="radius-slider">
            Corners
          </label>
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
        <div className="controls__row controls__row--spaced">
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

function BgIcon({ mode, active }) {
  // Use unique gradient IDs per mode to avoid SVG id collisions
  const gid = `cg-${mode}`
  const color = active ? 'white' : `url(#${gid})`
  const size = 28
  const Grad = () => (
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#c084fc"/>
        <stop offset="100%" stopColor="#6366f1"/>
      </linearGradient>
    </defs>
  )
  const bg = active ? 'transparent' : 'rgba(168,85,247,0.08)'

  if (mode === 'frosted') {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <Grad/>
        <rect width="28" height="28" rx="8" fill={bg}/>
        <rect x="4" y="10" width="20" height="8" rx="4" fill={color} fillOpacity="0.4"/>
        <rect x="6" y="12" width="16" height="4" rx="2" fill={color} fillOpacity="0.7"/>
        <rect x="9" y="13" width="10" height="2" rx="1" fill={color}/>
      </svg>
    )
  }

  if (mode === 'average') {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <Grad/>
        <rect width="28" height="28" rx="8" fill={bg}/>
        <circle cx="14" cy="14" r="7" fill={color}/>
        <circle cx="14" cy="14" r="3" fill={active ? 'rgba(255,255,255,0.5)' : 'rgba(168,85,247,0.3)'}/>
      </svg>
    )
  }

  if (mode === 'contrast') {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <Grad/>
        <rect width="28" height="28" rx="8" fill={bg}/>
        <path d="M14 7a7 7 0 1 1 0 14V7z" fill={color}/>
        <path d="M14 7a7 7 0 1 0 0 14V7z" fill={active ? 'rgba(255,255,255,0.25)' : 'rgba(168,85,247,0.2)'}/>
      </svg>
    )
  }

  // complementary
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <Grad/>
      <rect width="28" height="28" rx="8" fill={bg}/>
      <circle cx="11" cy="14" r="5" fill={color}/>
      <circle cx="17" cy="14" r="5" fill={active ? 'rgba(255,255,255,0.45)' : 'rgba(168,85,247,0.35)'}/>
    </svg>
  )
}
