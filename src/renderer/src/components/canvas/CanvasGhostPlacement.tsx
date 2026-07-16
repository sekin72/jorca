// Interactive placement picker: when a node create is deferred (store
// pendingPlacement is set, gated on the canvasPlacementPicker setting), this
// renders numbered "ghost" rectangles at the recommended spots INSIDE the world
// div (canvas coords, so they pan/zoom with content). Pick by clicking a ghost or
// pressing its number; Enter or Esc commits the best (index 0) spot. Every path
// commits — the backing tab already exists, so there is no orphaning cancel.

import React, { useCallback, useEffect } from 'react'
import { useStore } from 'zustand'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import type { CanvasPlacementCandidate } from '../../store/canvas/canvas-store-types'

export default function CanvasGhostPlacement({
  store
}: {
  store: UseBoundStore<StoreApi<CanvasStore>>
}): React.JSX.Element | null {
  const pending = useStore(store, (s) => s.pendingPlacement)

  const commit = useCallback(
    (candidate: CanvasPlacementCandidate) => {
      const p = store.getState().pendingPlacement
      if (!p) {
        return
      }
      p.place(candidate)
      store.getState().setPendingPlacement(null)
    },
    [store]
  )

  useEffect(() => {
    if (!pending) {
      return
    }
    const onKey = (e: KeyboardEvent): void => {
      const candidates = store.getState().pendingPlacement?.candidates
      if (!candidates || candidates.length === 0) {
        return
      }
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        commit(candidates[0])
        return
      }
      if (/^[1-9]$/.test(e.key)) {
        const index = Number(e.key) - 1
        if (index < candidates.length) {
          e.preventDefault()
          e.stopPropagation()
          commit(candidates[index])
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [pending, store, commit])

  if (!pending) {
    return null
  }

  return (
    <div className="absolute inset-0 z-40">
      {pending.candidates.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={() => commit(c)}
          className="group absolute flex items-center justify-center rounded-xl border-2 border-dashed border-ring/70 bg-accent/20 transition-colors hover:border-ring hover:bg-accent/40"
          style={{
            left: c.point.x,
            top: c.point.y,
            width: c.size.width,
            height: c.size.height
          }}
          aria-label={`Place here (${i + 1})`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ring/70 bg-background/90 text-base font-semibold text-foreground shadow-sm">
            {i + 1}
          </span>
        </button>
      ))}
    </div>
  )
}
