import FramePanel from './FramePanel.jsx'
import BackgroundPanel from './BackgroundPanel.jsx'
import GrainPanel from './GrainPanel.jsx'
import TextPanel from './text/TextPanel.jsx'
import './Controls.css'

/**
 * Routes the active toolbar tab to its panel. Settings flow through context;
 * only genuinely UI-level state (pick mode, layer selection) is passed in.
 */
export default function Controls({
  tab, pickMode, onPickMode,
  selectedLayerId, onSelectLayer, onAddLayer, onRemoveLayer,
}) {
  if (!tab) return null

  return (
    <div className="controls">
      {tab === 'frame' && <FramePanel />}
      {tab === 'bg'    && <BackgroundPanel pickMode={pickMode} onPickMode={onPickMode} />}
      {tab === 'grain' && <GrainPanel />}
      {tab === 'text'  && (
        <TextPanel
          selectedLayerId={selectedLayerId}
          onSelectLayer={onSelectLayer}
          onAddLayer={onAddLayer}
          onRemoveLayer={onRemoveLayer}
        />
      )}
    </div>
  )
}
