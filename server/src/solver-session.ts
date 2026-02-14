import type { WorkerRequest, WorkerResponse } from '../../shared/solver/messages'
import { solveWithIterativeBounds } from '../../shared/solver/optimizer'
import { createContext, getZ3Api } from './z3-context'

type SendFn = (message: WorkerResponse) => void

type SolvePayload = Extract<WorkerRequest, { type: 'SOLVE' }>['payload']

type CancelPayload = Extract<WorkerRequest, { type: 'CANCEL' }>['payload']

export class SolverSession {
  private currentSolveId: string | null = null
  private cancelledSolveId: string | null = null
  private running = false

  constructor(private send: SendFn) {}

  async handleMessage(message: WorkerRequest) {
    if (message.type === 'INIT') {
      await this.handleInit()
      return
    }

    if (message.type === 'CANCEL') {
      this.handleCancel(message.payload)
      return
    }

    if (message.type === 'SOLVE') {
      await this.handleSolve(message.payload)
    }
  }

  private async handleInit() {
    try {
      await getZ3Api((stage) => {
        this.send({ type: 'INIT_PROGRESS', payload: { stage } })
      })
      this.send({ type: 'INIT_DONE' })
    } catch (error) {
      this.send({
        type: 'ERROR',
        payload: { message: error instanceof Error ? error.message : String(error) },
      })
    }
  }

  private handleCancel(payload: CancelPayload) {
    if (this.currentSolveId && payload.solveId === this.currentSolveId) {
      this.cancelledSolveId = payload.solveId
      this.running = false
    }
  }

  private async handleSolve(payload: SolvePayload) {
    if (this.running && this.currentSolveId) {
      this.cancelledSolveId = this.currentSolveId
    }

    this.running = true
    this.currentSolveId = payload.solveId
    this.cancelledSolveId = null

    const solveId = payload.solveId

    let ctx: any = null
    try {
      ctx = await createContext()
      const solution = await solveWithIterativeBounds({
        ctx,
        graph: payload.graph,
        config: payload.config,
        onProgress: (attempt) => {
          if (this.currentSolveId === solveId) {
            this.send({ type: 'PROGRESS', solveId, payload: attempt })
          }
        },
        shouldCancel: () =>
          this.cancelledSolveId === solveId || (this.currentSolveId !== null && this.currentSolveId !== solveId),
      })

      if (this.currentSolveId === solveId) {
        this.send({ type: 'RESULT', solveId, payload: solution })
      }
    } catch (error) {
      if (this.currentSolveId === solveId) {
        this.send({
          type: 'ERROR',
          solveId,
          payload: { message: error instanceof Error ? error.message : String(error) },
        })
      }
    } finally {
      if (ctx && typeof ctx.dispose === 'function') {
        ctx.dispose()
      }
      if (this.currentSolveId === solveId) {
        this.running = false
      }
    }
  }
}
