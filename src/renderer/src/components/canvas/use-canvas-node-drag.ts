// Pointer-drag hook for moving a canvas node by its header. Reads zoom live from
// the store (not React state) so a 60fps drag never re-renders the surface.

import { useCallback, useRef } from 'react'
import type React from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import type { Point, Size, Rect, SnapGuideLine } from '../../../../shared/canvas-node'
import { viewDeltaToCanvas } from './canvas-interaction-math'
import { snapNodeDrag } from './canvas-snap'
import { magneticDock, applyDock, DOCK_DWELL_SPEED } from './canvas-magnetic-dock'
import { useAppStore } from '../../store'

// Screen-pixel travel before a header press becomes a drag. Below it the press
// stays a click/double-click (so double-click-to-maximize and plain clicks work).
const DRAG_THRESHOLD = 4

export function useCanvasNodeDrag(
  store: UseBoundStore<StoreApi<CanvasStore>>,
  nodeId: string
): (e: React.PointerEvent) => void {
  const start = useRef<{
    clientX: number
    clientY: number
    origin: Point
    size: Size
    others: Rect[]
    pointerId: number
    dragging: boolean
    captured: boolean
  } | null>(null)
  // Last pointer sample, for the dwell/velocity gate on magnetic docking.
  const lastMove = useRef<{ t: number; x: number; y: number } | null>(null)

  return useCallback(
    (e: React.PointerEvent) => {
      // Left button only; ignore presses that originate on an interactive control.
      if (e.button !== 0) {
        return
      }
      if ((e.target as HTMLElement).closest('[data-canvas-node-control]')) {
        return
      }
      const node = store.getState().nodes[nodeId]
      if (!node) {
        return
      }
      e.stopPropagation()
      store.getState().focusNode(nodeId)
      // Neighbor geometry is fixed for the duration of a single-node drag, so
      // collect the other nodes' rects once here for snap-guide alignment.
      const others: Rect[] = []
      for (const [id, n] of Object.entries(store.getState().nodes)) {
        if (id !== nodeId) {
          others.push({ origin: n.origin, size: n.size })
        }
      }
      start.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        origin: node.origin,
        size: node.size,
        others,
        pointerId: e.pointerId,
        dragging: false,
        captured: false
      }
      lastMove.current = null

      const el = e.currentTarget as HTMLElement

      const onMove = (ev: PointerEvent): void => {
        const s = start.current
        if (!s) {
          return
        }
        // Treat sub-threshold travel as a potential click / double-click: don't
        // move the node or capture the pointer, so header dblclick-to-maximize
        // and plain clicks fire cleanly and a still press never nudges the node.
        if (!s.dragging) {
          if (Math.hypot(ev.clientX - s.clientX, ev.clientY - s.clientY) < DRAG_THRESHOLD) {
            return
          }
          s.dragging = true
          el.setPointerCapture(s.pointerId)
          s.captured = true
        }
        // Pointer speed (screen px/ms). Magnetic docking only engages once the
        // drag slows below the dwell threshold, so a fast fling passes a neighbor
        // by instead of getting grabbed.
        const now = performance.now()
        let speed = Infinity
        const lm = lastMove.current
        if (lm && now > lm.t) {
          speed = Math.hypot(ev.clientX - lm.x, ev.clientY - lm.y) / (now - lm.t)
        }
        lastMove.current = { t: now, x: ev.clientX, y: ev.clientY }

        const delta = viewDeltaToCanvas(
          ev.clientX - s.clientX,
          ev.clientY - s.clientY,
          store.getState().zoomLevel
        )
        const raw = { x: s.origin.x + delta.x, y: s.origin.y + delta.y }
        // Read settings live so toggling Alt / settings mid-drag responds at once.
        // Alt = free move (no grid snap, no dock).
        if (ev.altKey) {
          store.getState().moveNode(nodeId, raw)
          store.getState().setSnapGuides([])
          return
        }
        const settings = useAppStore.getState().settings
        const snapEnabled = settings?.canvasSnapToGrid ?? true
        const dockEnabled = settings?.canvasMagneticDock ?? true
        let result: { origin: Point; guides: SnapGuideLine[] } = snapEnabled
          ? snapNodeDrag(raw, s.size, s.others)
          : { origin: raw, guides: [] }
        if (dockEnabled && speed < DOCK_DWELL_SPEED) {
          result = applyDock(result, magneticDock(raw, s.size, s.others))
        }
        store.getState().moveNode(nodeId, result.origin)
        store.getState().setSnapGuides(result.guides)
      }
      const onUp = (ev: PointerEvent): void => {
        const s = start.current
        start.current = null
        store.getState().setSnapGuides([])
        if (s?.captured) {
          el.releasePointerCapture(ev.pointerId)
        }
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
      }
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
    },
    [store, nodeId]
  )
}
