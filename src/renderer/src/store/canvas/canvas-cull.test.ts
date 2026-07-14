import { describe, it, expect } from 'vitest'
import { selectVisibleNodeIds } from './canvas-store'
import type { CanvasNodeState } from '../../../../shared/canvas-node'

function node(id: string, x: number, y: number, extra?: Partial<CanvasNodeState>): CanvasNodeState {
  return {
    id,
    panelId: `panel-${id}`,
    origin: { x, y },
    size: { width: 200, height: 150 },
    zOrder: 0,
    creationIndex: 0,
    ...extra
  }
}

const base = {
  viewportOffset: { x: 0, y: 0 },
  zoomLevel: 1,
  containerSize: { width: 800, height: 600 },
  selection: [] as string[],
  selectionActive: false
}

describe('selectVisibleNodeIds', () => {
  it('renders everything before container size is known', () => {
    const s = {
      ...base,
      containerSize: { width: 0, height: 0 },
      nodes: { a: node('a', 99999, 99999) }
    }
    expect(selectVisibleNodeIds(s)).toEqual(['a'])
  })

  it('culls nodes far outside the margin-expanded viewport', () => {
    const s = { ...base, nodes: { on: node('on', 100, 100), off: node('off', 100000, 100000) } }
    const visible = selectVisibleNodeIds(s)
    expect(visible).toContain('on')
    expect(visible).not.toContain('off')
  })

  it('exempts the focused node from culling', () => {
    const s = {
      ...base,
      selection: ['off'],
      selectionActive: true,
      nodes: { off: node('off', 100000, 100000) }
    }
    expect(selectVisibleNodeIds(s)).toContain('off')
  })

  it('exempts pinned nodes from culling', () => {
    const s = { ...base, nodes: { off: node('off', 100000, 100000, { isPinned: true }) } }
    expect(selectVisibleNodeIds(s)).toContain('off')
  })

  it('exempts keep-mounted panels from culling', () => {
    const s = { ...base, nodes: { off: node('off', 100000, 100000) } }
    const keep = new Set(['panel-off'])
    expect(selectVisibleNodeIds(s, keep)).toContain('off')
  })

  it('returns ids in ascending z-order', () => {
    const s = {
      ...base,
      nodes: {
        top: node('top', 0, 0, { zOrder: 5 }),
        bottom: node('bottom', 0, 0, { zOrder: 1 })
      }
    }
    expect(selectVisibleNodeIds(s)).toEqual(['bottom', 'top'])
  })
})
