import { describe, it, expect, beforeEach, vi } from 'vitest'

// Backing-tab disposal reaches the app store; stub it — this suite only asserts
// the Main-node close also removes the source placeholder.
vi.mock('../../store', () => ({
  useAppStore: { getState: () => ({ unifiedTabsByWorktree: {}, closeBrowserTab: vi.fn() }) }
}))
vi.mock('../terminal/terminal-tab-actions', () => ({ closeTerminalTab: vi.fn() }))

import { closeCanvasNode } from './canvas-node-disposal'
import { pullToMain } from '@/lib/main-surface/pull-to-main'
import {
  getMainCanvasStore,
  getOrCreateCanvasStoreForWorktree,
  releaseCanvasStoreForWorktree
} from '../../store/canvas/canvas-store'

const WT = 'wt-close'

describe('closeCanvasNode on a borrowed Main node', () => {
  beforeEach(() => {
    releaseCanvasStoreForWorktree(WT)
    getMainCanvasStore().getState().clearAllNodes()
  })

  it('closing the Main node removes both it and the source placeholder', () => {
    const source = getOrCreateCanvasStoreForWorktree(WT)
    const srcNodeId = source.getState().addNode('panel-c')
    pullToMain(WT, srcNodeId)
    const main = getMainCanvasStore()
    const mainNodeId = main.getState().nodeForPanel('panel-c')!

    closeCanvasNode(main, mainNodeId)

    // Main node begins exit; the source placeholder is gone immediately.
    expect(source.getState().nodes[srcNodeId]).toBeUndefined()
    expect(main.getState().nodeForPanel('panel-c')).toBeTruthy() // exiting, not yet finalized
  })

  it('closing the source placeholder also removes the live Main node', () => {
    const source = getOrCreateCanvasStoreForWorktree(WT)
    const srcNodeId = source.getState().addNode('panel-d')
    pullToMain(WT, srcNodeId)
    const main = getMainCanvasStore()
    expect(main.getState().nodeForPanel('panel-d')).toBeTruthy()

    closeCanvasNode(source, srcNodeId)

    // The Main twin is gone immediately (finalizeRemoveNode); source begins exit.
    expect(main.getState().nodeForPanel('panel-d')).toBeNull()
  })
})
