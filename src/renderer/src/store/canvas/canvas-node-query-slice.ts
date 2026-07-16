// Read-only node lookups + keyboard navigation order. Split out of
// canvas-nodes-slice so each slice stays under the file line cap.

import type { CanvasGet, CanvasSet, CanvasStoreActions } from './canvas-store-types'
import { focusedNodeId } from './canvas-selection-model'

type NodeQueryActions = Pick<
  CanvasStoreActions,
  'nodeForPanel' | 'sortedNodesByCreationOrder' | 'nextNode' | 'previousNode'
>

export function createNodeQuerySlice(_set: CanvasSet, get: CanvasGet): NodeQueryActions {
  return {
    nodeForPanel(panelId) {
      return Object.values(get().nodes).find((n) => n.panelId === panelId)?.id ?? null
    },

    sortedNodesByCreationOrder() {
      return Object.values(get().nodes).sort((a, b) => a.creationIndex - b.creationIndex)
    },

    nextNode() {
      const focused = focusedNodeId(get())
      const sorted = get().sortedNodesByCreationOrder()
      if (sorted.length === 0) {
        return null
      }
      if (!focused) {
        return sorted[0].id
      }
      const i = sorted.findIndex((n) => n.id === focused)
      if (i === -1) {
        return sorted[0].id
      }
      return sorted[(i + 1) % sorted.length].id
    },

    previousNode() {
      const focused = focusedNodeId(get())
      const sorted = get().sortedNodesByCreationOrder()
      if (sorted.length === 0) {
        return null
      }
      if (!focused) {
        return sorted.at(-1)!.id
      }
      const i = sorted.findIndex((n) => n.id === focused)
      if (i === -1) {
        return sorted.at(-1)!.id
      }
      return sorted[(i - 1 + sorted.length) % sorted.length].id
    }
  }
}
