// Canvas action bar docked bottom-center of a canvas (docs/main-surface.md T-C2).
// Zoom controls plus every bulk canvas ability — fit / arrange (layout),
// selection, and undo/redo — as one-click buttons that mirror the keyboard
// chords. Reads live zoom + node/selection counts from the store so buttons
// that need targets disable themselves when there are none.

import React from 'react'
import {
  Minus,
  Plus,
  Frame,
  LayoutGrid,
  Columns3,
  Grid2x2,
  StretchHorizontal,
  BoxSelect,
  SquareX,
  Trash2,
  Undo2,
  Redo2
} from 'lucide-react'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { translate } from '@/i18n/i18n'

type BoundStore = UseBoundStore<StoreApi<CanvasStore>>

const ZOOM_STEP = 1.2
const ICON = 'h-3.5 w-3.5'

function BarButton({
  label,
  title,
  onClick,
  disabled,
  children
}: {
  label: string
  title?: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function Divider(): React.JSX.Element {
  return <div className="mx-0.5 h-4 w-px bg-border" />
}

export default function CanvasZoomReadout({ store }: { store: BoundStore }): React.JSX.Element {
  const zoom = useStore(store, (s) => s.zoomLevel)
  const nodeCount = useStore(store, (s) => Object.keys(s.nodes).length)
  const selectionCount = useStore(store, (s) => s.selection.length)
  const canUndo = useStore(store, (s) => s.history.length > 0)
  const canRedo = useStore(store, (s) => s.future.length > 0)

  const zoomBy = (factor: number): void => {
    const { containerSize, zoomLevel } = store.getState()
    const center = { x: containerSize.width / 2, y: containerSize.height / 2 }
    store.getState().zoomAroundPoint(zoomLevel * factor, center)
  }
  const reset = (): void => {
    const { containerSize } = store.getState()
    store.getState().zoomAroundPoint(1, { x: containerSize.width / 2, y: containerSize.height / 2 })
  }
  const act = store.getState

  const t = (key: string, fallback: string): string =>
    translate(`auto.components.canvas.CanvasZoomReadout.${key}`, fallback)

  // Layout/arrange act on ALL nodes; tidy/stack act on the SELECTION; clear/
  // delete need a selection. Disable when their target set is empty.
  const hasNodes = nodeCount > 0
  const hasSelection = selectionCount > 0
  const hasMultiSelection = selectionCount >= 2

  return (
    <div className="absolute bottom-3 left-1/2 z-10 flex max-w-[95vw] -translate-x-1/2 items-center gap-0.5 rounded-full border bg-card p-0.5 shadow-xs">
      <BarButton label={t('zoomOut', 'Zoom out')} onClick={() => zoomBy(1 / ZOOM_STEP)}>
        <Minus className={ICON} />
      </BarButton>
      <button
        type="button"
        aria-label={t('reset', 'Reset zoom to 100%')}
        title={t('reset', 'Reset zoom to 100%')}
        onClick={reset}
        className="min-w-[42px] rounded-full px-1.5 py-0.5 text-center font-mono text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {Math.round(zoom * 100)}%
      </button>
      <BarButton label={t('zoomIn', 'Zoom in')} onClick={() => zoomBy(ZOOM_STEP)}>
        <Plus className={ICON} />
      </BarButton>

      <Divider />

      <BarButton
        label={t('fit', 'Fit all windows to view')}
        title={`${t('fit', 'Fit all windows to view')} (⌘/Ctrl+U)`}
        disabled={!hasNodes}
        onClick={() => act().zoomToFit()}
      >
        <Frame className={ICON} />
      </BarButton>
      <BarButton
        label={t('arrange', 'Auto-arrange windows in a grid')}
        title={`${t('arrange', 'Auto-arrange windows in a grid')} (⌘/Ctrl+G)`}
        disabled={!hasNodes}
        onClick={() => act().autoLayout()}
      >
        <LayoutGrid className={ICON} />
      </BarButton>
      <BarButton
        label={t('group', 'Group windows by worktree')}
        title={`${t('group', 'Group windows by worktree')} (⌥⇧⌘L)`}
        disabled={!hasNodes}
        onClick={() => act().autoVerticalLayout()}
      >
        <Columns3 className={ICON} />
      </BarButton>
      <BarButton
        label={t('tidy', 'Tidy selection into a grid')}
        title={`${t('tidy', 'Tidy selection into a grid')} (⇧⌘G)`}
        disabled={!hasMultiSelection}
        onClick={() => act().tidyGridSelected()}
      >
        <Grid2x2 className={ICON} />
      </BarButton>
      <BarButton
        label={t('stack', 'Stack selection in a row')}
        title={`${t('stack', 'Stack selection in a row')} (⇧⌘S)`}
        disabled={!hasMultiSelection}
        onClick={() => act().stackSelected('row')}
      >
        <StretchHorizontal className={ICON} />
      </BarButton>

      <Divider />

      <BarButton
        label={t('selectAll', 'Select all windows')}
        disabled={!hasNodes}
        onClick={() => act().selectAll()}
      >
        <BoxSelect className={ICON} />
      </BarButton>
      <BarButton
        label={t('clearSelection', 'Clear selection')}
        disabled={!hasSelection}
        onClick={() => act().clearSelection()}
      >
        <SquareX className={ICON} />
      </BarButton>
      <BarButton
        label={t('deleteSelection', 'Remove selected windows from canvas')}
        disabled={!hasSelection}
        onClick={() => act().deleteSelection()}
      >
        <Trash2 className={ICON} />
      </BarButton>

      <Divider />

      <BarButton label={t('undo', 'Undo')} disabled={!canUndo} onClick={() => act().undo()}>
        <Undo2 className={ICON} />
      </BarButton>
      <BarButton label={t('redo', 'Redo')} disabled={!canRedo} onClick={() => act().redo()}>
        <Redo2 className={ICON} />
      </BarButton>
    </div>
  )
}
