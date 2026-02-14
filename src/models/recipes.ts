import type { BuildingType } from '@shared/models/types'

export interface Recipe {
  id: string
  outputItem: string
  outputBelts: number
  buildingType: BuildingType
  inputs: Array<{
    item: string
    belts: number
  }>
}

export const RECIPE_CATALOG: Recipe[] = [
  {
    id: 'selected-buckwheat-capsule',
    outputItem: '精选荞愈胶囊',
    outputBelts: 1,
    buildingType: 'filler',
    inputs: [
      { item: '钢制瓶', belts: 2 },
      { item: '细磨荞花粉末', belts: 2 },
    ],
  },
  {
    id: 'fine-buckwheat-powder',
    outputItem: '细磨荞花粉末',
    outputBelts: 1,
    buildingType: 'grinder',
    inputs: [
      { item: '荞花粉末', belts: 2 },
      { item: '砂叶粉末', belts: 1 },
    ],
  },
  {
    id: 'steel-bottle',
    outputItem: '钢制瓶',
    outputBelts: 1,
    buildingType: 'molder',
    inputs: [{ item: '钢块', belts: 2 }],
  },
  {
    id: 'steel-ingot',
    outputItem: '钢块',
    outputBelts: 1,
    buildingType: 'refinery',
    inputs: [{ item: '致密蓝铁粉末', belts: 1 }],
  },
  {
    id: 'dense-blue-iron-powder',
    outputItem: '致密蓝铁粉末',
    outputBelts: 1,
    buildingType: 'grinder',
    inputs: [
      { item: '蓝铁粉末', belts: 2 },
      { item: '砂叶粉末', belts: 1 },
    ],
  },
  {
    id: 'blue-iron-powder',
    outputItem: '蓝铁粉末',
    outputBelts: 1,
    buildingType: 'crusher',
    inputs: [{ item: '蓝铁块', belts: 1 }],
  },
  {
    id: 'blue-iron-ingot',
    outputItem: '蓝铁块',
    outputBelts: 1,
    buildingType: 'refinery',
    inputs: [{ item: '蓝铁矿', belts: 1 }],
  },
]