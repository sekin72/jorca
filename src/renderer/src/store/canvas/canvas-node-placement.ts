// Pure geometry helpers for placing new canvas nodes and default node sizing.

import type { CanvasNodeId, CanvasNodeState, Point, Size } from '../../../../shared/canvas-node'

/** Default size for a freshly spawned node when the caller gives none. */
export const DEFAULT_NODE_SIZE: Size = { width: 720, height: 480 }

/** Offset each cascade step takes when the preferred spot is occupied. */
const CASCADE_STEP = 36
const MAX_CASCADE = 40

export function generateId(): string {
  return crypto.randomUUID()
}

function overlaps(origin: Point, size: Size, node: CanvasNodeState): boolean {
  return (
    origin.x < node.origin.x + node.size.width &&
    origin.x + size.width > node.origin.x &&
    origin.y < node.origin.y + node.size.height &&
    origin.y + size.height > node.origin.y
  )
}

/**
 * Find a spot for a new node. Preference order: an explicit `preferred` point;
 * else cascade down-right from the `anchor` node; else the canvas origin. If the
 * chosen spot overlaps an existing node, cascade by CASCADE_STEP until free (or
 * give up after MAX_CASCADE steps and return the last candidate).
 */
export function findFreePosition(
  nodes: Record<CanvasNodeId, CanvasNodeState>,
  anchorId: CanvasNodeId | null,
  size: Size,
  preferred?: Point
): Point {
  const others = Object.values(nodes)
  let base: Point
  if (preferred) {
    base = { ...preferred }
  } else if (anchorId && nodes[anchorId]) {
    const a = nodes[anchorId]
    base = { x: a.origin.x + CASCADE_STEP, y: a.origin.y + CASCADE_STEP }
  } else {
    base = { x: 0, y: 0 }
  }

  let candidate = base
  for (let i = 0; i < MAX_CASCADE; i++) {
    if (!others.some((n) => overlaps(candidate, size, n))) {
      return candidate
    }
    candidate = { x: candidate.x + CASCADE_STEP, y: candidate.y + CASCADE_STEP }
  }
  return candidate
}
