/**
 * Execution Tracer
 *
 * Provides observable execution traces for Brain System operations.
 * Inspired by Intent Engine's decision timeline.
 *
 * @module brain/execution-tracer
 */

import ansis from 'ansis'

/**
 * Trace event types
 */
export type TraceEventType =
  | 'agent-start'
  | 'agent-end'
  | 'decision'
  | 'tool-call'
  | 'tool-result'
  | 'error'
  | 'context-load'
  | 'context-save'

/**
 * Trace event
 */
export interface TraceEvent {
  id: string
  sessionId: string
  timestamp: number
  type: TraceEventType
  agentId?: string
  data: Record<string, any>
  duration?: number
  parentId?: string
}

/**
 * Execution trace
 */
export interface ExecutionTrace {
  sessionId: string
  startTime: number
  endTime?: number
  events: TraceEvent[]
  metadata: {
    totalEvents: number
    totalDuration: number
    agentCount: number
    toolCallCount: number
    errorCount: number
  }
}

/**
 * Execution Tracer
 */
export class ExecutionTracer {
  private traces: Map<string, ExecutionTrace> = new Map()
  private currentSessionId: string | null = null

  /**
   * Start a new trace session
   */
  startSession(sessionId: string): void {
    this.currentSessionId = sessionId
    this.traces.set(sessionId, {
      sessionId,
      startTime: Date.now(),
      events: [],
      metadata: {
        totalEvents: 0,
        totalDuration: 0,
        agentCount: 0,
        toolCallCount: 0,
        errorCount: 0,
      },
    })
  }

  /**
   * End current trace session
   */
  endSession(sessionId?: string): void {
    const sid = sessionId || this.currentSessionId
    if (!sid) return

    const trace = this.traces.get(sid)
    if (trace) {
      trace.endTime = Date.now()
      trace.metadata.totalDuration = trace.endTime - trace.startTime
    }

    if (sid === this.currentSessionId) {
      this.currentSessionId = null
    }
  }

  /**
   * Log an event
   */
  logEvent(
    type: TraceEventType,
    data: Record<string, any>,
    options?: {
      sessionId?: string
      agentId?: string
      parentId?: string
      duration?: number
    },
  ): string {
    const sessionId = options?.sessionId || this.currentSessionId
    if (!sessionId) {
      throw new Error('No active trace session')
    }

    const trace = this.traces.get(sessionId)
    if (!trace) {
      throw new Error(`Trace session not found: ${sessionId}`)
    }

    const eventId = `${sessionId}-${trace.events.length}`
    const event: TraceEvent = {
      id: eventId,
      sessionId,
      timestamp: Date.now(),
      type,
      agentId: options?.agentId,
      data,
      duration: options?.duration,
      parentId: options?.parentId,
    }

    trace.events.push(event)
    trace.metadata.totalEvents++

    // Update metadata
    if (type === 'agent-start') {
      trace.metadata.agentCount++
    }
    else if (type === 'tool-call') {
      trace.metadata.toolCallCount++
    }
    else if (type === 'error') {
      trace.metadata.errorCount++
    }

    return eventId
  }

  /**
   * Log agent start
   */
  logAgentStart(agentId: string, data: Record<string, any> = {}): string {
    return this.logEvent('agent-start', { agentId, ...data }, { agentId })
  }

  /**
   * Log agent end
   */
  logAgentEnd(agentId: string, data: Record<string, any> = {}, duration?: number): string {
    return this.logEvent('agent-end', { agentId, ...data }, { agentId, duration })
  }

  /**
   * Log decision
   */
  logDecision(agentId: string, decision: string, reasoning?: string): string {
    return this.logEvent('decision', { decision, reasoning }, { agentId })
  }

  /**
   * Log tool call
   */
  logToolCall(tool: string, args: any, agentId?: string): string {
    return this.logEvent('tool-call', { tool, args }, { agentId })
  }

  /**
   * Log tool result
   */
  logToolResult(tool: string, result: any, duration: number, parentId?: string): string {
    return this.logEvent('tool-result', { tool, result }, { duration, parentId })
  }

  /**
   * Log error
   */
  logError(error: Error, agentId?: string): string {
    return this.logEvent('error', {
      message: error.message,
      stack: error.stack,
    }, { agentId })
  }

