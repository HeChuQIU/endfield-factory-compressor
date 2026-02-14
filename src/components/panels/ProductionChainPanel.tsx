import { Card, Flex, ScrollArea, Table, Tabs, Text } from '@radix-ui/themes'
import { BUILDINGS } from '@shared/models/buildings'
import type { ProductionGraph } from '@shared/models/types'

interface ProductionChainPanelProps {
  graph: ProductionGraph
}

export function ProductionChainPanel({ graph }: ProductionChainPanelProps) {
  return (
    <Card>
      <Tabs.Root defaultValue="nodes">
        <Tabs.List>
          <Tabs.Trigger value="nodes">建筑清单</Tabs.Trigger>
          <Tabs.Trigger value="edges">流量连接</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="nodes">
          <ScrollArea type="always" scrollbars="vertical" style={{ height: 280 }}>
            <Table.Root variant="surface" size="1">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>类型</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>尺寸</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {graph.nodes.map((node) => {
                  const def = BUILDINGS[node.type]
                  return (
                    <Table.Row key={node.id}>
                      <Table.Cell>{node.id}</Table.Cell>
                      <Table.Cell>{def.name}</Table.Cell>
                      <Table.Cell>
                        {def.length}×{def.width}
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          </ScrollArea>
        </Tabs.Content>

        <Tabs.Content value="edges">
          <ScrollArea type="always" scrollbars="vertical" style={{ height: 280 }}>
            <Flex direction="column" gap="1">
              {graph.edges.map((edge) => (
                <Text key={edge.id} size="1" color="gray">
                  {edge.from} → {edge.to} · {edge.item} · {edge.belts} 满带
                </Text>
              ))}
            </Flex>
          </ScrollArea>
        </Tabs.Content>
      </Tabs.Root>
    </Card>
  )
}