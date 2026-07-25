/**
 * Main-process WebSocket client for Omniroute's live combo status.
 *
 * Runs in the main process so it can read the Omniroute dashboard session
 * cookie from the shared `persist:orca-browser` partition — the renderer's
 * sandboxed WebSocket cannot set a Cookie header. Combo events are forwarded
 * to subscribed renderer webContents over the `combo-live:event` IPC channel.
 *
 * The connection is reference-counted across renderer subscribers: the WS
 * stays open while at least one renderer is subscribed and tears down when
 * the last one unsubscribes (avoiding a dangling loopback socket when the
 * sidebar dock is hidden).
 */
import { ipcMain, session, type WebContents } from 'electron'
import WsClient from 'ws'
import { ORCA_BROWSER_PARTITION } from '../../shared/constants'
import type { ComboEvent, ComboLiveWsMessage } from '../../shared/combo-live-types'

export type { ComboEvent, ComboLiveWsMessage } from '../../shared/combo-live-types'

const WS_URL = 'ws://localhost:20132/live-ws'
const CHANNEL = 'combo'
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]

let ws: WsClient | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retryCount = 0
let isConnecting = false

// Subscribed renderer webContents — the WS lives while this is non-empty.
const subscribers = new Set<WebContents>()

function broadcast(message: ComboLiveWsMessage): void {
  for (const wc of subscribers) {
    if (!wc.isDestroyed()) {
      wc.send('combo-live:event', message)
    }
  }
}

async function getSessionCookie(): Promise<string | null> {
  try {
    const ses = session.fromPartition(ORCA_BROWSER_PARTITION)
    const cookies = await ses.cookies.get({ url: 'http://localhost:20128' })
    return cookies.find((c) => c.name === 'auth_token')?.value ?? null
  } catch {
    return null
  }
}

function parseMessage(raw: string): ComboEvent | null {
  try {
    const msg = JSON.parse(raw)
    if (msg.type !== 'event' || msg.channel !== CHANNEL) { return null }

    const { event: eventName, data } = msg
    const ts = msg.timestamp || Date.now()

    if (eventName === 'combo.target.attempt') {
      return {
        comboName: data.comboName,
        targetIndex: data.targetIndex,
        provider: data.provider,
        model: data.model,
        type: 'attempt',
        strategy: data.strategy,
        timestamp: ts,
      }
    }
    if (eventName === 'combo.target.succeeded') {
      return {
        comboName: data.comboName,
        targetIndex: data.targetIndex,
        provider: data.provider,
        model: data.model,
        type: 'succeeded',
        latencyMs: data.latencyMs,
        timestamp: ts,
      }
    }
    if (eventName === 'combo.target.failed') {
      return {
        comboName: data.comboName,
        targetIndex: data.targetIndex,
        provider: data.provider,
        model: data.model,
        type: 'failed',
        error: data.error,
        latencyMs: data.latencyMs,
        timestamp: ts,
      }
    }
    return null
  } catch {
    return null
  }
}

function isWsOpen(): boolean {
  return ws != null && ws.readyState === WsClient.OPEN
}

async function connect(): Promise<void> {
  if (ws?.readyState === WsClient.OPEN || isConnecting) { return }
  isConnecting = true
  broadcast({ state: 'connecting' })

  try {
    // The Omniroute live-ws server accepts the dashboard session cookie OR a
    // Bearer token. We forward the same-origin cookie harvested from the shared
    // browser partition so the renderer never needs to hold auth material.
    const cookieValue = await getSessionCookie()
    const headers: Record<string, string> = {}
    if (cookieValue) {
      headers.Cookie = `auth_token=${cookieValue}`
    }

    const sock = new WsClient(WS_URL, { headers })
    ws = sock

    sock.on('open', () => {
      isConnecting = false
      retryCount = 0
      // Why: local reference so the callback doesn't depend on the module-level
      // `ws` variable, which may have been replaced by a subsequent connect()
      // call before this async callback runs.
      sock.send(JSON.stringify({ type: 'subscribe', channels: [CHANNEL] }))
      broadcast({ state: 'connected' })
    })

    sock.on('message', (raw: WsClient.RawData) => {
      const parsed = parseMessage(raw.toString())
      if (parsed) { broadcast({ state: 'event', event: parsed }) }
    })

    sock.on('close', () => {
      // Only null-out `ws` if it's still the same socket we created — don't
      // race with a subsequent connect() that may have replaced it.
      if (ws === sock) { ws = null }
      isConnecting = false
      broadcast({ state: 'disconnected' })
      // Only retry if there are still subscribers.
      if (subscribers.size > 0) { scheduleRetry() }
    })

    sock.on('error', (err: Error) => {
      isConnecting = false
      const msg = err?.message ?? String(err)
      console.error('[combo-live-ws] WebSocket error:', msg)
      broadcast({ state: 'error', errorMessage: msg })
    })
  } catch (err) {
    isConnecting = false
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[combo-live-ws] connect() failed:', msg)
    broadcast({ state: 'error', errorMessage: msg })
    scheduleRetry()
  }
}

function scheduleRetry(): void {
  if (retryTimer) { clearTimeout(retryTimer) }
  if (subscribers.size === 0) { return }
  const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)]
  retryCount++
  retryTimer = setTimeout(() => { void connect() }, delay)
}

function disconnect(): void {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
  ws?.close()
  ws = null
  isConnecting = false
  retryCount = 0
}

export function registerComboLiveWsHandlers(): void {
  ipcMain.handle('combo-live:connect', async (event) => {
    subscribers.add(event.sender)
    // Stop tracking if the webContents dies before an explicit disconnect.
    event.sender.once('destroyed', () => {
      subscribers.delete(event.sender)
      if (subscribers.size === 0) { disconnect() }
    })
    // Kick the connection if it isn't already up.
    if (!ws && !isConnecting) { void connect() }
    return { isConnected: isWsOpen() }
  })

  ipcMain.handle('combo-live:disconnect', (event) => {
    subscribers.delete(event.sender)
    if (subscribers.size === 0) { disconnect() }
  })

  ipcMain.handle('combo-live:reconnect', async (event) => {
    subscribers.add(event.sender)
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
    disconnect()
    await connect()
    return { isConnected: isWsOpen() }
  })
}
