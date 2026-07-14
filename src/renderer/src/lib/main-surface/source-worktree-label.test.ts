import { describe, it, expect } from 'vitest'
import { worktreeBasenameFromId, sourceProjectLabel } from './source-worktree-label'
import type { Repo } from '../../../../shared/types'

describe('worktreeBasenameFromId', () => {
  it('takes the folder basename from a repoId::path id', () => {
    expect(worktreeBasenameFromId('4bde::/Users/kaan/Workspace/g-fake_island_2')).toBe(
      'g-fake_island_2'
    )
  })
  it('handles trailing slash and bare ids', () => {
    expect(worktreeBasenameFromId('repo::/a/b/')).toBe('b')
    expect(worktreeBasenameFromId('nonsense')).toBe('nonsense')
  })
})

describe('sourceProjectLabel', () => {
  const repo = { id: 'repo-abc', displayName: 'Fake Island' } as Repo

  it('shows the project (repo) displayName, not the worktree/branch', () => {
    expect(sourceProjectLabel([repo], 'repo-abc::/Users/kaan/Workspace/fake-island/dev')).toBe(
      'Fake Island'
    )
  })
  it('falls back to the folder basename when the repo is not found', () => {
    expect(sourceProjectLabel([], 'repo-xyz::/Users/kaan/Workspace/other-project')).toBe(
      'other-project'
    )
  })
})
