// Canvas geometry primitives and the canvas-node model for the infinite-canvas
// workspace (docs/canvas-workspace.md). Ported from Cate's shared canvas types,
// trimmed to the Phase-1 single-panel node (in-node dock trees and cross-project
// node borrowing are deferred — see docs/canvas-workspace.md).
//
// Shared realm: keep this Electron/DOM/Node-free so every realm can import it.

// -----------------------------------------------------------------------------
// Geometry primitives
// -----------------------------------------------------------------------------

export type Point = {
  x: number
  y: number
}

export type Size = {
  width: number
  height: number
}

export type Rect = {
  origin: Point
  size: Size
}

// -----------------------------------------------------------------------------
// Zoom bounds
// -----------------------------------------------------------------------------

export const ZOOM_MIN = 0.3
export const ZOOM_MAX = 3.0
export const ZOOM_DEFAULT = 1.0

// -----------------------------------------------------------------------------
// Canvas node
// -----------------------------------------------------------------------------

/** Opaque string identifier (UUID) for a canvas node. */
export type CanvasNodeId = string

/** Transient animation phase used by the canvas to fade nodes in/out. Loaded
 *  nodes are forced to `idle` on restore so they don't animate on hydrate. */
export type CanvasNodeAnimationState = 'entering' | 'exiting' | 'idle'

/** A free-floating box on a worktree's canvas. In Phase 1 each node hosts a
 *  single panel, identified by `panelId` (a reference to an existing Orca
 *  tab/pane so the terminal/editor keeps its lifecycle). */
export type CanvasNodeState = {
  id: CanvasNodeId
  /** The panel (tab/pane) this node hosts. */
  panelId: string
  origin: Point
  size: Size
  /** Stacking order; higher renders on top. */
  zOrder: number
  /** Monotonic creation counter — stable tiebreaker for arrange/focus order. */
  creationIndex: number
  isPinned?: boolean
  animationState?: CanvasNodeAnimationState
  /** Geometry saved before maximize, so restore returns to the exact box.
   *  Presence of `preMaximizeOrigin` is the "is maximized" signal. */
  preMaximizeOrigin?: Point
  preMaximizeSize?: Size
}

/** True when the node is currently maximized (has saved pre-maximize geometry). */
export function isMaximized(node: CanvasNodeState): boolean {
  return node.preMaximizeOrigin != null
}

// -----------------------------------------------------------------------------
// Persistence — the durable subset of the canvas written to the workspace
// session. Transient fields (animationState, pre-maximize geometry) are dropped
// so a reload restores a stable, idle canvas (docs/canvas-workspace.md §7).
// -----------------------------------------------------------------------------

export type PersistedCanvasNode = {
  id: CanvasNodeId
  panelId: string
  origin: Point
  size: Size
  zOrder: number
  creationIndex: number
  isPinned?: boolean
}

export type PersistedWorktreeCanvas = {
  nodes: Record<CanvasNodeId, PersistedCanvasNode>
  viewportOffset: Point
  zoomLevel: number
}
