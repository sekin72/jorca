// Creation path: open a file as a canvas node. Reuses Orca's editor open flow
// (so the tab keeps its normal lifecycle) then places a canvas node referencing
// the created tab id. See docs/canvas-workspace.md §5.

import type { StoreApi, UseBoundStore } from 'zustand'
import { useAppStore } from '../../store'
import { getOrCreateCanvasStoreForWorktree } from '../../store/canvas/canvas-store'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { focusedNodeId } from '../../store/canvas/canvas-selection-model'
import { launchAgentInNewTab } from '@/lib/launch-agent-in-new-tab'
import { detectLanguage } from '@/lib/language-detect'
import { joinPath, basename } from '@/lib/path'
import { createUntitledMarkdownFile } from '@/lib/create-untitled-markdown'
import { recommendPlacements } from './canvas-placement'
import type { Point } from '../../../../shared/canvas-node'
import type { TuiAgent } from '../../../../shared/types'

/**
 * Place a freshly-created node's backing tab onto the canvas. With an explicit
 * drop point (drag / context menu) or when the placement picker is off, the node
 * is created immediately at that/auto position. With the picker on and no explicit
 * point, this instead opens the numbered ghost picker; the node is created when the
 * user picks a spot (see CanvasGhostPlacement). Returns the node id, or null when
 * placement was deferred to the picker.
 */
function placeCanvasNodeOrPick(
  store: UseBoundStore<StoreApi<CanvasStore>>,
  tabId: string,
  position?: Point
): string | null {
  const st = store.getState()
  const pickerOn = useAppStore.getState().settings?.canvasPlacementPicker ?? false
  if (position || !pickerOn) {
    return st.addNode(tabId, position)
  }
  const candidates = recommendPlacements(
    st.nodes,
    focusedNodeId(st),
    { offset: st.viewportOffset, zoom: st.zoomLevel, containerSize: st.containerSize },
    null,
    6
  )
  st.setPendingPlacement({
    candidates,
    place: (candidate) => {
      store.getState().addNode(tabId, candidate.point, candidate.size)
    }
  })
  return null
}

/** Open `relativePath` (under `worktreePath`) as an editor node on the worktree's
 *  canvas at `position`. Returns the created/placed node id, or null if the
 *  editor tab could not be resolved after opening. */
export function openFileAsCanvasNode(
  worktreeId: string,
  worktreePath: string,
  relativePath: string,
  position?: Point
): string | null {
  const filePath = joinPath(worktreePath, relativePath)
  useAppStore.getState().openFile({
    filePath,
    relativePath,
    worktreeId,
    language: detectLanguage(relativePath),
    mode: 'edit'
  })
  // The editor tab is created synchronously; find it by its backing file so the
  // node references the unified tab id (not the raw path).
  const tabs = useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? []
  const tab = tabs.find((t) => t.entityId === filePath && t.contentType === 'editor')
  if (!tab) {
    return null
  }
  return placeCanvasNodeOrPick(getOrCreateCanvasStoreForWorktree(worktreeId), tab.id, position)
}

/** Place an existing file (by absolute path) as an editor node on the active
 *  worktree's canvas at `position`. Shared by the file-open dialog and
 *  file-explorer drag-and-drop. Returns the node id, or null. */
export function openAbsoluteFileAsCanvasNode(filePath: string, position?: Point): string | null {
  const worktreeId = useAppStore.getState().activeWorktreeId
  if (!worktreeId) {
    return null
  }
  useAppStore.getState().openFile({
    filePath,
    relativePath: basename(filePath),
    worktreeId,
    language: detectLanguage(filePath),
    mode: 'edit'
  })
  const tabs = useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? []
  const tab = tabs.find((t) => t.entityId === filePath && t.contentType === 'editor')
  if (!tab) {
    return null
  }
  return placeCanvasNodeOrPick(getOrCreateCanvasStoreForWorktree(worktreeId), tab.id, position)
}

/** Open a native OS file picker (rooted at the active worktree) and place the
 *  chosen existing file as an editor node. Works regardless of repo size, so it
 *  sidesteps QuickOpen's file-count cap. Returns the node id, or null if
 *  cancelled / the tab couldn't be resolved. */
export async function openFileDialogAsCanvasNode(position?: Point): Promise<string | null> {
  const state = useAppStore.getState()
  const worktreeId = state.activeWorktreeId
  if (!worktreeId) {
    return null
  }
  const worktree = state.getKnownWorktreeById(worktreeId)
  if (!worktree) {
    return null
  }
  const filePath = await window.api.app.pickCanvasFile({ defaultPath: worktree.path })
  if (!filePath) {
    return null
  }
  return openAbsoluteFileAsCanvasNode(filePath, position)
}

