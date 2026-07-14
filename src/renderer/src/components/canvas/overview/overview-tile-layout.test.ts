import { describe, it, expect } from 'vitest'
import {
  layoutOverviewTiles,
  pickOverviewColumns,
  type OverviewTileLayoutOptions
} from './overview-tile-layout'

const OPTS: OverviewTileLayoutOptions = { tileWidth: 100, tileHeight: 60, gap: 20, columns: 2 }

describe('pickOverviewColumns', () => {
  it('keeps a single column for 0-1 tiles', () => {
    expect(pickOverviewColumns(0, 4)).toBe(1)
    expect(pickOverviewColumns(1, 4)).toBe(1)
  })

  it('grows toward a square grid, capped at maxColumns', () => {
    expect(pickOverviewColumns(4, 4)).toBe(2)
    expect(pickOverviewColumns(9, 4)).toBe(3)
    expect(pickOverviewColumns(100, 4)).toBe(4)
  })
})

describe('layoutOverviewTiles', () => {
  it('places tiles row-major wrapping at the column count', () => {
    const placements = layoutOverviewTiles(['a', 'b', 'c'], OPTS)
    expect(placements[0].rect.origin).toEqual({ x: 0, y: 0 })
    // second column
    expect(placements[1].rect.origin).toEqual({ x: 120, y: 0 })
    // wraps to next row
    expect(placements[2].rect.origin).toEqual({ x: 0, y: 80 })
    expect(placements[2].worktreeId).toBe('c')
    expect(placements[0].rect.size).toEqual({ width: 100, height: 60 })
  })

  it('is stable in input order', () => {
    const ids = ['x', 'y', 'z', 'w']
    expect(layoutOverviewTiles(ids, OPTS).map((p) => p.worktreeId)).toEqual(ids)
  })
})
