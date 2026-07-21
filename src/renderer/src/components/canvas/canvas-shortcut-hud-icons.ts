// Maps a CanvasHudId (keybinding action id or pointer-gesture id) to its lucide
// icon, so the on-canvas Shortcuts pane and the Settings shortcut rows can show
// the same glyph that the action-bar buttons use. Returns null when an action
// has no canonical icon (most non-canvas actions) — callers render nothing then.

import {
  Frame,
  Maximize,
  LayoutGrid,
  Columns3,
  Grid2x2,
  StretchHorizontal,
  X,
  ZoomIn,
  Hand,
  FilePlus,
  Maximize2,
  MousePointerClick
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CanvasHudId } from './canvas-shortcut-hud-visibility'

const ACTION_ICONS: Partial<Record<CanvasHudId, LucideIcon>> = {
  'canvas.fitToView': Frame,
  'canvas.autoSize': Maximize,
  'canvas.autoLayout': LayoutGrid,
  'canvas.groupByWorktree': Columns3,
  'canvas.tidySelection': Grid2x2,
  'canvas.stackSelection': StretchHorizontal,
  'canvas.closeNode': X
}

const GESTURE_ICONS: Partial<Record<CanvasHudId, LucideIcon>> = {
  'gesture.zoom': ZoomIn,
  'gesture.pan': Hand,
  'gesture.newFile': FilePlus,
  'gesture.maximize': Maximize2,
  'gesture.spawnMenu': MousePointerClick
}

/** Resolve the icon for a HUD id, or null if none is defined. */
export function canvasHudIcon(id: CanvasHudId): LucideIcon | null {
  return ACTION_ICONS[id] ?? GESTURE_ICONS[id] ?? null
}
