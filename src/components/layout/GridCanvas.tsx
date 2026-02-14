import { Box, Text } from '@radix-ui/themes'
import { BUILDINGS } from '@shared/models/buildings'
import type { LayoutSolution, ProductionGraph } from '@shared/models/types'

interface GridCanvasProps {
  graph: ProductionGraph
  solution: LayoutSolution | null
}

const CELL_SIZE = 24

export function GridCanvas({ graph, solution }: GridCanvasProps) {
  if (!solution || solution.status !== 'sat') {
    return (
      <Box className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-600">
        <Text color="gray">尚未生成可行布局</Text>
      </Box>
    )
  }

  const widthPx = solution.bounds.width * CELL_SIZE
  const heightPx = solution.bounds.height * CELL_SIZE

  return (
    <Box className="h-full overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3">
      <svg width={widthPx} height={heightPx} viewBox={`0 0 ${widthPx} ${heightPx}`}>
        {Array.from({ length: solution.bounds.width + 1 }).map((_, index) => (
          <line
            key={`v-${index}`}
            x1={index * CELL_SIZE}
            y1={0}
            x2={index * CELL_SIZE}
            y2={heightPx}
            stroke="#1e293b"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: solution.bounds.height + 1 }).map((_, index) => (
          <line
            key={`h-${index}`}
            x1={0}
            y1={index * CELL_SIZE}
            x2={widthPx}
            y2={index * CELL_SIZE}
            stroke="#1e293b"
            strokeWidth={1}
          />
        ))}

        {solution.placements.map((placement) => {
          const node = graph.nodes.find((item) => item.id === placement.nodeId)
          if (!node) {
            return null
          }
          const building = BUILDINGS[node.type]
          const x = placement.x * CELL_SIZE
          const y = placement.y * CELL_SIZE
          const w = placement.width * CELL_SIZE
          const h = placement.height * CELL_SIZE

          return (
            <g key={placement.nodeId}>
              <rect x={x} y={y} width={w} height={h} rx={4} fill="#0ea5e9" opacity={0.85} />
              <rect x={x} y={y} width={w} height={h} rx={4} fill="none" stroke="#e2e8f0" strokeWidth={1} />
              <text x={x + 6} y={y + 16} fill="#f8fafc" fontSize={12}>
                {building.name}
              </text>
            </g>
          )
        })}

        {solution.conveyors.map((segment, index) => {
          const cx = segment.x * CELL_SIZE + CELL_SIZE / 2
          const cy = segment.y * CELL_SIZE + CELL_SIZE / 2
          return (
            <g key={`conv-${segment.edgeId ?? 'e'}-${index}`}>
              <circle cx={cx} cy={cy} r={4} fill={segment.isBridge ? '#f97316' : '#22c55e'} opacity={0.95} />
            </g>
          )
        })}
      </svg>
    </Box>
  )
}