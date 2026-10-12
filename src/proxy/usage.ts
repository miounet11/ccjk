import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'pathe'

export interface UsageEvent {
  at: string
  providerId: string
  model: string
  protocol: string
  status: number
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

export interface UsageSummary {
  requests: number
  errors: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  byProvider: Record<string, { requests: number, errors: number }>
  byModel: Record<string, { requests: number, outputTokens: number }>
}

export function recordUsage(file: string, event: UsageEvent): void {
  const dir = dirname(file)
  if (!existsSync(dir))
    mkdirSync(dir, { recursive: true })
  appendFileSync(file, `${JSON.stringify(event)}\n`)
}

export function readUsage(file: string): UsageEvent[] {
  if (!existsSync(file))
    return []
  return readFileSync(file, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as UsageEvent
      }
      catch {
        return undefined
      }
    })
    .filter((row): row is UsageEvent => Boolean(row))
}

export function summarizeUsage(events: readonly UsageEvent[]): UsageSummary {
  const summary: UsageSummary = {
    requests: 0,
    errors: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    byProvider: {},
    byModel: {},
  }
  for (const event of events) {
    summary.requests += 1
    if (event.status >= 400)
      summary.errors += 1
    summary.inputTokens += event.inputTokens ?? 0
    summary.outputTokens += event.outputTokens ?? 0
    summary.cacheReadTokens += event.cacheReadTokens ?? 0
    summary.cacheWriteTokens += event.cacheWriteTokens ?? 0
    const provider = summary.byProvider[event.providerId] ?? { requests: 0, errors: 0 }
    provider.requests += 1
    if (event.status >= 400)
      provider.errors += 1
    summary.byProvider[event.providerId] = provider
    const model = summary.byModel[event.model] ?? { requests: 0, outputTokens: 0 }
    model.requests += 1
    model.outputTokens += event.outputTokens ?? 0
    summary.byModel[event.model] = model
  }
  return summary
}
