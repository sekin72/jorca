import { describe, expect, it } from 'vitest'
import { buildAppFontFamily } from './app-font-family'

describe('buildAppFontFamily', () => {
  it('defaults to the bundled monospace app font', () => {
    expect(buildAppFontFamily('')).toBe(
      '"JetBrains Mono", ui-monospace, "SFMono-Regular", "Menlo", "Consolas", monospace'
    )
  })

  it('places a custom UI font before the fallback chain', () => {
    expect(buildAppFontFamily('Inter')).toBe(
      '"Inter", "JetBrains Mono", ui-monospace, "SFMono-Regular", "Menlo", "Consolas", monospace'
    )
  })

  it('does not duplicate the bundled font when selected explicitly', () => {
    expect(buildAppFontFamily('JetBrains Mono')).toBe(
      '"JetBrains Mono", ui-monospace, "SFMono-Regular", "Menlo", "Consolas", monospace'
    )
  })
})
