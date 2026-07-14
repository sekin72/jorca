// One worktree's read-only canvas thumbnail on the Overview. Draws each node as
// a scaled box (no live pane) and, on click, enters that worktree's canvas.

import React from 'react'
import { computeFitTransform, type WorktreeProjection } from './overview-worktree-projection'

const HEADER_HEIGHT = 30
const BODY_PADDING = 12

/** Subtle per-kind tint from the design tokens so terminals/editors/browsers are
 *  distinguishable at a glance without inventing new colors. */
const KIND_CLASS: Record<WorktreeProjection['nodeBoxes'][number]['kind'], string> = {
  terminal: 'bg-primary/30',
  editor: 'bg-foreground/25',
  browser: 'bg-accent-foreground/25',
  other: 'bg-muted-foreground/25'
}

export default function OverviewWorktreeTile({
  projection,
  width,
  height,
  onEnter
}: {
  projection: WorktreeProjection
  width: number
  height: number
  onEnter: () => void
}): React.JSX.Element {
  const bodyHeight = height - HEADER_HEIGHT
  const fit = computeFitTransform(projection.bbox, width, bodyHeight, BODY_PADDING)

  return (
    <button
      type="button"
      onClick={onEnter}
      style={{ width, height }}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left shadow-xs transition-colors hover:border-ring focus-visible:border-ring focus-visible:outline-none"
    >
      <div
        className="flex items-center gap-2 border-b bg-muted/40 px-3"
        style={{ height: HEADER_HEIGHT }}
      >
        <span className="truncate text-xs font-medium text-foreground">{projection.label}</span>
        <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {projection.nodeCount}
        </span>
      </div>
      <div className="relative flex-1 bg-background">
        {projection.nodeBoxes.map((box) => (
          <div
            key={box.id}
            className={`absolute rounded-[2px] border border-border/50 ${KIND_CLASS[box.kind]}`}
            style={{
              left: fit.offsetX + box.rect.origin.x * fit.scale,
              top: fit.offsetY + box.rect.origin.y * fit.scale,
              width: Math.max(2, box.rect.size.width * fit.scale),
              height: Math.max(2, box.rect.size.height * fit.scale)
            }}
          />
        ))}
      </div>
    </button>
  )
}
