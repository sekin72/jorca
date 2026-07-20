import React from 'react'
import { getCanvasGestureRows } from '../canvas/canvas-shortcut-hud-visibility'
import { CanvasHudToggle } from './CanvasHudToggle'
import { translate } from '@/i18n/i18n'

// Pointer gestures aren't rebindable registry rows, so they get their own
// group whose only control is the canvas-HUD visibility checkbox.
export function CanvasHudGestureSection(): React.JSX.Element {
  const rows = getCanvasGestureRows()
  return (
    <div className="space-y-3">
      <h3 className="border-b border-border/50 pb-2 text-sm font-medium text-muted-foreground">
        {translate('auto.components.settings.CanvasHudGestureSection.title', 'Canvas gestures')}
      </h3>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <CanvasHudToggle id={row.id} />
            <span className="min-w-0 flex-1 truncate text-sm">{row.label}</span>
            <span className="flex shrink-0 items-center gap-0.5">
              {row.keys.map((key) => (
                <span
                  key={key}
                  className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground"
                >
                  {key}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
