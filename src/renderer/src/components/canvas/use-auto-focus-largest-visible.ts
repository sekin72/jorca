// When the matching setting is enabled, keep focus on the canvas node that
// occupies the most visible area of the viewport as the user pans and zooms.
// Debounced + rAF-batched so it has negligible cost. Ported from Cate's
// useAutoFocusLargestVisible.

import { useEffect } from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { focusedNodeId } from '../../store/canvas/canvas-selection-model'

/** Minimum fraction of the viewport a node must cover before it can claim focus.
 *  Prevents flicker when a tiny sliver of a panel peeks into view. */
const MIN_COVERAGE_FRACTION = 0.01

/** Debounce after the last pan/zoom/node mutation before recomputing — short
 *  enough to feel responsive, long enough that continuous panning doesn't cause
 *  per-frame focus churn. */
const RECOMPUTE_DEBOUNCE_MS = 120

export function useAutoFocusLargestVisible(
  store: UseBoundStore<StoreApi<CanvasStore>>,
  enabled: boolean
): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    let debounceTimer: number | null = null
    let rafId: number | null = null
    let disposed = false
    // The id we most recently set via auto-focus, to distinguish our own focus
    // change from a manual user click.
    let autoSetId: string | null = null
    // A manual click into a different node latches here; auto-focus stands down
    // until that node is no longer visible enough to claim focus, then resumes.
    let overrideId: string | null = null

    const compute = (): void => {
      rafId = null
      if (disposed) {
        return
      }
      const state = store.getState()
      const { nodes, viewportOffset, zoomLevel, containerSize } = state
      const currentFocused = focusedNodeId(state)
      // Don't collapse a deliberate multi-selection (focusNode reduces it to one).
      if (state.selection.length > 1) {
        return
      }
      if (containerSize.width <= 0 || containerSize.height <= 0 || zoomLevel <= 0) {
        return
      }

      const viewLeft = -viewportOffset.x / zoomLevel
      const viewTop = -viewportOffset.y / zoomLevel
      const viewWidth = containerSize.width / zoomLevel
      const viewHeight = containerSize.height / zoomLevel
      const viewRight = viewLeft + viewWidth
      const viewBottom = viewTop + viewHeight
      const viewArea = viewWidth * viewHeight
      if (viewArea <= 0) {
        return
      }

      let bestId: string | null = null
      let bestArea = 0
      let overrideArea = 0
      let overrideStillExists = false

      for (const id in nodes) {
        const n = nodes[id]
        if (!n || n.animationState === 'exiting') {
          continue
        }
        if (id === overrideId) {
          overrideStillExists = true
        }
        const ix = Math.max(n.origin.x, viewLeft)
        const iy = Math.max(n.origin.y, viewTop)
        const ir = Math.min(n.origin.x + n.size.width, viewRight)
        const ib = Math.min(n.origin.y + n.size.height, viewBottom)
        const iw = ir - ix
        const ih = ib - iy
        if (iw <= 0 || ih <= 0) {
          continue
        }
        const area = iw * ih
        if (id === overrideId) {
          overrideArea = area
        }
        if (area > bestArea) {
          bestArea = area
          bestId = id
        }
      }

      // Honor a manual override while the clicked node keeps a meaningful
      // on-screen footprint; release it once it's panned/zoomed away or removed.
      if (overrideId) {
        if (!overrideStillExists || overrideArea < viewArea * MIN_COVERAGE_FRACTION) {
          overrideId = null
        } else {
          return
        }
      }

      if (!bestId || bestArea < viewArea * MIN_COVERAGE_FRACTION || bestId === currentFocused) {
        return
      }
      autoSetId = bestId
      store.getState().focusNode(bestId)
    }

    const schedule = (): void => {
      if (debounceTimer != null) {
        window.clearTimeout(debounceTimer)
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null
        if (rafId != null) {
          cancelAnimationFrame(rafId)
        }
        rafId = requestAnimationFrame(compute)
      }, RECOMPUTE_DEBOUNCE_MS)
    }

    const seed = store.getState()
    let prevOffset = seed.viewportOffset
    let prevZoom = seed.zoomLevel
    let prevNodes = seed.nodes
    let prevSize = seed.containerSize
    let prevFocused = focusedNodeId(seed)

    const unsubscribe = store.subscribe((s) => {
      // A focus change we didn't originate = the user clicked a node. Latch it
      // as an override until that node leaves the viewport.
      const focused = focusedNodeId(s)
      if (focused !== prevFocused) {
        if (focused && focused !== autoSetId) {
          overrideId = focused
        }
        prevFocused = focused
      }
      if (
        s.viewportOffset !== prevOffset ||
        s.zoomLevel !== prevZoom ||
        s.nodes !== prevNodes ||
        s.containerSize !== prevSize
      ) {
        prevOffset = s.viewportOffset
        prevZoom = s.zoomLevel
        prevNodes = s.nodes
        prevSize = s.containerSize
        schedule()
      }
    })

    // Run once so toggling the setting on takes effect immediately.
    schedule()

    return () => {
      disposed = true
      unsubscribe()
      if (debounceTimer != null) {
        window.clearTimeout(debounceTimer)
      }
      if (rafId != null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [store, enabled])
}
