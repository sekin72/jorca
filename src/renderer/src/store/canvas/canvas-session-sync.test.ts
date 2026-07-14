import { describe, it, expect, vi } from 'vitest'
import { toPersistedCanvas, installCanvasSessionSync } from './canvas-session-sync'
import { getOrCreateCanvasStoreForWorktree, releaseCanvasStoreForWorktree } from './canvas-store'
import type { CanvasNodeState } from '../../../../shared/canvas-node'

function node(id: string, overrides: Partial<CanvasNodeState> = {}): CanvasNodeState {
  return {
    id,
    panelId: `tab-${id}`,
    origin: { x: 1, y: 2 },
    size: { width: 100, height: 80 },
    zOrder: 0,
    creationIndex: 0,
    animationState: 'entering',
    ...overrides
  }
}

describe('toPersistedCanvas', () => {
  it('strips transient fields and keeps geometry', () => {
    const result = toPersistedCanvas({
      nodes: { a: node('a', { isPinned: true, preMaximizeOrigin: { x: 0, y: 0 } }) },
      viewportOffset: { x: 5, y: 6 },
      zoomLevel: 1.5
    })
    expect(result).toEqual({
      nodes: {
        a: {
          id: 'a',
          panelId: 'tab-a',
          origin: { x: 1, y: 2 },
          size: { width: 100, height: 80 },
          zOrder: 0,
          creationIndex: 0,
          isPinned: true
        }
      },
      viewportOffset: { x: 5, y: 6 },
      zoomLevel: 1.5
    })
  })

  it('returns null for an empty canvas so an emptied canvas is dropped', () => {
    expect(
      toPersistedCanvas({ nodes: {}, viewportOffset: { x: 0, y: 0 }, zoomLevel: 1 })
    ).toBeNull()
  })
})

describe('installCanvasSessionSync', () => {
  it('forwards a debounced, deduped snapshot for geometry changes', () => {
    vi.useFakeTimers()
    const worktreeId = 'wt-sync-1'
    releaseCanvasStoreForWorktree(worktreeId)
    const store = getOrCreateCanvasStoreForWorktree(worktreeId)
    const sink = vi.fn()
    const teardown = installCanvasSessionSync(sink, { debounceMs: 50 })

    store.getState().addNode('tab-1', { x: 0, y: 0 })
    // Debounced: nothing yet.
    expect(sink).not.toHaveBeenCalled()
    vi.advanceTimersByTime(50)
    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink.mock.calls[0][0]).toBe(worktreeId)
    expect(Object.keys(sink.mock.calls[0][1].nodes)).toHaveLength(1)

    // A selection-only change must not persist.
    const onlyNode = Object.keys(store.getState().nodes)[0]
    store.getState().selectNodes([onlyNode])
    vi.advanceTimersByTime(50)
    expect(sink).toHaveBeenCalledTimes(1)

    teardown()
    releaseCanvasStoreForWorktree(worktreeId)
    vi.useRealTimers()
  })
})
