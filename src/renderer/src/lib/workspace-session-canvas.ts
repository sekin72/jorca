import type { PersistedWorktreeCanvas } from '../../../shared/canvas-node'

/** Omit an empty canvas map so sessions written by builds that never used the
 *  canvas don't bloat the payload with `canvasByWorktree: {}`. Tolerates an
 *  undefined map (older snapshots) by returning undefined. */
export function buildCanvasByWorktreeForSession(
  canvasByWorktree: Record<string, PersistedWorktreeCanvas> | undefined
): Record<string, PersistedWorktreeCanvas> | undefined {
  return canvasByWorktree && Object.keys(canvasByWorktree).length > 0 ? canvasByWorktree : undefined
}
