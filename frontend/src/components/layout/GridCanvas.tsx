import { useEffect, useRef } from 'react'
import type {
  LayoutSolution,
  PlacedBuilding,
  ProductionGraph,
  MachineNode,
  MaterialFlowEdge,
} from '../../types/models'

const CELL_SIZE = 40
const PADDING = 1.5

/** Building type → visual style + Chinese name */
const BUILDING_INFO: Record<
  string,
  { fill: string; stroke: string; name: string }
> = {
  filler:  { fill: '#3b82f6', stroke: '#60a5fa', name: '灌装机' },
  grinder: { fill: '#d97706', stroke: '#fbbf24', name: '研磨机' },
  molder:  { fill: '#059669', stroke: '#34d399', name: '塑形机' },
  refinery:{ fill: '#dc2626', stroke: '#f87171', name: '精炼炉' },
  crusher: { fill: '#7c3aed', stroke: '#a78bfa', name: '粉碎机' },
}

/** Golden-angle hue assignment for material flow colors */
function getItemColor(item: string, allItems: string[]): string {
  const idx = allItems.indexOf(item)
  const hue = (idx * 137.5) % 360
  return `hsl(${hue}, 70%, 60%)`
}

/** Draw a chevron (`>` pointing into building for input, `<` pointing out for output) */
function drawChevron(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  direction: 'down' | 'up',
  color: string,
) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  if (direction === 'down') {
    // ∨ shape — input port, material flows in
    ctx.moveTo(cx - size / 2, cy - size / 3)
    ctx.lineTo(cx, cy + size / 3)
    ctx.lineTo(cx + size / 2, cy - size / 3)
  } else {
    // ∧ shape — output port, material flows out
    ctx.moveTo(cx - size / 2, cy + size / 3)
    ctx.lineTo(cx, cy - size / 3)
    ctx.lineTo(cx + size / 2, cy + size / 3)
  }
  ctx.stroke()
}

