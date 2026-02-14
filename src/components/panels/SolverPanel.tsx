import { Badge, Button, Card, Flex, ScrollArea, Text } from '@radix-ui/themes'
import type { LayoutSolution, SolverAttempt } from '@shared/models/types'

interface SolverPanelProps {
  initialized: boolean
  initStatus: string
  running: boolean
  progress: SolverAttempt[]
  result: LayoutSolution | null
  error: string | null
  onSolve: () => void
  onCancel: () => void
}

export function SolverPanel({
  initialized,
  initStatus,
  running,
  progress,
  result,
  error,
  onSolve,
  onCancel,
}: SolverPanelProps) {
  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Text weight="bold">求解控制</Text>
          <Badge color={initialized ? 'green' : 'orange'}>
            {initialized ? 'Z3 已就绪' : `初始化中：${initStatus}`}
          </Badge>
        </Flex>

        <Flex gap="2">
          <Button disabled={!initialized || running} onClick={onSolve}>
            开始求解
          </Button>
          <Button variant="soft" color="red" disabled={!running} onClick={onCancel}>
            取消
          </Button>
        </Flex>

        {result && (
          <Flex gap="2" wrap="wrap">
            <Badge color={result.status === 'sat' ? 'green' : 'orange'}>{result.status}</Badge>
            <Badge>Bounds: {result.bounds.width}×{result.bounds.height}</Badge>
            <Badge>迭代: {result.attempts.length}</Badge>
            <Badge>传送带: {result.conveyors.length}</Badge>
            <Badge>耗时: {result.elapsedMs}ms</Badge>
          </Flex>
        )}

        {error && (
          <Text color="red" size="2">
            {error}
          </Text>
        )}

        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            迭代日志
          </Text>
          <ScrollArea type="always" scrollbars="vertical" style={{ height: 160 }}>
            <Flex direction="column" gap="1">
              {progress.map((attempt) => (
                <Text key={attempt.iteration} size="1" color="gray">
                  #{attempt.iteration} 尝试 {attempt.width}×{attempt.height} → {attempt.status}
                </Text>
              ))}
              {progress.length === 0 && (
                <Text size="1" color="gray">
                  尚无迭代记录
                </Text>
              )}
            </Flex>
          </ScrollArea>
        </Flex>
      </Flex>
    </Card>
  )
}