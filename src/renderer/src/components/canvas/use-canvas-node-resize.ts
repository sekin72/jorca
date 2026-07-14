// Pointer-drag hook for resizing a canvas node from one of its eight handles.
// Reads zoom live from the store so the resize never re-renders the surface.

import { useCallback, useRef } from 'react'
import type React from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import type { Point, Size } from '../../../../shared/canvas-node'
import { resizeGeometry, viewDeltaToCanvas, type ResizeHandle } from './canvas-interaction-math'

export function useCanvasNodeResize(
  store: UseBoundStore<StoreApi<CanvasStore>>,
  nodeId: string
): (handle: ResizeHandle) => (e: React.PointerEvent) => void {
  const start = useRef<{ clientX: number; clientY: number; origin: Point; size: Size } | null>(null)

  return useCallback(
    (handle: ResizeHandle) => (e: React.PointerEvent) => {
      if (e.button !== 0) {
        return
      }
      const node = store.getState().nodes[nodeId]
      if (!node) {
        return
      }
      e.stopPropagation()
      store.getState().focusNode(nodeId)
      start.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        origin: node.origin,
        size: node.size
      }

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
        const next = resizeGeometry(s.origin, s.size, handle, delta.x, delta.y)
        store.getState().resizeNode(nodeId, next.size, next.origin)
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
