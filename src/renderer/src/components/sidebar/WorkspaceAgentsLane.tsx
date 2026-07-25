import React from 'react'
import type { Repo, Worktree } from '../../../../shared/types'
import { cn } from '@/lib/utils'
import type { DashboardAgentRow } from '@/components/dashboard/useDashboardData'
import WorkspaceAgentsCard from './WorkspaceAgentsCard'
import { translate } from '@/i18n/i18n'

type WorkspaceAgentsLaneProps = {
  worktree: Worktree
  repo: Repo | undefined
  items: readonly DashboardAgentRow[]
  isResizingColumn: boolean
  onActivate: (tabId: string, paneKey: string) => void
  onActivateWorktree: (worktreeId: string) => void
  onDismiss: (paneKey: string) => void
  onColumnResizeStart: (event: React.PointerEvent<HTMLElement>) => void
  onColumnResizeKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
}

export default function WorkspaceAgentsLane({
  worktree,
  repo,
  items,
  isResizingColumn,
  onActivate,
  onActivateWorktree,
  onDismiss,
  onColumnResizeStart,
  onColumnResizeKeyDown
}: WorkspaceAgentsLaneProps): React.JSX.Element {
  // Show repo name in the lane header so it's immediately clear which project each
  // column belongs to — branch names are visible on the agent cards below.
  const laneTitle = repo?.displayName ?? worktree.displayName

  return (
    <section
      data-workspace-agents-lane=""
      data-worktree-id={worktree.id}
      className={cn(
        'group/lane',
        'relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-worktree-sidebar-border',
        'data-[workspace-board-external-drag-target=true]:border-worktree-sidebar-ring data-[workspace-board-external-drag-target=true]:bg-worktree-sidebar-accent/70'
      )}
    >
      <div
        data-workspace-board-column-resize-handle=""
        role="separator"
        aria-orientation="vertical"
        aria-label={translate(
          'auto.components.sidebar.WorkspaceAgentsLane.3611d1ae7f',
          'Resize workspace board columns'
        )}
        tabIndex={0}
        className={cn(
          'group absolute right-0 top-0 z-20 h-9 w-2 cursor-col-resize outline-none',
          'focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring',
          isResizingColumn && 'cursor-col-resize'
        )}
        onPointerDown={onColumnResizeStart}
        onKeyDown={onColumnResizeKeyDown}
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className={cn(
            'absolute inset-y-2 left-1/2 w-px -translate-x-1/2 rounded-full bg-transparent transition-colors',
            'group-hover:bg-worktree-sidebar-ring/55 group-focus-visible:bg-worktree-sidebar-ring',
            isResizingColumn && 'bg-worktree-sidebar-ring'
          )}
        />
      </div>

      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border/70 py-0 pl-3 pr-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring"
          onClick={() => onActivateWorktree(worktree.id)}
        >
          <div className="min-w-0 flex-1 truncate text-[12px] font-semibold text-foreground">
            {laneTitle}
          </div>
          <div className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium leading-none text-muted-foreground">
            {items.length}
          </div>
        </button>
      </div>

      <div
        data-workspace-board-lane-scroll=""
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 scrollbar-sleek"
      >
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((agent) => (
              <WorkspaceAgentsCard
                key={agent.paneKey}
                agent={agent}
                isPinned={worktree.isPinned}
                onDismiss={onDismiss}
                onActivate={onActivate}
                now={Date.now()}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border/70 text-[11px] text-muted-foreground">
            {translate('auto.components.sidebar.WorkspaceAgentsLane.8ad104642b', 'No active agents')}
          </div>
        )}
      </div>
    </section>
  )
}
