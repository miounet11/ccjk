/**
 * MCP Profile System
 * Pre-configured service combinations for different use cases
 */

import type { McpTier } from './mcp-tiers'

/**
 * MCP Profile definition
 */
export interface McpProfile {
  id: string
  name: string
  nameZh: string
  description: string
  descriptionZh: string
  services: string[]
  maxServices?: number
  tier?: McpTier
  isDefault?: boolean
}

/**
 * Pre-defined MCP profiles
 */
export const MCP_PROFILES: McpProfile[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    nameZh: '极简模式',
    description: 'Core services only, best performance',
    descriptionZh: '仅核心服务，最佳性能',
    services: ['context7', 'open-websearch'],
    maxServices: 3,
    tier: 'core',
  },
  {
    id: 'development',
    name: 'Development',
    nameZh: '开发模式',
    description: 'Suitable for daily development',
    descriptionZh: '适合日常开发',
    services: ['context7', 'open-websearch', 'mcp-deepwiki', 'filesystem'],
    maxServices: 5,
    tier: 'ondemand',
    isDefault: true,
  },
  {
    id: 'testing',
    name: 'Testing',
    nameZh: '测试模式',
    description: 'Includes browser automation',
    descriptionZh: '包含浏览器自动化',
    services: ['context7', 'open-websearch', 'Playwright'],
    maxServices: 4,
    tier: 'ondemand',
  },
  {
    id: 'research',
    name: 'Research',
    nameZh: '研究模式',
    description: 'Enhanced documentation and search',
    descriptionZh: '增强文档和搜索功能',
    services: ['context7', 'open-websearch', 'mcp-deepwiki', 'memory', 'sequential-thinking'],
    maxServices: 6,
    tier: 'ondemand',
  },
  {
    id: 'full',
    name: 'Full',
    nameZh: '全功能模式',
    description: 'All services (high resource usage)',
    descriptionZh: '所有服务（高资源消耗）',
    services: [], // Empty means all services
    maxServices: undefined,
    tier: 'scenario',
  },
]

/**
 * Get profile by ID
 */
export function getProfileById(id: string): McpProfile | undefined {
  return MCP_PROFILES.find(p => p.id === id)
}

/**
 * Get default profile
 */
export function getDefaultProfile(): McpProfile {
  return MCP_PROFILES.find(p => p.isDefault) || MCP_PROFILES[0]
}

/**
 * Get all profile IDs
 */
export function getProfileIds(): string[] {
  return MCP_PROFILES.map(p => p.id)
}

/**
 * Check if a profile ID is valid
 */
export function isValidProfileId(id: string): boolean {
  return MCP_PROFILES.some(p => p.id === id)
}

/**
 * Get profile name with i18n support
 */
export function getProfileName(profile: McpProfile, lang: 'en' | 'zh-CN' = 'en'): string {
  return lang === 'zh-CN' ? profile.nameZh : profile.name
}

/**
 * Get profile description with i18n support
 */
export function getProfileDescription(profile: McpProfile, lang: 'en' | 'zh-CN' = 'en'): string {
  return lang === 'zh-CN' ? profile.descriptionZh : profile.description
}

/**
 * Create a custom profile
 */
export function createCustomProfile(
  id: string,
  name: string,
  services: string[],
  description?: string,
): McpProfile {
  return {
    id,
    name,
    nameZh: name,
    description: description || `Custom profile: ${name}`,
    descriptionZh: description || `自定义配置: ${name}`,
    services,
    maxServices: services.length + 2,
  }
}
