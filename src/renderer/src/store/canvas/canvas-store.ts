// Canvas store — Zustand state for one worktree's canvas (nodes, viewport,
// selection, undo history). Actions are composed from focused slices; this
// module owns the store factory, the per-worktree registry, and the render
// selectors. See docs/canvas-workspace.md.

import { create, type UseBoundStore, type StoreApi } from 'zustand'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import type { CanvasNodeId, CanvasNodeState } from '../../../../shared/canvas-node'
import { ZOOM_MIN, ZOOM_MAX, ZOOM_DEFAULT } from '../../../../shared/canvas-node'
import type { CanvasStore } from './canvas-store-types'
import { createNodesSlice } from './canvas-nodes-slice'
import { createViewportSlice } from './canvas-viewport-slice'
import { createSelectionSlice } from './canvas-selection-slice'
import { createHistorySlice } from './canvas-history-slice'
import { focusedNodeId } from './canvas-selection-model'
import { sanitizeLoadedCanvasNodes, isValidPoint } from './sanitize-canvas-nodes'

export type { CanvasStore } from './canvas-store-types'

/** Shallow equality for a stable array of primitives — lets id-list selectors
 *  skip re-renders when the set is unchanged (e.g. every pan/zoom frame). */
function primitiveArrayEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a === b) {
    return true
  }
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

export function createCanvasStore(): UseBoundStore<StoreApi<CanvasStore>> {
  return create<CanvasStore>((set, get) => ({
    // --- State ---
    nodes: {},
    viewportOffset: { x: 0, y: 0 },
    zoomLevel: ZOOM_DEFAULT,
    selection: [],
    selectionActive: false,
    nextZOrder: 0,
    nextCreationIndex: 0,
    containerSize: { width: 0, height: 0 },
    history: [],
    future: [],

    // --- Actions ---
    ...createHistorySlice(set, get),
    ...createNodesSlice(set, get),
    ...createViewportSlice(set, get),
    ...createSelectionSlice(set, get),

    loadWorkspaceCanvas(nodes, viewportOffset, zoomLevel) {
      // Persisted geometry is untrusted: repair/drop invalid nodes so one corrupt
      // entry can't crash the whole render.
      const { nodes: clean } = sanitizeLoadedCanvasNodes(nodes as Record<string, unknown>)
      const nodeList = Object.values(clean)
      const maxZ = nodeList.reduce((m, n) => Math.max(m, n.zOrder), -1)
      const maxC = nodeList.reduce((m, n) => Math.max(m, n.creationIndex), -1)
      // Force idle so nodes don't animate on restore.
      const idle: Record<CanvasNodeId, CanvasNodeState> = {}
      for (const [id, node] of Object.entries(clean)) {
        idle[id] = { ...node, animationState: 'idle' }
      }
      set({
        nodes: idle,
        viewportOffset: isValidPoint(viewportOffset) ? viewportOffset : { x: 0, y: 0 },
        zoomLevel: Number.isFinite(zoomLevel)
          ? Math.min(Math.max(zoomLevel, ZOOM_MIN), ZOOM_MAX)
          : ZOOM_DEFAULT,
        selection: [],
        selectionActive: false,
        nextZOrder: maxZ + 1,
        nextCreationIndex: maxC + 1,
        history: [],
        future: []
      })
    }
  }))
}

// -----------------------------------------------------------------------------
// Per-worktree registry — each worktree gets its own isolated canvas store, so
// no worktree ever inherits another's nodes. Keyed by worktree id.
// -----------------------------------------------------------------------------

const canvasStoresByWorktreeId = new Map<string, UseBoundStore<StoreApi<CanvasStore>>>()

// Fired when a worktree's canvas store is first created, so the persistence sync
// (canvas-session-sync.ts) can attach to stores that appear after it installs.
type CanvasStoreCreatedListener = (
  worktreeId: string,
  store: UseBoundStore<StoreApi<CanvasStore>>
) => void
const canvasStoreCreatedListeners = new Set<CanvasStoreCreatedListener>()

export function onCanvasStoreCreated(listener: CanvasStoreCreatedListener): () => void {
  canvasStoreCreatedListeners.add(listener)
  return () => canvasStoreCreatedListeners.delete(listener)
}

