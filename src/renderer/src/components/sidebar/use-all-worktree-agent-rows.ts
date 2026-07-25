import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { applyAgentRowLineage } from '@/components/dashboard/agent-row-lineage'
import { migrationUnsupportedToAgentStatusEntry } from '@/lib/migration-unsupported-agent-entry'
import {
  selectLiveAgentStatusEntriesForWorktree,
  selectMigrationUnsupportedEntriesForWorktree,
  selectRuntimeAgentOrchestrationForWorktree,
  selectRetainedAgentEntriesForWorktree,
  selectTerminalLayoutsForWorktree
} from './worktree-agent-row-selectors'
import {
  selectLivePtyIdsForWorktree,
  selectRuntimePaneTitlesForWorktree
} from './worktree-card-status-inputs'
import { buildWorktreeAgentRows } from './worktree-agent-rows'
import type { DashboardAgentRow } from '@/components/dashboard/useDashboardData'

/**
 * Builds DashboardAgentRow[] for all given worktrees, using the same per-worktree
 * selectors as useWorktreeAgentRows. Returns a Map from worktreeId to agent rows.
 * Used by the Workspace Agents board view.
 */
export function useAllWorktreeAgentRows(
  worktreeIds: string[]
): ReadonlyMap<string, DashboardAgentRow[]> {
  const allTabsByWorktree = useAppStore((s) => s.tabsByWorktree)
  const agentStatusByPaneKey = useAppStore((s) => s.agentStatusByPaneKey)
  const migrationUnsupportedByPtyId = useAppStore((s) => s.migrationUnsupportedByPtyId)
  const retainedAgentsByPaneKey = useAppStore((s) => s.retainedAgentsByPaneKey)
  const runtimeAgentOrchestrationByPaneKey = useAppStore((s) => s.runtimeAgentOrchestrationByPaneKey)
  const runtimePaneTitlesByTabId = useAppStore((s) => s.runtimePaneTitlesByTabId)
  const ptyIdsByTabId = useAppStore((s) => s.ptyIdsByTabId)
  const terminalLayoutsByTabId = useAppStore((s) => s.terminalLayoutsByTabId)

  return useMemo(() => {
    const result = new Map<string, DashboardAgentRow[]>()

    for (const worktreeId of worktreeIds) {
      const tabs = allTabsByWorktree[worktreeId] ?? []

      const stateForLiveAndMigration = {
        agentStatusByPaneKey,
        migrationUnsupportedByPtyId,
        retainedAgentsByPaneKey,
        tabsByWorktree: allTabsByWorktree
      }
      const stateForRetained = {
        agentStatusByPaneKey,
        migrationUnsupportedByPtyId,
        retainedAgentsByPaneKey,
        tabsByWorktree: allTabsByWorktree
      }
      const stateForRuntimeOrchestration = {
        agentStatusByPaneKey,
        retainedAgentsByPaneKey,
        runtimeAgentOrchestrationByPaneKey,
        tabsByWorktree: allTabsByWorktree
      }
      const stateForLayout = {
        terminalLayoutsByTabId,
        tabsByWorktree: allTabsByWorktree
      }
      const stateForStatus = {
        runtimePaneTitlesByTabId,
        ptyIdsByTabId,
        tabsByWorktree: allTabsByWorktree
      }

      const liveEntries = selectLiveAgentStatusEntriesForWorktree(stateForLiveAndMigration, worktreeId)
      const migrationUnsupported = selectMigrationUnsupportedEntriesForWorktree(
        stateForLiveAndMigration,
        worktreeId
      )
      const retained = selectRetainedAgentEntriesForWorktree(stateForRetained, worktreeId)
      const runtimePaneTitlesByTab = selectRuntimePaneTitlesForWorktree(stateForStatus, worktreeId)
      const ptyIdsByTab = selectLivePtyIdsForWorktree(stateForStatus, worktreeId)
      const terminalLayoutsByTab = selectTerminalLayoutsForWorktree(stateForLayout, worktreeId)
      const runtimeAgentOrchestration = selectRuntimeAgentOrchestrationForWorktree(
        stateForRuntimeOrchestration,
        worktreeId
      )

      const entries =
        migrationUnsupported.length > 0
          ? [
              ...liveEntries,
              ...migrationUnsupported.flatMap((unsupported) => {
                const entry = migrationUnsupportedToAgentStatusEntry(unsupported)
                return entry ? [entry] : []
              })
            ]
          : liveEntries

      const rows = buildWorktreeAgentRows({
        tabs,
        entries,
        retained,
        runtimePaneTitlesByTabId: runtimePaneTitlesByTab,
        ptyIdsByTabId: ptyIdsByTab,
        terminalLayoutsByTabId: terminalLayoutsByTab,
        runtimeAgentOrchestrationByPaneKey: runtimeAgentOrchestration,
        now: Date.now()
      })

      result.set(worktreeId, applyAgentRowLineage(rows))
    }

    return result
  }, [
    worktreeIds,
    allTabsByWorktree,
    agentStatusByPaneKey,
    migrationUnsupportedByPtyId,
    retainedAgentsByPaneKey,
    runtimeAgentOrchestrationByPaneKey,
    runtimePaneTitlesByTabId,
    ptyIdsByTabId,
    terminalLayoutsByTabId
  ])
}
