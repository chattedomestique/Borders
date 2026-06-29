// Settings schema defaults. Kept byte-for-byte equivalent to the original
// inline definitions so the rendered output and history behaviour are unchanged.

export const DEFAULT_LAYER = (id, index = 0) => ({
  id,
  content: '',
  font: 'system-ui, -apple-system, sans-serif',
  size: 80,
  color: '#ffffff',
  align: 'center',
  x: 0.5,
  y: Math.min(0.88, 0.4 + index * 0.18),
  bold: false, italic: false, opacity: 100,
  shadow: false, stroke: false, strokeColor: '#000000',
  letterSpacing: 0, bg: 'none', bgColor: '#000000', bgOpacity: 50,
})

export const DEFAULT_SETTINGS = {
  borderThickness: 40,
  bgMode: 'average',
  bgColor: '#ffffff',
  blurAmount: 60,
  frostBrightness: -15, frostContrast: 0, frostSaturation: 60, frostVibrance: 0,
  cornerRadius: 0,
  cropRatio: 'free',
  zoom: 1, panX: 0.5, panY: 0.5,
  showMedia: true,
  grainAmount: 0, grainVariability: 0, grainMonochrome: true, grainSpread: 0,
  textLayers: [],
}