export function getOrCreateCanvasStoreForWorktree(
  worktreeId: string
): UseBoundStore<StoreApi<CanvasStore>> {
  const existing = canvasStoresByWorktreeId.get(worktreeId)
  if (existing) {
    return existing
  }
  const store = createCanvasStore()
  canvasStoresByWorktreeId.set(worktreeId, store)
  for (const listener of canvasStoreCreatedListeners) {
    listener(worktreeId, store)
  }
  return store
}

/** Return an existing worktree canvas store WITHOUT creating one. */
export function peekCanvasStoreForWorktree(
  worktreeId: string
): UseBoundStore<StoreApi<CanvasStore>> | undefined {
  return canvasStoresByWorktreeId.get(worktreeId)
}

export function releaseCanvasStoreForWorktree(worktreeId: string): void {
  canvasStoresByWorktreeId.delete(worktreeId)
}

export function getAllCanvasStores(): UseBoundStore<StoreApi<CanvasStore>>[] {
  return Array.from(canvasStoresByWorktreeId.values())
}

export function getAllCanvasStoreEntries(): [string, UseBoundStore<StoreApi<CanvasStore>>][] {
  return Array.from(canvasStoresByWorktreeId.entries())
}

// -----------------------------------------------------------------------------
// Render selectors
// -----------------------------------------------------------------------------

// z-order-sorted list cached by `nodes` identity — the cull selector runs on
// every store update (including every pan/zoom frame, where `nodes` is the same
// object). zustand swaps `nodes` immutably on any real change, so identity is a
// safe cache key; a WeakMap keeps it correct across multiple stores and leak-free.
const sortedNodeCache = new WeakMap<object, CanvasNodeState[]>()
function sortedNodesByZOrder(nodes: Record<CanvasNodeId, CanvasNodeState>): CanvasNodeState[] {
  const cached = sortedNodeCache.get(nodes)
  if (cached) {
    return cached
  }
  const sorted = Object.values(nodes).sort((a, b) => a.zOrder - b.zOrder)
  sortedNodeCache.set(nodes, sorted)
  return sorted
}

/** Stable z-ordered node ids. Re-renders only on add/remove/z-order change. */
export function useNodeIds(store: UseBoundStore<StoreApi<CanvasStore>>): string[] {
  return useStoreWithEqualityFn(
    store,
    (s) => sortedNodesByZOrder(s.nodes).map((n) => n.id),
    primitiveArrayEqual
  )
}

/** Pure core of {@link useVisibleNodeIds}: z-ordered ids of nodes that should be
 *  mounted — those intersecting the margin-expanded viewport, plus the
 *  always-mounted exemptions (focused, pinned, and keep-mounted panels whose
 *  in-process state must survive panning). Exported for unit testing. */
export function selectVisibleNodeIds(
  s: Pick<
    CanvasStore,
    'nodes' | 'viewportOffset' | 'zoomLevel' | 'containerSize' | 'selection' | 'selectionActive'
  >,
  keepMountedPanelIds?: ReadonlySet<string>
): string[] {
  const { nodes, viewportOffset, zoomLevel: z, containerSize } = s
  const cw = containerSize.width
  const ch = containerSize.height
  const sorted = sortedNodesByZOrder(nodes)

  // Before the container size is known, render everything — avoids an initial
  // flash where no nodes appear while the ResizeObserver settles.
  if (cw === 0 || ch === 0 || z <= 0) {
    return sorted.map((n) => n.id)
  }

  const focused = focusedNodeId(s)
  const marginX = cw / z
  const marginY = ch / z
  const left = -viewportOffset.x / z - marginX
  const top = -viewportOffset.y / z - marginY
  const right = (cw - viewportOffset.x) / z + marginX
  const bottom = (ch - viewportOffset.y) / z + marginY

  const result: string[] = []
  for (const n of sorted) {
    if (n.id === focused || n.isPinned || keepMountedPanelIds?.has(n.panelId)) {
      result.push(n.id)
      continue
    }
    const nr = n.origin.x + n.size.width
    const nb = n.origin.y + n.size.height
    if (nr < left || n.origin.x > right || nb < top || n.origin.y > bottom) {
      continue
    }
    result.push(n.id)
  }
  return result
}

export function useVisibleNodeIds(
  store: UseBoundStore<StoreApi<CanvasStore>>,
  keepMountedPanelIds: ReadonlySet<string>
): string[] {
  return useStoreWithEqualityFn(
    store,
    (s) => selectVisibleNodeIds(s, keepMountedPanelIds),
    primitiveArrayEqual
  )
}
