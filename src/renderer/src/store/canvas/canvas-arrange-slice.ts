// Arrange slice — bulk layout actions (docs/main-surface.md T-B1). Two whole-
// canvas tidies (autoLayout grid, autoVerticalLayout column-per-worktree) and two
// selection tidies (stack, grid). All push history first so a tidy is undoable.
// Written fresh against Orca's store; sizes/gaps are our own choices.

import type { CanvasNodeState } from '../../../../shared/canvas-node'
import { MIN_NODE_SIZE } from '../../components/canvas/canvas-interaction-math'
import type { CanvasGet, CanvasSet, CanvasStoreActions } from './canvas-store-types'

type ArrangeActions = Pick<
  CanvasStoreActions,
  'autoSize' | 'autoLayout' | 'autoVerticalLayout' | 'stackSelected' | 'tidyGridSelected'
>

const GRID_GAP = 8
const COLUMN_GAP = 16
// Asymmetric padding keeps nodes clear of the floating UI: the action bar
// (top-left) and shortcuts pane (bottom-left) sit over the canvas surface.
const PAD_TOP = 80
const PAD_LEFT = 80
const PAD_RIGHT = 60
const PAD_BOTTOM = 60

function selectedNodes(state: {
  nodes: Record<string, CanvasNodeState>
  selection: string[]
}): CanvasNodeState[] {
  const set = new Set(state.selection)
  return Object.values(state.nodes).filter((n) => set.has(n.id))
}

