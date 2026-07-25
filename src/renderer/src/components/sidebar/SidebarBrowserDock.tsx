import React, { useCallback, useRef } from 'react'
import { RefreshCw, EyeOff } from 'lucide-react'
import { useAppStore } from '@/store'
import {
  MAX_SIDEBAR_BROWSER_DOCK_HEIGHT,
  MIN_SIDEBAR_BROWSER_DOCK_HEIGHT,
} from '@/store/slices/ui'
import { ComboLiveGraph } from '@/components/canvas/combo-flow'

// Why: this stable slot/page id keys the viewport registry for this dock so it
// survives worktree switches and is isolated from all other browser tabs.
const DOCK_TITLE = 'Live'

type ResizeSession = {
  startY: number
  startHeight: number
  previousCursor: string
  previousUserSelect: string
}

export const SidebarBrowserDock = React.memo(function SidebarBrowserDock() {
  const dockHeight = useAppStore((s) => s.sidebarBrowserDockHeight)
  const dockVisible = useAppStore((s) => s.sidebarBrowserDockVisible)
  const setDockHeight = useAppStore((s) => s.setSidebarBrowserDockHeight)
  const setDockVisible = useAppStore((s) => s.setSidebarBrowserDockVisible)

  const clampDockHeight = useCallback((h: number): number => {
    return Math.min(MAX_SIDEBAR_BROWSER_DOCK_HEIGHT, Math.max(MIN_SIDEBAR_BROWSER_DOCK_HEIGHT, h))
  }, [])

  // Force a remount of ComboLiveGraph on reload (resets WS connection).
  const reloadKeyRef = useRef(0)
  const handleReload = useCallback((): void => {
    reloadKeyRef.current++
  }, [])

  // ── Resize ──────────────────────────────────────────────────────────────────

  const resizeSessionRef = useRef<ResizeSession | null>(null)

  const stopResize = useCallback((): void => {
    const session = resizeSessionRef.current
    if (!session) {
      return
    }
    resizeSessionRef.current = null
    document.body.style.cursor = session.previousCursor
    document.body.style.userSelect = session.previousUserSelect
  }, [])

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      e.preventDefault()
      resizeSessionRef.current = {
        startY: e.clientY,
        startHeight: dockHeight,
        previousCursor: document.body.style.cursor,
        previousUserSelect: document.body.style.userSelect,
      }
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
      e.currentTarget.setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent): void => {
        const s = resizeSessionRef.current
        if (!s) { return }
        setDockHeight(clampDockHeight(s.startHeight + s.startY - ev.clientY))
      }
      const onUp = (): void => {
        stopResize()
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        window.removeEventListener('blur', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      window.addEventListener('blur', onUp)
    },
    [dockHeight, clampDockHeight, setDockHeight, stopResize],
  )

  const handleResizeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      const step = e.shiftKey ? 32 : 16
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setDockHeight(clampDockHeight(dockHeight + step))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setDockHeight(clampDockHeight(dockHeight - step))
      } else if (e.key === 'Home') {
        e.preventDefault()
        setDockHeight(MIN_SIDEBAR_BROWSER_DOCK_HEIGHT)
      } else if (e.key === 'End') {
        e.preventDefault()
        setDockHeight(MAX_SIDEBAR_BROWSER_DOCK_HEIGHT)
      }
    },
    [dockHeight, clampDockHeight, setDockHeight],
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!dockVisible) {
    return null
  }

  return (
    <div
      className="relative flex flex-shrink-0 flex-col overflow-hidden"
      style={{ height: dockHeight }}
    >
      {/* Resize handle — grab the dock's top edge; drag up to grow. */}
      <div
        role="separator"
        aria-label="Resize browser dock"
        aria-orientation="horizontal"
        aria-valuemin={MIN_SIDEBAR_BROWSER_DOCK_HEIGHT}
        aria-valuemax={MAX_SIDEBAR_BROWSER_DOCK_HEIGHT}
        aria-valuenow={dockHeight}
        tabIndex={0}
        className="group absolute inset-x-0 top-0 z-20 flex h-2 cursor-row-resize items-start justify-stretch outline-none"
        onPointerDown={startResize}
        onKeyDown={handleResizeKeyDown}
      >
        <div className="h-px w-full bg-transparent transition-colors group-hover:bg-ring/50 group-focus-visible:bg-ring/50 group-active:bg-ring" />
      </div>

      {/* Header row */}
      <div className="flex h-6 flex-shrink-0 items-center justify-between border-b border-border/50 bg-worktree-sidebar px-2">
        <span className="truncate text-xs text-foreground/60">{DOCK_TITLE}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Reload"
            onClick={handleReload}
            className="flex h-5 w-5 items-center justify-center rounded text-foreground/50 hover:text-foreground"
          >
            <RefreshCw size={11} />
          </button>
          <button
            type="button"
            aria-label="Hide dock"
            onClick={() => setDockVisible(false)}
            className="flex h-5 w-5 items-center justify-center rounded text-foreground/50 hover:text-foreground"
          >
            <EyeOff size={11} />
          </button>
        </div>
      </div>

      {/* ComboLiveGraph — remounts on reloadKey change to reset WS */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-background p-1">
        <ComboLiveGraph key={reloadKeyRef.current} />
      </div>
    </div>
  )
})
