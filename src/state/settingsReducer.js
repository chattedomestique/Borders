// Single reducer for all editor settings. Every mutation that used to be a
// hand-rolled `setSettings(prev => …)` is now one named action.

export function settingsReducer(state, action) {
  switch (action.type) {
    case 'set':
      return { ...state, [action.key]: action.value }
    case 'addLayer':
      return { ...state, textLayers: [...state.textLayers, action.layer] }
    case 'removeLayer':
      return { ...state, textLayers: state.textLayers.filter(l => l.id !== action.id) }
    case 'updateLayer':
      return {
        ...state,
        textLayers: state.textLayers.map(l =>
          l.id === action.id ? { ...l, [action.key]: action.value } : l),
      }
    case 'pickColor':
      return { ...state, bgColor: action.value, bgMode: 'color' }
    default:
      return state
  }
}
