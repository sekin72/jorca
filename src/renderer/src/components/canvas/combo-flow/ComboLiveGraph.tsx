/**
 * ComboLiveGraph — live combo execution viewer.
 *
 * Shows all active combos from Omniroute's combo system via a WebSocket
 * connection to `ws://localhost:20132/live-ws`. Supports two views:
 * - Table: compact table of all combos with provider chain
 * - Fleet: card-based overview with provider chips
 */
import { useMemo, useState } from "react"
import { FLOW_EDGE_COLORS, STRATEGY_COLORS } from "./flowConstants"
import { useLiveComboStatus } from "./useLiveComboStatus"

// ---------------------------------------------------------------------------
// Fleet mode — aggregate events into latest state per target
// ---------------------------------------------------------------------------

type FleetTargetState = {
  provider: string
  model: string
  state: "attempting" | "succeeded" | "failed"
  latencyMs?: number
  error?: string
  failKind?: string
  lastSeen: number
}

type FleetRow = {
  comboName: string
  strategy?: string
  targets: FleetTargetState[]
  outcome: "running" | "succeeded" | "exhausted" | "unknown"
}

function buildFleetRows(events: ReturnType<typeof useLiveComboStatus>["events"]): FleetRow[] {
  // Keep only the latest event per comboName:targetIndex
  const latest = new Map<string, { event: (typeof events)[0]; ts: number }>()

  for (const evt of events) {
    const key = `${evt.comboName}:${evt.targetIndex}`
    const existing = latest.get(key)
    if (!existing || evt.timestamp > existing.ts) {
      latest.set(key, { event: evt, ts: evt.timestamp })
    }
  }

  // Group by combo
  const byCombo = new Map<string, Map<number, FleetTargetState>>()
  for (const [, { event: evt }] of latest) {
    if (!byCombo.has(evt.comboName)) {
      byCombo.set(evt.comboName, new Map())
    }
    const targets = byCombo.get(evt.comboName)!
    if (!targets.has(evt.targetIndex) || evt.timestamp > targets.get(evt.targetIndex)!.lastSeen) {
      targets.set(evt.targetIndex, {
        provider: evt.provider,
        model: evt.model,
        state: evt.type === "attempt" ? "attempting" : evt.type,
        latencyMs: evt.latencyMs,
        error: evt.error,
        failKind: evt.type === "failed" ? "other" : undefined,
        lastSeen: evt.timestamp,
      })
    }
  }

  const rows: FleetRow[] = []
  for (const [comboName, targetsMap] of byCombo) {
    const targets = Array.from(targetsMap.values())
    const allSucceeded = targets.every((t) => t.state === "succeeded")
    const anyFailed = targets.some((t) => t.state === "failed")
    const outcome: FleetRow["outcome"] = allSucceeded ? "succeeded" : anyFailed ? "exhausted" : "running"

    rows.push({ comboName, targets, outcome })
  }
  return rows
}

// ---------------------------------------------------------------------------
// Table mode — compact table showing all active combos
// ---------------------------------------------------------------------------

