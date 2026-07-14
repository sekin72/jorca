// Reveal a borrowed window on the Main surface: switch to Main, then focus +
// center its Main node. Used by the source-canvas placeholder click and (T-A7)
// the sidebar row.

import { useAppStore } from '../../store'
import { getMainCanvasStore } from '../../store/canvas/canvas-store'

/** Focus the Main node hosting `panelId` and show the Main surface. Returns true
 *  if a Main node was found. */
export function revealOnMain(panelId: string): boolean {
  const main = getMainCanvasStore().getState()
  const mainNodeId = main.nodeForPanel(panelId)
  if (!mainNodeId) {
    return false
  }
  useAppStore.getState().setMainSurfaceActive(true)
  main.focusAndCenter(mainNodeId)
  return true
}
