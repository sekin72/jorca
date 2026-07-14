// wheelIntent — classify a wheel event as a physical mouse wheel vs a trackpad
// gesture. The canvas maps a physical mouse wheel → zoom (Miro-style) while a
// trackpad two-finger scroll → pan; both arrive as `wheel` events, so we tell
// them apart from the deltas. Ported verbatim from Cate.

// Minimal shape so this stays unit-testable without a real DOM WheelEvent.
export type WheelLike = {
  deltaX: number
  deltaY: number
  deltaMode: number
  ctrlKey: boolean
  // Chromium-only, non-standard: physical wheel notches arrive as multiples of
  // 120. Undefined on engines that don't implement it.
  wheelDeltaY?: number
}

/**
 * True when a wheel event almost certainly came from a physical mouse wheel
 * (not a trackpad two-finger scroll or pinch). In Electron/Chromium
 * `wheelDeltaY` is always present and reports physical wheel notches as
 * nonzero, vertical-only multiples of 120; trackpads emit pixel-precise deltas
 * that aren't 120-aligned and usually carry a horizontal component. A trackpad
 * pinch carries `ctrlKey` and is never a mouse wheel.
 */
export function isMouseWheel(e: WheelLike): boolean {
  if (e.ctrlKey) {
    return false
  }
  const wd = e.wheelDeltaY
  if (typeof wd === 'number' && wd !== 0) {
    return e.deltaX === 0 && Math.abs(wd) % 120 === 0
  }
  return e.deltaMode !== 0
}
