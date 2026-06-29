import { useState } from 'react'
import { useSettings } from '../../../state/settingsStore.js'
import { Section } from '../../../ui/Section/Section.jsx'
import Segmented from '../../../ui/Segmented/Segmented.jsx'
import LayerStrip from './LayerStrip.jsx'
import ContentTab from './ContentTab.jsx'
import StyleTab from './StyleTab.jsx'
import EffectsTab from './EffectsTab.jsx'

const TEXT_SUBTABS = [
  { id: 'content', label: 'Content' },
  { id: 'style',   label: 'Style'   },
  { id: 'fx',      label: 'FX'      },
]

export default function TextPanel({ selectedLayerId, onSelectLayer, onAddLayer, onRemoveLayer }) {
  const { textLayers = [], updateLayer } = useSettings()
  const [sub, setSub] = useState('content')

  const selectedLayer = textLayers.find(l => l.id === selectedLayerId) ?? null
  const ul = (key, value) => selectedLayer && updateLayer(selectedLayer.id, key, value)

  const noLayerHint = (
    <p className="controls__hint" style={{ textAlign: 'center', padding: '4px 0 2px' }}>
      {textLayers.length === 0 ? 'Tap Add to create a text layer.' : 'Tap a layer above to edit it.'}
    </p>
  )

  return (
    <Section label="Text layers">
      <LayerStrip
        textLayers={textLayers}
        selectedLayerId={selectedLayerId}
        onSelectLayer={onSelectLayer}
        onAddLayer={onAddLayer}
        onRemoveLayer={onRemoveLayer}
      />

      <Segmented options={TEXT_SUBTABS} value={sub} onChange={setSub}
        columns={3} role="tablist" itemRole="tab" />

      {sub === 'content' && (selectedLayer ? <ContentTab selectedLayer={selectedLayer} ul={ul} /> : noLayerHint)}
      {sub === 'style'   && (selectedLayer ? <StyleTab   selectedLayer={selectedLayer} ul={ul} /> : noLayerHint)}
      {sub === 'fx'      && (selectedLayer ? <EffectsTab selectedLayer={selectedLayer} ul={ul} /> : noLayerHint)}
    </Section>
  )
}
