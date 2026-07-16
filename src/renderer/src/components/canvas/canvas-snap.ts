// Pure snapping geometry for canvas node drags. Kept separate from the React
// hooks so it is unit-testable without a DOM. Grid snapping is the fallback;
// neighbor-edge/center alignment ("snap guides") takes precedence within
// tolerance so a dragged node lines up with the boxes the user actually sees.

import type { Point, Size, Rect, SnapGuideLine } from '../../../../shared/canvas-node'
import { CANVAS_GRID_SIZE } from '../../../../shared/canvas-node'

export type { SnapGuideAxis, SnapGuideLine } from '../../../../shared/canvas-node'
export { CANVAS_GRID_SIZE } from '../../../../shared/canvas-node'

/** How close (canvas units) a moving edge/center must be to a neighbor's
 *  edge/center before it snaps to it and draws an alignment guide. */
export const SNAP_GUIDE_TOLERANCE = 6

export function snapScalarToGrid(v: number, grid = CANVAS_GRID_SIZE): number {
  return Math.round(v / grid) * grid
}

export function snapPointToGrid(p: Point, grid = CANVAS_GRID_SIZE): Point {
  return { x: snapScalarToGrid(p.x, grid), y: snapScalarToGrid(p.y, grid) }
}

/** The three alignment lines a span implies along one axis: low edge, center,
 *  high edge. */
function edgesAlong(lo: number, extent: number): [number, number, number] {
  return [lo, lo + extent / 2, lo + extent]
}

/**
 * Snap one axis of a dragged node. Prefers aligning the moving span's low edge,
 * center, or high edge to any neighbor edge within `tolerance`; otherwise snaps
 * the low edge to the grid. Returns the snapped low-edge position plus the guide
 * line to draw (canvas space), or `null` guide when it fell back to the grid.
 */
export function snapAxis(
  lo: number,
  extent: number,
  neighborEdges: readonly number[],
  tolerance = SNAP_GUIDE_TOLERANCE,
  grid = CANVAS_GRID_SIZE
): { lo: number; guide: number | null } {
  const mine = edgesAlong(lo, extent)
  let bestErr = tolerance
  let bestLo: number | null = null
  let bestGuide: number | null = null
  for (const nb of neighborEdges) {
    for (const myEdge of mine) {
      const err = Math.abs(nb - myEdge)
      if (err < bestErr) {
        bestErr = err
        bestLo = lo + (nb - myEdge) // shift so this edge lands exactly on nb
        bestGuide = nb
      }
    }
  }
  if (bestLo !== null) {
    return { lo: bestLo, guide: bestGuide }
  }
  return { lo: snapScalarToGrid(lo, grid), guide: null }
}

/**
 * Snap a dragged node's origin. Neighbor-alignment guides beat the grid within
 * tolerance; when no neighbor is near an axis, that axis snaps to the grid.
 * Callers bypass this entirely (raw origin, no guides) when Alt is held.
 */
/**
 * Snap a resize delta so the moving edge(s) land on the grid while the opposite
 * (fixed) edge stays put. The handle string names the edges it pulls: any 'e'/'w'
 * moves a vertical edge, any 'n'/'s' a horizontal one. Returns the adjusted delta.
 */
export function snapResizeDelta(
  origin: Point,
  size: Size,
  handle: string,
  dx: number,
  dy: number,
  grid = CANVAS_GRID_SIZE
): { dx: number; dy: number } {
  let sdx = dx
  let sdy = dy
  if (handle.includes('e')) {
    const edge = origin.x + size.width
    sdx = snapScalarToGrid(edge + dx, grid) - edge
  } else if (handle.includes('w')) {
    const edge = origin.x
    sdx = snapScalarToGrid(edge + dx, grid) - edge
  }
  if (handle.includes('s')) {
    const edge = origin.y + size.height
    sdy = snapScalarToGrid(edge + dy, grid) - edge
  } else if (handle.includes('n')) {
    const edge = origin.y
    sdy = snapScalarToGrid(edge + dy, grid) - edge
  }
  return { dx: sdx, dy: sdy }
}

export function snapNodeDrag(
  rawOrigin: Point,
  size: Size,
  others: readonly Rect[],
  opts?: { grid?: number; guides?: boolean; tolerance?: number }
): { origin: Point; guides: SnapGuideLine[] } {
  const grid = opts?.grid ?? CANVAS_GRID_SIZE
  const tolerance = opts?.tolerance ?? SNAP_GUIDE_TOLERANCE
  const guidesEnabled = opts?.guides ?? true

  const xEdges: number[] = []
  const yEdges: number[] = []
  if (guidesEnabled) {
    for (const o of others) {
      xEdges.push(...edgesAlong(o.origin.x, o.size.width))
      yEdges.push(...edgesAlong(o.origin.y, o.size.height))
    }
  }

  const x = snapAxis(rawOrigin.x, size.width, xEdges, tolerance, grid)
  const y = snapAxis(rawOrigin.y, size.height, yEdges, tolerance, grid)

  const guides: SnapGuideLine[] = []
  if (x.guide !== null) {
    guides.push({ axis: 'x', position: x.guide })
  }
  if (y.guide !== null) {
    guides.push({ axis: 'y', position: y.guide })
  }
  return { origin: { x: x.lo, y: y.lo }, guides }
}
