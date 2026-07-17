import { describe, it, expect, beforeEach } from 'vitest'
import { createCanvasStore } from './canvas-store'

function addAt(
  store: ReturnType<typeof createCanvasStore>,
  panelId: string,
  source?: string
): string {
  return store.getState().addNode(
    panelId,
    { x: 0, y: 0 },
    { width: 300, height: 200 },
    {
      sourceWorktreeId: source
    }
  )
}

describe('arrange slice', () => {
  let store: ReturnType<typeof createCanvasStore>
  beforeEach(() => {
    store = createCanvasStore()
    store.getState().setContainerSize({ width: 1200, height: 800 })
  })

  it('autoLayout lays every node in a non-overlapping grid', () => {
    const ids = [addAt(store, 'a'), addAt(store, 'b'), addAt(store, 'c'), addAt(store, 'd')]
    store.getState().autoLayout()
    const origins = ids.map((id) => store.getState().nodes[id].origin)
    // All distinct positions.
    const keys = new Set(origins.map((o) => `${o.x},${o.y}`))
    expect(keys.size).toBe(ids.length)
  })

  it('autoVerticalLayout groups nodes into one column per source worktree', () => {
    const a1 = addAt(store, 'a1', 'wt-A')
    const b1 = addAt(store, 'b1', 'wt-B')
    const a2 = addAt(store, 'a2', 'wt-A')
    store.getState().autoVerticalLayout()
    const x = (id: string): number => store.getState().nodes[id].origin.x
    // Same worktree shares a column X; different worktrees differ.
    expect(x(a1)).toBe(x(a2))
    expect(x(a1)).not.toBe(x(b1))
    // And stacked vertically within the column.
    expect(store.getState().nodes[a2].origin.y).toBeGreaterThan(store.getState().nodes[a1].origin.y)
  })

  it('stackSelected lines up selected nodes along a column, anchored top-left', () => {
    const a = addAt(store, 'a')
    const b = addAt(store, 'b')
    store.getState().moveNode(a, { x: 100, y: 50 })
    store.getState().moveNode(b, { x: 400, y: 300 })
    store.getState().selectNodes([a, b])
    store.getState().stackSelected('column', 10)
    const na = store.getState().nodes[a]
    const nb = store.getState().nodes[b]
    expect(na.origin.x).toBe(nb.origin.x) // same column
    expect(nb.origin.y).toBe(na.origin.y + na.size.height + 10)
  })

  it('tidyGridSelected arranges only the selection and is undoable', () => {
    const a = addAt(store, 'a')
    const b = addAt(store, 'b')
    const c = addAt(store, 'c')
    store.getState().selectNodes([a, b, c])
    const beforeC = { ...store.getState().nodes[c].origin }
    store.getState().tidyGridSelected(10)
    expect(store.getState().nodes[c].origin).not.toEqual(beforeC)
    store.getState().undo()
    expect(store.getState().nodes[c].origin).toEqual(beforeC)
  })

  it('autoSize gives every node one uniform, container-filling size and resets zoom', () => {
    const ids = [addAt(store, 'a'), addAt(store, 'b'), addAt(store, 'c'), addAt(store, 'd')]
    store.getState().setZoom(2.5)
    store.getState().autoSize()
    const sizes = ids.map((id) => store.getState().nodes[id].size)
    // Every node ends up the exact same size...
    for (const s of sizes) {
      expect(s).toEqual(sizes[0])
    }
    // ...that tiles the 1200x800 container in a 2x2 grid (8px pad/gap).
    expect(sizes[0]).toEqual({ width: 588, height: 388 })
    // Zoom is reset to 100% at the origin regardless of prior zoom.
    expect(store.getState().zoomLevel).toBe(1)
    expect(store.getState().viewportOffset).toEqual({ x: 0, y: 0 })
  })

  it('autoSize reflows into the grid in current reading order and is undoable', () => {
    const [a, b, c, d] = [
      addAt(store, 'a'),
      addAt(store, 'b'),
      addAt(store, 'c'),
      addAt(store, 'd')
    ]
    // Scramble positions; reading order (y then x) is b, c, a, d.
    store.getState().moveNode(a, { x: 0, y: 100 })
    store.getState().moveNode(b, { x: 0, y: 0 })
    store.getState().moveNode(c, { x: 100, y: 0 })
    store.getState().moveNode(d, { x: 100, y: 100 })
    const beforeB = { ...store.getState().nodes[b].origin }
    store.getState().autoSize()
    // First in reading order lands in the top-left cell, last in the bottom-right.
    expect(store.getState().nodes[b].origin).toEqual({ x: 8, y: 8 })
    expect(store.getState().nodes[d].origin).toEqual({ x: 604, y: 404 })
    store.getState().undo()
    expect(store.getState().nodes[b].origin).toEqual(beforeB)
  })

  it('selection tidies are no-ops for fewer than 2 nodes', () => {
    const a = addAt(store, 'a')
    store.getState().selectNodes([a])
    const before = { ...store.getState().nodes[a].origin }
    store.getState().stackSelected('row')
    store.getState().tidyGridSelected()
    expect(store.getState().nodes[a].origin).toEqual(before)
  })
})
