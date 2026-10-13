import type { ProxyToolId } from './types'
import { PROXY_TOOL_IDS } from './types'

/** 一个都没探测到时返回全部，避免侧边栏是空的。 */
export function installedTools(probe: (tool: ProxyToolId) => boolean): ProxyToolId[] {
  const found = PROXY_TOOL_IDS.filter(tool => probe(tool))
  return found.length > 0 ? [...found] : [...PROXY_TOOL_IDS]
}
