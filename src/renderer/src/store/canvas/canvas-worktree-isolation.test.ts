// Each worktree owns an isolated canvas store — no worktree ever sees another's
// nodes. This isolation is load-bearing for both correctness (panels don't leak
// across projects) and persistence (canvasByWorktree is keyed by worktree). See
// docs/canvas-workspace.md.

import { describe, it, expect } from 'vitest'
import {
  getOrCreateCanvasStoreForWorktree,
  peekCanvasStoreForWorktree,
  releaseCanvasStoreForWorktree
} from './canvas-store'

describe('per-worktree canvas store registry', () => {
  it('returns a stable instance per worktree and never shares nodes', () => {
    releaseCanvasStoreForWorktree('wt-iso-a')
    releaseCanvasStoreForWorktree('wt-iso-b')

    const a = getOrCreateCanvasStoreForWorktree('wt-iso-a')
    const b = getOrCreateCanvasStoreForWorktree('wt-iso-b')
    expect(a).not.toBe(b)
    // Same worktree id → same instance (no duplicate stores).
    expect(getOrCreateCanvasStoreForWorktree('wt-iso-a')).toBe(a)
    expect(peekCanvasStoreForWorktree('wt-iso-a')).toBe(a)

    a.getState().addNode('tab-a', { x: 0, y: 0 })
    expect(Object.keys(a.getState().nodes)).toHaveLength(1)
    // b is untouched by writes to a.
    expect(Object.keys(b.getState().nodes)).toHaveLength(0)

    releaseCanvasStoreForWorktree('wt-iso-a')
    releaseCanvasStoreForWorktree('wt-iso-b')
  })

  it('release drops the instance so a later get creates a fresh, empty store', () => {
    const first = getOrCreateCanvasStoreForWorktree('wt-iso-c')
    first.getState().addNode('tab-c', { x: 0, y: 0 })
    releaseCanvasStoreForWorktree('wt-iso-c')
    expect(peekCanvasStoreForWorktree('wt-iso-c')).toBeUndefined()

    const second = getOrCreateCanvasStoreForWorktree('wt-iso-c')
    expect(second).not.toBe(first)
    expect(Object.keys(second.getState().nodes)).toHaveLength(0)
    releaseCanvasStoreForWorktree('wt-iso-c')
  })
})
