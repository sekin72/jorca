// Closing a canvas node must dispose its backing Orca tab, not just remove the
// node. The canvas fully replaces the tab bar (App.tsx `canvasEnabled`), so a
// "parked" PTY/webview would be an unreachable orphan process. Terminals kill
// the PTY via closeTerminalTab; browsers close the webview tab via
// closeBrowserTab — both are web-runtime/SSH-aware. Editors have no process, so
// only the node is removed. This is the Step-5 integration layer the canvas
// design doc deferred (docs/canvas-workspace.md).
//
// Kept out of the canvas store on purpose: the store is pure renderer geometry
// and must not import the app store (see canvas-selection-slice.ts).

import type { StoreApi, UseBoundStore } from 'zustand'
import { useAppStore } from '../../store'
import { closeTerminalTab } from '../terminal/terminal-tab-actions'
import { resolveNodeTab } from './canvas-node-tab-lookup'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { peekCanvasStoreForWorktree, getMainCanvasStore } from '../../store/canvas/canvas-store'
import { returnFromMain } from '@/lib/main-surface/return-from-main'

type BoundStore = UseBoundStore<StoreApi<CanvasStore>>

/** Dispose the Orca tab backing a canvas node (kills PTY / closes webview).
 *  Editors have no process — no-op. Safe when the PTY has already exited. */
export function disposeCanvasNodeBackingTab(panelId: string): void {
  const tab = resolveNodeTab(useAppStore.getState().unifiedTabsByWorktree, panelId)
  if (!tab) {
    return
  }
  if (tab.contentType === 'terminal') {
    closeTerminalTab(tab.entityId)
  } else if (tab.contentType === 'browser') {
    useAppStore.getState().closeBrowserTab(tab.entityId)
  }
}

/** Close a single canvas node: dispose its backing tab, then remove the node.
 *  A borrowed window has a twin — the live Main node and the source placeholder
 *  reference the same tab — so closing either must also drop the twin, in BOTH
 *  directions, or a box pointing at the now-dead tab lingers (docs/main-surface.md
 *  — close disposes everywhere). */
export function closeCanvasNode(store: BoundStore, nodeId: string): void {
  const node = store.getState().nodes[nodeId]
  if (node) {
    disposeCanvasNodeBackingTab(node.panelId)
    if (node.sourceWorktreeId) {
      // Closing the Main node → drop the source-worktree placeholder.
      const sourceStore = peekCanvasStoreForWorktree(node.sourceWorktreeId)
      const sourceNodeId = sourceStore?.getState().nodeForPanel(node.panelId)
      if (sourceStore && sourceNodeId) {
        sourceStore.getState().finalizeRemoveNode(sourceNodeId)
      }
    } else if (node.borrowedByMain) {
      // Closing the source placeholder → drop the live Main node.
      const main = getMainCanvasStore().getState()
      const mainNodeId = main.nodeForPanel(node.panelId)
      if (mainNodeId) {
        main.finalizeRemoveNode(mainNodeId)
      }
    }
  }
  store.getState().removeNode(nodeId)
}

/** Close routed by surface: closing a node ON the Main surface sends the window
 *  home to its worktree (un-borrow, keep it alive) and navigates to that
 *  worktree; closing a node on a worktree canvas disposes it (docs/main-surface.md
 *  — owner change 2026-07-14). Wired to the node X button and Cmd/Ctrl+W. */
export function closeOrReturnCanvasNode(store: BoundStore, nodeId: string): void {
  const node = store.getState().nodes[nodeId]
  if (node?.sourceWorktreeId) {
    returnFromMain(nodeId, { navigate: true })
    return
  }
  closeCanvasNode(store, nodeId)
}
