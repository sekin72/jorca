// IPC registration for the global Main surface layout store (docs/main-surface.md
// T-A9). Split from app.ts to keep that file's line budget, and from
// main-surface-store.ts to keep the store pure (no Electron IPC coupling).

import { ipcMain } from 'electron'
import { loadMainSurface, saveMainSurface } from './main-surface-store'
import type { PersistedWorktreeCanvas } from '../../shared/canvas-node'

export function registerMainSurfaceHandlers(): void {
  ipcMain.handle('app:mainSurfaceLoad', () => loadMainSurface())
  ipcMain.handle('app:mainSurfaceSave', (_event, snapshot: PersistedWorktreeCanvas) =>
    saveMainSurface(snapshot)
  )
}
