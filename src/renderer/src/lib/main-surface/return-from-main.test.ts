import { describe, it, expect, beforeEach, vi } from 'vitest'

const setActiveWorktree = vi.fn()
vi.mock('../../store', () => ({
  useAppStore: { getState: () => ({ setActiveWorktree }) }
}))

import { returnFromMain } from './return-from-main'
import { pullToMain } from './pull-to-main'
import {
  getMainCanvasStore,
  getOrCreateCanvasStoreForWorktree,
  releaseCanvasStoreForWorktree
} from '../../store/canvas/canvas-store'
import { focusedNodeId } from '../../store/canvas/canvas-selection-model'

const WT = 'wt-return'

describe('returnFromMain', () => {
  beforeEach(() => {
    setActiveWorktree.mockClear()
    releaseCanvasStoreForWorktree(WT)
    getMainCanvasStore().getState().clearAllNodes()
  })

  it('removes the Main node, clears the source placeholder, and lands on the source', () => {
    const source = getOrCreateCanvasStoreForWorktree(WT)
    const srcNodeId = source.getState().addNode('panel-r')
    pullToMain(WT, srcNodeId)
    const mainNodeId = getMainCanvasStore().getState().nodeForPanel('panel-r')!

    const landed = returnFromMain(mainNodeId)

    expect(landed).toBe(WT)
    expect(getMainCanvasStore().getState().nodes[mainNodeId]).toBeUndefined()
    expect(source.getState().nodes[srcNodeId].borrowedByMain).toBeUndefined()
    expect(focusedNodeId(source.getState())).toBe(srcNodeId)
    expect(setActiveWorktree).toHaveBeenCalledWith(WT)
  })

  it('never leaves the live pane double-mounted (Main node gone the same tick source is un-borrowed)', () => {
    const source = getOrCreateCanvasStoreForWorktree(WT)
    const srcNodeId = source.getState().addNode('panel-r')
    pullToMain(WT, srcNodeId)
    const mainNodeId = getMainCanvasStore().getState().nodeForPanel('panel-r')!

    returnFromMain(mainNodeId)

    // Main has no node for the panel (instant removal) while the source is live.
    expect(getMainCanvasStore().getState().nodeForPanel('panel-r')).toBeNull()
    expect(source.getState().nodes[srcNodeId].borrowedByMain).toBeUndefined()
  })

  it('returns null for a node without a source worktree (not a borrowed Main node)', () => {
    const main = getMainCanvasStore().getState()
    const id = main.addNode('plain-panel')
    expect(returnFromMain(id)).toBeNull()
  })

  it('navigate:false un-borrows the source but does NOT switch worktree (stay on Main)', () => {
    const source = getOrCreateCanvasStoreForWorktree(WT)
    const srcNodeId = source.getState().addNode('panel-stay')
    pullToMain(WT, srcNodeId)
    const mainNodeId = getMainCanvasStore().getState().nodeForPanel('panel-stay')!

    const landed = returnFromMain(mainNodeId, { navigate: false })

    expect(landed).toBe(WT)
    expect(getMainCanvasStore().getState().nodes[mainNodeId]).toBeUndefined()
    expect(source.getState().nodes[srcNodeId].borrowedByMain).toBeUndefined()
    expect(setActiveWorktree).not.toHaveBeenCalled()
  })
})
