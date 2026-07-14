// Pure geometry for canvas node drag/resize. Kept separate from the React hooks
// so the math is unit-testable without a DOM. View-space pixel deltas are
// converted to canvas-space by dividing by the zoom level.

import type { Point, Size } from '../../../../shared/canvas-node'

/** Smallest a node may be resized to (canvas units). */
export const MIN_NODE_SIZE: Size = { width: 240, height: 160 }

/** The eight resize handles, named by the edge/corner they pull. */
export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/** Convert a view-space (screen px) delta to canvas-space at the given zoom. */
export function viewDeltaToCanvas(viewDx: number, viewDy: number, zoom: number): Point {
  return { x: viewDx / zoom, y: viewDy / zoom }
}

function pullsLeft(h: ResizeHandle): boolean {
  return h === 'w' || h === 'nw' || h === 'sw'
}
function pullsRight(h: ResizeHandle): boolean {
  return h === 'e' || h === 'ne' || h === 'se'
}
function pullsTop(h: ResizeHandle): boolean {
  return h === 'n' || h === 'ne' || h === 'nw'
}
function pullsBottom(h: ResizeHandle): boolean {
  return h === 's' || h === 'se' || h === 'sw'
}

/**
 * Apply a canvas-space drag on `handle` to a node's geometry. West/north edges
 * move the origin as well as the size; every result is clamped so neither
 * dimension drops below `min` (clamping a west/north edge also stops the origin
 * so the far edge stays put).
 */
export function resizeGeometry(
  origin: Point,
  size: Size,
  handle: ResizeHandle,
  canvasDx: number,
  canvasDy: number,
  min: Size = MIN_NODE_SIZE
): { origin: Point; size: Size } {
  let { x, y } = origin
  let { width, height } = size

  if (pullsRight(handle)) {
    width = Math.max(min.width, size.width + canvasDx)
  } else if (pullsLeft(handle)) {
    width = Math.max(min.width, size.width - canvasDx)
    x = origin.x + (size.width - width)
  }

  if (pullsBottom(handle)) {
    height = Math.max(min.height, size.height + canvasDy)
  } else if (pullsTop(handle)) {
    height = Math.max(min.height, size.height - canvasDy)
    y = origin.y + (size.height - height)
  }

  return { origin: { x, y }, size: { width, height } }
}
