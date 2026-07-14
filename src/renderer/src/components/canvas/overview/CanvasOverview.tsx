// The Overview meta-canvas: a pan/zoom surface that lays out every worktree's
// canvas as a read-only tile (docs/canvas-workspace.md Phase 2). Viewport is
// local, imperative state (no re-render on pan/zoom); clicking a tile enters that
// worktree's canvas.

import React, { useEffect, useMemo, useRef } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../../store'
import { translate } from '@/i18n/i18n'
import { isMouseWheel } from '../wheel-intent'
import { useWorktreeProjections } from './use-worktree-projections'
import {
  DEFAULT_OVERVIEW_TILE_LAYOUT,
  layoutOverviewTiles,
  pickOverviewColumns
} from './overview-tile-layout'
import OverviewWorktreeTile from './OverviewWorktreeTile'

const OVERVIEW_ZOOM_MIN = 0.15
const OVERVIEW_ZOOM_MAX = 2

export default function CanvasOverview(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const viewport = useRef({ x: 40, y: 40, zoom: 1 })
  const panStart = useRef<{ clientX: number; clientY: number; ox: number; oy: number } | null>(null)
  const setActiveWorktree = useAppStore((s) => s.setActiveWorktree)
  const setCanvasOverviewActive = useAppStore((s) => s.setCanvasOverviewActive)

  const projections = useWorktreeProjections()
  const layout = useMemo(() => {
    const columns = pickOverviewColumns(projections.length, DEFAULT_OVERVIEW_TILE_LAYOUT.columns)
    return layoutOverviewTiles(
      projections.map((p) => p.worktreeId),
      { ...DEFAULT_OVERVIEW_TILE_LAYOUT, columns }
    )
  }, [projections])

  const applyTransform = (): void => {
    const world = worldRef.current
    if (!world) {
      return
    }
    const { x, y, zoom } = viewport.current
    world.style.transform = `scale(${zoom}) translate(${x / zoom}px, ${y / zoom}px)`
  }
  useEffect(applyTransform)

  // Mouse wheel → cursor-anchored zoom; trackpad two-finger → pan (mirrors the
  // worktree canvas intent split, without the eased tween).
  useEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }
    const onWheel = (e: WheelEvent): void => {
      const rect = el.getBoundingClientRect()
      const mouse = isMouseWheel(e as WheelEvent & { wheelDeltaY?: number })
      if (mouse || e.metaKey || e.ctrlKey) {
        e.preventDefault()
        const vx = e.clientX - rect.left
        const vy = e.clientY - rect.top
        const vp = viewport.current
        const factor = mouse ? 1 + Math.sign(-e.deltaY) * 0.15 : 1 + -e.deltaY * 0.01
        const zoom = Math.min(OVERVIEW_ZOOM_MAX, Math.max(OVERVIEW_ZOOM_MIN, vp.zoom * factor))
        // Keep the point under the cursor fixed.
        const wx = (vx - vp.x) / vp.zoom
        const wy = (vy - vp.y) / vp.zoom
        viewport.current = { x: vx - wx * zoom, y: vy - wy * zoom, zoom }
      } else {
        e.preventDefault()
        viewport.current = {
          ...viewport.current,
          x: viewport.current.x - e.deltaX,
          y: viewport.current.y - e.deltaY
        }
      }
      applyTransform()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0 && e.button !== 1) {
      return
    }
    // Let tile clicks through; only pan from empty space.
    if ((e.target as HTMLElement).closest('[data-overview-tile]')) {
      return
    }
    const vp = viewport.current
    panStart.current = { clientX: e.clientX, clientY: e.clientY, ox: vp.x, oy: vp.y }
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const onMove = (ev: PointerEvent): void => {
      const s = panStart.current
      if (!s) {
        return
      }
      viewport.current = {
        ...viewport.current,
        x: s.ox + (ev.clientX - s.clientX),
        y: s.oy + (ev.clientY - s.clientY)
      }
      applyTransform()
    }
    const onUp = (ev: PointerEvent): void => {
      panStart.current = null
      el.releasePointerCapture(ev.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  const enterWorktree = (worktreeId: string): void => {
    setActiveWorktree(worktreeId)
    setCanvasOverviewActive(false)
  }

  return (
    <div
      ref={containerRef}
      data-canvas-overview
      className="relative h-full w-full touch-none overflow-hidden bg-background"
      onPointerDown={onPointerDown}
    >
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 shadow-xs">
        <span className="text-xs font-medium text-foreground">
          {translate('auto.components.canvas.overview.title', 'Overview')}
        </span>
        <button
          type="button"
          aria-label={translate('auto.components.canvas.overview.exit', 'Exit overview')}
          title={translate('auto.components.canvas.overview.exit', 'Exit overview')}
          onClick={() => setCanvasOverviewActive(false)}
          className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {projections.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {translate(
              'auto.components.canvas.overview.empty',
              'No worktree canvases yet. Add nodes to a canvas to see it here.'
            )}
          </p>
        </div>
      ) : (
        <div ref={worldRef} className="absolute left-0 top-0 origin-top-left">
          {layout.map((placement, i) => {
            const projection = projections[i]
            return (
              <div
                key={placement.worktreeId}
                data-overview-tile={placement.worktreeId}
                className="absolute"
                style={{ left: placement.rect.origin.x, top: placement.rect.origin.y }}
              >
                <OverviewWorktreeTile
                  projection={projection}
                  width={placement.rect.size.width}
                  height={placement.rect.size.height}
                  onEnter={() => enterWorktree(placement.worktreeId)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
