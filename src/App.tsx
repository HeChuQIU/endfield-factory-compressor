import { Badge, Container, Flex, Heading, Select } from '@radix-ui/themes'
import { useMemo, useState } from 'react'
import { GridCanvas } from './components/layout/GridCanvas'
import { ConfigPanel } from './components/panels/ConfigPanel'
import { DiagnosticsPanel } from './components/panels/DiagnosticsPanel'
import { ProductionChainPanel } from './components/panels/ProductionChainPanel'
import { SolverPanel } from './components/panels/SolverPanel'
import { AVAILABLE_TARGETS, buildProductionGraph } from './core/production-graph'
import type { SolverConfig } from '@shared/models/types'
import { estimateInitialBounds } from '@shared/solver/optimizer'
import { useSolver } from './solver/ws-bridge'

const DEFAULT_CONFIG: SolverConfig = {
  fixedDimensionMode: 'none',
  expansionStep: 1,
  maxIterations: 240,
  timeoutMsPerAttempt: 3000,
}

function App() {
  const [targetProduct, setTargetProduct] = useState(AVAILABLE_TARGETS[0])
  const [config, setConfig] = useState<SolverConfig>(DEFAULT_CONFIG)
  const solver = useSolver()

  const graph = useMemo(() => buildProductionGraph(targetProduct), [targetProduct])
  const estimate = useMemo(() => estimateInitialBounds(graph), [graph])

  return (
    <Container size="4" className="h-full py-4">
      <Flex direction="column" gap="3" className="h-full">
        <Flex align="center" justify="between">
          <Heading size="5">Endfield Factory Compressor</Heading>
          <Badge>目标产物：{targetProduct}</Badge>
        </Flex>

        <Flex gap="3" className="min-h-0 flex-1">
          <Flex direction="column" gap="3" className="w-96">
            <Select.Root value={targetProduct} onValueChange={setTargetProduct}>
              <Select.Trigger />
              <Select.Content>
                {AVAILABLE_TARGETS.map((target) => (
                  <Select.Item key={target} value={target}>
                    {target}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <ConfigPanel
              estimatedWidth={estimate.width}
              estimatedHeight={estimate.height}
              config={config}
              onChange={setConfig}
            />

            <SolverPanel
              initialized={solver.initialized}
              initStatus={solver.initStatus}
              running={solver.running}
              progress={solver.progress}
              result={solver.result}
              error={solver.error}
              onSolve={() => solver.solve(graph, config)}
              onCancel={solver.cancel}
            />

            <DiagnosticsPanel
              diagnostics={solver.diagnostics}
              initStatus={solver.initStatus}
              error={solver.error}
            />
          </Flex>

          <Flex direction="column" gap="3" className="min-h-0 flex-1">
            <div className="h-[60%]">
              <GridCanvas graph={graph} solution={solver.result} />
            </div>
            <div className="h-[40%]">
              <ProductionChainPanel graph={graph} />
            </div>
          </Flex>
        </Flex>
      </Flex>
    </Container>
  )
}

export default App
