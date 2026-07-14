// Centered hint shown when a worktree's canvas has no nodes yet. If saved
// layouts exist, offers one-click loading of a layout into this canvas (Cate's
// EmptyCanvasOverlay pattern). Otherwise shows a simple empty-state hint.

import React, { useEffect, useState } from 'react'
import { LayoutPanelTop, X } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '../../store'
import { listCanvasLayouts, loadCanvasLayout } from '@/lib/canvas-layouts'

export default function EmptyCanvasOverlay(): React.JSX.Element {
  const canvasLayoutsVersion = useAppStore((s) => s.canvasLayoutsVersion)
  const setCanvasLayoutsDialogOpen = useAppStore((s) => s.setCanvasLayoutsDialogOpen)
  const [names, setNames] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    listCanvasLayouts()
      .then(setNames)
      .catch(() => setNames([]))
  }, [canvasLayoutsVersion])

  const visible = !dismissed && names.length > 0

  // Escape dismisses the overlay (continue with a blank canvas).
  useEffect(() => {
    if (!visible) {
      return
    }
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setDismissed(true)
      }
    }
    document.addEventListener('keydown', handler, { capture: true })
    return () => document.removeEventListener('keydown', handler, { capture: true })
  }, [visible])

  if (!visible) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="space-y-1 text-center text-muted-foreground">
          <div className="text-sm font-medium">
            {translate('auto.components.canvas.EmptyCanvasOverlay.title', 'Empty canvas')}
          </div>
          <div className="text-xs opacity-70">
            {translate(
              'auto.components.canvas.EmptyCanvasOverlay.hint',
              'Open a terminal, editor, or browser to place it here.'
            )}
          </div>
        </div>
      </div>
    )
  }

  const load = async (name: string): Promise<void> => {
    setBusy(true)
    try {
      await loadCanvasLayout(name)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="pointer-events-auto w-[360px] max-w-[90%] overflow-hidden rounded-xl border bg-card p-0 shadow-lg">
        <div className="flex items-center justify-between pl-3.5 pr-2 pt-2 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {translate(
              'auto.components.canvas.EmptyCanvasOverlay.startFromLayout',
              'Start from a layout'
            )}
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={translate('auto.components.canvas.EmptyCanvasOverlay.close', 'Close')}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="scrollbar-sleek max-h-[260px] overflow-y-auto pb-1.5">
          {names.map((name) => (
            <button
              key={name}
              type="button"
              disabled={busy}
              onClick={() => void load(name)}
              className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left hover:bg-accent disabled:opacity-50"
            >
              <span className="shrink-0 text-muted-foreground">
                <LayoutPanelTop className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate text-[13px] text-foreground">{name}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="px-3.5 py-2 text-left text-[11px] text-muted-foreground hover:text-foreground"
          >
            {translate(
              'auto.components.canvas.EmptyCanvasOverlay.continueWithout',
              'Continue without layout'
            )}
          </button>
          <button
            type="button"
            onClick={() => setCanvasLayoutsDialogOpen(true)}
            className="px-3.5 py-2 text-right text-[11px] text-muted-foreground hover:text-foreground"
          >
            {translate('auto.components.canvas.EmptyCanvasOverlay.manage', 'Manage…')}
          </button>
        </div>
      </div>
    </div>
  )
}
