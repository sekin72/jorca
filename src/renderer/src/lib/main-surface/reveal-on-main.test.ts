import { describe, it, expect, beforeEach, vi } from 'vitest'

const setMainSurfaceActive = vi.fn()
vi.mock('../../store', () => ({
  useAppStore: { getState: () => ({ setMainSurfaceActive }) }
}))

import { revealOnMain } from './reveal-on-main'
import { pullToMain } from './pull-to-main'
import {
  getMainCanvasStore,
  getOrCreateCanvasStoreForWorktree,
  releaseCanvasStoreForWorktree
} from '../../store/canvas/canvas-store'
import { focusedNodeId } from '../../store/canvas/canvas-selection-model'

const WT = 'wt-reveal'

describe('revealOnMain', () => {
  beforeEach(() => {
    releaseCanvasStoreForWorktree(WT)
    getMainCanvasStore().getState().clearAllNodes()
  })

  it('focuses the Main node hosting the panel', () => {
    const source = getOrCreateCanvasStoreForWorktree(WT)
    const nodeId = source.getState().addNode('panel-x')
    pullToMain(WT, nodeId)

    const mainNodeId = getMainCanvasStore().getState().nodeForPanel('panel-x')
    expect(revealOnMain('panel-x')).toBe(true)
    expect(focusedNodeId(getMainCanvasStore().getState())).toBe(mainNodeId)
    expect(setMainSurfaceActive).toHaveBeenCalledWith(true)
  })

  it('returns false when the panel is not on Main', () => {
    expect(revealOnMain('not-borrowed')).toBe(false)
  })
})
