import { BUILDINGS } from '../models/buildings'
import type { LayoutSolution, ProductionGraph, SolverAttempt, SolverConfig } from '../models/types'
import { routeConveyorsForSolution } from './conveyor-model'
import { buildPlacementConstraints } from './constraints'
import { createUnknownSolution, createUnsatSolution, extractSatSolution } from './solution-extractor'

export function estimateInitialBounds(graph: ProductionGraph): { width: number; height: number } {
  const totalArea = graph.nodes.reduce((sum, node) => {
    const def = BUILDINGS[node.type]
    return sum + def.width * def.length
  }, 0)

  const side = Math.ceil(Math.sqrt(totalArea))
  return { width: side, height: side }
}

function resolveInitialBounds(
  graph: ProductionGraph,
  config: SolverConfig
): { width: number; height: number } {
  const estimated = estimateInitialBounds(graph)
  return {
    width: config.initialWidth ?? estimated.width,
    height: config.initialHeight ?? estimated.height,
  }
}

function expandBounds(
  current: { width: number; height: number },
  config: SolverConfig,
  iteration: number
): { width: number; height: number } {
  const step = Math.max(1, config.expansionStep)
  if (config.fixedDimensionMode === 'width') {
    return { width: current.width, height: current.height + step }
  }

  if (config.fixedDimensionMode === 'height') {
    return { width: current.width + step, height: current.height }
  }

  if (iteration % 2 === 0) {
    return { width: current.width + step, height: current.height }
  }
  return { width: current.width, height: current.height + step }
}

export async function solveWithIterativeBounds(args: {
  ctx: any
  graph: ProductionGraph
  config: SolverConfig
  onProgress: (attempt: SolverAttempt) => void
  shouldCancel: () => boolean
}): Promise<LayoutSolution> {
  const startedAt = Date.now()
  const attempts: SolverAttempt[] = []
  let bounds = resolveInitialBounds(args.graph, args.config)

  for (let iteration = 1; iteration <= args.config.maxIterations; iteration += 1) {
    if (args.shouldCancel()) {
      return createUnknownSolution(attempts, Date.now() - startedAt, bounds)
    }

    const solver = new args.ctx.Solver()
    const { varsByNodeId } = buildPlacementConstraints(args.ctx, solver, args.graph, bounds)
    const result = await solver.check()

    if (result === 'sat') {
      const model = solver.model()
      const baseSolution = extractSatSolution({
        graph: args.graph,
        model,
        varsByNodeId,
        attempts,
        elapsedMs: Date.now() - startedAt,
        bounds,
      })

      const routed = routeConveyorsForSolution(args.graph, baseSolution)
      if (!routed.ok) {
        const failedAttempt: SolverAttempt = {
          iteration,
          width: bounds.width,
          height: bounds.height,
          status: 'unsat',
        }
        attempts.push(failedAttempt)
        args.onProgress(failedAttempt)
        solver.release()
        bounds = expandBounds(bounds, args.config, iteration)
        continue
      }

      const solution: LayoutSolution = {
        ...baseSolution,
        conveyors: routed.conveyors,
        attempts: [...attempts],
      }

      const satAttempt: SolverAttempt = {
        iteration,
        width: bounds.width,
        height: bounds.height,
        status: 'sat',
      }
      attempts.push(satAttempt)
      args.onProgress(satAttempt)
      solver.release()
      return solution
    }

    if (result === 'unknown') {
      const attempt: SolverAttempt = {
        iteration,
        width: bounds.width,
        height: bounds.height,
        status: 'unknown',
      }
      attempts.push(attempt)
      args.onProgress(attempt)
      solver.release()
      return createUnknownSolution(attempts, Date.now() - startedAt, bounds)
    }

    const attempt: SolverAttempt = {
      iteration,
      width: bounds.width,
      height: bounds.height,
      status: 'unsat',
    }
    attempts.push(attempt)
    args.onProgress(attempt)
    solver.release()
    bounds = expandBounds(bounds, args.config, iteration)
  }

  return createUnsatSolution(attempts, Date.now() - startedAt, bounds)
}
