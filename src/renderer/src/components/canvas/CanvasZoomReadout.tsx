// Compact zoom control docked bottom-right of a canvas (docs/main-surface.md T-C2).
// −/%/+ : zoom out, reset-to-100%, zoom in — all anchored on the viewport center
// so the content doesn't drift. Reads live zoom from the canvas store.

import React from 'react'
import { Minus, Plus, Frame } from 'lucide-react'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { translate } from '@/i18n/i18n'

type BoundStore = UseBoundStore<StoreApi<CanvasStore>>

const ZOOM_STEP = 1.2

export default function CanvasZoomReadout({ store }: { store: BoundStore }): React.JSX.Element {
  const zoom = useStore(store, (s) => s.zoomLevel)

  const zoomBy = (factor: number): void => {
    const { containerSize, zoomLevel } = store.getState()
    const center = { x: containerSize.width / 2, y: containerSize.height / 2 }
    store.getState().zoomAroundPoint(zoomLevel * factor, center)
  }
  const reset = (): void => {
    const { containerSize } = store.getState()
    store.getState().zoomAroundPoint(1, { x: containerSize.width / 2, y: containerSize.height / 2 })
  }

  return (
    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border bg-card p-0.5 shadow-xs">
      <button
        type="button"
        aria-label={translate('auto.components.canvas.CanvasZoomReadout.zoomOut', 'Zoom out')}
        title={translate('auto.components.canvas.CanvasZoomReadout.zoomOut', 'Zoom out')}
        onClick={() => zoomBy(1 / ZOOM_STEP)}
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={translate(
          'auto.components.canvas.CanvasZoomReadout.reset',
          'Reset zoom to 100%'
        )}
        title={translate('auto.components.canvas.CanvasZoomReadout.reset', 'Reset zoom to 100%')}
        onClick={reset}
        className="min-w-[42px] rounded-full px-1.5 py-0.5 text-center font-mono text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        aria-label={translate('auto.components.canvas.CanvasZoomReadout.zoomIn', 'Zoom in')}
        title={translate('auto.components.canvas.CanvasZoomReadout.zoomIn', 'Zoom in')}
        onClick={() => zoomBy(ZOOM_STEP)}
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <div className="mx-0.5 h-4 w-px bg-border" />
      <button
        type="button"
        aria-label={translate(
          'auto.components.canvas.CanvasZoomReadout.fit',
          'Fit all windows to view'
        )}
        title={translate(
          'auto.components.canvas.CanvasZoomReadout.fit',
          'Fit all windows to view (⌘/Ctrl+0)'
        )}
        onClick={() => store.getState().zoomToFit()}
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Frame className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
