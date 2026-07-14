// Saved canvas layouts — capture/restore named snapshots of a worktree's
// canvas. A layout stores tab *content* metadata (contentType + entityId/file
// path) rather than ephemeral tab ids, so a layout survives reloads and can be
// applied to any worktree. Terminals spawn fresh PTYs on load (no session
// restore); editors reopen their file; browsers reopen their URL. See
// docs/canvas-workspace.md R1.

import { useAppStore } from '@/store'
import { getOrCreateCanvasStoreForWorktree } from '@/store/canvas/canvas-store'
import { resolveNodeTab } from '@/components/canvas/canvas-node-tab-lookup'
import { disposeCanvasNodeBackingTab } from '@/components/canvas/canvas-node-disposal'
import { detectLanguage } from '@/lib/language-detect'
import { basename } from '@/lib/path'
import type {
  CanvasLayoutNode,
  CanvasLayoutSnapshot,
  CanvasNodeState
} from '../../../shared/canvas-node'
import type { Tab } from '../../../shared/types'

/** Capture the active worktree's canvas as a layout snapshot. Each node is
 *  described by its tab's content metadata so it can be recreated later. */
export function buildCanvasLayoutSnapshot(worktreeId: string): CanvasLayoutSnapshot | null {
  const store = getOrCreateCanvasStoreForWorktree(worktreeId)
  const state = store.getState()
  const unifiedTabsByWorktree = useAppStore.getState().unifiedTabsByWorktree

  const nodes: CanvasLayoutNode[] = Object.values(state.nodes).map((node: CanvasNodeState) => {
    const tab = resolveNodeTab(unifiedTabsByWorktree, node.panelId)
    return nodeToLayoutNode(node, tab)
  })
  return {
    nodes,
    viewportOffset: state.viewportOffset,
    zoomLevel: state.zoomLevel
  }
}

function nodeToLayoutNode(node: CanvasNodeState, tab: Tab | null): CanvasLayoutNode {
  const base = {
    origin: node.origin,
    size: node.size,
    isPinned: node.isPinned
  }
  if (tab) {
    return {
      contentType:
        tab.contentType === 'browser'
          ? 'browser'
          : tab.contentType === 'terminal'
            ? 'terminal'
            : 'editor',
      entityId: tab.entityId,
      label: tab.label,
      ...base,
      ...(tab.contentType === 'browser' ? { url: tab.entityId } : {})
    }
  }
  // Fallback when the tab can't be resolved (orphaned node) — record as a
  // terminal so the slot still appears; the user can close it.
  return { contentType: 'terminal', label: 'Terminal', ...base }
}

/** Save the active worktree's current canvas under `name`. Returns the updated
 *  list of layout names, or null if there's no active worktree. */
export async function saveCanvasLayout(name: string): Promise<string[] | null> {
  const worktreeId = useAppStore.getState().activeWorktreeId
  if (!worktreeId) {
    return null
  }
  const snapshot = buildCanvasLayoutSnapshot(worktreeId)
  if (!snapshot) {
    return null
  }
  return window.api.app.canvasLayoutSave({ name, snapshot })
}

/** List saved layout names, sorted. */
export async function listCanvasLayouts(): Promise<string[]> {
  return window.api.app.canvasLayoutList()
}

/** Delete a saved layout. Returns the updated list. */
export async function deleteCanvasLayout(name: string): Promise<string[]> {
  return window.api.app.canvasLayoutDelete(name)
}

/** Load a layout into the active worktree's canvas: clears existing nodes,
 *  recreates each saved node by spawning its tab fresh, then restores the
 *  viewport/zoom. Returns true on success. */
export async function loadCanvasLayout(name: string): Promise<boolean> {
  const snapshot = await window.api.app.canvasLayoutLoad(name)
  if (!snapshot) {
    return false
  }
  const worktreeId = useAppStore.getState().activeWorktreeId
  if (!worktreeId) {
    return false
  }
  const store = getOrCreateCanvasStoreForWorktree(worktreeId)
  const state = store.getState()
  // Dispose the current canvas's backing tabs (kill PTYs / close webviews) so
  // replacing the layout doesn't orphan running processes, then clear geometry.
  for (const node of Object.values(state.nodes)) {
    disposeCanvasNodeBackingTab(node.panelId)
  }
  state.clearAllNodes()
  // Disposing the last terminal can deactivate the worktree (closeTerminalTab's
  // last-tab navigation); re-assert it so recreation targets this workspace.
  useAppStore.getState().setActiveWorktree(worktreeId)
  // Recreate each saved node by spawning its tab and binding a canvas node.
  for (const layoutNode of snapshot.nodes) {
    const tabId = await recreateTabForLayoutNode(layoutNode, worktreeId)
    if (tabId) {
      store.getState().addNode(tabId, layoutNode.origin, layoutNode.size)
    }
  }
  // Restore viewport + zoom.
  store.getState().setZoomAndOffset(snapshot.zoomLevel, snapshot.viewportOffset)
  return true
}

/** Spawn a fresh tab for a layout node and return its id (so a canvas node can
 *  reference it). Editors reopen their file; terminals spawn a new shell;
 *  browsers reopen their URL. */
async function recreateTabForLayoutNode(
  layoutNode: CanvasLayoutNode,
  worktreeId: string
): Promise<string | null> {
  const appState = useAppStore.getState()
  if (layoutNode.contentType === 'editor' && layoutNode.entityId) {
    const filePath = layoutNode.entityId
    appState.openFile({
      filePath,
      relativePath: basename(filePath),
      worktreeId,
      language: detectLanguage(filePath),
      mode: 'edit'
    })
    const tabs = useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? []
    const tab = tabs.find((t) => t.entityId === filePath && t.contentType === 'editor')
    return tab?.id ?? null
  }
  if (layoutNode.contentType === 'terminal') {
    const before = new Set(
      (useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? [])
        .filter((t) => t.contentType === 'terminal')
        .map((t) => t.id)
    )
    await appState.openNewTerminalTabInActiveWorkspace(
      useAppStore.getState().activeGroupIdByWorktree[worktreeId]
    )
    const tabs = (useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? []).filter(
      (t) => t.contentType === 'terminal' && !before.has(t.id)
    )
    if (tabs.length === 0) {
      return null
    }
    return tabs.reduce((newest, t) => (t.createdAt > newest.createdAt ? t : newest)).id
  }
  if (layoutNode.contentType === 'browser') {
    const before = new Set(
      (useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? [])
        .filter((t) => t.contentType === 'browser')
        .map((t) => t.id)
    )
    await appState.openNewBrowserTabInActiveWorkspace(
      useAppStore.getState().activeGroupIdByWorktree[worktreeId]
    )
    const tabs = (useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? []).filter(
      (t) => t.contentType === 'browser' && !before.has(t.id)
    )
    if (tabs.length === 0) {
      return null
    }
    return tabs.reduce((newest, t) => (t.createdAt > newest.createdAt ? t : newest)).id
  }
  return null
}
