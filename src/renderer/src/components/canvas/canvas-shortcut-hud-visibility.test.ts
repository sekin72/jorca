import { describe, expect, it } from 'vitest'
import { KEYBINDING_DEFINITIONS } from '../../../../shared/keybindings'
import {
  defaultCanvasHudIds,
  isValidCanvasHudId,
  normalizeCanvasHudShownIds
} from './canvas-shortcut-hud-visibility'

const CANVAS_ACTION_IDS = KEYBINDING_DEFINITIONS.filter((d) => d.scope === 'canvas').map(
  (d) => d.id
)

describe('canvas HUD visibility defaults', () => {
  it('shows every canvas-scoped shortcut plus all gestures by default', () => {
    const ids = defaultCanvasHudIds()
    for (const actionId of CANVAS_ACTION_IDS) {
      expect(ids).toContain(actionId)
    }
    expect(ids).toContain('gesture.zoom')
    expect(ids).toContain('gesture.spawnMenu')
  })

  it('does not default-show non-canvas shortcuts', () => {
    const ids = new Set(defaultCanvasHudIds())
    const nonCanvas = KEYBINDING_DEFINITIONS.find((d) => d.scope !== 'canvas')
    expect(nonCanvas && ids.has(nonCanvas.id)).toBeFalsy()
  })
})

describe('normalizeCanvasHudShownIds', () => {
  it('seeds defaults when the stored value is absent or malformed', () => {
    expect(normalizeCanvasHudShownIds(undefined)).toEqual(defaultCanvasHudIds())
    expect(normalizeCanvasHudShownIds('nope')).toEqual(defaultCanvasHudIds())
  })

  it('preserves an explicit empty allowlist instead of reseeding defaults', () => {
    expect(normalizeCanvasHudShownIds([])).toEqual([])
  })

  it('prunes ids that are no longer valid', () => {
    const kept = CANVAS_ACTION_IDS[0]
    expect(normalizeCanvasHudShownIds([kept, 'stale.removed.action', 'gesture.pan'])).toEqual([
      kept,
      'gesture.pan'
    ])
  })
})

describe('isValidCanvasHudId', () => {
  it('accepts registry action ids and gesture ids, rejects unknowns', () => {
    expect(isValidCanvasHudId(CANVAS_ACTION_IDS[0])).toBe(true)
    expect(isValidCanvasHudId('gesture.maximize')).toBe(true)
    expect(isValidCanvasHudId('gesture.unknown')).toBe(false)
    expect(isValidCanvasHudId('not.a.real.id')).toBe(false)
  })
})
