import type { Session } from './types.js'
import { Box, Text, useInput } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useState } from 'react'

interface SessionMonitorProps {
  refreshInterval?: number
  onSessionSelect?: (session: Session) => void
  onExit?: () => void
}

interface SessionRowProps {
  session: Session
  selected: boolean
}

function SessionRow({ session, selected }: SessionRowProps) {
  const statusColors = {
    running: 'green',
    waiting: 'yellow',
    stopped: 'gray',
    error: 'red',
  }

  const statusIcons = {
    running: '▶',
    waiting: '⏸',
    stopped: '⏹',
    error: '✖',
  }

  const bgColor = selected ? 'blue' : undefined
  const statusColor = statusColors[session.status]
  const statusIcon = statusIcons[session.status]

  const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000)
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor((duration % 3600) / 60)
  const seconds = duration % 60
  const durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return (
    <Box paddingX={1}>
      <Box width={3}>
        <Text color={statusColor} backgroundColor={bgColor}>{statusIcon}</Text>
      </Box>
      <Box width={25}>
        <Text bold={selected} backgroundColor={bgColor}>{session.name}</Text>
      </Box>
      <Box width={12}>
        <Text color={statusColor} backgroundColor={bgColor}>{session.status}</Text>
      </Box>
      <Box width={12}>
        <Text dimColor backgroundColor={bgColor}>{durationStr}</Text>
      </Box>
      <Box width={10}>
        <Text dimColor backgroundColor={bgColor}>
          {session.agentCount}
          {' '}
          agents
        </Text>
      </Box>
      <Box width={10}>
        <Text dimColor backgroundColor={bgColor}>
          {session.taskCount}
          {' '}
          tasks
        </Text>
      </Box>
    </Box>
  )
}

export function SessionMonitor({
  refreshInterval = 1000,
  onSessionSelect,
  onExit,
}: SessionMonitorProps = {}) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch sessions from CCM
  const fetchSessions = async () => {
    try {
      // TODO: Replace with actual CCM API call
      // For now, return mock data
      const mockSessions: Session[] = [
        {
          id: 'session-1',
          name: 'CCJK Development',
          status: 'running',
          startTime: new Date(Date.now() - 3600000),
          lastActivity: new Date(),
          agentCount: 3,
          taskCount: 12,
        },
        {
          id: 'session-2',
          name: 'Documentation Update',
          status: 'waiting',
          startTime: new Date(Date.now() - 1800000),
          lastActivity: new Date(Date.now() - 300000),
          agentCount: 1,
          taskCount: 5,
        },
        {
          id: 'session-3',
          name: 'Testing Suite',
          status: 'stopped',
          startTime: new Date(Date.now() - 7200000),
          lastActivity: new Date(Date.now() - 3600000),
          agentCount: 2,
          taskCount: 8,
        },
      ]

      setSessions(mockSessions)
      setIsLoading(false)
      setError(null)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
      setIsLoading(false)
    }
  }

  // Auto-refresh sessions
  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  // Keyboard navigation
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1))
    }
    else if (key.downArrow) {
      setSelectedIndex(i => Math.min(sessions.length - 1, i + 1))
    }
    else if (key.return && sessions[selectedIndex]) {
      onSessionSelect?.(sessions[selectedIndex])
    }
    else if (input === 'q') {
      onExit?.()
      process.exit(0)
    }
    else if (input === 'r') {
      setIsLoading(true)
      fetchSessions()
    }
  })

  if (isLoading) {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
          {' '}
          Loading sessions...
        </Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">
          ✖ Error:
          {error}
        </Text>
        <Text dimColor>Press 'r' to retry or 'q' to quit</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">📊 Active Sessions</Text>
      </Box>

      {/* Header */}
      <Box paddingX={1} marginBottom={1}>
        <Box width={3}>
          <Text bold dimColor> </Text>
        </Box>
        <Box width={25}>
          <Text bold dimColor>NAME</Text>
        </Box>
        <Box width={12}>
          <Text bold dimColor>STATUS</Text>
        </Box>
        <Box width={12}>
          <Text bold dimColor>DURATION</Text>
        </Box>
        <Box width={10}>
          <Text bold dimColor>AGENTS</Text>
        </Box>
        <Box width={10}>
          <Text bold dimColor>TASKS</Text>
        </Box>
      </Box>

      {/* Session list */}
      {sessions.length === 0
        ? (
            <Box paddingX={1}>
              <Text dimColor>No active sessions</Text>
            </Box>
          )
        : (
            sessions.map((session, i) => (
              <SessionRow
                key={session.id}
                session={session}
                selected={i === selectedIndex}
              />
            ))
          )}

      {/* Footer */}
      <Box marginTop={1} paddingX={1}>
        <Text dimColor>
          ↑↓: Navigate  ⏎: Select  r: Refresh  q: Quit
        </Text>
      </Box>
    </Box>
  )
}
