// Arrange slice — bulk layout actions (docs/main-surface.md T-B1).
// autoSize: resizes all nodes to fill the viewport at zoom 100%.
// Group / Tidy / Stack: set every node to default size, reposition, zoom-to-fit.
// Every action shares the same padding (top/bottom/left/right) and node gap,
// read from settings so all modes behave consistently.
// All push history first so a tidy is undoable.

import type { CanvasNodeState } from '../../../../shared/canvas-node'
import { MIN_NODE_SIZE } from '../../components/canvas/canvas-interaction-math'
import type { CanvasGet, CanvasSet, CanvasStoreActions } from './canvas-store-types'
import { useAppStore } from '../../store'

type ArrangeActions = Pick<
  CanvasStoreActions,
  'autoSize' | 'autoLayout' | 'autoVerticalLayout' | 'stackSelected' | 'tidyGridSelected'
>

/** Shared layout geometry read from settings — one set of paddings + one node gap
 *  used by every action so the modes behave consistently. */
type LayoutGeometry = {
  padTop: number
  padBottom: number
  padLeft: number
  padRight: number
  gap: number
}

function readLayoutGeometry(): LayoutGeometry {
  const s = useAppStore.getState().settings
  return {
    padTop: s?.canvasPaddingTop ?? 40,
    padBottom: s?.canvasPaddingBottom ?? 50,
    padLeft: s?.canvasPaddingLeft ?? 50,
    padRight: s?.canvasPaddingRight ?? 50,
    gap: s?.canvasNodeGap ?? 10
  }
}

function selectedNodes(state: {
  nodes: Record<string, CanvasNodeState>
  selection: string[]
}): CanvasNodeState[] {
  const set = new Set(state.selection)
  return Object.values(state.nodes).filter((n) => set.has(n.id))
}

/** Apply a zoom-to-fit that frames all nodes with the shared asymmetric padding,
 *  centered within the padded area. Zoom is calculated dynamically to fit. */
function applyZoomToFit(get: CanvasGet, set: CanvasSet): void {
  const state = get()
  const cs = state.containerSize
  const nodes = Object.values(state.nodes)
  if (nodes.length === 0 || cs.width === 0 || cs.height === 0) {
    return
  }
  const { padTop, padBottom, padLeft, padRight } = readLayoutGeometry()
  const minX = Math.min(...nodes.map((n) => n.origin.x))
  const minY = Math.min(...nodes.map((n) => n.origin.y))
  const maxX = Math.max(...nodes.map((n) => n.origin.x + n.size.width))
  const maxY = Math.max(...nodes.map((n) => n.origin.y + n.size.height))
  const contentW = maxX - minX
  const contentH = maxY - minY
  const availW = cs.width - padLeft - padRight
  const availH = cs.height - padTop - padBottom
  // Calculate zoom to fit; cap at 1.0 so nodes don't start smaller than natural size.
  const fitZoom = Math.min(availW / contentW, availH / contentH, 1.0)
  set({
    zoomLevel: fitZoom,
    viewportOffset: {
      x: padLeft + (availW - contentW * fitZoom) / 2 - minX * fitZoom,
      y: padTop + (availH - contentH * fitZoom) / 2 - minY * fitZoom
    }
  })
}

