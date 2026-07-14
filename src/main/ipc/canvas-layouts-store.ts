// Persisted named canvas layouts (saved-layouts system, docs/canvas-workspace.md
// R1). Stored as a single JSON file in userData: `{ layouts: { [name]: snapshot } }`.
// Read on demand; writes are debounced + race-safe (temp file + rename).

import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { CanvasLayoutSnapshot } from '../../shared/canvas-node'

const DEBOUNCE_MS = 300

type LayoutsFile = { layouts: Record<string, CanvasLayoutSnapshot> }

let _file: string | null = null
let cache: LayoutsFile | null = null
let writeTimer: ReturnType<typeof setTimeout> | null = null

function filePath(): string {
  if (!_file) {
    _file = join(app.getPath('userData'), 'canvas-layouts.json')
  }
  return _file
}

function load(): LayoutsFile {
  if (cache) {
    return cache
  }
  try {
    const raw = readFileSync(filePath(), 'utf8')
    const parsed = JSON.parse(raw) as LayoutsFile
    cache =
      parsed && typeof parsed === 'object' && parsed.layouts
        ? { layouts: parsed.layouts }
        : { layouts: {} }
  } catch {
    cache = { layouts: {} }
  }
  return cache
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

export function listCanvasLayoutNames(): string[] {
  return Object.keys(load().layouts).sort((a, b) => a.localeCompare(b))
}

export function loadCanvasLayout(name: string): CanvasLayoutSnapshot | null {
  return load().layouts[name] ?? null
}

export function saveCanvasLayout(name: string, snapshot: CanvasLayoutSnapshot): string[] {
  const file = load()
  file.layouts[name] = snapshot
  scheduleSave()
  return listCanvasLayoutNames()
}

export function deleteCanvasLayout(name: string): string[] {
  const file = load()
  if (name in file.layouts) {
    delete file.layouts[name]
    scheduleSave()
  }
  return listCanvasLayoutNames()
}

/** Flush any pending debounced write synchronously (call on app quit). */
export function flushCanvasLayoutsSync(): void {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
    flushSync()
  }
}
