// Magnetic docking (ported concept from Null Space): while dragging, a window
// clicks *flush against a neighbor's edge* (leaving a gutter), not just onto the
// grid. Neighbors only count if they overlap on the perpendicular axis, so a
// window docks to the one beside it, not one across the canvas. This layers on
// top of grid/alignment snapping (canvas-snap.ts); the drag hook gates it behind
// a dwell/velocity check so it only engages as you slow down on a target.

import type { Point, Size, Rect, SnapGuideLine } from '../../../../shared/canvas-node'

/** Gap left between two docked windows (canvas units). */
export const DOCK_GUTTER = 12
/** Magnet range — larger than the alignment tolerance because docking is
 *  dwell-gated, so a wider pull still feels intentional. */
export const DOCK_TOLERANCE = 14
/** Below this pointer speed (screen px/ms) the magnet engages — "slow down and
 *  pause on a target". A fling stays above it and drags straight past. */
export const DOCK_DWELL_SPEED = 0.4

/** A flush-dock solution for one axis: the snapped low-edge position + the seam
 *  (neighbor edge) to draw a guide at. */
export type AxisDock = { lo: number; guide: number }

export type MagneticDockResult = { x: AxisDock | null; y: AxisDock | null }

type ProjectedRect = { mainLo: number; mainExt: number; perpLo: number; perpExt: number }

function overlaps(aLo: number, aHi: number, bLo: number, bHi: number): boolean {
  return aLo < bHi && bLo < aHi
}

/** Flush-dock the moving span's low OR high edge against a neighbor's opposite
 *  edge (±gutter), among neighbors overlapping on the perpendicular axis. */
function flushDockAxis(
  mainLo: number,
  mainExt: number,
  perpLo: number,
  perpExt: number,
  neighbors: readonly ProjectedRect[],
  gutter: number,
  tolerance: number
): AxisDock | null {
  let bestErr = tolerance
  let best: AxisDock | null = null
  const perpHi = perpLo + perpExt
  for (const nb of neighbors) {
    if (!overlaps(perpLo, perpHi, nb.perpLo, nb.perpLo + nb.perpExt)) {
      continue
    }
    const nbHi = nb.mainLo + nb.mainExt
    // My low edge clicks to the neighbor's high edge + gutter (dock after it).
    const candA = nbHi + gutter
    const errA = Math.abs(mainLo - candA)
    if (errA < bestErr) {
      bestErr = errA
      best = { lo: candA, guide: nbHi }
    }
    // My high edge clicks to the neighbor's low edge − gutter (dock before it).
    const candB = nb.mainLo - gutter - mainExt
    const errB = Math.abs(mainLo - candB)
    if (errB < bestErr) {
      bestErr = errB
      best = { lo: candB, guide: nb.mainLo }
    }
  }
  return best
}

/** Compute per-axis flush docks for a dragged rect against its neighbors. */
export function magneticDock(
  raw: Point,
  size: Size,
  others: readonly Rect[],
  opts?: { gutter?: number; tolerance?: number }
): MagneticDockResult {
  const gutter = opts?.gutter ?? DOCK_GUTTER
  const tolerance = opts?.tolerance ?? DOCK_TOLERANCE
  const xNeighbors = others.map<ProjectedRect>((o) => ({
    mainLo: o.origin.x,
    mainExt: o.size.width,
    perpLo: o.origin.y,
    perpExt: o.size.height
  }))
  const yNeighbors = others.map<ProjectedRect>((o) => ({
    mainLo: o.origin.y,
    mainExt: o.size.height,
    perpLo: o.origin.x,
    perpExt: o.size.width
  }))
  return {
    x: flushDockAxis(raw.x, size.width, raw.y, size.height, xNeighbors, gutter, tolerance),
    y: flushDockAxis(raw.y, size.height, raw.x, size.width, yNeighbors, gutter, tolerance)
  }
}

/** Overlay a dock result on a base snap (grid/alignment) — dock wins per axis,
 *  replacing that axis's origin and guide line. */
export function applyDock(
  base: { origin: Point; guides: SnapGuideLine[] },
  dock: MagneticDockResult
): { origin: Point; guides: SnapGuideLine[] } {
  if (!dock.x && !dock.y) {
    return base
  }
  const origin = { ...base.origin }
  const guides = base.guides.filter((g) => (g.axis === 'x' ? !dock.x : !dock.y))
  if (dock.x) {
    origin.x = dock.x.lo
    guides.push({ axis: 'x', position: dock.x.guide })
  }
  if (dock.y) {
    origin.y = dock.y.lo
    guides.push({ axis: 'y', position: dock.y.guide })
  }
  return { origin, guides }
}
