import type { MachineNode, MaterialFlowEdge, ProductionGraph } from '@shared/models/types'

function makeNodes(prefix: string, count: number, type: MachineNode['type']): MachineNode[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    label: `${prefix.toUpperCase()}-${index + 1}`,
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

for (const grinder of grindersBuckwheat) {
  edges.push({
    id: `${grinder.id}->${filler[0].id}`,
    from: grinder.id,
    to: filler[0].id,
    item: '细磨荞花粉末',
    belts: 1,
  })
}

for (const molder of molders) {
  edges.push({
    id: `${molder.id}->${filler[0].id}`,
    from: molder.id,
    to: filler[0].id,
    item: '钢制瓶',
    belts: 1,
  })
}

for (let index = 0; index < molders.length; index += 1) {
  const molder = molders[index]
  const sourceA = refineriesSteel[index * 2]
  const sourceB = refineriesSteel[index * 2 + 1]
  edges.push(
    {
      id: `${sourceA.id}->${molder.id}`,
      from: sourceA.id,
      to: molder.id,
      item: '钢块',
      belts: 1,
    },
    {
      id: `${sourceB.id}->${molder.id}`,
      from: sourceB.id,
      to: molder.id,
      item: '钢块',
      belts: 1,
    }
  )
}

for (let index = 0; index < refineriesSteel.length; index += 1) {
  edges.push({
    id: `${grindersDense[index].id}->${refineriesSteel[index].id}`,
    from: grindersDense[index].id,
    to: refineriesSteel[index].id,
    item: '致密蓝铁粉末',
    belts: 1,
  })
}

for (let index = 0; index < grindersDense.length; index += 1) {
  const sourceA = crushers[index * 2]
  const sourceB = crushers[index * 2 + 1]
  const target = grindersDense[index]

  edges.push(
    {
      id: `${sourceA.id}->${target.id}`,
      from: sourceA.id,
      to: target.id,
      item: '蓝铁粉末',
      belts: 1,
    },
    {
      id: `${sourceB.id}->${target.id}`,
      from: sourceB.id,
      to: target.id,
      item: '蓝铁粉末',
      belts: 1,
    }
  )
}

for (let index = 0; index < crushers.length; index += 1) {
  edges.push({
    id: `${refineriesBlue[index].id}->${crushers[index].id}`,
    from: refineriesBlue[index].id,
    to: crushers[index].id,
    item: '蓝铁块',
    belts: 1,
  })
}

export const premiumBuckwheatCapsuleGraph: ProductionGraph = {
  id: 'premium-buckwheat-capsule',
  targetProduct: '精选荞愈胶囊',
  targetBelts: 1,
  nodes,
  edges,
}