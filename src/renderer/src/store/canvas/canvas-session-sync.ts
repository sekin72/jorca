// Bridges the standalone per-worktree canvas stores to the app store's
// `canvasByWorktree` slice so the existing workspace-session writer persists
// canvas geometry. Subscribes to each canvas store and forwards a coalesced,
// transient-stripped snapshot to a sink at gesture-settle boundaries — the
// trailing debounce means a continuous pan/zoom produces at most one app-store
// write when it settles, keeping 60fps churn out of the app store.
// See docs/canvas-workspace.md §7.

import type { StoreApi, UseBoundStore } from 'zustand'
import type { PersistedWorktreeCanvas } from '../../../../shared/canvas-node'
import type { CanvasStore } from './canvas-store'
import { getAllCanvasStoreEntries, onCanvasStoreCreated } from './canvas-store'

/** Default trailing-debounce window for coalescing canvas mutations. */
export const CANVAS_SYNC_DEBOUNCE_MS = 250

export type CanvasPersistSink = (worktreeId: string, canvas: PersistedWorktreeCanvas | null) => void

/** The durable subset of a canvas store's state — transient node fields
 *  (animationState, pre-maximize geometry) are dropped. Returns null when the
 *  canvas has no nodes, so an emptied canvas is removed from the session rather
 *  than persisted as an empty shell. */
export function toPersistedCanvas(
  state: Pick<CanvasStore, 'nodes' | 'viewportOffset' | 'zoomLevel'>
): PersistedWorktreeCanvas | null {
  const entries = Object.entries(state.nodes)
  if (entries.length === 0) {
    return null
  }
  const nodes: PersistedWorktreeCanvas['nodes'] = {}
  for (const [id, node] of entries) {
    nodes[id] = {
      id: node.id,
      panelId: node.panelId,
      origin: node.origin,
      size: node.size,
      zOrder: node.zOrder,
      creationIndex: node.creationIndex,
      ...(node.isPinned ? { isPinned: true } : {})
    }
  }
  return { nodes, viewportOffset: state.viewportOffset, zoomLevel: state.zoomLevel }
}

type SyncOptions = {
  debounceMs?: number
}

/**
 * Install the canvas → app-store persistence bridge. Attaches to every existing
 * worktree canvas store and any created later, forwarding debounced snapshots to
 * `sink` (the app store's setWorktreeCanvasSnapshot). Returns a teardown that
 * detaches all subscriptions.
 */
export function installCanvasSessionSync(
  sink: CanvasPersistSink,
  options: SyncOptions = {}
): () => void {
  const debounceMs = options.debounceMs ?? CANVAS_SYNC_DEBOUNCE_MS
  const detachers = new Map<string, () => void>()

  const attach = (worktreeId: string, store: UseBoundStore<StoreApi<CanvasStore>>): void => {
    if (detachers.has(worktreeId)) {
      return
    }
    let timer: ReturnType<typeof setTimeout> | null = null
    // Skip redundant app-store writes: only forward when the serialized snapshot
    // actually changed since the last one sent for this worktree.
    let lastSerialized: string | null = null

    const flush = (): void => {
      timer = null
      const canvas = toPersistedCanvas(store.getState())
      const serialized = canvas === null ? '' : JSON.stringify(canvas)
      if (serialized === lastSerialized) {
        return
      }
      lastSerialized = serialized
      sink(worktreeId, canvas)
    }

    const unsub = store.subscribe((state, prev) => {
      // Selection/history/container-size churn never persists — only geometry.
      if (
        state.nodes === prev.nodes &&
        state.viewportOffset === prev.viewportOffset &&
        state.zoomLevel === prev.zoomLevel
      ) {
        return
      }
      if (timer !== null) {
        clearTimeout(timer)
      }
      timer = setTimeout(flush, debounceMs)
    })

    detachers.set(worktreeId, () => {
      if (timer !== null) {
        clearTimeout(timer)
      }
      unsub()
    })
  }

  for (const [worktreeId, store] of getAllCanvasStoreEntries()) {
    attach(worktreeId, store)
  }
  const offCreated = onCanvasStoreCreated(attach)

  return () => {
    offCreated()
    for (const detach of detachers.values()) {
      detach()
    }
    detachers.clear()
  }
}
