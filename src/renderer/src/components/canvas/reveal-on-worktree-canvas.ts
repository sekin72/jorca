// Jump the camera to a match. When a ⌘J result activates a tab that lives in a
// node on its worktree's canvas, center that node in the viewport (Null Space
// palette behavior). No-op when the worktree has no canvas or the panel isn't on
// it, so it's safe to call from the non-canvas activation path too.

import { peekCanvasStoreForWorktree } from '../../store/canvas/canvas-store'

export function revealOnWorktreeCanvas(worktreeId: string, panelId: string): void {
  const store = peekCanvasStoreForWorktree(worktreeId)
  if (!store) {
    return
  }
  const nodeId = store.getState().nodeForPanel(panelId)
  if (nodeId) {
    store.getState().focusAndFit(nodeId)
  }
}
