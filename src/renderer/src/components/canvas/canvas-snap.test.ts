import { describe, expect, it } from 'vitest'
import {
  CANVAS_GRID_SIZE,
  snapScalarToGrid,
  snapPointToGrid,
  snapAxis,
  snapNodeDrag,
  snapResizeDelta
} from './canvas-snap'
import type { Rect } from '../../../../shared/canvas-node'

describe('grid snapping', () => {
  it('rounds a scalar to the nearest grid multiple', () => {
    expect(CANVAS_GRID_SIZE).toBe(20)
    expect(snapScalarToGrid(11)).toBe(20)
    expect(snapScalarToGrid(9)).toBe(0)
    expect(snapScalarToGrid(-25)).toBe(-20)
  })

  it('rounds a point to the nearest grid intersection', () => {
    expect(snapPointToGrid({ x: 11, y: 9 })).toEqual({ x: 20, y: 0 })
    expect(snapPointToGrid({ x: 250, y: 175 })).toEqual({ x: 260, y: 180 })
  })
})

describe('snapAxis', () => {
  it('grid-snaps when no neighbor edge is within tolerance', () => {
    expect(snapAxis(103, 200, [])).toEqual({ lo: 100, guide: null })
  })

  it('aligns the low edge to a neighbor edge within tolerance', () => {
    // moving low edge at 102, neighbor edge at 100 → snap to 100, guide at 100
    expect(snapAxis(102, 200, [100])).toEqual({ lo: 100, guide: 100 })
  })

  it('aligns the center to a neighbor and shifts the low edge accordingly', () => {
    // span 200 wide, low at 3 → center at 103; neighbor at 100 → center aligns,
    // low shifts to 0
    expect(snapAxis(3, 200, [100])).toEqual({ lo: 0, guide: 100 })
  })

  it('prefers the nearest of several candidate edges', () => {
    expect(snapAxis(101, 100, [100, 400])).toEqual({ lo: 100, guide: 100 })
  })
})

describe('snapNodeDrag', () => {
  const others: Rect[] = [{ origin: { x: 100, y: 100 }, size: { width: 200, height: 100 } }]

  it('emits guides on both axes when aligned to a neighbor', () => {
    const r = snapNodeDrag({ x: 102, y: 98 }, { width: 200, height: 100 }, others)
    expect(r.origin).toEqual({ x: 100, y: 100 })
    expect(r.guides).toEqual([
      { axis: 'x', position: 100 },
      { axis: 'y', position: 100 }
    ])
  })

  it('grid-snaps and emits no guides when far from neighbors', () => {
    const r = snapNodeDrag({ x: 803, y: 617 }, { width: 200, height: 100 }, others)
    expect(r.origin).toEqual({ x: 800, y: 620 })
    expect(r.guides).toEqual([])
  })

  it('skips guide computation and grid-snaps when guides are disabled', () => {
    const r = snapNodeDrag({ x: 102, y: 98 }, { width: 200, height: 100 }, others, {
      guides: false
    })
    expect(r.origin).toEqual({ x: 100, y: 100 })
    expect(r.guides).toEqual([])
  })
})

describe('snapResizeDelta', () => {
  const origin = { x: 100, y: 100 }
  const size = { width: 200, height: 140 }

  it('snaps the east edge, leaving the west edge (delta x unaffected on w)', () => {
    // right edge at 300; dx 7 → 307 → nearest grid 300 → delta back to 0
    expect(snapResizeDelta(origin, size, 'e', 7, 0)).toEqual({ dx: 0, dy: 0 })
  })

  it('snaps the west edge for a w-pull', () => {
    // left edge at 100; dx -13 → 87 → nearest grid 80 → delta -20
    expect(snapResizeDelta(origin, size, 'w', -13, 0)).toEqual({ dx: -20, dy: 0 })
  })

  it('snaps both moving edges for a corner handle', () => {
    // se: right edge 300 + 11 = 311 → 320 → +20; bottom edge 240 + 6 = 246 → 240 → 0
    expect(snapResizeDelta(origin, size, 'se', 11, 6)).toEqual({ dx: 20, dy: 0 })
  })
})
