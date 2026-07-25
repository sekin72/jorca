import React from 'react'
import { FolderPlus, Plus, Search } from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import SidebarWorkspaceOptionsMenu from './SidebarWorkspaceOptionsMenu'
import { useShortcutLabel, useShortcutKeyComboDetails } from '@/hooks/useShortcutLabel'
import { ShortcutKeyCombo } from '@/components/ShortcutKeyCombo'
import { openWorkspaceCreationComposerWithTourHandoff } from '../contextual-tours/workspace-creation-tour-handoff'
import { translate } from '@/i18n/i18n'

type SidebarHeaderProps = {
  onWorkspaceBoardMenuOpenChange: (open: boolean) => void
}

const SidebarHeader = React.memo(function SidebarHeader({
  onWorkspaceBoardMenuOpenChange
}: SidebarHeaderProps) {
  const openModal = useAppStore((s) => s.openModal)
  const newWorktreeShortcutLabel = useShortcutLabel('workspace.create')
  const worktreePaletteShortcutCombos = useShortcutKeyComboDetails('worktree.palette')
  const groupBy = useAppStore((s) => s.groupBy)
  const canCreateWorkspace = useAppStore((s) => s.repos.length > 0)
  const sidebarTitle = groupBy === 'repo' ? 'Projects' : 'Workspaces'

  return (
    <div className="mt-2 flex flex-col gap-2 px-2">
      {/* Title + action buttons row */}
      <div className="flex h-8 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <span
            className="pl-2 pr-0.5 text-xs font-semibold text-muted-foreground/80 select-none"
            data-sidebar-section-title={groupBy === 'repo' ? 'projects' : 'workspaces'}
          >
            {sidebarTitle}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SidebarWorkspaceOptionsMenu
            preserveWorkspaceBoardOpen
            onMenuOpenChange={onWorkspaceBoardMenuOpenChange}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                aria-label={translate(
                  'auto.components.sidebar.SidebarHeader.25a95899c9',
                  'Add Project'
                )}
                onClick={() => openModal('add-repo')}
              >
                <FolderPlus className="size-3.5" strokeWidth={2.25} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {translate('auto.components.sidebar.SidebarHeader.25a95899c9', 'Add Project')}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  if (!canCreateWorkspace) {
                    return
                  }
                  // Why: the parallel-work tour must click the real sidebar
                  // control so it can hand off to the workspace-creation tour.
                  openWorkspaceCreationComposerWithTourHandoff()
                }}
                aria-label={translate(
                  'auto.components.sidebar.SidebarHeader.92154beb7e',
                  'New workspace'
                )}
                disabled={!canCreateWorkspace}
                data-contextual-tour-target="workspace-create-control"
              >
                <Plus className="size-3.5" strokeWidth={2.25} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={6}>
              {canCreateWorkspace
                ? translate(
                    'auto.components.sidebar.SidebarHeader.ca6f729da2',
                    'New workspace ({{value0}})',
                    { value0: newWorktreeShortcutLabel }
                  )
                : translate(
                    'auto.components.sidebar.SidebarHeader.5c9c7c16aa',
                    'Add a project to create workspaces'
                  )}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Search bar */}
      <button
        type="button"
        onClick={() => openModal('worktree-palette')}
        aria-label={translate(
          'auto.components.sidebar.SidebarHeader.0c3395fd32',
          'Search worktrees and browser tabs'
        )}
        className="group relative flex h-7 w-full items-center rounded-md border border-worktree-sidebar-border/70 bg-worktree-sidebar-foreground/5 pl-7 pr-1.5 text-left text-[12px] font-medium tracking-tight text-worktree-sidebar-foreground/45 transition-colors hover:border-worktree-sidebar-border hover:bg-worktree-sidebar-foreground/8 hover:text-worktree-sidebar-foreground/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50"
      >
        <Search
          className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-worktree-sidebar-foreground/30"
          strokeWidth={1.75}
        />
        <span className="min-w-0 flex-1 truncate">
          {translate('auto.components.sidebar.SidebarNav.80611a8b10', 'Search')}
        </span>
        <span className="pointer-events-none ml-1.5 hidden shrink-0 items-center gap-1.5 group-hover:inline-flex group-focus-within:inline-flex">
          {worktreePaletteShortcutCombos.map((combo) => (
            <ShortcutKeyCombo
              key={combo.keys.join('-')}
              keys={combo.keys}
              doubleTap={combo.doubleTap}
              className="inline-flex gap-0.5"
              keyCapClassName="min-w-4 border-worktree-sidebar-border/80 bg-worktree-sidebar-foreground/8 px-1 py-px text-[9px] text-worktree-sidebar-foreground/55 shadow-none"
              separatorClassName="text-[9px] text-worktree-sidebar-foreground/45"
            />
          ))}
        </span>
      </button>
    </div>
  )
})

export default SidebarHeader
