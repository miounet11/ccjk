import type { AnalyzedIntent } from '../router/intent-router'
import { describe, expect, it, vi } from 'vitest'
import { AutoExecutor } from '../router/auto-executor'
import { ExecutionTelemetry } from '../router/execution-telemetry'

function createIntent(overrides: Partial<AnalyzedIntent> = {}): AnalyzedIntent {
  return {
    type: 'feature',
    complexity: 'complex',
    confidence: 0.5,
    reasoning: 'Ambiguous request',
    suggestedRoute: 'feature',
    keywords: ['implement', 'api'],
    requiresPlanning: true,
    requiresMultipleAgents: true,
    estimatedSteps: 8,
    ...overrides,
  }
}

describe('autoExecutor routing improvements', () => {
  it('uses structured elicitation to override route for ambiguous intent', async () => {
    const askUserQuestion = vi.fn().mockResolvedValue({
      value: 'direct',
      source: 'option',
    })

    const intentRouter = {
      route: vi.fn().mockResolvedValue({
        route: 'feature',
        intent: createIntent(),
        shouldExecute: true,
        message: 'feature route',
      }),
    }

    const telemetry = new ExecutionTelemetry()
    const executor = new AutoExecutor({
      autoCreateSkills: false,
      autoCreateAgents: false,
      autoSelectMcp: false,
      enableElicitation: true,
      askUserQuestion,
      intentRouter,
      telemetry,
    })

    const result = await executor.execute('Implement auth API and design workflow')

    expect(result.route).toBe('direct')
    expect(result.intent.suggestedRoute).toBe('direct')
    expect(result.insights?.decisionProfile).toBe('user_guided')
    expect(result.insights?.routeDecision.initial).toBe('feature')
    expect(result.insights?.routeDecision.final).toBe('direct')
    expect(result.insights?.routeDecision.userSelectedRoute).toBe(true)
    expect(askUserQuestion).toHaveBeenCalledOnce()
    expect(executor.getTelemetryEvents(20).some(event => event.phase === 'elicitation')).toBe(true)
  })

  it('limits MCP selection to top scored tools and records telemetry', async () => {
    const intentRouter = {
      route: vi.fn().mockResolvedValue({
        route: 'direct',
        intent: createIntent({
          complexity: 'moderate',
          confidence: 0.95,
          requiresPlanning: false,
          requiresMultipleAgents: false,
          suggestedRoute: 'direct',
        }),
        shouldExecute: true,
        message: 'direct route',
      }),
    }

    const executor = new AutoExecutor({
      autoCreateSkills: false,
      autoCreateAgents: false,
      autoSelectMcp: true,
      enableElicitation: false,
      maxMcpTools: 2,
      intentRouter,
      telemetry: new ExecutionTelemetry(),
    })

    const result = await executor.execute(
      'Search docs for this library package, inspect github repository, and check lint errors in files',
    )

    expect(result.mcpToolsUsed.length).toBe(2)
    expect(new Set(result.mcpToolsUsed).size).toBe(2)
    expect(result.insights?.mcpSelection.selected.length).toBe(2)
    expect(result.insights?.mcpSelection.truncated).toBe(true)
    expect(result.insights?.telemetry.eventCount).toBeGreaterThan(0)

    const summary = executor.getTelemetrySummary()
    expect(summary.totalEvents).toBeGreaterThan(0)
    expect(summary.phaseStats.mcp.calls).toBeGreaterThan(0)
  })
})
