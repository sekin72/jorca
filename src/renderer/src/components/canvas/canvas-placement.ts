// Placement recommender for the interactive "ghost" picker. Decomposes the free
// space (place area minus existing windows) into empty rectangles and packs
// numbered ghost spots into it nearest-first, sizing each by mirroring an adjacent
// neighbor (uniform tiles), growing to fill useful gaps, else the default size.
// Ported from Cate's placement.ts (recommendPlacements); no store/React deps.

import type {
  CanvasNodeId,
  CanvasNodeState,
  Point,
  Size,
  Rect
} from '../../../../shared/canvas-node'
import { CANVAS_GRID_SIZE, snapScalarToGrid, snapPointToGrid } from './canvas-snap'
import { DEFAULT_NODE_SIZE, findFreePosition } from '../../store/canvas/canvas-node-placement'
import {
  rectsOverlap,
  inflateRect,
  freeRectangles,
  splitFree,
  pruneFreeRects,
  deriveGuides,
  matchedNeighborSize,
  snapAxisToGuides
} from './canvas-placement-geometry'

export type PlacementCandidate = {
  point: Point
  size: Size
}

const PLACEMENT_GAP = 40
const PLACEMENT_MIN_W = 280
const PLACEMENT_MIN_H = 180
const PLACEMENT_MAX_W = 1400
const PLACEMENT_MAX_H = 900
const SNAP_TOL = PLACEMENT_GAP / 2
const FIT_TOL = CANVAS_GRID_SIZE
const USEFUL_MIN_W = 400
const USEFUL_MIN_H = 340
const FILL_AR_FACTOR = 1.6

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** view → canvas: (view - offset) / zoom. */
function viewToCanvasCoords(view: Point, zoom: number, offset: Point): Point {
  return { x: (view.x - offset.x) / zoom, y: (view.y - offset.y) / zoom }
}

