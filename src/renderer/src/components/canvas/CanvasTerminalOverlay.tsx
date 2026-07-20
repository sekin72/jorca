// React context for the canvas terminal overlay — a portal target outside the
// world transform so xterm's mouse hit-testing always runs at layout scale 1.
// CanvasSurface creates the overlay div and provides its ref; CanvasNodePane
// consumes it to portal TerminalPane instances at screen-space coordinates.

import { createContext, useContext, type RefObject } from 'react'

/** Context value is the RefObject (not .current) so the identity is stable —
 *  consumers read ref.current at render time to decide whether to portal. */
export const CanvasTerminalOverlayContext = createContext<RefObject<HTMLDivElement | null> | null>(
  null
)

export function useCanvasTerminalOverlayRef(): RefObject<HTMLDivElement | null> | null {
  return useContext(CanvasTerminalOverlayContext)
}
