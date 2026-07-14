// Pointer-drag hook for moving a canvas node by its header. Reads zoom live from
// the store (not React state) so a 60fps drag never re-renders the surface.

import { useCallback, useRef } from 'react'
import type React from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import type { Point } from '../../../../shared/canvas-node'
import { viewDeltaToCanvas } from './canvas-interaction-math'

export function useCanvasNodeDrag(
  store: UseBoundStore<StoreApi<CanvasStore>>,
  nodeId: string
): (e: React.PointerEvent) => void {
  const start = useRef<{ clientX: number; clientY: number; origin: Point } | null>(null)

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
      start.current = { clientX: e.clientX, clientY: e.clientY, origin: node.origin }

      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent): void => {
        const s = start.current
        if (!s) {
          return
        }
        const delta = viewDeltaToCanvas(
          ev.clientX - s.clientX,
          ev.clientY - s.clientY,
          store.getState().zoomLevel
        )
        store.getState().moveNode(nodeId, { x: s.origin.x + delta.x, y: s.origin.y + delta.y })
      }
      const onUp = (ev: PointerEvent): void => {
        start.current = null
        el.releasePointerCapture(ev.pointerId)
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
      }
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
    },
    [store, nodeId]
  )
}
