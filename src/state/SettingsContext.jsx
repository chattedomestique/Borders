import { useCallback, useMemo, useRef } from 'react'
import { useHistory } from '../useHistory.js'
import { settingsReducer } from './settingsReducer.js'
import { DEFAULT_SETTINGS, DEFAULT_LAYER } from './defaults.js'
import { SettingsContext } from './settingsStore.js'

/**
 * Single source of editor settings, backed by the undo/redo coalescing history.
 * Panels read what they need via `useSettings()` instead of receiving an
 * `onUpdate` prop drilled through three component layers.
 *
 * - `update(key, value)` / `set(key)` → coalesced edits (sliders, segments…).
 * - `addLayer` / `removeLayer` / `pickColor` → immediate, discrete history steps.
 * - `updateLayer(id, key, value)` → coalesced (matches per-glyph drag feel).
 */
export function SettingsProvider({ children }) {
  const { settings, set: histSet, undo, redo, reset, canUndo, canRedo } = useHistory(DEFAULT_SETTINGS)

  const update = useCallback((key, value) => {
    histSet(prev => settingsReducer(prev, { type: 'set', key, value }))
  }, [histSet])

  // Memoize one stable handler per key so primitives don't re-render on every
  // edit and `set('x')` can be passed straight as an onChange.
  const setCache = useRef(new Map())
  const set = useCallback((key) => {
    let handler = setCache.current.get(key)
    if (!handler) {
      handler = (value) => update(key, value)
      setCache.current.set(key, handler)
    }
    return handler
  }, [update])

  const updateLayer = useCallback((id, key, value) => {
    histSet(prev => settingsReducer(prev, { type: 'updateLayer', id, key, value }))
  }, [histSet])

  const addLayer = useCallback(() => {
    const id = `text-${Date.now()}`
    histSet(prev => settingsReducer(prev, { type: 'addLayer', layer: DEFAULT_LAYER(id, prev.textLayers.length) }),
      { immediate: true })
    return id
  }, [histSet])

  const removeLayer = useCallback((id) => {
    histSet(prev => settingsReducer(prev, { type: 'removeLayer', id }), { immediate: true })
  }, [histSet])

  const pickColor = useCallback((hex) => {
    histSet(prev => settingsReducer(prev, { type: 'pickColor', value: hex }), { immediate: true })
  }, [histSet])

  const resetSettings = useCallback((value = DEFAULT_SETTINGS) => reset(value), [reset])

  const value = useMemo(() => ({
    settings,
    ...settings,
    update, set, updateLayer, addLayer, removeLayer, pickColor,
    undo, redo, reset: resetSettings, canUndo, canRedo,
  }), [settings, update, set, updateLayer, addLayer, removeLayer, pickColor, undo, redo, resetSettings, canUndo, canRedo])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
