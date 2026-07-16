import { HEX_COLOR_RE } from './color-validation'

export const APP_ACCENT_VARIABLES = [
  '--primary',
  '--primary-foreground',
  '--ring',
  '--accent',
  '--accent-foreground',
  '--sidebar-primary',
  '--sidebar-ring',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5'
] as const

export type AppAccentVariable = (typeof APP_ACCENT_VARIABLES)[number]

export type AppAccentStyleVariables = Partial<Record<AppAccentVariable, string>>

export type AppAccentSwatch = {
  id: string
  label: string
  color: string | null
}

// Null Space periwinkle: Orca's default app accent (drives --ring/--primary/etc.).
export const DEFAULT_APP_ACCENT_COLOR = '#7c8ef0'

export const APP_ACCENT_SWATCHES: readonly AppAccentSwatch[] = [
  { id: 'orca', label: 'Orca', color: null },
  { id: 'nullspace', label: 'Null Space', color: DEFAULT_APP_ACCENT_COLOR },
  { id: 'blue', label: 'Blue', color: '#3b82f6' },
  { id: 'violet', label: 'Violet', color: '#8b5cf6' },
  { id: 'green', label: 'Green', color: '#22c55e' },
  { id: 'orange', label: 'Orange', color: '#f97316' },
  { id: 'pink', label: 'Pink', color: '#ec4899' },
  { id: 'cyan', label: 'Cyan', color: '#06b6d4' }
]

export function normalizeAppAccentColor(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  if (!HEX_COLOR_RE.test(trimmed)) {
    return undefined
  }
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  const expanded =
    withoutHash.length === 3
      ? withoutHash
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : withoutHash
  return `#${expanded.toLowerCase()}`
}

function parseHexChannels(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!match) {
    return null
  }
  const value = match[1]
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  }
}

function srgbToLinear(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number | null {
  const channels = parseHexChannels(hex)
  if (!channels) {
    return null
  }
  return (
    0.2126 * srgbToLinear(channels.r) +
    0.7152 * srgbToLinear(channels.g) +
    0.0722 * srgbToLinear(channels.b)
  )
}

export function resolveAccentForeground(accent: string): string {
  const luminance = relativeLuminance(accent)
  return luminance !== null && luminance > 0.55 ? '#0a0a0a' : '#fafafa'
}

export function resolveAccentStyleVariables(accent: string): AppAccentStyleVariables {
  const normalized = normalizeAppAccentColor(accent)
  if (!normalized) {
    return {}
  }
  const foreground = resolveAccentForeground(normalized)
  return {
    '--primary': normalized,
    '--primary-foreground': foreground,
    '--ring': normalized,
    '--accent': `color-mix(in srgb, ${normalized} 12%, var(--background))`,
    '--accent-foreground': 'var(--foreground)',
    '--sidebar-primary': normalized,
    '--sidebar-ring': normalized,
    '--chart-1': `color-mix(in srgb, ${normalized} 70%, var(--background))`,
    '--chart-2': `color-mix(in srgb, ${normalized} 85%, var(--background))`,
    '--chart-3': normalized,
    '--chart-4': `color-mix(in srgb, ${normalized} 85%, #000)`,
    '--chart-5': `color-mix(in srgb, ${normalized} 70%, #000)`
  }
}
