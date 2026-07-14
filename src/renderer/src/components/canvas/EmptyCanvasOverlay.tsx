// Centered hint shown when a worktree's canvas has no nodes yet.

import React from 'react'
import { translate } from '@/i18n/i18n'

export default function EmptyCanvasOverlay(): React.JSX.Element {
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
