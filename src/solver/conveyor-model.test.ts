import { describe, expect, it } from 'vitest'
import type { LayoutSolution, ProductionGraph } from '@shared/models/types'
import { routeConveyorsForSolution } from '@shared/solver/conveyor-model'

const graph: ProductionGraph = {
  id: 'test',
  targetProduct: 'x',
  targetBelts: 1,
  nodes: [
    { id: 'a', label: 'A', type: 'crusher' },
    { id: 'b', label: 'B', type: 'crusher' },
  ],
  edges: [{ id: 'a-b', from: 'a', to: 'b', item: 'x', belts: 1 }],
}

function makeSolution(): LayoutSolution {
  return {
    status: 'sat',
    bounds: { width: 20, height: 20 },
    placements: [
      { nodeId: 'a', x: 1, y: 2, width: 3, height: 3 },
      { nodeId: 'b', x: 12, y: 2, width: 3, height: 3 },
    ],
    conveyors: [],
    attempts: [],
    elapsedMs: 0,
  }
}

describe('routeConveyorsForSolution', () => {
  it('routes conveyors between connected machines', () => {
    const result = routeConveyorsForSolution(graph, makeSolution())
    expect(result.ok).toBe(true)
    expect(result.conveyors.length).toBeGreaterThan(0)
  })
})