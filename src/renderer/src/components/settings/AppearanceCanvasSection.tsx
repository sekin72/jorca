import type React from 'react'

import type { GlobalSettings } from '../../../../shared/types'
import { translate } from '@/i18n/i18n'
import { SettingsRow, SettingsSegmentedControl, SettingsSwitchRow } from './SettingsFormControls'

type AppearanceCanvasSectionProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

/** Canvas (experimentalCanvas) appearance + interaction controls: background grid
 *  style, snap-to-grid, auto-focus, and the placement picker. */
export function AppearanceCanvasSection({
  settings,
  updateSettings
}: AppearanceCanvasSectionProps): React.JSX.Element {
  const gridStyle = settings.canvasGridStyle ?? 'dots'
  return (
    <div className="space-y-1">
      <SettingsRow
        label={translate(
          'auto.components.settings.AppearanceCanvas.gridStyle.label',
          'Background grid'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.gridStyle.description',
          'Show a dotted or lined grid behind the canvas.'
        )}
        control={
          <SettingsSegmentedControl
            value={gridStyle}
            onChange={(value) => updateSettings({ canvasGridStyle: value })}
            ariaLabel={translate(
              'auto.components.settings.AppearanceCanvas.gridStyle.label',
              'Background grid'
            )}
            options={[
              {
                value: 'dots',
                label: translate('auto.components.settings.AppearanceCanvas.gridStyle.dots', 'Dots')
              },
              {
                value: 'lines',
                label: translate(
                  'auto.components.settings.AppearanceCanvas.gridStyle.lines',
                  'Lines'
                )
              },
              {
                value: 'none',
                label: translate('auto.components.settings.AppearanceCanvas.gridStyle.none', 'None')
              }
            ]}
          />
        }
      />
      <SettingsSwitchRow
        label={translate('auto.components.settings.AppearanceCanvas.snap.label', 'Snap to grid')}
        description={translate(
          'auto.components.settings.AppearanceCanvas.snap.description',
          'Align windows to the grid and neighbors while dragging. Hold Alt to move freely.'
        )}
        checked={settings.canvasSnapToGrid ?? true}
        onChange={() => updateSettings({ canvasSnapToGrid: !(settings.canvasSnapToGrid ?? true) })}
      />
      <SettingsSwitchRow
        label={translate(
          'auto.components.settings.AppearanceCanvas.magneticDock.label',
          'Magnetic docking'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.magneticDock.description',
          'Windows click flush beside a neighbor as you slow down on it. Hold Alt to move freely.'
        )}
        checked={settings.canvasMagneticDock ?? true}
        onChange={() =>
          updateSettings({ canvasMagneticDock: !(settings.canvasMagneticDock ?? true) })
        }
      />
      <SettingsSwitchRow
        label={translate(
          'auto.components.settings.AppearanceCanvas.autoFocus.label',
          'Auto-focus largest window'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.autoFocus.description',
          'Activate the window filling the most visible area as you pan and zoom.'
        )}
        checked={settings.canvasAutoFocusVisible ?? false}
        onChange={() =>
          updateSettings({ canvasAutoFocusVisible: !(settings.canvasAutoFocusVisible ?? false) })
        }
      />
      <SettingsSwitchRow
        label={translate(
          'auto.components.settings.AppearanceCanvas.placementPicker.label',
          'Recommend where new windows go'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.placementPicker.description',
          'On create, show numbered spots to pick from. Off places windows automatically.'
        )}
        checked={settings.canvasPlacementPicker ?? false}
        onChange={() =>
          updateSettings({ canvasPlacementPicker: !(settings.canvasPlacementPicker ?? false) })
        }
      />
    </div>
  )
}
