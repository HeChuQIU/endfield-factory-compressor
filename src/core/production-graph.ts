import { premiumBuckwheatCapsuleGraph } from '../examples/buckwheat-capsule'
import type { ProductionGraph } from '@shared/models/types'

export function buildProductionGraph(targetProduct: string): ProductionGraph {
  if (targetProduct === '精选荞愈胶囊') {
    return premiumBuckwheatCapsuleGraph
  }
  throw new Error(`暂不支持目标产物: ${targetProduct}`)
}

export const AVAILABLE_TARGETS = ['精选荞愈胶囊']