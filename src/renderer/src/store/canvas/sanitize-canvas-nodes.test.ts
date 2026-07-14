import { describe, it, expect } from 'vitest'
import { sanitizeLoadedCanvasNodes, isValidPoint, isValidSize } from './sanitize-canvas-nodes'

describe('sanitizeLoadedCanvasNodes', () => {
  it('keeps a valid node untouched', () => {
    const raw = {
      n1: {
        id: 'n1',
        panelId: 'p1',
        origin: { x: 1, y: 2 },
        size: { width: 100, height: 80 },
        zOrder: 0,
        creationIndex: 0
      }
    }
    const res = sanitizeLoadedCanvasNodes(raw)
    expect(res.repaired).toEqual([])
    expect(res.dropped).toEqual([])
    expect(res.nodes.n1.origin).toEqual({ x: 1, y: 2 })
  })

  it('drops a node with no panelId', () => {
    const res = sanitizeLoadedCanvasNodes({
      bad: { origin: { x: 0, y: 0 }, size: { width: 1, height: 1 } }
    })
    expect(res.dropped).toContain('bad')
    expect(res.nodes.bad).toBeUndefined()
  })

  it('drops non-object entries', () => {
    const res = sanitizeLoadedCanvasNodes({ x: null, y: 42 } as Record<string, unknown>)
    expect(res.dropped.sort()).toEqual(['x', 'y'])
  })

  it('repairs a node missing size (does not crash)', () => {
    const res = sanitizeLoadedCanvasNodes({
      n1: { panelId: 'p1', origin: { x: 0, y: 0 }, zOrder: 0, creationIndex: 0 }
    })
    expect(res.repaired).toContain('n1')
    expect(isValidSize(res.nodes.n1.size)).toBe(true)
  })

  it('backfills missing z-order/creation counters above the max valid', () => {
    const res = sanitizeLoadedCanvasNodes({
      a: {
        panelId: 'a',
        origin: { x: 0, y: 0 },
        size: { width: 10, height: 10 },
        zOrder: 4,
        creationIndex: 7
      },
      b: { panelId: 'b', origin: { x: 0, y: 0 }, size: { width: 10, height: 10 } }
    })
    expect(res.nodes.b.zOrder).toBeGreaterThanOrEqual(5)
    expect(res.nodes.b.creationIndex).toBeGreaterThanOrEqual(8)
  })

  it('drops malformed pre-maximize geometry back to a normal node', () => {
    const res = sanitizeLoadedCanvasNodes({
      n1: {
        panelId: 'p1',
        origin: { x: 0, y: 0 },
        size: { width: 10, height: 10 },
        zOrder: 0,
        creationIndex: 0,
        preMaximizeOrigin: { x: Number.NaN, y: 0 }
      }
    })
    expect(res.repaired).toContain('n1')
    expect(res.nodes.n1.preMaximizeOrigin).toBeUndefined()
  })

  it('returns empty for null/garbage input', () => {
    expect(sanitizeLoadedCanvasNodes(null).nodes).toEqual({})
    expect(sanitizeLoadedCanvasNodes(undefined).nodes).toEqual({})
  })

  it('validators reject bad geometry', () => {
    expect(isValidPoint({ x: 1, y: 2 })).toBe(true)
    expect(isValidPoint({ x: 1 })).toBe(false)
    expect(isValidSize({ width: 0, height: 10 })).toBe(false)
    expect(isValidSize({ width: 10, height: 10 })).toBe(true)
  })
})
