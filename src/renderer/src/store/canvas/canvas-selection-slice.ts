// Selection slice — node selection and bulk delete. Pure selection never
// activates (renders as rings, no active halo), so a marquee/selectAll/toggle
// can't leave a node looking active while sitting outside the moved set.
//
// deleteSelection here only removes canvas nodes (geometry). Disposing the
// underlying Orca tab/pane (PTY, editor) is the renderer integration layer's
// job — the store is content-agnostic and must not import the app store.

import type { CanvasGet, CanvasSet, CanvasStoreActions } from './canvas-store-types'
import { withLead } from './canvas-selection-model'

type SelectionActions = Pick<
  CanvasStoreActions,
  'selectNodes' | 'clearSelection' | 'selectAll' | 'toggleNodeSelection' | 'deleteSelection'
>

export function createSelectionSlice(set: CanvasSet, get: CanvasGet): SelectionActions {
  return {
    selectNodes(ids, additive) {
      set((state) => {
        if (additive) {
          let next = state.selection
          for (const id of ids) {
            next = withLead(next, id)
          }
          return { selection: next, selectionActive: false }
        }
        return { selection: [...new Set(ids)], selectionActive: false }
      })
    },

    clearSelection() {
      set({ selection: [], selectionActive: false })
    },

    selectAll() {
      set((state) => ({ selection: Object.keys(state.nodes), selectionActive: false }))
    },

    toggleNodeSelection(id) {
      set((state) => {
        const next = state.selection.includes(id)
          ? state.selection.filter((x) => x !== id)
          : [...state.selection, id]
        return { selection: next, selectionActive: false }
      })
    },

    deleteSelection() {
      const state = get()
      if (state.selection.length === 0) {
        return
      }
      state.pushHistory()
      for (const id of state.selection) {
        get().removeNode(id)
      }
      set({ selection: [], selectionActive: false })
    }
  }
}
