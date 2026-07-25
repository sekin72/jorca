import React from 'react'
import { LayoutDashboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SetupGuideSidebarEntry } from './SetupGuideSidebarEntry'
import { translate } from '@/i18n/i18n'

export { getSetupGuideSidebarEntryReady, shouldShowSetupGuideEntry } from './SetupGuideSidebarEntry'

type SidebarNavProps = {
  toggleWorkspaceBoard: () => void
}

const SidebarNav = React.memo(function SidebarNav({ toggleWorkspaceBoard }: SidebarNavProps) {
  // Why: this memo boundary needs its own language subscription, while
  // translate() preserves Orca's pseudo-localization behavior.
  useTranslation()

  return (
    <div
      className="flex flex-col gap-0.5 px-2 pt-2 pb-1"
      data-contextual-tour-target="sidebar-navigation"
    >
      <SetupGuideSidebarEntry />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleWorkspaceBoard}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight text-worktree-sidebar-foreground/60 transition-colors hover:bg-worktree-sidebar-foreground/8"
          >
            <LayoutDashboard
              className="size-4 shrink-0 text-worktree-sidebar-foreground/30"
              strokeWidth={1.75}
            />
            <span className="flex-1">
              {translate('auto.components.sidebar.SidebarNav.board', 'Board')}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={6}>
          {translate('auto.components.sidebar.SidebarNav.boardTooltip', 'Workspace Board')}
        </TooltipContent>
      </Tooltip>
    </div>
  )
})

export default SidebarNav
