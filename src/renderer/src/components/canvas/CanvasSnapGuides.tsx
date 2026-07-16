// Transient alignment guides drawn while dragging a node, when an edge or center
// lines up with a neighbor (see canvas-snap.ts). Rendered INSIDE the world div so
// the guide positions are in canvas space and pan/zoom with the content. Lines
// use the --ring design token. Empty (nothing rendered) when not dragging.

import React from 'react'
import { useStore } from 'zustand'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CanvasStore } from '../../store/canvas/canvas-store'

// Long enough to read as an infinite rule at any pan position.
const EXTENT = 100000

export default function CanvasSnapGuides({
  store
}: {
  store: UseBoundStore<StoreApi<CanvasStore>>
}): React.JSX.Element | null {
  const guides = useStore(store, (s) => s.snapGuides)
  if (guides.length === 0) {
    return null
  }
  return (
    <>
      {guides.map((line, i) =>
        line.axis === 'x' ? (
          <div
            key={i}
            aria-hidden
            className="pointer-events-none absolute z-30"
            style={{
              left: line.position,
              top: -EXTENT / 2,
              width: 1,
              height: EXTENT,
              backgroundColor: 'var(--ring)'
            }}
          />
        ) : (
          <div
            key={i}
            aria-hidden
            className="pointer-events-none absolute z-30"
            style={{
              left: -EXTENT / 2,
              top: line.position,
              width: EXTENT,
              height: 1,
              backgroundColor: 'var(--ring)'
            }}
          />
        )
      )}
    </>
  )
}
