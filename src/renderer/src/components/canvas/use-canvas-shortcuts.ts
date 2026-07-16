// Canvas keyboard chords, installed at document capture phase so a focused
// terminal pane can't swallow them first (docs/main-surface.md). Bindings are
// resolved from Orca's keybindings registry (scope 'canvas'), so they show up
// in Settings → Keyboard Shortcuts and are user-rebindable. Defaults:
//   Cmd/Ctrl+U → fit all       Cmd/Ctrl+G → auto grid layout
//   ⌥⇧⌘L → group by worktree   ⇧⌘G → tidy selection   ⇧⌘S → stack selection
//   Cmd/Ctrl+W → close/return the focused node
// The view/arrange chords fire only when the canvas itself — not an inner
// editor/terminal pane — is focused, so they never steal a pane's own chord.

import { useEffect } from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { focusedNodeId } from '../../store/canvas/canvas-selection-model'
import { closeOrReturnCanvasNode } from './canvas-node-disposal'
import { useAppStore } from '../../store'
import { keybindingMatchesAction, type KeybindingActionId } from '../../../../shared/keybindings'
import { getShortcutPlatform } from '@/lib/shortcut-platform'

export function useCanvasShortcuts(store: UseBoundStore<StoreApi<CanvasStore>>): void {
  const keybindings = useAppStore((s) => s.keybindings)
  useEffect(() => {
    const platform = getShortcutPlatform()
    const matches = (actionId: KeybindingActionId, e: KeyboardEvent): boolean =>
      keybindingMatchesAction(
        actionId,
        {
          key: e.key,
          code: e.code,
          altKey: e.altKey,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey
        },
        platform,
        keybindings
      )

    const onKeyDown = (e: KeyboardEvent): void => {
      // Close/return acts on the focused node, so it's allowed even while a pane
      // is focused (⌘W closes the window you're working in).
      if (matches('canvas.closeNode', e)) {
        const focused = focusedNodeId(store.getState())
        if (focused) {
          e.preventDefault()
          e.stopPropagation()
          closeOrReturnCanvasNode(store, focused)
        }
        return
      }

      // View/arrange chords must not fire while a pane (editor/terminal) is
      // focused — those keys are the pane's own shortcuts there.
      const inPane = Boolean(
        (document.activeElement as HTMLElement | null)?.closest?.('[data-canvas-node]')
      )
      if (inPane) {
        return
      }

      const st = store.getState()
      const run = (fn: () => void): void => {
        e.preventDefault()
        e.stopPropagation()
        fn()
      }
      if (matches('canvas.fitToView', e)) {
        run(() => st.zoomToFit())
      } else if (matches('canvas.autoLayout', e)) {
        run(() => st.autoLayout())
      } else if (matches('canvas.groupByWorktree', e)) {
        run(() => st.autoVerticalLayout())
      } else if (matches('canvas.tidySelection', e)) {
        run(() => st.tidyGridSelected())
      } else if (matches('canvas.stackSelection', e)) {
        run(() => st.stackSelected('row'))
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [store, keybindings])
}