export function createArrangeSlice(set: CanvasSet, get: CanvasGet): ArrangeActions {
  return {
    autoSize() {
      const state = get()
      const cs = state.containerSize
      // Reading order (top-to-bottom, left-to-right) so "sorting" is preserved;
      // creationIndex only breaks y/x ties, keeping the reflow deterministic.
      const nodeList = Object.values(state.nodes).sort(
        (a, b) =>
          a.origin.y - b.origin.y || a.origin.x - b.origin.x || a.creationIndex - b.creationIndex
      )
      if (nodeList.length === 0 || cs.width === 0 || cs.height === 0) {
        return
      }
      // Zoom is reset to 1 below, so canvas coords == view coords: sizing cells to
      // the container tiles it exactly. Square-ish grid; last row may be partial.
      const cols = Math.max(1, Math.ceil(Math.sqrt(nodeList.length)))
      const rows = Math.ceil(nodeList.length / cols)
      const cellW = Math.max(
        MIN_NODE_SIZE.width,
        Math.floor((cs.width - PAD_LEFT - PAD_RIGHT - (cols - 1) * PAD_LEFT) / cols)
      )
      const cellH = Math.max(
        MIN_NODE_SIZE.height,
        Math.floor((cs.height - PAD_TOP - PAD_BOTTOM - (rows - 1) * PAD_TOP) / rows)
      )

      get().pushHistory()
      const nodes = { ...state.nodes }
      nodeList.forEach((node, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        nodes[node.id] = {
          ...nodes[node.id],
          origin: {
            x: PAD_LEFT + col * (cellW + PAD_LEFT),
            y: PAD_TOP + row * (cellH + PAD_TOP)
          },
          size: { width: cellW, height: cellH }
        }
      })
      // Absolute reset (not relative) so repeated clicks are idempotent.
      set({ nodes, zoomLevel: 1, viewportOffset: { x: 0, y: 0 } })
    },

    autoLayout() {
      const state = get()
      const nodeList = Object.values(state.nodes).sort((a, b) => a.creationIndex - b.creationIndex)
      if (nodeList.length === 0) {
        return
      }
      // Reposition only — never resize the windows or change the canvas zoom (that
      // shrinks terminals and compounds a zoom-out each click). Cell spacing is the
      // largest window's dims so mixed sizes never overlap. Square-ish grid.
      const cellW = Math.max(...nodeList.map((n) => n.size.width)) + GRID_GAP
      const cellH = Math.max(...nodeList.map((n) => n.size.height)) + GRID_GAP
      const cols = Math.max(1, Math.ceil(Math.sqrt(nodeList.length)))

      get().pushHistory()
      const nodes = { ...state.nodes }
      nodeList.forEach((node, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        nodes[node.id] = {
          ...nodes[node.id],
          origin: { x: GRID_GAP + col * cellW, y: GRID_GAP + row * cellH }
        }
      })
      set({ nodes })
    },

    autoVerticalLayout() {
      const state = get()
      const nodeList = Object.values(state.nodes)
      if (nodeList.length === 0) {
        return
      }
      // One column per source worktree; nodes without one share a trailing column
      // under the empty key. Column order and within-column order are both by
      // creationIndex (borrow order), so the result is deterministic.
      const columns = new Map<string, CanvasNodeState[]>()
      for (const node of nodeList) {
        const key = node.sourceWorktreeId ?? ''
        const col = columns.get(key)
        if (col) {
          col.push(node)
        } else {
          columns.set(key, [node])
        }
      }
      const minCreation = (nodes: CanvasNodeState[]): number =>
        Math.min(...nodes.map((n) => n.creationIndex))
      const orderedColumns = [...columns.values()]
        .map((nodes) => [...nodes].sort((a, b) => a.creationIndex - b.creationIndex))
        .sort((a, b) => minCreation(a) - minCreation(b))

      // Reposition only (no resize, no zoom). Column width = widest window; each
      // window keeps its own height.
      const columnStep = Math.max(...nodeList.map((n) => n.size.width)) + COLUMN_GAP

      get().pushHistory()
      const nodes = { ...state.nodes }
      let cursorX = COLUMN_GAP
      for (const column of orderedColumns) {
        let cursorY = COLUMN_GAP
        for (const node of column) {
          nodes[node.id] = { ...nodes[node.id], origin: { x: cursorX, y: cursorY } }
          cursorY += node.size.height + COLUMN_GAP
        }
        cursorX += columnStep
      }
      set({ nodes })
    },

    stackSelected(axis, gap = COLUMN_GAP) {
      const selected = selectedNodes(get())
      if (selected.length < 2) {
        return
      }
      get().pushHistory()
      set((state) => {
        const row = axis === 'row'
        const sorted = [...selected].sort((a, b) =>
          row ? a.origin.x - b.origin.x : a.origin.y - b.origin.y
        )
        // Anchor at the selection's top-left so the stack stays where it is.
        const startX = Math.min(...selected.map((n) => n.origin.x))
        const startY = Math.min(...selected.map((n) => n.origin.y))
        const nodes = { ...state.nodes }
        let cursor = row ? startX : startY
        for (const n of sorted) {
          nodes[n.id] = { ...n, origin: { x: row ? cursor : startX, y: row ? startY : cursor } }
          cursor += (row ? n.size.width : n.size.height) + gap
        }
        return { nodes }
      })
    },

    tidyGridSelected(gap = COLUMN_GAP) {
      const selected = selectedNodes(get())
      if (selected.length < 2) {
        return
      }
      get().pushHistory()
      set((state) => {
        const cols = Math.ceil(Math.sqrt(selected.length))
        const cellW = Math.max(...selected.map((n) => n.size.width))
        const cellH = Math.max(...selected.map((n) => n.size.height))
        const startX = Math.min(...selected.map((n) => n.origin.x))
        const startY = Math.min(...selected.map((n) => n.origin.y))
        // Preserve reading order: row-major by current (y, x).
        const sorted = [...selected].sort(
          (a, b) => a.origin.y - b.origin.y || a.origin.x - b.origin.x
        )
        const nodes = { ...state.nodes }
        sorted.forEach((n, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          nodes[n.id] = {
            ...n,
            origin: { x: startX + col * (cellW + gap), y: startY + row * (cellH + gap) }
          }
        })
        return { nodes }
      })
    }
  }
}
