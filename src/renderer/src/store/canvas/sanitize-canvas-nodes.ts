// Defensive guard for canvas geometry loaded from persisted session state.
// Persisted node data can be corrupt, half-written, or from an older schema, and
// the restore path seeds the store directly from it — a single node missing
// `size`/`origin` would otherwise crash the whole canvas render (CanvasNode reads
// node.size.width). Repair what we safely can; drop only the unrecoverable.

import type { CanvasNodeId, CanvasNodeState, Point, Size } from '../../../../shared/canvas-node'

// Generic recovery geometry — a mid-size default comfortably above any minimum.
const FALLBACK_SIZE: Size = { width: 640, height: 400 }
const FALLBACK_ORIGIN: Point = { x: 0, y: 0 }

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function isValidPoint(p: unknown): p is Point {
  return (
    !!p && typeof p === 'object' && isFiniteNumber((p as Point).x) && isFiniteNumber((p as Point).y)
  )
}

export function isValidSize(s: unknown): s is Size {
  return (
    !!s &&
    typeof s === 'object' &&
    isFiniteNumber((s as Size).width) &&
    (s as Size).width > 0 &&
    isFiniteNumber((s as Size).height) &&
    (s as Size).height > 0
  )
}

export type SanitizeResult = {
  nodes: Record<CanvasNodeId, CanvasNodeState>
  /** Ids of nodes kept but with one or more repaired fields. */
  repaired: string[]
  /** Keys of nodes dropped as unrecoverable. */
  dropped: string[]
}

function repair<T>(valid: boolean, value: T, fallback: T): T {
  return valid ? value : fallback
}

/** Validate and repair a `canvasNodes` map read from persisted state. Never
 *  throws; returns a clean map plus what was changed. */
export function sanitizeLoadedCanvasNodes(
  raw: Record<string, unknown> | null | undefined
): SanitizeResult {
  const nodes: Record<CanvasNodeId, CanvasNodeState> = {}
  const repaired: string[] = []
  const dropped: string[] = []
  if (!raw || typeof raw !== 'object') {
    return { nodes, repaired, dropped }
  }

  // Backfill missing z-order/creation counters past the highest valid ones, so
  // repaired nodes stack on top and keep a stable creation order.
  let nextZ = 0
  let nextC = 0
  for (const value of Object.values(raw)) {
    if (!value || typeof value !== 'object') {
      continue
    }
    const { zOrder, creationIndex } = value as Partial<CanvasNodeState>
    if (isFiniteNumber(zOrder)) {
      nextZ = Math.max(nextZ, zOrder + 1)
    }
    if (isFiniteNumber(creationIndex)) {
      nextC = Math.max(nextC, creationIndex + 1)
    }
  }

  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') {
      dropped.push(key)
      continue
    }
    const v = value as Partial<CanvasNodeState>
    if (typeof v.panelId !== 'string' || !v.panelId) {
      dropped.push(key)
      continue
    }

    let touched =
      !isValidPoint(v.origin) ||
      !isValidSize(v.size) ||
      !isFiniteNumber(v.zOrder) ||
      !isFiniteNumber(v.creationIndex)

    const node: CanvasNodeState = {
      ...(v as CanvasNodeState),
      id: key,
      panelId: v.panelId,
      origin: repair(isValidPoint(v.origin), v.origin as Point, { ...FALLBACK_ORIGIN }),
      size: repair(isValidSize(v.size), v.size as Size, { ...FALLBACK_SIZE }),
      zOrder: repair(isFiniteNumber(v.zOrder), v.zOrder as number, nextZ++),
      creationIndex: repair(isFiniteNumber(v.creationIndex), v.creationIndex as number, nextC++)
    }

    // A maximized node carries pre-maximize geometry that restore code reads; if
    // malformed, drop it back to a normal node rather than risk a second crash.
    if (node.preMaximizeOrigin != null && !isValidPoint(node.preMaximizeOrigin)) {
      delete node.preMaximizeOrigin
      touched = true
    }
    if (node.preMaximizeSize != null && !isValidSize(node.preMaximizeSize)) {
      delete node.preMaximizeSize
      touched = true
    }

    // color renders straight into CSS — drop anything that isn't a plain hex.
    if (node.color != null && !/^#[0-9a-f]{6}$/i.test(node.color)) {
      delete node.color
      touched = true
    }

    nodes[key] = node
    if (touched) {
      repaired.push(key)
    }
  }

  return { nodes, repaired, dropped }
}
