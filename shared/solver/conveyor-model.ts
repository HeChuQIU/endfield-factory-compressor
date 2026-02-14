import { BUILDINGS } from '../models/buildings'
import type { ConveyorSegment, LayoutSolution, PlacedBuilding, ProductionGraph } from '../models/types'

type Dir = 'up' | 'right' | 'down' | 'left'

interface PortCell {
  x: number
  y: number
}

interface RouteResult {
  ok: boolean
  conveyors: ConveyorSegment[]
}

const STEP: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  right: { dx: 1, dy: 0 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
}

function toKey(x: number, y: number): string {
  return `${x},${y}`
}

function direction(from: { x: number; y: number }, to: { x: number; y: number }): Dir {
  if (to.x > from.x) return 'right'
  if (to.x < from.x) return 'left'
  if (to.y > from.y) return 'down'
  return 'up'
}

function isHorizontal(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return a.y === b.y
}

function buildBlockedCells(placements: PlacedBuilding[]): Set<string> {
  const blocked = new Set<string>()
  for (const placement of placements) {
    for (let x = placement.x; x < placement.x + placement.width; x += 1) {
      for (let y = placement.y; y < placement.y + placement.height; y += 1) {
        blocked.add(toKey(x, y))
      }
    }
  }
  return blocked
}

function getOutputPorts(placement: PlacedBuilding): PortCell[] {
  const ports: PortCell[] = []
  for (let dx = 0; dx < placement.width; dx += 1) {
    ports.push({ x: placement.x + dx, y: placement.y + placement.height })
  }
  return ports
}

function getInputPorts(placement: PlacedBuilding): PortCell[] {
  const ports: PortCell[] = []
  for (let dx = 0; dx < placement.width; dx += 1) {
    ports.push({ x: placement.x + dx, y: placement.y - 1 })
  }
  return ports
}

function inBounds(x: number, y: number, bounds: { width: number; height: number }): boolean {
  return x >= 0 && y >= 0 && x < bounds.width && y < bounds.height
}

function bfsPath(
  start: PortCell,
  targets: Set<string>,
  bounds: { width: number; height: number },
  blocked: Set<string>,
  occupied: Map<string, 'h' | 'v' | 'hv'>
): PortCell[] | null {
  const queue: PortCell[] = [start]
  const visited = new Set<string>([toKey(start.x, start.y)])
  const prev = new Map<string, string>()

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentKey = toKey(current.x, current.y)

    if (targets.has(currentKey) && currentKey !== toKey(start.x, start.y)) {
      const path: PortCell[] = [{ x: current.x, y: current.y }]
      let key = currentKey
      while (prev.has(key)) {
        const p = prev.get(key)!
        const [px, py] = p.split(',').map(Number)
        path.push({ x: px, y: py })
        key = p
      }
      path.reverse()
      return path
    }

    for (const step of Object.values(STEP)) {
      const nx = current.x + step.dx
      const ny = current.y + step.dy
      const nextKey = toKey(nx, ny)

      if (!inBounds(nx, ny, bounds)) continue
      if (blocked.has(nextKey)) continue
      if (visited.has(nextKey)) continue

      const existing = occupied.get(nextKey)
      if (existing === 'hv') continue

      visited.add(nextKey)
      prev.set(nextKey, currentKey)
      queue.push({ x: nx, y: ny })
    }
  }

  return null
}

function commitPath(
  path: PortCell[],
  edgeId: string,
  conveyors: ConveyorSegment[],
  occupied: Map<string, 'h' | 'v' | 'hv'>
) {
  for (let index = 0; index < path.length - 1; index += 1) {
    const curr = path[index]
    const next = path[index + 1]
    const key = toKey(curr.x, curr.y)
    const axis: 'h' | 'v' = isHorizontal(curr, next) ? 'h' : 'v'
    const existing = occupied.get(key)

    if (!existing) {
      occupied.set(key, axis)
    } else if (existing !== axis) {
      occupied.set(key, 'hv')
    }

    conveyors.push({
      x: curr.x,
      y: curr.y,
      inDirection: index === 0 ? direction(curr, next) : direction(path[index - 1], curr),
      outDirection: direction(curr, next),
      isBridge: existing !== undefined && existing !== axis,
      edgeId,
    })
  }
}

export function routeConveyorsForSolution(
  graph: ProductionGraph,
  solution: LayoutSolution
): RouteResult {
  const blocked = buildBlockedCells(solution.placements)
  const occupied = new Map<string, 'h' | 'v' | 'hv'>()
  const conveyors: ConveyorSegment[] = []

  const placementById = new Map(solution.placements.map((placement) => [placement.nodeId, placement]))

  for (const edge of graph.edges) {
    const fromPlacement = placementById.get(edge.from)
    const toPlacement = placementById.get(edge.to)
    if (!fromPlacement || !toPlacement) {
      return { ok: false, conveyors: [] }
    }

    const outputs = getOutputPorts(fromPlacement)
    const inputs = getInputPorts(toPlacement)
    const inputKeys = new Set(inputs.map((cell) => toKey(cell.x, cell.y)))

    let chosenPath: PortCell[] | null = null
    for (const start of outputs) {
      const startKey = toKey(start.x, start.y)
      if (!inBounds(start.x, start.y, solution.bounds) || blocked.has(startKey)) {
        continue
      }

      const path = bfsPath(start, inputKeys, solution.bounds, blocked, occupied)
      if (path && path.length >= 3) {
        chosenPath = path
        break
      }
    }

    if (!chosenPath) {
      return { ok: false, conveyors: [] }
    }

    commitPath(chosenPath, edge.id, conveyors, occupied)
  }

  return { ok: true, conveyors }
}

export function buildPlacementFromGraph(graph: ProductionGraph): Array<{ id: string; width: number; height: number }> {
  return graph.nodes.map((node) => {
    const def = BUILDINGS[node.type]
    return {
      id: node.id,
      width: def.length,
      height: def.width,
    }
  })
}
