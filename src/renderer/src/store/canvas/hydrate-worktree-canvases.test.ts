import { describe, it, expect } from 'vitest'
import { pruneCanvasNodesToTabs } from './hydrate-worktree-canvases'
import type { PersistedWorktreeCanvas } from '../../../../shared/canvas-node'

function canvas(panelIds: string[]): PersistedWorktreeCanvas {
  const nodes: PersistedWorktreeCanvas['nodes'] = {}
  panelIds.forEach((panelId, i) => {
    nodes[`n${i}`] = {
      id: `n${i}`,
      panelId,
      origin: { x: 0, y: 0 },
      size: { width: 10, height: 10 },
      zOrder: i,
      creationIndex: i
    }
  })
  return { nodes, viewportOffset: { x: 0, y: 0 }, zoomLevel: 1 }
}

describe('pruneCanvasNodesToTabs', () => {
  it('drops nodes whose backing tab did not survive hydration', () => {
    const pruned = pruneCanvasNodesToTabs(canvas(['tab-a', 'tab-gone']), new Set(['tab-a']))
    expect(Object.values(pruned.nodes).map((n) => n.panelId)).toEqual(['tab-a'])
  })

  it('returns the same reference when nothing is pruned', () => {
    const input = canvas(['tab-a', 'tab-b'])
    expect(pruneCanvasNodesToTabs(input, new Set(['tab-a', 'tab-b']))).toBe(input)
  })
})
