import { useSettings } from '../../state/settingsStore.js'
import { Section, Divider } from '../../ui/Section/Section.jsx'
import Slider from '../../ui/Slider/Slider.jsx'
import Toggle from '../../ui/Toggle/Toggle.jsx'

export default function GrainPanel() {
  const { grainAmount, grainVariability, grainSpread, grainMonochrome, set } = useSettings()
  return (
    <Section label="Grain">
      <Slider id="grain-slider" label="Amount" value={grainAmount} min={0} max={100}
        format={v => v === 0 ? 'Off' : `${v}%`} onChange={set('grainAmount')} />

      <Slider id="variability-slider" label="Variability" value={grainVariability} min={0} max={100} spaced
        format={v => v === 0 ? 'Uniform' : `${v}%`} onChange={set('grainVariability')} />

      <Slider id="spread-slider" label="Spread" value={grainSpread} min={0} max={100} spaced
        format={v => v === 0 ? 'Off' : `${v}%`} onChange={set('grainSpread')} />

      <Divider inset />

      <div className="controls__row">
        <label className="controls__label">Monochrome</label>
        <Toggle checked={grainMonochrome} onChange={set('grainMonochrome')} label="Toggle monochrome grain" />
      </div>
    </Section>
  )
}
