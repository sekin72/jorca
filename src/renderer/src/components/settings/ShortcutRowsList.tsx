import React from 'react'
import type { KeybindingActionId, KeybindingInput } from '../../../../shared/keybindings'
import { cn } from '../../lib/utils'
import { ShortcutCommandBlock } from './ShortcutCommandBlock'
import { CanvasHudToggle } from './CanvasHudToggle'
import type { ShortcutRowsByGroup } from './ShortcutFilterRail'
import { translate } from '@/i18n/i18n'

const EMPTY_BINDINGS: readonly string[] = []

export function ShortcutRowsList({
  className,
  groups,
  footer,
  platform,
  errors,
  disableMemory,
  recordingActionId,
  recordingBindingIndex,
  onStartRecordingAt,
  onAppendBinding,
  onCancelRecording,
  onCapture,
  onClearError,
  onRemoveBindingAt,
  onResetAction,
  onDisableAction,
  onEnableAction
}: {
  className?: string
  groups: ShortcutRowsByGroup[]
  footer?: React.ReactNode
  platform: NodeJS.Platform
  errors: Partial<Record<KeybindingActionId, string>>
  disableMemory: Partial<Record<KeybindingActionId, string[]>>
  recordingActionId: KeybindingActionId | null
  recordingBindingIndex: number | null
  onStartRecordingAt: (actionId: KeybindingActionId, index: number) => void
  onAppendBinding: (actionId: KeybindingActionId) => void
  onCancelRecording: () => void
  onCapture: (actionId: KeybindingActionId, input: KeybindingInput) => void
  onClearError: (actionId: KeybindingActionId) => void
  onRemoveBindingAt: (actionId: KeybindingActionId, index: number) => void
  onResetAction: (actionId: KeybindingActionId) => void
  onDisableAction: (actionId: KeybindingActionId) => void
  onEnableAction: (actionId: KeybindingActionId) => void
}): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {groups.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
          {translate(
            'auto.components.settings.ShortcutRowsList.4ce3cd24d9',
            'No shortcuts match those filters.'
          )}
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.title} className="space-y-3">
            <h3 className="border-b border-border/50 pb-2 text-sm font-medium text-muted-foreground">
              {group.title}
            </h3>
            <div className="flex flex-col gap-3">
              {group.rows.map((row) => (
                <div key={row.item.id} className="flex items-start gap-2">
                  <CanvasHudToggle id={row.item.id} className="mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <ShortcutCommandBlock
                      item={row.item}
                      groupTitle={group.title}
                      platform={platform}
                      effective={row.effective}
                      modified={row.modified}
                      error={errors[row.item.id]}
                      warnings={row.warnings}
                      terminalStatus={row.terminalStatus}
                      previousBindings={disableMemory[row.item.id] ?? EMPTY_BINDINGS}
                      recordingBindingIndex={
                        recordingActionId === row.item.id ? recordingBindingIndex : null
                      }
                      onStartRecordingAt={onStartRecordingAt}
                      onAppendBinding={onAppendBinding}
                      onCancelRecording={onCancelRecording}
                      onCapture={onCapture}
                      onClearError={onClearError}
                      onRemoveBindingAt={onRemoveBindingAt}
                      onResetAction={onResetAction}
                      onDisableAction={onDisableAction}
                      onEnableAction={onEnableAction}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      {footer}
    </div>
  )
}
