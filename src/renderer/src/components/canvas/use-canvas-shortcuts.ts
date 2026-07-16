// Canvas keyboard chords (Cmd on Mac, Ctrl elsewhere), installed at document
// capture phase so a focused terminal pane can't swallow them first
// (docs/main-surface.md):
//   Cmd/Ctrl+W → close/return the focused node   Cmd/Ctrl+0 → fit all to view
//   Shift-chords → arrange (grid / vertical / tidy / stack).

import { useEffect } from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { focusedNodeId } from '../../store/canvas/canvas-selection-model'
import { closeOrReturnCanvasNode } from './canvas-node-disposal'

export function useCanvasShortcuts(store: UseBoundStore<StoreApi<CanvasStore>>): void {
  useEffect(() => {
    const isMac = navigator.userAgent.includes('Mac')
    const onKeyDown = (e: KeyboardEvent): void => {
      const chord = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey
      if (!chord) {
        return
      }
      const key = e.key.toLowerCase()

      // Arrange (Shift-based). Don't steal letter chords from a focused editor/
      // terminal pane — those are the pane's own shortcuts; only arrange when
      // focus is on the canvas itself.
      if (e.shiftKey) {
        const inPane = (document.activeElement as HTMLElement | null)?.closest?.(
          '[data-canvas-node]'
        )
        if (inPane) {
          return
        }
        const st = store.getState()
        if (key === 'l') {
          e.preventDefault()
          e.stopPropagation()
          if (e.altKey) {
            st.autoVerticalLayout() // ⌥⇧⌘L
          } else {
            st.autoLayout() // ⇧⌘L
          }
        } else if (key === 'g' && !e.altKey) {
          e.preventDefault()
          e.stopPropagation()
          st.tidyGridSelected() // ⇧⌘G
        } else if (key === 's' && !e.altKey) {
          e.preventDefault()
          e.stopPropagation()
          st.stackSelected('row') // ⇧⌘S
        }
        return
      }

      if (e.altKey) {
        return
      }
      // Cmd/Ctrl+0 → fit all windows to view ("where is it" — recenter on nodes).
      if (e.key === '0') {
        e.preventDefault()
        e.stopPropagation()
        store.getState().zoomToFit()
        return
      }
      if (key !== 'w') {
        return
      }
      const focused = focusedNodeId(store.getState())
      if (!focused) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      closeOrReturnCanvasNode(store, focused)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [store])
}
