import { useSettings } from '../../state/settingsStore.js'
import { Section, Divider } from '../../ui/Section/Section.jsx'
import Slider from '../../ui/Slider/Slider.jsx'
import Segmented from '../../ui/Segmented/Segmented.jsx'
import Swatch from '../../ui/Swatch/Swatch.jsx'
import Icon from '../../ui/Icon/Icon.jsx'

const BG_MODES = [
  { id: 'average',       label: 'Match' },
  { id: 'contrast',      label: 'Contrast' },
  { id: 'complementary', label: 'Pop' },
  { id: 'frosted',       label: 'Frosted' },
]

const signed = v => v > 0 ? `+${v}` : `${v}`

export default function BackgroundPanel({ pickMode, onPickMode }) {
  const {
    bgMode, bgColor = '#ffffff', blurAmount,
    frostBrightness = -15, frostContrast = 0, frostSaturation = 60, frostVibrance = 0,
    set, update,
  } = useSettings()

  return (
    <Section label="Background">
      <Segmented options={BG_MODES} value={bgMode} onChange={set('bgMode')} ariaLabel="Background style" />

      <div className={`controls__color-row${bgMode === 'color' ? ' controls__color-row--active' : ''}`}>
        <Swatch color={bgColor} title="Choose custom color" label="Custom background color"
          onChange={hex => { update('bgColor', hex); update('bgMode', 'color') }} />
        <button
          className={`controls__eyedropper${pickMode ? ' controls__eyedropper--active' : ''}`}
          onClick={onPickMode} aria-label="Pick color from image" aria-pressed={pickMode}
        >
          <Icon name="eyedropper" />
        </button>
        <span className="controls__color-hint">
          {pickMode ? 'Tap image to pick' : (bgMode === 'color' ? bgColor : 'Custom')}
        </span>
      </div>

      {bgMode === 'frosted' && (
        <>
          <Slider id="blur-slider" label="Blur" value={blurAmount} min={10} max={240} step={2} spaced
            format={v => `${v}px`} onChange={set('blurAmount')} />

          <Divider inset />

          <Slider id="frost-brightness" label="Brightness" value={frostBrightness} min={-100} max={200}
            format={v => `${signed(v)}%`} onChange={set('frostBrightness')} />

          <Slider id="frost-contrast" label="Contrast" value={frostContrast} min={-100} max={200}
            format={v => `${signed(v)}%`} onChange={set('frostContrast')} />

          <Slider id="frost-saturation" label="Saturation" value={frostSaturation} min={-100} max={300}
            format={v => `${signed(v)}%`} onChange={set('frostSaturation')} />

          <Slider id="frost-vibrance" label="Vibrance" value={frostVibrance} min={0} max={200}
            format={v => v === 0 ? 'Off' : `+${v}%`} onChange={set('frostVibrance')} />
        </>
      )}
    </Section>
  )
}
