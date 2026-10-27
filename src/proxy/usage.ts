import type { ModelPrice } from './types'
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'pathe'

/** 一次上游尝试，用来解释最后为什么落在这一家。 */
export interface UsageAttempt {
  providerId: string
  status: number
  latencyMs: number
  reason?: string
}

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
  /** 这次请求依次试过哪些上游。旧记录没有这个字段。 */
  attempts?: UsageAttempt[]
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
  /** 按每百万 token 估算，只供界面参考。 */
  costUsd: number
  /** cacheRead / (input + cacheRead)。没有读入时为 0。 */
  cacheHitRate: number
}

const BUILTIN_PRICES: Record<string, ModelPrice> = {
  'deepseek-chat': { input: 0.27, output: 1.1, cacheRead: 0.07 },
  'claude-sonnet-4-5': { input: 3, output: 15, cacheRead: 0.3 },
  'gpt-5.4': { input: 2.5, output: 15, cacheRead: 0.25 },
  'grok-4': { input: 3, output: 15, cacheRead: 0.75 },
}

const DEFAULT_PRICE: ModelPrice = { input: 1, output: 3, cacheRead: 0.1 }

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

export function usageCounts(events: readonly UsageEvent[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const event of events) {
    if (event.status >= 400)
      continue
    counts[event.providerId] = (counts[event.providerId] ?? 0) + (event.outputTokens || 1)
  }
  return counts
}

function priceFor(model: string, prices?: Record<string, ModelPrice>): ModelPrice {
  if (prices?.[model])
    return prices[model]
  const bare = model.includes('--') ? model.slice(model.lastIndexOf('--') + 2) : model
  if (prices?.[bare])
    return prices[bare]
  return BUILTIN_PRICES[model] ?? BUILTIN_PRICES[bare] ?? DEFAULT_PRICE
}

export function summarizeUsage(events: readonly UsageEvent[], prices?: Record<string, ModelPrice>): UsageSummary {
  const summary: UsageSummary = {
    requests: 0,
    errors: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    byProvider: {},
    byModel: {},
    costUsd: 0,
    cacheHitRate: 0,
  }
  let cost = 0
  for (const event of events) {
    summary.requests += 1
    if (event.status >= 400)
      summary.errors += 1
    const input = event.inputTokens ?? 0
    const output = event.outputTokens ?? 0
    const cacheRead = event.cacheReadTokens ?? 0
    summary.inputTokens += input
    summary.outputTokens += output
    summary.cacheReadTokens += cacheRead
    summary.cacheWriteTokens += event.cacheWriteTokens ?? 0
    const price = priceFor(event.model || '', prices)
    cost += (input * price.input + output * price.output + cacheRead * (price.cacheRead ?? 0)) / 1_000_000
    const provider = summary.byProvider[event.providerId] ?? { requests: 0, errors: 0 }
    provider.requests += 1
    if (event.status >= 400)
      provider.errors += 1
    summary.byProvider[event.providerId] = provider
    const model = summary.byModel[event.model] ?? { requests: 0, outputTokens: 0 }
    model.requests += 1
    model.outputTokens += output
    summary.byModel[event.model] = model
  }
  const denom = summary.inputTokens + summary.cacheReadTokens
  summary.costUsd = Number(cost.toFixed(6))
  summary.cacheHitRate = denom > 0 ? summary.cacheReadTokens / denom : 0
  return summary
}
