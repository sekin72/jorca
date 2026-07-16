import { describe, it, expect, beforeEach } from 'vitest'

import { revealOnWorktreeCanvas } from './reveal-on-worktree-canvas'
import {
  getOrCreateCanvasStoreForWorktree,
  releaseCanvasStoreForWorktree
} from '../../store/canvas/canvas-store'
import { focusedNodeId } from '../../store/canvas/canvas-selection-model'

const WT = 'wt-reveal-canvas'

describe('revealOnWorktreeCanvas', () => {
  beforeEach(() => {
    releaseCanvasStoreForWorktree(WT)
  })

  it('centers + focuses the node hosting the panel', () => {
    const store = getOrCreateCanvasStoreForWorktree(WT)
    store.getState().setContainerSize({ width: 1000, height: 800 })
    const nodeId = store.getState().addNode('panel-x', { x: 4000, y: 4000 })
    store.getState().unfocus()

    revealOnWorktreeCanvas(WT, 'panel-x')

    expect(focusedNodeId(store.getState())).toBe(nodeId)
    // A far-away node means centering had to move the viewport off the origin.
    expect(store.getState().viewportOffset).not.toEqual({ x: 0, y: 0 })
  })

  it('is a no-op when the worktree has no canvas store', () => {
    expect(() => revealOnWorktreeCanvas('wt-none', 'panel-x')).not.toThrow()
  })

  it('is a no-op when the panel is not on the canvas', () => {
    const store = getOrCreateCanvasStoreForWorktree(WT)
    store.getState().addNode('panel-a')
    store.getState().unfocus()
    revealOnWorktreeCanvas(WT, 'panel-missing')
    expect(store.getState().selectionActive).toBe(false)
  })
})
