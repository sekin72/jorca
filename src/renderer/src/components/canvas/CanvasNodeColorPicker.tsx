// Per-node "Color Bloom" picker (ported concept from Null Space): a header
// popover of preset window tints + a Default (clear) action. The chosen color
// tints the node's header title + minimap rectangle (see CanvasNode) — it never
// touches the selection highlight, which stays uniform across all nodes.

import React from 'react'
import { Palette } from 'lucide-react'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { CANVAS_NODE_COLORS } from './canvas-node-colors'
import { translate } from '@/i18n/i18n'

export default function CanvasNodeColorPicker({
  store,
  nodeId,
  color
}: {
  store: UseBoundStore<StoreApi<CanvasStore>>
  nodeId: string
  color?: string
}): React.JSX.Element {
  const setColor = (next: string | undefined): void => store.getState().setNodeColor(nodeId, next)
  const label = translate('auto.components.canvas.CanvasNodeColorPicker.label', 'Window color')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-canvas-node-control
          aria-label={label}
          title={label}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {color ? (
            <span
              className="h-3 w-3 rounded-full ring-1 ring-inset ring-black/20"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          ) : (
            <Palette className="h-3 w-3" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2" data-canvas-node-control>
        <div className="grid grid-cols-4 gap-1.5">
          {CANVAS_NODE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className="h-6 w-6 rounded-full border border-border transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: color === c ? '2px solid var(--ring)' : undefined,
                outlineOffset: '2px'
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setColor(undefined)}
          className="mt-2 w-full rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {translate('auto.components.canvas.CanvasNodeColorPicker.default', 'Default')}
        </button>
      </PopoverContent>
    </Popover>
  )
}
