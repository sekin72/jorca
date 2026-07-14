// Native OS file picker for placing an existing file as a canvas editor node.
// Repo-size independent (unlike QuickOpen's file listing). Split from app.ts to
// keep it under the max-lines cap.

import { BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron'
import { authorizeExternalPath } from './filesystem-auth'

export async function pickCanvasFile(
  event: IpcMainInvokeEvent,
  args?: { defaultPath?: string }
): Promise<string | null> {
  const options = {
    defaultPath: args?.defaultPath,
    properties: ['openFile']
  } satisfies Electron.OpenDialogOptions
  const parentWindow = BrowserWindow.fromWebContents(event.sender)
  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, options)
    : await dialog.showOpenDialog(options)
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  const filePath = result.filePaths[0]
  // A user-approved picker selection is a trust grant for editor reads/writes.
  authorizeExternalPath(filePath)
  return filePath
}
