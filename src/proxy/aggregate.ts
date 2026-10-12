import type { ProxyProvider } from './types'

/** 聚合模型 id：`ccjk-<providerId>--<model>`。供应商 id 本身不能含 `--`。 */
export function aggregateModelId(providerId: string, model: string): string {
  return `ccjk-${providerId}--${model}`
}

export function parseAggregateModelId(model: string): { providerId: string, model: string } | null {
  if (!model.startsWith('ccjk-'))
    return null
  const rest = model.slice('ccjk-'.length)
  const splitAt = rest.indexOf('--')
  if (splitAt <= 0 || splitAt === rest.length - 2)
    return null
  return {
    providerId: rest.slice(0, splitAt),
    model: rest.slice(splitAt + 2),
  }
}

export interface AggregateModelRow {
  id: string
  providerId: string
  model: string
  ownedBy: string
}

export function listAggregateModels(members: readonly ProxyProvider[]): AggregateModelRow[] {
  const rows: AggregateModelRow[] = []
  for (const provider of members) {
    const models = provider.models.length > 0 ? provider.models : ['default']
    for (const model of models) {
      rows.push({
        id: aggregateModelId(provider.id, model),
        providerId: provider.id,
        model,
        ownedBy: provider.name || provider.id,
      })
    }
  }
  return rows
}

export function assertProviderId(id: string): void {
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(id))
    throw new Error(`供应商 id 只能用小写字母、数字和短横线：${id}`)
  if (id.includes('--'))
    throw new Error('供应商 id 不能包含 --')
}
