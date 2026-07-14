// Resolve a canvas node's `panelId` (an Orca tab id) to its unified Tab, so a
// node can render the real pane for its tab.

import { useAppStore } from '../../store'
import { findTabAndWorktree } from '../../store/slices/tab-group-state'
import type { Tab } from '../../../../shared/types'

/** Pure lookup — resolves a tab id against the unified tab model. */
export function resolveNodeTab(
  unifiedTabsByWorktree: Record<string, Tab[]>,
  panelId: string
): Tab | null {
  return findTabAndWorktree(unifiedTabsByWorktree, panelId)?.tab ?? null
}

/** Subscribe to the Tab backing a canvas node (null while unresolved). */
export function useNodeTab(panelId: string): Tab | null {
  return useAppStore((s) => resolveNodeTab(s.unifiedTabsByWorktree, panelId))
}
