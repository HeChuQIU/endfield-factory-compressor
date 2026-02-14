import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  LayoutSolution,
  SolverAttempt,
  SolverConfig,
  SolverStreamItem,
} from './types/models'
import { createSolverClient, type ConnectionStatus } from './solver/signalr-client'
import { BUCKWHEAT_CAPSULE } from './examples/buckwheat-capsule'
import { GridCanvas } from './components/layout/GridCanvas'
import { ConfigPanel } from './components/panels/ConfigPanel'
import { SolverPanel } from './components/panels/SolverPanel'

const DEFAULT_CONFIG: SolverConfig = {
  initialWidth: null,
  initialHeight: null,
  fixedDimensionMode: 'none',
  expansionStep: 1,
  maxIterations: 50,
  timeoutMsPerAttempt: 30000,
}

export default function App() {
  const clientRef = useRef(createSolverClient())
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [config, setConfig] = useState<SolverConfig>(DEFAULT_CONFIG)
  const [attempts, setAttempts] = useState<SolverAttempt[]>([])
  const [solution, setSolution] = useState<LayoutSolution | null>(null)
  const [solving, setSolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Poll connection status
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStatus(clientRef.current.status)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const handleConnect = useCallback(async () => {
    setError(null)
    try {
      await clientRef.current.connect()
      setConnectionStatus('connected')
    } catch (err) {
      setError(String(err))
      setConnectionStatus('error')
    }
  }, [])

  const handleDisconnect = useCallback(async () => {
    await clientRef.current.disconnect()
    setConnectionStatus('disconnected')
  }, [])

  const handleSolve = useCallback(async () => {
    setError(null)
    setAttempts([])
    setSolution(null)
    setSolving(true)

    try {
      await clientRef.current.solve(BUCKWHEAT_CAPSULE, config, (item: SolverStreamItem) => {
        if (item.type === 'attempt') {
          setAttempts((prev) => [...prev, item.data])
        } else if (item.type === 'solution') {
          setSolution(item.data)
        }
      })
    } catch (err) {
      setError(String(err))
    } finally {
      setSolving(false)
    }
  }, [config])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold">Endfield Factory Compressor</h1>
        <p className="text-sm text-gray-400">终末地基建布局压缩器</p>
      </header>

      <div className="flex gap-4 p-4">
        {/* Left panel */}
        <div className="w-80 shrink-0 space-y-4">
          {/* Connection */}
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-300">连接</h2>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-green-500'
                    : connectionStatus === 'connecting'
                      ? 'bg-yellow-500'
                      : connectionStatus === 'error'
                        ? 'bg-red-500'
                        : 'bg-gray-600'
                }`}
              />
              <span className="text-xs text-gray-400">{connectionStatus}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleConnect}
                disabled={connectionStatus === 'connected' || connectionStatus === 'connecting'}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium hover:bg-blue-500 disabled:opacity-40"
              >
                连接
              </button>
              <button
                onClick={handleDisconnect}
                disabled={connectionStatus !== 'connected'}
                className="rounded bg-gray-700 px-3 py-1 text-xs font-medium hover:bg-gray-600 disabled:opacity-40"
              >
                断开
              </button>
            </div>
          </div>

          <ConfigPanel config={config} onChange={setConfig} />

          <SolverPanel
            onSolve={handleSolve}
            solving={solving}
            connected={connectionStatus === 'connected'}
            attempts={attempts}
            error={error}
          />
        </div>

        {/* Main canvas */}
        <div className="flex-1 rounded-lg border border-gray-800 bg-gray-900 p-4">
          <GridCanvas solution={solution} />
        </div>
      </div>
    </div>
  )
}
