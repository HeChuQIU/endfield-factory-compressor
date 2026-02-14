/**
 * SignalR client wrapper for the solver hub.
 *
 * Uses @microsoft/signalr to connect to the Python backend's
 * SignalR-compatible WebSocket endpoint.
 */

import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'

import type {
  ProductionGraph,
  SolverConfig,
  SolverStreamItem,
} from '../types/models'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface SolverClient {
  readonly status: ConnectionStatus
  connect(): Promise<void>
  disconnect(): Promise<void>
  solve(
    graph: ProductionGraph,
    config: SolverConfig,
    onItem: (item: SolverStreamItem) => void,
  ): Promise<void>
}

/** Convert frontend camelCase models to backend snake_case. */
function toSnakeGraph(graph: ProductionGraph): Record<string, unknown> {
  return {
    id: graph.id,
    target_product: graph.targetProduct,
    target_belts: graph.targetBelts,
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      from_id: e.fromId,
      to_id: e.toId,
      item: e.item,
      belts: e.belts,
    })),
  }
}

function toSnakeConfig(config: SolverConfig): Record<string, unknown> {
  return {
    initial_width: config.initialWidth ?? null,
    initial_height: config.initialHeight ?? null,
    fixed_dimension_mode: config.fixedDimensionMode,
    expansion_step: config.expansionStep,
    max_iterations: config.maxIterations,
    timeout_ms_per_attempt: config.timeoutMsPerAttempt,
  }
}

/** Convert backend snake_case stream items to frontend camelCase. */
function fromSnakeStreamItem(raw: Record<string, unknown>): SolverStreamItem {
  const type = raw.type as string
  const data = raw.data as Record<string, unknown>

  if (type === 'attempt') {
    return {
      type: 'attempt',
      data: {
        iteration: data.iteration as number,
        width: data.width as number,
        height: data.height as number,
        status: data.status as 'sat' | 'unsat' | 'unknown',
      },
    }
  }

  // solution
  const bounds = data.bounds as Record<string, number>
  const placements = (data.placements as Record<string, unknown>[]).map((p) => ({
    nodeId: p.node_id as string,
    x: p.x as number,
    y: p.y as number,
    width: p.width as number,
    height: p.height as number,
  }))
  const attempts = (data.attempts as Record<string, unknown>[]).map((a) => ({
    iteration: a.iteration as number,
    width: a.width as number,
    height: a.height as number,
    status: a.status as 'sat' | 'unsat' | 'unknown',
  }))

  return {
    type: 'solution',
    data: {
      status: data.status as 'sat' | 'unsat' | 'unknown',
      bounds: { width: bounds.width, height: bounds.height },
      placements,
      conveyors: [],
      attempts,
      elapsedMs: data.elapsed_ms as number,
    },
  }
}

export function createSolverClient(url?: string): SolverClient {
  const hubUrl = url ?? 'https://localhost:7238/solver'
  let connection: HubConnection | null = null
  let currentStatus: ConnectionStatus = 'disconnected'

  const client: SolverClient = {
    get status() {
      return currentStatus
    },

    async connect() {
      if (connection?.state === HubConnectionState.Connected) return

      currentStatus = 'connecting'
      connection = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build()

      connection.onclose(() => {
        currentStatus = 'disconnected'
      })
      connection.onreconnecting(() => {
        currentStatus = 'connecting'
      })
      connection.onreconnected(() => {
        currentStatus = 'connected'
      })

      try {
        await connection.start()
        currentStatus = 'connected'
      } catch {
        currentStatus = 'error'
        throw new Error('Failed to connect to solver backend')
      }
    },

    async disconnect() {
      if (connection) {
        await connection.stop()
        connection = null
        currentStatus = 'disconnected'
      }
    },

    async solve(graph, config, onItem) {
      if (!connection || connection.state !== HubConnectionState.Connected) {
        throw new Error('Not connected to solver backend')
      }

      const snakeGraph = toSnakeGraph(graph)
      const snakeConfig = toSnakeConfig(config)

      return new Promise<void>((resolve, reject) => {
        const stream = connection!.stream('solve', snakeGraph, snakeConfig)

        stream.subscribe({
          next: (raw) => {
            const item = fromSnakeStreamItem(raw as Record<string, unknown>)
            onItem(item)
          },
          error: (err) => reject(err),
          complete: () => resolve(),
        })
      })
    },
  }

  return client
}
