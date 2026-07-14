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

  it('selection tidies are no-ops for fewer than 2 nodes', () => {
    const a = addAt(store, 'a')
    store.getState().selectNodes([a])
    const before = { ...store.getState().nodes[a].origin }
    store.getState().stackSelected('row')
    store.getState().tidyGridSelected()
    expect(store.getState().nodes[a].origin).toEqual(before)
  })
})
