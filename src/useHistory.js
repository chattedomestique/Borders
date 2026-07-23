import { useReducer, useRef, useCallback } from 'react'

/**
 * Undo/redo history for a single state object (the editor settings).
 *
 * Rapid changes are coalesced into one history step: while you drag a slider we
 * update the present immediately for live preview, but only commit a single
 * boundary once you've been idle for COALESCE_MS. Structural actions (add /
 * remove layer, color pick, double-tap reset) commit immediately as their own
 * discrete step via `set(updater, { immediate: true })`.
 *
 * §8.2: the history lives in reducer STATE, and `settings` / `canUndo` /
 * `canRedo` are derived from that state during render — never read from refs
 * during render, which is a staleness bug the react-hooks/refs rule catches.
 * The only ref here is the coalescing timer, touched solely from callbacks.
 */
const COALESCE_MS = 450
const MAX_DEPTH = 100

const cap = (arr) => (arr.length > MAX_DEPTH ? arr.slice(arr.length - MAX_DEPTH) : arr)

function reducer(state, action) {
  const { present, past, base } = state
  switch (action.type) {
    case 'set': {
      const next = typeof action.updater === 'function' ? action.updater(present) : action.updater
      if (next === present) return state
      if (action.immediate) {
        // Close any pending slider burst, then commit this change as its own step.
        const withBurst = present !== base ? cap([...past, base]) : past
        return { present: next, past: cap([...withBurst, present]), future: [], base: next }
      }
      // Coalescing: move the present now; the boundary commits after the idle
      // timeout (which is also where `future` gets cleared).
      return { ...state, present: next }
    }
    case 'commit':
      if (present === base) return state
      return { ...state, past: cap([...past, base]), future: [], base: present }
    case 'undo': {
      const s = present !== base ? reducer(state, { type: 'commit' }) : state
      if (s.past.length === 0) return s
      const prev = s.past[s.past.length - 1]
      return { present: prev, past: s.past.slice(0, -1), future: [...s.future, s.present], base: prev }
    }
    case 'redo': {
      const s = present !== base ? reducer(state, { type: 'commit' }) : state
      if (s.future.length === 0) return s
      const nxt = s.future[s.future.length - 1]
      return { present: nxt, past: [...s.past, s.present], future: s.future.slice(0, -1), base: nxt }
    }
    case 'reset':
      return { present: action.value, past: [], future: [], base: action.value }
    default:
      return state
  }
}

export function useHistory(initial) {
  const [state, dispatch] = useReducer(reducer, {
    present: initial, past: [], future: [], base: initial,
  })
  const timer = useRef(null)
  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }

  const set = useCallback((updater, { immediate = false } = {}) => {
    if (immediate) { clearTimer(); dispatch({ type: 'set', updater, immediate: true }); return }
    dispatch({ type: 'set', updater })
    clearTimer()
    timer.current = setTimeout(() => { timer.current = null; dispatch({ type: 'commit' }) }, COALESCE_MS)
  }, [])

  const undo = useCallback(() => { clearTimer(); dispatch({ type: 'undo' }) }, [])
  const redo = useCallback(() => { clearTimer(); dispatch({ type: 'redo' }) }, [])
  const reset = useCallback((value) => { clearTimer(); dispatch({ type: 'reset', value }) }, [])

  return {
    settings: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0 || state.present !== state.base,
    canRedo: state.future.length > 0,
  }
}
