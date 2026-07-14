import { describe, it, expect, beforeEach } from 'vitest'
import { createCanvasStore } from './canvas-store'
import type { CanvasStore } from './canvas-store-types'
import type { StoreApi, UseBoundStore } from 'zustand'

function mk(): UseBoundStore<StoreApi<CanvasStore>> {
  const s = createCanvasStore()
  s.getState().setContainerSize({ width: 1000, height: 800 })
  return s
}

describe('canvas nodes', () => {
  let store: UseBoundStore<StoreApi<CanvasStore>>
  beforeEach(() => {
    store = mk()
  })

  it('adds a node, assigning z-order and creation index', () => {
    const id = store.getState().addNode('panel-a')
    const node = store.getState().nodes[id]
    expect(node.panelId).toBe('panel-a')
    expect(node.zOrder).toBe(0)
    expect(node.creationIndex).toBe(0)
    expect(store.getState().selection).toEqual([id])
    expect(store.getState().selectionActive).toBe(true)
  })

  it('dedupes on panelId: re-adding repositions and focuses the existing node', () => {
    const first = store.getState().addNode('panel-a')
    const again = store.getState().addNode('panel-a')
    expect(again).toBe(first)
    expect(Object.keys(store.getState().nodes)).toHaveLength(1)
  })

  it('cascades new nodes so they do not exactly overlap', () => {
    const a = store.getState().addNode('a', { x: 0, y: 0 }, { width: 100, height: 100 })
    const b = store.getState().addNode('b', { x: 0, y: 0 }, { width: 100, height: 100 })
    const na = store.getState().nodes[a]
    const nb = store.getState().nodes[b]
    expect(nb.origin).not.toEqual(na.origin)
  })

  it('moves and resizes a node', () => {
    const id = store.getState().addNode('a')
    store.getState().moveNode(id, { x: 50, y: 60 })
    expect(store.getState().nodes[id].origin).toEqual({ x: 50, y: 60 })
    store.getState().resizeNode(id, { width: 200, height: 150 }, { x: 10, y: 20 })
    expect(store.getState().nodes[id].size).toEqual({ width: 200, height: 150 })
    expect(store.getState().nodes[id].origin).toEqual({ x: 10, y: 20 })
  })

  it('focus bumps z-order to the top', () => {
    const a = store.getState().addNode('a')
    const b = store.getState().addNode('b')
    expect(store.getState().nodes[b].zOrder).toBeGreaterThan(store.getState().nodes[a].zOrder)
    store.getState().focusNode(a)
    expect(store.getState().nodes[a].zOrder).toBeGreaterThan(store.getState().nodes[b].zOrder)
  })

  it('removeNode marks exiting then finalizeRemoveNode deletes', () => {
    const id = store.getState().addNode('a')
    store.getState().removeNode(id)
    expect(store.getState().nodes[id].animationState).toBe('exiting')
    store.getState().finalizeRemoveNode(id)
    expect(store.getState().nodes[id]).toBeUndefined()
  })

  it('toggleMaximize saves and restores geometry', () => {
    const id = store.getState().addNode('a', { x: 100, y: 100 }, { width: 200, height: 200 })
    store.getState().toggleMaximize(id)
    const maxed = store.getState().nodes[id]
    expect(maxed.preMaximizeOrigin).toEqual({ x: 100, y: 100 })
    expect(maxed.size.width).toBeGreaterThan(200)
    store.getState().toggleMaximize(id)
    const restored = store.getState().nodes[id]
    expect(restored.origin).toEqual({ x: 100, y: 100 })
    expect(restored.size).toEqual({ width: 200, height: 200 })
    expect(restored.preMaximizeOrigin).toBeUndefined()
  })

  it('nextNode / previousNode wrap by creation order', () => {
    const a = store.getState().addNode('a')
    const b = store.getState().addNode('b')
    store.getState().focusNode(a)
    expect(store.getState().nextNode()).toBe(b)
    expect(store.getState().previousNode()).toBe(b)
  })
})

describe('canvas selection + delete', () => {
  it('deleteSelection removes all selected nodes', () => {
    const store = mk()
    const a = store.getState().addNode('a')
    const b = store.getState().addNode('b')
    store.getState().selectNodes([a, b])
    store.getState().deleteSelection()
    store.getState().finalizeRemoveNode(a)
    store.getState().finalizeRemoveNode(b)
    expect(Object.keys(store.getState().nodes)).toHaveLength(0)
    expect(store.getState().selection).toEqual([])
  })
})

describe('canvas undo/redo', () => {
  it('undo reverses an add; redo reapplies it', () => {
    const store = mk()
    const id = store.getState().addNode('a')
    expect(store.getState().nodes[id]).toBeDefined()
    store.getState().undo()
    expect(store.getState().nodes[id]).toBeUndefined()
    store.getState().redo()
    expect(store.getState().nodes[id]).toBeDefined()
  })
})

describe('canvas viewport', () => {
  it('canvasToView and viewToCanvas round-trip', () => {
    const store = mk()
    store.getState().setZoomAndOffset(1.5, { x: 40, y: 20 })
    const p = { x: 123, y: 456 }
    const back = store.getState().viewToCanvas(store.getState().canvasToView(p))
    expect(back.x).toBeCloseTo(p.x)
    expect(back.y).toBeCloseTo(p.y)
  })

  it('zoomAroundPoint keeps the point under the cursor fixed', () => {
    const store = mk()
    const viewPoint = { x: 300, y: 200 }
    const before = store.getState().viewToCanvas(viewPoint)
    store.getState().zoomAroundPoint(2, viewPoint)
    const after = store.getState().viewToCanvas(viewPoint)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('clamps zoom to bounds', () => {
    const store = mk()
    store.getState().setZoom(99)
    expect(store.getState().zoomLevel).toBe(3)
    store.getState().setZoom(0.001)
    expect(store.getState().zoomLevel).toBe(0.3)
  })

  it('zoomToFit frames all nodes within bounds', () => {
    const store = mk()
    store.getState().addNode('a', { x: 0, y: 0 }, { width: 100, height: 100 })
    store.getState().addNode('b', { x: 2000, y: 1500 }, { width: 100, height: 100 })
    store.getState().zoomToFit()
    expect(store.getState().zoomLevel).toBeGreaterThanOrEqual(0.3)
    expect(store.getState().zoomLevel).toBeLessThanOrEqual(3)
  })
})

describe('loadWorkspaceCanvas', () => {
  it('hydrates nodes idle and recomputes counters', () => {
    const store = mk()
    store.getState().loadWorkspaceCanvas(
      {
        n1: {
          id: 'n1',
          panelId: 'p1',
          origin: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
          zOrder: 5,
          creationIndex: 3,
          animationState: 'entering'
        }
      },
      { x: 10, y: 10 },
      2
    )
    expect(store.getState().nodes.n1.animationState).toBe('idle')
    expect(store.getState().nextZOrder).toBe(6)
    expect(store.getState().nextCreationIndex).toBe(4)
    expect(store.getState().zoomLevel).toBe(2)
  })
})
