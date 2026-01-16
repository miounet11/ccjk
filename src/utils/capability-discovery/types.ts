/**
 * Capability Discovery Types
 * Defines data models for capability scanning and display
 */

export type CapabilityType = 'command' | 'skill' | 'agent' | 'mcp' | 'superpower'
export type CapabilityStatus = 'active' | 'inactive' | 'error'

export interface Capability {
  id: string
  name: string
  type: CapabilityType
  status: CapabilityStatus
  priority: number
  description: string
  triggers?: string[]
  path?: string
  version?: string
  error?: string
}

export interface CapabilityScanResult {
  commands: Capability[]
  skills: Capability[]
  agents: Capability[]
  mcpServices: Capability[]
  superpowers: Capability[]
  total: number
  activeCount: number
  errorCount: number
}

export interface WelcomeOptions {
  showVersion?: boolean
  showStats?: boolean
  showRecommendations?: boolean
  compact?: boolean
}

export interface StatusOptions {
  detailed?: boolean
  filterType?: CapabilityType
  filterStatus?: CapabilityStatus
}
