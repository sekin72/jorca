// Borrow a live window from a worktree canvas onto the global Main surface.
// The pane keeps running on its source worktree's runtime (the PTY/webview lives
// in main); only the VIEW moves. The source node is marked `borrowedByMain` so it
// renders a non-live placeholder — preserving the single-mount invariant that a
// tab's live pane is only ever in one React tree at a time (docs/main-surface.md).

import { useAppStore } from '../../store'
import { getMainCanvasStore, peekCanvasStoreForWorktree } from '../../store/canvas/canvas-store'

/** Move a source worktree node's view onto Main. Returns the new Main node id,
 *  or null if the source store/node is gone or already borrowed. */
export function pullToMain(sourceWorktreeId: string, nodeId: string): string | null {
  const sourceStore = peekCanvasStoreForWorktree(sourceWorktreeId)
  if (!sourceStore) {
    return null
  }
  const node = sourceStore.getState().nodes[nodeId]
  if (!node || node.borrowedByMain) {
    return null
  }

  const mainNodeId = getMainCanvasStore()
    .getState()
    .addNode(node.panelId, undefined, node.size, { sourceWorktreeId })

  // Flag the source last: if addNode somehow threw, the source stays live rather
  // than becoming a placeholder for a pane that never made it to Main.
  sourceStore.getState().setNodeBorrowed(nodeId, true)

  // Follow the node to Main so the workspace-to-viewer immediately sees it.
  useAppStore.getState().setMainSurfaceActive(true)
  return mainNodeId
}
