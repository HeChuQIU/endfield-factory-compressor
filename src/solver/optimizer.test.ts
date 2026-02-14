import { describe, expect, it } from 'vitest'
import { premiumBuckwheatCapsuleGraph } from '../examples/buckwheat-capsule'
import { estimateInitialBounds } from '@shared/solver/optimizer'

describe('estimateInitialBounds', () => {
  it('uses total machine footprint area as lower-bound estimate', () => {
    const result = estimateInitialBounds(premiumBuckwheatCapsuleGraph)
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
    expect(result.width).toBe(result.height)
  })
})