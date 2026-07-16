import { describe, expect, it } from 'vitest'
import { recommendPlacements } from './canvas-placement'
import type { CanvasNodeId, CanvasNodeState, Rect } from '../../../../shared/canvas-node'

const viewport = { offset: { x: 0, y: 0 }, zoom: 1, containerSize: { width: 1600, height: 1000 } }

function node(id: string, x: number, y: number, w = 720, h = 480): CanvasNodeState {
  return {
    id,
    panelId: id,
    origin: { x, y },
    size: { width: w, height: h },
    zOrder: 0,
    creationIndex: 0,
    animationState: 'idle'
  } as CanvasNodeState
}

function overlaps(a: Rect, b: Rect): boolean {
  return !(
    a.origin.x + a.size.width <= b.origin.x ||
    b.origin.x + b.size.width <= a.origin.x ||
    a.origin.y + a.size.height <= b.origin.y ||
    b.origin.y + b.size.height <= a.origin.y
  )
}

describe('recommendPlacements', () => {
  it('offers size choices centered on an empty canvas', () => {
    const out = recommendPlacements({}, null, viewport, { x: 800, y: 500 }, 6)
    expect(out.length).toBeGreaterThanOrEqual(1)
    // First (best) spot is grid-aligned.
    expect(out[0].point.x % 20).toBe(0)
    expect(out[0].point.y % 20).toBe(0)
  })

  it('never recommends a spot overlapping an existing node', () => {
    const nodes: Record<CanvasNodeId, CanvasNodeState> = {
      a: node('a', 200, 200),
      b: node('b', 200, 720)
    }
    const out = recommendPlacements(nodes, 'a', viewport, null, 6)
    expect(out.length).toBeGreaterThanOrEqual(1)
    for (const c of out) {
      const rect = { origin: c.point, size: c.size }
      for (const n of Object.values(nodes)) {
        expect(overlaps(rect, { origin: n.origin, size: n.size })).toBe(false)
      }
    }
  })

  it('recommended spots do not overlap each other', () => {
    const nodes = { a: node('a', 300, 300) }
    const out = recommendPlacements(nodes, 'a', viewport, null, 6)
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const ri = { origin: out[i].point, size: out[i].size }
        const rj = { origin: out[j].point, size: out[j].size }
        expect(overlaps(ri, rj)).toBe(false)
      }
    }
  })
})
