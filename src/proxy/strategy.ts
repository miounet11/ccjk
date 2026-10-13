import type { RouteStrategy } from './types'

export interface StrategyPick {
  strategy: RouteStrategy
  chain: readonly string[]
  cursor: number
  counts: Readonly<Record<string, number>>
  stickyId?: string
  healthy: (id: string) => boolean
}

/** 健康的粘性上游优先。轮流从游标起步，用量取最少的，平手保持名单顺序。 */
export function pickByStrategy(input: StrategyPick): { id?: string, nextCursor: number } {
  const chain = input.chain.filter(id => id.trim())
  if (chain.length === 0)
    return { nextCursor: input.cursor }
  if (input.stickyId && chain.includes(input.stickyId) && input.healthy(input.stickyId))
    return { id: input.stickyId, nextCursor: input.cursor }
  if (input.strategy === 'rotate') {
    const start = ((input.cursor % chain.length) + chain.length) % chain.length
    for (let step = 0; step < chain.length; step++) {
      const id = chain[(start + step) % chain.length]
      if (input.healthy(id))
        return { id, nextCursor: (start + 1) % chain.length }
    }
    return { nextCursor: input.cursor }
  }
  const healthy = chain.filter(id => input.healthy(id))
  if (healthy.length === 0)
    return { nextCursor: input.cursor }
  if (input.strategy === 'usage') {
    let best = healthy[0]
    let bestCount = input.counts[best] ?? 0
    for (const id of healthy) {
      const count = input.counts[id] ?? 0
      if (count < bestCount) {
        best = id
        bestCount = count
      }
    }
    return { id: best, nextCursor: input.cursor }
  }
  return { id: healthy[0], nextCursor: input.cursor }
}

/** 同一段系统说明加第一句用户话，上游还健康时继续用同一家。空串表示不粘。 */
export function sessionKeyOf(request: { messages: readonly { role: string, text?: string }[] }): string {
  const system = request.messages.find(message => message.role === 'system')?.text ?? ''
  const user = request.messages.find(message => message.role === 'user')?.text ?? ''
  return `${system}\n${user}`.trim().slice(0, 180)
}
