// History slice — undo/redo snapshots of {nodes, selection, selectionActive}.

import type {
  CanvasGet,
  CanvasSet,
  CanvasHistoryEntry,
  CanvasStoreActions
} from './canvas-store-types'

type HistoryActions = Pick<CanvasStoreActions, 'pushHistory' | 'undo' | 'redo' | 'clearHistory'>

const MAX_HISTORY = 100

function snapshot(state: {
  nodes: CanvasHistoryEntry['nodes']
  selection: CanvasHistoryEntry['selection']
  selectionActive: boolean
}): CanvasHistoryEntry {
  // `nodes` is replaced immutably on every edit, so sharing the ref is safe; the
  // selection array is cloned to stay independent of later in-place edits.
  return {
    nodes: state.nodes,
    selection: [...state.selection],
    selectionActive: state.selectionActive
  }
}

// Filter a restored entry's selection to ids that still exist in its own nodes,
// so no dangling id (e.g. a node deleted in the undone step) survives.
function restore(entry: CanvasHistoryEntry) {
  return {
    nodes: entry.nodes,
    selection: entry.selection.filter((id) => entry.nodes[id]),
    selectionActive: entry.selectionActive
  }
}

export function createHistorySlice(set: CanvasSet, get: CanvasGet): HistoryActions {
  return {
    pushHistory() {
      const state = get()
      const entry = snapshot(state)
      const history =
        state.history.length >= MAX_HISTORY
          ? [...state.history.slice(1), entry]
          : [...state.history, entry]
      set({ history, future: [] })
    },

    undo() {
      const state = get()
      if (state.history.length === 0) {
        return
      }
      const prev = state.history.at(-1)!
      set({
        ...restore(prev),
        history: state.history.slice(0, -1),
        future: [...state.future, snapshot(state)]
      })
    },

    redo() {
      const state = get()
      if (state.future.length === 0) {
        return
      }
      const next = state.future.at(-1)!
      set({
        ...restore(next),
        history: [...state.history, snapshot(state)],
        future: state.future.slice(0, -1)
      })
    },

    clearHistory() {
      set({ history: [], future: [] })
    }
  }
}
