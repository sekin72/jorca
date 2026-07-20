import React from 'react'
import { Checkbox } from '../ui/checkbox'
import { useCanvasHudVisibilityStore } from '../canvas/canvas-shortcut-hud-store'
import type { CanvasHudId } from '../canvas/canvas-shortcut-hud-visibility'
import { translate } from '@/i18n/i18n'

/** Per-row checkbox controlling whether a shortcut appears on the canvas HUD. */
export function CanvasHudToggle({
  id,
  className
}: {
  id: CanvasHudId
  className?: string
}): React.JSX.Element {
  const shown = useCanvasHudVisibilityStore((state) => state.shownIds.has(id))
  const setShown = useCanvasHudVisibilityStore((state) => state.setShown)
  const label = translate('auto.components.settings.CanvasHudToggle.show', 'Show on canvas')
  return (
    <Checkbox
      checked={shown}
      onCheckedChange={(value) => setShown(id, value === true)}
      aria-label={label}
      title={label}
      className={className}
    />
  )
}
