// Renders a node's live pane INSIDE the node body (world layer), so chrome and
// content share one stacking context — overlapping nodes z-order correctly.
// Content scales with the world transform (Cate's model). See docs/canvas-workspace.md §5.

import React, { Suspense, useCallback, useMemo } from 'react'
import { lazyWithRetry as lazy } from '@/lib/lazy-with-retry'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useAppStore } from '../../store'
import type { CanvasStore } from '../../store/canvas/canvas-store'
import type { Tab } from '../../../../shared/types'

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
  const close = useCallback(() => store.getState().removeNode(nodeId), [store, nodeId])

  const browserTab = useAppStore((s) =>
    tab.contentType === 'browser'
      ? ((s.browserTabsByWorktree[tab.worktreeId] ?? []).find((b) => b.id === tab.entityId) ?? null)
      : null
  )

  const content = useMemo(() => {
    if (tab.contentType === 'editor') {
      return (
        <Suspense fallback={null}>
          <EditorPanel activeFileId={tab.entityId} activeViewStateId={tab.id} />
        </Suspense>
      )
    }
    if (tab.contentType === 'terminal') {
      return (
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
    }
    if (tab.contentType === 'browser' && browserTab) {
      return (
        <Suspense fallback={null}>
          <BrowserPane browserTab={browserTab} isActive={active} />
        </Suspense>
      )
    }
    return null
  }, [tab.contentType, tab.entityId, tab.id, tab.worktreeId, active, browserTab, close])

  // Content fills the body and scales with the world transform (Cate's model):
  // bitmap-scaled during a zoom gesture, crisp re-raster at rest (see the
  // will-change handling in CanvasSurface). Keeps chrome + content in one
  // stacking context so overlapping nodes z-order correctly.
  return <div className="h-full w-full bg-editor-surface">{content}</div>
}

export default React.memo(CanvasNodePane)
