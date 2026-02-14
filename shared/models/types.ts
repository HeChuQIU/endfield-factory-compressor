export type BuildingType =
  | 'filler'
  | 'grinder'
  | 'molder'
  | 'refinery'
  | 'crusher'

export type FixedDimensionMode = 'none' | 'width' | 'height'

export interface BuildingDef {
  type: BuildingType
  name: string
  width: number
  length: number
  inputCount: number
  outputCount: number
}

export interface MachineNode {
  id: string
  label: string
  type: BuildingType
}

export interface MaterialFlowEdge {
  id: string
  from: string
  to: string
  item: string
  belts: number
}

export interface ProductionGraph {
  id: string
  targetProduct: string
  targetBelts: number
  nodes: MachineNode[]
  edges: MaterialFlowEdge[]
}

export interface SolverConfig {
  initialWidth?: number
  initialHeight?: number
  fixedDimensionMode: FixedDimensionMode
  expansionStep: number
  maxIterations: number
  timeoutMsPerAttempt: number
}

export interface SolverAttempt {
  iteration: number
  width: number
  height: number
  status: 'sat' | 'unsat' | 'unknown'
}

export interface PlacedBuilding {
  nodeId: string
  x: number
  y: number
  width: number
  height: number
}

export interface ConveyorSegment {
  x: number
  y: number
  inDirection: 'up' | 'right' | 'down' | 'left'
  outDirection: 'up' | 'right' | 'down' | 'left'
  isBridge?: boolean
  edgeId?: string
}

export interface LayoutSolution {
  status: 'sat' | 'unsat' | 'unknown'
  bounds: {
    width: number
    height: number
  }
  placements: PlacedBuilding[]
  conveyors: ConveyorSegment[]
  attempts: SolverAttempt[]
  elapsedMs: number
}
