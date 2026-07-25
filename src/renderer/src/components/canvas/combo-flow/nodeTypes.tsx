import { Handle, Position } from "@xyflow/react"
import { StatusDot } from "./StatusDot"
import { FLOW_EDGE_COLORS, STRATEGY_COLORS } from "./flowConstants"

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Map failKind → display label (mirrors Omniroute's FAIL_KIND_MAP). */
const FAIL_KIND_LABELS: Record<string, string> = {
  "rate-limit": "rate-limit",
  "circuit-open": "circuit-open",
  cooldown: "cooldown",
  other: "error",
}

/** Map circuit breaker state → badge color. */
const CB_COLORS: Record<string, string> = {
  OPEN: FLOW_EDGE_COLORS.error,
  HALF_OPEN: FLOW_EDGE_COLORS.last,
  DEGRADED: FLOW_EDGE_COLORS.last,
}

/** Format cooldown retry-after as a human-readable string. */
function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) { return "" }
  const s = Math.round(ms / 1000)
  return s >= 60 ? `${Math.floor(s / 60)}m${s % 60}s` : `${s}s`
}

// ---------------------------------------------------------------------------
// Node data types
// ---------------------------------------------------------------------------

export type RequestNodeData = { comboName: string }
export type StrategyNodeData = { strategy: string; targetCount: number }
export type TargetNodeData = {
  provider: string
  model: string
  state: string
  latencyMs?: number
  failKind?: string
  targetIndex: number
  cbState?: string
  cbRetryAfterMs?: number
  cooldownCount?: number
  cooldownTotal?: number
  cooldownRetryAfterMs?: number
}
export type ResponseNodeData = { outcome: string; finishedAt?: number }

// ---------------------------------------------------------------------------
// Node type renderer map
// ---------------------------------------------------------------------------

function borderColor(state: string): string {
  switch (state) {
    case "attempting": return FLOW_EDGE_COLORS.last
    case "failed": return FLOW_EDGE_COLORS.error
    case "succeeded": return FLOW_EDGE_COLORS.active
    default: return "var(--color-border)"
  }
}

function boxShadow(state: string): string {
  switch (state) {
    case "attempting": return `0 0 12px ${FLOW_EDGE_COLORS.last}40`
    case "failed": return `0 0 12px ${FLOW_EDGE_COLORS.error}40`
    case "succeeded": return `0 0 12px ${FLOW_EDGE_COLORS.active}40`
    default: return "none"
  }
}

