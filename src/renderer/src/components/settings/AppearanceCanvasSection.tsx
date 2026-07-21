import type React from 'react'
import type { GlobalSettings } from '../../../../shared/types'
import { translate } from '@/i18n/i18n'
import { SettingsSwitchRow, SettingsSegmentedControl, NumberField } from './SettingsFormControls'

type AppearanceCanvasSectionProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

/** Canvas (experimentalCanvas) appearance + interaction controls: background grid
 *  style, snap-to-grid, auto-focus, placement picker, and layout defaults. */
export function AppearanceCanvasSection({
  settings,
  updateSettings
}: AppearanceCanvasSectionProps): React.JSX.Element {
  const gridStyle = settings.canvasGridStyle ?? 'dots'
  return (
    <div className="space-y-1">
      <NumberField
        label={translate(
          'auto.components.settings.AppearanceCanvas.defaultNodeWidth.label',
          'Default window width'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.defaultNodeWidth.description',
          'Width for Group, Tidy, and Stack actions.'
        )}
        value={settings.canvasDefaultNodeWidth ?? 720}
        defaultValue={720}
        min={240}
        max={3840}
        step={20}
        suffix="px"
        onChange={(v) => updateSettings({ canvasDefaultNodeWidth: v })}
      />
      <NumberField
        label={translate(
          'auto.components.settings.AppearanceCanvas.defaultNodeHeight.label',
          'Default window height'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.defaultNodeHeight.description',
          'Height for Group, Tidy, and Stack actions.'
        )}
        value={settings.canvasDefaultNodeHeight ?? 480}
        defaultValue={480}
        min={160}
        max={2160}
        step={20}
        suffix="px"
        onChange={(v) => updateSettings({ canvasDefaultNodeHeight: v })}
      />
      <NumberField
        label={translate(
          'auto.components.settings.AppearanceCanvas.fitZoom.label',
          'Zoom after layout'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.fitZoom.description',
          'Zoom level for Group, Tidy, and Stack actions (100 = 1x).'
        )}
        value={Math.round((settings.canvasFitZoom ?? 1.00) * 100)}
        defaultValue={100}
        min={10}
        max={200}
        step={1}
        suffix="%"
        onChange={(v) => updateSettings({ canvasFitZoom: v / 100 })}
      />
      <NumberField
        label={translate(
          'auto.components.settings.AppearanceCanvas.paddingTop.label',
          'Top padding'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.paddingTop.description',
          'Top margin shared by every layout action.'
        )}
        value={settings.canvasPaddingTop ?? 40}
        defaultValue={40}
        min={0}
        max={500}
        step={10}
        suffix="px"
        onChange={(v) => updateSettings({ canvasPaddingTop: v })}
      />
      <NumberField
        label={translate(
          'auto.components.settings.AppearanceCanvas.paddingBottom.label',
          'Bottom padding'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.paddingBottom.description',
          'Bottom margin shared by every layout action.'
        )}
        value={settings.canvasPaddingBottom ?? 50}
        defaultValue={50}
        min={0}
        max={500}
        step={10}
        suffix="px"
        onChange={(v) => updateSettings({ canvasPaddingBottom: v })}
      />
      <NumberField
        label={translate(
          'auto.components.settings.AppearanceCanvas.paddingLeft.label',
          'Left padding'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.paddingLeft.description',
          'Left margin shared by every layout action.'
        )}
        value={settings.canvasPaddingLeft ?? 50}
        defaultValue={50}
        min={0}
        max={500}
        step={10}
        suffix="px"
        onChange={(v) => updateSettings({ canvasPaddingLeft: v })}
      />
      <NumberField
        label={translate(
          'auto.components.settings.AppearanceCanvas.paddingRight.label',
          'Right padding'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.paddingRight.description',
          'Right margin shared by every layout action.'
        )}
        value={settings.canvasPaddingRight ?? 50}
        defaultValue={50}
        min={0}
        max={500}
        step={10}
        suffix="px"
        onChange={(v) => updateSettings({ canvasPaddingRight: v })}
      />
      <NumberField
        label={translate(
          'auto.components.settings.AppearanceCanvas.nodeGap.label',
          'Space between windows'
        )}
        description={translate(
          'auto.components.settings.AppearanceCanvas.nodeGap.description',
          'Gap between windows in every layout action.'
        )}
        value={settings.canvasNodeGap ?? 10}
        defaultValue={10}
        min={0}
        max={200}
        step={2}
        suffix="px"
        onChange={(v) => updateSettings({ canvasNodeGap: v })}
      />

      <SettingsSwitchRow
        label={translate('auto.components.settings.AppearanceCanvas.gridStyle.label', 'Background grid')}
        description={translate(
          'auto.components.settings.AppearanceCanvas.gridStyle.description',
          'Show a dotted or lined grid behind the canvas.'
        )}
        checked={gridStyle !== 'none'}
        onChange={() =>
          updateSettings({
            canvasGridStyle: gridStyle === 'none' ? 'dots' : 'none'
          })
        }
      />
      {settings.canvasGridStyle !== 'none' && (
        <SettingsSegmentedControl
          value={gridStyle}
          onChange={(value) => updateSettings({ canvasGridStyle: value })}
          ariaLabel={translate(
            'auto.components.settings.AppearanceCanvas.gridStyle.label',
            'Background grid style'
          )}
          options={[
            {
              value: 'dots',
              label: translate('auto.components.settings.AppearanceCanvas.gridStyle.dots', 'Dots')
            },
            {
              value: 'lines',
              label: translate('auto.components.settings.AppearanceCanvas.gridStyle.lines', 'Lines')
            }
          ]}
        />
      )}
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
          'Activate the window filling the most viewport area as you pan and zoom.'
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
