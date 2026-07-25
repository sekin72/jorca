// Nodes slice — node lifecycle (create/remove/move/resize), focus, z-order,
// maximize, pin, and node queries. Single-panel nodes (Phase 1): a node just
// references an Orca tab/pane id via `panelId`.

import type { CanvasNodeState, Point, Size } from '../../../../shared/canvas-node'
import type {
  CanvasGet,
  CanvasSet,
  CanvasStoreActions,
  CanvasStoreState
} from './canvas-store-types'
import { generateId, findFreePosition, DEFAULT_NODE_SIZE } from './canvas-node-placement'
import { focusedNodeId } from './canvas-selection-model'
import { useAppStore } from '../../store'

type NodesActions = Pick<
  CanvasStoreActions,
  | 'addNode'
  | 'removeNode'
  | 'setNodeBorrowed'
  | 'finalizeRemoveNode'
  | 'setNodeAnimationState'
  | 'moveNode'
  | 'resizeNode'
  | 'focusNode'
  | 'unfocus'
  | 'toggleMaximize'
  | 'focusAndCenter'
  | 'focusAndFit'
  | 'moveToFront'
  | 'moveToBack'
  | 'togglePin'
  | 'setNodeColor'
>

export function createNodesSlice(set: CanvasSet, get: CanvasGet): NodesActions {
  return {
    addNode(panelId, position, size, options) {
      get().pushHistory()
      const state = get()
      const nodeSize = size ?? DEFAULT_NODE_SIZE
      // Borrowed-onto-Main nodes carry their source worktree; plain nodes don't.
      const sourcePatch =
        options?.sourceWorktreeId != null ? { sourceWorktreeId: options.sourceWorktreeId } : {}

      // Dedupe on panelId: reposition + focus the existing node instead of
      // creating a second box for the same panel.
      const existing = Object.values(state.nodes).find((n) => n.panelId === panelId)
      if (existing) {
        const { [existing.id]: _omit, ...otherNodes } = state.nodes
        const nextOrigin = findFreePosition(otherNodes, null, nodeSize, position)
        set({
          nodes: {
            ...state.nodes,
            [existing.id]: {
              ...existing,
              origin: nextOrigin,
              size: nodeSize,
              zOrder: state.nextZOrder,
              ...sourcePatch
            }
          },
          nextZOrder: state.nextZOrder + 1,
          selection: [existing.id],
          selectionActive: true
        })
        return existing.id
      }

      const nodeId = generateId()
      // Pass null anchor so right-click spawns don't inherit cascade offset from
      // the currently focused node — findFreePosition returns the snapped preferred
      // point directly and places the new window on top of any overlap.
      const origin = findFreePosition(state.nodes, null, nodeSize, position)
      const node: CanvasNodeState = {
        id: nodeId,
        panelId,
        origin,
        size: nodeSize,
        zOrder: state.nextZOrder,
        creationIndex: state.nextCreationIndex,
        animationState: 'entering',
        ...sourcePatch
      }
      set({
        nodes: { ...state.nodes, [nodeId]: node },
        nextZOrder: state.nextZOrder + 1,
        nextCreationIndex: state.nextCreationIndex + 1,
        selection: [nodeId],
        selectionActive: true
      })
      return nodeId
    },

    setNodeBorrowed(id, borrowed) {
      set((state) => {
        const node = state.nodes[id]
        if (!node || Boolean(node.borrowedByMain) === borrowed) {
          return state
        }
        // Undefined (not false) when cleared, so it drops out of the persisted shape.
        const patched = { ...node, borrowedByMain: borrowed ? true : undefined }
        return { nodes: { ...state.nodes, [id]: patched } }
      })
    },

    removeNode(id) {
      if (get().nodes[id]) {
        get().pushHistory()
      }
      set((state) => {
        const node = state.nodes[id]
        if (!node) {
          return state
        }
        const wasActiveLead = focusedNodeId(state) === id
        return {
          nodes: { ...state.nodes, [id]: { ...node, animationState: 'exiting' as const } },
          selection: state.selection.filter((x) => x !== id),
          selectionActive: wasActiveLead ? false : state.selectionActive
        }
      })
    },

    finalizeRemoveNode(id) {
      set((state) => {
        const { [id]: _omit, ...rest } = state.nodes
        return {
          nodes: rest,
          selection: state.selection.includes(id)
            ? state.selection.filter((x) => x !== id)
            : state.selection
        }
      })
    },

    setNodeAnimationState(id, animationState) {
      const node = get().nodes[id]
      if (node) {
        set({ nodes: { ...get().nodes, [id]: { ...node, animationState } } })
      }
    },

    moveNode(id, origin: Point) {
      set((state) => {
        const node = state.nodes[id]
        if (!node) {
          return state
        }
        return { nodes: { ...state.nodes, [id]: { ...node, origin } } }
      })
    },

    resizeNode(id, size: Size, origin?: Point) {
      set((state) => {
        const node = state.nodes[id]
        if (!node) {
          return state
        }
        return {
          nodes: {
            ...state.nodes,
            [id]: { ...node, size, ...(origin != null ? { origin } : {}) }
          }
        }
      })
    },

    focusNode(id) {
      set((state) => {
        const node = state.nodes[id]
        if (!node) {
          return state
        }
        return {
          nodes: { ...state.nodes, [id]: { ...node, zOrder: state.nextZOrder } },
          nextZOrder: state.nextZOrder + 1,
          selection: [id],
          selectionActive: true
        }
      })
    },

    unfocus() {
      set({ selectionActive: false })
    },

    toggleMaximize(id) {
      const state = get()
      const node = state.nodes[id]
      if (!node) {
        return
      }
      const isMax = node.preMaximizeOrigin != null

      let updated: CanvasNodeState
      if (isMax) {
        updated = {
          ...node,
          origin: node.preMaximizeOrigin!,
          size: node.preMaximizeSize!,
          preMaximizeOrigin: undefined,
          preMaximizeSize: undefined
        }
      } else {
        const cs = state.containerSize
        const topLeft = get().viewToCanvas({ x: 0, y: 0 })
        const bottomRight = get().viewToCanvas({ x: cs.width, y: cs.height })
        const padding = 20 / state.zoomLevel
        updated = {
          ...node,
          preMaximizeOrigin: { ...node.origin },
          preMaximizeSize: { ...node.size },
          origin: { x: topLeft.x + padding, y: topLeft.y + padding },
          size: {
            width: bottomRight.x - topLeft.x - padding * 2,
            height: bottomRight.y - topLeft.y - padding * 2
          }
        }
      }
      set({
        nodes: { ...state.nodes, [id]: { ...updated, zOrder: state.nextZOrder } },
        nextZOrder: state.nextZOrder + 1,
        selection: [id],
        selectionActive: true
      })
    },

    focusAndCenter(id) {
      const state = get()
      const node = state.nodes[id]
      if (!node) {
        return
      }
      const cs = state.containerSize
      const zoom = state.zoomLevel
      const next: Partial<CanvasStoreState> = {
        nodes: { ...state.nodes, [id]: { ...node, zOrder: state.nextZOrder } },
        nextZOrder: state.nextZOrder + 1,
        selection: [id],
        selectionActive: true
      }
      if (cs.width > 0 && cs.height > 0) {
        next.viewportOffset = {
          x: cs.width / 2 - (node.origin.x + node.size.width / 2) * zoom,
          y: cs.height / 2 - (node.origin.y + node.size.height / 2) * zoom
        }
      }
      set(next)
    },

    focusAndFit(id) {
      const state = get()
      const node = state.nodes[id]
      if (!node) {
        return
      }
      const cs = state.containerSize
      if (cs.width === 0 || cs.height === 0) {
        return
      }
      const settings = useAppStore.getState().settings
      const fitZoom = settings?.canvasFitZoom ?? 1.00
      const padTop = settings?.canvasPaddingTop ?? 40
      const padBottom = settings?.canvasPaddingBottom ?? 50
      const padLeft = settings?.canvasPaddingLeft ?? 50
      const padRight = settings?.canvasPaddingRight ?? 50
      const availW = cs.width - padLeft - padRight
      const availH = cs.height - padTop - padBottom
      set({
        nodes: { ...state.nodes, [id]: { ...node, zOrder: state.nextZOrder } },
        nextZOrder: state.nextZOrder + 1,
        selection: [id],
        selectionActive: true,
        zoomLevel: fitZoom,
        viewportOffset: {
          x: padLeft + (availW - node.size.width * fitZoom) / 2 - node.origin.x * fitZoom,
          y: padTop + (availH - node.size.height * fitZoom) / 2 - node.origin.y * fitZoom
        }
      })
    },

    moveToFront(id) {
      set((state) => {
        const node = state.nodes[id]
        if (!node) {
          return state
        }
        return {
          nodes: { ...state.nodes, [id]: { ...node, zOrder: state.nextZOrder } },
          nextZOrder: state.nextZOrder + 1
        }
      })
    },

    moveToBack(id) {
      set((state) => {
        const node = state.nodes[id]
        if (!node) {
          return state
        }
        const minZ = Object.values(state.nodes).reduce(
          (min, n) => Math.min(min, n.zOrder),
          Infinity
        )
        return { nodes: { ...state.nodes, [id]: { ...node, zOrder: minZ - 1 } } }
      })
    },

    togglePin(id) {
      set((state) => {
        const node = state.nodes[id]
        if (!node) {
          return state
        }
        return { nodes: { ...state.nodes, [id]: { ...node, isPinned: !node.isPinned } } }
      })
    },

    setNodeColor(id, color) {
      set((state) => {
        const node = state.nodes[id]
        if (!node || node.color === color) {
          return state
        }
        // Undefined (not empty) when cleared, so it drops out of the persisted shape.
        return { nodes: { ...state.nodes, [id]: { ...node, color: color || undefined } } }
      })
    }
  }
}
