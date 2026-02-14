import type { BuildingDef, BuildingType } from './types'

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  filler: {
    type: 'filler',
    name: '灌装机',
    width: 3,
    length: 6,
    inputCount: 6,
    outputCount: 6,
  },
  grinder: {
    type: 'grinder',
    name: '研磨机',
    width: 3,
    length: 6,
    inputCount: 6,
    outputCount: 6,
  },
  molder: {
    type: 'molder',
    name: '塑形机',
    width: 3,
    length: 3,
    inputCount: 3,
    outputCount: 3,
  },
  refinery: {
    type: 'refinery',
    name: '精炼炉',
    width: 3,
    length: 3,
    inputCount: 3,
    outputCount: 3,
  },
  crusher: {
    type: 'crusher',
    name: '粉碎机',
    width: 3,
    length: 3,
    inputCount: 3,
    outputCount: 3,
  },
}

export function footprintArea(type: BuildingType): number {
  const def = BUILDINGS[type]
  return def.width * def.length
}
