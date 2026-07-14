import { describe, it, expect } from 'vitest'
import { liveKeepMountedPanelIds } from './canvas-pane-hosting'
import type { CanvasNodeState } from '../../../../shared/canvas-node'
import type { Tab } from '../../../../shared/types'

function node(id: string): CanvasNodeState {
  return {
    id,
    panelId: `tab-${id}`,
    origin: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
    zOrder: 0,
    creationIndex: 0
  }
}

function tab(id: string, contentType: Tab['contentType']): Tab {
  return {
    id,
    entityId: `entity-${id}`,
    groupId: 'g',
    worktreeId: 'wt',
    contentType,
    label: id,
    customLabel: null,
    color: null,
    sortOrder: 0,
    createdAt: 0
  }
}

describe('liveKeepMountedPanelIds', () => {
  it('collects panel ids of terminal/browser nodes, not editors', () => {
    const nodes = { a: node('a'), b: node('b'), c: node('c') }
    const resolve = (panelId: string): Tab | null => {
      if (panelId === 'tab-a') {
        return tab('tab-a', 'terminal')
      }
      if (panelId === 'tab-b') {
        return tab('tab-b', 'browser')
      }
      return tab('tab-c', 'editor')
    }
    const ids = liveKeepMountedPanelIds(nodes, resolve)
    expect(ids.has('tab-a')).toBe(true)
    expect(ids.has('tab-b')).toBe(true)
    expect(ids.has('tab-c')).toBe(false)
  })
})
