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

/** Canvas-space spacing of the snap/background grid, in canvas units. Shared by
 *  the visual grid, node placement, and the snap-to-grid feature so everything
 *  lines up on the same lattice. */
export const CANVAS_GRID_SIZE = 20

export type SnapGuideAxis = 'x' | 'y'

/** A transient alignment rule drawn while dragging, positioned in canvas space. */
export type SnapGuideLine = {
  axis: SnapGuideAxis
  position: number
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

/** Reserved id for the global Main surface — a single cross-worktree canvas that
 *  borrows live windows from any worktree. Not a real worktree: it has no runtime
 *  of its own and is never in the per-worktree canvas registry. Used as the
 *  persistence key and to distinguish "on Main" from a worktree canvas. */
export const MAIN_SURFACE_ID = '__main-surface__'

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
  /** Main surface only: the worktree that owns this node's panel + runtime. The
   *  pane is worktree-parametric, so it mounts using this id even though the node
   *  lives on the runtime-less Main store (docs/main-surface.md). */
  sourceWorktreeId?: string
  /** Source worktree canvas only: this node's live view has been borrowed onto
   *  Main, so the source renders a non-live placeholder (single-mount invariant).
   *  Transient — re-asserted from the Main store on load, never persisted here. */
  borrowedByMain?: boolean
  /** User-chosen accent for this window (`#rrggbb`) — drives its focus glow and
   *  minimap tint. Absent = default (`--ring`, or the worktree tint on Main). */
  color?: string
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
  /** Main surface persistence only — the worktree to reconnect the pane to on
   *  load. Absent on per-worktree canvas nodes. */
  sourceWorktreeId?: string
  /** User-chosen window accent (`#rrggbb`), persisted so tint survives reload. */
  color?: string
}

export type PersistedWorktreeCanvas = {
  nodes: Record<CanvasNodeId, PersistedCanvasNode>
  viewportOffset: Point
  zoomLevel: number
}

// -----------------------------------------------------------------------------
// Saved layouts — named snapshots of a canvas that can be re-applied to any
// worktree's empty canvas. Unlike the session-persisted canvas (which stores
// tab ids that are ephemeral), a layout stores tab *content* metadata
// (contentType + entityId like a file path) so nodes can be recreated across
// sessions. Terminal tabs spawn fresh PTYs on load (no session restore).
// -----------------------------------------------------------------------------

/** One node's restorable description inside a saved layout. `entityId` is the
 *  backing content reference — a file path for editors, undefined for terminals
 *  (terminals always spawn fresh). `label` is the tab title to reproduce. */
export type CanvasLayoutNode = {
  contentType: 'editor' | 'terminal' | 'browser'
  entityId?: string
  label: string
  origin: Point
  size: Size
  isPinned?: boolean
  /** For browser nodes — the URL to reopen. */
  url?: string
}

export type CanvasLayoutSnapshot = {
  nodes: CanvasLayoutNode[]
  viewportOffset: Point
  zoomLevel: number
}
