import { BUILDINGS } from '../models/buildings'
import type { LayoutSolution, ProductionGraph, SolverAttempt } from '../models/types'

export function createUnsatSolution(
  attempts: SolverAttempt[],
  elapsedMs: number,
  lastBounds: { width: number; height: number }
): LayoutSolution {
  return {
    status: 'unsat',
    bounds: lastBounds,
    placements: [],
    conveyors: [],
    attempts,
    elapsedMs,
  }
}

export function createUnknownSolution(
  attempts: SolverAttempt[],
  elapsedMs: number,
  lastBounds: { width: number; height: number }
): LayoutSolution {
  return {
    status: 'unknown',
    bounds: lastBounds,
    placements: [],
    conveyors: [],
    attempts,
    elapsedMs,
  }
}

export function extractSatSolution(args: {
  graph: ProductionGraph
  model: any
  varsByNodeId: Record<string, { x: any; y: any }>
  attempts: SolverAttempt[]
  elapsedMs: number
  bounds: { width: number; height: number }
}): LayoutSolution {
  const placements = args.graph.nodes.map((node) => {
    const def = BUILDINGS[node.type]
    const vars = args.varsByNodeId[node.id]
    const rawX = args.model.get(vars.x)
    const rawY = args.model.get(vars.y)

    const x = rawX?.value ? Number(rawX.value()) : Number(rawX?.toString() ?? 0)
    const y = rawY?.value ? Number(rawY.value()) : Number(rawY?.toString() ?? 0)

    return {
      nodeId: node.id,
      x,
      y,
      width: def.length,
      height: def.width,
    }
  })

  return {
    status: 'sat',
    bounds: args.bounds,
    placements,
    conveyors: [],
    attempts: args.attempts,
    elapsedMs: args.elapsedMs,
  }
}
