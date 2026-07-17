// The global Main surface: one cross-worktree canvas that hosts windows borrowed
// from any worktree (docs/main-surface.md). Reuses CanvasSurface with the single
// Main store, so pane hosting, culling, and keep-mounted (which resolve tabs
// globally) work unchanged — a borrowed terminal/browser stays live while panned.
//
// No toolbar: you populate Main by borrowing existing windows, not by creating
// fresh ones here (that would spawn orphan panels with no worktree runtime).

import React from 'react'
import { useStore } from 'zustand'
import { Maximize, LayoutGrid, Columns3, Grid3x3 } from 'lucide-react'
import { getMainCanvasStore } from '../../store/canvas/canvas-store'
import { MAIN_SURFACE_ID } from '../../../../shared/canvas-node'
import { CanvasStoreProvider } from './canvas-store-context'
import CanvasSurface from './CanvasSurface'
import { translate } from '@/i18n/i18n'

function ArrangeButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}

export default function MainCanvas(): React.JSX.Element {
  const store = getMainCanvasStore()
  const nodeCount = useStore(store, (s) => Object.keys(s.nodes).length)
  return (
    <CanvasStoreProvider store={store}>
      <div className="relative h-full w-full">
        <CanvasSurface store={store} surfaceId={MAIN_SURFACE_ID} />
        {nodeCount > 0 && (
          <div className="absolute left-2 top-2 z-10 flex items-center gap-0.5 rounded-lg border bg-card p-1 shadow-xs">
            <ArrangeButton
              label={translate(
                'auto.components.canvas.MainCanvas.autoSize',
                'Auto-size windows to fill the canvas'
              )}
              onClick={() => store.getState().autoSize()}
            >
              <Maximize className="h-4 w-4" />
            </ArrangeButton>
            <ArrangeButton
              label={translate(
                'auto.components.canvas.MainCanvas.groupByWorktree',
                'Group by worktree'
              )}
              onClick={() => store.getState().autoVerticalLayout()}
            >
              <Columns3 className="h-4 w-4" />
            </ArrangeButton>
            <ArrangeButton
              label={translate('auto.components.canvas.MainCanvas.autoGrid', 'Auto grid')}
              onClick={() => store.getState().autoLayout()}
            >
              <LayoutGrid className="h-4 w-4" />
            </ArrangeButton>
            <ArrangeButton
              label={translate(
                'auto.components.canvas.MainCanvas.tidySelection',
                'Tidy selection into a grid'
              )}
              onClick={() => store.getState().tidyGridSelected()}
            >
              <Grid3x3 className="h-4 w-4" />
            </ArrangeButton>
          </div>
        )}
        {nodeCount === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              {translate(
                'auto.components.canvas.MainCanvas.empty',
                'Send a window here from any worktree to watch it on Main.'
              )}
            </p>
          </div>
        )}
      </div>
    </CanvasStoreProvider>
  )
}
