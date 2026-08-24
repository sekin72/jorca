// Positioned context menu for the canvas — opens at a screen point and offers
// one-click spawn of agent terminals (Claude/opencode/Antigravity) or a plain
// terminal, each dropped as a canvas node at the right-click's canvas point.
// Radix's ContextMenu is trigger-anchored and can't open at an arbitrary point
// or conditionally suppress on node targets, so this is a minimal state-driven
// menu reusing the ui context-menu primitive's surface styling. See
// docs/canvas-workspace.md (canvas right-click context menu).
//
// Rendered INSIDE the canvas surface (not a portal) so pointer events stay
// within the surface's DOM subtree — a createPortal to document.body was
// swallowing click events in Electron.

import React, { useEffect } from 'react'
import type { Point } from '../../../../shared/canvas-node'
import type { TuiAgent } from '../../../../shared/types'
import { createAgentCanvasNode, createBrowserCanvasNode, createTerminalCanvasNode } from './canvas-node-creation'
import { translate } from '@/i18n/i18n'

const SURFACE_CLASS =
  'z-[70] min-w-[11rem] rounded-[11px] border border-black/14 bg-[rgba(255,255,255,0.10)] p-1 text-popover-foreground shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl dark:border-white/14 dark:bg-[rgba(0,0,0,0.12)] dark:shadow-[0_20px_44px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)]'
const ITEM_CLASS =
  'relative flex w-full cursor-default items-center gap-2 rounded-[7px] px-2 py-1 text-left text-[12px] leading-5 font-[450] outline-hidden select-none hover:bg-black/8 dark:hover:bg-white/14 hover:text-accent-foreground'

type MenuItem = { kind: 'item'; label: string; onSelect: () => void } | { kind: 'separator' }

export function CanvasContextMenu({
  screenPoint,
  canvasPoint,
  onClose
}: {
  screenPoint: { x: number; y: number }
  canvasPoint: Point
  onClose: () => void
}): React.JSX.Element | null {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const launch = (agent: TuiAgent): void => {
    createAgentCanvasNode(agent, canvasPoint)
    onClose()
  }
  const newTerminal = (): void => {
    void createTerminalCanvasNode(canvasPoint)
    onClose()
  }
  const newBrowser = (): void => {
    void createBrowserCanvasNode(canvasPoint)
    onClose()
  }

  const items: MenuItem[] = [
    { kind: 'item', label: 'Claude Code', onSelect: () => launch('claude') },
    { kind: 'item', label: 'opencode', onSelect: () => launch('opencode') },
    { kind: 'item', label: 'Antigravity', onSelect: () => launch('antigravity') },
    { kind: 'separator' },
    {
      kind: 'item',
      label: translate('auto.components.canvas.CanvasToolbar.newTerminal', 'New terminal'),
      onSelect: newTerminal
    },
    {
      kind: 'item',
      label: translate('auto.components.canvas.CanvasToolbar.newBrowser', 'New browser'),
      onSelect: newBrowser
    }
  ]

  // Clamp so the menu never overflows the viewport.
  const left = Math.min(screenPoint.x, window.innerWidth - 180)
  const top = Math.min(screenPoint.y, window.innerHeight - 200)

  return (
    <>
      {/* Transparent backdrop: catches click-away without interfering with
          menu item clicks (the menu sits above it at z-70). */}
      <div
        data-canvas-menu-backdrop
        className="absolute inset-0 z-[69]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <div
        role="menu"
        className={`absolute ${SURFACE_CLASS}`}
        style={{ left, top }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((item, i) =>
          item.kind === 'separator' ? (
            <div key={i} className="my-1 h-px bg-border/70" />
          ) : (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={ITEM_CLASS}
              onClick={item.onSelect}
            >
              {item.label}
            </button>
          )
        )}
      </div>
    </>
  )
}
