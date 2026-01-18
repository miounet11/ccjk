# CCJK Ink Components Architecture

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CCJK v4.0.0 Ink Components                    │
│                   React-based Terminal UI Layer                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
        ┌───────────┐   ┌───────────┐   ┌───────────┐
        │  Session  │   │   Agent   │   │ Progress  │
        │  Monitor  │   │ Dashboard │   │   View    │
        └───────────┘   └───────────┘   └───────────┘
                │               │               │
                └───────────────┼───────────────┘
                                │
                                ▼
                        ┌───────────┐
                        │    Log    │
                        │  Viewer   │
                        └───────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CCM Backend API                          │
│                    (Claude Code Manager)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │ Sessions │ │  Agents  │ │   Logs   │
            │   API    │ │   API    │ │   API    │
            └──────────┘ └──────────┘ └──────────┘
                    │           │           │
                    ▼           ▼           ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │ Session  │ │  Agent   │ │   Log    │
            │ Monitor  │ │Dashboard │ │ Viewer   │
            └──────────┘ └──────────┘ └──────────┘
                    │           │           │
                    └───────────┼───────────┘
                                │
                                ▼
                        ┌──────────┐
                        │ Terminal │
                        │   UI     │
                        └──────────┘
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Interaction Flow                       │
└─────────────────────────────────────────────────────────────────┘

1. SessionMonitor (Entry Point)
   │
   ├─ User navigates sessions (↑↓)
   ├─ User selects session (Enter)
   │  └─> Triggers onSessionSelect callback
   │      └─> Opens AgentDashboard for selected session
   │
   └─ User refreshes (r) or quits (q)

2. AgentDashboard (Session Detail)
   │
   ├─ Displays agents for selected session
   ├─ Shows real-time progress
   │  └─> Updates every 1s
   │
   └─ User can view detailed logs
       └─> Opens LogViewer

3. ProgressView (Task Progress)
   │
   ├─ Shows overall progress
   ├─ Displays individual task status
   │  └─> Updates every 500ms
   │
   └─> Can be embedded in other components

4. LogViewer (Log Streaming)
   │
   ├─ User filters logs (f)
   ├─ User pauses/resumes (p)
   ├─ User clears logs (c)
   ├─ User scrolls (↑↓)
   │
   └─ User quits (q)
```

## State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                      Component State Flow                        │
└─────────────────────────────────────────────────────────────────┘

SessionMonitor State:
├─ sessions: Session[]
├─ selectedIndex: number
├─ isLoading: boolean
└─ error: string | null

AgentDashboard State:
├─ agents: Agent[]
├─ isLoading: boolean
└─ error: string | null

ProgressView State:
├─ progressItems: ProgressItem[]
└─ lastUpdate: Date

LogViewer State:
├─ logs: LogEntry[]
├─ isLoading: boolean
├─ isPaused: boolean
├─ currentFilter: LogEntry['level'] | 'all'
└─ scrollOffset: number
```

## Event Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                      Keyboard Event Flow                         │
└─────────────────────────────────────────────────────────────────┘

useInput Hook (SessionMonitor, LogViewer)
│
├─ Arrow Keys (↑↓)
│  └─> Update selectedIndex / scrollOffset
│
├─ Enter Key
│  └─> Trigger selection callback
│
├─ Character Keys (r, p, c, f, q)
│  ├─ 'r': Refresh data
│  ├─ 'p': Pause/Resume
│  ├─ 'c': Clear logs
│  ├─ 'f': Cycle filter
│  └─ 'q': Quit application
│
└─> State updates trigger re-render
```

## Auto-Refresh Mechanism

```
┌─────────────────────────────────────────────────────────────────┐
│                    Auto-Refresh Architecture                     │
└─────────────────────────────────────────────────────────────────┘

useEffect Hook
│
├─ Initial fetch on mount
│  └─> fetchData()
│
├─ Set interval for periodic refresh
│  └─> setInterval(fetchData, refreshInterval)
│
└─ Cleanup on unmount
   └─> clearInterval(interval)

Refresh Intervals:
├─ SessionMonitor: 1000ms (1s)
├─ AgentDashboard: 1000ms (1s)
├─ ProgressView: 500ms (0.5s)
└─ LogViewer: 1000ms (1s)
```

## Component Composition

```
┌─────────────────────────────────────────────────────────────────┐
│                    Reusable Sub-Components                       │
└─────────────────────────────────────────────────────────────────┘

SessionMonitor
└─> SessionRow (per session)
    ├─ Status icon
    ├─ Session name
    ├─ Duration
    └─ Agent/task counts

AgentDashboard
└─> AgentCard (per agent)
    ├─ Agent header (role, duration)
    ├─ Status indicator
    ├─ Current task
    └─> ProgressBar
        ├─ Filled portion (█)
        ├─ Empty portion (░)
        └─ Percentage

ProgressView
└─> ProgressItemRow (per item)
    ├─ Status icon
    ├─ Item label
    ├─> ProgressBar
    └─ Spinner (if in_progress)

LogViewer
└─> LogLine (per log entry)
    ├─ Timestamp
    ├─ Level icon
    ├─ Level text
    ├─ Source
    └─ Message
