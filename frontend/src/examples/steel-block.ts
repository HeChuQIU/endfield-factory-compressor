import type { MachineNode, MaterialFlowEdge, ProductionGraph } from '../types/models'

// Simple example: 1 refinery producing 1 full belt of steel blocks
// Inputs: 1 belt dense blue iron powder + 1 belt sand leaf powder

const refinery: MachineNode = {
  id: 'refinery-1',
  label: '精炼炉-1',
  type: 'refinery',
}

const nodes: MachineNode[] = [refinery]

// For now, no explicit edges since we're testing basic machine placement
// TODO: Add input/output nodes when we extend the model
const edges: MaterialFlowEdge[] = []

export const STEEL_BLOCK: ProductionGraph = {
  id: 'steel-block',
  targetProduct: '钢块',
  targetBelts: 1,
  nodes,
  edges,
}
