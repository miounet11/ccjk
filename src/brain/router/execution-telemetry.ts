/**
 * Execution telemetry for Brain router tool decisions.
 * Tracks route, elicitation, tool selection, and execution outcomes.
 */

export type TelemetryPhase
  = | 'execution'
    | 'intent'
    | 'elicitation'
    | 'skill'
    | 'agent'
    | 'mcp'
    | 'route'

export interface TelemetryEvent {
  id: string
  executionId: string
  timestamp: number
  phase: TelemetryPhase
  action: string
  success: boolean
  durationMs?: number
  metadata?: Record<string, unknown>
}

export interface PhaseTelemetrySummary {
  calls: number
  failures: number
  successRate: number
  avgDurationMs: number
}

export interface ExecutionTelemetrySummary {
  totalEvents: number
  overallSuccessRate: number
  avgDurationMs: number
  phaseStats: Record<TelemetryPhase, PhaseTelemetrySummary>
}

const DEFAULT_PHASE_SUMMARY: PhaseTelemetrySummary = {
  calls: 0,
  failures: 0,
  successRate: 0,
  avgDurationMs: 0,
}

/**
 * In-memory telemetry collector.
 * Keeps a bounded ring-like array of recent events.
 */
export class ExecutionTelemetry {
  private events: TelemetryEvent[] = []

  constructor(private readonly maxEvents = 2000) {}

  record(event: Omit<TelemetryEvent, 'id' | 'timestamp'>): TelemetryEvent {
    const entry: TelemetryEvent = {
      id: `te-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      ...event,
    }

    this.events.push(entry)
    if (this.events.length > this.maxEvents) {
      this.events.shift()
    }

    return entry
  }

  getRecent(limit = 50): TelemetryEvent[] {
    if (limit <= 0) {
      return []
    }
    return this.events.slice(-limit)
  }

  summarize(): ExecutionTelemetrySummary {
    const phaseStats: Record<TelemetryPhase, PhaseTelemetrySummary> = {
      execution: { ...DEFAULT_PHASE_SUMMARY },
      intent: { ...DEFAULT_PHASE_SUMMARY },
      elicitation: { ...DEFAULT_PHASE_SUMMARY },
      skill: { ...DEFAULT_PHASE_SUMMARY },
      agent: { ...DEFAULT_PHASE_SUMMARY },
      mcp: { ...DEFAULT_PHASE_SUMMARY },
      route: { ...DEFAULT_PHASE_SUMMARY },
    }

    let totalSuccess = 0
    let durationCount = 0
    let durationTotal = 0

    for (const event of this.events) {
      const summary = phaseStats[event.phase]
      summary.calls++
      if (!event.success) {
        summary.failures++
      }
      else {
        totalSuccess++
      }

      if (typeof event.durationMs === 'number') {
        durationTotal += event.durationMs
        durationCount++
        summary.avgDurationMs = ((summary.avgDurationMs * (summary.calls - 1)) + event.durationMs) / summary.calls
      }

      summary.successRate = summary.calls === 0 ? 0 : (summary.calls - summary.failures) / summary.calls
    }

    return {
      totalEvents: this.events.length,
      overallSuccessRate: this.events.length === 0 ? 0 : totalSuccess / this.events.length,
      avgDurationMs: durationCount === 0 ? 0 : durationTotal / durationCount,
      phaseStats,
    }
  }

  clear(): void {
    this.events = []
  }
}

let globalExecutionTelemetry: ExecutionTelemetry | null = null

export function getGlobalExecutionTelemetry(): ExecutionTelemetry {
  if (!globalExecutionTelemetry) {
    globalExecutionTelemetry = new ExecutionTelemetry()
  }
  return globalExecutionTelemetry
}

export function resetGlobalExecutionTelemetry(): void {
  if (globalExecutionTelemetry) {
    globalExecutionTelemetry.clear()
    globalExecutionTelemetry = null
  }
}
