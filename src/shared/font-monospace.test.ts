import { describe, expect, it } from 'vitest'
import { isLikelyMonospaceFont } from './font-monospace'

describe('isLikelyMonospaceFont', () => {
  it('returns false for empty or undefined', () => {
    expect(isLikelyMonospaceFont(undefined)).toBe(false)
    expect(isLikelyMonospaceFont(null)).toBe(false)
    expect(isLikelyMonospaceFont('')).toBe(false)
    expect(isLikelyMonospaceFont('   ')).toBe(false)
  })

  it('returns true for known monospace fonts', () => {
    expect(isLikelyMonospaceFont('JetBrains Mono')).toBe(true)
    expect(isLikelyMonospaceFont('SF Mono')).toBe(true)
    expect(isLikelyMonospaceFont('Menlo')).toBe(true)
    expect(isLikelyMonospaceFont('Cascadia Code')).toBe(true)
    expect(isLikelyMonospaceFont('Fira Code')).toBe(true)
    expect(isLikelyMonospaceFont('Consolas')).toBe(true)
    expect(isLikelyMonospaceFont('monospace')).toBe(true)
    expect(isLikelyMonospaceFont('Courier New')).toBe(true)
    expect(isLikelyMonospaceFont('Source Code Pro')).toBe(true)
    expect(isLikelyMonospaceFont('IBM Plex Mono')).toBe(true)
  })

  it('returns false for proportional fonts', () => {
    expect(isLikelyMonospaceFont('Geist')).toBe(false)
    expect(isLikelyMonospaceFont('Inter')).toBe(false)
    expect(isLikelyMonospaceFont('Arial')).toBe(false)
    expect(isLikelyMonospaceFont('Helvetica')).toBe(false)
    expect(isLikelyMonospaceFont('Roboto')).toBe(false)
    expect(isLikelyMonospaceFont('system-ui')).toBe(false)
    expect(isLikelyMonospaceFont('Times New Roman')).toBe(false)
    expect(isLikelyMonospaceFont('Georgia')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isLikelyMonospaceFont('JETBRAINS MONO')).toBe(true)
    expect(isLikelyMonospaceFont('menlo')).toBe(true)
    expect(isLikelyMonospaceFont('Geist')).toBe(false)
    expect(isLikelyMonospaceFont('geist')).toBe(false)
  })
})
