// Restores persisted canvas geometry on startup. Runs AFTER tab hydration so it
// can prune nodes whose backing tab (panelId → tab id) did not survive — a tab
// that was dropped during hydration must not leave a ghost node pointing at
// nothing. Seeds the app-store slice too so the first post-load persist doesn't
// re-write an identical snapshot. See docs/canvas-workspace.md §7.

import type { PersistedWorktreeCanvas } from '../../../../shared/canvas-node'
import type { WorkspaceSessionState } from '../../../../shared/types'
import { useAppStore } from '../index'
import { getOrCreateCanvasStoreForWorktree } from './canvas-store'

/** Drop nodes whose panelId is not a currently valid tab id. Returns the same
 *  reference when nothing was pruned so callers can cheaply detect changes. */
export function pruneCanvasNodesToTabs(
  canvas: PersistedWorktreeCanvas,
  validTabIds: ReadonlySet<string>
): PersistedWorktreeCanvas {
  const kept = Object.entries(canvas.nodes).filter(([, node]) => validTabIds.has(node.panelId))
  if (kept.length === Object.keys(canvas.nodes).length) {
    return canvas
  }
  return { ...canvas, nodes: Object.fromEntries(kept) }
}

/** Apply session.canvasByWorktree to the per-worktree canvas stores and seed the
 *  app-store snapshot slice. */
export function hydrateWorktreeCanvasesFromSession(session: WorkspaceSessionState): void {
  const canvasByWorktree = session.canvasByWorktree
  if (!canvasByWorktree) {
    return
  }
  const { unifiedTabsByWorktree, setWorktreeCanvasSnapshot } = useAppStore.getState()
  for (const [worktreeId, canvas] of Object.entries(canvasByWorktree)) {
    const validTabIds = new Set((unifiedTabsByWorktree[worktreeId] ?? []).map((tab) => tab.id))
    const pruned = pruneCanvasNodesToTabs(canvas, validTabIds)
    if (Object.keys(pruned.nodes).length === 0) {
      continue
    }
    const store = getOrCreateCanvasStoreForWorktree(worktreeId)
    store.getState().loadWorkspaceCanvas(pruned.nodes, pruned.viewportOffset, pruned.zoomLevel)
    setWorktreeCanvasSnapshot(worktreeId, pruned)
  }
}
