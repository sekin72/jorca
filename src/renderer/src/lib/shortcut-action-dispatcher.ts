/**
 * Maps shortcut action IDs to their corresponding store actions.
 * This allows click-to-execute functionality in the shortcuts settings pane.
 * Canvas actions dispatch to the active worktree's canvas store when one exists,
 * falling back to a hint toast when no active canvas is focused.
 */
import { toast } from 'sonner'
import type { KeybindingActionId } from '../../../shared/keybindings'
import { useAppStore } from '@/store'
import { peekCanvasStoreForWorktree } from '@/store/canvas/canvas-store'
import { focusedNodeId } from '@/store/canvas/canvas-selection-model'
import { closeOrReturnCanvasNode } from '@/components/canvas/canvas-node-disposal'
import { TOGGLE_FLOATING_TERMINAL_EVENT } from './floating-terminal'
import { TOGGLE_QUICK_COMMANDS_MENU_EVENT } from './quick-commands-menu-events'
import { OPEN_WORKSPACE_BOARD_EVENT } from '@/components/sidebar/useWorkspaceBoardPanel'
import { applyUIZoom } from '@/lib/ui-zoom'
import { zoomLevelToPercent, ZOOM_STEP, ZOOM_MIN, ZOOM_MAX } from '@/components/settings/SettingsConstants'
import { dispatchZoomLevelChanged } from '@/lib/zoom-events'

function actionLabel(actionId: KeybindingActionId): string {
  // Use a reasonable default label from the action ID itself
  return actionId.split('.').pop() ?? actionId
}

/** Find the active worktree's canvas store, or undefined if none is available. */
function getActiveCanvasStore(): ReturnType<typeof peekCanvasStoreForWorktree> {
  const state = useAppStore.getState()
  if (state.activeWorktreeId) {
    return peekCanvasStoreForWorktree(state.activeWorktreeId) ?? undefined
  }
  return undefined
}

/**
 * Executes a shortcut action by calling the corresponding store action or dispatching events.
 * This is used for click-to-execute functionality in the shortcuts settings pane.
 * Shows a toast for actions that need a specific context (canvas, terminal, browser, editor).
 */
export function executeShortcutAction(actionId: KeybindingActionId): void {
  const store = useAppStore.getState()

  switch (actionId) {
    // Sidebar toggles — these have direct store methods.
    case 'sidebar.left.toggle':
      store.toggleSidebar()
      break
    case 'sidebar.right.toggle':
      store.toggleRightSidebar()
      break
    case 'sidebar.sleepingWorkspaces.toggle':
      store.setShowSleepingWorkspaces(!store.showSleepingWorkspaces)
      if (!store.showSleepingWorkspaces) {
        store.setSidebarOpen(true)
      }
      break
    case 'sidebar.explorer.toggle':
      store.showRightSidebarFiles()
      break
    case 'sidebar.search.toggle':
      store.showRightSidebarSearch(undefined)
      break
    case 'sidebar.sourceControl.toggle':
      store.setRightSidebarTab('source-control')
      store.setRightSidebarOpen(true)
      break
    case 'sidebar.checks.toggle':
      store.setRightSidebarTab('checks')
      store.setRightSidebarOpen(true)
      break
    case 'sidebar.ports.toggle':
      store.setRightSidebarTab('ports')
      store.setRightSidebarOpen(true)
      break
    case 'sidebar.focusWorktreeList':
      store.setSidebarOpen(true)
      break

    // Settings and navigation
    case 'app.settings':
    case 'settings.search':
      store.openSettingsPage()
      break
    case 'view.tasks':
      store.openTaskPage()
      break
    case 'workspace.openBoard':
      store.setSidebarOpen(true)
      window.dispatchEvent(new CustomEvent(OPEN_WORKSPACE_BOARD_EVENT))
      break
    // Worktree navigation
    case 'worktree.quickOpen':
      if (store.activeWorktreeId !== null) {
        store.openModal('quick-open')
      }
      break
    case 'worktree.history.back':
      store.goBackWorktree()
      break
    case 'worktree.history.forward':
      store.goForwardWorktree()
      break

    // Floating terminal
    case 'floatingTerminal.toggle':
    case 'floatingWorkspace.maximize':
    case 'floatingWorkspace.minimize':
      window.dispatchEvent(new CustomEvent(TOGGLE_FLOATING_TERMINAL_EVENT))
      break

    // Quick commands
    case 'tab.openQuickCommandsMenu':
      window.dispatchEvent(new CustomEvent(TOGGLE_QUICK_COMMANDS_MENU_EVENT))
      break

    // Zoom actions — adjust UI zoom level immediately regardless of focus
    case 'zoom.in':
    case 'zoom.out':
    case 'zoom.reset': {
      const current = window.api.ui.getZoomLevel()
      const rawNext =
        actionId === 'zoom.in'
          ? current + ZOOM_STEP
          : actionId === 'zoom.out'
            ? current - ZOOM_STEP
            : 0
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, rawNext))
      applyUIZoom(next)
      void window.api.ui.set({ uiZoomLevel: next })
      dispatchZoomLevelChanged('ui', zoomLevelToPercent(next))
      break
    }

    // Canvas actions — dispatch to the active worktree's canvas store
    case 'canvas.fitToView':
    case 'canvas.autoSize':
    case 'canvas.autoLayout':
    case 'canvas.groupByWorktree':
    case 'canvas.tidySelection':
    case 'canvas.stackSelection':
    case 'canvas.closeNode':
    case 'canvas.arrangeGroup':
    case 'canvas.arrangeGrid':
    case 'canvas.arrangeColumns': {
      const canvasStore = getActiveCanvasStore()
      if (!canvasStore) {
        toast.info(`'${actionLabel(actionId)}' — focus a canvas to use this action`)
        break
      }
      const st = canvasStore.getState()
      switch (actionId) {
        case 'canvas.fitToView':
          st.zoomToFit()
          break
        case 'canvas.autoSize':
          st.autoSize()
          break
        case 'canvas.autoLayout':
          st.autoLayout()
          break
        case 'canvas.groupByWorktree':
          st.autoVerticalLayout()
          break
        case 'canvas.tidySelection':
        case 'canvas.arrangeGrid':
          st.tidyGridSelected()
          break
        case 'canvas.stackSelection':
          st.stackSelected('row')
          break
        case 'canvas.arrangeColumns':
          st.stackSelected('column')
          break
        case 'canvas.closeNode': {
          const focused = focusedNodeId(canvasStore.getState())
          if (focused) {
            closeOrReturnCanvasNode(canvasStore, focused)
          }
          break
        }
      }
      break
    }

    // All other actions (browser, editor, terminal, file explorer, etc.) need
    // their specific context to be active — show a hint toast.
    default:
      toast.info(`'${actionLabel(actionId)}' — this action needs its context to be active`)
  }
}