```

## Type System

```
┌─────────────────────────────────────────────────────────────────┐
│                    TypeScript Type Hierarchy                     │
└─────────────────────────────────────────────────────────────────┘

types.ts (Shared Types)
│
├─ Session
│  ├─ id: string
│  ├─ name: string
│  ├─ status: 'running' | 'waiting' | 'stopped' | 'error'
│  ├─ startTime: Date
│  ├─ lastActivity: Date
│  ├─ agentCount: number
│  └─ taskCount: number
│
├─ Agent
│  ├─ id: string
│  ├─ role: string
│  ├─ status: 'idle' | 'working' | 'waiting' | 'error' | 'completed'
│  ├─ currentTask?: string
│  ├─ progress: number
│  ├─ startTime: Date
│  ├─ completedTasks: number
│  └─ totalTasks: number
│
├─ LogEntry
│  ├─ timestamp: Date
│  ├─ level: 'info' | 'warn' | 'error' | 'debug' | 'success'
│  ├─ source: string
│  └─ message: string
│
└─ ProgressItem
   ├─ id: string
   ├─ label: string
   ├─ current: number
   ├─ total: number
   ├─ status: 'pending' | 'in_progress' | 'completed' | 'failed'
   ├─ startTime?: Date
   └─ endTime?: Date
```

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CCJK CLI Integration                          │
└─────────────────────────────────────────────────────────────────┘

CCJK CLI Commands
│
├─ npx ccjk monitor
│  └─> render(<SessionMonitor />)
│
├─ npx ccjk dashboard [sessionId]
│  └─> render(<AgentDashboard sessionId={sessionId} />)
│
├─ npx ccjk progress
│  └─> render(<ProgressView items={items} />)
│
└─ npx ccjk logs [--filter=level]
   └─> render(<LogViewer filterLevel={level} />)

CCM Backend
│
├─ HTTP REST API
│  ├─ GET /api/sessions
│  ├─ GET /api/agents/:sessionId
│  ├─ GET /api/logs
│  └─ GET /api/progress
│
└─ WebSocket (Future)
   ├─ ws://localhost:3000/sessions
   ├─ ws://localhost:3000/agents
   └─ ws://localhost:3000/logs
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                    Performance Strategies                        │
└─────────────────────────────────────────────────────────────────┘

1. Efficient Re-renders
   ├─ React's virtual DOM
   ├─ Minimal state updates
   └─ Memoized sub-components

2. Data Management
   ├─ Limit displayed items (maxLines, maxAgents)
   ├─ Slice arrays for pagination
   └─ Clean up old data

3. Interval Management
   ├─ Configurable refresh rates
   ├─ Pause functionality
   └─ Proper cleanup on unmount

4. Memory Management
   ├─ Limit log history
   ├─ Remove old entries
   └─ Efficient data structures
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                    Error Handling Strategy                       │
└─────────────────────────────────────────────────────────────────┘

Component Level
│
├─ Try-Catch in fetch functions
│  └─> Set error state
│
├─ Error state display
│  ├─ Show error message
│  └─ Provide retry option
│
└─ Graceful degradation
   ├─ Show loading state
   ├─ Show empty state
   └─ Continue operation on partial failure
```

## Testing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Testing Strategy                            │
└─────────────────────────────────────────────────────────────────┘

Unit Tests (Vitest + ink-testing-library)
│
├─ Component Rendering
│  ├─ Renders without crashing
│  ├─ Displays correct content
│  └─ Handles props correctly
│
├─ State Management
│  ├─ Initial state
│  ├─ State updates
│  └─ State transitions
│
├─ Event Handling
│  ├─ Keyboard inputs
│  ├─ Callbacks
│  └─ User interactions
│
└─ Edge Cases
   ├─ Empty data
   ├─ Error states
   └─ Loading states

Integration Tests
│
├─ Component Interaction
│  ├─ Parent-child communication
│  └─ Callback propagation
│
└─ API Integration
   ├─ Mock API responses
   └─ Error handling
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Deployment Strategy                           │
└─────────────────────────────────────────────────────────────────┘

Development
├─ tsx for TypeScript execution
├─ Hot reload with watch mode
└─ Mock data for testing

Production
├─ Compiled to JavaScript (unbuild)
├─ Bundled with dependencies
├─ Distributed via npm
└─ Integrated into CCJK CLI

Platform Support
├─ macOS (Terminal, iTerm2)
├─ Linux (bash, zsh)
├─ Windows (PowerShell, WSL)
└─ Termux (Android)
```

## Future Architecture Enhancements

```
┌─────────────────────────────────────────────────────────────────┐
│                    Future Enhancements                           │
└─────────────────────────────────────────────────────────────────┘

Phase 1: Real-time Updates
├─ WebSocket integration
├─ Server-sent events
└─ Push notifications

Phase 2: Advanced Features
├─ Split-screen layouts
├─ Custom themes
├─ Keyboard shortcuts
└─ Search functionality

Phase 3: Visualization
├─ Chart components (ink-chart)
├─ Graph visualizations
├─ Timeline views
└─ Heatmaps

Phase 4: Collaboration
├─ Multi-user support
├─ Session sharing
├─ Remote monitoring
└─ Team dashboards
```