export function createArrangeSlice(set: CanvasSet, get: CanvasGet): ArrangeActions {
  return {
    autoSize() {
      const state = get()
      const cs = state.containerSize
      const { padTop, padBottom, padLeft, padRight, gap } = readLayoutGeometry()

      const nodeList = Object.values(state.nodes).sort(
        (a, b) =>
          a.origin.y - b.origin.y || a.origin.x - b.origin.x || a.creationIndex - b.creationIndex
      )
      if (nodeList.length === 0 || cs.width === 0 || cs.height === 0) {
        return
      }

      const cols = Math.max(1, Math.ceil(Math.sqrt(nodeList.length)))
      const rows = Math.ceil(nodeList.length / cols)
      const cellW = Math.max(
        MIN_NODE_SIZE.width,
        Math.floor((cs.width - padLeft - padRight - (cols - 1) * gap) / cols)
      )
      const cellH = Math.max(
        MIN_NODE_SIZE.height,
        Math.floor((cs.height - padTop - padBottom - (rows - 1) * gap) / rows)
      )

      get().pushHistory()
      const nodes = { ...state.nodes }
      nodeList.forEach((node, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        nodes[node.id] = {
          ...nodes[node.id],
          origin: {
            x: padLeft + col * (cellW + gap),
            y: padTop + row * (cellH + gap)
          },
          size: { width: cellW, height: cellH }
        }
      })
      // Absolute reset so repeated clicks are idempotent.
      set({ nodes, zoomLevel: 1, viewportOffset: { x: 0, y: 0 } })
    },

    autoLayout() {
      // Unused — removed from UI. Kept so the action type stays in
      // CanvasStoreActions and any existing calls don't break.
      const state = get()
      const { gap } = readLayoutGeometry()
      const nodeList = Object.values(state.nodes)
      if (nodeList.length === 0) {
        return
      }
      const cellW = Math.max(...nodeList.map((n) => n.size.width)) + gap
      const cellH = Math.max(...nodeList.map((n) => n.size.height)) + gap
      const cols = Math.max(1, Math.ceil(Math.sqrt(nodeList.length)))
      get().pushHistory()
      const nodes = { ...state.nodes }
      nodeList.forEach((node, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        nodes[node.id] = {
          ...nodes[node.id],
          origin: {
            x: gap + col * cellW,
            y: gap + row * cellH
          }
        }
      })
      set({ nodes })
    },

    autoVerticalLayout() {
      const state = get()
      const settings = useAppStore.getState().settings
      const defaultW = settings?.canvasDefaultNodeWidth ?? 720
      const defaultH = settings?.canvasDefaultNodeHeight ?? 480
      const { gap } = readLayoutGeometry()

      const nodeList = Object.values(state.nodes)
      if (nodeList.length === 0) {
        return
      }

      // Set every node to the default size.
      get().pushHistory()
      const nodes = { ...state.nodes }
      for (const node of nodeList) {
        nodes[node.id] = { ...nodes[node.id], size: { width: defaultW, height: defaultH } }
      }

      // Group by worktree: one column per sourceWorktreeId.
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
        .map((col) => [...col].sort((a, b) => a.creationIndex - b.creationIndex))
        .sort((a, b) => minCreation(a) - minCreation(b))

      let cursorX = gap
      for (const column of orderedColumns) {
        let cursorY = gap
        for (const node of column) {
          nodes[node.id] = {
            ...nodes[node.id],
            origin: { x: cursorX, y: cursorY }
          }
          cursorY += defaultH + gap
        }
        cursorX += defaultW + gap
      }

      set({ nodes })
      applyZoomToFit(get, set)
    },

    stackSelected(axis) {
      const settings = useAppStore.getState().settings
      const defaultW = settings?.canvasDefaultNodeWidth ?? 720
      const defaultH = settings?.canvasDefaultNodeHeight ?? 480
      const { gap } = readLayoutGeometry()

      const selected = selectedNodes(get())
      if (selected.length < 2) {
        return
      }
      get().pushHistory()

      // Set every node to the default size first.
      const state = get()
      const nodes = { ...state.nodes }
      for (const node of Object.values(state.nodes)) {
        nodes[node.id] = { ...nodes[node.id], size: { width: defaultW, height: defaultH } }
      }

      // Stack selected nodes edge-to-edge along the chosen axis, anchored at top-left.
      const row = axis === 'row'
      const sorted = [...selected].sort((a, b) =>
        row ? a.origin.x - b.origin.x : a.origin.y - b.origin.y
      )
      const startX = Math.min(...selected.map((n) => n.origin.x))
      const startY = Math.min(...selected.map((n) => n.origin.y))
      let cursor = row ? startX : startY
      for (const node of sorted) {
        nodes[node.id] = {
          ...nodes[node.id],
          origin: {
            x: row ? cursor : startX,
            y: row ? startY : cursor
          }
        }
        cursor += (row ? defaultW : defaultH) + gap
      }

      set({ nodes })
      applyZoomToFit(get, set)
    },

    tidyGridSelected() {
      const settings = useAppStore.getState().settings
      const defaultW = settings?.canvasDefaultNodeWidth ?? 720
      const defaultH = settings?.canvasDefaultNodeHeight ?? 480
      const { gap } = readLayoutGeometry()

      const selected = selectedNodes(get())
      if (selected.length < 2) {
        return
      }
      get().pushHistory()

      // Set every node to the default size first.
      const state = get()
      const nodes = { ...state.nodes }
      for (const node of Object.values(state.nodes)) {
        nodes[node.id] = { ...nodes[node.id], size: { width: defaultW, height: defaultH } }
      }

      // Grid the selected nodes at their top-left, preserving reading order.
      const cols = Math.max(1, Math.ceil(Math.sqrt(selected.length)))
      const startX = Math.min(...selected.map((n) => n.origin.x))
      const startY = Math.min(...selected.map((n) => n.origin.y))
      const sorted = [...selected].sort(
        (a, b) => a.origin.y - b.origin.y || a.origin.x - b.origin.x
      )
      sorted.forEach((node, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        nodes[node.id] = {
          ...nodes[node.id],
          origin: {
            x: startX + col * (defaultW + gap),
            y: startY + row * (defaultH + gap)
          }
        }
      })

      set({ nodes })
      applyZoomToFit(get, set)
    }
  }
}