export function recommendPlacements(
  nodes: Record<CanvasNodeId, CanvasNodeState>,
  focusedId: CanvasNodeId | null,
  viewport: { offset: Point; zoom: number; containerSize: Size },
  anchor: Point | null,
  max = 6,
  sizeOverride?: Size
): PlacementCandidate[] {
  const grid = CANVAS_GRID_SIZE
  const gap = PLACEMENT_GAP
  const std = sizeOverride ?? DEFAULT_NODE_SIZE

  const { offset, zoom, containerSize } = viewport
  const hasVp = containerSize.width > 0 && containerSize.height > 0
  const vTL = viewToCanvasCoords({ x: 0, y: 0 }, zoom, offset)
  const vBR = viewToCanvasCoords({ x: containerSize.width, y: containerSize.height }, zoom, offset)
  const viewRect: Rect = { origin: vTL, size: { width: vBR.x - vTL.x, height: vBR.y - vTL.y } }
  const viewCenter: Point = {
    x: vTL.x + viewRect.size.width / 2,
    y: vTL.y + viewRect.size.height / 2
  }
  const onScreen = (r: Rect): boolean => hasVp && rectsOverlap(r, viewRect)

  const nodeList = Object.values(nodes)
  const nodeRects: Rect[] = nodeList.map((n) => ({ origin: n.origin, size: n.size }))

  type Raw = { point: Point; size: Size }

  const finalize = (raw: Raw[], rankAt: Point): PlacementCandidate[] => {
    const clear = (rect: Rect, others: Rect[]): boolean =>
      !others.some((r) => rectsOverlap(inflateRect(rect, gap - 1), r))
    const seen = new Set<string>()
    const ranked = raw
      .filter((c) => {
        const k = `${c.point.x},${c.point.y},${c.size.width},${c.size.height}`
        return seen.has(k) ? false : (seen.add(k), true)
      })
      .map((c) => {
        const rect: Rect = { origin: c.point, size: c.size }
        const vis = onScreen(rect)
        const dist = Math.hypot(
          c.point.x + c.size.width / 2 - rankAt.x,
          c.point.y + c.size.height / 2 - rankAt.y
        )
        return { rect, point: c.point, size: c.size, score: (vis ? 0 : 1e9) + dist }
      })
      .sort((a, b) => a.score - b.score)

    const out: PlacementCandidate[] = []
    const taken: Rect[] = []
    for (const c of ranked) {
      if (out.length >= max) {
        break
      }
      if (!clear(c.rect, nodeRects) || !clear(c.rect, taken)) {
        continue
      }
      taken.push(c.rect)
      out.push({ point: c.point, size: c.size })
    }
    if (out.length === 0) {
      const p = snapPointToGrid(findFreePosition(nodes, focusedId, std))
      out.push({ point: p, size: std })
    }
    return out
  }

  const centred = (c: Point): Raw[] => {
    const sized = (w: number, h: number): Size => ({
      width: clamp(snapScalarToGrid(w, grid), PLACEMENT_MIN_W, PLACEMENT_MAX_W),
      height: clamp(snapScalarToGrid(h, grid), PLACEMENT_MIN_H, PLACEMENT_MAX_H)
    })
    const def = std
    const large = sized(std.width * 1.4, std.height * 1.4)
    const compact = sized(std.width * 0.65, std.height * 0.65)
    const tl = snapPointToGrid({ x: c.x - def.width / 2, y: c.y - def.height / 2 })
    return [
      { point: tl, size: def },
      { point: snapPointToGrid({ x: tl.x + def.width + gap, y: tl.y }), size: large },
      { point: snapPointToGrid({ x: tl.x, y: tl.y + def.height + gap }), size: compact }
    ]
  }

  if (nodeList.length === 0) {
    const c = anchor ?? (hasVp ? viewCenter : { x: 100 + std.width / 2, y: 100 + std.height / 2 })
    return finalize(centred(c), c)
  }
  const onScreenNodes = nodeList.filter((n) => onScreen({ origin: n.origin, size: n.size }))
  if (onScreenNodes.length === 0) {
    const c = anchor ?? viewCenter
    return finalize(centred(c), c)
  }

  const focused = (focusedId && nodes[focusedId]) || null
  const focusedOnScreen = !!focused && onScreen({ origin: focused.origin, size: focused.size })
  const pitchX = std.width + gap
  const pitchY = std.height + gap

  let area: Rect
  let rankAt: Point
  if (focusedOnScreen && focused) {
    const mx = pitchX * 2
    const my = pitchY * 2
    area = {
      origin: { x: focused.origin.x - mx, y: focused.origin.y - my },
      size: { width: focused.size.width + mx * 2, height: focused.size.height + my * 2 }
    }
    rankAt = {
      x: focused.origin.x + focused.size.width / 2,
      y: focused.origin.y + focused.size.height / 2
    }
  } else {
    rankAt = anchor ?? viewCenter
    area = viewRect
  }

  const inflated = nodeRects.map((r) => inflateRect(r, gap))
  let free = freeRectangles(area, inflated, PLACEMENT_MIN_W, PLACEMENT_MIN_H)
  const obstacles: Rect[] = [...inflated]
  const guides = deriveGuides(nodes, gap)

  const raw: Raw[] = []
  for (let n = 0; n < max && free.length > 0; n++) {
    let best: { point: Point; size: Size; score: number } | null = null
    for (const f of free) {
      const ix0 = Math.ceil(f.origin.x / grid) * grid
      const ix1 = Math.floor((f.origin.x + f.size.width) / grid) * grid
      const iy0 = Math.ceil(f.origin.y / grid) * grid
      const iy1 = Math.floor((f.origin.y + f.size.height) / grid) * grid
      const availW = ix1 - ix0
      const availH = iy1 - iy0
      if (availW < PLACEMENT_MIN_W || availH < PLACEMENT_MIN_H) {
        continue
      }

      const neighbor = matchedNeighborSize(f, obstacles, gap, rankAt)
      const mirrorFits =
        !!neighbor && availW >= neighbor.width - FIT_TOL && availH >= neighbor.height - FIT_TOL
      let targetW: number
      let targetH: number
      let filled = false
      if (mirrorFits && neighbor) {
        targetW = neighbor.width
        targetH = neighbor.height
      } else if (neighbor) {
        if (availW < USEFUL_MIN_W || availH < USEFUL_MIN_H) {
          continue
        }
        targetW = availW
        targetH = availH
        filled = true
      } else {
        if (availW < std.width - FIT_TOL || availH < std.height - FIT_TOL) {
          continue
        }
        targetW = std.width
        targetH = std.height
      }
      const w = clamp(targetW, PLACEMENT_MIN_W, Math.min(PLACEMENT_MAX_W, availW))
      const h = clamp(targetH, PLACEMENT_MIN_H, Math.min(PLACEMENT_MAX_H, availH))

      if (filled) {
        const ar = w / h
        const defAR = std.width / std.height
        if (ar < defAR / FILL_AR_FACTOR || ar > defAR * FILL_AR_FACTOR) {
          continue
        }
      }

      const point = {
        x: clamp(snapAxisToGuides(rankAt.x - w / 2, w, guides.xs, SNAP_TOL, grid), ix0, ix1 - w),
        y: clamp(snapAxisToGuides(rankAt.y - h / 2, h, guides.ys, SNAP_TOL, grid), iy0, iy1 - h)
      }
      const score = Math.hypot(point.x + w / 2 - rankAt.x, point.y + h / 2 - rankAt.y)
      if (!best || score < best.score) {
        best = { point, size: { width: w, height: h }, score }
      }
    }
    if (!best) {
      break
    }
    raw.push({ point: best.point, size: best.size })
    const placed = inflateRect({ origin: best.point, size: best.size }, gap)
    obstacles.push(placed)
    free = pruneFreeRects(
      free.flatMap((f) => splitFree(f, placed)),
      PLACEMENT_MIN_W,
      PLACEMENT_MIN_H
    )
  }

  return finalize(raw, rankAt)
}
