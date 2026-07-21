// Canvas action bar docked bottom-center of a canvas (docs/main-surface.md T-C2).
// Bulk canvas abilities — layout — as one-click buttons that mirror the keyboard chords.

import React from 'react'
import { Maximize, Columns3, Grid2x2, StretchHorizontal, StretchVertical } from 'lucide-react'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip'
import { translate } from '@/i18n/i18n'

type BoundStore = UseBoundStore<StoreApi<CanvasStore>>

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
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={4}>{title ?? label}</TooltipContent>
    </Tooltip>
  )
}

export default function CanvasZoomReadout({ store }: { store: BoundStore }): React.JSX.Element {
  const nodeCount = useStore(store, (s) => Object.keys(s.nodes).length)
  const act = store.getState

  const t = (key: string, fallback: string): string =>
    translate(`auto.components.canvas.CanvasZoomReadout.${key}`, fallback)

  const hasNodes = nodeCount > 0

  // Tidy/stack always act on ALL nodes — select all first so the action isn't a
  // no-op when the user has a node focused.
  const tidy = (): void => {
    act().selectAll()
    act().tidyGridSelected()
  }
  const stackRow = (): void => {
    act().selectAll()
    act().stackSelected('row')
  }
  const stackColumn = (): void => {
    act().selectAll()
    act().stackSelected('column')
  }

  return (
    <div className="absolute bottom-3 left-1/2 z-10 flex max-w-[95vw] -translate-x-1/2 items-center gap-0.5 rounded-full border bg-card p-0.5 shadow-xs">
      <BarButton
        label={t('autoSize', 'Auto-size windows to fill the canvas')}
        title={`${t('autoSize', 'Auto-size windows to fill the canvas')} (⇧⌘/Ctrl+U)`}
        disabled={!hasNodes}
        onClick={() => act().autoSize()}
      >
        <Maximize className={ICON} />
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
        disabled={!hasNodes}
        onClick={tidy}
      >
        <Grid2x2 className={ICON} />
      </BarButton>
      <BarButton
        label={t('stack', 'Stack selection in a row')}
        title={`${t('stack', 'Stack selection in a row')} (⇧⌘S)`}
        disabled={!hasNodes}
        onClick={stackRow}
      >
        <StretchHorizontal className={ICON} />
      </BarButton>
      <BarButton
        label={t('stackColumn', 'Stack selection in a column')}
        title={`${t('stackColumn', 'Stack selection in a column')} (⇧⌘⌥S)`}
        disabled={!hasNodes}
        onClick={stackColumn}
      >
        <StretchVertical className={ICON} />
      </BarButton>
    </div>
  )
}
