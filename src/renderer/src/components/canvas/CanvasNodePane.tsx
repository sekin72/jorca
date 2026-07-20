// Renders a node's live pane inside the node body.
// Non-terminal content renders inline (scaled with world transform).
// Terminal content is portaled to an overlay layer outside the world transform
// so xterm's mouse hit-testing always runs at layout scale 1.

import React, { Suspense, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from 'zustand'
import { lazyWithRetry as lazy } from '@/lib/lazy-with-retry'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useAppStore } from '../../store'
import { closeCanvasNode } from './canvas-node-disposal'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import type { Tab } from '../../../../shared/types'
import { CANVAS_NODE_HEADER_HEIGHT } from '../../../../shared/canvas-node'
import { useCanvasTerminalOverlayRef } from './CanvasTerminalOverlay'

const EditorPanel = lazy(() => import('../editor/EditorPanel'))
const TerminalPane = lazy(() => import('../terminal-pane/TerminalPane'))
const BrowserPane = lazy(() => import('../browser-pane/BrowserPane'))

type BoundStore = UseBoundStore<StoreApi<CanvasStore>>

function CanvasNodePane({
  store,
  nodeId,
  tab,
  active
}: {
  store: BoundStore
  nodeId: string
  tab: Tab
  active: boolean
}): React.JSX.Element {
  // Dispose the backing tab (kills PTY / closes webview), not just the node —
  // the canvas replaces the tab bar, so a parked process would be unreachable.
  const close = useCallback(() => closeCanvasNode(store, nodeId), [store, nodeId])

  const browserTab = useAppStore((s) =>
    tab.contentType === 'browser'
      ? ((s.browserTabsByWorktree[tab.worktreeId] ?? []).find((b) => b.id === tab.entityId) ?? null)
      : null
  )

  // Terminal overlay: read node geometry + viewport for screen-space positioning
  const overlayRef = useCanvasTerminalOverlayRef()
  const overlayTarget = overlayRef?.current ?? null
  const node = useStore(store, (s) => s.nodes[nodeId])
  const zoomLevel = useStore(store, (s) => s.zoomLevel)
  const viewportOffset = useStore(store, (s) => s.viewportOffset)

  // Screen-space rect for the terminal body (below the header)
  const screenRect = useMemo(() => {
    if (!node) {
      return null
    }
    const left = node.origin.x * zoomLevel + viewportOffset.x
    const top = (node.origin.y + CANVAS_NODE_HEADER_HEIGHT) * zoomLevel + viewportOffset.y
    const width = node.size.width * zoomLevel
    const height = (node.size.height - CANVAS_NODE_HEADER_HEIGHT) * zoomLevel
    return { left, top, width, height }
  }, [node, zoomLevel, viewportOffset])

  const canPortal = overlayTarget && screenRect && screenRect.width > 0 && screenRect.height > 0

  const content = useMemo(() => {
    if (tab.contentType === 'editor') {
      return (
        <Suspense fallback={null}>
          <EditorPanel activeFileId={tab.entityId} activeViewStateId={tab.id} />
        </Suspense>
      )
    }
    if (tab.contentType === 'terminal') {
      const terminal = (
        <Suspense fallback={null}>
          <TerminalPane
            tabId={tab.entityId}
            worktreeId={tab.worktreeId}
            isActive={active}
            isVisible
            isWorktreeActive
            onPtyExit={close}
            onCloseTab={close}
          />
        </Suspense>
      )
      // Portal to the overlay when the element is available; fall back to
      // inline rendering during the mount frame (before overlayRef populates).
      if (canPortal) {
        return (
          <PortalTerminalToOverlay
            target={overlayTarget}
            rect={screenRect!}
            nodeId={nodeId}
            terminal={terminal}
          />
        )
      }
      return terminal
    }
    if (tab.contentType === 'browser' && browserTab) {
      return (
        <Suspense fallback={null}>
          <BrowserPane browserTab={browserTab} isActive={active} />
        </Suspense>
      )
    }
    return null
  }, [
    tab.contentType,
    tab.entityId,
    tab.id,
    tab.worktreeId,
    active,
    browserTab,
    close,
    canPortal,
    overlayTarget,
    screenRect,
    nodeId
  ])

  // Placeholder div for the node body layout — the actual terminal is portaled
  // to the overlay, but the node body needs a DOM child for sizing.
  // Non-terminal content renders directly here.
  return <div className="h-full w-full bg-editor-surface">{content}</div>
}

/** Renders a thin positioned wrapper in the overlay and puts the terminal
 *  inside it at the screen-space rect, with z-index matching the node. */
function PortalTerminalToOverlay({
  target,
  rect,
  nodeId,
  terminal
}: {
  target: HTMLElement
  rect: { left: number; top: number; width: number; height: number }
  nodeId: string
  terminal: React.ReactNode
}): React.ReactNode {
  // To handle z-ordering cleanly (portaled terminals share the containerRef
  // stacking context with worldRef children), we'd read the node's zOrder from
  // the store here.  For the initial implementation the default (auto) is
  // sufficient — overlapping nodes are rare and the terminal body area doesn't
  // overlap with other nodes' chrome.
  return createPortal(
    <div
      data-canvas-overlay-terminal={nodeId}
      className="pointer-events-auto"
      style={{
        position: 'absolute',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        overflow: 'hidden'
      }}
    >
      {terminal}
    </div>,
    target
  )
}

export default React.memo(CanvasNodePane)
