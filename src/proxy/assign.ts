import type { ProxyToolId, RouteStrategy } from './types'
import { canConnectDirectly } from './apply-config'
import { loadProxyConfig, setToolRoute } from './config-store'
import { parseProviderModel } from './rewrite'
import { isProxyToolId } from './types'

/** 一步写成「这家 + 这个模型」。听得懂就直接连接，听不懂就经过本机。 */
export function assignModel(dir: string, tool: string, spec: string, strategy: RouteStrategy = 'order'): ProxyToolId {
  if (!isProxyToolId(tool))
    throw new Error('先选一个工具')
  const parsed = parseProviderModel(spec)
  const config = loadProxyConfig(dir)
  const provider = config.providers.find(item => item.id === parsed.providerId)
  if (!provider)
    throw new Error(`没有这家服务商：${parsed.providerId}`)
  const mode = canConnectDirectly(tool, provider.protocol) ? 'direct' : 'routing'
  setToolRoute(dir, tool, {
    mode,
    providerId: provider.id,
    model: parsed.model,
    strategy,
    failover: [provider.id],
  })
  return tool
}
