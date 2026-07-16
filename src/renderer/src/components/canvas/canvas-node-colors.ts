// Preset window accents for the per-node color picker (Null Space "Color Bloom").
// Periwinkle default first, then a spread of tints across the hue wheel so nearby
// windows stay visually distinct. Each drives a node's focus glow + minimap tint.

export const CANVAS_NODE_COLORS = [
  '#7c8ef0', // periwinkle (default accent)
  '#6bd6a3', // mint
  '#e0a35f', // amber
  '#e06a86', // rose
  '#c77dd6', // violet
  '#5fb6e0', // cyan
  '#8bd15f', // green
  '#e0d15f' // gold
] as const
