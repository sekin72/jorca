// Canvas store — shared type shapes. Split out so each slice imports the store
// contract without a runtime dependency on the store module (avoids an import
// cycle). Phase-1 scope (docs/canvas-workspace.md): single-panel nodes, no dock
// trees / placement-AI / navigation / snap-guides.

import type { StoreApi } from 'zustand'
import type {
  CanvasNodeId,
  CanvasNodeState,
  CanvasNodeAnimationState,
  Point,
  Rect,
  Size,
  SnapGuideLine
} from '../../../../shared/canvas-node'

/** A recommended spot for a new node, surfaced as a numbered ghost. */
export type CanvasPlacementCandidate = { point: Point; size: Size }

/** Active placement-picker session: numbered candidates plus the callback that
 *  actually creates the node once the user picks a spot. Null when idle. */
export type PendingCanvasPlacement = {
  candidates: CanvasPlacementCandidate[]
  place: (candidate: CanvasPlacementCandidate) => void
}

/** Undo/redo snapshot — just the geometry + selection that user edits change. */
export type CanvasHistoryEntry = {
  nodes: Record<CanvasNodeId, CanvasNodeState>
  selection: CanvasNodeId[]
  selectionActive: boolean
}

export type CanvasStoreState = {
  nodes: Record<CanvasNodeId, CanvasNodeState>
  viewportOffset: Point
  zoomLevel: number
  /** Ordered selection; lead = last. The active (keyboard/halo) node is derived
   *  from this via canvas-selection-model.focusedNodeId — never stored separately
   *  so the rendered and moved sets can't disagree. */
  selection: CanvasNodeId[]
  /** Whether the selection lead is the *active* node (halo) vs selected-only. */
  selectionActive: boolean
  nextZOrder: number
  nextCreationIndex: number
  containerSize: Size
  history: CanvasHistoryEntry[]
  future: CanvasHistoryEntry[]
  /** Transient neighbor-alignment guides drawn during a drag; empty when idle. */
  snapGuides: SnapGuideLine[]
  /** Active placement-picker session (numbered ghost spots), or null when idle. */
  pendingPlacement: PendingCanvasPlacement | null
}

/** Extra fields for a node created via {@link CanvasStoreActions.addNode}.
 *  `sourceWorktreeId` marks a Main-surface node borrowed from a worktree. */
export type AddNodeOptions = {
  sourceWorktreeId?: string
}

export type CanvasStoreActions = {
  // Node lifecycle
  addNode: (
    panelId: string,
    position?: Point,
    size?: Size,
    options?: AddNodeOptions
  ) => CanvasNodeId
  removeNode: (id: CanvasNodeId) => void
  /** Mark/unmark a source node as borrowed onto Main (renders a placeholder
   *  while borrowed; keeps geometry for exact-position return). */
  setNodeBorrowed: (id: CanvasNodeId, borrowed: boolean) => void
  finalizeRemoveNode: (id: CanvasNodeId) => void
  /** Remove every node instantly (no exit animation). Used by layout-load to
   *  clear the canvas before recreating saved nodes. */
  clearAllNodes: () => void
  setNodeAnimationState: (id: CanvasNodeId, state: CanvasNodeAnimationState) => void
  moveNode: (id: CanvasNodeId, origin: Point) => void
  resizeNode: (id: CanvasNodeId, size: Size, origin?: Point) => void
  /** Replace the active drag alignment guides (empty array clears them). */
  setSnapGuides: (guides: SnapGuideLine[]) => void
  /** Start or clear the placement-picker session (null clears it). */
  setPendingPlacement: (pending: PendingCanvasPlacement | null) => void
  focusNode: (id: CanvasNodeId) => void
  unfocus: () => void
  toggleMaximize: (id: CanvasNodeId) => void
  focusAndCenter: (id: CanvasNodeId) => void
  moveToFront: (id: CanvasNodeId) => void
  moveToBack: (id: CanvasNodeId) => void
  togglePin: (id: CanvasNodeId) => void
  /** Set (or clear, with undefined) a node's user accent color (`#rrggbb`). */
  setNodeColor: (id: CanvasNodeId, color: string | undefined) => void

  // Node queries
  nodeForPanel: (panelId: string) => CanvasNodeId | null
  sortedNodesByCreationOrder: () => CanvasNodeState[]
  nextNode: () => CanvasNodeId | null
  previousNode: () => CanvasNodeId | null

  // Viewport
  setZoom: (level: number) => void
  setViewportOffset: (offset: Point) => void
  setZoomAndOffset: (zoom: number, offset: Point) => void
  setContainerSize: (size: Size) => void
  /** Zoom while keeping the given view-space point fixed under the cursor. */
  zoomAroundPoint: (newZoom: number, viewPoint: Point) => void
  canvasToView: (point: Point) => Point
  viewToCanvas: (point: Point) => Point
  viewFrame: (id: CanvasNodeId) => Rect | null
  zoomToFit: () => void

  // Arrange (bulk layout)
  /** Uniform grid of ALL nodes sized to the viewport, then zoom-to-fit. */
  autoLayout: () => void
  /** ALL nodes into one column per `sourceWorktreeId` (borrow order), uniform
   *  cells, then zoom-to-fit. Main surface's "group by worktree" tidy. */
  autoVerticalLayout: () => void
  /** Line up the SELECTED nodes edge-to-edge along one axis, anchored top-left. */
  stackSelected: (axis: 'row' | 'column', gap?: number) => void
  /** Grid-arrange the SELECTED nodes, anchored top-left, preserving reading order. */
  tidyGridSelected: (gap?: number) => void

  // Selection
  selectNodes: (ids: CanvasNodeId[], additive?: boolean) => void
  clearSelection: () => void
  selectAll: () => void
  toggleNodeSelection: (id: CanvasNodeId) => void
  deleteSelection: () => void

  // Undo/redo
  pushHistory: () => void
  undo: () => void
  redo: () => void
  clearHistory: () => void

  // Bulk reset (workspace switch / hydrate)
  loadWorkspaceCanvas: (
    nodes: Record<CanvasNodeId, CanvasNodeState>,
    viewportOffset: Point,
    zoomLevel: number
  ) => void
}

export type CanvasStore = CanvasStoreState & CanvasStoreActions

export type CanvasSet = StoreApi<CanvasStore>['setState']
export type CanvasGet = StoreApi<CanvasStore>['getState']
