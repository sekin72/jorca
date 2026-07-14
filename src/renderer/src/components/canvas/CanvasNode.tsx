// A single canvas node: a positioned, draggable, resizable box hosting one panel
// (Phase 1). Chrome only (header + resize handles + focus ring) — the body is
// CanvasNodeContent. Styling uses main.css tokens per docs/STYLEGUIDE.md.

import React, { useEffect } from 'react'
import { Maximize2, Minimize2, Pin, PinOff, X } from 'lucide-react'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { focusedNodeId, isSelected } from '../../store/canvas/canvas-selection-model'
import { isMaximized } from '../../../../shared/canvas-node'
import { useCanvasNodeDrag } from './use-canvas-node-drag'
import { useCanvasNodeResize } from './use-canvas-node-resize'
import type { ResizeHandle } from './canvas-interaction-math'
import { useNodeTab } from './canvas-node-tab-lookup'
import CanvasNodeContent from './CanvasNodeContent'
import CanvasNodePane from './CanvasNodePane'
import { translate } from '@/i18n/i18n'

type BoundStore = UseBoundStore<StoreApi<CanvasStore>>

const HANDLES: { handle: ResizeHandle; className: string; cursor: string }[] = [
  { handle: 'n', className: 'top-0 left-2 right-2 h-1.5 -translate-y-1/2', cursor: 'ns-resize' },
  { handle: 's', className: 'bottom-0 left-2 right-2 h-1.5 translate-y-1/2', cursor: 'ns-resize' },
  { handle: 'e', className: 'right-0 top-2 bottom-2 w-1.5 translate-x-1/2', cursor: 'ew-resize' },
  { handle: 'w', className: 'left-0 top-2 bottom-2 w-1.5 -translate-x-1/2', cursor: 'ew-resize' },
  {
    handle: 'ne',
    className: 'top-0 right-0 h-3 w-3 -translate-y-1/2 translate-x-1/2',
    cursor: 'nesw-resize'
  },
  {
    handle: 'nw',
    className: 'top-0 left-0 h-3 w-3 -translate-y-1/2 -translate-x-1/2',
    cursor: 'nwse-resize'
  },
  {
    handle: 'se',
    className: 'bottom-0 right-0 h-3 w-3 translate-y-1/2 translate-x-1/2',
    cursor: 'nwse-resize'
  },
  {
    handle: 'sw',
    className: 'bottom-0 left-0 h-3 w-3 translate-y-1/2 -translate-x-1/2',
    cursor: 'nesw-resize'
  }
]

function ControlButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      data-canvas-node-control
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}

function CanvasNode({
  store,
  nodeId
}: {
  store: BoundStore
  nodeId: string
}): React.JSX.Element | null {
  const node = useStore(store, (s) => s.nodes[nodeId])
  const active = useStore(store, (s) => focusedNodeId(s) === nodeId)
  const selected = useStore(store, (s) => isSelected(s, nodeId))
  const tab = useNodeTab(node?.panelId ?? '')

  const startDrag = useCanvasNodeDrag(store, nodeId)
  const startResize = useCanvasNodeResize(store, nodeId)

  const anim = node?.animationState
  useEffect(() => {
    if (anim === 'entering') {
      const raf = requestAnimationFrame(() =>
        store.getState().setNodeAnimationState(nodeId, 'idle')
      )
      return () => cancelAnimationFrame(raf)
    }
    if (anim === 'exiting') {
      const t = setTimeout(() => store.getState().finalizeRemoveNode(nodeId), 140)
      return () => clearTimeout(t)
    }
    return undefined
  }, [anim, nodeId, store])

  if (!node) {
    return null
  }

  const maxed = isMaximized(node)
  const exiting = anim === 'exiting'
  const entering = anim === 'entering'

  return (
    <div
      data-canvas-node={nodeId}
      className="absolute flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-[opacity,transform] duration-150"
      style={{
        left: node.origin.x,
        top: node.origin.y,
        width: node.size.width,
        height: node.size.height,
        zIndex: node.zOrder,
        opacity: exiting ? 0 : 1,
        transform: entering || exiting ? 'scale(0.98)' : 'scale(1)',
        borderColor: active ? 'var(--ring)' : selected ? 'var(--border)' : 'var(--border)',
        boxShadow: active ? '0 0 0 1px var(--ring)' : undefined
      }}
      onPointerDown={() => store.getState().focusNode(nodeId)}
    >
      <div
        className="flex h-8 shrink-0 cursor-grab items-center justify-between gap-2 border-b bg-muted/40 px-2 active:cursor-grabbing"
        onPointerDown={startDrag}
        onDoubleClick={() => store.getState().toggleMaximize(nodeId)}
      >
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {node.panelId}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <ControlButton
            label={
              node.isPinned
                ? translate('auto.components.canvas.CanvasNode.unpin', 'Unpin')
                : translate('auto.components.canvas.CanvasNode.pin', 'Pin')
            }
            onClick={() => store.getState().togglePin(nodeId)}
          >
            {node.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </ControlButton>
          <ControlButton
            label={
              maxed
                ? translate('auto.components.canvas.CanvasNode.restore', 'Restore')
                : translate('auto.components.canvas.CanvasNode.maximize', 'Maximize')
            }
            onClick={() => store.getState().toggleMaximize(nodeId)}
          >
            {maxed ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </ControlButton>
          <ControlButton
            label={translate('auto.components.canvas.CanvasNode.close', 'Close')}
            onClick={() => store.getState().removeNode(nodeId)}
          >
            <X className="h-3 w-3" />
          </ControlButton>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {tab ? (
          <CanvasNodePane store={store} nodeId={nodeId} tab={tab} active={active} />
        ) : (
          <CanvasNodeContent panelId={node.panelId} />
        )}
      </div>

      {!maxed &&
        HANDLES.map(({ handle, className, cursor }) => (
          <div
            key={handle}
            data-canvas-node-control
            className={`absolute ${className}`}
            style={{ cursor }}
            onPointerDown={startResize(handle)}
          />
        ))}
    </div>
  )
}

export default React.memo(CanvasNode)
