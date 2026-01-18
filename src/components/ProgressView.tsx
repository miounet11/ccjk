import type { ProgressItem } from './types.js'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useState } from 'react'

interface ProgressViewProps {
  items?: ProgressItem[]
  title?: string
  showTimestamps?: boolean
  showPercentage?: boolean
  refreshInterval?: number
}

interface ProgressBarProps {
  current: number
  total: number
  width?: number
  status: ProgressItem['status']
}

function ProgressBar({ current, total, width = 30, status }: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, Math.floor((current / total) * 100)) : 0
  const filledWidth = Math.floor((percentage / 100) * width)
  const emptyWidth = width - filledWidth

  const filled = '█'.repeat(filledWidth)
  const empty = '░'.repeat(emptyWidth)

  let color: 'green' | 'yellow' | 'red' | 'cyan' | 'gray' = 'cyan'
  if (status === 'completed')
    color = 'green'
  else if (status === 'failed')
    color = 'red'
  else if (status === 'in_progress')
    color = 'cyan'
  else if (status === 'pending')
    color = 'gray'

  return (
    <Box>
      <Text color={color}>{filled}</Text>
      <Text dimColor>{empty}</Text>
      <Text dimColor>
        {' '}
        {current}
        /
        {total}
      </Text>
    </Box>
  )
}

interface ProgressItemRowProps {
  item: ProgressItem
  showTimestamps: boolean
  showPercentage: boolean
}

function ProgressItemRow({ item, showTimestamps, showPercentage }: ProgressItemRowProps) {
  const statusIcons = {
    pending: '⏸',
    in_progress: '⚙',
    completed: '✓',
    failed: '✖',
  }

  const statusColors = {
    pending: 'gray',
    in_progress: 'cyan',
    completed: 'green',
    failed: 'red',
  }

  const icon = statusIcons[item.status]
  const color = statusColors[item.status]
  const percentage = item.total > 0 ? Math.floor((item.current / item.total) * 100) : 0

  // Calculate duration
  let durationStr = ''
  if (item.startTime) {
    const endTime = item.endTime || new Date()
    const duration = Math.floor((endTime.getTime() - item.startTime.getTime()) / 1000)
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    durationStr = `${minutes}m ${seconds}s`
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Item header */}
      <Box>
        <Box width={3}>
          <Text color={color}>{icon}</Text>
        </Box>
        <Box flexGrow={1}>
          <Text bold={item.status === 'in_progress'}>{item.label}</Text>
        </Box>
        {showPercentage && (
          <Box width={8}>
            <Text color={color}>
              {percentage}
              %
            </Text>
          </Box>
        )}
        {showTimestamps && durationStr && (
          <Box width={12}>
            <Text dimColor>{durationStr}</Text>
          </Box>
        )}
      </Box>

      {/* Progress bar */}
      <Box paddingLeft={3}>
        <ProgressBar
          current={item.current}
          total={item.total}
          status={item.status}
          width={40}
        />
      </Box>

      {/* Spinner for in-progress items */}
      {item.status === 'in_progress' && (
        <Box paddingLeft={3}>
          <Text color="cyan">
            <Spinner type="dots" />
            {' '}
            Processing...
          </Text>
        </Box>
      )}
    </Box>
  )
}

export function ProgressView({
  items = [],
  title = 'Progress',
  showTimestamps = true,
  showPercentage = true,
  refreshInterval = 500,
}: ProgressViewProps = {}) {
  const [progressItems, setProgressItems] = useState<ProgressItem[]>(items)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Update progress items
  useEffect(() => {
    setProgressItems(items)
    setLastUpdate(new Date())
  }, [items])

  // Auto-refresh for animations
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  // Calculate overall progress
  const totalItems = progressItems.length
  const completedItems = progressItems.filter(i => i.status === 'completed').length
  const failedItems = progressItems.filter(i => i.status === 'failed').length
  const inProgressItems = progressItems.filter(i => i.status === 'in_progress').length
  const pendingItems = progressItems.filter(i => i.status === 'pending').length

  const overallPercentage = totalItems > 0
    ? Math.floor((completedItems / totalItems) * 100)
    : 0

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          📊
          {' '}
          {title}
        </Text>
      </Box>

      {/* Summary */}
      <Box marginBottom={1} flexDirection="column">
        <Box gap={2}>
          <Box>
            <Text dimColor>Total: </Text>
            <Text bold>{totalItems}</Text>
          </Box>
          <Box>
            <Text color="green">✓ Completed: </Text>
            <Text bold>{completedItems}</Text>
          </Box>
          <Box>
            <Text color="cyan">⚙ In Progress: </Text>
            <Text bold>{inProgressItems}</Text>
          </Box>
          <Box>
            <Text color="gray">⏸ Pending: </Text>
            <Text bold>{pendingItems}</Text>
          </Box>
          {failedItems > 0 && (
            <Box>
              <Text color="red">✖ Failed: </Text>
              <Text bold>{failedItems}</Text>
            </Box>
          )}
        </Box>

        {/* Overall progress bar */}
        <Box marginTop={1}>
          <Text dimColor>Overall: </Text>
          <ProgressBar
            current={completedItems}
            total={totalItems}
            status={failedItems > 0 ? 'failed' : inProgressItems > 0 ? 'in_progress' : 'completed'}
            width={40}
          />
          <Text dimColor>
            {' '}
            {overallPercentage}
            %
          </Text>
        </Box>
      </Box>

      {/* Progress items */}
      {progressItems.length === 0
        ? (
            <Box>
              <Text dimColor>No progress items</Text>
            </Box>
          )
        : (
            <Box flexDirection="column">
              {progressItems.map(item => (
                <ProgressItemRow
                  key={item.id}
                  item={item}
                  showTimestamps={showTimestamps}
                  showPercentage={showPercentage}
                />
              ))}
            </Box>
          )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          Last updated:
          {' '}
          {lastUpdate.toLocaleTimeString()}
        </Text>
      </Box>
    </Box>
  )
}
