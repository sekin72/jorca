// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'

import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createCanvasStore } from '../../store/canvas/canvas-store'
import CanvasSurface from './CanvasSurface'

beforeAll(() => {
  // happy-dom lacks ResizeObserver; the surface constructs one on mount.
  if (!('ResizeObserver' in globalThis)) {
    class RO {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    ;(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO
  }
})

afterEach(cleanup)

describe('CanvasSurface', () => {
  it('shows the empty overlay when there are no nodes', () => {
    const store = createCanvasStore()
    render(<CanvasSurface store={store} />)
    expect(screen.getByText('Empty canvas')).toBeInTheDocument()
  })

  it('renders a node box for an added node (container size unknown → cull renders all)', () => {
    const store = createCanvasStore()
    const id = store.getState().addNode('panel-xyz')
    const { container } = render(<CanvasSurface store={store} />)
    expect(container.querySelector(`[data-canvas-node="${id}"]`)).not.toBeNull()
    // panelId shows in both the node header and the placeholder body.
    expect(screen.getAllByText('panel-xyz').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Empty canvas')).not.toBeInTheDocument()
  })
})
