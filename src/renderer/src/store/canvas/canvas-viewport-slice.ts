// Viewport slice — zoom, pan offset, container size, and canvas<->view
// coordinate conversion. worldTransform is scale(z) then translate(offset), so a
// canvas point p maps to p*z + offset in view space.

import { ZOOM_MIN, ZOOM_MAX } from '../../../../shared/canvas-node'
import type { CanvasGet, CanvasSet, CanvasStoreActions } from './canvas-store-types'
import { useAppStore } from '../../store'

type LayoutGeometry = {
  padTop: number
  padBottom: number
  padLeft: number
  padRight: number
  gap: number
}

function readLayoutGeometry(): LayoutGeometry {
  const s = useAppStore.getState().settings
  return {
    padTop: s?.canvasPaddingTop ?? 40,
    padBottom: s?.canvasPaddingBottom ?? 50,
    padLeft: s?.canvasPaddingLeft ?? 50,
    padRight: s?.canvasPaddingRight ?? 50,
    gap: s?.canvasNodeGap ?? 10
  }
}

type ViewportActions = Pick<
  CanvasStoreActions,
  | 'setZoom'
  | 'setViewportOffset'
  | 'setZoomAndOffset'
  | 'setContainerSize'
  | 'zoomAroundPoint'
  | 'canvasToView'
  | 'viewToCanvas'
  | 'viewFrame'
  | 'zoomToFit'
>

function clampZoom(z: number): number {
  return Math.min(Math.max(z, ZOOM_MIN), ZOOM_MAX)
}

export function createViewportSlice(set: CanvasSet, get: CanvasGet): ViewportActions {
  return {
    setZoom(level) {
      set({ zoomLevel: clampZoom(level) })
    },

    setViewportOffset(offset) {
      set({ viewportOffset: offset })
    },

    setZoomAndOffset(zoom, offset) {
      set({ zoomLevel: clampZoom(zoom), viewportOffset: offset })
    },

    setContainerSize(size) {
      set({ containerSize: size })
    },

    zoomAroundPoint(newZoom, viewPoint) {
      const state = get()
      const clamped = clampZoom(newZoom)
      if (clamped === state.zoomLevel) {
        return
      }
      // Keep the canvas point currently under `viewPoint` fixed under it.
      const canvasPoint = {
        x: (viewPoint.x - state.viewportOffset.x) / state.zoomLevel,
        y: (viewPoint.y - state.viewportOffset.y) / state.zoomLevel
      }
      set({
        zoomLevel: clamped,
        viewportOffset: {
          x: viewPoint.x - canvasPoint.x * clamped,
          y: viewPoint.y - canvasPoint.y * clamped
        }
      })
    },

    canvasToView(point) {
      const { zoomLevel, viewportOffset } = get()
      return {
        x: point.x * zoomLevel + viewportOffset.x,
        y: point.y * zoomLevel + viewportOffset.y
      }
    },

    viewToCanvas(point) {
      const { zoomLevel, viewportOffset } = get()
      return {
        x: (point.x - viewportOffset.x) / zoomLevel,
        y: (point.y - viewportOffset.y) / zoomLevel
      }
    },

    viewFrame(id) {
      const { nodes, zoomLevel } = get()
      const node = nodes[id]
      if (!node) {
        return null
      }
      return {
        origin: get().canvasToView(node.origin),
        size: { width: node.size.width * zoomLevel, height: node.size.height * zoomLevel }
      }
    },

    zoomToFit() {
      const state = get()
      const nodeList = Object.values(state.nodes)
      const cs = state.containerSize
      if (nodeList.length === 0 || cs.width === 0 || cs.height === 0) {
        return
      }

      const settings = useAppStore.getState().settings
      const fitZoom = settings?.canvasFitZoom ?? 1.00
      const { padTop, padBottom, padLeft, padRight } = readLayoutGeometry()

      const minX = Math.min(...nodeList.map((n) => n.origin.x))
      const minY = Math.min(...nodeList.map((n) => n.origin.y))
      const maxX = Math.max(...nodeList.map((n) => n.origin.x + n.size.width))
      const maxY = Math.max(...nodeList.map((n) => n.origin.y + n.size.height))
      const contentW = maxX - minX
      const contentH = maxY - minY
      const availW = cs.width - padLeft - padRight
      const availH = cs.height - padTop - padBottom
      set({
        zoomLevel: fitZoom,
        viewportOffset: {
          x: padLeft + (availW - contentW * fitZoom) / 2 - minX * fitZoom,
          y: padTop + (availH - contentH * fitZoom) / 2 - minY * fitZoom
        }
      })
    }
  }
}
