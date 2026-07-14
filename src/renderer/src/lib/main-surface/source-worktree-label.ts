// Short label for a borrowed window's source (docs/main-surface.md T-B2). Shows
// the PROJECT (repo) name — worktrees often share a branch name like "dev", so the
// project is what distinguishes them. Falls back to the folder basename parsed
// from the worktree id (`${repoId}::${path}`) if the repo isn't found.

import { getRepoIdFromWorktreeId } from '../../../../shared/worktree-id'
import type { Repo } from '../../../../shared/types'

/** Folder basename from a worktree id (`${repoId}::${path}`). */
export function worktreeBasenameFromId(worktreeId: string): string {
  const path = worktreeId.includes('::')
    ? worktreeId.slice(worktreeId.indexOf('::') + 2)
    : worktreeId
  const parts = path.split('/').filter(Boolean)
  return parts.at(-1) ?? worktreeId
}

/** Display label for a borrowed window's source project, from the repo list or
 *  the id fallback. */
export function sourceProjectLabel(repos: readonly Repo[], worktreeId: string): string {
  const repoId = getRepoIdFromWorktreeId(worktreeId)
  const repo = repos.find((r) => r.id === repoId)
  return repo?.displayName ?? worktreeBasenameFromId(worktreeId)
}
