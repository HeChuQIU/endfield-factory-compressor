import type { SolverConfig, FixedDimensionMode } from '../../types/models'

interface ConfigPanelProps {
  config: SolverConfig
  onChange: (config: SolverConfig) => void
}

export function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  const update = (patch: Partial<SolverConfig>) => {
    onChange({ ...config, ...patch })
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-300">求解配置</h2>
      <div className="space-y-3 text-xs">
        <div className="flex items-center gap-2">
          <label className="w-20 text-gray-400">初始宽度</label>
          <input
            type="number"
            className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-gray-200"
            placeholder="自动"
            value={config.initialWidth ?? ''}
            onChange={(e) =>
              update({ initialWidth: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-20 text-gray-400">初始高度</label>
          <input
            type="number"
            className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-gray-200"
            placeholder="自动"
            value={config.initialHeight ?? ''}
            onChange={(e) =>
              update({ initialHeight: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-20 text-gray-400">固定维度</label>
          <select
            className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-gray-200"
            value={config.fixedDimensionMode}
            onChange={(e) =>
              update({ fixedDimensionMode: e.target.value as FixedDimensionMode })
            }
          >
            <option value="none">无</option>
            <option value="width">固定宽度</option>
            <option value="height">固定高度</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-20 text-gray-400">扩展步长</label>
          <input
            type="number"
            className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-gray-200"
            min={1}
            value={config.expansionStep}
            onChange={(e) => update({ expansionStep: Number(e.target.value) || 1 })}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-20 text-gray-400">最大迭代</label>
          <input
            type="number"
            className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-gray-200"
            min={1}
            value={config.maxIterations}
            onChange={(e) => update({ maxIterations: Number(e.target.value) || 50 })}
          />
        </div>
      </div>
    </div>
  )
}
