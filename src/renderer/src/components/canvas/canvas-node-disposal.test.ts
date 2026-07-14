import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createCanvasStore } from '../../store/canvas/canvas-store'
import type { CanvasStore } from '../../store/canvas/canvas-store-types'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasNodeState } from '../../../../shared/canvas-node'

// Backing-tab disposal fans out to the terminal/browser close actions; spy on
// both so we can assert the right one fires per content type.
const closeTerminalTab = vi.fn()
const closeBrowserTab = vi.fn()

const unifiedTabsByWorktree = {
  'wt-1': [
    { id: 'tab-edit', entityId: '/repo/a.ts', contentType: 'editor', label: 'a.ts', createdAt: 1 },
    { id: 'tab-term', entityId: 'term-1', contentType: 'terminal', label: 'Term', createdAt: 2 },
    { id: 'tab-web', entityId: 'browser-1', contentType: 'browser', label: 'Web', createdAt: 3 }
  ]
}

vi.mock('@/store', () => ({
  useAppStore: { getState: () => ({ unifiedTabsByWorktree, closeBrowserTab }) }
}))
vi.mock('../terminal/terminal-tab-actions', () => ({
  closeTerminalTab: (id: string) => closeTerminalTab(id)
}))

import { disposeCanvasNodeBackingTab, closeCanvasNode } from './canvas-node-disposal'

function mkNode(panelId: string): CanvasNodeState {
  return {
    id: 'n',
    panelId,
    origin: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    zOrder: 0,
    creationIndex: 0,
    animationState: 'idle'
  }
}

describe('disposeCanvasNodeBackingTab', () => {
  beforeEach(() => {
    closeTerminalTab.mockClear()
    closeBrowserTab.mockClear()
  })

  it('kills the PTY for a terminal tab', () => {
    disposeCanvasNodeBackingTab('tab-term')
    expect(closeTerminalTab).toHaveBeenCalledWith('term-1')
    expect(closeBrowserTab).not.toHaveBeenCalled()
  })

  it('closes the webview for a browser tab', () => {
    disposeCanvasNodeBackingTab('tab-web')
    expect(closeBrowserTab).toHaveBeenCalledWith('browser-1')
    expect(closeTerminalTab).not.toHaveBeenCalled()
  })

  it('is a no-op for an editor tab (no process)', () => {
    disposeCanvasNodeBackingTab('tab-edit')
    expect(closeTerminalTab).not.toHaveBeenCalled()
    expect(closeBrowserTab).not.toHaveBeenCalled()
  })

  it('is a no-op when the tab cannot be resolved', () => {
    disposeCanvasNodeBackingTab('missing')
    expect(closeTerminalTab).not.toHaveBeenCalled()
    expect(closeBrowserTab).not.toHaveBeenCalled()
  })
})

describe('closeCanvasNode', () => {
  let store: UseBoundStore<StoreApi<CanvasStore>>
  beforeEach(() => {
    closeTerminalTab.mockClear()
    store = createCanvasStore()
    store.getState().setContainerSize({ width: 1000, height: 800 })
  })

  it('disposes the backing tab and removes the node', () => {
    store.getState().loadWorkspaceCanvas({ n: mkNode('tab-term') }, { x: 0, y: 0 }, 1)
    closeCanvasNode(store, 'n')
    expect(closeTerminalTab).toHaveBeenCalledWith('term-1')
    // removeNode marks the node exiting (finalize deletes it after the fade).
    expect(store.getState().nodes['n']?.animationState).toBe('exiting')
  })

  it('still removes the node when the node id is unknown', () => {
    closeCanvasNode(store, 'nope')
    expect(closeTerminalTab).not.toHaveBeenCalled()
  })
})
