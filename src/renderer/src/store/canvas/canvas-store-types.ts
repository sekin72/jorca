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
  Size
} from '../../../../shared/canvas-node'

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
}

export type CanvasStoreActions = {
  // Node lifecycle
  addNode: (panelId: string, position?: Point, size?: Size) => CanvasNodeId
  removeNode: (id: CanvasNodeId) => void
  finalizeRemoveNode: (id: CanvasNodeId) => void
  setNodeAnimationState: (id: CanvasNodeId, state: CanvasNodeAnimationState) => void
  moveNode: (id: CanvasNodeId, origin: Point) => void
  resizeNode: (id: CanvasNodeId, size: Size, origin?: Point) => void
  focusNode: (id: CanvasNodeId) => void
  unfocus: () => void
  toggleMaximize: (id: CanvasNodeId) => void
  focusAndCenter: (id: CanvasNodeId) => void
  moveToFront: (id: CanvasNodeId) => void
  moveToBack: (id: CanvasNodeId) => void
  togglePin: (id: CanvasNodeId) => void

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
