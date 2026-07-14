// The canvas selection is one ordered array (`selection`) plus a
// `selectionActive` flag. The active/keyboard-focused node is DERIVED as the
// lead (last) entry while the selection is active — never stored separately, so
// the rendered set (rings + active halo) and the moved set are the same thing.

import type { CanvasNodeId } from '../../../../shared/canvas-node'
import type { CanvasStoreState } from './canvas-store-types'

type SelectionState = Pick<CanvasStoreState, 'selection' | 'selectionActive'>

/** The single active/keyboard-focused node, or null. Derived, never stored. */
export function focusedNodeId(s: SelectionState): CanvasNodeId | null {
  return s.selectionActive && s.selection.length > 0 ? (s.selection.at(-1) ?? null) : null
}

/** Whether `id` is part of the current selection (renders a selection ring). */
export function isSelected(s: Pick<CanvasStoreState, 'selection'>, id: CanvasNodeId): boolean {
  return s.selection.includes(id)
}

/** Whether a press on `id` should start a GROUP move rather than single-drag:
 *  `id` is part of a real multi-selection. Shared by the drag hook and the
 *  node's focus guard so they can't disagree. */
export function isGroupDragMember(selection: readonly CanvasNodeId[], id: CanvasNodeId): boolean {
  return selection.length > 1 && selection.includes(id)
}

/** Selection with `id` appended as the lead (deduped), rest order preserved. */
export function withLead(selection: readonly CanvasNodeId[], id: CanvasNodeId): CanvasNodeId[] {
  const next = selection.filter((x) => x !== id)
  next.push(id)
  return next
}
