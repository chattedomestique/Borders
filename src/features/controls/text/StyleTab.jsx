import Slider from '../../../ui/Slider/Slider.jsx'
import Segmented from '../../../ui/Segmented/Segmented.jsx'

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

/** Style sub-tab: font, weight/alignment, size, opacity, letter-spacing. */
export default function StyleTab({ selectedLayer, ul }) {
  return (
    <>
      <Segmented
        options={FONTS} value={selectedLayer.font} onChange={v => ul('font', v)}
        columns={3} ariaLabel="Font family"
        optionStyle={f => ({ fontFamily: f.id })}
      />

      <div className="controls__text-row">
        <div className="controls__seg" style={{ gridTemplateColumns: 'repeat(2, 1fr)', flex: '0 0 auto', width: 80 }}>
          <button className={`controls__seg-btn${selectedLayer.bold ? ' controls__seg-btn--active' : ''}`}
            style={{ fontWeight: 700 }} onClick={() => ul('bold', !selectedLayer.bold)}
            aria-pressed={selectedLayer.bold}>B</button>
          <button className={`controls__seg-btn${selectedLayer.italic ? ' controls__seg-btn--active' : ''}`}
            style={{ fontStyle: 'italic' }} onClick={() => ul('italic', !selectedLayer.italic)}
            aria-pressed={selectedLayer.italic}>I</button>
        </div>
        <Segmented
          options={ALIGNS} value={selectedLayer.align} onChange={v => ul('align', v)}
          columns={4} fill
        />
      </div>

      <Slider id="text-size-slider" label="Size" value={selectedLayer.size} min={20} max={300} step={2}
        onChange={v => ul('size', v)} />

      <Slider id="text-opacity-slider" label="Opacity" value={selectedLayer.opacity} min={10} max={100}
        format={v => `${v}%`} onChange={v => ul('opacity', v)} />

      <Slider id="text-spacing-slider" label="Spacing" value={selectedLayer.letterSpacing} min={-5} max={40}
        format={v => v === 0 ? 'Normal' : `${v}px`} onChange={v => ul('letterSpacing', v)} />
    </>
  )
}