/** Draw a single building with ports and Chinese name */
function drawBuilding(
  ctx: CanvasRenderingContext2D,
  p: PlacedBuilding,
  node: MachineNode | undefined,
  cellSize: number,
  padding: number,
) {
  const type = node?.type ?? 'crusher'
  const info = BUILDING_INFO[type] ?? BUILDING_INFO.crusher

  const px = (p.x + padding) * cellSize
  const py = (p.y + padding) * cellSize
  const pw = p.width * cellSize
  const ph = p.height * cellSize

  // Body fill
  ctx.fillStyle = info.fill + 'bb'
  ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2)

  // Subtle top highlight
  ctx.fillStyle = info.fill + '22'
  ctx.fillRect(px + 2, py + 2, pw - 4, (ph - 4) * 0.25)

  // Border
  ctx.strokeStyle = info.stroke
  ctx.lineWidth = 2
  ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2)

  // Input port chevrons (∨) along top edge, inside building
  // Number of ports = building width (= def.Length, the long dimension)
  const portCount = p.width
  const chevronSize = Math.min(10, cellSize * 0.28)

  for (let i = 0; i < portCount; i++) {
    const cx = px + (i + 0.5) * cellSize
    const cy = py + chevronSize * 0.9 + 4
    drawChevron(ctx, cx, cy, chevronSize, 'down', '#4ade80')
  }

  // Output port chevrons (∧) along bottom edge, inside building
  for (let i = 0; i < portCount; i++) {
    const cx = px + (i + 0.5) * cellSize
    const cy = py + ph - chevronSize * 0.9 - 4
    drawChevron(ctx, cx, cy, chevronSize, 'up', '#fb923c')
  }

  // Building Chinese name — centered
  ctx.fillStyle = '#ffffff'
  const nameFontSize = Math.min(14, cellSize * 0.36)
  ctx.font = `bold ${nameFontSize}px "Segoe UI", "Microsoft YaHei", system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = 3
  ctx.fillText(info.name, px + pw / 2, py + ph / 2 - 5)

  // Suffix index (e.g. "b-1", "3")
  const prefix = type + '-'
  const suffix = p.nodeId.startsWith(prefix) ? p.nodeId.slice(prefix.length) : ''
  if (suffix) {
    ctx.font = `${Math.min(10, cellSize * 0.26)}px "Segoe UI", system-ui, sans-serif`
    ctx.fillStyle = '#d1d5db'
    ctx.fillText(suffix, px + pw / 2, py + ph / 2 + 10)
  }

  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
}

/** Draw conveyor connection lines between buildings based on edge data */
function drawConveyors(
  ctx: CanvasRenderingContext2D,
  edges: MaterialFlowEdge[],
  placementMap: Map<string, PlacedBuilding>,
  cellSize: number,
  padding: number,
) {
  const allItems = [...new Set(edges.map((e) => e.item))]

  // Group edges by source/destination for port distribution
  const outgoing = new Map<string, MaterialFlowEdge[]>()
  const incoming = new Map<string, MaterialFlowEdge[]>()
  for (const edge of edges) {
    if (!outgoing.has(edge.fromId)) outgoing.set(edge.fromId, [])
    outgoing.get(edge.fromId)!.push(edge)
    if (!incoming.has(edge.toId)) incoming.set(edge.toId, [])
    incoming.get(edge.toId)!.push(edge)
  }

  for (const edge of edges) {
    const from = placementMap.get(edge.fromId)
    const to = placementMap.get(edge.toId)
    if (!from || !to) continue

    const color = getItemColor(edge.item, allItems)

    // Distribute port positions across building width
    const outEdges = outgoing.get(edge.fromId)!
    const outIdx = outEdges.indexOf(edge)
    const outTotal = outEdges.length
    const fromX =
      (from.x + padding) * cellSize +
      ((outIdx + 0.5) / outTotal) * from.width * cellSize
    const fromY = (from.y + padding + from.height) * cellSize + 2

    const inEdges = incoming.get(edge.toId)!
    const inIdx = inEdges.indexOf(edge)
    const inTotal = inEdges.length
    const toX =
      (to.x + padding) * cellSize +
      ((inIdx + 0.5) / inTotal) * to.width * cellSize
    const toY = (to.y + padding) * cellSize - 2

    // Draw bezier curve
    ctx.strokeStyle = color + 'aa'
    ctx.lineWidth = 1.8
    ctx.setLineDash([])
    ctx.beginPath()
    const dy = Math.abs(toY - fromY) * 0.4
    ctx.moveTo(fromX, fromY)
    ctx.bezierCurveTo(fromX, fromY + dy, toX, toY - dy, toX, toY)
    ctx.stroke()

    // Small arrowhead at destination
    ctx.fillStyle = color + 'cc'
    const arrowSize = 5
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(toX - arrowSize, toY - arrowSize * 1.5)
    ctx.lineTo(toX + arrowSize, toY - arrowSize * 1.5)
    ctx.closePath()
    ctx.fill()
  }
}

// ─── Component ───────────────────────────────────────────────

interface GridCanvasProps {
  solution: LayoutSolution | null
  graph: ProductionGraph | null
}

export function GridCanvas({ solution, graph }: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!solution || solution.status !== 'sat') {
      const lw = 480
      const lh = 360
      canvas.width = lw * dpr
      canvas.height = lh * dpr
      canvas.style.width = `${lw}px`
      canvas.style.height = `${lh}px`
      ctx.scale(dpr, dpr)
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, lw, lh)
      ctx.fillStyle = '#64748b'
      ctx.font = '14px "Segoe UI", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        solution ? `状态: ${solution.status}` : '等待求解...',
        lw / 2,
        lh / 2,
      )
      return
    }

    const { bounds, placements } = solution
    const logicalW = (bounds.width + PADDING * 2) * CELL_SIZE
    const logicalH = (bounds.height + PADDING * 2) * CELL_SIZE

    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    canvas.style.width = `${logicalW}px`
    canvas.style.height = `${logicalH}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, logicalW, logicalH)

    // Grid dots
    ctx.fillStyle = '#1e293b'
    for (let x = 0; x <= bounds.width; x++) {
      for (let y = 0; y <= bounds.height; y++) {
        ctx.beginPath()
        ctx.arc(
          (x + PADDING) * CELL_SIZE,
          (y + PADDING) * CELL_SIZE,
          1,
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
    }

    // Bounds border
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.strokeRect(
      PADDING * CELL_SIZE,
      PADDING * CELL_SIZE,
      bounds.width * CELL_SIZE,
      bounds.height * CELL_SIZE,
    )
    ctx.setLineDash([])

    // Node lookup map
    const nodeMap = new Map<string, MachineNode>()
    if (graph) {
      for (const n of graph.nodes) nodeMap.set(n.id, n)
    }

    // Placement lookup map (for conveyor drawing)
    const placementMap = new Map<string, PlacedBuilding>()
    for (const p of placements) placementMap.set(p.nodeId, p)

    // Draw conveyor connections (behind buildings)
    if (graph) {
      drawConveyors(ctx, graph.edges, placementMap, CELL_SIZE, PADDING)
    }

    // Draw buildings
    for (const p of placements) {
      drawBuilding(ctx, p, nodeMap.get(p.nodeId), CELL_SIZE, PADDING)
    }

    // Coordinate labels
    ctx.fillStyle = '#475569'
    ctx.font = '9px "Segoe UI", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let x = 0; x < bounds.width; x++) {
      if (x % 3 === 0) {
        ctx.fillText(
          String(x),
          (x + PADDING + 0.5) * CELL_SIZE,
          (PADDING - 0.7) * CELL_SIZE,
        )
      }
    }
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let y = 0; y < bounds.height; y++) {
      if (y % 3 === 0) {
        ctx.fillText(
          String(y),
          (PADDING - 0.3) * CELL_SIZE,
          (y + PADDING + 0.5) * CELL_SIZE,
        )
      }
    }
  }, [solution, graph])

  // Build legend data
  const legend = solution?.status === 'sat'
    ? Object.entries(BUILDING_INFO)
        .map(([key, info]) => ({
          key,
          ...info,
          count: solution.placements.filter((p) => {
            const type = Object.keys(BUILDING_INFO).find((k) => p.nodeId.startsWith(k))
            return type === key
          }).length,
        }))
        .filter((l) => l.count > 0)
    : []

  // Material flow legend
  const materialLegend =
    solution?.status === 'sat' && graph
      ? [...new Set(graph.edges.map((e) => e.item))].map((item, _idx, arr) => ({
          item,
          color: getItemColor(item, arr),
        }))
      : []

  return (
    <div className="flex flex-col items-center gap-3">
      {solution?.status === 'sat' && (
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="font-mono">
            {solution.bounds.width}×{solution.bounds.height}
          </span>
          <span>{solution.placements.length} 建筑</span>
          <span>{solution.elapsedMs.toFixed(0)}ms</span>
          <span className="flex items-center gap-1">
            <span style={{ color: '#4ade80' }}>∨</span> 输入
            <span className="mx-1" style={{ color: '#fb923c' }}>∧</span> 输出
          </span>
        </div>
      )}
      <canvas ref={canvasRef} className="rounded-lg border border-gray-800" />
      {legend.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 text-xs">
          {legend.map((l) => (
            <div key={l.key} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: l.fill }}
              />
              <span className="text-gray-400">
                {l.name} ×{l.count}
              </span>
            </div>
          ))}
        </div>
      )}
      {materialLegend.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 text-xs">
          {materialLegend.map((m) => (
            <div key={m.item} className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4 rounded"
                style={{ backgroundColor: m.color }}
              />
              <span className="text-gray-500">{m.item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
