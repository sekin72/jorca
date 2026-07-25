import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { KeybindingActionId, KeybindingInput } from '../../../../shared/keybindings'
import { cn } from '../../lib/utils'
import { ShortcutCommandBlock } from './ShortcutCommandBlock'
import { CanvasHudToggle } from './CanvasHudToggle'
import type { ShortcutRowsByGroup } from './ShortcutFilterRail'
import { executeShortcutAction } from '@/lib/shortcut-action-dispatcher'
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
  expandedParentIds,
  onStartRecordingAt,
  onAppendBinding,
  onCancelRecording,
  onCapture,
  onClearError,
  onRemoveBindingAt,
  onResetAction,
  onDisableAction,
  onEnableAction,
  onToggleExpand
}: {
  className?: string
  groups: ShortcutRowsByGroup[]
  footer?: React.ReactNode
  platform: NodeJS.Platform
  errors: Partial<Record<KeybindingActionId, string>>
  disableMemory: Partial<Record<KeybindingActionId, string[]>>
  recordingActionId: KeybindingActionId | null
  recordingBindingIndex: number | null
  expandedParentIds?: Partial<Record<KeybindingActionId, boolean>>
  onStartRecordingAt: (actionId: KeybindingActionId, index: number) => void
  onAppendBinding: (actionId: KeybindingActionId) => void
  onCancelRecording: () => void
  onCapture: (actionId: KeybindingActionId, input: KeybindingInput) => void
  onClearError: (actionId: KeybindingActionId) => void
  onRemoveBindingAt: (actionId: KeybindingActionId, index: number) => void
  onResetAction: (actionId: KeybindingActionId) => void
  onDisableAction: (actionId: KeybindingActionId) => void
  onEnableAction: (actionId: KeybindingActionId) => void
  onToggleExpand?: (actionId: KeybindingActionId) => void
}): React.JSX.Element {
  const renderRow = (row: ShortcutRowsByGroup['rows'][number], groupTitle: string): React.JSX.Element => {
    const hasChildren = row.children && row.children.length > 0
    const isExpanded = hasChildren && (expandedParentIds?.[row.item.id] ?? row.isExpanded ?? false)
    const isParent = row.item.isParent

    return (
      <div key={row.item.id} className={cn('flex flex-col', isParent && 'group/parent')}>
        <div className="flex items-start gap-2">
          {isParent ? (
            <button
              type="button"
              onClick={() => onToggleExpand?.(row.item.id)}
              className="mt-1.5 flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={isExpanded ? `Collapse ${row.item.title}` : `Expand ${row.item.title}`}
              aria-expanded={isExpanded}
            >
              <ChevronRight
                className={cn('size-3.5 transition-transform', isExpanded && 'rotate-90')}
              />
            </button>
          ) : (
            <CanvasHudToggle id={row.item.id} className="mt-1.5" />
          )}
          <div className="min-w-0 flex-1">
            <ShortcutCommandBlock
              item={row.item}
              groupTitle={groupTitle}
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
              isParent={isParent}
              onExecute={isParent ? undefined : () => executeShortcutAction(row.item.id)}
            />
          </div>
        </div>

        {/* Render child shortcuts when expanded */}
        {isParent && isExpanded && hasChildren && row.children ? (
          <div className="ml-5 mt-1 flex flex-col gap-1.5 border-l-2 border-border/40 pl-3">
            {row.children.map((child) => (
              <div key={child.item.id} className="flex items-start gap-2">
                <CanvasHudToggle id={child.item.id} className="mt-1.5" />
                <div className="min-w-0 flex-1">
                  <ShortcutCommandBlock
                    item={child.item}
                    groupTitle={groupTitle}
                    platform={platform}
                    effective={child.effective}
                    modified={child.modified}
                    error={errors[child.item.id]}
                    warnings={child.warnings}
                    terminalStatus={child.terminalStatus}
                    previousBindings={disableMemory[child.item.id] ?? EMPTY_BINDINGS}
                    recordingBindingIndex={
                      recordingActionId === child.item.id ? recordingBindingIndex : null
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
                    onExecute={() => executeShortcutAction(child.item.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

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
              {group.rows.map((row) => renderRow(row, group.title))}
            </div>
          </div>
        ))
      )}
      {footer}
    </div>
  )
}
