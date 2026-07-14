// Persist the global Main surface across restarts (docs/main-surface.md T-A9).
// The Main store is global (not per-worktree), so it can't ride the workspace-
// session pipeline — it saves to its own file via window.api.app.mainSurface*.
//
// Load reconciles against the live tab model: a borrowed node whose source tab is
// gone (worktree/tab closed) is DROPPED; survivors re-assert the source node's
// `borrowedByMain` placeholder so the source canvas shows it borrowed again.

import { useAppStore } from '../../store'
import { getMainCanvasStore, peekCanvasStoreForWorktree } from '../../store/canvas/canvas-store'
import { resolveNodeTab } from '../../components/canvas/canvas-node-tab-lookup'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import type { PersistedCanvasNode, PersistedWorktreeCanvas } from '../../../../shared/canvas-node'

const DEBOUNCE_MS = 300

/** Serialize the Main store to its durable subset (keeps `sourceWorktreeId`). */
export function serializeMainSnapshot(
  state: Pick<CanvasStore, 'nodes' | 'viewportOffset' | 'zoomLevel'>
): PersistedWorktreeCanvas {
  const nodes: Record<string, PersistedCanvasNode> = {}
  for (const [id, node] of Object.entries(state.nodes)) {
    nodes[id] = {
      id: node.id,
      panelId: node.panelId,
      origin: node.origin,
      size: node.size,
      zOrder: node.zOrder,
      creationIndex: node.creationIndex,
      ...(node.isPinned ? { isPinned: true } : {}),
      ...(node.sourceWorktreeId ? { sourceWorktreeId: node.sourceWorktreeId } : {})
    }
  }
  return { nodes, viewportOffset: state.viewportOffset, zoomLevel: state.zoomLevel }
}

/** Subscribe to the Main store and write debounced snapshots. Returns teardown. */
export function installMainSurfacePersistence(): () => void {
  const store = getMainCanvasStore()
  let timer: ReturnType<typeof setTimeout> | null = null
  const unsubscribe = store.subscribe(() => {
    if (timer) {
      return
    }
    timer = setTimeout(() => {
      timer = null
      void window.api.app.mainSurfaceSave(serializeMainSnapshot(store.getState()))
    }, DEBOUNCE_MS)
  })
  return () => {
    if (timer) {
      clearTimeout(timer)
    }
    unsubscribe()
  }
}

/** Drop borrowed nodes whose source tab is gone; keep the rest. Pure — exported
 *  for testing. */
export function reconcileMainNodes(
  saved: PersistedWorktreeCanvas,
  isTabAlive: (panelId: string) => boolean
): PersistedWorktreeCanvas {
  const nodes: Record<string, PersistedCanvasNode> = {}
  for (const [id, node] of Object.entries(saved.nodes)) {
    // A Main node always references a borrowed tab; if that tab no longer exists
    // (worktree or tab closed while away), the node is stale — drop it.
    if (!isTabAlive(node.panelId)) {
      continue
    }
    nodes[id] = node
  }
  return { ...saved, nodes }
}

/** Load the saved Main layout, reconcile it, seed the Main store, and re-assert
 *  each survivor's source placeholder. Call AFTER worktree canvases hydrate. */
export async function loadMainSurface(): Promise<void> {
  const saved = await window.api.app.mainSurfaceLoad()
  if (!saved) {
    return
  }
  const unifiedTabs = useAppStore.getState().unifiedTabsByWorktree
  const reconciled = reconcileMainNodes(
    saved,
    (panelId) => resolveNodeTab(unifiedTabs, panelId) != null
  )

  getMainCanvasStore()
    .getState()
    .loadWorkspaceCanvas(reconciled.nodes, reconciled.viewportOffset, reconciled.zoomLevel)

  // Re-assert the placeholder on each survivor's source worktree canvas.
  for (const node of Object.values(reconciled.nodes)) {
    if (!node.sourceWorktreeId) {
      continue
    }
    const sourceStore = peekCanvasStoreForWorktree(node.sourceWorktreeId)
    const sourceNodeId = sourceStore?.getState().nodeForPanel(node.panelId)
    if (sourceStore && sourceNodeId) {
      sourceStore.getState().setNodeBorrowed(sourceNodeId, true)
    }
  }
}