  /**
   * Get trace for session
   */
  getTrace(sessionId: string): ExecutionTrace | undefined {
    return this.traces.get(sessionId)
  }

  /**
   * List all traces
   */
  listTraces(): ExecutionTrace[] {
    return Array.from(this.traces.values())
  }

  /**
   * Clear old traces (keep last N)
   */
  cleanup(keepLast: number = 10): void {
    const traces = this.listTraces()
      .sort((a, b) => b.startTime - a.startTime)

    // Keep only the most recent traces
    const toKeep = new Set(traces.slice(0, keepLast).map(t => t.sessionId))

    for (const [sessionId] of this.traces) {
      if (!toKeep.has(sessionId)) {
        this.traces.delete(sessionId)
      }
    }
  }

  /**
   * Visualize trace as ASCII tree
   */
  visualizeTrace(sessionId: string): string {
    const trace = this.traces.get(sessionId)
    if (!trace) {
      return ansis.red(`Trace not found: ${sessionId}`)
    }

    const lines: string[] = []
    lines.push(ansis.cyan.bold(`\n📊 Execution Trace: ${sessionId}`))
    lines.push(ansis.gray(`Started: ${new Date(trace.startTime).toISOString()}`))
    if (trace.endTime) {
      lines.push(ansis.gray(`Duration: ${trace.endTime - trace.startTime}ms`))
    }
    lines.push(ansis.gray(`Events: ${trace.metadata.totalEvents}`))
    lines.push('')

    // Group events by agent
    const agentEvents = new Map<string, TraceEvent[]>()
    for (const event of trace.events) {
      const agentId = event.agentId || 'system'
      if (!agentEvents.has(agentId)) {
        agentEvents.set(agentId, [])
      }
      agentEvents.get(agentId)!.push(event)
    }

    // Render each agent's timeline
    for (const [agentId, events] of agentEvents) {
      lines.push(ansis.yellow(`🤖 ${agentId}`))

      for (const event of events) {
        const time = new Date(event.timestamp).toLocaleTimeString()
        const icon = this.getEventIcon(event.type)
        const color = this.getEventColor(event.type)

        let line = `  ${icon} ${time} ${color(event.type)}`

        if (event.type === 'decision') {
          line += `: ${event.data.decision}`
        }
        else if (event.type === 'tool-call') {
          line += `: ${event.data.tool}(${JSON.stringify(event.data.args).slice(0, 50)}...)`
        }
        else if (event.type === 'tool-result' && event.duration) {
          line += `: ${event.data.tool} (${event.duration}ms)`
        }
        else if (event.type === 'error') {
          line += `: ${event.data.message}`
        }

        lines.push(line)
      }

      lines.push('')
    }

    // Summary
    lines.push(ansis.cyan('📈 Summary'))
    lines.push(`  Agents: ${trace.metadata.agentCount}`)
    lines.push(`  Tool Calls: ${trace.metadata.toolCallCount}`)
    lines.push(`  Errors: ${trace.metadata.errorCount}`)
    lines.push('')

    return lines.join('\n')
  }

  /**
   * Get icon for event type
   */
  private getEventIcon(type: TraceEventType): string {
    const icons: Record<TraceEventType, string> = {
      'agent-start': '▶️',
      'agent-end': '⏹️',
      'decision': '🧠',
      'tool-call': '🔧',
      'tool-result': '✅',
      'error': '❌',
      'context-load': '📥',
      'context-save': '📤',
    }
    return icons[type] || '•'
  }

  /**
   * Get color function for event type
   */
  private getEventColor(type: TraceEventType): (s: string) => string {
    const colors: Record<TraceEventType, (s: string) => string> = {
      'agent-start': ansis.green,
      'agent-end': ansis.gray,
      'decision': ansis.cyan,
      'tool-call': ansis.blue,
      'tool-result': ansis.green,
      'error': ansis.red,
      'context-load': ansis.yellow,
      'context-save': ansis.yellow,
    }
    return colors[type] || ansis.white
  }
}

/**
 * Global execution tracer instance
 */
export const executionTracer = new ExecutionTracer()
