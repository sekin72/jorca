/**
 * Shared types for the Omniroute live combo status feature.
 * Imported by both the main process (WS client + IPC handlers) and the renderer
 * (ComboLiveGraph + useLiveComboStatus).
 */

/** An event emitted over the WS "combo" channel from Omniroute's live-ws server. */
export type ComboEvent = {
  comboName: string
  targetIndex: number
  provider: string
  model: string
  type: 'attempt' | 'succeeded' | 'failed'
  /** Present on "succeeded" and "failed" */
  latencyMs?: number
  /** Present on "failed" */
  error?: string
  /** Present on "attempt" */
  strategy?: string
  timestamp: number
}

/**
 * Messages forwarded main→renderer over the `combo-live:event` IPC channel.
 * Either a connection-state lifecycle message or a concrete combo event.
 */
export type ComboLiveWsMessage =
  | { state: 'connected' | 'disconnected' | 'connecting' }
  | { state: 'error'; errorMessage?: string }
  | { state: 'event'; event: ComboEvent }
