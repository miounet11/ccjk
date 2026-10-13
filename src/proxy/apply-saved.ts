import type { ApplyTarget } from './apply-config'
import type { ProxyMode } from './types'
import { randomBytes } from 'node:crypto'
import ansis from 'ansis'
import { join } from 'pathe'
import { getProviderSecret, setProviderSecret } from './accounts'
import { aggregateModelId, parseAggregateModelId } from './aggregate'
import { applyProxy, canConnectDirectly, wireApiFor } from './apply-config'
import { loadProxyConfig } from './config-store'
import { isProxyToolId } from './types'

export function ensureProxyToken(dir: string): string {
  const existing = getProviderSecret(dir, '__proxy_token__')
  if (existing)
    return existing
  const token = randomBytes(18).toString('hex')
  setProviderSecret(dir, '__proxy_token__', token)
  return token
}

export function chosenClientModel(mode: ProxyMode, providerId: string, model: string | undefined): string | undefined {
  if (!model)
    return undefined
  if (mode !== 'aggregation')
    return model
  if (parseAggregateModelId(model))
    return model
  return aggregateModelId(providerId, model)
}

/** 按每个工具已经保存的接法写入。直接连接写服务商自己的地址；经过本机和聚合写 /t/<工具>。 */
export function applySavedRoutes(dir: string, targets: ApplyTarget[], listenPort?: number): string[] {
  const config = loadProxyConfig(dir)
  const token = ensureProxyToken(dir)
  const port = listenPort || config.port
  const written: string[] = []
  for (const target of targets) {
    const route = isProxyToolId(target.tool) ? config.tools[target.tool] : undefined
    const mode = route?.mode ?? 'routing'
    const provider = route?.providerId
      ? config.providers.find(item => item.id === route.providerId)
      : undefined
    if (mode === 'direct' && !provider) {
      console.log(ansis.yellow(`${target.tool} 是直接连接，但还没选定服务商，已跳过`))
      continue
    }
    if (mode === 'direct' && provider && !canConnectDirectly(target.tool, provider.protocol)) {
      console.log(ansis.yellow(`${target.tool} 听不懂 ${provider.name} 的接口，已跳过。请改成经过本机。`))
      continue
    }
    const raw = route?.model || provider?.models[0] || provider?.id
    written.push(...applyProxy({
      targets: [target],
      proxyBaseUrl: `http://127.0.0.1:${port}`,
      proxyToken: token,
      snapshotDir: join(dir, 'proxy-snapshots'),
      mode,
      defaultModel: provider ? chosenClientModel(mode, provider.id, raw) : raw,
      upstreamBaseUrl: provider?.baseUrl,
      upstreamToken: provider ? (getProviderSecret(dir, provider.id) || '') : '',
      wireApi: provider ? wireApiFor(provider.protocol) : undefined,
    }))
  }
  return written
}
