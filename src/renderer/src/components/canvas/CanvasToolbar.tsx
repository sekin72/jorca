// Small always-visible canvas toolbar: open an existing file (native dialog,
// repo-size independent) or create a new untitled editor node. Double-click on
// empty canvas also creates a new file — this is the discoverable equivalent.

import React from 'react'
import {
  FolderOpen,
  FilePlus,
  SquareTerminal,
  Globe,
  LayoutGrid,
  LayoutPanelTop,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import {
  openFileDialogAsCanvasNode,
  createUntitledEditorCanvasNode,
  createTerminalCanvasNode,
  createBrowserCanvasNode
} from './canvas-node-creation'
import { saveCanvasLayout } from '@/lib/canvas-layouts'
import { useAppStore } from '../../store'
import { translate } from '@/i18n/i18n'

function ToolbarButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}

export default function CanvasToolbar(): React.JSX.Element {
  const setCanvasOverviewActive = useAppStore((s) => s.setCanvasOverviewActive)
  const setCanvasLayoutsDialogOpen = useAppStore((s) => s.setCanvasLayoutsDialogOpen)
  const bumpCanvasLayoutsVersion = useAppStore((s) => s.bumpCanvasLayoutsVersion)
  const open = useAppStore((s) => s.canvasToolbarOpen)
  const setOpen = useAppStore((s) => s.setCanvasToolbarOpen)

  if (!open) {
    return (
      <div className="absolute left-2 top-2 z-10 rounded-lg border bg-card p-1 shadow-xs">
        <ToolbarButton
          label={translate('auto.components.canvas.CanvasToolbar.expand', 'Show toolbar')}
          onClick={() => setOpen(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </ToolbarButton>
      </div>
    )
  }

  return (
    <div className="absolute left-2 top-2 z-10 flex items-center gap-0.5 rounded-lg border bg-card p-1 shadow-xs">
      <ToolbarButton
        label={translate('auto.components.canvas.CanvasToolbar.overview', 'Overview')}
        onClick={() => setCanvasOverviewActive(true)}
      >
        <LayoutGrid className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label={translate('auto.components.canvas.CanvasToolbar.layouts', 'Saved layouts')}
        onClick={() => setCanvasLayoutsDialogOpen(true)}
      >
        <LayoutPanelTop className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label={translate('auto.components.canvas.CanvasToolbar.saveLayout', 'Save current layout')}
        onClick={() => {
          const name = window.prompt(
            translate(
              'auto.components.canvas.CanvasToolbar.saveLayoutPrompt',
              'Save current canvas layout as…'
            )
          )
          if (name?.trim()) {
            void saveCanvasLayout(name.trim()).then(() => bumpCanvasLayoutsVersion())
          }
        }}
      >
        <span className="text-[10px] font-medium">S</span>
      </ToolbarButton>
      <ToolbarButton
        label={translate('auto.components.canvas.CanvasToolbar.openFile', 'Open file…')}
        onClick={() => void openFileDialogAsCanvasNode()}
      >
        <FolderOpen className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label={translate('auto.components.canvas.CanvasToolbar.newFile', 'New file')}
        onClick={() => void createUntitledEditorCanvasNode()}
      >
        <FilePlus className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label={translate('auto.components.canvas.CanvasToolbar.newTerminal', 'New terminal')}
        onClick={() => void createTerminalCanvasNode()}
      >
        <SquareTerminal className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label={translate('auto.components.canvas.CanvasToolbar.newBrowser', 'New browser')}
        onClick={() => void createBrowserCanvasNode()}
      >
        <Globe className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <ToolbarButton
        label={translate('auto.components.canvas.CanvasToolbar.collapse', 'Hide toolbar')}
        onClick={() => setOpen(false)}
      >
        <ChevronLeft className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )
}
