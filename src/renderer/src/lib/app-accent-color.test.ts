import { describe, expect, it } from 'vitest'
import {
  APP_ACCENT_SWATCHES,
  APP_ACCENT_VARIABLES,
  applyAppAccentColor,
  normalizeAppAccentColor,
  relativeLuminance,
  resolveAccentForeground,
  resolveAccentStyleVariables
} from './app-accent-color'
describe('normalizeAppAccentColor', () => {
  it('returns undefined for non-strings', () => {
    expect(normalizeAppAccentColor(undefined)).toBeUndefined()
    expect(normalizeAppAccentColor(null)).toBeUndefined()
    expect(normalizeAppAccentColor(42)).toBeUndefined()
  })

  it('returns undefined for empty or whitespace', () => {
    expect(normalizeAppAccentColor('')).toBeUndefined()
    expect(normalizeAppAccentColor('   ')).toBeUndefined()
  })

  it('returns undefined for non-hex values', () => {
    expect(normalizeAppAccentColor('red')).toBeUndefined()
    expect(normalizeAppAccentColor('#gggggg')).toBeUndefined()
    expect(normalizeAppAccentColor('rgb(0,0,0)')).toBeUndefined()
  })

  it('normalizes 6-digit hex to lowercase with hash', () => {
    expect(normalizeAppAccentColor('#3B82F6')).toBe('#3b82f6')
    expect(normalizeAppAccentColor('3B82F6')).toBe('#3b82f6')
  })

  it('expands 3-digit hex to 6-digit', () => {
    expect(normalizeAppAccentColor('#abc')).toBe('#aabbcc')
    expect(normalizeAppAccentColor('abc')).toBe('#aabbcc')
  })
})

describe('relativeLuminance', () => {
  it('returns null for invalid hex', () => {
    expect(relativeLuminance('not-a-color')).toBeNull()
    expect(relativeLuminance('#zzzzzz')).toBeNull()
  })

  it('returns ~0 for black and ~1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })

  it('returns a mid value for a mid gray', () => {
    const luminance = relativeLuminance('#808080')
    expect(luminance).not.toBeNull()
    expect(luminance!).toBeGreaterThan(0.1)
    expect(luminance!).toBeLessThan(0.3)
  })
})

describe('resolveAccentForeground', () => {
  it('returns dark text for light accents', () => {
    expect(resolveAccentForeground('#ffffff')).toBe('#0a0a0a')
    expect(resolveAccentForeground('#fbbf24')).toBe('#0a0a0a')
  })

  it('returns light text for dark accents', () => {
    expect(resolveAccentForeground('#000000')).toBe('#fafafa')
    expect(resolveAccentForeground('#3b82f6')).toBe('#fafafa')
  })
})

describe('resolveAccentStyleVariables', () => {
  it('returns empty object for invalid accent', () => {
    expect(resolveAccentStyleVariables('')).toEqual({})
    expect(resolveAccentStyleVariables('red')).toEqual({})
    expect(resolveAccentStyleVariables(undefined as unknown as string)).toEqual({})
  })

  it('derives primary and ring from the accent', () => {
    const vars = resolveAccentStyleVariables('#3b82f6')
    expect(vars['--primary']).toBe('#3b82f6')
    expect(vars['--ring']).toBe('#3b82f6')
    expect(vars['--sidebar-primary']).toBe('#3b82f6')
    expect(vars['--sidebar-ring']).toBe('#3b82f6')
  })

  it('gates primary-foreground by luminance', () => {
    expect(resolveAccentStyleVariables('#3b82f6')['--primary-foreground']).toBe('#fafafa')
    expect(resolveAccentStyleVariables('#fbbf24')['--primary-foreground']).toBe('#0a0a0a')
  })

  it('derives accent as a color-mix against --background', () => {
    const vars = resolveAccentStyleVariables('#3b82f6')
    expect(vars['--accent']).toBe('color-mix(in srgb, #3b82f6 12%, var(--background))')
    expect(vars['--accent-foreground']).toBe('var(--foreground)')
  })

  it('derives chart colors as tints and shades of the accent', () => {
    const vars = resolveAccentStyleVariables('#3b82f6')
    expect(vars['--chart-3']).toBe('#3b82f6')
    expect(vars['--chart-1']).toContain('color-mix')
    expect(vars['--chart-5']).toContain('#000')
  })

  it('covers every variable in APP_ACCENT_VARIABLES', () => {
    const vars = resolveAccentStyleVariables('#3b82f6')
    for (const name of APP_ACCENT_VARIABLES) {
      expect(vars[name]).toBeDefined()
    }
  })
})

describe('applyAppAccentColor', () => {
  function createRoot() {
    const store = new Map<string, string>()
    return {
      style: {
        setProperty: (name: string, value: string) => {
          store.set(name, value)
          return value
        },
        removeProperty: (name: string) => {
          const prev = store.get(name) ?? ''
          store.delete(name)
          return prev
        }
      },
      getPropertyValue: (name: string) => store.get(name) ?? ''
    }
  }

  it('sets inline variables for a valid accent', () => {
    const root = createRoot()
    applyAppAccentColor('#3b82f6', { root })
    expect(root.getPropertyValue('--primary')).toBe('#3b82f6')
    expect(root.getPropertyValue('--ring')).toBe('#3b82f6')
  })

  it('removes inline variables when accent is cleared', () => {
    const root = createRoot()
    applyAppAccentColor('#3b82f6', { root })
    expect(root.getPropertyValue('--primary')).toBe('#3b82f6')
    applyAppAccentColor(undefined, { root })
    expect(root.getPropertyValue('--primary')).toBe('')
    expect(root.getPropertyValue('--ring')).toBe('')
  })

  it('removes all accent variables when cleared after being set', () => {
    const root = createRoot()
    applyAppAccentColor('#22c55e', { root })
    applyAppAccentColor(undefined, { root })
    for (const name of APP_ACCENT_VARIABLES) {
      expect(root.getPropertyValue(name)).toBe('')
    }
  })
})

describe('APP_ACCENT_SWATCHES', () => {
  it('includes an Orca swatch with null color', () => {
    const orca = APP_ACCENT_SWATCHES.find((swatch) => swatch.id === 'orca')
    expect(orca).toBeDefined()
    expect(orca!.color).toBeNull()
  })

  it('every non-Orca swatch has a valid hex color', () => {
    for (const swatch of APP_ACCENT_SWATCHES) {
      if (swatch.id === 'orca') {
        continue
      }
      expect(normalizeAppAccentColor(swatch.color)).toBeDefined()
    }
  })
})
