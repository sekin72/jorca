/**
 * Determine which zoom domain (terminal, editor, simulator, canvas, or UI) should be adjusted
 * based on current view, tab type, and focused element.
 */
export function resolveZoomTarget(args: {
  activeView:
    | 'terminal'
    | 'settings'
    | 'tasks'
    | 'activity'
    | 'automations'
    | 'space'
    | 'skills'
    | 'mobile'
  activeTabType: 'terminal' | 'editor' | 'browser' | 'simulator'
  activeElement: unknown
  /** When true and the view is not terminal/editor/simulator, zoom targets the canvas. */
  hasActiveCanvas?: boolean
}): 'terminal' | 'editor' | 'simulator' | 'canvas' | 'ui' {
  const { activeView, activeTabType, activeElement, hasActiveCanvas } = args
  const terminalInputFocused =
    typeof activeElement === 'object' &&
    activeElement !== null &&
    'classList' in activeElement &&
    typeof (activeElement as { classList?: { contains?: unknown } }).classList?.contains ===
      'function' &&
    (activeElement as { classList: { contains: (token: string) => boolean } }).classList.contains(
      'xterm-helper-textarea'
    )
  const editorFocused =
    typeof activeElement === 'object' &&
    activeElement !== null &&
    'closest' in activeElement &&
    typeof (activeElement as { closest?: unknown }).closest === 'function' &&
    Boolean(
      (
        activeElement as {
          closest: (selector: string) => Element | null
        }
      ).closest(
        '.monaco-editor, .diff-editor, .markdown-preview, .rich-markdown-editor, .rich-markdown-editor-shell'
      )
    )

  // Why: terminal input focus is the highest-priority indicator — the user is
  // actively typing in a terminal, so zoom must adjust the terminal font.
  if (terminalInputFocused) {
    return 'terminal'
  }

  // Why: the canvas is the primary work surface. Once an active canvas store
  // exists, zoom actions target the canvas graph by default — consistent with
  // executeShortcutAction which checks the canvas store first. This overrides
  // editor focus (which can match editor elements embedded in canvas nodes)
  // and view-specific routing (terminal tabs with editor tab types).
  // Editor zoom is available when there is no active canvas.
  if (hasActiveCanvas) {
    return 'canvas'
  }

  // Why: if the editor element is genuinely focused with no canvas to zoom,
  // route to editor font zoom.
  if (editorFocused) {
    return 'editor'
  }

  if (activeView !== 'terminal') {
    return 'ui'
  }
  if (activeTabType === 'simulator') {
    return 'simulator'
  }
  // Why: keyboard/menu zoom in an active browser tab belongs to Orca chrome.
  // Browser page zoom has a dedicated route for wheel and page-specific IPC.
  if (activeTabType === 'browser') {
    return 'ui'
  }
  if (activeTabType === 'editor') {
    return 'editor'
  }
  return 'ui'
}
