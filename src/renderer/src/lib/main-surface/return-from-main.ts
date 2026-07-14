// Return a borrowed window from Main back to its source worktree: unmount it on
// Main, clear the source placeholder so the live pane re-mounts there, then jump
// to that worktree and focus the node (you always land where it went).
//
// The Main node is removed INSTANTLY (finalizeRemoveNode, no exit animation): a
// 140ms exit animation would leave the live pane mounted on Main AND on the
// source at once, violating the single-mount invariant (docs/main-surface.md).

import { useAppStore } from '../../store'
import { getMainCanvasStore, peekCanvasStoreForWorktree } from '../../store/canvas/canvas-store'

/** Return the Main node `mainNodeId` to its source worktree (un-borrow; the live
 *  pane re-mounts on the worktree canvas). By default navigates to that worktree
 *  and focuses the node; pass `{ navigate: false }` to leave the window on its
 *  worktree canvas but stay on the Main surface. Returns the source worktree id,
 *  or null if the node/source is gone. */
export function returnFromMain(
  mainNodeId: string,
  options?: { navigate?: boolean }
): string | null {
  const navigate = options?.navigate ?? true
  const main = getMainCanvasStore().getState()
  const node = main.nodes[mainNodeId]
  if (!node || !node.sourceWorktreeId) {
    return null
  }
  const sourceWorktreeId = node.sourceWorktreeId

  // Unmount on Main first (instant), then re-assert the source so the pane is
  // never mounted in two trees within one render.
  main.finalizeRemoveNode(mainNodeId)

  const sourceStore = peekCanvasStoreForWorktree(sourceWorktreeId)
  if (sourceStore) {
    const srcNodeId = sourceStore.getState().nodeForPanel(node.panelId)
    if (srcNodeId) {
      sourceStore.getState().setNodeBorrowed(srcNodeId, false)
      if (navigate) {
        sourceStore.getState().focusNode(srcNodeId)
      }
    }
  }

  if (navigate) {
    useAppStore.getState().setActiveWorktree(sourceWorktreeId)
  }
  return sourceWorktreeId
}
