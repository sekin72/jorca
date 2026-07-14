// Saved Canvas Layouts dialog — save the current canvas under a name, load a
// saved layout into the active canvas, or delete one. Toggled by the
// `canvasLayoutsDialogOpen` UI flag. See docs/canvas-workspace.md R1.

import React, { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Upload, FileDown } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import {
  listCanvasLayouts,
  saveCanvasLayout,
  loadCanvasLayout,
  deleteCanvasLayout
} from '@/lib/canvas-layouts'

export function CanvasLayoutsDialog(): React.JSX.Element {
  const open = useAppStore((s) => s.canvasLayoutsDialogOpen)
  const setOpen = useAppStore((s) => s.setCanvasLayoutsDialogOpen)
  const bumpVersion = useAppStore((s) => s.bumpCanvasLayoutsVersion)
  const version = useAppStore((s) => s.canvasLayoutsVersion)

  const [names, setNames] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const list = await listCanvasLayouts()
    setNames(list)
  }, [])

  useEffect(() => {
    if (open) {
      void refresh()
    }
  }, [open, refresh, version])

  const handleSave = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) {
      return
    }
    setBusy(true)
    try {
      await saveCanvasLayout(name)
      setNewName('')
      bumpVersion()
      void refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleLoad = async (name: string): Promise<void> => {
    setBusy(true)
    try {
      await loadCanvasLayout(name)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (name: string): Promise<void> => {
    setBusy(true)
    try {
      await deleteCanvasLayout(name)
      bumpVersion()
      void refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {translate('auto.components.canvas.CanvasLayoutsDialog.title', 'Saved canvas layouts')}
          </DialogTitle>
        </DialogHeader>

        {/* Save current canvas */}
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleSave()
              }
            }}
            placeholder={translate(
              'auto.components.canvas.CanvasLayoutsDialog.namePlaceholder',
              'Layout name…'
            )}
            className="h-8"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || !newName.trim()}
            onClick={() => void handleSave()}
          >
            <FileDown className="mr-1 h-3.5 w-3.5" />
            {translate('auto.components.canvas.CanvasLayoutsDialog.save', 'Save')}
          </Button>
        </div>

        {/* Saved layouts list */}
        <div className="scrollbar-sleek max-h-[280px] overflow-y-auto rounded-md border border-border">
          {names.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              {translate(
                'auto.components.canvas.CanvasLayoutsDialog.empty',
                'No saved layouts yet. Arrange your canvas and save it above.'
              )}
            </div>
          ) : (
            names.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 last:border-b-0"
              >
                <span className="flex-1 truncate text-[13px] text-foreground">{name}</span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleLoad(name)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                    aria-label={translate(
                      'auto.components.canvas.CanvasLayoutsDialog.load',
                      'Load into active canvas'
                    )}
                    title={translate(
                      'auto.components.canvas.CanvasLayoutsDialog.load',
                      'Load into active canvas'
                    )}
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete(name)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                    aria-label={translate(
                      'auto.components.canvas.CanvasLayoutsDialog.delete',
                      'Delete'
                    )}
                    title={translate('auto.components.canvas.CanvasLayoutsDialog.delete', 'Delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
