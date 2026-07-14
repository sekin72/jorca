import { describe, it, expect, beforeEach, vi } from 'vitest'
// Import the real createCanvasStore via a relative path so the vi.mock of
// '@/store/canvas/canvas-store' (which swaps getOrCreateCanvasStoreForWorktree)
// doesn't intercept the factory used to seed our test stores.
import { createCanvasStore } from '../store/canvas/canvas-store'
import type { CanvasStore } from '../store/canvas/canvas-store-types'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasNodeState } from '../../../shared/canvas-node'
import type * as CanvasStoreModule from '@/store/canvas/canvas-store'

// Mock the app store so buildCanvasLayoutSnapshot can resolve tabs.
const mockTabs = {
  'wt-1': [
    {
      id: 'tab-edit-1',
      entityId: '/repo/file.ts',
      contentType: 'editor',
      label: 'file.ts',
      createdAt: 1
    },
    {
      id: 'tab-term-1',
      entityId: 'term-1',
      contentType: 'terminal',
      label: 'Terminal 1',
      createdAt: 2
    }
  ]
}

vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => ({
      activeWorktreeId: 'wt-1',
      unifiedTabsByWorktree: mockTabs
    })
  }
}))

vi.mock('@/lib/language-detect', () => ({ detectLanguage: () => 'typescript' }))
vi.mock('@/lib/path', () => ({ basename: (p: string) => p.split('/').pop() ?? p }))

// Mock the canvas store factory so buildCanvasLayoutSnapshot reads our seeded store.
// Re-export the real createCanvasStore so the test can seed stores.
let seededStore: UseBoundStore<StoreApi<CanvasStore>> | null = null
vi.mock('@/store/canvas/canvas-store', async () => {
  const actual = await vi.importActual<typeof CanvasStoreModule>('@/store/canvas/canvas-store')
  return {
    ...actual,
    getOrCreateCanvasStoreForWorktree: () => seededStore
  }
})
import { buildCanvasLayoutSnapshot } from '@/lib/canvas-layouts'

function mk(): UseBoundStore<StoreApi<CanvasStore>> {
  const s = createCanvasStore()
  s.getState().setContainerSize({ width: 1000, height: 800 })
  return s
}

describe('canvas store clearAllNodes', () => {
  let store: UseBoundStore<StoreApi<CanvasStore>>
  beforeEach(() => {
    store = mk()
  })

  it('removes all nodes instantly and clears selection', () => {
    store.getState().addNode('a')
    store.getState().addNode('b')
    expect(Object.keys(store.getState().nodes)).toHaveLength(2)
    store.getState().clearAllNodes()
    expect(Object.keys(store.getState().nodes)).toHaveLength(0)
    expect(store.getState().selection).toEqual([])
    expect(store.getState().selectionActive).toBe(false)
  })

  it('pushes history so a clear is undoable', () => {
    store.getState().addNode('a')
    const historyLenBefore = store.getState().history.length
    store.getState().clearAllNodes()
    expect(store.getState().history.length).toBeGreaterThan(historyLenBefore)
    store.getState().undo()
    expect(Object.keys(store.getState().nodes)).toHaveLength(1)
  })
})

describe('buildCanvasLayoutSnapshot', () => {
  beforeEach(() => {
    seededStore = mk()
  })

  it('captures node geometry and tab content metadata', () => {
    const editorNode: CanvasNodeState = {
      id: 'n1',
      panelId: 'tab-edit-1',
      origin: { x: 10, y: 20 },
      size: { width: 400, height: 300 },
      zOrder: 0,
      creationIndex: 0,
      animationState: 'idle'
    }
    const termNode: CanvasNodeState = {
      id: 'n2',
      panelId: 'tab-term-1',
      origin: { x: 50, y: 60 },
      size: { width: 600, height: 400 },
      zOrder: 1,
      creationIndex: 1,
      animationState: 'idle'
    }
    seededStore!
      .getState()
      .loadWorkspaceCanvas({ n1: editorNode, n2: termNode }, { x: 5, y: 5 }, 1.2)
    const snap = buildCanvasLayoutSnapshot('wt-1')
    expect(snap).not.toBeNull()
    expect(snap!.nodes).toHaveLength(2)
    const editor = snap!.nodes.find((n) => n.contentType === 'editor')
    expect(editor).toBeDefined()
    expect(editor!.entityId).toBe('/repo/file.ts')
    expect(editor!.label).toBe('file.ts')
    expect(editor!.origin).toEqual({ x: 10, y: 20 })
    expect(editor!.size).toEqual({ width: 400, height: 300 })
    const term = snap!.nodes.find((n) => n.contentType === 'terminal')
    expect(term).toBeDefined()
    expect(term!.label).toBe('Terminal 1')
    expect(snap!.zoomLevel).toBe(1.2)
    expect(snap!.viewportOffset).toEqual({ x: 5, y: 5 })
  })

  it('falls back to terminal when a node has an unresolvable tab', () => {
    const orphanNode: CanvasNodeState = {
      id: 'n1',
      panelId: 'does-not-exist',
      origin: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      zOrder: 0,
      creationIndex: 0,
      animationState: 'idle'
    }
    seededStore!.getState().loadWorkspaceCanvas({ n1: orphanNode }, { x: 0, y: 0 }, 1)
    const snap = buildCanvasLayoutSnapshot('wt-1')
    expect(snap!.nodes).toHaveLength(1)
    expect(snap!.nodes[0]!.contentType).toBe('terminal')
  })
})
