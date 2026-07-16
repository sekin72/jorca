// The pan/zoom viewport for one worktree's canvas. Applies the world transform
// (translate(offset) then scale(zoom), origin 0,0 — matching canvasToView),
// mounts only viewport-culled nodes, and handles wheel-zoom (cursor-anchored)
// and background-drag panning.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { useVisibleNodeIds } from '../../store/canvas/canvas-store'
import { ZOOM_MIN, ZOOM_MAX, type Point } from '../../../../shared/canvas-node'
import {
  WORKSPACE_FILE_PATH_MIME,
  WORKSPACE_FILE_PATHS_MIME,
  getWorkspaceFileDragPaths
} from '@/lib/workspace-file-drag'
import { useAppStore } from '../../store'
import { focusedNodeId } from '../../store/canvas/canvas-selection-model'
import CanvasNode from './CanvasNode'
import CanvasGrid from './CanvasGrid'
import CanvasSnapGuides from './CanvasSnapGuides'
import CanvasGhostPlacement from './CanvasGhostPlacement'
import { CanvasContextMenu } from './CanvasContextMenu'
import CanvasZoomReadout from './CanvasZoomReadout'
import CanvasMinimap from './CanvasMinimap'
import CanvasShortcutsPane from './CanvasShortcutsPane'
import EmptyCanvasOverlay from './EmptyCanvasOverlay'
import { openAbsoluteFileAsCanvasNode } from './canvas-node-creation'
import { liveKeepMountedPanelIds } from './canvas-pane-hosting'
import { resolveNodeTab } from './canvas-node-tab-lookup'
import { useAutoFocusLargestVisible } from './use-auto-focus-largest-visible'
import { useCanvasShortcuts } from './use-canvas-shortcuts'
import { isMouseWheel } from './wheel-intent'

type BoundStore = UseBoundStore<StoreApi<CanvasStore>>