function ComboTableView({ rows }: { rows: FleetRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center" data-testid="combo-live-studio-empty">
        <p className="text-xs text-worktree-sidebar-foreground/70">No combo events yet. Send a request through a combo to see results.</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto h-full bg-worktree-sidebar p-2">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left text-worktree-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
            <th className="pb-2 pr-4 font-medium whitespace-nowrap">Combo</th>
            <th className="pb-2 pr-4 font-medium">Chain</th>
            <th className="pb-2 text-right font-medium whitespace-nowrap">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const sortedTargets = [...row.targets].sort(
              (a, b) => (a.lastSeen ?? 0) - (b.lastSeen ?? 0),
            )
            return (
              <tr key={row.comboName} className="border-t border-worktree-sidebar-border">
                <td className="py-2.5 pr-4 whitespace-nowrap max-w-[180px]">
                  <span className="font-mono text-worktree-sidebar-foreground truncate block" title={row.comboName}>
                    {row.comboName}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-start gap-1 flex-wrap">
                    {sortedTargets.map((t, i) => (
                      <span key={i} className="flex items-start gap-1">
                        {i > 0 && (
                          <span className="text-worktree-sidebar-foreground/30 text-[10px] leading-none">→</span>
                        )}
                        <span
                          className="font-mono text-[10px] px-1 py-0.5 rounded border whitespace-nowrap"
                          style={{
                            borderColor:
                              t.state === "succeeded"
                                ? FLOW_EDGE_COLORS.active
                                : t.state === "failed"
                                  ? FLOW_EDGE_COLORS.error
                                  : FLOW_EDGE_COLORS.last,
                            color:
                              t.state === "succeeded"
                                ? FLOW_EDGE_COLORS.active
                                : t.state === "failed"
                                  ? FLOW_EDGE_COLORS.error
                                  : FLOW_EDGE_COLORS.last,
                          }}
                          title={`${t.provider}: ${t.model}`}
                        >
                          <span className="font-semibold">{t.provider}</span>
                          {t.model && <span className="opacity-60">·{t.model}</span>}
                        </span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 text-right whitespace-nowrap">
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: outcomeColor(row.outcome) }}
                  >
                    {row.outcome}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fleet overview rows
// ---------------------------------------------------------------------------

function outcomeColor(outcome: FleetRow["outcome"]): string {
  switch (outcome) {
    case "succeeded": return "#22c55e"
    case "exhausted": return "#ef4444"
    case "running": return "#f59e0b"
    default: return "#6b7280"
  }
}

function FleetOverview({ rows }: { rows: FleetRow[] }) {
  return (
    <div className="flex flex-col gap-2 p-2 overflow-auto h-full bg-worktree-sidebar" data-testid="fleet-overview">
      {rows.length === 0 && (
        <p className="text-xs text-worktree-sidebar-foreground/70 text-center py-4">No active combos.</p>
      )}
      {rows.map((row) => (
        <div key={row.comboName} className="border border-worktree-sidebar-border rounded-lg p-2 bg-worktree-sidebar-accent/40">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-xs font-mono text-worktree-sidebar-foreground truncate">{row.comboName}</span>
            {row.strategy && (
              <span className="text-[10px] px-1 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${STRATEGY_COLORS[row.strategy] ?? "#6366f1"}20`, color: STRATEGY_COLORS[row.strategy] ?? "#6366f1" }}>
                {row.strategy}
              </span>
            )}
            <span className="ml-auto text-[10px] font-bold" style={{ color: outcomeColor(row.outcome) }}>
              {row.outcome}
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {row.targets.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border"
                style={{
                  borderColor:
                    t.state === "succeeded"
                      ? FLOW_EDGE_COLORS.active
                      : t.state === "failed"
                        ? FLOW_EDGE_COLORS.error
                        : FLOW_EDGE_COLORS.last,
                  color:
                    t.state === "succeeded"
                      ? FLOW_EDGE_COLORS.active
                      : t.state === "failed"
                        ? FLOW_EDGE_COLORS.error
                        : FLOW_EDGE_COLORS.last,
                }}
              >
                <img
                  src={`http://localhost:20128/providers/${t.provider}.svg`}
                  alt={t.provider}
                  width={10}
                  height={10}
                  className="shrink-0"
                  onError={(e) => { e.currentTarget.style.display = "none" }}
                />
                <span className="font-mono">{t.provider}</span>
                {t.latencyMs != null && <span className="text-worktree-sidebar-foreground/60">·{t.latencyMs.toFixed(0)}ms</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Disconnected banner
// ---------------------------------------------------------------------------

function DisconnectedBanner({ error, onReconnect }: { error?: string | null; onReconnect: () => void }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-1.5 text-[10px] border border-worktree-sidebar-border rounded bg-worktree-sidebar-accent/60 text-worktree-sidebar-foreground/80" data-testid="combo-disconnected-banner">
      <div className="flex items-center gap-2">
        <span>WebSocket disconnected.</span>
        <button className="underline hover:no-underline" onClick={onReconnect}>Reconnect</button>
      </div>
      {error && <span className="text-[9px] text-worktree-sidebar-foreground/60 truncate" title={error}>{error}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ComboLiveGraph() {
  const { events, isConnected, lastError, reconnect } = useLiveComboStatus()

  const [viewMode, setViewMode] = useState<"table" | "fleet">("table")

  const fleetRows = useMemo(() => buildFleetRows(events), [events])

  return (
    <div className="flex flex-col h-full gap-2 bg-worktree-sidebar" data-testid="combo-live-studio">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar-accent/50 shrink-0 flex-wrap">
        <span className="text-xs text-worktree-sidebar-foreground/70">
          {fleetRows.length} combo{fleetRows.length !== 1 ? "s" : ""}
        </span>

        {/* Mode toggle */}
        <div className="ml-auto flex items-center border border-worktree-sidebar-border rounded overflow-hidden text-xs">
          <button
            className="px-2.5 py-1 transition-colors"
            style={{
              background: viewMode === "table" ? "var(--color-primary)" : "transparent",
              color: viewMode === "table" ? "#fff" : "var(--color-worktree-sidebar-foreground)",
            }}
            onClick={() => setViewMode("table")}
            data-testid="mode-table"
          >
            Table
          </button>
          <button
            className="px-2.5 py-1 transition-colors"
            style={{
              background: viewMode === "fleet" ? "var(--color-primary)" : "transparent",
              color: viewMode === "fleet" ? "#fff" : "var(--color-worktree-sidebar-foreground)",
            }}
            onClick={() => setViewMode("fleet")}
            data-testid="mode-fleet"
          >
            Fleet
          </button>
        </div>
      </div>

      {/* Disconnected banner */}
      {!isConnected && <DisconnectedBanner error={lastError} onReconnect={reconnect} />}

      {/* Content area */}
      <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-worktree-sidebar-border">
        {viewMode === "fleet" ? (
          <FleetOverview rows={fleetRows} />
        ) : (
          <ComboTableView rows={fleetRows} />
        )}
      </div>
    </div>
  )
}
