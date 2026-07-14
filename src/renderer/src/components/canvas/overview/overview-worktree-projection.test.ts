import { describe, it, expect } from 'vitest'
import {
  computeFitTransform,
  computeNodesBbox,
  projectWorktreeCanvas,
  type ProjectionGeometry
} from './overview-worktree-projection'

describe('computeNodesBbox', () => {
  it('returns a zero-size box for no nodes', () => {
    expect(computeNodesBbox([])).toEqual({
      origin: { x: 0, y: 0 },
      size: { width: 0, height: 0 }
    })
  })

  it('encloses all nodes including negative origins', () => {
    const bbox = computeNodesBbox([
      { origin: { x: -10, y: 5 }, size: { width: 20, height: 10 } },
      { origin: { x: 40, y: 0 }, size: { width: 10, height: 30 } }
    ])
    expect(bbox).toEqual({ origin: { x: -10, y: 0 }, size: { width: 60, height: 30 } })
  })
})

describe('projectWorktreeCanvas', () => {
  it('maps nodes to boxes, resolves kind, and computes the bbox', () => {
    const geometry: ProjectionGeometry = {
      nodes: {
        n1: { panelId: 'tab-term', origin: { x: 0, y: 0 }, size: { width: 100, height: 80 } },
        n2: { panelId: 'tab-edit', origin: { x: 200, y: 50 }, size: { width: 120, height: 90 } }
      }
    }
    const proj = projectWorktreeCanvas('wt-1', 'Feature X', geometry, (panelId) =>
      panelId === 'tab-term' ? 'terminal' : 'editor'
    )
    expect(proj.worktreeId).toBe('wt-1')
    expect(proj.label).toBe('Feature X')
    expect(proj.nodeCount).toBe(2)
    expect(proj.nodeBoxes.find((b) => b.id === 'n1')?.kind).toBe('terminal')
    expect(proj.bbox).toEqual({ origin: { x: 0, y: 0 }, size: { width: 320, height: 140 } })
  })

  it('produces an empty projection for a worktree with no nodes', () => {
    const proj = projectWorktreeCanvas('wt-2', 'Empty', { nodes: {} }, () => 'other')
    expect(proj.nodeCount).toBe(0)
    expect(proj.bbox.size).toEqual({ width: 0, height: 0 })
  })
})

describe('computeFitTransform', () => {
  it('scales down and centers a large bbox', () => {
    // 200x100 bbox into a 100x100 inner box (no padding) → scale 0.5, centered Y.
    const t = computeFitTransform(
      { origin: { x: 0, y: 0 }, size: { width: 200, height: 100 } },
      100,
      100,
      0
    )
    expect(t.scale).toBe(0.5)
    expect(t.offsetX).toBe(0)
    expect(t.offsetY).toBe(25)
  })

  it('does not upscale past maxScale and accounts for bbox origin', () => {
    const t = computeFitTransform(
      { origin: { x: 10, y: 10 }, size: { width: 20, height: 20 } },
      100,
      100,
      0,
      1
    )
    expect(t.scale).toBe(1)
    // centered: (100-20)/2 = 40, minus origin*scale (10) → 30
    expect(t.offsetX).toBe(30)
  })

  it('is safe for an empty bbox', () => {
    const t = computeFitTransform(
      { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } },
      50,
      50,
      4
    )
    expect(t).toEqual({ scale: 1, offsetX: 4, offsetY: 4 })
  })
})