export default function CanvasSurface({
  store,
  surfaceId
}: {
  store: BoundStore
  /** The worktree id this surface belongs to, or MAIN_SURFACE_ID for Main. Lets a
   *  node know its home worktree so it can borrow itself onto Main. */
  surfaceId?: string
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const willChangeReset = useRef(0)
  const panStart = useRef<{ clientX: number; clientY: number; ox: number; oy: number } | null>(null)
  // Eased-zoom state (ported from Cate): the wheel sets an accumulating target
  // and a rAF loop lerps zoomLevel toward it, keeping the cursor point fixed.
  const zoomTarget = useRef<number | null>(null)
  const zoomRaf = useRef(0)
  const cursorView = useRef({ x: 0, y: 0 })
  const pendingPan = useRef({ x: 0, y: 0 })
  const panRaf = useRef(0)

  const [isFileDragOver, setIsFileDragOver] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    screen: { x: number; y: number }
    canvas: Point
  } | null>(null)

  const nodes = useStore(store, (s) => s.nodes)
  const nodeCount = Object.keys(nodes).length
  const unifiedTabsByWorktree = useAppStore((s) => s.unifiedTabsByWorktree)
  const gridStyle = useAppStore((s) => s.settings?.canvasGridStyle ?? 'dots')
  const autoFocusVisible = useAppStore((s) => s.settings?.canvasAutoFocusVisible ?? false)
  useAutoFocusLargestVisible(store, autoFocusVisible)

  // Terminal/browser nodes must stay mounted off-screen so their PTY/webview
  // survives panning; editors may cull.
  const keepMounted = useMemo(
    () => liveKeepMountedPanelIds(nodes, (pid) => resolveNodeTab(unifiedTabsByWorktree, pid)),
    [nodes, unifiedTabsByWorktree]
  )
  const visibleIds = useVisibleNodeIds(store, keepMounted)

  // Measure the container so the cull selector knows the viewport rect.
  useEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      store.getState().setContainerSize({ width: r.width, height: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [store])

  // Apply the world transform IMPERATIVELY on zoom/offset changes (Cate's
  // applyTransform), so this component and the nodes never re-render during
  // pan/zoom — only the world div's style moves. `--zoom` is published for any
  // zoom-aware CSS; will-change promotes a GPU layer during the gesture and is
  // released 150ms after it settles so thin strokes re-raster crisply.
  useEffect(() => {
    const world = worldRef.current
    if (!world) {
      return
    }
    const apply = (zoomLevel: number, viewportOffset: { x: number; y: number }): void => {
      world.style.transform = `scale(${zoomLevel}) translate(${viewportOffset.x / zoomLevel}px, ${viewportOffset.y / zoomLevel}px)`
      world.style.setProperty('--zoom', String(zoomLevel))
      world.style.willChange = 'transform'
      if (willChangeReset.current) {
        clearTimeout(willChangeReset.current)
      }
      willChangeReset.current = window.setTimeout(() => {
        if (worldRef.current) {
          worldRef.current.style.willChange = 'auto'
        }
        willChangeReset.current = 0
      }, 150)
    }
    const initial = store.getState()
    apply(initial.zoomLevel, initial.viewportOffset)
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.zoomLevel !== prev.zoomLevel || state.viewportOffset !== prev.viewportOffset) {
        apply(state.zoomLevel, state.viewportOffset)
      }
    })
    return () => {
      unsubscribe()
      if (willChangeReset.current) {
        clearTimeout(willChangeReset.current)
      }
    }
  }, [store])

  useCanvasShortcuts(store)

  // Native non-passive wheel listener so preventDefault actually suppresses the
  // page/native zoom (React's synthetic onWheel is passive on the root).
  useEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }
    // Lerp zoom toward the target each frame, re-anchoring the offset so the
    // cursor point stays put (Cate's smoothZoomTick).
    const tick = (): void => {
      const target = zoomTarget.current
      if (target === null) {
        zoomRaf.current = 0
        return
      }
      const s = store.getState()
      const current = s.zoomLevel
      const cvp = cursorView.current
      const diff = target - current
      const next = Math.abs(diff) < 0.001 ? target : current + diff * 0.15
      const cp = s.viewToCanvas(cvp)
      s.setZoomAndOffset(next, { x: cvp.x - cp.x * next, y: cvp.y - cp.y * next })
      if (Math.abs(diff) < 0.001) {
        zoomTarget.current = null
        zoomRaf.current = 0
        return
      }
      zoomRaf.current = requestAnimationFrame(tick)
    }

    // Zoom anchored at the cursor (Cate's applyWheelZoom). `mouse` selects the
    // curve: a discrete notch is proportional; a continuous gesture (pinch /
    // Cmd+trackpad) is delta-proportional.
    const applyWheelZoom = (e: WheelEvent, mouse: boolean): void => {
      e.preventDefault()
      e.stopPropagation()
      const rect = el.getBoundingClientRect()
      cursorView.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const base = zoomTarget.current ?? store.getState().zoomLevel
      const next = mouse ? base * (1 + Math.sign(-e.deltaY) * 0.15) : base + -e.deltaY * 0.01
      zoomTarget.current = Math.min(Math.max(next, ZOOM_MIN), ZOOM_MAX)
      if (!zoomRaf.current) {
        zoomRaf.current = requestAnimationFrame(tick)
      }
    }

    const onWheel = (e: WheelEvent): void => {
      const mouse = isMouseWheel(e as unknown as WheelEvent & { wheelDeltaY?: number })

      // Explicit zoom intent — trackpad pinch (ctrlKey) or Cmd/Ctrl+scroll —
      // zooms regardless of what's under the cursor.
      if (e.metaKey || e.ctrlKey) {
        applyWheelZoom(e, mouse)
        return
      }

      // Plain scroll over the FOCUSED pane scrolls that pane's own content
      // (editor code / terminal scrollback), not the canvas.
      const nodeEl = (e.target as HTMLElement).closest?.('[data-canvas-node]')
      const nodeId = nodeEl?.getAttribute('data-canvas-node')
      if (nodeId && nodeId === focusedNodeId(store.getState())) {
        return
      }

      // Physical mouse wheel over empty canvas / unfocused pane → zoom (Miro).
      if (mouse) {
        applyWheelZoom(e, mouse)
        return
      }

      // Trackpad two-finger scroll → pan (rAF-batched so it stays smooth).
      e.preventDefault()
      e.stopPropagation()
      pendingPan.current.x += e.deltaX
      pendingPan.current.y += e.deltaY
      if (!panRaf.current) {
        panRaf.current = requestAnimationFrame(() => {
          panRaf.current = 0
          const s = store.getState()
          s.setViewportOffset({
            x: s.viewportOffset.x - pendingPan.current.x,
            y: s.viewportOffset.y - pendingPan.current.y
          })
          pendingPan.current.x = 0
          pendingPan.current.y = 0
        })
      }
    }
    el.addEventListener('wheel', onWheel, { capture: true, passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel, { capture: true })
      if (zoomRaf.current) {
        cancelAnimationFrame(zoomRaf.current)
      }
      if (panRaf.current) {
        cancelAnimationFrame(panRaf.current)
      }
    }
  }, [store])

  const onBackgroundPointerDown = (e: React.PointerEvent): void => {
    // Nodes handle their own drags; only pan when the press starts on empty
    // canvas (or with the middle button anywhere). Also ignore the context
    // menu and its backdrop so their clicks aren't stolen by setPointerCapture.
    const onNode = (e.target as HTMLElement).closest('[data-canvas-node]')
    if (onNode && e.button !== 1) {
      return
    }
    if ((e.target as HTMLElement).closest('[role="menu"], [data-canvas-menu-backdrop]')) {
      return
    }
    // Floating overlay controls (toolbar, zoom bar, shortcuts pane, placement
    // ghosts) own their own clicks — a press there must not start a pan, or the
    // setPointerCapture below steals the control's click.
    if ((e.target as HTMLElement).closest('button, a, [role="button"], [data-canvas-overlay]')) {
      return
    }
    if (e.button !== 0 && e.button !== 1) {
      return
    }
    if (!onNode) {
      store.getState().clearSelection()
    }
    const o = store.getState().viewportOffset
    panStart.current = { clientX: e.clientX, clientY: e.clientY, ox: o.x, oy: o.y }
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    const onMove = (ev: PointerEvent): void => {
      const s = panStart.current
      if (!s) {
        return
      }
      store.getState().setViewportOffset({
        x: s.ox + (ev.clientX - s.clientX),
        y: s.oy + (ev.clientY - s.clientY)
      })
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

  const hasFileDrag = (dt: DataTransfer): boolean =>
    dt.types.includes(WORKSPACE_FILE_PATH_MIME) || dt.types.includes(WORKSPACE_FILE_PATHS_MIME)

  const onSurfaceContextMenu = (e: React.MouseEvent): void => {
    // Nodes keep their own context behavior — only the empty canvas opens the
    // spawn menu.
    if ((e.target as HTMLElement).closest('[data-canvas-node]')) {
      return
    }
    e.preventDefault()
    const el = containerRef.current
    if (!el) {
      return
    }
    const rect = el.getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    setContextMenu({
      screen: { x: localX, y: localY },
      canvas: store.getState().viewToCanvas({ x: localX, y: localY })
    })
  }

  const onFileDragOver = (e: React.DragEvent): void => {
    if (!hasFileDrag(e.dataTransfer)) {
      return
    }
    // The file-explorer drag carries the internal MIME, so the preload lets it
    // reach React (see src/preload/index.ts drop handler).
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!isFileDragOver) {
      setIsFileDragOver(true)
    }
  }

  const onFileDrop = (e: React.DragEvent): void => {
    const paths = getWorkspaceFileDragPaths(e.dataTransfer)
    setIsFileDragOver(false)
    if (paths.length === 0) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    const el = containerRef.current
    if (!el) {
      return
    }
    const rect = el.getBoundingClientRect()
    const canvasPoint = store
      .getState()
      .viewToCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    // Same drop point for all — the store cascades so multiple files don't stack.
    for (const path of paths) {
      openAbsoluteFileAsCanvasNode(path, canvasPoint)
    }
  }

  return (
    <div
      ref={containerRef}
      data-canvas-surface
      className="relative h-full w-full touch-none overflow-hidden bg-background"
      onPointerDown={onBackgroundPointerDown}
      onContextMenu={onSurfaceContextMenu}
      onDragOver={onFileDragOver}
      onDragLeave={() => setIsFileDragOver(false)}
      onDrop={onFileDrop}
    >
      <CanvasGrid store={store} style={gridStyle} />
      {nodeCount === 0 ? <EmptyCanvasOverlay /> : null}
      {/* transform is applied imperatively (see the world-transform effect) so
          pan/zoom never re-renders React. */}
      <div ref={worldRef} className="absolute left-0 top-0 origin-top-left">
        {visibleIds.map((id) => (
          <CanvasNode key={id} store={store} nodeId={id} surfaceId={surfaceId} />
        ))}
        <CanvasSnapGuides store={store} />
        <CanvasGhostPlacement store={store} />
      </div>
      {isFileDragOver ? (
        <div className="pointer-events-none absolute inset-0 z-20 ring-2 ring-inset ring-ring/60" />
      ) : null}
      <CanvasZoomReadout store={store} />
      <CanvasMinimap store={store} />
      <CanvasShortcutsPane />
      {contextMenu ? (
        <CanvasContextMenu
          screenPoint={contextMenu.screen}
          canvasPoint={contextMenu.canvas}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  )
}
