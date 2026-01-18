import type { LogEntry } from './types.js'
import { Box, Text, useInput } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useState } from 'react'

interface LogViewerProps {
  maxLines?: number
  refreshInterval?: number
  showTimestamps?: boolean
  showSource?: boolean
  filterLevel?: LogEntry['level'] | 'all'
  autoScroll?: boolean
}

interface LogLineProps {
  entry: LogEntry
  showTimestamps: boolean
  showSource: boolean
}

function LogLine({ entry, showTimestamps, showSource }: LogLineProps) {
  const levelColors = {
    info: 'cyan',
    warn: 'yellow',
    error: 'red',
    debug: 'gray',
    success: 'green',
  }

  const levelIcons = {
    info: 'ℹ',
    warn: '⚠',
    error: '✖',
    debug: '⚙',
    success: '✓',
  }

  const color = levelColors[entry.level]
  const icon = levelIcons[entry.level]

  const timestamp = entry.timestamp.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <Box>
      {showTimestamps && (
        <Box width={12}>
          <Text dimColor>{timestamp}</Text>
        </Box>
      )}
      <Box width={3}>
        <Text color={color}>{icon}</Text>
      </Box>
      <Box width={8}>
        <Text color={color} bold>
          {entry.level.toUpperCase()}
        </Text>
      </Box>
      {showSource && (
        <Box width={20}>
          <Text dimColor>
            [
            {entry.source}
            ]
          </Text>
        </Box>
      )}
      <Box flexGrow={1}>
        <Text>{entry.message}</Text>
      </Box>
    </Box>
  )
}

export function LogViewer({
  maxLines = 50,
  refreshInterval = 1000,
  showTimestamps = true,
  showSource = true,
  filterLevel = 'all',
  autoScroll = true,
}: LogViewerProps = {}) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [currentFilter, setCurrentFilter] = useState<LogEntry['level'] | 'all'>(filterLevel)
  const [scrollOffset, setScrollOffset] = useState(0)

  // Fetch logs from CCM
  const fetchLogs = async () => {
    if (isPaused)
      return

    try {
      // TODO: Replace with actual CCM API call
      // For now, return mock data
      const mockLogs: LogEntry[] = [
        {
          timestamp: new Date(Date.now() - 5000),
          level: 'info',
          source: 'SessionMonitor',
          message: 'Session monitoring started',
        },
        {
          timestamp: new Date(Date.now() - 4000),
          level: 'success',
          source: 'AgentDashboard',
          message: 'Agent dashboard initialized successfully',
        },
        {
          timestamp: new Date(Date.now() - 3000),
          level: 'warn',
          source: 'typescript-cli-architect',
          message: 'High memory usage detected (85%)',
        },
        {
          timestamp: new Date(Date.now() - 2000),
          level: 'debug',
          source: 'ccjk-i18n-specialist',
          message: 'Loading translation namespace: common',
        },
        {
          timestamp: new Date(Date.now() - 1000),
          level: 'error',
          source: 'ccjk-testing-specialist',
          message: 'Test suite failed: 2 tests failed out of 10',
        },
        {
          timestamp: new Date(),
          level: 'info',
          source: 'LogViewer',
          message: 'Log viewer refreshed',
        },
      ]

      setLogs((prevLogs) => {
        const newLogs = [...prevLogs, ...mockLogs]
        return newLogs.slice(-maxLines)
      })
      setIsLoading(false)
    }
    catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }

  // Auto-refresh logs
  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, isPaused, maxLines])

  // Keyboard controls
  useInput((input, key) => {
    if (input === 'p') {
      setIsPaused(prev => !prev)
    }
    else if (input === 'c') {
      setLogs([])
    }
    else if (input === 'f') {
      // Cycle through filter levels
      const levels: Array<LogEntry['level'] | 'all'> = ['all', 'error', 'warn', 'info', 'debug', 'success']
      const currentIndex = levels.indexOf(currentFilter)
      const nextIndex = (currentIndex + 1) % levels.length
      setCurrentFilter(levels[nextIndex])
    }
    else if (key.upArrow) {
      setScrollOffset(prev => Math.max(0, prev - 1))
    }
    else if (key.downArrow) {
      setScrollOffset(prev => Math.min(logs.length - 1, prev + 1))
    }
    else if (input === 'q') {
      process.exit(0)
    }
  })

  // Filter logs
  const filteredLogs = currentFilter === 'all'
    ? logs
    : logs.filter(log => log.level === currentFilter)

  // Apply scroll offset
  const visibleLogs = autoScroll && !isPaused
    ? filteredLogs.slice(-maxLines)
    : filteredLogs.slice(scrollOffset, scrollOffset + maxLines)

  // Count by level
  const errorCount = logs.filter(l => l.level === 'error').length
  const warnCount = logs.filter(l => l.level === 'warn').length
  const infoCount = logs.filter(l => l.level === 'info').length
  const debugCount = logs.filter(l => l.level === 'debug').length
  const successCount = logs.filter(l => l.level === 'success').length

  if (isLoading) {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
          {' '}
          Loading logs...
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">📋 Log Viewer</Text>
          {isPaused && (
            <Text color="yellow">
              {' '}
              [PAUSED]
            </Text>
          )}
        </Box>
        <Box gap={1}>
          <Text dimColor>Filter: </Text>
          <Text bold color="cyan">{currentFilter.toUpperCase()}</Text>
        </Box>
      </Box>

      {/* Summary */}
      <Box marginBottom={1} gap={2}>
        <Box>
          <Text color="red">✖ Errors: </Text>
          <Text bold>{errorCount}</Text>
        </Box>
        <Box>
          <Text color="yellow">⚠ Warnings: </Text>
          <Text bold>{warnCount}</Text>
        </Box>
        <Box>
          <Text color="cyan">ℹ Info: </Text>
          <Text bold>{infoCount}</Text>
        </Box>
        <Box>
          <Text color="green">✓ Success: </Text>
          <Text bold>{successCount}</Text>
        </Box>
        <Box>
          <Text color="gray">⚙ Debug: </Text>
          <Text bold>{debugCount}</Text>
        </Box>
      </Box>

      {/* Log entries */}
      {visibleLogs.length === 0
        ? (
            <Box>
              <Text dimColor>No logs available</Text>
            </Box>
          )
        : (
            <Box flexDirection="column">
              {visibleLogs.map((entry, index) => (
                <LogLine
                  key={`${entry.timestamp.getTime()}-${index}`}
                  entry={entry}
                  showTimestamps={showTimestamps}
                  showSource={showSource}
                />
              ))}
            </Box>
          )}

      {/* Footer */}
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text dimColor>
            Showing
            {' '}
            {visibleLogs.length}
            {' '}
            of
            {' '}
            {filteredLogs.length}
            {' '}
            logs
            {currentFilter !== 'all' && ` (filtered by ${currentFilter})`}
          </Text>
        </Box>
        <Box marginTop={0}>
          <Text dimColor>
            p: Pause/Resume  c: Clear  f: Filter  ↑↓: Scroll  q: Quit
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
