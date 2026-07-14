import { describe, it, expect } from 'vitest'
import {
  getMainCanvasStore,
  peekMainCanvasStore,
  getOrCreateCanvasStoreForWorktree,
  getAllCanvasStoreEntries
} from './canvas-store'
import { MAIN_SURFACE_ID } from '../../../../shared/canvas-node'

describe('main canvas store', () => {
  it('returns a stable singleton across calls', () => {
    const a = getMainCanvasStore()
    const b = getMainCanvasStore()
    expect(a).toBe(b)
  })

  it('peek reflects creation', () => {
    getMainCanvasStore()
    expect(peekMainCanvasStore()).toBe(getMainCanvasStore())
  })

  it('is not registered as a worktree canvas store', () => {
    getMainCanvasStore()
    const entries = getAllCanvasStoreEntries()
    expect(entries.some(([id]) => id === MAIN_SURFACE_ID)).toBe(false)
  })

  it('is a distinct store from any worktree canvas', () => {
    const main = getMainCanvasStore()
    const worktree = getOrCreateCanvasStoreForWorktree('wt-1')
    expect(main).not.toBe(worktree)
    main.getState().setZoom(2)
    expect(worktree.getState().zoomLevel).not.toBe(2)
  })
})
