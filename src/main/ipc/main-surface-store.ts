// Persisted global Main surface layout (cross-worktree borrowed windows,
// docs/main-surface.md T-A9). One JSON file in userData holding a single
// snapshot: `{ nodes, viewportOffset, zoomLevel }`. Unlike the per-worktree
// canvas (which rides the workspace-session pipeline), Main is global, so it
// needs its own file. Writes are debounced + race-safe (temp file + rename).

import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { PersistedWorktreeCanvas } from '../../shared/canvas-node'

const DEBOUNCE_MS = 300

let _file: string | null = null
let cache: PersistedWorktreeCanvas | null = null
let writeTimer: ReturnType<typeof setTimeout> | null = null

function filePath(): string {
  if (!_file) {
    _file = join(app.getPath('userData'), 'main-surface.json')
  }
  return _file
}

function flushSync(): void {
  if (!cache) {
    return
  }
  const file = filePath()
  const dir = dirname(file)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  writeFileSync(tmp, JSON.stringify(cache), 'utf-8')
  renameSync(tmp, file)
}

function scheduleSave(): void {
  if (writeTimer) {
    return
  }
  writeTimer = setTimeout(() => {
    writeTimer = null
    flushSync()
  }, DEBOUNCE_MS)
}

/** Read the saved Main layout (null if none / unreadable). */
export function loadMainSurface(): PersistedWorktreeCanvas | null {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), 'utf8')) as PersistedWorktreeCanvas
    return parsed && typeof parsed === 'object' && parsed.nodes ? parsed : null
  } catch {
    return null
  }
}

/** Replace the saved Main layout (debounced write). */
export function saveMainSurface(snapshot: PersistedWorktreeCanvas): void {
  cache = snapshot
  scheduleSave()
}

/** Flush any pending debounced write synchronously (call on app quit). */
export function flushMainSurfaceSync(): void {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
    flushSync()
  }
}
