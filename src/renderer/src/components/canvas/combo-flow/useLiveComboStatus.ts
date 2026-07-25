/**
 * Renderer-side bridge for the main-process WS connection.
 * The main process owns the WebSocket so it can access the Omniroute session
 * cookie from the shared `persist:orca-browser` partition (renderers can't
 * set a Cookie header on a sandboxed WebSocket).
 */
import { useCallback, useEffect, useState } from "react"
import type { ComboEvent, ComboLiveWsMessage } from "../../../../../shared/combo-live-types"

export type { ComboEvent } from "../../../../../shared/combo-live-types"

const MAX_EVENTS = 200

export function useLiveComboStatus() {
  const [events, setEvents] = useState<ComboEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = window.api.comboLiveWs.onEvent((data) => {
      const msg = data as ComboLiveWsMessage
      if (msg.state === "connected") {
        setIsConnected(true)
        setLastError(null)
      } else if (msg.state === "disconnected" || msg.state === "connecting") {
        setIsConnected(false)
      } else if (msg.state === "error") {
        setIsConnected(false)
        if (msg.errorMessage) { setLastError(msg.errorMessage) }
      } else if (msg.state === "event") {
        setEvents((prev) => [msg.event, ...prev].slice(0, MAX_EVENTS))
      }
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const reconnect = useCallback(async (): Promise<void> => {
    setLastError(null)
    await window.api.comboLiveWs.reconnect()
  }, [])

  return { events, isConnected, lastError, reconnect }
}