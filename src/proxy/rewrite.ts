import type { CanonicalRequest } from './types'
import { aggregateModelId, assertProviderId } from './aggregate'

/** `服务商/模型`。模型名本身可以再带斜杠。 */
export function parseProviderModel(spec: string): { providerId: string, model: string } {
  const slash = spec.indexOf('/')
  if (slash <= 0 || slash === spec.length - 1)
    throw new Error('写成 服务商/模型，例如 deepseek/deepseek-chat')
  return { providerId: spec.slice(0, slash).trim(), model: spec.slice(slash + 1).trim() }
}

/**
 * 别名目标写成 `服务商/模型` 时，改成聚合 id，这样粘性路由会打到那一家。
 * 目标不是这种写法，或服务商 id 不合法，就保持原样。
 */
export function rewriteModel(model: string, aliases?: Record<string, string>): string {
  const target = aliases?.[model]?.trim()
  if (!target)
    return model
  const slash = target.indexOf('/')
  if (slash <= 0 || slash === target.length - 1)
    return target
  const providerId = target.slice(0, slash).trim()
  const name = target.slice(slash + 1).trim()
  try {
    assertProviderId(providerId)
  }
  catch {
    return model
  }
  return aggregateModelId(providerId, name)
}

/** 把补充说明加在已有系统说明前面；没有系统说明就新插一条。 */
export function withSystemPrompt(request: CanonicalRequest, prompt?: string): CanonicalRequest {
  const extra = prompt?.trim()
  if (!extra)
    return request
  const messages = request.messages.slice()
  const first = messages[0]
  if (first?.role === 'system')
    messages[0] = { ...first, text: first.text ? `${extra}\n${first.text}` : extra }
  else
    messages.unshift({ role: 'system', text: extra })
  return { ...request, messages }
}
