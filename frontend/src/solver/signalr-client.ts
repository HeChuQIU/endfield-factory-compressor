/**
 * SignalR client wrapper for the solver hub.
 *
 * Uses @microsoft/signalr to connect to the ASP.NET Core backend's
 * SignalR Hub endpoint.
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
  SolverAttempt,
  LayoutSolution,
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

/**
 * Parse a stream item from the ASP.NET Core SignalR hub.
 * The hub serializes C# objects as camelCase JSON, which matches
 * our TypeScript interfaces directly.
 */
function parseStreamItem(raw: Record<string, unknown>): SolverStreamItem {
  const type = raw.type as string
  const data = raw.data as Record<string, unknown>

  if (type === 'attempt') {
    return {
      type: 'attempt',
      data: data as unknown as SolverAttempt,
    }
  }

  // solution - bounds comes as a Dictionary<string,int> → plain object
  return {
    type: 'solution',
    data: data as unknown as LayoutSolution,
  }
}

export function createSolverClient(url?: string): SolverClient {
  const hubUrl = url ?? 'http://localhost:5049/solver'
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

      return new Promise<void>((resolve, reject) => {
        const stream = connection!.stream('Solve', graph, config)

        stream.subscribe({
          next: (raw) => {
            const item = parseStreamItem(raw as Record<string, unknown>)
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
