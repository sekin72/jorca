// Shortcuts cheat-sheet pane (docs/main-surface.md T-C3), docked bottom-left.
// A curated, platform-aware list of the canvas's keyboard chords and gestures.
// Collapsible to a keyboard-icon handle. Static list (Orca has no canvas keymap
// registry to drive it) — keep in sync with CanvasSurface / CanvasNode bindings.

import React, { useState } from 'react'
import { Keyboard, X } from 'lucide-react'
import { translate } from '@/i18n/i18n'

const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
const MOD = isMac ? '⌘' : 'Ctrl'
const SHIFT = isMac ? '⇧' : 'Shift'
const ALT = isMac ? '⌥' : 'Alt'

type Row = { label: string; keys: string[] }

function shortcutRows(): Row[] {
  return [
    {
      label: translate('auto.components.canvas.CanvasShortcutsPane.fit', 'Fit all to view'),
      keys: [MOD, '0']
    },
    {
      label: translate('auto.components.canvas.CanvasShortcutsPane.autoGrid', 'Auto grid layout'),
      keys: [SHIFT, MOD, 'L']
    },
    {
      label: translate(
        'auto.components.canvas.CanvasShortcutsPane.autoVertical',
        'Group by worktree'
      ),
      keys: [ALT, SHIFT, MOD, 'L']
    },
    {
      label: translate('auto.components.canvas.CanvasShortcutsPane.tidy', 'Tidy selection'),
      keys: [SHIFT, MOD, 'G']
    },
    {
      label: translate('auto.components.canvas.CanvasShortcutsPane.stack', 'Stack selection'),
      keys: [SHIFT, MOD, 'S']
    },
    {
      label: translate('auto.components.canvas.CanvasShortcutsPane.close', 'Close / return window'),
      keys: [MOD, 'W']
    },
    {
      label: translate('auto.components.canvas.CanvasShortcutsPane.zoom', 'Zoom'),
      keys: [MOD, translate('auto.components.canvas.CanvasShortcutsPane.scroll', 'Scroll')]
    },
    {
      label: translate('auto.components.canvas.CanvasShortcutsPane.pan', 'Pan'),
      keys: [translate('auto.components.canvas.CanvasShortcutsPane.twoFinger', 'Two-finger drag')]
    },
    {
      label: translate('auto.components.canvas.CanvasShortcutsPane.newFile', 'New file'),
      keys: [translate('auto.components.canvas.CanvasShortcutsPane.dblClick', 'Double-click')]
    },
    {
      label: translate('auto.components.canvas.CanvasShortcutsPane.maximize', 'Maximize window'),
      keys: [
        translate('auto.components.canvas.CanvasShortcutsPane.dblHeader', 'Double-click header')
      ]
    },
    {
      label: translate('auto.components.canvas.CanvasShortcutsPane.menu', 'Spawn menu'),
      keys: [translate('auto.components.canvas.CanvasShortcutsPane.rightClick', 'Right-click')]
    }
  ]
}

const KeyChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
    {children}
  </span>
)

export default function CanvasShortcutsPane(): React.JSX.Element {
  const [open, setOpen] = useState(true)

  if (!open) {
    return (
      <div className="absolute bottom-3 left-3 z-10 rounded-lg border bg-card p-1 shadow-xs">
        <button
          type="button"
          aria-label={translate(
            'auto.components.canvas.CanvasShortcutsPane.show',
            'Show shortcuts'
          )}
          title={translate('auto.components.canvas.CanvasShortcutsPane.show', 'Show shortcuts')}
          onClick={() => setOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Keyboard className="h-4 w-4" />
        </button>
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
        <button
          type="button"
          aria-label={translate(
            'auto.components.canvas.CanvasShortcutsPane.hide',
            'Hide shortcuts'
          )}
          title={translate('auto.components.canvas.CanvasShortcutsPane.hide', 'Hide shortcuts')}
          onClick={() => setOpen(false)}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-col gap-1.5 px-2.5 py-2">
        {shortcutRows().map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <span className="truncate text-[11px] text-muted-foreground">{r.label}</span>
            <span className="flex shrink-0 items-center gap-0.5">
              {r.keys.map((k) => (
                <KeyChip key={k}>{k}</KeyChip>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
