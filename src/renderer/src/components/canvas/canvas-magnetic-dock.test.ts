import { describe, it, expect } from 'vitest'
import type { Rect } from '../../../../shared/canvas-node'
import { magneticDock, applyDock, DOCK_GUTTER } from './canvas-magnetic-dock'

// A fixed neighbor at x[100..300], y[0..200].
const NB: Rect = { origin: { x: 100, y: 0 }, size: { width: 200, height: 200 } }

describe('magneticDock', () => {
  it('clicks the moving left edge flush to a neighbor right edge + gutter', () => {
    // Dragged 200x100 window near the neighbor's right edge (300), y-overlapping.
    const raw = { x: 305, y: 20 }
    const res = magneticDock(raw, { width: 200, height: 100 }, [NB])
    expect(res.x).not.toBeNull()
    expect(res.x!.lo).toBe(300 + DOCK_GUTTER) // 312
    expect(res.x!.guide).toBe(300)
  })

  it('clicks the moving right edge flush to a neighbor left edge − gutter', () => {
    // Window whose right edge is near the neighbor's left edge (100).
    const raw = { x: -110, y: 20 } // wants right edge at 100 − gutter = 88 → lo = 88 − 200
    const res = magneticDock(raw, { width: 200, height: 100 }, [NB])
    expect(res.x).not.toBeNull()
    expect(res.x!.lo).toBe(100 - DOCK_GUTTER - 200) // -112
    expect(res.x!.guide).toBe(100)
  })

  it('does not dock when the perpendicular spans do not overlap', () => {
    // Same x-proximity but placed far below the neighbor (no y overlap).
    const raw = { x: 305, y: 500 }
    const res = magneticDock(raw, { width: 200, height: 100 }, [NB])
    expect(res.x).toBeNull()
  })

  it('returns null on both axes when nothing is within tolerance', () => {
    const raw = { x: 600, y: 600 }
    const res = magneticDock(raw, { width: 200, height: 100 }, [NB])
    expect(res.x).toBeNull()
    expect(res.y).toBeNull()
  })

  it('docks vertically (stacked) when x-spans overlap', () => {
    // Below the neighbor's bottom edge (200), x-overlapping.
    const raw = { x: 120, y: 205 }
    const res = magneticDock(raw, { width: 100, height: 100 }, [NB])
    expect(res.y).not.toBeNull()
    expect(res.y!.lo).toBe(200 + DOCK_GUTTER) // 212
  })
})

describe('applyDock', () => {
  it('lets the dock win over the base snap per axis', () => {
    const base = {
      origin: { x: 999, y: 42 },
      guides: [{ axis: 'x' as const, position: 999 }]
    }
    const merged = applyDock(base, { x: { lo: 312, guide: 300 }, y: null })
    expect(merged.origin).toEqual({ x: 312, y: 42 })
    // The base x-guide is replaced by the dock seam; no stray x guide remains.
    expect(merged.guides).toEqual([{ axis: 'x', position: 300 }])
  })

  it('returns the base untouched when no dock applies', () => {
    const base = { origin: { x: 1, y: 2 }, guides: [] }
    expect(applyDock(base, { x: null, y: null })).toBe(base)
  })
})
