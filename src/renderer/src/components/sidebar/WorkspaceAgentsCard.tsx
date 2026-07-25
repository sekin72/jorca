import React from 'react'
import { Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import DashboardAgentRow from '@/components/dashboard/DashboardAgentRow'
import type { DashboardAgentRow as DashboardAgentRowData } from '@/components/dashboard/useDashboardData'
import { translate } from '@/i18n/i18n'

type WorkspaceAgentsCardProps = {
  agent: DashboardAgentRowData
  isPinned: boolean
  onDismiss: (paneKey: string) => void
  onActivate: (tabId: string, paneKey: string) => void
  now: number
}

export default function WorkspaceAgentsCard({
  agent,
  isPinned,
  onDismiss,
  onActivate,
  now
}: WorkspaceAgentsCardProps): React.JSX.Element {
  return (
    <div
      className="relative rounded-lg"
      data-workspace-agents-card-id={agent.paneKey}
    >
      {isPinned ? (
        <Badge
          variant="outline"
          className="pointer-events-none absolute right-2 top-1.5 z-10 flex size-4 items-center justify-center rounded-full bg-background/90 p-0 text-muted-foreground"
          aria-label={translate('auto.components.sidebar.WorkspaceAgentsCard.cefae8983e', 'Pinned')}
        >
          <Pin className="size-2.5" />
        </Badge>
      ) : null}
      <DashboardAgentRow
        agent={agent}
        onDismiss={onDismiss}
        onActivate={onActivate}
        now={now}
        hideIdentityIcon={false}
        hideExpand={false}
      />
    </div>
  )
}
