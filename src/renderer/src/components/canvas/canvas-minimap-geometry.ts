// Pure geometry for the canvas minimap (docs/main-surface.md T-C4). Projects the
// world (all node rects + the current viewport rect) into a fixed minimap box,
// and maps a click inside the minimap back to the viewport offset that centers
// that world point. No React/DOM — unit-testable.

import type { CanvasNodeState, Point, Size } from '../../../../shared/canvas-node'

export type MinimapRect = { x: number; y: number; w: number; h: number }

export type MinimapLayout = {
  /** Node boxes in minimap-local pixels. `color` = the node's window tint, if set. */
  nodeRects: (MinimapRect & { id: string; color?: string })[]
  /** The current viewport (what's on screen) in minimap-local pixels. */
  viewRect: MinimapRect
  /** world→minimap transform (minimapX = (worldX - minX) * scale + padX). */
  scale: number
  minX: number
  minY: number
  padX: number
  padY: number
}

export type MinimapInput = {
  nodes: Record<string, CanvasNodeState>
  viewportOffset: Point
  zoomLevel: number
  containerSize: Size
  minimapSize: Size
  padding?: number
}

/** World rect currently visible on screen (canvas coords). */
function viewportWorldRect(input: MinimapInput): MinimapRect {
  const z = input.zoomLevel > 0 ? input.zoomLevel : 1
  return {
    x: -input.viewportOffset.x / z,
    y: -input.viewportOffset.y / z,
    w: input.containerSize.width / z,
    h: input.containerSize.height / z
  }
}

export function computeMinimapLayout(input: MinimapInput): MinimapLayout {
  const pad = input.padding ?? 6
  const view = viewportWorldRect(input)
  const nodeList = Object.values(input.nodes)

  // World bounds = union of all node rects and the viewport rect, so the view
  // indicator is always on the map even when panned away from every node.
  let minX = view.x
  let minY = view.y
  let maxX = view.x + view.w
  let maxY = view.y + view.h
  for (const n of nodeList) {
    minX = Math.min(minX, n.origin.x)
    minY = Math.min(minY, n.origin.y)
    maxX = Math.max(maxX, n.origin.x + n.size.width)
    maxY = Math.max(maxY, n.origin.y + n.size.height)
  }
  const worldW = Math.max(maxX - minX, 1)
  const worldH = Math.max(maxY - minY, 1)

  const availW = Math.max(input.minimapSize.width - pad * 2, 1)
  const availH = Math.max(input.minimapSize.height - pad * 2, 1)
  const scale = Math.min(availW / worldW, availH / worldH)
  // Center the projected content within the available area.
  const padX = pad + (availW - worldW * scale) / 2
  const padY = pad + (availH - worldH * scale) / 2

  const project = (r: MinimapRect): MinimapRect => ({
    x: (r.x - minX) * scale + padX,
    y: (r.y - minY) * scale + padY,
    w: r.w * scale,
    h: r.h * scale
  })

  return {
    nodeRects: nodeList.map((n) => ({
      id: n.id,
      ...(n.color ? { color: n.color } : {}),
      ...project({ x: n.origin.x, y: n.origin.y, w: n.size.width, h: n.size.height })
    })),
    viewRect: project(view),
    scale,
    minX,
    minY,
    padX,
    padY
  }
}

/** Given a click at minimap-local (mx, my), the viewport offset that centers that
 *  world point on screen. */
export function minimapPointToViewportOffset(
  layout: Pick<MinimapLayout, 'scale' | 'minX' | 'minY' | 'padX' | 'padY'>,
  minimapPoint: Point,
  zoomLevel: number,
  containerSize: Size
): Point {
  const worldX = layout.minX + (minimapPoint.x - layout.padX) / layout.scale
  const worldY = layout.minY + (minimapPoint.y - layout.padY) / layout.scale
  return {
    x: containerSize.width / 2 - worldX * zoomLevel,
    y: containerSize.height / 2 - worldY * zoomLevel
  }
}
