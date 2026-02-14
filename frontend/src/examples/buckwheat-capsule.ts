import type { MachineNode, MaterialFlowEdge, ProductionGraph } from '../types/models'

function makeNodes(prefix: string, count: number, type: MachineNode['type']): MachineNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    label: `${prefix.toUpperCase()}-${i + 1}`,
    type,
  }))
}

const filler: MachineNode[] = [{ id: 'filler-1', label: '灌装机-1', type: 'filler' }]
const grindersBuckwheat = makeNodes('grinder-b', 2, 'grinder')
const molders = makeNodes('molder', 2, 'molder')
const refineriesSteel = makeNodes('refinery-s', 4, 'refinery')
const grindersDense = makeNodes('grinder-d', 4, 'grinder')
const crushers = makeNodes('crusher', 8, 'crusher')
const refineriesBlue = makeNodes('refinery-b', 8, 'refinery')

const nodes: MachineNode[] = [
  ...filler,
  ...grindersBuckwheat,
  ...molders,
  ...refineriesSteel,
  ...grindersDense,
  ...crushers,
  ...refineriesBlue,
]

const edges: MaterialFlowEdge[] = []

// 细磨荞花粉末 → 灌装机
for (const grinder of grindersBuckwheat) {
  edges.push({
    id: `${grinder.id}->${filler[0].id}`,
    fromId: grinder.id,
    toId: filler[0].id,
    item: '细磨荞花粉末',
    belts: 1,
  })
}

// 钢制瓶 → 灌装机
for (const molder of molders) {
  edges.push({
    id: `${molder.id}->${filler[0].id}`,
    fromId: molder.id,
    toId: filler[0].id,
    item: '钢制瓶',
    belts: 1,
  })
}

// 钢块 → 塑形机
for (let i = 0; i < molders.length; i++) {
  const molder = molders[i]
  const sourceA = refineriesSteel[i * 2]
  const sourceB = refineriesSteel[i * 2 + 1]
  edges.push(
    { id: `${sourceA.id}->${molder.id}`, fromId: sourceA.id, toId: molder.id, item: '钢块', belts: 1 },
    { id: `${sourceB.id}->${molder.id}`, fromId: sourceB.id, toId: molder.id, item: '钢块', belts: 1 },
  )
}

// 致密蓝铁粉末 → 精炼炉(钢)
for (let i = 0; i < refineriesSteel.length; i++) {
  edges.push({
    id: `${grindersDense[i].id}->${refineriesSteel[i].id}`,
    fromId: grindersDense[i].id,
    toId: refineriesSteel[i].id,
    item: '致密蓝铁粉末',
    belts: 1,
  })
}

// 蓝铁矿石粉末 → 研磨机(致密)
for (let i = 0; i < grindersDense.length; i++) {
  const crusherA = crushers[i * 2]
  const crusherB = crushers[i * 2 + 1]
  edges.push(
    { id: `${crusherA.id}->${grindersDense[i].id}`, fromId: crusherA.id, toId: grindersDense[i].id, item: '蓝铁矿石粉末', belts: 1 },
    { id: `${crusherB.id}->${grindersDense[i].id}`, fromId: crusherB.id, toId: grindersDense[i].id, item: '蓝铁矿石粉末', belts: 1 },
  )
}

// 蓝铁矿石 → 精炼炉(蓝) → 粉碎机
for (let i = 0; i < crushers.length; i++) {
  edges.push({
    id: `${refineriesBlue[i].id}->${crushers[i].id}`,
    fromId: refineriesBlue[i].id,
    toId: crushers[i].id,
    item: '蓝铁矿石',
    belts: 1,
  })
}

export const BUCKWHEAT_CAPSULE: ProductionGraph = {
  id: 'buckwheat-capsule',
  targetProduct: '精选荞愈胶囊',
  targetBelts: 1,
  nodes,
  edges,
}
