import { ChipStrip, AddChip, LayerChip } from '../../../ui/Chip/Chip.jsx'

/** The always-visible row: an Add chip followed by one chip per text layer. */
export default function LayerStrip({ textLayers, selectedLayerId, onSelectLayer, onAddLayer, onRemoveLayer }) {
  return (
    <ChipStrip>
      <AddChip onClick={onAddLayer} label="Add text layer">Add</AddChip>
      {textLayers.map(layer => (
        <LayerChip
          key={layer.id}
          active={layer.id === selectedLayerId}
          onSelect={() => onSelectLayer(layer.id)}
          onRemove={() => onRemoveLayer(layer.id)}
        >
          {layer.content.trim() ? layer.content.trim().slice(0, 12) : 'Empty'}
        </LayerChip>
      ))}
    </ChipStrip>
  )
}
