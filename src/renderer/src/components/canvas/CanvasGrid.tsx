// Screen-space background grid (dots or lines), ported from Cate's CanvasGrid.
// Renders OUTSIDE the world transform so the pattern always lands on whole
// device pixels and looks identical at every zoom. backgroundSize tracks the
// grid step in screen px (CANVAS_GRID_SIZE * zoom); backgroundPosition slides
// with the pan offset. Both are set imperatively via a store subscription so a
// 60fps pan/zoom never re-renders React (matches the world-transform effect).

import React, { useEffect, useRef } from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { CANVAS_GRID_SIZE } from './canvas-snap'

export type CanvasGridStyle = 'dots' | 'lines' | 'none'

// When zoomed out the on-screen step would get too small; double the canvas-space
// spacing until the screen step is comfortably readable.
const MIN_SCREEN_STEP = 16

export default function CanvasGrid({
  store,
  style
}: {
  store: UseBoundStore<StoreApi<CanvasStore>>
  style: CanvasGridStyle
}): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (style === 'none') {
      return
    }
    const el = ref.current
    if (!el) {
      return
    }
    const apply = (zoom: number, offset: { x: number; y: number }): void => {
      let canvasStep = CANVAS_GRID_SIZE
      while (canvasStep * zoom < MIN_SCREEN_STEP) {
        canvasStep *= 2
      }
      const step = canvasStep * zoom
      el.style.backgroundSize = `${step}px ${step}px`
      el.style.backgroundPosition = `${offset.x}px ${offset.y}px`
      // Fade the field out as it densifies on zoom-out (mirrors Null Space's
      // fieldFade); full strength at 100% and beyond, gently muted when small.
      const rawStep = CANVAS_GRID_SIZE * zoom
      const opacity = Math.min(1, Math.max(0.25, (rawStep - 6) / 14))
      el.style.opacity = String(opacity)
    }
    const s = store.getState()
    apply(s.zoomLevel, s.viewportOffset)
    return store.subscribe((state, prev) => {
      if (state.zoomLevel !== prev.zoomLevel || state.viewportOffset !== prev.viewportOffset) {
        apply(state.zoomLevel, state.viewportOffset)
      }
    })
  }, [store, style])

  if (style === 'none') {
    return null
  }

  const backgroundImage =
    style === 'lines'
      ? 'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)'
      : 'radial-gradient(circle, var(--grid-dot) 1px, transparent 1px)'

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={{ backgroundImage }}
    />
  )
}
