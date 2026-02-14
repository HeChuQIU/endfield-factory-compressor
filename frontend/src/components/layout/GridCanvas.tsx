import { useEffect, useRef } from 'react'
import type { LayoutSolution, PlacedBuilding } from '../../types/models'

const CELL_SIZE = 36
const PADDING = 1

const BUILDING_STYLES: Record<string, { fill: string; stroke: string; label: string }> = {
  filler:   { fill: '#3b82f6', stroke: '#60a5fa', label: '灌装' },
  grinder:  { fill: '#d97706', stroke: '#fbbf24', label: '研磨' },
  molder:   { fill: '#059669', stroke: '#34d399', label: '塑形' },
  refinery: { fill: '#dc2626', stroke: '#f87171', label: '精炼' },
  crusher:  { fill: '#7c3aed', stroke: '#a78bfa', label: '粉碎' },
}

function getBuildingType(nodeId: string): string {
  for (const key of Object.keys(BUILDING_STYLES)) {
    if (nodeId.startsWith(key)) return key
  }
  return 'crusher'
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  p: PlacedBuilding,
  cellSize: number,
  padding: number,
) {
  const type = getBuildingType(p.nodeId)
  const style = BUILDING_STYLES[type]

  const px = (p.x + padding) * cellSize
  const py = (p.y + padding) * cellSize
  const pw = p.width * cellSize
  const ph = p.height * cellSize

  // Fill with slight gradient effect
  ctx.fillStyle = style.fill + 'cc'
  ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2)

  // Inner highlight
  ctx.fillStyle = style.fill + '33'
  ctx.fillRect(px + 2, py + 2, pw - 4, (ph - 4) * 0.3)

  // Border
  ctx.strokeStyle = style.stroke
  ctx.lineWidth = 1.5
  ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1)

  // Label - building type abbreviation + index
  const parts = p.nodeId.split('-')
  const suffix = parts.slice(1).join('-')
  const displayLabel = suffix || p.nodeId

  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.min(11, cellSize * 0.32)}px "Segoe UI", system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Shadow for readability
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 2
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 1
  ctx.fillText(displayLabel, px + pw / 2, py + ph / 2)
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
}

interface GridCanvasProps {
  solution: LayoutSolution | null
}

export function GridCanvas({ solution }: GridCanvasProps) {
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

    // Grid dots (subtle)
    ctx.fillStyle = '#1e293b'
    for (let x = 0; x <= bounds.width; x++) {
      for (let y = 0; y <= bounds.height; y++) {
        const px = (x + PADDING) * CELL_SIZE
        const py = (y + PADDING) * CELL_SIZE
        ctx.beginPath()
        ctx.arc(px, py, 1, 0, Math.PI * 2)
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

    // Buildings
    for (const p of placements) {
      drawBuilding(ctx, p, CELL_SIZE, PADDING)
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
          (PADDING - 0.6) * CELL_SIZE,
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
  }, [solution])

  return (
    <div className="flex flex-col items-center gap-3">
      {solution?.status === 'sat' && (
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="font-mono">
            {solution.bounds.width}×{solution.bounds.height}
          </span>
          <span>{solution.placements.length} 建筑</span>
          <span>{solution.elapsedMs.toFixed(0)}ms</span>
        </div>
      )}
      <canvas ref={canvasRef} className="rounded-lg border border-gray-800" />
      {solution?.status === 'sat' && (
        <div className="flex flex-wrap justify-center gap-3 text-xs">
          {Object.entries(BUILDING_STYLES).map(([key, style]) => {
            const count = solution.placements.filter((p) => getBuildingType(p.nodeId) === key).length
            if (count === 0) return null
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: style.fill }}
                />
                <span className="text-gray-400">
                  {style.label} ×{count}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
