import { useEffect, useMemo, useRef, useState } from 'react'
import type { LayoutSolution, ProductionGraph, SolverAttempt, SolverConfig } from '@shared/models/types'
import type { WorkerRequest, WorkerResponse } from '@shared/solver/messages'

export interface RuntimeDiagnostics {
  wsUrl: string
  connectionState: 'connecting' | 'open' | 'closed' | 'error'
  lastConnectedAt: string | null
  lastMessageAt: string | null
}

export interface SolverState {
  initialized: boolean
  running: boolean
  progress: SolverAttempt[]
  result: LayoutSolution | null
  error: string | null
  initStatus: string
  diagnostics: RuntimeDiagnostics
}

function createSolveId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function resolveWsUrl() {
  const envUrl = import.meta.env.VITE_SOLVER_WS_URL
  if (envUrl && typeof envUrl === 'string') {
    return envUrl
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/ws`
}

export function useSolver() {
  const wsUrl = useMemo(() => resolveWsUrl(), [])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<number | null>(null)
  const reconnectAttempts = useRef(0)
  const currentSolveId = useRef<string | null>(null)

  const [state, setState] = useState<SolverState>({
    initialized: false,
    running: false,
    progress: [],
    result: null,
    error: null,
    initStatus: '等待连接',
    diagnostics: {
      wsUrl,
      connectionState: 'connecting',
      lastConnectedAt: null,
      lastMessageAt: null,
    },
  })

  useEffect(() => {
    let closedByEffect = false

    const updateDiagnostics = (patch: Partial<RuntimeDiagnostics>) => {
      setState((prev) => ({
        ...prev,
        diagnostics: { ...prev.diagnostics, ...patch },
      }))
    }

    const scheduleReconnect = () => {
      if (closedByEffect) return
      if (reconnectTimer.current !== null) {
        window.clearTimeout(reconnectTimer.current)
      }
      const attempt = reconnectAttempts.current
      const delay = Math.min(1000 * 2 ** attempt, 10000)
      reconnectTimer.current = window.setTimeout(() => {
        reconnectAttempts.current += 1
        connect()
      }, delay)
    }

    const connect = () => {
      updateDiagnostics({ connectionState: 'connecting' })
      setState((prev) => ({
        ...prev,
        initialized: false,
        running: false,
        initStatus: '连接中…',
      }))

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempts.current = 0
        updateDiagnostics({
          connectionState: 'open',
          lastConnectedAt: new Date().toISOString(),
        })
        setState((prev) => ({
          ...prev,
          initStatus: '连接成功，初始化中…',
          error: null,
        }))
        ws.send(JSON.stringify({ type: 'INIT' } satisfies WorkerRequest))
      }

      ws.onmessage = (event) => {
        updateDiagnostics({ lastMessageAt: new Date().toISOString() })

        let message: WorkerResponse
        try {
          message = JSON.parse(event.data)
        } catch {
          setState((prev) => ({
            ...prev,
            error: '收到无法解析的服务端消息。',
          }))
          return
        }

        if (message.type === 'INIT_DONE') {
          setState((prev) => ({ ...prev, initialized: true, initStatus: '初始化完成' }))
        }
        if (message.type === 'INIT_PROGRESS') {
          setState((prev) => ({ ...prev, initStatus: message.payload.stage }))
        }
        if (message.type === 'PROGRESS') {
          if (message.solveId && message.solveId !== currentSolveId.current) {
            return
          }
          setState((prev) => ({ ...prev, progress: [...prev.progress, message.payload] }))
        }
        if (message.type === 'RESULT') {
          if (message.solveId && message.solveId !== currentSolveId.current) {
            return
          }
          setState((prev) => ({
            ...prev,
            running: false,
            result: message.payload,
          }))
        }
        if (message.type === 'ERROR') {
          if (message.solveId && message.solveId !== currentSolveId.current) {
            return
          }
          setState((prev) => ({ ...prev, running: false, error: message.payload.message }))
        }
      }

      ws.onerror = () => {
        updateDiagnostics({ connectionState: 'error' })
        setState((prev) => ({
          ...prev,
          running: false,
          error: 'WebSocket 连接出现错误。',
        }))
      }

      ws.onclose = () => {
        currentSolveId.current = null
        updateDiagnostics({ connectionState: 'closed' })
        setState((prev) => ({
          ...prev,
          initialized: false,
          running: false,
          initStatus: '连接断开，等待重连…',
        }))
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      closedByEffect = true
      if (reconnectTimer.current !== null) {
        window.clearTimeout(reconnectTimer.current)
      }
      wsRef.current?.close()
    }
  }, [wsUrl])

  const solve = (graph: ProductionGraph, config: SolverConfig) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setState((prev) => ({
        ...prev,
        running: false,
        error: 'WebSocket 未连接，无法开始求解。',
      }))
      return
    }

    const solveId = createSolveId()
    currentSolveId.current = solveId

    setState((prev) => ({
      ...prev,
      running: true,
      progress: [],
      result: null,
      error: null,
      initStatus: prev.initialized ? '初始化完成' : prev.initStatus,
    }))

    wsRef.current.send(
      JSON.stringify({
        type: 'SOLVE',
        payload: { graph, config, solveId },
      } satisfies WorkerRequest)
    )
  }

  const cancel = () => {
    const solveId = currentSolveId.current
    if (!solveId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'CANCEL',
        payload: { solveId },
      } satisfies WorkerRequest)
    )

    setState((prev) => ({ ...prev, running: false }))
  }

  return {
    ...state,
    solve,
    cancel,
  }
}
