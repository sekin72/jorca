// A single canvas node: a positioned, draggable, resizable box hosting one panel
// (Phase 1). Chrome only (header + resize handles + focus ring) — the body is
// CanvasNodeContent. Styling uses main.css tokens per docs/STYLEGUIDE.md.

import React, { useEffect } from 'react'
import { CornerUpLeft, Maximize2, Minimize2, Pin, PinOff, SendToBack, X } from 'lucide-react'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import { focusedNodeId } from '../../store/canvas/canvas-selection-model'
import { isMaximized } from '../../../../shared/canvas-node'
import { useCanvasNodeDrag } from './use-canvas-node-drag'
import { useCanvasNodeResize } from './use-canvas-node-resize'
import type { ResizeHandle } from './canvas-interaction-math'
import { useNodeTab } from './canvas-node-tab-lookup'
import { closeOrReturnCanvasNode } from './canvas-node-disposal'
import CanvasNodeContent from './CanvasNodeContent'
import CanvasNodePane from './CanvasNodePane'
import CanvasNodeColorPicker from './CanvasNodeColorPicker'
import { revealOnMain } from '@/lib/main-surface/reveal-on-main'
import { returnFromMain } from '@/lib/main-surface/return-from-main'
import { pullToMain } from '@/lib/main-surface/pull-to-main'
import { getMainCanvasStore } from '../../store/canvas/canvas-store'
import { worktreeTint } from '@/lib/main-surface/worktree-tint'
import { sourceProjectLabel } from '@/lib/main-surface/source-worktree-label'
import { useAppStore } from '../../store'
import { MAIN_SURFACE_ID } from '../../../../shared/canvas-node'
import { ExternalLink } from 'lucide-react'
import { translate } from '@/i18n/i18n'

type BoundStore = UseBoundStore<StoreApi<CanvasStore>>

