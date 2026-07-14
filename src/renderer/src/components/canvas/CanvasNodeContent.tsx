// Placeholder preview for a canvas node's body — shown when the live pane isn't
// hosted (editor zoomed below the threshold, or an unresolved/placeholder node).
// CanvasNode renders CanvasNodePane instead when the pane is hostable. See
// docs/canvas-workspace.md §5.

import React from 'react'
import { useNodeTab } from './canvas-node-tab-lookup'
import { translate } from '@/i18n/i18n'

function CanvasNodeContent({ panelId }: { panelId: string }): React.JSX.Element {
  const tab = useNodeTab(panelId)
  const title =
    tab?.label ?? translate('auto.components.canvas.CanvasNodeContent.placeholder', 'Panel')
  const subtitle = tab?.contentType ?? panelId
  return (
    <div className="flex h-full w-full items-center justify-center bg-editor-surface text-muted-foreground">
      <div className="space-y-1 px-3 text-center">
        <div className="truncate text-xs font-medium">{title}</div>
        <div className="truncate font-mono text-[11px] opacity-70">{subtitle}</div>
      </div>
    </div>
  )
}

export default React.memo(CanvasNodeContent)
