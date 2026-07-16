// Builds Cmd+J palette file/doc results from the worktree's runtime file list,
// reusing Quick Open's ranking so the command palette can also find project files
// (docs/*.md included). Files only surface on a query — the palette is an intent
// surface, not a file dump — so an empty query returns nothing.

import {
  prepareQuickOpenFiles,
  rankQuickOpenFiles,
  type QuickOpenIndexedFile
} from '@/components/quick-open-search'

export type CmdJFileResult = {
  id: string
  /** The path exactly as returned by the runtime file list (relative to the worktree). */
  path: string
  filename: string
  directory: string
}

/** Number of file matches shown — kept small so files don't crowd out the
 *  palette's navigation results. */
export const CMD_J_FILE_LIMIT = 8

/** Split a runtime file path into filename + parent directory for display. */
export function toCmdJFileResult(path: string): CmdJFileResult {
  const normalized = path.replace(/\\/g, '/')
  const slash = normalized.lastIndexOf('/')
  return {
    id: `file:${path}`,
    path,
    filename: slash >= 0 ? normalized.slice(slash + 1) : normalized,
    directory: slash >= 0 ? normalized.slice(0, slash) : ''
  }
}

export function buildCmdJFileResults(
  indexedFiles: readonly QuickOpenIndexedFile[],
  query: string,
  limit = CMD_J_FILE_LIMIT
): CmdJFileResult[] {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }
  return rankQuickOpenFiles(trimmed, indexedFiles, limit).map((r) => toCmdJFileResult(r.path))
}

/** Convenience for callers holding a raw path list rather than the indexed form. */
export function indexCmdJFiles(files: readonly string[]): QuickOpenIndexedFile[] {
  return prepareQuickOpenFiles(files)
}