export const nodeTypes = {
  request: function RequestNode({ data }: { data: RequestNodeData }) {
    const color = "#6366f1"
    return (
      <div
        className="rounded-xl border-2 bg-background px-4 py-3 min-w-[110px] text-center transition-all duration-200"
        style={{ borderColor: color, boxShadow: `0 0 12px ${color}25` }}
        data-testid="request-node"
      >
        <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color }}>
          Request
        </div>
        <div className="text-[11px] font-mono text-muted truncate max-w-[130px]" title={data.comboName}>
          {data.comboName}
        </div>
      </div>
    )
  },

  strategy: function StrategyNode({ data }: { data: StrategyNodeData }) {
    const color = STRATEGY_COLORS[data.strategy] ?? "#6b7280"
    return (
      <div
        className="flex flex-col items-center gap-1 px-3 py-2 rounded-full border-2 bg-background transition-all duration-300"
        style={{ borderColor: color, boxShadow: `0 0 10px ${color}30`, minWidth: "110px" }}
        data-testid="strategy-node"
      >
        <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />
        <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate" style={{ color }} data-testid="strategy-label">
          {data.strategy || "combo"}
        </span>
        {data.targetCount > 0 && (
          <span
            className="text-[10px] font-mono px-1.5 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
            data-testid="strategy-target-count"
          >
            {data.targetCount} target{data.targetCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    )
  },

  target: function TargetNode({ data }: { data: TargetNodeData }) {
    const { provider, model, state, latencyMs, failKind, targetIndex, cbState, cbRetryAfterMs, cooldownCount, cooldownTotal, cooldownRetryAfterMs } = data
    const bc = borderColor(state)
    const bs = boxShadow(state)
    const isAttempting = state === "attempting"
    const isFailed = state === "failed"
    const isSucceeded = state === "succeeded"

    return (
      <div
        className="flex flex-col rounded-lg border-2 bg-background transition-all duration-300 min-w-[150px] max-w-[190px]"
        style={{ borderColor: bc, boxShadow: bs }}
        data-testid={`provider-cascade-node-${targetIndex}`}
      >
        <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />
        <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />

        {/* Header: provider icon + name */}
        <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <img
            src={`http://localhost:20128/providers/${provider}.svg`}
            alt={provider}
            width={14}
            height={14}
            className="shrink-0"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = "none"
            }}
          />
          <span className="text-xs font-semibold truncate flex-1" title={provider} data-testid="provider-name">
            {provider}
          </span>
          {isAttempting && <StatusDot color={FLOW_EDGE_COLORS.last} sizeClass="size-1.5" />}
          {isFailed && <StatusDot color={FLOW_EDGE_COLORS.error} error sizeClass="size-1.5" />}
          {isSucceeded && (
            <span className="text-[9px] font-bold" style={{ color: FLOW_EDGE_COLORS.active }}>
              ✓
            </span>
          )}
        </div>

        {/* Body: model + latency */}
        <div className="px-2.5 py-1.5 flex flex-col gap-0.5">
          <span className="text-[10px] text-muted font-mono truncate" title={model} data-testid="model-name">
            {model}
          </span>
          {latencyMs != null && (
            <span className="text-[10px] text-muted">{latencyMs.toFixed(0)}ms</span>
          )}
        </div>

        {/* Fail kind badge */}
        {isFailed && failKind && (
          <div className="px-2.5 pb-2">
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${FLOW_EDGE_COLORS.error}20`, color: FLOW_EDGE_COLORS.error }}
              data-testid="fail-kind-badge"
            >
              {FAIL_KIND_LABELS[failKind] ?? failKind}
            </span>
          </div>
        )}

        {/* Circuit breaker state badge */}
        {cbState && CB_COLORS[cbState] && (
          <div className="px-2.5 pb-2">
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${CB_COLORS[cbState]}20`, color: CB_COLORS[cbState] }}
              data-testid="cb-state-badge"
            >
              CB: {cbState}{cbRetryAfterMs ? ` · ${formatDuration(cbRetryAfterMs)}` : ""}
            </span>
          </div>
        )}

        {/* Cooldown badge */}
        {typeof cooldownCount === "number" && cooldownCount > 0 && (
          <div className="px-2.5 pb-2">
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${FLOW_EDGE_COLORS.last}20`, color: FLOW_EDGE_COLORS.last }}
              data-testid="cooldown-badge"
            >
              cooldown {typeof cooldownTotal === "number" ? `${cooldownCount}/${cooldownTotal}` : `${cooldownCount}`}
              {cooldownRetryAfterMs ? ` · ${formatDuration(cooldownRetryAfterMs)}` : ""}
            </span>
          </div>
        )}
      </div>
    )
  },

  response: function ResponseNode({ data }: { data: ResponseNodeData }) {
    const color =
      data.outcome === "succeeded"
        ? FLOW_EDGE_COLORS.active
        : data.outcome === "exhausted"
          ? FLOW_EDGE_COLORS.error
          : FLOW_EDGE_COLORS.last

    const label =
      data.outcome === "succeeded"
        ? "succeeded"
        : data.outcome === "exhausted"
          ? "exhausted"
          : data.outcome === "running"
            ? "running…"
            : data.outcome

    return (
      <div
        className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg border-2 bg-background transition-all duration-300"
        style={{ borderColor: color, boxShadow: `0 0 10px ${color}30`, minWidth: "100px" }}
        data-testid="response-node"
      >
        <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }} data-testid="response-outcome">
          {label}
        </span>
        {data.finishedAt && (
          <span className="text-[9px] text-muted font-mono" data-testid="response-finished-at">
            {new Date(data.finishedAt).toLocaleTimeString()}
          </span>
        )}
        <span className="text-xs font-bold" style={{ color }}>Response</span>
      </div>
    )
  },
}
