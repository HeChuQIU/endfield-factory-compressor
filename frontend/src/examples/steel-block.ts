import type { MachineNode, MaterialFlowEdge, ProductionGraph } from '../types/models'

// Complete steel block production line for 1 full belt output
// Starting from raw materials: blue iron ore (蓝铁矿) and sand leaf powder (砂叶粉末)

// Steel production (final stage): 1 refinery
const refinerySteel: MachineNode = {
  id: 'refinery-steel',
  label: '精炼炉-钢',
  type: 'refinery',
}

// Dense blue iron powder production: 1 grinder
const grinderDense: MachineNode = {
  id: 'grinder-dense',
  label: '研磨机-致密',
  type: 'grinder',
}

// Blue iron powder production: 2 crushers (each produces 1 belt)
const crusher1: MachineNode = {
  id: 'crusher-1',
  label: '粉碎机-1',
  type: 'crusher',
}

const crusher2: MachineNode = {
  id: 'crusher-2',
  label: '粉碎机-2',
  type: 'crusher',
}

// Blue iron block production: 2 refineries (each produces 1 belt)
const refineryBlue1: MachineNode = {
  id: 'refinery-blue-1',
  label: '精炼炉-蓝铁-1',
  type: 'refinery',
}

const refineryBlue2: MachineNode = {
  id: 'refinery-blue-2',
  label: '精炼炉-蓝铁-2',
  type: 'refinery',
}

const nodes: MachineNode[] = [
  refinerySteel,
  grinderDense,
  crusher1,
  crusher2,
  refineryBlue1,
  refineryBlue2,
]

// Material flow edges defining the production chain
const edges: MaterialFlowEdge[] = [
  // Dense blue iron powder (1 belt) -> Steel refinery
  {
    id: 'grinder-dense->refinery-steel',
    fromId: 'grinder-dense',
    toId: 'refinery-steel',
    item: '致密蓝铁粉末',
    belts: 1,
  },
  // Blue iron powder (1 belt each) -> Dense grinder (needs 2 belts total)
  {
    id: 'crusher-1->grinder-dense',
    fromId: 'crusher-1',
    toId: 'grinder-dense',
    item: '蓝铁粉末',
    belts: 1,
  },
  {
    id: 'crusher-2->grinder-dense',
    fromId: 'crusher-2',
    toId: 'grinder-dense',
    item: '蓝铁粉末',
    belts: 1,
  },
  // Blue iron blocks (1 belt each) -> Crushers
  {
    id: 'refinery-blue-1->crusher-1',
    fromId: 'refinery-blue-1',
    toId: 'crusher-1',
    item: '蓝铁块',
    belts: 1,
  },
  {
    id: 'refinery-blue-2->crusher-2',
    fromId: 'refinery-blue-2',
    toId: 'crusher-2',
    item: '蓝铁块',
    belts: 1,
  },
]

export const STEEL_BLOCK: ProductionGraph = {
  id: 'steel-block',
  targetProduct: '钢块',
  targetBelts: 1,
  nodes,
  edges,
}
