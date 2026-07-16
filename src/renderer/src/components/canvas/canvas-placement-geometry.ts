// Pure geometry helpers for the placement recommender (canvas-placement.ts).
// Ported from Cate's placement.ts / layoutEngine.ts. No store or React deps.

import type {
  CanvasNodeId,
  CanvasNodeState,
  Point,
  Size,
  Rect
} from '../../../../shared/canvas-node'
import { CANVAS_GRID_SIZE, snapScalarToGrid } from './canvas-snap'

/** Axis-aligned overlap test (touching edges do not count as overlap). */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.origin.x + a.size.width <= b.origin.x ||
    b.origin.x + b.size.width <= a.origin.x ||
    a.origin.y + a.size.height <= b.origin.y ||
    b.origin.y + b.size.height <= a.origin.y
  )
}

/** Grow a rect by `m` on every side. */
export function inflateRect(r: Rect, m: number): Rect {
  return {
    origin: { x: r.origin.x - m, y: r.origin.y - m },
    size: { width: r.size.width + m * 2, height: r.size.height + m * 2 }
  }
}

/** True when rect `a` is fully contained within rect `b` (with a 0.5 slack). */
export function rectContains(b: Rect, a: Rect): boolean {
  return (
    a.origin.x >= b.origin.x - 0.5 &&
    a.origin.y >= b.origin.y - 0.5 &&
    a.origin.x + a.size.width <= b.origin.x + b.size.width + 0.5 &&
    a.origin.y + a.size.height <= b.origin.y + b.size.height + 0.5
  )
}

/** Split free rect `f` by obstacle `obs` into up to four maximal remainder slabs. */
export function splitFree(f: Rect, obs: Rect): Rect[] {
  if (!rectsOverlap(f, obs)) {
    return [f]
  }
  const fL = f.origin.x
  const fT = f.origin.y
  const fR = fL + f.size.width
  const fB = fT + f.size.height
  const oL = obs.origin.x
  const oT = obs.origin.y
  const oR = oL + obs.size.width
  const oB = oT + obs.size.height
  const out: Rect[] = []
  if (oL > fL) {
    out.push({ origin: { x: fL, y: fT }, size: { width: oL - fL, height: f.size.height } })
  }
  if (oR < fR) {
    out.push({ origin: { x: oR, y: fT }, size: { width: fR - oR, height: f.size.height } })
  }
  if (oT > fT) {
    out.push({ origin: { x: fL, y: fT }, size: { width: f.size.width, height: oT - fT } })
  }
  if (oB < fB) {
    out.push({ origin: { x: fL, y: oB }, size: { width: f.size.width, height: fB - oB } })
  }
  return out
}

/** Drop too-small / subsumed rects and cap the count for speed. */
export function pruneFreeRects(rects: Rect[], minW: number, minH: number): Rect[] {
  const out: Rect[] = []
  for (const r of rects) {
    if (r.size.width < minW || r.size.height < minH) {
      continue
    }
    if (out.some((o) => rectContains(o, r))) {
      continue
    }
    for (let i = out.length - 1; i >= 0; i--) {
      if (rectContains(r, out[i])) {
        out.splice(i, 1)
      }
    }
    out.push(r)
    if (out.length >= 80) {
      break
    }
  }
  return out
}

/** Decompose `area` minus `obstacles` into maximal empty rectangles. */
export function freeRectangles(area: Rect, obstacles: Rect[], minW: number, minH: number): Rect[] {
  let free: Rect[] = [area]
  for (const obs of obstacles) {
    free = pruneFreeRects(
      free.flatMap((f) => splitFree(f, obs)),
      minW,
      minH
    )
  }
  return free
}

/** Sorted alignment lines implied by the existing windows: each edge plus edge ± gap. */
export function deriveGuides(
  nodes: Record<CanvasNodeId, CanvasNodeState>,
  gap: number
): { xs: number[]; ys: number[] } {
  const xs = new Set<number>()
  const ys = new Set<number>()
  for (const n of Object.values(nodes)) {
    const l = n.origin.x
    const r = n.origin.x + n.size.width
    const t = n.origin.y
    const b = n.origin.y + n.size.height
    for (const x of [l, r]) {
      xs.add(x)
      xs.add(x + gap)
      xs.add(x - gap)
    }
    for (const y of [t, b]) {
      ys.add(y)
      ys.add(y + gap)
      ys.add(y - gap)
    }
  }
  return { xs: [...xs].sort((a, b) => a - b), ys: [...ys].sort((a, b) => a - b) }
}

/** Original size of the window adjacent to `f` with the longest shared edge run
 *  (tie-broken by nearest center to `rankAt`), minus the gap on both sides. */
export function matchedNeighborSize(
  f: Rect,
  inflated: Rect[],
  gap: number,
  rankAt: Point,
  eps = 1
): Size | null {
  const fL = f.origin.x
  const fR = fL + f.size.width
  const fT = f.origin.y
  const fB = fT + f.size.height
  let bestRun = 0
  let bestDist = Infinity
  let best: Size | null = null
  for (const o of inflated) {
    const oL = o.origin.x
    const oR = oL + o.size.width
    const oT = o.origin.y
    const oB = oT + o.size.height
    const vAdjacent = Math.abs(oB - fT) <= eps || Math.abs(oT - fB) <= eps
    const hAdjacent = Math.abs(oR - fL) <= eps || Math.abs(oL - fR) <= eps
    let run = 0
    let dist = 0
    if (vAdjacent) {
      run = Math.min(oR, fR) - Math.max(oL, fL)
      dist = Math.abs((oL + oR) / 2 - rankAt.x)
    } else if (hAdjacent) {
      run = Math.min(oB, fB) - Math.max(oT, fT)
      dist = Math.abs((oT + oB) / 2 - rankAt.y)
    } else {
      continue
    }
    if (run <= eps) {
      continue
    }
    if (run > bestRun + eps || (Math.abs(run - bestRun) <= eps && dist < bestDist)) {
      bestRun = run
      bestDist = dist
      best = { width: oR - oL - 2 * gap, height: oB - oT - 2 * gap }
    }
  }
  return best
}

/** Snap the low edge of a fixed-size span to the nearest alignment guide (via either
 *  edge) when within `tol`; otherwise snap the low edge to the grid. Returns a number. */
export function snapAxisToGuides(
  lo: number,
  size: number,
  guides: readonly number[],
  tol: number,
  grid = CANVAS_GRID_SIZE
): number {
  let best = snapScalarToGrid(lo, grid)
  let bestErr = tol
  const hi = lo + size
  for (const g of guides) {
    const eLo = Math.abs(g - lo)
    if (eLo < bestErr) {
      bestErr = eLo
      best = g
    }
    const eHi = Math.abs(g - hi)
    if (eHi < bestErr) {
      bestErr = eHi
      best = g - size
    }
  }
  return best
}
