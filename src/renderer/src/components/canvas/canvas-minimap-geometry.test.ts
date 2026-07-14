import { describe, it, expect } from 'vitest'
import {
  computeMinimapLayout,
  minimapPointToViewportOffset,
  type MinimapInput
} from './canvas-minimap-geometry'
import type { CanvasNodeState } from '../../../../shared/canvas-node'

function node(id: string, x: number, y: number): CanvasNodeState {
  return {
    id,
    panelId: id,
    origin: { x, y },
    size: { width: 100, height: 100 },
    zOrder: 0,
    creationIndex: 0
  }
}

const base: MinimapInput = {
  nodes: { a: node('a', 0, 0), b: node('b', 400, 300) },
  viewportOffset: { x: 0, y: 0 },
  zoomLevel: 1,
  containerSize: { width: 800, height: 600 },
  minimapSize: { width: 180, height: 120 }
}

describe('computeMinimapLayout', () => {
  it('projects every node and the viewport into the minimap box', () => {
    const layout = computeMinimapLayout(base)
    expect(layout.nodeRects).toHaveLength(2)
    // All projected rects fall within the minimap bounds.
    for (const r of [...layout.nodeRects, layout.viewRect]) {
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.x + r.w).toBeLessThanOrEqual(base.minimapSize.width + 0.001)
      expect(r.y + r.h).toBeLessThanOrEqual(base.minimapSize.height + 0.001)
    }
  })

  it('scales down when the world is larger than the box', () => {
    const layout = computeMinimapLayout(base)
    expect(layout.scale).toBeLessThan(1)
  })

  it('click maps back to a viewport offset that centers that world point', () => {
    const layout = computeMinimapLayout(base)
    // Click the center of node b's projected rect → its world center should end
    // up at the screen center.
    const b = layout.nodeRects.find((r) => r.id === 'b')!
    const clickPoint = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
    const offset = minimapPointToViewportOffset(
      layout,
      clickPoint,
      base.zoomLevel,
      base.containerSize
    )
    // world center of b = (450, 350); screen center = (400, 300).
    // offset = center - world*zoom = (400-450, 300-350) = (-50, -50)
    expect(offset.x).toBeCloseTo(-50, 0)
    expect(offset.y).toBeCloseTo(-50, 0)
  })

  it('handles an empty canvas (viewport-only bounds)', () => {
    const layout = computeMinimapLayout({ ...base, nodes: {} })
    expect(layout.nodeRects).toHaveLength(0)
    expect(layout.viewRect.w).toBeGreaterThan(0)
  })
})
