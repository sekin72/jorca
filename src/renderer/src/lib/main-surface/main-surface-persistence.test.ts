import { describe, it, expect } from 'vitest'
import { serializeMainSnapshot, reconcileMainNodes } from './main-surface-persistence'
import type { CanvasNodeState, PersistedWorktreeCanvas } from '../../../../shared/canvas-node'

function node(id: string, panelId: string, source?: string): CanvasNodeState {
  return {
    id,
    panelId,
    origin: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    zOrder: 0,
    creationIndex: 0,
    ...(source ? { sourceWorktreeId: source } : {})
  }
}

describe('serializeMainSnapshot', () => {
  it('keeps sourceWorktreeId in the durable node shape', () => {
    const snap = serializeMainSnapshot({
      nodes: { a: node('a', 'panel-a', 'wt-1') },
      viewportOffset: { x: 5, y: 6 },
      zoomLevel: 1.5
    })
    expect(snap.nodes.a.sourceWorktreeId).toBe('wt-1')
    expect(snap.viewportOffset).toEqual({ x: 5, y: 6 })
    expect(snap.zoomLevel).toBe(1.5)
  })

  it('omits sourceWorktreeId when absent', () => {
    const snap = serializeMainSnapshot({
      nodes: { a: node('a', 'panel-a') },
      viewportOffset: { x: 0, y: 0 },
      zoomLevel: 1
    })
    expect('sourceWorktreeId' in snap.nodes.a).toBe(false)
  })
})

describe('reconcileMainNodes', () => {
  const saved: PersistedWorktreeCanvas = {
    nodes: {
      alive: { ...node('alive', 'panel-alive', 'wt-1') },
      dead: { ...node('dead', 'panel-dead', 'wt-2') }
    },
    viewportOffset: { x: 0, y: 0 },
    zoomLevel: 1
  }

  it('drops nodes whose backing tab is gone, keeps live ones', () => {
    const result = reconcileMainNodes(saved, (panelId) => panelId === 'panel-alive')
    expect(Object.keys(result.nodes)).toEqual(['alive'])
  })

  it('keeps everything when all tabs are alive', () => {
    const result = reconcileMainNodes(saved, () => true)
    expect(Object.keys(result.nodes).sort()).toEqual(['alive', 'dead'])
  })
})
