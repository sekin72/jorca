// Corner minimap (docs/main-surface.md T-C4): a scaled overview of all nodes with
// a viewport indicator; click or drag inside it to pan the canvas. Collapsible to
// a small handle. Fixed bottom-right corner for now (drag-to-dock + persisted
// corner deferred). Reads live geometry from the canvas store.

import React, { useRef, useState } from 'react'
import { Map as MapIcon, Minus, Plus, X } from 'lucide-react'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import { useStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { computeMinimapLayout, minimapPointToViewportOffset } from './canvas-minimap-geometry'
import { translate } from '@/i18n/i18n'
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip'

type BoundStore = UseBoundStore<StoreApi<CanvasStore>>

const MAP_W = 180
const MAP_H = 120
const MINIMAP_STORAGE_KEY = 'canvas-minimap-open'

function IconButton({
  label,
  onClick,
  className,
  onPointerDown,
  children
}: {
  label: string
  onClick: () => void
  className: string
  onPointerDown?: (e: React.PointerEvent) => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          onPointerDown={onPointerDown}
          className={className}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={4}>{label}</TooltipContent>
    </Tooltip>
  )
}

function usePersistentOpen(key: string, defaultOpen = true): [boolean, (open: boolean) => void] {
  const [open, _setOpen] = useState(() => {
    try {
      return localStorage.getItem(key) !== 'false'
    } catch {
      return defaultOpen
    }
  })
  const setOpen = (value: boolean): void => {
    try {
      localStorage.setItem(key, String(value))
    } catch {
      // ignore storage errors
    }
    _setOpen(value)
  }
  return [open, setOpen]
}

export default function CanvasMinimap({ store }: { store: BoundStore }): React.JSX.Element {
  const [open, setOpen] = usePersistentOpen(MINIMAP_STORAGE_KEY)
  const mapRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const zoom = useStore(store, (s) => s.zoomLevel)
  const zoomBy = (factor: number): void => {
    const { containerSize, zoomLevel } = store.getState()
    const center = { x: containerSize.width / 2, y: containerSize.height / 2 }
    store.getState().zoomAroundPoint(zoomLevel * factor, center)
  }
  const resetZoom = (): void => {
    const { containerSize } = store.getState()
    store.getState().zoomAroundPoint(1, { x: containerSize.width / 2, y: containerSize.height / 2 })
  }

  // Recompute the projection whenever geometry changes. Equality on the derived
  // layout keeps this from re-rendering on unrelated store writes.
  const layout = useStoreWithEqualityFn(
    store,
    (s) =>
      computeMinimapLayout({
        nodes: s.nodes,
        viewportOffset: s.viewportOffset,
        zoomLevel: s.zoomLevel,
        containerSize: s.containerSize,
        minimapSize: { width: MAP_W, height: MAP_H }
      }),
    (a, b) => JSON.stringify(a) === JSON.stringify(b)
  )

  // Zoom controls stay visible whether the minimap is expanded or collapsed.
  const zoomControls = (
    <div className="flex items-center justify-center gap-0.5 px-2 py-1">
      <IconButton
        label="Zoom out"
        onClick={() => zoomBy(1 / 1.2)}
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Minus className="h-3 w-3" />
      </IconButton>
      <IconButton
        label="Reset zoom to 100%"
        onClick={resetZoom}
        className="min-w-[36px] rounded px-1 text-center font-mono text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {Math.round(zoom * 100)}%
      </IconButton>
      <IconButton
        label="Zoom in"
        onClick={() => zoomBy(1.2)}
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
      </IconButton>
    </div>
  )

  const panToEvent = (e: React.PointerEvent | PointerEvent): void => {
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }
    const local = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const s = store.getState()
    s.setViewportOffset(minimapPointToViewportOffset(layout, local, s.zoomLevel, s.containerSize))
  }

  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0) {
      return
    }
    e.stopPropagation()
    draggingRef.current = true
    panToEvent(e)
    const onMove = (ev: PointerEvent): void => {
      if (draggingRef.current) {
        panToEvent(ev)
      }
    }
    const onUp = (): void => {
      draggingRef.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  if (!open) {
    return (
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-lg border bg-card p-1 shadow-xs">
        {zoomControls}
        <IconButton
          label={translate('auto.components.canvas.CanvasMinimap.show', 'Show minimap')}
          onClick={() => setOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <MapIcon className="h-4 w-4" />
        </IconButton>
      </div>
    )
  }

  return (
    <div className="absolute bottom-3 right-3 z-10 overflow-hidden rounded-lg border bg-card shadow-xs">
      <div
        ref={mapRef}
        onPointerDown={onPointerDown}
        style={{ width: MAP_W, height: MAP_H }}
        className="relative cursor-pointer bg-muted/30"
      >
        {layout.nodeRects.map((r) => (
          <div
            key={r.id}
            className={
              r.color ? 'absolute rounded-[1px]' : 'absolute rounded-[1px] bg-muted-foreground/50'
            }
            style={{
              left: r.x,
              top: r.y,
              width: Math.max(r.w, 2),
              height: Math.max(r.h, 2),
              backgroundColor: r.color ?? undefined
            }}
          />
        ))}
        <div
          className="pointer-events-none absolute rounded-[1px] border border-ring bg-ring/10"
          style={{
            left: layout.viewRect.x,
            top: layout.viewRect.y,
            width: Math.max(layout.viewRect.w, 2),
            height: Math.max(layout.viewRect.h, 2)
          }}
        />
        <IconButton
          label={translate('auto.components.canvas.CanvasMinimap.hide', 'Hide minimap')}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
          className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </IconButton>
      </div>

      <div className="border-t border-border">{zoomControls}</div>
    </div>
  )
}
