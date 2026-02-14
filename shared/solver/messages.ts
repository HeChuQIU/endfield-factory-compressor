import type { LayoutSolution, ProductionGraph, SolverAttempt, SolverConfig } from '../models/types'

export interface InitRequest {
  type: 'INIT'
}

export interface SolveRequest {
  type: 'SOLVE'
  payload: {
    graph: ProductionGraph
    config: SolverConfig
    solveId: string
  }
}

export interface CancelRequest {
  type: 'CANCEL'
  payload: {
    solveId: string
  }
}

export type WorkerRequest = InitRequest | SolveRequest | CancelRequest

export interface InitDoneResponse {
  type: 'INIT_DONE'
}

export interface InitProgressResponse {
  type: 'INIT_PROGRESS'
  payload: {
    stage: string
  }
}

export interface ProgressResponse {
  type: 'PROGRESS'
  solveId: string
  payload: SolverAttempt
}

export interface ResultResponse {
  type: 'RESULT'
  solveId: string
  payload: LayoutSolution
}

export interface ErrorResponse {
  type: 'ERROR'
  payload: {
    message: string
  }
  solveId?: string
}

export type WorkerResponse =
  | InitDoneResponse
  | InitProgressResponse
  | ProgressResponse
  | ResultResponse
  | ErrorResponse
