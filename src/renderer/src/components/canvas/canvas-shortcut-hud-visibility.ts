import { KEYBINDING_DEFINITIONS, type KeybindingActionId } from '../../../../shared/keybindings'
import { translate } from '@/i18n/i18n'

export const CANVAS_HUD_STORAGE_KEY = 'orca.canvas.shortcutHud.v1'

// Pointer gestures (mouse/trackpad) have no keybinding-registry entry, so the
// HUD tracks them under these synthetic ids alongside the real action ids.
export type CanvasGestureId =
  | 'gesture.zoom'
  | 'gesture.pan'
  | 'gesture.newFile'
  | 'gesture.maximize'
  | 'gesture.spawnMenu'

export type CanvasHudId = KeybindingActionId | CanvasGestureId

const GESTURE_IDS: readonly CanvasGestureId[] = [
  'gesture.zoom',
  'gesture.pan',
  'gesture.newFile',
  'gesture.maximize',
  'gesture.spawnMenu'
]

const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
const MOD = isMac ? '⌘' : 'Ctrl'

export type CanvasGestureRow = { id: CanvasGestureId; label: string; keys: string[] }

/** Static label/keys for each pointer gesture, shared by the HUD and Settings. */
export function getCanvasGestureRows(): CanvasGestureRow[] {
  return [
    {
      id: 'gesture.zoom',
      label: translate('auto.components.canvas.CanvasShortcutsPane.zoom', 'Zoom'),
      keys: [MOD, translate('auto.components.canvas.CanvasShortcutsPane.scroll', 'Scroll')]
    },
    {
      id: 'gesture.pan',
      label: translate('auto.components.canvas.CanvasShortcutsPane.pan', 'Pan'),
      keys: [translate('auto.components.canvas.CanvasShortcutsPane.twoFinger', 'Two-finger drag')]
    },
    {
      id: 'gesture.newFile',
      label: translate('auto.components.canvas.CanvasShortcutsPane.newFile', 'New file'),
      keys: [translate('auto.components.canvas.CanvasShortcutsPane.dblClick', 'Double-click')]
    },
    {
      id: 'gesture.maximize',
      label: translate('auto.components.canvas.CanvasShortcutsPane.maximize', 'Maximize window'),
      keys: [
        translate('auto.components.canvas.CanvasShortcutsPane.dblHeader', 'Double-click header')
      ]
    },
    {
      id: 'gesture.spawnMenu',
      label: translate('auto.components.canvas.CanvasShortcutsPane.menu', 'Spawn menu'),
      keys: [translate('auto.components.canvas.CanvasShortcutsPane.rightClick', 'Right-click')]
    }
  ]
}

const DEFINITION_IDS = new Set<string>(KEYBINDING_DEFINITIONS.map((definition) => definition.id))
const GESTURE_ID_SET = new Set<string>(GESTURE_IDS)

export function isValidCanvasHudId(id: string): id is CanvasHudId {
  return DEFINITION_IDS.has(id) || GESTURE_ID_SET.has(id)
}

/**
 * Default HUD contents: every canvas-scoped shortcut plus all pointer gestures.
 * New canvas shortcuts join the HUD automatically until the user customizes it.
 */
export function defaultCanvasHudIds(): CanvasHudId[] {
  const canvasChords = KEYBINDING_DEFINITIONS.filter(
    (definition) => definition.scope === 'canvas'
  ).map((definition) => definition.id)
  return [...canvasChords, ...GESTURE_IDS]
}

/**
 * Read a persisted allowlist. Absent/malformed seeds the defaults; an explicit
 * (even empty) array is the user's own choice, kept but pruned of stale ids.
 */
export function normalizeCanvasHudShownIds(value: unknown): CanvasHudId[] {
  if (!Array.isArray(value)) {
    return defaultCanvasHudIds()
  }
  const seen = new Set<CanvasHudId>()
  for (const raw of value) {
    if (typeof raw === 'string' && isValidCanvasHudId(raw)) {
      seen.add(raw)
    }
  }
  return [...seen]
}
