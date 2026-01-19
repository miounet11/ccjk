/**
 * MCP Service Tier System
 * Categorizes MCP services by usage frequency and resource requirements
 */

/**
 * MCP service tier levels
 * - core: Essential services, always loaded
 * - ondemand: Loaded when needed, auto-released after idle
 * - scenario: Loaded for specific scenarios, longer idle timeout
 */
export type McpTier = 'core' | 'ondemand' | 'scenario'

/**
 * Configuration for each tier level
 */
export interface McpTierConfig {
  tier: McpTier
  autoStart: boolean
  idleTimeout?: number // seconds, undefined = never timeout
  maxConcurrent?: number
  description: string
}

/**
 * Default configurations for each tier
 */
export const MCP_TIER_DEFAULTS: Record<McpTier, McpTierConfig> = {
  core: {
    tier: 'core',
    autoStart: true,
    idleTimeout: undefined, // Never timeout
    description: 'Essential services, always available',
  },
  ondemand: {
    tier: 'ondemand',
    autoStart: false,
    idleTimeout: 300, // 5 minutes
    description: 'Loaded when needed, auto-released after idle',
  },
  scenario: {
    tier: 'scenario',
    autoStart: false,
    idleTimeout: 600, // 10 minutes
    description: 'Loaded for specific scenarios',
  },
}

/**
 * Service to tier mapping
 * Defines which tier each MCP service belongs to
 */
export const MCP_SERVICE_TIERS: Record<string, McpTier> = {
  // Core services - high frequency, essential
  'context7': 'core',
  'open-websearch': 'core',

  // On-demand services - medium frequency
  'mcp-deepwiki': 'ondemand',
  'Playwright': 'ondemand',
  // Removed: puppeteer (duplicate of Playwright), filesystem (buggy),
  //          memory (Claude built-in), sequential-thinking (limited value), fetch (Claude WebFetch)

  // Scenario services - low frequency, specific use cases
  'sqlite': 'scenario',
  'spec-workflow': 'scenario',
  'serena': 'scenario',
}

/**
 * Get tier configuration for a specific service
 */
export function getMcpTierConfig(serviceId: string): McpTierConfig {
  const tier = MCP_SERVICE_TIERS[serviceId] || 'ondemand'
  return MCP_TIER_DEFAULTS[tier]
}

/**
 * Get all services in a specific tier
 */
export function getServicesByTier(tier: McpTier): string[] {
  return Object.entries(MCP_SERVICE_TIERS)
    .filter(([_, t]) => t === tier)
    .map(([id]) => id)
}

/**
 * Check if a service is in the core tier
 */
export function isCoreService(serviceId: string): boolean {
  return MCP_SERVICE_TIERS[serviceId] === 'core'
}

/**
 * Get recommended services for minimal setup
 */
export function getMinimalServices(): string[] {
  return getServicesByTier('core')
}

/**
 * Performance thresholds for warnings
 */
export const MCP_PERFORMANCE_THRESHOLDS = {
  /** Warning threshold for number of services */
  warningCount: 5,
  /** Critical threshold for number of services */
  criticalCount: 8,
  /** Maximum recommended services */
  maxRecommended: 6,
  /** Estimated memory per service (MB) */
  estimatedMemoryPerService: 50,
  /** Estimated CPU overhead per service (%) */
  estimatedCpuPerService: 5,
}
