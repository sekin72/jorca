import React from 'react'
import type { Repo, Worktree } from '../../../../shared/types'
import type { DashboardAgentRow } from '@/components/dashboard/useDashboardData'
import WorkspaceAgentsLane from './WorkspaceAgentsLane'

type WorkspaceAgentsLaneGridProps = {
  worktrees: readonly Worktree[]
  repoMap: Map<string, Repo>
  agentRowsByWorktreeId: ReadonlyMap<string, readonly DashboardAgentRow[]>
  columnWidth: number
  isResizingColumn: boolean
  onActivate: (tabId: string, paneKey: string) => void
  onActivateWorktree: (worktreeId: string) => void
  onDismiss: (paneKey: string) => void
  onColumnResizeStart: (event: React.PointerEvent<HTMLElement>) => void
  onColumnResizeKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
}

export default function WorkspaceAgentsLaneGrid({
  worktrees,
  repoMap,
  agentRowsByWorktreeId,
  columnWidth,
  isResizingColumn,
  onActivate,
  onActivateWorktree,
  onDismiss,
  onColumnResizeStart,
  onColumnResizeKeyDown
}: WorkspaceAgentsLaneGridProps): React.JSX.Element {
  return (
    <div
      className="grid h-full min-h-0 min-w-full grid-rows-[minmax(0,1fr)] gap-3"
      data-contextual-tour-target="workspace-board-agents-lanes"
      style={{
        gridTemplateColumns: `repeat(${worktrees.length}, minmax(${columnWidth}px, ${columnWidth}px))`
      }}
    >
      {worktrees.map((worktree) => (
        <WorkspaceAgentsLane
          key={worktree.id}
          worktree={worktree}
          repo={repoMap.get(worktree.repoId)}
          items={agentRowsByWorktreeId.get(worktree.id) ?? []}
          isResizingColumn={isResizingColumn}
          onActivate={onActivate}
          onActivateWorktree={onActivateWorktree}
          onDismiss={onDismiss}
          onColumnResizeStart={onColumnResizeStart}
          onColumnResizeKeyDown={onColumnResizeKeyDown}
        />
      ))}
    </div>
  )
}
