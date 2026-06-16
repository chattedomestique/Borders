import { useRef, useReducer, useCallback } from 'react'

/**
 * Undo/redo history for a single state object (the editor settings).
 *
 * Rapid changes are coalesced into one history step: while you drag a slider
 * we update the present immediately for live preview, but only commit a single
 * boundary once you've been idle for COALESCE_MS. Structural actions (add /
 * remove layer, color pick, double-tap reset) commit immediately as their own
 * discrete step via `set(updater, { immediate: true })`.
 *
 * State lives in refs (synchronous) so undo/redo never races React's async
 * setState; a reducer bump triggers re-renders.
 */
const COALESCE_MS = 450
const MAX_DEPTH = 100

export function useHistory(initial) {
  const present = useRef(initial)
  const past = useRef([])
  const future = useRef([])
  const base = useRef(initial)   // present value at the start of the current burst
  const timer = useRef(null)
  const [, bump] = useReducer(x => x + 1, 0)

  // Push the burst's starting value onto the undo stack if it actually changed.
  const commitBoundary = useCallback(() => {
    if (present.current === base.current) return
    past.current.push(base.current)
    if (past.current.length > MAX_DEPTH) past.current.shift()
    future.current = []
    base.current = present.current
  }, [])

  const set = useCallback((updater, { immediate = false } = {}) => {
    const next = typeof updater === 'function' ? updater(present.current) : updater
    if (next === present.current) return

    if (immediate) {
      if (timer.current) { clearTimeout(timer.current); timer.current = null }
      commitBoundary()            // close any pending slider burst first
      present.current = next
      commitBoundary()            // then commit this change as its own step
      bump()
      return
    }

    present.current = next
    bump()
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { timer.current = null; commitBoundary(); bump() }, COALESCE_MS)
  }, [commitBoundary])

  const undo = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    commitBoundary()
    if (past.current.length === 0) return
    future.current.push(present.current)
    present.current = past.current.pop()
    base.current = present.current
    bump()
  }, [commitBoundary])

  const redo = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    commitBoundary()
    if (future.current.length === 0) return
    past.current.push(present.current)
    present.current = future.current.pop()
    base.current = present.current
    bump()
  }, [commitBoundary])

  const reset = useCallback((value) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    past.current = []
    future.current = []
    present.current = value
    base.current = value
    bump()
  }, [])

  return {
    settings: present.current,
    set,
    undo,
    redo,
    reset,
    canUndo: past.current.length > 0 || present.current !== base.current,
    canRedo: future.current.length > 0,
  }
}
