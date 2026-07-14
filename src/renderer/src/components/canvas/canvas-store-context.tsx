// React context carrying the active worktree's canvas store, so nodes and the
// surface all read/write the same per-worktree store instance.

import React, { createContext, useContext } from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'

type BoundCanvasStore = UseBoundStore<StoreApi<CanvasStore>>

const CanvasStoreContext = createContext<BoundCanvasStore | null>(null)

export function CanvasStoreProvider({
  store,
  children
}: {
  store: BoundCanvasStore
  children: React.ReactNode
}): React.JSX.Element {
  return <CanvasStoreContext.Provider value={store}>{children}</CanvasStoreContext.Provider>
}

/** The bound store for the current canvas (throws if used outside a provider). */
export function useCanvasStoreApi(): BoundCanvasStore {
  const store = useContext(CanvasStoreContext)
  if (!store) {
    throw new Error('useCanvasStoreApi must be used within a CanvasStoreProvider')
  }
  return store
}

/** Subscribe to a slice of the current canvas store. */
export function useCanvasStore<T>(selector: (state: CanvasStore) => T): T {
  return useStore(useCanvasStoreApi(), selector)
}
