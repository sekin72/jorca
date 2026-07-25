/**
 * Canonical status colors — same semantic tokens as Omniroute's STATUS_HEX.
 * Use HEX values only where CSS classes can't reach (ReactFlow SVG strokes).
 */
export const STATUS_HEX = {
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  muted: "#6b7280",
} as const

/**
 * Shared ReactFlow edge palette + styling — mirrors Omniroute's flow/edgeStyles.
 * Green = active, red = error, amber = last, muted = idle.
 */
export const FLOW_EDGE_COLORS = {
  active: STATUS_HEX.success,
  error: STATUS_HEX.error,
  last: STATUS_HEX.warning,
  idle: "var(--color-border)",
} as const

export type FlowEdgeStyle = {
  stroke: string
  strokeWidth: number
  opacity: number
}

/**
 * Resolve the stroke style for an edge given its state.
 * Precedence: error > active > last > idle.
 */
export function edgeStyle(
  active: boolean,
  last: boolean,
  error: boolean,
): FlowEdgeStyle {
  if (error) { return { stroke: FLOW_EDGE_COLORS.error, strokeWidth: 2, opacity: 0.85 } }
  if (active) { return { stroke: FLOW_EDGE_COLORS.active, strokeWidth: 2.5, opacity: 1 } }
  if (last) { return { stroke: FLOW_EDGE_COLORS.last, strokeWidth: 1.5, opacity: 0.6 } }
  return { stroke: FLOW_EDGE_COLORS.idle, strokeWidth: 1, opacity: 0.2 }
}

/** Strategy → border color map (mirrors Omniroute's STRATEGY_COLORS). */
export const STRATEGY_COLORS: Record<string, string> = {
  priority: "#3b82f6",
  weighted: "#8b5cf6",
  "round-robin": "#06b6d4",
  "fill-first": "#f59e0b",
  p2c: "#10b981",
  random: "#6b7280",
  "least-used": "#84cc16",
  "cost-optimized": "#22c55e",
  "reset-aware": "#f97316",
  "reset-window": "#f97316",
  "strict-random": "#a855f7",
  auto: "#6366f1",
  lkgp: "#ec4899",
  "context-optimized": "#14b8a6",
  "context-relay": "#0ea5e9",
}
