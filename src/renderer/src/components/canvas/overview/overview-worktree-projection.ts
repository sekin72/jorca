// Pure projection of one worktree's canvas geometry into a lightweight,
// read-only shape the Overview surface can draw as a tile — node boxes and their
// bounding box, no live panes. Fed from the live canvas store when a worktree is
// mounted, else from the persisted canvasByWorktree snapshot (Step 7). See
// docs/canvas-workspace.md Phase 2.

import type { Point, Rect, Size } from '../../../../../shared/canvas-node'

export type OverviewNodeKind = 'terminal' | 'editor' | 'browser' | 'other'

export type OverviewNodeBox = {
  id: string
  panelId: string
  /** Node geometry in the worktree's own canvas coordinates. */
  rect: Rect
  kind: OverviewNodeKind
}

export type WorktreeProjection = {
  worktreeId: string
  label: string
  nodeBoxes: OverviewNodeBox[]
  /** Bounding box of all nodes in canvas coordinates; zero-size when empty. */
  bbox: Rect
  nodeCount: number
}

/** Minimal geometry shape shared by the live store (CanvasNodeState) and the
 *  persisted snapshot (PersistedCanvasNode). */
export type ProjectionGeometry = {
  nodes: Record<string, { panelId: string; origin: Point; size: Size }>
}

const EMPTY_BBOX: Rect = { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } }

/** Bounding box that encloses every node; EMPTY_BBOX when there are none. */
export function computeNodesBbox(nodes: readonly { origin: Point; size: Size }[]): Rect {
  if (nodes.length === 0) {
    return EMPTY_BBOX
  }
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const n of nodes) {
    minX = Math.min(minX, n.origin.x)
    minY = Math.min(minY, n.origin.y)
    maxX = Math.max(maxX, n.origin.x + n.size.width)
    maxY = Math.max(maxY, n.origin.y + n.size.height)
  }
  return { origin: { x: minX, y: minY }, size: { width: maxX - minX, height: maxY - minY } }
}

export type FitTransform = {
  /** canvas-units → px scale factor. */
  scale: number
  /** px offset that centers the scaled bbox inside the target box. */
  offsetX: number
  offsetY: number
}

/** Fit a bbox into an inner box (with the given padding), centered. Never
 *  upscales past `maxScale` so a tiny single-node canvas doesn't blow up. */
export function computeFitTransform(
  bbox: Rect,
  innerWidth: number,
  innerHeight: number,
  padding: number,
  maxScale = 1
): FitTransform {
  const availW = Math.max(0, innerWidth - padding * 2)
  const availH = Math.max(0, innerHeight - padding * 2)
  const bw = bbox.size.width
  const bh = bbox.size.height
  if (bw <= 0 || bh <= 0 || availW <= 0 || availH <= 0) {
    return { scale: 1, offsetX: padding, offsetY: padding }
  }
  const scale = Math.min(maxScale, availW / bw, availH / bh)
  const offsetX = padding + (availW - bw * scale) / 2 - bbox.origin.x * scale
  const offsetY = padding + (availH - bh * scale) / 2 - bbox.origin.y * scale
  return { scale, offsetX, offsetY }
}

export function projectWorktreeCanvas(
  worktreeId: string,
  label: string,
  geometry: ProjectionGeometry,
  resolveKind: (panelId: string) => OverviewNodeKind
): WorktreeProjection {
  const nodeBoxes: OverviewNodeBox[] = Object.entries(geometry.nodes).map(([id, node]) => ({
    id,
    panelId: node.panelId,
    rect: { origin: node.origin, size: node.size },
    kind: resolveKind(node.panelId)
  }))
  return {
    worktreeId,
    label,
    nodeBoxes,
    bbox: computeNodesBbox(nodeBoxes.map((b) => b.rect)),
    nodeCount: nodeBoxes.length
  }
}
