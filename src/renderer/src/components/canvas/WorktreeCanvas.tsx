// Entry point for the infinite-canvas workbench: resolves the active worktree's
// isolated canvas store and renders its surface. Mounted (behind the
// experimentalCanvas flag) in place of the tiled Terminal workbench — see
// docs/canvas-workspace.md and the App terminal-view branch.

import React, { lazy, Suspense, useMemo } from 'react'
import { useActiveWorktreeId } from '../../store/selectors'
import { useAppStore } from '../../store'
import { getOrCreateCanvasStoreForWorktree } from '../../store/canvas/canvas-store'
import { CanvasStoreProvider } from './canvas-store-context'
import CanvasSurface from './CanvasSurface'
import CanvasToolbar from './CanvasToolbar'
import { CanvasLayoutsDialog } from './CanvasLayoutsDialog'

const CanvasOverview = lazy(() => import('./overview/CanvasOverview'))
const MainCanvas = lazy(() => import('./MainCanvas'))

export default function WorktreeCanvas(): React.JSX.Element | null {
  const worktreeId = useActiveWorktreeId()
  const overviewActive = useAppStore((s) => s.canvasOverviewActive)
  const mainSurfaceActive = useAppStore((s) => s.mainSurfaceActive)
  const store = useMemo(
    () => (worktreeId ? getOrCreateCanvasStoreForWorktree(worktreeId) : null),
    [worktreeId]
  )
  // Main surface replaces the worktree canvas (like Overview), keeping the active
  // worktree mounted underneath so its panes survive the swap.
  if (mainSurfaceActive) {
    return (
      <Suspense fallback={null}>
        <MainCanvas />
      </Suspense>
    )
  }
  if (overviewActive) {
    return (
      <Suspense fallback={null}>
        <CanvasOverview />
      </Suspense>
    )
  }
  if (!store) {
    return null
  }
  return (
    <CanvasStoreProvider store={store}>
      <div className="relative h-full w-full">
        <CanvasSurface store={store} surfaceId={worktreeId ?? undefined} />
        <CanvasToolbar />
        <CanvasLayoutsDialog />
      </div>
    </CanvasStoreProvider>
  )
}
