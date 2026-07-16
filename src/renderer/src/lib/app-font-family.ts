import { DEFAULT_APP_FONT_FAMILY } from '../../../shared/constants'

// Monospace fallback chain: the unified app font defaults to a monospace, so a
// failed load of the bundled face degrades to the platform monospace, not sans.
const APP_FONT_FALLBACKS = [
  DEFAULT_APP_FONT_FAMILY,
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Consolas',
  'monospace'
] as const

const CSS_FONT_KEYWORDS = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'ui-monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'blinkmacsystemfont'
])

function quoteFontFamily(fontFamily: string): string {
  if (fontFamily.startsWith('-') || CSS_FONT_KEYWORDS.has(fontFamily.toLowerCase())) {
    return fontFamily
  }
  return JSON.stringify(fontFamily)
}

export function buildAppFontFamily(fontFamily: string | null | undefined): string {
  const trimmed = fontFamily?.trim() || DEFAULT_APP_FONT_FAMILY
  const lowerTrimmed = trimmed.toLowerCase()
  const parts = [
    trimmed,
    ...APP_FONT_FALLBACKS.filter((fallback) => fallback.toLowerCase() !== lowerTrimmed)
  ]
  return parts.map(quoteFontFamily).join(', ')
}
