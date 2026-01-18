# CCJK Ink Components

React-based terminal UI components for CCJK v4.0.0 using [Ink](https://github.com/vadimdemedes/ink).

## Components

### 1. SessionMonitor

Real-time CCM session monitoring with keyboard navigation.

**Features:**
- Auto-refreshing session list
- Keyboard navigation (arrow keys)
- Status indicators (running/waiting/stopped/error)
- Focus session on Enter
- Quit on 'q'

**Usage:**
```typescript
import { SessionMonitor } from './components'

<SessionMonitor
  refreshInterval={1000}
  onSessionSelect={(session) => console.log(session)}
  onExit={() => process.exit(0)}
/>
```

**Keyboard Controls:**
- `↑/↓`: Navigate sessions
- `Enter`: Select session
- `r`: Refresh
- `q`: Quit

### 2. AgentDashboard

Multi-agent orchestration UI with real-time updates.

**Features:**
- Agent cards showing role, status, progress
- Real-time updates
- Task descriptions
- Progress bars
- Summary statistics

**Usage:**
```typescript
import { AgentDashboard } from './components'

<AgentDashboard
  sessionId="session-1"
  refreshInterval={1000}
  maxAgents={10}
/>
```

### 3. ProgressView

Advanced progress display with multiple items.

**Features:**
- Multiple progress items
- Overall progress summary
- Status indicators (pending/in_progress/completed/failed)
- Timestamps and durations
- Percentage display
- Animated spinners

**Usage:**
```typescript
import { ProgressView } from './components'

const items = [
  {
    id: 'task-1',
    label: 'Installing dependencies',
    current: 45,
    total: 100,
    status: 'in_progress',
    startTime: new Date(),
  },
]

<ProgressView
  items={items}
  title="Build Progress"
  showTimestamps={true}
  showPercentage={true}
/>
```

### 4. LogViewer

Live log streaming with filtering and controls.

**Features:**
- Real-time log streaming
- Level filtering (info/warn/error/debug/success)
- Pause/resume
- Clear logs
- Scroll through history
- Summary statistics

**Usage:**
```typescript
import { LogViewer } from './components'

<LogViewer
  maxLines={50}
  refreshInterval={1000}
  showTimestamps={true}
  showSource={true}
  filterLevel="all"
  autoScroll={true}
/>
```

**Keyboard Controls:**
- `p`: Pause/Resume
- `c`: Clear logs
- `f`: Cycle filter levels
- `↑/↓`: Scroll
- `q`: Quit

## Types

All components use shared TypeScript types:

```typescript
interface Session {
  id: string
  name: string
  status: 'running' | 'waiting' | 'stopped' | 'error'
  startTime: Date
  lastActivity: Date
  agentCount: number
  taskCount: number
}

interface Agent {
  id: string
  role: string
  status: 'idle' | 'working' | 'waiting' | 'error' | 'completed'
  currentTask?: string
  progress: number
  startTime: Date
  completedTasks: number
  totalTasks: number
}

interface LogEntry {
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug' | 'success'
  source: string
  message: string
}

interface ProgressItem {
  id: string
  label: string
  current: number
  total: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
}
```

## Dependencies

Required packages:
- `ink` - React for CLI
- `ink-spinner` - Loading spinners
- `react` - React library

## Examples

See `examples.tsx` for complete usage examples of all components.

## Integration with CCJK

These components are designed to integrate with CCJK's CCM (Claude Code Manager) system:

1. **SessionMonitor** - Monitors active CCM sessions
2. **AgentDashboard** - Displays CCJK AI agent team status
3. **ProgressView** - Shows installation/update progress
4. **LogViewer** - Streams logs from CCJK operations

## Future Enhancements

- [ ] Connect to actual CCM API endpoints
- [ ] Add WebSocket support for real-time updates
- [ ] Implement session detail view
- [ ] Add log export functionality
- [ ] Support custom themes
- [ ] Add keyboard shortcuts customization
