import { FLOW_EDGE_COLORS } from "./flowConstants"

type StatusDotProps = {
  color: string
  error?: boolean
  sizeClass?: string
}

/**
 * Pulsing presence indicator — extracted from Omniroute's StatusDot.
 * Shows an `animate-ping` halo plus a solid dot.
 */
export function StatusDot({
  color,
  error = false,
  sizeClass = "size-1.5",
}: StatusDotProps) {
  const dotColor = error ? FLOW_EDGE_COLORS.error : color
  return (
    <span className={`relative flex ${sizeClass} shrink-0`}>
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70"
        style={{ backgroundColor: dotColor }}
      />
      <span
        className={`relative inline-flex rounded-full ${sizeClass}`}
        style={{ backgroundColor: dotColor }}
      />
    </span>
  )
}
