// Shortcuts cheat-sheet pane (docs/main-surface.md T-C3), docked bottom-left.
// The keyboard chords are resolved live from Orca's keybindings registry (scope
// 'canvas'), so the list stays in sync when they're rebound in Settings. Pointer
// gestures (zoom/pan/double-click) have no registry entry and stay static.
// Chord rows are clickable — clicking them executes the shortcut action.

import React, { useState } from 'react'
import { Keyboard, Play, X } from 'lucide-react'
import {
  formatKeybinding,
  getEffectiveKeybindingsForAction,
  KEYBINDING_DEFINITIONS,
  type KeybindingActionId
} from '../../../../shared/keybindings'
import { getShortcutPlatform } from '@/lib/shortcut-platform'
import { useAppStore } from '../../store'
import { executeShortcutAction } from '@/lib/shortcut-action-dispatcher'
import { translate } from '@/i18n/i18n'
import { useCanvasHudVisibilityStore } from './canvas-shortcut-hud-store'
import { getCanvasGestureRows, type CanvasHudId } from './canvas-shortcut-hud-visibility'
import { canvasHudIcon } from './canvas-shortcut-hud-icons'
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip'

type Row = { id: CanvasHudId; label: string; keys: string[] }

// Rows are user-curated in Settings → Keyboard Shortcuts: any registry chord the
// user checks appears here (unbound ones stay hidden), plus the chosen gestures.
function useShortcutRows(): Row[] {
  const keybindings = useAppStore((s) => s.keybindings)
  const shownIds = useCanvasHudVisibilityStore((s) => s.shownIds)
  const platform = getShortcutPlatform()

  const chordRows: Row[] = KEYBINDING_DEFINITIONS.filter((def) => shownIds.has(def.id))
    .map((def) => {
      const [binding] = getEffectiveKeybindingsForAction(def.id, platform, keybindings)
      return {
        id: def.id,
        label: def.title,
        keys: binding ? formatKeybinding(binding, platform) : []
      }
    })
    .filter((row) => row.keys.length > 0)

  const gestureRows: Row[] = getCanvasGestureRows()
    .filter((gesture) => shownIds.has(gesture.id))
    .map((gesture) => ({ id: gesture.id, label: gesture.label, keys: gesture.keys }))

  return [...chordRows, ...gestureRows]
}

const KeyChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
    {children}
  </span>
)

function TooltipButton({
  label,
  onClick,
  className,
  children
}: {
  label: string
  onClick: () => void
  className: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} onClick={onClick} className={className}>
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={4}>{label}</TooltipContent>
    </Tooltip>
  )
}

const SHORTCUTS_STORAGE_KEY = 'canvas-shortcuts-open'

function usePersistentOpen(defaultOpen = true): [boolean, (open: boolean) => void] {
  const [open, _setOpen] = useState(() => {
    try {
      return localStorage.getItem(SHORTCUTS_STORAGE_KEY) !== 'false'
    } catch {
      return defaultOpen
    }
  })
  const setOpen = (value: boolean): void => {
    try {
      localStorage.setItem(SHORTCUTS_STORAGE_KEY, String(value))
    } catch {
      // ignore storage errors
    }
    _setOpen(value)
  }
  return [open, setOpen]
}

export default function CanvasShortcutsPane(): React.JSX.Element {
  const [open, setOpen] = usePersistentOpen()
  const rows = useShortcutRows()

  if (!open) {
    return (
      <div className="absolute bottom-3 left-3 z-10 rounded-lg border bg-card p-1 shadow-xs">
        <TooltipButton
          label={translate('auto.components.canvas.CanvasShortcutsPane.show', 'Show shortcuts')}
          onClick={() => setOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Keyboard className="h-4 w-4" />
        </TooltipButton>
      </div>
    )
  }

  return (
    <div className="absolute bottom-3 left-3 z-10 w-56 overflow-hidden rounded-lg border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Keyboard className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold">
            {translate('auto.components.canvas.CanvasShortcutsPane.title', 'Shortcuts')}
          </span>
        </div>
        <TooltipButton
          label={translate('auto.components.canvas.CanvasShortcutsPane.hide', 'Hide shortcuts')}
          onClick={() => setOpen(false)}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </TooltipButton>
      </div>
      <div className="flex flex-col gap-1.5 px-2.5 py-2">
        {rows.map((r) => {
          const Icon = canvasHudIcon(r.id)
          const isGesture = r.id.startsWith('gesture.')

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                if (!isGesture) {
                  executeShortcutAction(r.id as KeybindingActionId)
                }
              }}
              className={
                isGesture
                  ? 'flex w-full items-center justify-between gap-3 text-left'
                  : 'flex w-full items-center justify-between gap-3 rounded-sm text-left transition-colors hover:bg-accent/60 hover:text-accent-foreground cursor-pointer'
              }
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {Icon && <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />}
                <span className="truncate text-[11px] text-muted-foreground">{r.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                {!isGesture && (
                  <Play className="mr-1 size-2.5 shrink-0 text-muted-foreground/40" />
                )}
                {r.keys.map((k) => (
                  <KeyChip key={k}>{k}</KeyChip>
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
