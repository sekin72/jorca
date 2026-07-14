import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type { PersistedWorktreeCanvas } from '../../../../shared/canvas-node'

/** The durable geometry of each worktree's infinite canvas, mirrored here from
 *  the standalone per-worktree canvas stores so the existing workspace-session
 *  writer persists it. The canvas stores own the live 60fps state; this slice
 *  only receives coalesced snapshots at gesture-settle boundaries (see
 *  store/canvas/canvas-session-sync.ts), so pan/zoom never churns the app store.
 *  See docs/canvas-workspace.md §7. */
export type CanvasSessionSlice = {
  canvasByWorktree: Record<string, PersistedWorktreeCanvas>
  /** Replace one worktree's persisted canvas snapshot (or drop it when null). */
  setWorktreeCanvasSnapshot: (worktreeId: string, canvas: PersistedWorktreeCanvas | null) => void
}

export const createCanvasSessionSlice: StateCreator<AppState, [], [], CanvasSessionSlice> = (
  set
) => ({
  canvasByWorktree: {},
  setWorktreeCanvasSnapshot: (worktreeId, canvas) =>
    set((state) => {
      if (canvas === null) {
        if (!(worktreeId in state.canvasByWorktree)) {
          return {}
        }
        const { [worktreeId]: _removed, ...rest } = state.canvasByWorktree
        void _removed
        return { canvasByWorktree: rest }
      }
      return { canvasByWorktree: { ...state.canvasByWorktree, [worktreeId]: canvas } }
    })
})