const HANDLES: { handle: ResizeHandle; className: string; cursor: string }[] = [
  { handle: 'n', className: 'top-0 left-2 right-2 h-2', cursor: 'ns-resize' },
  { handle: 's', className: 'bottom-0 left-2 right-2 h-2', cursor: 'ns-resize' },
  { handle: 'e', className: 'right-0 top-2 bottom-2 w-2', cursor: 'ew-resize' },
  { handle: 'w', className: 'left-0 top-2 bottom-2 w-2', cursor: 'ew-resize' },
  {
    handle: 'ne',
    className: 'top-0 right-0 h-3 w-3',
    cursor: 'nesw-resize'
  },
  {
    handle: 'nw',
    className: 'top-0 left-0 h-3 w-3',
    cursor: 'nwse-resize'
  },
  {
    handle: 'se',
    className: 'bottom-0 right-0 h-3 w-3',
    cursor: 'nwse-resize'
  },
  {
    handle: 'sw',
    className: 'bottom-0 left-0 h-3 w-3',
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
  nodeId,
  surfaceId
}: {
  store: BoundStore
  nodeId: string
  surfaceId?: string
}): React.JSX.Element | null {
  const node = useStore(store, (s) => s.nodes[nodeId])
  const active = useStore(store, (s) => focusedNodeId(s) === nodeId)
  const tab = useNodeTab(node?.panelId ?? '')
  // Source-worktree name for a borrowed Main node's badge (null otherwise). Kept
  // above the early return so the hook order is stable (rules-of-hooks).
  const sourceLabel = useAppStore((s) =>
    node?.sourceWorktreeId ? sourceProjectLabel(s.repos, node.sourceWorktreeId) : null
  )

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

  // Send-to-Main is offered on a real worktree surface for a node that isn't
  // already borrowed and isn't itself a Main node (docs/main-surface.md).
  const canSendToMain =
    surfaceId != null &&
    surfaceId !== MAIN_SURFACE_ID &&
    !node.borrowedByMain &&
    node.sourceWorktreeId == null

  // Borrowed Main nodes carry a per-source tint + worktree-name badge so you can
  // see which worktree a window came from at a glance (docs/main-surface.md T-B2/B3).
  const sourceTint = node.sourceWorktreeId ? worktreeTint(node.sourceWorktreeId) : null
  // User "Color Bloom" pick wins; else the Main source-worktree tint. Drives the
  // header wash and minimap rectangle only — never the selection highlight.
  const accent = node.color ?? sourceTint

  // Null Space window treatment: every node floats on a soft drop shadow. The
  // focused node's glow is ALWAYS the app ring — kept identical for every node
  // and user so the selection highlight never shifts with a node's own color
  // (the picked color tints the header title instead). Unfocused nodes stay
  // quiet with only a faint top-edge highlight.
  const ringColor = 'var(--ring)'
  const FLOAT_SHADOW = '0 10px 30px -12px rgb(0 0 0 / 0.55)'
  const TOP_HIGHLIGHT = 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)'
  const FOCUS_GLOW = `0 0 0 1px ${ringColor}, 0 0 18px -3px color-mix(in srgb, ${ringColor} 55%, transparent)`

  // Unselected nodes: desaturate and darken so the active window stands out.
  const desaturatedFilter = active ? undefined : 'brightness(0.65) saturate(0.7)'

  return (
    <div
      data-canvas-node={nodeId}
      data-active={active ? 'true' : 'false'}
      className="absolute flex flex-col overflow-hidden rounded-xl border bg-card transition-[opacity,transform] duration-150"
      style={{
        left: node.origin.x,
        top: node.origin.y,
        width: node.size.width,
        height: node.size.height,
        zIndex: node.zOrder,
        opacity: exiting ? 0 : 1,
        transform: entering || exiting ? 'scale(0.98)' : 'scale(1)',
        filter: desaturatedFilter,
        borderColor: active ? ringColor : 'var(--border)',
        boxShadow: active
          ? `${FOCUS_GLOW}, ${TOP_HIGHLIGHT}, ${FLOAT_SHADOW}`
          : `${TOP_HIGHLIGHT}, ${FLOAT_SHADOW}`
      }}
      onPointerDown={() => store.getState().focusNode(nodeId)}
    >
      <div
        className="flex h-8 shrink-0 cursor-grab items-center justify-between gap-2 border-b px-2 active:cursor-grabbing"
        style={
          accent ? { backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)` } : undefined
        }
        onPointerDown={startDrag}
        onDoubleClick={() => store.getState().toggleMaximize(nodeId)}
      >
        {sourceTint && (
          <span
            className="flex min-w-0 shrink-0 items-center gap-1"
            title={sourceLabel ?? undefined}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: sourceTint }}
              aria-hidden
            />
            <span
              className="max-w-[120px] truncate text-[11px] font-medium"
              style={{ color: sourceTint }}
            >
              {sourceLabel}
            </span>
          </span>
        )}
        <span
          className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
          style={node.color ? { color: node.color } : undefined}
        >
          {node.panelId}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <CanvasNodeColorPicker store={store} nodeId={nodeId} color={node.color} />
          {canSendToMain && (
            <ControlButton
              label={translate('auto.components.canvas.CanvasNode.sendToMain', 'Send to Main')}
              onClick={() => pullToMain(surfaceId!, nodeId)}
            >
              <SendToBack className="h-3 w-3" />
            </ControlButton>
          )}
          {node.borrowedByMain && (
            <ControlButton
              label={translate(
                'auto.components.canvas.CanvasNode.returnFromMain',
                'Return from main'
              )}
              onClick={() => {
                const mainNodeId = getMainCanvasStore().getState().nodeForPanel(node.panelId)
                if (mainNodeId) {
                  returnFromMain(mainNodeId)
                }
              }}
            >
              <CornerUpLeft className="h-3 w-3" />
            </ControlButton>
          )}
          {node.sourceWorktreeId != null && (
            <ControlButton
              label={translate(
                'auto.components.canvas.CanvasNode.returnToWorktree',
                'Return to worktree'
              )}
              onClick={() => returnFromMain(nodeId)}
            >
              <CornerUpLeft className="h-3 w-3" />
            </ControlButton>
          )}
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
            onClick={() => closeOrReturnCanvasNode(store, nodeId)}
          >
            <X className="h-3 w-3" />
          </ControlButton>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {node.borrowedByMain ? (
          // Single-mount invariant: while borrowed onto Main, the source shows a
          // non-live placeholder — the live pane is mounted only on Main. Click
          // reveals it there.
          <button
            type="button"
            onClick={() => revealOnMain(node.panelId)}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-muted/20 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="text-xs font-medium">
              {translate('auto.components.canvas.CanvasNode.onMain', 'On Main')}
            </span>
            <span className="text-[10px] opacity-70">
              {translate('auto.components.canvas.CanvasNode.onMainHint', 'Click to reveal')}
            </span>
          </button>
        ) : tab ? (
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
            data-handle={handle}
            className={`absolute ${className}`}
            style={{ cursor }}
            onPointerDown={startResize(handle)}
          />
        ))}
    </div>
  )
}

export default React.memo(CanvasNode)
