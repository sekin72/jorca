// Which canvas nodes host a live pane whose PTY/webview must survive panning —
// fed to the surface's cull so those nodes stay mounted even off-screen (culling
// would kill the process/page). See docs/canvas-workspace.md §5.

import type { CanvasNodeState } from '../../../../shared/canvas-node'
import type { Tab } from '../../../../shared/types'

/** Content types whose live state must survive panning — never culled. */
const LIVE_PANE_TYPES: ReadonlySet<Tab['contentType']> = new Set(['terminal', 'browser'])

/** Panel ids of nodes hosting a live (terminal/browser) pane. */
export function liveKeepMountedPanelIds(
  nodes: Record<string, CanvasNodeState>,
  resolveTab: (panelId: string) => Tab | null
): ReadonlySet<string> {
  const ids = new Set<string>()
  for (const node of Object.values(nodes)) {
    const tab = resolveTab(node.panelId)
    if (tab && LIVE_PANE_TYPES.has(tab.contentType)) {
      ids.add(node.panelId)
    }
  }
  return ids
}
