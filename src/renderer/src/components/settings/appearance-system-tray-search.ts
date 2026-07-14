// System-tray settings-search entries, split out of appearance-search.ts to keep
// that file under the line cap. Mirrors the other appearance-*-search siblings.

import type { SettingsSearchEntry } from './settings-search'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { getRendererAppPlatform } from '@/lib/renderer-app-platform'
import { isWebClientLocation } from '@/lib/web-client-location'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'

const getSystemTrayEntryCatalog = createLocalizedCatalog((): SettingsSearchEntry[] => [
  {
    title: translate(
      'auto.components.settings.appearance.search.9a115966d3',
      'Minimize to Tray on Close'
    ),
    description: translate(
      'auto.components.settings.appearance.search.4d5b9427b5',
      'When enabled, closing the window keeps Orca running in the system tray instead of quitting.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.appearance.search.tray.tray', 'tray', {
        englishOnly: true
      }),
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.tray.system',
        'system tray',
        { englishOnly: true }
      ),
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.tray.minimize',
        'minimize',
        { englishOnly: true }
      ),
      ...translateSearchKeyword('auto.components.settings.appearance.search.tray.close', 'close', {
        englishOnly: true
      }),
      ...translateSearchKeyword('auto.components.settings.appearance.search.e5bc35d59e', 'window'),
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.tray.notification',
        'notification area',
        { englishOnly: true }
      ),
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.tray.background',
        'background',
        { englishOnly: true }
      )
    ]
  }
])

type SystemTraySearchOptions = {
  showSystemTray?: boolean
}

function shouldShowSystemTrayEntries(options: SystemTraySearchOptions): boolean {
  return (
    options.showSystemTray ??
    // Why: this setting controls Electron's Windows tray only. A Windows web
    // browser can report win32, but it has no local tray to affect.
    (getRendererAppPlatform() === 'win32' && !isWebClientLocation())
  )
}

export function getSystemTrayEntries(options: SystemTraySearchOptions = {}): SettingsSearchEntry[] {
  return shouldShowSystemTrayEntries(options) ? getSystemTrayEntryCatalog() : []
}
