// Sidebar entry for the global Main surface (cross-worktree borrowed windows).
// Sits at the top of the left pane, above the project/worktree list — clicking it
// shows the Main canvas; selecting any worktree exits Main (docs/main-surface.md).
// Only meaningful with the infinite-canvas workbench, so gated on experimentalCanvas.

import React from 'react'
import { LayoutDashboard } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

export default function MainSurfaceSidebarEntry(): React.JSX.Element | null {
  const canvasEnabled = useAppStore((s) => s.settings?.experimentalCanvas === true)
  const active = useAppStore((s) => s.mainSurfaceActive)
  const activeView = useAppStore((s) => s.activeView)
  const setMainSurfaceActive = useAppStore((s) => s.setMainSurfaceActive)
  const setActiveView = useAppStore((s) => s.setActiveView)

  if (!canvasEnabled) {
    return null
  }

  const onClick = (): void => {
    // The canvas workbench only renders under the 'terminal' view, so make sure
    // we're there before showing Main.
    if (activeView !== 'terminal') {
      setActiveView('terminal')
    }
    setMainSurfaceActive(true)
  }

  return (
    <div className="px-2 pt-1">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          'flex h-7 w-full items-center gap-2 rounded-md px-2 text-sm',
          active
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
        )}
      >
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {translate('auto.components.sidebar.MainSurfaceSidebarEntry.label', 'Main')}
        </span>
      </button>
    </div>
  )
}
