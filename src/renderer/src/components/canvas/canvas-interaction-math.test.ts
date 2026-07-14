import { describe, it, expect } from 'vitest'
import { viewDeltaToCanvas, resizeGeometry, MIN_NODE_SIZE } from './canvas-interaction-math'

describe('viewDeltaToCanvas', () => {
  it('divides the view delta by zoom', () => {
    expect(viewDeltaToCanvas(100, 50, 2)).toEqual({ x: 50, y: 25 })
    expect(viewDeltaToCanvas(30, 30, 0.5)).toEqual({ x: 60, y: 60 })
  })
})

describe('resizeGeometry', () => {
  const origin = { x: 100, y: 100 }
  const size = { width: 400, height: 300 }

  it('south-east grows size, keeps origin', () => {
    const r = resizeGeometry(origin, size, 'se', 50, 40)
    expect(r.origin).toEqual({ x: 100, y: 100 })
    expect(r.size).toEqual({ width: 450, height: 340 })
  })

  it('north-west moves origin and shrinks size', () => {
    const r = resizeGeometry(origin, size, 'nw', 50, 30)
    expect(r.origin).toEqual({ x: 150, y: 130 })
    expect(r.size).toEqual({ width: 350, height: 270 })
  })

  it('east edge only changes width', () => {
    const r = resizeGeometry(origin, size, 'e', 25, 999)
    expect(r.size.height).toBe(300)
    expect(r.size.width).toBe(425)
  })

  it('clamps to the minimum size and pins the far edge on west/north', () => {
    const r = resizeGeometry(origin, size, 'nw', 10000, 10000)
    expect(r.size).toEqual(MIN_NODE_SIZE)
    // Far (south-east) corner stays put: origin + size == original far corner.
    expect(r.origin.x + r.size.width).toBe(origin.x + size.width)
    expect(r.origin.y + r.size.height).toBe(origin.y + size.height)
  })
})
