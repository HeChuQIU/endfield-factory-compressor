import type { SolverAttempt } from '../../types/models'

interface SolverPanelProps {
  onSolve: () => void
  solving: boolean
  connected: boolean
  attempts: SolverAttempt[]
  error: string | null
}

export function SolverPanel({ onSolve, solving, connected, attempts, error }: SolverPanelProps) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-300">求解器</h2>

      <button
        onClick={onSolve}
        disabled={solving || !connected}
        className="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-40"
      >
        {solving ? '求解中...' : '开始求解'}
      </button>

      {error && (
        <div className="mt-2 rounded bg-red-900/50 px-3 py-2 text-xs text-red-300">{error}</div>
      )}

      {attempts.length > 0 && (
        <div className="mt-3 max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left">#</th>
                <th className="text-left">尺寸</th>
                <th className="text-left">结果</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.iteration} className="border-t border-gray-800">
                  <td className="py-1 text-gray-400">{a.iteration}</td>
                  <td className="py-1 text-gray-300">
                    {a.width}×{a.height}
                  </td>
                  <td className="py-1">
                    <span
                      className={
                        a.status === 'sat'
                          ? 'text-green-400'
                          : a.status === 'unsat'
                            ? 'text-red-400'
                            : 'text-yellow-400'
                      }
                    >
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
