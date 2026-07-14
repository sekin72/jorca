// Deterministic color per source worktree, so a borrowed window on Main reads at
// a glance as belonging to a given project (docs/main-surface.md T-B3). Pure hash
// → hue; same worktree always maps to the same color across sessions.

/** An HSL color string for a worktree id (stable, evenly spread across the wheel). */
export function worktreeTint(
  worktreeId: string,
  opts?: { saturation?: number; lightness?: number }
): string {
  let hash = 0
  for (let i = 0; i < worktreeId.length; i++) {
    hash = (hash * 31 + worktreeId.charCodeAt(i)) >>> 0
  }
  // Golden-angle step keeps nearby ids visually distinct rather than clustered.
  const hue = (hash * 137) % 360
  const s = opts?.saturation ?? 65
  const l = opts?.lightness ?? 55
  return `hsl(${hue} ${s}% ${l}%)`
}
