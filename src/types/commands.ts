import type { AgentCapability } from '../plugins-v2/types'

export interface CcjkAgentsOptions {
  mode?: 'template' | 'custom' | 'auto'
  template?: string
  skills?: string[]
  mcpServers?: string[]
  persona?: string
  capabilities?: AgentCapability[]
  all?: boolean
  dryRun?: boolean
  json?: boolean
}