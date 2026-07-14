// Pure grid placement of worktree tiles on the Overview meta-canvas. Row-major,
// fixed tile size + gap, wrapping at `columns`. Deterministic in input order so
// tiles keep a stable position across renders. See docs/canvas-workspace.md.

import type { Rect } from '../../../../../shared/canvas-node'

export type TilePlacement = {
  worktreeId: string
  rect: Rect
}

export type OverviewTileLayoutOptions = {
  tileWidth: number
  tileHeight: number
  gap: number
  columns: number
}

export const DEFAULT_OVERVIEW_TILE_LAYOUT: OverviewTileLayoutOptions = {
  tileWidth: 420,
  tileHeight: 300,
  gap: 48,
  columns: 3
}

/** Choose a column count that keeps the grid roughly square for a given tile
 *  count, capped at `maxColumns`. */
export function pickOverviewColumns(count: number, maxColumns: number): number {
  if (count <= 1) {
    return 1
  }
  return Math.min(maxColumns, Math.ceil(Math.sqrt(count)))
}

export function layoutOverviewTiles(
  worktreeIds: readonly string[],
  options: OverviewTileLayoutOptions = DEFAULT_OVERVIEW_TILE_LAYOUT
): TilePlacement[] {
  const { tileWidth, tileHeight, gap } = options
  const columns = Math.max(1, options.columns)
  return worktreeIds.map((worktreeId, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    return {
      worktreeId,
      rect: {
        origin: { x: col * (tileWidth + gap), y: row * (tileHeight + gap) },
        size: { width: tileWidth, height: tileHeight }
      }
    }
  })
}
