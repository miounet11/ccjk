export type CircuitState = 'closed' | 'open' | 'half-open'

export interface CircuitOptions {
  threshold?: number
  cooldownMs?: number
  now?: () => number
}

interface CircuitEntry {
  failures: number
  openedAt?: number
  halfOpen: boolean
}

/**
 * 连续失败后打开，冷却结束允许一次半开试探。
 * 半开成功回到关闭，半开失败重新打开。
 */
export class CircuitBreaker {
  private readonly threshold: number
  private readonly cooldownMs: number
  private readonly now: () => number
  private readonly entries = new Map<string, CircuitEntry>()

  constructor(options: CircuitOptions = {}) {
    this.threshold = options.threshold ?? 3
    this.cooldownMs = options.cooldownMs ?? 30_000
    this.now = options.now ?? Date.now
  }

  state(id: string): CircuitState {
    const entry = this.entry(id)
    if (entry.openedAt === undefined)
      return 'closed'
    if (this.now() - entry.openedAt < this.cooldownMs)
      return 'open'
    return 'half-open'
  }

  canRequest(id: string): boolean {
    const state = this.state(id)
    if (state === 'closed' || state === 'half-open')
      return true
    return false
  }

  success(id: string): void {
    this.entries.set(id, { failures: 0, halfOpen: false })
  }

  failure(id: string): void {
    const entry = this.entry(id)
    const state = this.state(id)
    if (state === 'half-open') {
      this.entries.set(id, { failures: this.threshold, openedAt: this.now(), halfOpen: false })
      return
    }
    const failures = entry.failures + 1
    if (failures >= this.threshold)
      this.entries.set(id, { failures, openedAt: this.now(), halfOpen: false })
    else
      this.entries.set(id, { failures, halfOpen: false })
  }

  snapshot(): Record<string, CircuitState> {
    const out: Record<string, CircuitState> = {}
    for (const id of this.entries.keys())
      out[id] = this.state(id)
    return out
  }

  private entry(id: string): CircuitEntry {
    return this.entries.get(id) ?? { failures: 0, halfOpen: false }
  }
}

/** 默认上游在前，其余按配置顺序，去掉空值和重复。 */
export function failoverOrder(primary: string | undefined, chain: readonly string[]): string[] {
  const out: string[] = []
  const push = (id: string | undefined) => {
    const trimmed = id?.trim()
    if (!trimmed || out.includes(trimmed))
      return
    out.push(trimmed)
  }
  push(primary)
  for (const id of chain)
    push(id)
  return out
}

/** 跳过已经打开的熔断器。全都打开时返回 null，调用方原样报错。 */
export function pickProvider(ids: readonly string[], breaker: CircuitBreaker): string | null {
  for (const id of ids) {
    if (breaker.canRequest(id))
      return id
  }
  return null
}
