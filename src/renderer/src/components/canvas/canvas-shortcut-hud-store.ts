import { create } from 'zustand'
import {
  CANVAS_HUD_STORAGE_KEY,
  normalizeCanvasHudShownIds,
  type CanvasHudId
} from './canvas-shortcut-hud-visibility'

function readStoredShownIds(): CanvasHudId[] {
  try {
    const raw = globalThis.localStorage?.getItem(CANVAS_HUD_STORAGE_KEY)
    return normalizeCanvasHudShownIds(raw == null ? undefined : JSON.parse(raw))
  } catch {
    return normalizeCanvasHudShownIds(undefined)
  }
}

function persistShownIds(ids: Iterable<CanvasHudId>): void {
  try {
    globalThis.localStorage?.setItem(CANVAS_HUD_STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // localStorage can be unavailable (private mode, tests); HUD prefs are
    // non-critical, so a failed write just keeps the in-memory value.
  }
}

type CanvasHudVisibilityStore = {
  shownIds: Set<CanvasHudId>
  setShown: (id: CanvasHudId, shown: boolean) => void
}

// Standalone store (not an app-store slice) so the Settings checkbox and the
// on-canvas HUD stay in sync live while sharing one localStorage-backed source.
export const useCanvasHudVisibilityStore = create<CanvasHudVisibilityStore>((set) => ({
  shownIds: new Set(readStoredShownIds()),
  setShown: (id, shown) =>
    set((state) => {
      const next = new Set(state.shownIds)
      if (shown) {
        next.add(id)
      } else {
        next.delete(id)
      }
      persistShownIds(next)
      return { shownIds: next }
    })
}))
