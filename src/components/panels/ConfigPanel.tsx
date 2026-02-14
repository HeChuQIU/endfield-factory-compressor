import { Card, Flex, RadioCards, Text, TextField } from '@radix-ui/themes'
import type { FixedDimensionMode, SolverConfig } from '@shared/models/types'

interface ConfigPanelProps {
  estimatedWidth: number
  estimatedHeight: number
  config: SolverConfig
  onChange: (next: SolverConfig) => void
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined
  }
  return parsed
}

export function ConfigPanel({ estimatedWidth, estimatedHeight, config, onChange }: ConfigPanelProps) {
  const setFixedMode = (mode: FixedDimensionMode) => onChange({ ...config, fixedDimensionMode: mode })

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Text weight="bold">求解配置</Text>
        <Text size="2" color="gray">
          自动初始值（面积估算）：{estimatedWidth} × {estimatedHeight}
        </Text>

        <Flex gap="2">
          <Flex direction="column" gap="1" className="flex-1">
            <Text size="2">初始宽度 W</Text>
            <TextField.Root
              type="number"
              value={config.initialWidth?.toString() ?? ''}
              onChange={(event) => {
                onChange({
                  ...config,
                  initialWidth: parsePositiveInt(event.target.value),
                })
              }}
              placeholder={estimatedWidth.toString()}
            />
          </Flex>
          <Flex direction="column" gap="1" className="flex-1">
            <Text size="2">初始高度 H</Text>
            <TextField.Root
              type="number"
              value={config.initialHeight?.toString() ?? ''}
              onChange={(event) => {
                onChange({
                  ...config,
                  initialHeight: parsePositiveInt(event.target.value),
                })
              }}
              placeholder={estimatedHeight.toString()}
            />
          </Flex>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2">固定维度模式</Text>
          <RadioCards.Root
            columns={{ initial: '1', sm: '3' }}
            value={config.fixedDimensionMode}
            onValueChange={(value) => setFixedMode(value as FixedDimensionMode)}
          >
            <RadioCards.Item value="none">自由扩展</RadioCards.Item>
            <RadioCards.Item value="width">固定 W</RadioCards.Item>
            <RadioCards.Item value="height">固定 H</RadioCards.Item>
          </RadioCards.Root>
        </Flex>

        <Flex gap="2">
          <Flex direction="column" gap="1" className="flex-1">
            <Text size="2">扩展步长</Text>
            <TextField.Root
              type="number"
              value={config.expansionStep.toString()}
              onChange={(event) => {
                onChange({
                  ...config,
                  expansionStep: parsePositiveInt(event.target.value) ?? 1,
                })
              }}
            />
          </Flex>
          <Flex direction="column" gap="1" className="flex-1">
            <Text size="2">最大迭代</Text>
            <TextField.Root
              type="number"
              value={config.maxIterations.toString()}
              onChange={(event) => {
                onChange({
                  ...config,
                  maxIterations: parsePositiveInt(event.target.value) ?? 200,
                })
              }}
            />
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}