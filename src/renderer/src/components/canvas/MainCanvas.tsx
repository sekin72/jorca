// The global Main surface: one cross-worktree canvas that hosts windows borrowed
// from any worktree (docs/main-surface.md). Reuses CanvasSurface with the single
// Main store, so pane hosting, culling, and keep-mounted (which resolve tabs
// globally) work unchanged — a borrowed terminal/browser stays live while panned.
//
// No toolbar: you populate Main by borrowing existing windows, not by creating
// fresh ones here (that would spawn orphan panels with no worktree runtime).

import React from 'react'
import { useStore } from 'zustand'
import { getMainCanvasStore } from '../../store/canvas/canvas-store'
import { MAIN_SURFACE_ID } from '../../../../shared/canvas-node'
import { CanvasStoreProvider } from './canvas-store-context'
import CanvasSurface from './CanvasSurface'
import { translate } from '@/i18n/i18n'

export default function MainCanvas(): React.JSX.Element {
  const store = getMainCanvasStore()
  const nodeCount = useStore(store, (s) => Object.keys(s.nodes).length)
  return (
    <CanvasStoreProvider store={store}>
      <div className="relative h-full w-full">
        <CanvasSurface store={store} surfaceId={MAIN_SURFACE_ID} />
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
