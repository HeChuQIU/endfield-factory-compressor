import { Badge, Button, Card, Flex, Text } from '@radix-ui/themes'
import { useState } from 'react'
import type { RuntimeDiagnostics } from '../../solver/ws-bridge'

interface DiagnosticsPanelProps {
  diagnostics: RuntimeDiagnostics
  initStatus: string
  error: string | null
}

function StatusBadge({ value }: { value: RuntimeDiagnostics['connectionState'] }) {
  const color = value === 'open' ? 'green' : value === 'connecting' ? 'orange' : 'red'
  const label =
    value === 'open'
      ? '已连接'
      : value === 'connecting'
        ? '连接中'
        : value === 'error'
          ? '错误'
          : '已断开'
  return <Badge color={color}>{label}</Badge>
}

export function DiagnosticsPanel({ diagnostics, initStatus, error }: DiagnosticsPanelProps) {
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'failed'>('idle')

  const buildReport = () => {
    const lines = [
      `time=${new Date().toISOString()}`,
      `wsUrl=${diagnostics.wsUrl}`,
      `connectionState=${diagnostics.connectionState}`,
      `lastConnectedAt=${diagnostics.lastConnectedAt ?? 'none'}`,
      `lastMessageAt=${diagnostics.lastMessageAt ?? 'none'}`,
      `initStatus=${initStatus}`,
      `userAgent=${navigator.userAgent}`,
      `error=${error ?? 'none'}`,
    ]
    return lines.join('\n')
  }

  const copyReport = async () => {
    const text = buildReport()
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (!ok) {
          throw new Error('copy-failed')
        }
      }
      setCopyState('ok')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <Card>
      <Flex direction="column" gap="2">
        <Text weight="bold">运行诊断</Text>

        <Flex justify="between" align="center">
          <Text size="2">WebSocket</Text>
          <StatusBadge value={diagnostics.connectionState} />
        </Flex>

        <Text size="1" color="gray" className="break-all">
          {diagnostics.wsUrl}
        </Text>

        <Text size="1" color="gray">
          lastConnectedAt={diagnostics.lastConnectedAt ?? '-'}
        </Text>

        <Text size="1" color="gray">
          lastMessageAt={diagnostics.lastMessageAt ?? '-'}
        </Text>

        <Text size="1" color="gray">
          initStatus={initStatus}
        </Text>

        <Flex gap="2" align="center">
          <Button size="1" variant="soft" onClick={copyReport}>
            复制诊断信息
          </Button>
          {copyState === 'ok' && (
            <Text size="1" color="green">
              已复制
            </Text>
          )}
          {copyState === 'failed' && (
            <Text size="1" color="red">
              复制失败
            </Text>
          )}
        </Flex>

        {error && (
          <Text color="red" size="1">
            {error}
          </Text>
        )}
      </Flex>
    </Card>
  )
}
