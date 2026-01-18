/**
 * Example usage of CCJK Ink components
 * Demonstrates how to use SessionMonitor, AgentDashboard, ProgressView, and LogViewer
 */

import type { ProgressItem } from './types.js'
// import { render } from 'ink'
import React from 'react'
import { AgentDashboard, LogViewer, ProgressView, SessionMonitor } from './index.js'

// Example 1: Session Monitor
export function SessionMonitorExample() {
  return (
    <SessionMonitor
      refreshInterval={1000}
      onSessionSelect={(session) => {
        console.log('Selected session:', session.name)
      }}
      onExit={() => {
        console.log('Exiting session monitor')
      }}
    />
  )
}

// Example 2: Agent Dashboard
export function AgentDashboardExample() {
  return (
    <AgentDashboard
      sessionId="session-1"
      refreshInterval={1000}
      maxAgents={10}
    />
  )
}

// Example 3: Progress View
export function ProgressViewExample() {
  const progressItems: ProgressItem[] = [
    {
      id: 'task-1',
      label: 'Installing dependencies',
      current: 45,
      total: 100,
      status: 'in_progress',
      startTime: new Date(Date.now() - 30000),
    },
    {
      id: 'task-2',
      label: 'Building project',
      current: 0,
      total: 50,
      status: 'pending',
    },
    {
      id: 'task-3',
      label: 'Running tests',
      current: 25,
      total: 25,
      status: 'completed',
      startTime: new Date(Date.now() - 60000),
      endTime: new Date(Date.now() - 10000),
    },
  ]

  return (
    <ProgressView
      items={progressItems}
      title="Build Progress"
      showTimestamps={true}
      showPercentage={true}
      refreshInterval={500}
    />
  )
}

// Example 4: Log Viewer
export function LogViewerExample() {
  return (
    <LogViewer
      maxLines={50}
      refreshInterval={1000}
      showTimestamps={true}
      showSource={true}
      filterLevel="all"
      autoScroll={true}
    />
  )
}

// Run examples (uncomment the one you want to test)
// render(<SessionMonitorExample />)
// render(<AgentDashboardExample />)
// render(<ProgressViewExample />)
// render(<LogViewerExample />)
