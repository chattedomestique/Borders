import { Divider } from '../../../ui/Section/Section.jsx'
import Segmented from '../../../ui/Segmented/Segmented.jsx'
import Swatch from '../../../ui/Swatch/Swatch.jsx'

const TEXT_BG_MODES = [
  { id: 'none', label: 'None' },
  { id: 'pill', label: 'Pill' },
  { id: 'rect', label: 'Box'  },
]

/** FX sub-tab: color, shadow/outline, and per-line text background. */
export default function EffectsTab({ selectedLayer, ul }) {
  return (
    <>
      <div className="controls__text-row">
        <Swatch color={selectedLayer.color} title="Text color" label="Text color"
          onChange={hex => ul('color', hex)} />
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
          <Swatch color={selectedLayer.strokeColor} onChange={hex => ul('strokeColor', hex)} />
          <span className="controls__color-hint">Outline color</span>
        </div>
      )}

      <Divider inset />

      <Segmented options={TEXT_BG_MODES} value={selectedLayer.bg} onChange={v => ul('bg', v)}
        columns={3} ariaLabel="Text background" />

      {selectedLayer.bg !== 'none' && (
        <>
          <div className="controls__color-row controls__color-row--active">
            <Swatch color={selectedLayer.bgColor} onChange={hex => ul('bgColor', hex)} />
            <span className="controls__color-hint" style={{ flex: 1 }}>BG color</span>
            <span className="controls__value" style={{ fontSize: 11 }}>{selectedLayer.bgOpacity}%</span>
          </div>
          <input type="range" min={10} max={100} step={1} value={selectedLayer.bgOpacity}
            onChange={e => ul('bgOpacity', Number(e.target.value))} aria-label="Background opacity"/>
        </>
      )}
    </>
  )
}
