import {
  APP_ACCENT_VARIABLES,
  resolveAccentStyleVariables,
  type AppAccentStyleVariables
} from '../../../shared/app-accent-color'

export {
  APP_ACCENT_VARIABLES,
  APP_ACCENT_SWATCHES,
  normalizeAppAccentColor,
  relativeLuminance,
  resolveAccentForeground,
  resolveAccentStyleVariables
} from '../../../shared/app-accent-color'
export type {
  AppAccentStyleVariables,
  AppAccentSwatch,
  AppAccentVariable
} from '../../../shared/app-accent-color'

type StyleRoot = {
  style: Pick<CSSStyleDeclaration, 'setProperty' | 'removeProperty'>
}

export type ApplyAppAccentColorOptions = {
  root?: StyleRoot
}

export function applyAppAccentColor(
  accent: string | undefined,
  options: ApplyAppAccentColorOptions = {}
): void {
  const root = options.root ?? document.documentElement
  const variables: AppAccentStyleVariables = accent ? resolveAccentStyleVariables(accent) : {}

  for (const name of APP_ACCENT_VARIABLES) {
    const value = variables[name]
    if (value) {
      root.style.setProperty(name, value)
    } else {
      root.style.removeProperty(name)
    }
  }
}
