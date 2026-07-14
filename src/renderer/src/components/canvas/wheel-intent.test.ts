import { describe, it, expect } from 'vitest'
import { isMouseWheel, type WheelLike } from './wheel-intent'

function wheel(p: Partial<WheelLike>): WheelLike {
  return { deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, ...p }
}

describe('isMouseWheel', () => {
  it('treats a trackpad pinch (ctrlKey) as not-mouse', () => {
    expect(isMouseWheel(wheel({ ctrlKey: true, wheelDeltaY: -120 }))).toBe(false)
  })

  it('treats vertical-only 120-aligned notches as a mouse wheel', () => {
    expect(isMouseWheel(wheel({ deltaY: -100, wheelDeltaY: 120 }))).toBe(true)
    expect(isMouseWheel(wheel({ deltaY: 100, wheelDeltaY: -240 }))).toBe(true)
  })

  it('treats pixel-precise / horizontal trackpad deltas as not-mouse', () => {
    expect(isMouseWheel(wheel({ deltaY: -13, wheelDeltaY: 39 }))).toBe(false)
    expect(isMouseWheel(wheel({ deltaX: 5, deltaY: -120, wheelDeltaY: 120 }))).toBe(false)
  })

  it('falls back to deltaMode when wheelDeltaY is absent', () => {
    expect(isMouseWheel(wheel({ deltaY: -1, deltaMode: 1 }))).toBe(true)
    expect(isMouseWheel(wheel({ deltaY: -13, deltaMode: 0 }))).toBe(false)
  })
})
