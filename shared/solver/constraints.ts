import { BUILDINGS } from '../models/buildings'
import type { ProductionGraph } from '../models/types'

interface NodeVars {
  x: any
  y: any
}

export interface ConstraintBuildResult {
  varsByNodeId: Record<string, NodeVars>
}

export function buildPlacementConstraints(
  ctx: any,
  solver: any,
  graph: ProductionGraph,
  bounds: { width: number; height: number }
): ConstraintBuildResult {
  const varsByNodeId: Record<string, NodeVars> = {}
  const { Or } = ctx

  for (const node of graph.nodes) {
    const x = ctx.Int.const(`${node.id}_x`)
    const y = ctx.Int.const(`${node.id}_y`)
    const def = BUILDINGS[node.type]

    varsByNodeId[node.id] = { x, y }
    solver.add(x.ge(0), y.ge(0))
    solver.add(x.add(def.length).le(bounds.width))
    solver.add(y.add(def.width).le(bounds.height))
  }

  if (graph.nodes.length > 0) {
    const anchorNode = graph.nodes[0]
    const anchorVars = varsByNodeId[anchorNode.id]
    solver.add(anchorVars.x.eq(0), anchorVars.y.eq(0))
  }

  for (let left = 0; left < graph.nodes.length; left += 1) {
    for (let right = left + 1; right < graph.nodes.length; right += 1) {
      const nodeA = graph.nodes[left]
      const nodeB = graph.nodes[right]
      const varsA = varsByNodeId[nodeA.id]
      const varsB = varsByNodeId[nodeB.id]
      const defA = BUILDINGS[nodeA.type]
      const defB = BUILDINGS[nodeB.type]

      solver.add(
        Or(
          varsA.x.add(defA.length).le(varsB.x),
          varsB.x.add(defB.length).le(varsA.x),
          varsA.y.add(defA.width).le(varsB.y),
          varsB.y.add(defB.width).le(varsA.y)
        )
      )
    }
  }

  return { varsByNodeId }
}
