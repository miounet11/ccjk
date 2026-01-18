import type { Agent } from './types.js'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useState } from 'react'

interface AgentDashboardProps {
  sessionId?: string
  refreshInterval?: number
  maxAgents?: number
}

interface AgentCardProps {
  agent: Agent
}

function ProgressBar({ current, total, width = 20 }: { current: number, total: number, width?: number }) {
  const percentage = total > 0 ? Math.min(100, Math.floor((current / total) * 100)) : 0
  const filledWidth = Math.floor((percentage / 100) * width)
  const emptyWidth = width - filledWidth

  const filled = '█'.repeat(filledWidth)
  const empty = '░'.repeat(emptyWidth)

  let color: 'green' | 'yellow' | 'red' = 'green'
  if (percentage < 30)
    color = 'red'
  else if (percentage < 70)
    color = 'yellow'

  return (
    <Box>
      <Text color={color}>{filled}</Text>
      <Text dimColor>{empty}</Text>
      <Text dimColor>
        {' '}
        {percentage}
        %
      </Text>
    </Box>
  )
}

function AgentCard({ agent }: AgentCardProps) {
  const statusColors = {
    idle: 'gray',
    working: 'cyan',
    waiting: 'yellow',
    error: 'red',
    completed: 'green',
  }

  const statusIcons = {
    idle: '⏸',
    working: '⚙',
    waiting: '⏳',
    error: '✖',
    completed: '✓',
  }

  const statusColor = statusColors[agent.status]
  const statusIcon = statusIcons[agent.status]

  const duration = Math.floor((Date.now() - agent.startTime.getTime()) / 1000)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  const durationStr = `${minutes}m ${seconds}s`

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={statusColor}
      paddingX={1}
      paddingY={0}
      marginBottom={1}
    >
      {/* Header */}
      <Box justifyContent="space-between">
        <Box>
          <Text color={statusColor}>{statusIcon}</Text>
          <Text bold>
            {' '}
            {agent.role}
          </Text>
        </Box>
        <Text dimColor>{durationStr}</Text>
      </Box>

      {/* Status */}
      <Box marginTop={0}>
        <Text color={statusColor}>{agent.status.toUpperCase()}</Text>
      </Box>

      {/* Current task */}
      {agent.currentTask && (
        <Box marginTop={0}>
          <Text dimColor>Task: </Text>
          <Text>{agent.currentTask}</Text>
        </Box>
      )}

      {/* Progress */}
      <Box marginTop={0} flexDirection="column">
        <Box>
          <Text dimColor>
            Progress:
            {' '}
            {agent.completedTasks}
            /
            {agent.totalTasks}
            {' '}
            tasks
          </Text>
        </Box>
        <ProgressBar current={agent.completedTasks} total={agent.totalTasks} width={30} />
      </Box>
    </Box>
  )
}

export function AgentDashboard({
  sessionId,
  refreshInterval = 1000,
  maxAgents = 10,
}: AgentDashboardProps = {}) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch agents from CCM
  const fetchAgents = async () => {
    try {
      // TODO: Replace with actual CCM API call
      // For now, return mock data
      const mockAgents: Agent[] = [
        {
          id: 'agent-1',
          role: 'typescript-cli-architect',
          status: 'working',
          currentTask: 'Implementing SessionMonitor component',
          progress: 75,
          startTime: new Date(Date.now() - 1800000),
          completedTasks: 3,
          totalTasks: 4,
        },
        {
          id: 'agent-2',
          role: 'ccjk-i18n-specialist',
          status: 'waiting',
          currentTask: 'Waiting for translation keys',
          progress: 50,
          startTime: new Date(Date.now() - 1200000),
          completedTasks: 2,
          totalTasks: 4,
        },
        {
          id: 'agent-3',
          role: 'ccjk-testing-specialist',
          status: 'idle',
          progress: 0,
          startTime: new Date(Date.now() - 600000),
          completedTasks: 0,
          totalTasks: 5,
        },
        {
          id: 'agent-4',
          role: 'ccjk-config-architect',
          status: 'completed',
          currentTask: 'Configuration validation complete',
          progress: 100,
          startTime: new Date(Date.now() - 3600000),
          completedTasks: 6,
          totalTasks: 6,
        },
      ]

      setAgents(mockAgents.slice(0, maxAgents))
      setIsLoading(false)
      setError(null)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents')
      setIsLoading(false)
    }
  }

  // Auto-refresh agents
  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, refreshInterval)
    return () => clearInterval(interval)
  }, [sessionId, refreshInterval, maxAgents])

  if (isLoading) {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
          {' '}
          Loading agents...
        </Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">
          ✖ Error:
          {' '}
          {error}
        </Text>
      </Box>
    )
  }

  const activeAgents = agents.filter(a => a.status === 'working' || a.status === 'waiting')
  const completedAgents = agents.filter(a => a.status === 'completed')
  const idleAgents = agents.filter(a => a.status === 'idle')
  const errorAgents = agents.filter(a => a.status === 'error')

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">🤖 Agent Dashboard</Text>
      </Box>

      {/* Summary */}
      <Box marginBottom={1} gap={2}>
        <Box>
          <Text color="cyan">⚙ Active: </Text>
          <Text bold>{activeAgents.length}</Text>
        </Box>
        <Box>
          <Text color="green">✓ Completed: </Text>
          <Text bold>{completedAgents.length}</Text>
        </Box>
        <Box>
          <Text color="gray">⏸ Idle: </Text>
          <Text bold>{idleAgents.length}</Text>
        </Box>
        {errorAgents.length > 0 && (
          <Box>
            <Text color="red">✖ Error: </Text>
            <Text bold>{errorAgents.length}</Text>
          </Box>
        )}
      </Box>

      {/* Agent cards */}
      {agents.length === 0
        ? (
            <Box>
              <Text dimColor>No agents available</Text>
            </Box>
          )
        : (
            <Box flexDirection="column">
              {agents.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </Box>
          )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          Auto-refreshing every
          {' '}
          {refreshInterval / 1000}
          s
        </Text>
      </Box>
    </Box>
  )
}
