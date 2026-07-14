import { describe, it, expect, beforeEach } from 'vitest'
import { pullToMain } from './pull-to-main'
import {
  getMainCanvasStore,
  getOrCreateCanvasStoreForWorktree,
  releaseCanvasStoreForWorktree
} from '../../store/canvas/canvas-store'

const WT = 'wt-pull'

function resetMain(): void {
  getMainCanvasStore().getState().clearAllNodes()
}

describe('pullToMain', () => {
  beforeEach(() => {
    releaseCanvasStoreForWorktree(WT)
    resetMain()
  })

  it('creates a Main node for the panel, tagged with the source worktree', () => {
    const source = getOrCreateCanvasStoreForWorktree(WT)
    const nodeId = source.getState().addNode('panel-1')

    const mainNodeId = pullToMain(WT, nodeId)
    expect(mainNodeId).not.toBeNull()

    const mainNodes = Object.values(getMainCanvasStore().getState().nodes)
    expect(mainNodes).toHaveLength(1)
    expect(mainNodes[0].panelId).toBe('panel-1')
    expect(mainNodes[0].sourceWorktreeId).toBe(WT)
  })

  it('marks the source node as borrowed (keeps it, keeps geometry)', () => {
    const source = getOrCreateCanvasStoreForWorktree(WT)
    const nodeId = source.getState().addNode('panel-1', { x: 42, y: 99 })
    const before = source.getState().nodes[nodeId]

    pullToMain(WT, nodeId)

    const after = source.getState().nodes[nodeId]
    expect(after.borrowedByMain).toBe(true)
    expect(after.origin).toEqual(before.origin)
    expect(after.size).toEqual(before.size)
  })

  it('is a no-op when already borrowed (no duplicate Main node)', () => {
    const source = getOrCreateCanvasStoreForWorktree(WT)
    const nodeId = source.getState().addNode('panel-1')

    pullToMain(WT, nodeId)
    const second = pullToMain(WT, nodeId)

    expect(second).toBeNull()
    expect(Object.values(getMainCanvasStore().getState().nodes)).toHaveLength(1)
  })

  it('returns null for an unknown worktree or node', () => {
    expect(pullToMain('nope', 'x')).toBeNull()
    const source = getOrCreateCanvasStoreForWorktree(WT)
    void source
    expect(pullToMain(WT, 'missing-node')).toBeNull()
  })
})
