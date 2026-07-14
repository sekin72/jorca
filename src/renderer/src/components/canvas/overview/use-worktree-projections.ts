// Aggregates every worktree's canvas geometry into read-only projections for the
// Overview. Sources geometry from the persisted canvasByWorktree snapshot (kept
// fresh by the Step-7 sync bridge) unioned with any live store not yet snapshot,
// and resolves each node's pane kind for tinting. Only worktrees that actually
// have canvas nodes are surfaced.

import { useMemo } from 'react'
import { useAppStore } from '../../../store'
import { getAllCanvasStoreEntries } from '../../../store/canvas/canvas-store'
import { resolveNodeTab } from '../canvas-node-tab-lookup'
import type { Tab } from '../../../../../shared/types'
import {
  projectWorktreeCanvas,
  type OverviewNodeKind,
  type ProjectionGeometry,
  type WorktreeProjection
} from './overview-worktree-projection'

function kindForTab(tab: Tab | null): OverviewNodeKind {
  switch (tab?.contentType) {
    case 'terminal':
      return 'terminal'
    case 'editor':
      return 'editor'
    case 'browser':
      return 'browser'
    case 'diff':
    case 'conflict-review':
    case 'check-details':
    case 'simulator':
    case undefined:
      return 'other'
  }
}

export function useWorktreeProjections(): WorktreeProjection[] {
  const worktreesByRepo = useAppStore((s) => s.worktreesByRepo)
  const canvasByWorktree = useAppStore((s) => s.canvasByWorktree)
  const unifiedTabsByWorktree = useAppStore((s) => s.unifiedTabsByWorktree)

  return useMemo(() => {
    const labelByWorktreeId = new Map<string, { label: string; sortOrder: number }>()
    for (const worktrees of Object.values(worktreesByRepo)) {
      for (const wt of worktrees) {
        if (!wt.isArchived) {
          labelByWorktreeId.set(wt.id, { label: wt.displayName, sortOrder: wt.sortOrder })
        }
      }
    }

    // Geometry source: persisted snapshot first, then any live store that hasn't
    // settled a snapshot yet, so a just-created canvas still projects.
    const geometryByWorktree = new Map<string, ProjectionGeometry>()
    for (const [worktreeId, canvas] of Object.entries(canvasByWorktree)) {
      geometryByWorktree.set(worktreeId, canvas)
    }
    for (const [worktreeId, store] of getAllCanvasStoreEntries()) {
      if (!geometryByWorktree.has(worktreeId)) {
        geometryByWorktree.set(worktreeId, { nodes: store.getState().nodes })
      }
    }

    const projections: WorktreeProjection[] = []
    for (const [worktreeId, geometry] of geometryByWorktree) {
      const meta = labelByWorktreeId.get(worktreeId)
      if (!meta) {
        continue
      }
      const projection = projectWorktreeCanvas(worktreeId, meta.label, geometry, (panelId) =>
        kindForTab(resolveNodeTab(unifiedTabsByWorktree, panelId))
      )
      if (projection.nodeCount > 0) {
        projections.push(projection)
      }
    }

    return projections.sort((a, b) => {
      const sa = labelByWorktreeId.get(a.worktreeId)?.sortOrder ?? 0
      const sb = labelByWorktreeId.get(b.worktreeId)?.sortOrder ?? 0
      return sa - sb || a.label.localeCompare(b.label)
    })
  }, [worktreesByRepo, canvasByWorktree, unifiedTabsByWorktree])
}
