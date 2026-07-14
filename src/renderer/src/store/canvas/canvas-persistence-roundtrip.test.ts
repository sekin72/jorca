// End-to-end durability check for canvas geometry: a live canvas store →
// persisted snapshot → session payload → zod read schema → orphan prune →
// rehydrated store. Guards the whole Step-7 chain so a break anywhere (a dropped
// field, a schema that strips the key, a prune that over-deletes) is caught as a
// single failing invariant. See docs/canvas-workspace.md §7 + Step 9.

import { describe, it, expect } from 'vitest'
import { createCanvasStore } from './canvas-store'
import { toPersistedCanvas } from './canvas-session-sync'
import { pruneCanvasNodesToTabs } from './hydrate-worktree-canvases'
import { buildCanvasByWorktreeForSession } from '../../lib/workspace-session-canvas'
import { parseWorkspaceSession } from '../../../../shared/workspace-session-schema'

function baseSession(canvasByWorktree: Record<string, unknown>): unknown {
  return {
    activeRepoId: null,
    activeWorktreeId: null,
    activeTabId: null,
    tabsByWorktree: {},
    terminalLayoutsByTabId: {},
    canvasByWorktree
  }
}

describe('canvas geometry persistence round-trip', () => {
  it('survives snapshot → session payload → schema parse → hydrate unchanged', () => {
    const source = createCanvasStore()
    source.getState().addNode('tab-a', { x: 120, y: 60 }, { width: 300, height: 220 })
    source.getState().addNode('tab-b', { x: 700, y: 400 }, { width: 260, height: 180 })
    source.getState().zoomAroundPoint(1.4, { x: 100, y: 100 })
    const before = toPersistedCanvas(source.getState())
    expect(before).not.toBeNull()

    // Persist as a session payload and read it back through the durable boundary.
    const payload = buildCanvasByWorktreeForSession({ 'wt-1': before! })
    const parsed = parseWorkspaceSession(baseSession(payload!))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }
    const restored = parsed.value.canvasByWorktree?.['wt-1']
    expect(restored).toBeDefined()

    // Rehydrate a fresh store from the parsed geometry.
    const target = createCanvasStore()
    target
      .getState()
      .loadWorkspaceCanvas(restored!.nodes, restored!.viewportOffset, restored!.zoomLevel)

    const sourceNodes = source.getState().nodes
    const targetNodes = target.getState().nodes
    expect(Object.keys(targetNodes).sort()).toEqual(Object.keys(sourceNodes).sort())
    for (const [id, node] of Object.entries(sourceNodes)) {
      expect(targetNodes[id].origin).toEqual(node.origin)
      expect(targetNodes[id].size).toEqual(node.size)
      expect(targetNodes[id].panelId).toBe(node.panelId)
    }
    expect(target.getState().zoomLevel).toBe(source.getState().zoomLevel)
    expect(target.getState().viewportOffset).toEqual(source.getState().viewportOffset)
  })

  it('drops a node whose backing tab did not survive, keeps the rest', () => {
    const source = createCanvasStore()
    source.getState().addNode('tab-live', { x: 0, y: 0 }, { width: 200, height: 150 })
    source.getState().addNode('tab-gone', { x: 400, y: 0 }, { width: 200, height: 150 })
    const snapshot = toPersistedCanvas(source.getState())!

    // Only tab-live still exists after tab hydration.
    const pruned = pruneCanvasNodesToTabs(snapshot, new Set(['tab-live']))
    const target = createCanvasStore()
    target.getState().loadWorkspaceCanvas(pruned.nodes, pruned.viewportOffset, pruned.zoomLevel)

    const panelIds = Object.values(target.getState().nodes).map((n) => n.panelId)
    expect(panelIds).toEqual(['tab-live'])
  })
})