/** Create a fresh untitled markdown editor node on the active worktree's canvas
 *  at `position`. Independent of the file listing — the primary way to get a
 *  live editor onto the canvas (double-click empty canvas). */
export async function createUntitledEditorCanvasNode(position?: Point): Promise<string | null> {
  const state = useAppStore.getState()
  const worktreeId = state.activeWorktreeId
  if (!worktreeId) {
    return null
  }
  const worktree = state.getKnownWorktreeById(worktreeId)
  if (!worktree) {
    return null
  }
  const connectionId = state.repos.find((r) => r.id === worktree.repoId)?.connectionId ?? undefined
  const fileInfo = await createUntitledMarkdownFile(
    worktree.path,
    worktreeId,
    connectionId,
    state.settings
  )
  useAppStore.getState().openFile(fileInfo)
  const tabs = useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? []
  const tab = tabs.find((t) => t.entityId === fileInfo.filePath && t.contentType === 'editor')
  if (!tab) {
    return null
  }
  return placeCanvasNodeOrPick(getOrCreateCanvasStoreForWorktree(worktreeId), tab.id, position)
}

/** Newest unified tab of `contentType` on `worktreeId` not present in `beforeIds`.
 *  Used to resolve the tab a create-action just made (the actions return void). */
function newlyCreatedTabId(
  worktreeId: string,
  contentType: 'terminal' | 'browser',
  beforeIds: ReadonlySet<string>
): string | null {
  const tabs = (useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? []).filter(
    (t) => t.contentType === contentType && !beforeIds.has(t.id)
  )
  if (tabs.length === 0) {
    return null
  }
  return tabs.reduce((newest, t) => (t.createdAt > newest.createdAt ? t : newest)).id
}

function tabIdsOfType(worktreeId: string, contentType: 'terminal' | 'browser'): Set<string> {
  return new Set(
    (useAppStore.getState().unifiedTabsByWorktree[worktreeId] ?? [])
      .filter((t) => t.contentType === contentType)
      .map((t) => t.id)
  )
}

/** Create a new terminal node on the active worktree's canvas at `position`. */
export async function createTerminalCanvasNode(position?: Point): Promise<string | null> {
  const state = useAppStore.getState()
  const worktreeId = state.activeWorktreeId
  if (!worktreeId) {
    return null
  }
  const before = tabIdsOfType(worktreeId, 'terminal')
  await state.openNewTerminalTabInActiveWorkspace(state.activeGroupIdByWorktree[worktreeId])
  const tabId = newlyCreatedTabId(worktreeId, 'terminal', before)
  if (!tabId) {
    return null
  }
  return placeCanvasNodeOrPick(getOrCreateCanvasStoreForWorktree(worktreeId), tabId, position)
}

/** Create a new browser node on the active worktree's canvas at `position`. */
export async function createBrowserCanvasNode(position?: Point): Promise<string | null> {
  const state = useAppStore.getState()
  const worktreeId = state.activeWorktreeId
  if (!worktreeId) {
    return null
  }
  const before = tabIdsOfType(worktreeId, 'browser')
  await state.openNewBrowserTabInActiveWorkspace(state.activeGroupIdByWorktree[worktreeId])
  const tabId = newlyCreatedTabId(worktreeId, 'browser', before)
  if (!tabId) {
    return null
  }
  return placeCanvasNodeOrPick(getOrCreateCanvasStoreForWorktree(worktreeId), tabId, position)
}

/** Launch a TUI agent (Claude/opencode/Gemini/…) as a terminal node on the active
 *  worktree's canvas at `position`. Reuses `launchAgentInNewTab`, which resolves
 *  the agent's yolo args from the user's per-agent permission settings and queues
 *  the startup command — the canvas just binds the returned tab id to a node. */
export function createAgentCanvasNode(agent: TuiAgent, position?: Point): string | null {
  const worktreeId = useAppStore.getState().activeWorktreeId
  if (!worktreeId) {
    return null
  }
  const result = launchAgentInNewTab({ agent, worktreeId })
  if (!result?.tabId) {
    return null
  }
  return placeCanvasNodeOrPick(
    getOrCreateCanvasStoreForWorktree(worktreeId),
    result.tabId,
    position
  )
}
