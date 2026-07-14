import { describe, it, expect } from 'vitest'
import { resolveNodeTab } from './canvas-node-tab-lookup'
import type { Tab } from '../../../../shared/types'

function tab(id: string): Tab {
  return {
    id,
    entityId: id,
    groupId: 'g',
    worktreeId: 'wt',
    contentType: 'editor',
    label: id,
    customLabel: null,
    color: null,
    sortOrder: 0,
    createdAt: 0
  }
}

describe('resolveNodeTab', () => {
  const unified = { wt: [tab('a'), tab('b')], other: [tab('c')] }

  it('finds a tab by id across worktrees', () => {
    expect(resolveNodeTab(unified, 'b')?.id).toBe('b')
    expect(resolveNodeTab(unified, 'c')?.id).toBe('c')
  })

  it('returns null for an unknown / placeholder panel id', () => {
    expect(resolveNodeTab(unified, 'panel-xyz')).toBeNull()
  })
})
