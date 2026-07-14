import { DEFAULT_APP_FONT_FAMILY } from './constants'

export function resolveAppFontFamilyMigration(settings: {
  appFontFamily?: string
  terminalFontFamily?: string
  appFontFamilyUnifiedFromTerminal?: boolean
}): {
  appFontFamily: string
  terminalFontFamily: string
  appFontFamilyUnifiedFromTerminal: boolean
} {
  const appFontFamily = settings.appFontFamily ?? DEFAULT_APP_FONT_FAMILY
  const terminalFontFamily = settings.terminalFontFamily ?? ''
  const alreadyMigrated = settings.appFontFamilyUnifiedFromTerminal === true

  if (alreadyMigrated) {
    return { appFontFamily, terminalFontFamily, appFontFamilyUnifiedFromTerminal: true }
  }

  // Why: existing users who customized their terminal font (typically a
  // monospace face like JetBrains Mono) would otherwise see terminals fall
  // back to the Geist default after unification, breaking alignment. Copy
  // their terminal choice into the app-wide font so it flows everywhere,
  // matching the unified-font model. Users who never set a terminal font
  // (or whose terminal font equals the app font) are left untouched.
  if (terminalFontFamily && terminalFontFamily !== appFontFamily) {
    return {
      appFontFamily: terminalFontFamily,
      terminalFontFamily,
      appFontFamilyUnifiedFromTerminal: true
    }
  }

  return { appFontFamily, terminalFontFamily, appFontFamilyUnifiedFromTerminal: true }
}
