import type { UpstreamProtocol } from './types'

/** Gemini 用 `/models`，已经带 `/v1` 的地址直接加 `/models`，其余加 `/v1/models`。 */
export function modelsUrl(protocol: UpstreamProtocol, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  if (protocol === 'gemini')
    return `${base}/models`
  if (base.endsWith('/v1'))
    return `${base}/models`
  return `${base}/v1/models`
}

/** 读 OpenAI 的 `data[].id`，或 Gemini 的 `models[].name`（去掉 `models/` 前缀）。 */
export function parseModelIds(body: unknown): string[] {
  if (!body || typeof body !== 'object')
    return []
  const row = body as { data?: unknown, models?: unknown }
  const ids: string[] = []
  if (Array.isArray(row.data)) {
    for (const item of row.data) {
      if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')
        ids.push((item as { id: string }).id)
    }
  }
  if (Array.isArray(row.models)) {
    for (const item of row.models) {
      if (!item || typeof item !== 'object')
        continue
      const name = (item as { name?: unknown }).name
      if (typeof name === 'string')
        ids.push(name.replace(/^models\//, ''))
    }
  }
  return ids
}
