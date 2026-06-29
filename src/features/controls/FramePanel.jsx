import { useSettings } from '../../state/settingsStore.js'
import { Section, Divider } from '../../ui/Section/Section.jsx'
import Slider from '../../ui/Slider/Slider.jsx'
import Toggle from '../../ui/Toggle/Toggle.jsx'
import { ChipStrip, Chip } from '../../ui/Chip/Chip.jsx'
import Icon from '../../ui/Icon/Icon.jsx'

const CROP_RATIOS = [
  { id: 'free', label: 'Free', alt: null  },
  { id: '1:1',  label: '1:1',  alt: null  },
  { id: '4:5',  label: '4:5',  alt: '5:4' },
  { id: '3:4',  label: '3:4',  alt: '4:3' },
  { id: '9:16', label: '9:16', alt: '16:9'},
  { id: '2:3',  label: '2:3',  alt: '3:2' },
]

export default function FramePanel() {
  const { borderThickness, cornerRadius, cropRatio = 'free', showMedia, snapToGrid = true, set, update } = useSettings()

  return (
    <Section label="Frame">
      <Slider id="border-slider" label="Border" value={borderThickness} min={0} max={400}
        format={v => `${v}px`} onChange={set('borderThickness')} />

      <Slider id="radius-slider" label="Corners" value={cornerRadius} min={0} max={100} spaced
        format={v => v === 0 ? 'Square' : v === 100 ? 'Round' : `${v}%`} onChange={set('cornerRadius')} />

      <Divider inset />

      <label className="controls__label" style={{ marginBottom: 4 }}>Crop</label>
      <ChipStrip>
        {CROP_RATIOS.map(r => {
          const isPortrait  = cropRatio === r.id
          const isLandscape = r.alt !== null && cropRatio === r.alt
          const isActive    = isPortrait || isLandscape
          const displayLabel = isLandscape ? r.alt : r.id
          const canFlip = r.alt !== null
          const handleClick = () => {
            if (!isActive) { update('cropRatio', r.id) }
            else if (canFlip) { update('cropRatio', isPortrait ? r.alt : r.id) }
          }
          return (
            <Chip key={r.id} active={isActive} onClick={handleClick}
              trailing={isActive && canFlip && <Icon name="flip" className="controls__ratio-flip" />}>
              {displayLabel}
            </Chip>
          )
        })}
      </ChipStrip>

      <div className="controls__row controls__row--spaced">
        <label className="controls__label">Show photo</label>
        <Toggle checked={showMedia} onChange={set('showMedia')} label="Toggle photo visibility" />
      </div>

      <div className="controls__row controls__row--spaced">
        <label className="controls__label">Snap to grid</label>
        <Toggle checked={snapToGrid} onChange={set('snapToGrid')} label="Toggle grid snapping for text" />
      </div>
    </Section>
  )
}
