import { Badge, Flex, Text } from '@radix-ui/themes'

interface BuildingTooltipProps {
  name: string
  size: string
  ports: string
}

export function BuildingTooltip({ name, size, ports }: BuildingTooltipProps) {
  return (
    <Flex direction="column" gap="1" className="rounded-md border border-slate-700 bg-slate-900 p-2">
      <Text size="2" weight="medium">
        {name}
      </Text>
      <Badge color="blue">{size}</Badge>
      <Text size="1" color="gray">
        {ports}
      </Text>
    </Flex>
  )
}