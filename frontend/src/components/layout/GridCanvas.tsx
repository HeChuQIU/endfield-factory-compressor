import { useEffect, useRef } from 'react'
import type { LayoutSolution } from '../../types/models'

const CELL_SIZE = 24
const COLORS: Record<string, string> = {
  filler: '#3b82f6',
  grinder: '#f59e0b',
  molder: '#10b981',
  refinery: '#ef4444',
  crusher: '#8b5cf6',
}

interface GridCanvasProps {
  solution: LayoutSolution | null
}

export function GridCanvas({ solution }: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!solution || solution.status !== 'sat') {
      canvas.width = 400
      canvas.height = 300
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#6b7280'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        solution ? `状态: ${solution.status}` : '等待求解...',
        canvas.width / 2,
        canvas.height / 2,
      )
      return
    }

    const { bounds, placements } = solution
    const padding = 1
    canvas.width = (bounds.width + padding * 2) * CELL_SIZE
    canvas.height = (bounds.height + padding * 2) * CELL_SIZE

    // Background
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid lines
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= bounds.width; x++) {
      const px = (x + padding) * CELL_SIZE
      ctx.beginPath()
      ctx.moveTo(px, padding * CELL_SIZE)
      ctx.lineTo(px, (bounds.height + padding) * CELL_SIZE)
      ctx.stroke()
    }
    for (let y = 0; y <= bounds.height; y++) {
      const py = (y + padding) * CELL_SIZE
      ctx.beginPath()
      ctx.moveTo(padding * CELL_SIZE, py)
      ctx.lineTo((bounds.width + padding) * CELL_SIZE, py)
      ctx.stroke()
    }

    // Bounds border
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 2
    ctx.strokeRect(
      padding * CELL_SIZE,
      padding * CELL_SIZE,
      bounds.width * CELL_SIZE,
      bounds.height * CELL_SIZE,
    )

    // Buildings
    for (const p of placements) {
      const bType = p.nodeId.split('-')[0]
      // Detect compound types like "grinder-b" vs "grinder"
      const colorKey = Object.keys(COLORS).find((k) => bType.startsWith(k)) ?? 'crusher'

      const px = (p.x + padding) * CELL_SIZE
      const py = (p.y + padding) * CELL_SIZE
      const pw = p.width * CELL_SIZE
      const ph = p.height * CELL_SIZE

      ctx.fillStyle = COLORS[colorKey] + '66' // semi-transparent
      ctx.fillRect(px, py, pw, ph)
      ctx.strokeStyle = COLORS[colorKey]
      ctx.lineWidth = 1.5
      ctx.strokeRect(px, py, pw, ph)

      // Label
      ctx.fillStyle = '#e5e7eb'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(p.nodeId, px + pw / 2, py + ph / 2)
    }
  }, [solution])

  return (
    <div className="flex flex-col items-center gap-2">
      {solution?.status === 'sat' && (
        <div className="text-xs text-gray-400">
          {solution.bounds.width}×{solution.bounds.height} | {solution.placements.length} 建筑 |{' '}
          {solution.elapsedMs.toFixed(0)}ms
        </div>
      )}
      <canvas ref={canvasRef} className="rounded border border-gray-800" />
    </div>
  )
}
