import type { McpAutoThreshold, McpServerConfig, McpService } from '../types'
import { execSync } from 'node:child_process'
import { homedir } from 'node:os'
import process from 'node:process'

import { join } from 'pathe'

import { ensureI18nInitialized, i18n } from '../i18n'

/** Supported platform types for MCP services */
export type McpPlatform = 'windows' | 'macos' | 'linux' | 'wsl' | 'termux'

/**
 * MCP Tool Search configuration for Claude Code CLI 2.1.7+
 * Implements auto-mode for deferred tool loading when descriptions exceed threshold
 *
 * @see https://docs.anthropic.com/en/docs/build-with-claude/mcp#tool-search-auto-mode
 */
export interface McpToolSearchConfig {
  /**
   * Auto mode threshold percentage (0-100) or special values
   * - Number: Defer tool loading when descriptions exceed this % of context window
   * - 'always': Load all tools immediately (0% threshold)
   * - 'never': Defer all tools until requested (100% threshold)
   * @default 10 (per Claude Code 2.1.7 spec)
   */
  mcpAutoEnableThreshold?: McpAutoThreshold

  /**
   * Enable dynamic service discovery
   * Allows runtime addition/removal of MCP services without restart
   * @default true
   */
  dynamicServiceDiscovery?: boolean

  /**
   * Enable list_changed notifications
   * When enabled, Claude receives notifications when available tools change
   * @default true
   */
  listChangedNotifications?: boolean

  /**
   * Services excluded from auto-mode (always loaded immediately)
   * Core services like 'mcp-search', 'context7' are always excluded
   * @default ['mcp-search', 'context7', 'sqlite']
   */
  excludedServices?: string[]
}

/**
 * List changed notification payload
 * Sent when MCP services are added/removed dynamically
 */
export interface McpListChangedNotification {
  /** Type of change */
  type: 'added' | 'removed' | 'updated'

  /** Service ID that changed */
  serviceId: string

  /** Timestamp of change */
  timestamp: number

  /** New service configuration (for added/updated) */
  config?: McpServerConfig
}

/** Platform compatibility requirements for MCP services */
export interface McpPlatformRequirements {
  /** List of supported platforms. If undefined, all platforms are supported */
  platforms?: McpPlatform[]
  /** Whether the service requires a GUI environment (e.g., browser automation) */
  requiresGui?: boolean
  /** Required system commands that must be available */
  requiredCommands?: string[]
}

// Pure business configuration without any i18n text
export interface McpServiceConfig {
  id: string
  requiresApiKey: boolean
  apiKeyEnvVar?: string
  config: McpServerConfig
  /** Platform compatibility requirements. If undefined, service works on all platforms */
  platformRequirements?: McpPlatformRequirements
}

/**
 * Playwright MCP configuration options
 */
export interface PlaywrightMcpOptions {
  /** Profile name for user data directory (default: 'default') */
  profile?: string
  /** Run browser in headless mode (default: false) */
  headless?: boolean
  /** Browser type: chromium, firefox, webkit (default: 'chromium') */
  browser?: 'chromium' | 'firefox' | 'webkit'
  /** Custom user data directory path (overrides profile) */
  userDataDir?: string
}

/**
 * Default Playwright profiles directory
 */
export const PLAYWRIGHT_PROFILES_DIR = join(homedir(), '.ccjk', 'playwright')

/**
 * Generate Playwright MCP configuration with custom options
 * Useful for multi-agent concurrent tasks with separate browser profiles
 *
 * @param options - Playwright MCP configuration options
 * @returns McpServerConfig for Playwright MCP
 *
 * @example
 * // Create config for agent 1
 * const agent1Config = createPlaywrightMcpConfig({ profile: 'agent-1' })
 *
 * // Create config for agent 2 with headless mode
 * const agent2Config = createPlaywrightMcpConfig({ profile: 'agent-2', headless: true })
 *
 * // Create config with custom user data directory
 * const customConfig = createPlaywrightMcpConfig({ userDataDir: '/custom/path' })
 */
export function createPlaywrightMcpConfig(options: PlaywrightMcpOptions = {}): McpServerConfig {
  const {
    profile = 'default',
    headless = false,
    browser = 'chromium',
    userDataDir,
  } = options

  const resolvedUserDataDir = userDataDir || join(PLAYWRIGHT_PROFILES_DIR, profile)

  const args: string[] = ['-y', '@playwright/mcp@latest']

  // Add browser option
  args.push('--browser', browser)

  // Add user data directory for profile isolation
  args.push('--user-data-dir', resolvedUserDataDir)

  // Add headless option if enabled
  if (headless) {
    args.push('--headless')
  }

  return {
    type: 'stdio',
    command: 'npx',
    args,
    env: {},
  }
}

/**
 * Generate multiple Playwright MCP configurations for concurrent agents
 *
 * @param count - Number of agent profiles to generate
 * @param baseOptions - Base options applied to all profiles
 * @returns Array of McpServerConfig with unique profiles
 *
 * @example
 * // Generate 3 agent profiles
 * const configs = createPlaywrightMcpConfigs(3)
 * // Results in profiles: agent-1, agent-2, agent-3
 *
 * // Generate 2 headless agent profiles
 * const headlessConfigs = createPlaywrightMcpConfigs(2, { headless: true })
 */
export function createPlaywrightMcpConfigs(
  count: number,
  baseOptions: Omit<PlaywrightMcpOptions, 'profile'> = {},
): McpServerConfig[] {
  return Array.from({ length: count }, (_, i) =>
    createPlaywrightMcpConfig({
      ...baseOptions,
      profile: `agent-${i + 1}`,
    }))
}

export const MCP_SERVICE_CONFIGS: McpServiceConfig[] = [
  // Documentation and Search Services - Universal (no GUI required)
  {
    id: 'context7',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp@latest'],
      env: {},
    },
    // Works on all platforms - no special requirements
  },
  {
    id: 'open-websearch',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'open-websearch@latest'],
      env: {
        MODE: 'stdio',
        DEFAULT_SEARCH_ENGINE: 'duckduckgo',
        ALLOWED_SEARCH_ENGINES: 'duckduckgo,bing,brave',
      },
    },
    // Works on all platforms - no special requirements
  },
  {
    id: 'mcp-deepwiki',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-deepwiki@latest'],
      env: {},
    },
    // Works on all platforms - no special requirements
  },
  // Development Workflow Services
  {
    id: 'spec-workflow',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@pimzino/spec-workflow-mcp@latest'],
      env: {},
    },
    // Works on all platforms - no special requirements
  },
  {
    id: 'serena',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'uvx',
      args: ['--from', 'git+https://github.com/oraios/serena', 'serena', 'start-mcp-server', '--context', 'ide-assistant', '--enable-web-dashboard', 'false'],
      env: {},
    },
    platformRequirements: {
      requiredCommands: ['uvx'], // Requires uv/uvx to be installed
    },
  },
  // Browser and Automation Services - Require GUI environment
  {
    id: 'Playwright',
    requiresApiKey: false,
    config: createPlaywrightMcpConfig(), // Uses default profile with chromium browser
    platformRequirements: {
      platforms: ['macos', 'windows'], // GUI required - exclude headless Linux/WSL/Termux
      requiresGui: true,
    },
  },
  // Anthropic Official MCP Services - Universal
  // Note: Removed low-value services: filesystem (buggy), puppeteer (duplicate of Playwright),
  //       memory (Claude has built-in memory), fetch (Claude has WebFetch), sequential-thinking (limited value)
  {
    id: 'sqlite',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-sqlite@latest'],
      env: {},
    },
    // Works on all platforms - no special requirements
  },
]

/**
 * Get complete MCP service list with translations
 */
export async function getMcpServices(): Promise<McpService[]> {
  ensureI18nInitialized()

  // Create static MCP service list for i18n-ally compatibility
  const mcpServiceList = [
    // Documentation and Search Services
    {
      id: 'context7',
      name: i18n.t('mcp:services.context7.name'),
      description: i18n.t('mcp:services.context7.description'),
    },
    {
      id: 'open-websearch',
      name: i18n.t('mcp:services.open-websearch.name'),
      description: i18n.t('mcp:services.open-websearch.description'),
    },
    {
      id: 'mcp-deepwiki',
      name: i18n.t('mcp:services.mcp-deepwiki.name'),
      description: i18n.t('mcp:services.mcp-deepwiki.description'),
    },
    // Development Workflow Services
    {
      id: 'spec-workflow',
      name: i18n.t('mcp:services.spec-workflow.name'),
      description: i18n.t('mcp:services.spec-workflow.description'),
    },
    {
      id: 'serena',
      name: i18n.t('mcp:services.serena.name'),
      description: i18n.t('mcp:services.serena.description'),
    },
    // Browser and Automation Services
    {
      id: 'Playwright',
      name: i18n.t('mcp:services.playwright.name'),
      description: i18n.t('mcp:services.playwright.description'),
    },
    // Anthropic Official MCP Services
    // Note: Removed low-value services: filesystem (buggy), puppeteer (duplicate),
    //       memory (Claude built-in), fetch (Claude WebFetch), sequential-thinking (limited value)
    {
      id: 'sqlite',
      name: i18n.t('mcp:services.sqlite.name'),
      description: i18n.t('mcp:services.sqlite.description'),
    },
  ]

  return MCP_SERVICE_CONFIGS.map((config) => {
    const serviceInfo = mcpServiceList.find(s => s.id === config.id)
    const service: McpService = {
      id: config.id,
      name: serviceInfo?.name || config.id,
      description: serviceInfo?.description || '',
      requiresApiKey: config.requiresApiKey,
      config: config.config,
    }

    if (config.apiKeyEnvVar) {
      service.apiKeyEnvVar = config.apiKeyEnvVar
    }

    return service
  })
}

/**
 * Get specified MCP service by ID
 */
export async function getMcpService(id: string): Promise<McpService | undefined> {
  const services = await getMcpServices()
  return services.find(service => service.id === id)
}

/**
 * Platform detection utilities for MCP service compatibility
 * Note: Uses McpPlatform type defined above, with 'unknown' for unrecognized platforms
 */
export type Platform = McpPlatform | 'unknown'

/**
 * Detect current platform with detailed environment info
 */
export function detectPlatform(): { platform: Platform, hasGui: boolean, isHeadless: boolean } {
  const platform = process.platform
  const env = process.env

  // Check for WSL (Windows Subsystem for Linux)
  const isWsl = !!(env.WSL_DISTRO_NAME || env.WSLENV || (env.PATH && env.PATH.includes('/mnt/c/')))

  // Check for Termux (Android terminal)
  const isTermux = !!(env.TERMUX_VERSION || env.PREFIX?.includes('com.termux'))

  // Check for headless/SSH environment
  const isHeadless = !!(
    env.SSH_CLIENT
    || env.SSH_TTY
    || env.SSH_CONNECTION
    || (!env.DISPLAY && platform === 'linux')
  )

  // Determine if GUI is available
  const hasGui = (() => {
    if (platform === 'darwin')
      return true // macOS always has GUI
    if (platform === 'win32')
      return !isHeadless // Windows has GUI unless SSH
    if (isWsl || isTermux)
      return false // WSL/Termux typically no GUI
    if (platform === 'linux')
      return !!env.DISPLAY || !!env.WAYLAND_DISPLAY // Linux needs X11/Wayland
    return false
  })()

  // Determine platform type
  let detectedPlatform: Platform
  if (platform === 'darwin') {
    detectedPlatform = 'macos'
  }
  else if (platform === 'win32') {
    detectedPlatform = 'windows'
  }
  else if (isWsl) {
    detectedPlatform = 'wsl'
  }
  else if (isTermux) {
    detectedPlatform = 'termux'
  }
  else if (platform === 'linux') {
    detectedPlatform = 'linux'
  }
  else {
    detectedPlatform = 'unknown'
  }

  return {
    platform: detectedPlatform,
    hasGui,
    isHeadless,
  }
}

/**
 * Check if a command is available in PATH
 */
export function isCommandAvailable(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' })
    return true
  }
  catch {
    return false
  }
}

/**
 * Check if an MCP service is compatible with current platform
 */
export function isMcpServiceCompatible(serviceId: string): { compatible: boolean, reason?: string } {
  const config = MCP_SERVICE_CONFIGS.find(c => c.id === serviceId)
  if (!config) {
    return { compatible: false, reason: 'Service not found' }
  }

  const requirements = config.platformRequirements
  if (!requirements) {
    return { compatible: true } // No requirements = universal
  }

  const { platform, hasGui } = detectPlatform()

  // Check platform restriction
  if (requirements.platforms && requirements.platforms.length > 0) {
    // Skip check for unknown platform - allow service to try
    if (platform !== 'unknown' && !requirements.platforms.includes(platform)) {
      return {
        compatible: false,
        reason: `Not supported on ${platform}. Requires: ${requirements.platforms.join(', ')}`,
      }
    }
  }

  // Check GUI requirement
  if (requirements.requiresGui && !hasGui) {
    return {
      compatible: false,
      reason: 'Requires GUI environment (X11/Wayland/Desktop)',
    }
  }

  // Check required commands
  if (requirements.requiredCommands) {
    for (const cmd of requirements.requiredCommands) {
      if (!isCommandAvailable(cmd)) {
        return {
          compatible: false,
          reason: `Required command not found: ${cmd}`,
        }
      }
    }
  }

  return { compatible: true }
}

/**
 * Get only platform-compatible MCP services
 */
export async function getCompatibleMcpServices(): Promise<McpService[]> {
  const allServices = await getMcpServices()
  return allServices.filter((service) => {
    const { compatible } = isMcpServiceCompatible(service.id)
    return compatible
  })
}

/**
 * Get MCP services with compatibility info
 */
export async function getMcpServicesWithCompatibility(): Promise<Array<McpService & { compatible: boolean, incompatibleReason?: string }>> {
  const allServices = await getMcpServices()
  return allServices.map((service) => {
    const { compatible, reason } = isMcpServiceCompatible(service.id)
    return {
      ...service,
      compatible,
      incompatibleReason: reason,
    }
  })
}

// ============================================================================
// MCP Tool Search Auto-Mode Configuration (v3.8+)
// ============================================================================

/**
 * Default MCP tool search configuration
 */
export const DEFAULT_MCP_TOOL_SEARCH_CONFIG: Required<McpToolSearchConfig> = {
  mcpAutoEnableThreshold: 10, // 10% per Claude Code 2.1.7 spec
  dynamicServiceDiscovery: true,
  listChangedNotifications: true,
  excludedServices: ['mcp-search', 'context7', 'sqlite'],
}

/**
 * Get MCP tool search configuration
 * Reads from environment or returns defaults
 *
 * Environment variables:
 * - MCP_AUTO_THRESHOLD: auto:N syntax (e.g., "auto:15", "auto:always", "auto:never")
 * - MCP_DYNAMIC_DISCOVERY: "true" or "false"
 * - MCP_LIST_CHANGED: "true" or "false"
 *
 * @returns Current MCP tool search configuration
 */
export function getMcpToolSearchConfig(): Required<McpToolSearchConfig> {
  const env = process.env

  return {
    mcpAutoEnableThreshold: env.MCP_AUTO_THRESHOLD as McpAutoThreshold || DEFAULT_MCP_TOOL_SEARCH_CONFIG.mcpAutoEnableThreshold,
    dynamicServiceDiscovery: env.MCP_DYNAMIC_DISCOVERY !== 'false',
    listChangedNotifications: env.MCP_LIST_CHANGED !== 'false',
    excludedServices: env.MCP_EXCLUDED_SERVICES?.split(',').map(s => s.trim()).filter(Boolean) || DEFAULT_MCP_TOOL_SEARCH_CONFIG.excludedServices,
  }
}

/**
 * Check if a service is excluded from auto-mode
 *
 * @param serviceId - Service ID to check
 * @param config - Optional tool search config (uses current if not provided)
 * @returns True if service should always load immediately
 */
export function isServiceExcludedFromAutoMode(serviceId: string, config?: McpToolSearchConfig): boolean {
  const toolSearchConfig = config || getMcpToolSearchConfig()
  return toolSearchConfig.excludedServices?.includes(serviceId) || DEFAULT_MCP_TOOL_SEARCH_CONFIG.excludedServices.includes(serviceId)
}

/**
 * Create a list_changed notification
 *
 * @param type - Type of change
 * @param serviceId - Service ID that changed
 * @param config - New service configuration (for added/updated)
 * @returns Notification payload
 */
export function createListChangedNotification(
  type: 'added' | 'removed' | 'updated',
  serviceId: string,
  config?: McpServerConfig,
): McpListChangedNotification {
  return {
    type,
    serviceId,
    timestamp: Date.now(),
    config,
  }
}

/**
 * Dynamic service registry for runtime service discovery
 * Allows adding/removing MCP services without restart
 */
class DynamicMcpServiceRegistry {
  private _services: Map<string, McpServerConfig> = new Map()
  private _listeners: Set<(notification: McpListChangedNotification) => void> = new Set()
  private _enabled: boolean = false

  /**
   * Enable dynamic service discovery
   */
  enable(): void {
    this._enabled = true
  }

  /**
   * Disable dynamic service discovery
   */
  disable(): void {
    this._enabled = false
  }

  /**
   * Check if dynamic discovery is enabled
   */
  isEnabled(): boolean {
    return this._enabled
  }

  /**
   * Add a service dynamically
   */
  addService(serviceId: string, config: McpServerConfig): boolean {
    if (!this._enabled) {
      return false
    }

    const isUpdate = this._services.has(serviceId)
    this._services.set(serviceId, config)

    this._notify({
      type: isUpdate ? 'updated' : 'added',
      serviceId,
      timestamp: Date.now(),
      config,
    })

    return true
  }

  /**
   * Remove a service dynamically
   */
  removeService(serviceId: string): boolean {
    if (!this._enabled || !this._services.has(serviceId)) {
      return false
    }

    const config = this._services.get(serviceId)
    this._services.delete(serviceId)

    this._notify({
      type: 'removed',
      serviceId,
      timestamp: Date.now(),
      config,
    })

    return true
  }

  /**
   * Get a service configuration
   */
  getService(serviceId: string): McpServerConfig | undefined {
    return this._services.get(serviceId)
  }

  /**
   * List all dynamically registered services
   */
  listServices(): Map<string, McpServerConfig> {
    return new Map(this._services)
  }

  /**
   * Subscribe to list change notifications
   */
  subscribe(listener: (notification: McpListChangedNotification) => void): () => void {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  /**
   * Notify all listeners of a change
   */
  private _notify(notification: McpListChangedNotification): void {
    const toolSearchConfig = getMcpToolSearchConfig()

    if (toolSearchConfig.listChangedNotifications) {
      for (const listener of Array.from(this._listeners)) {
        try {
          listener(notification)
        }
        catch (error) {
          console.error('Error notifying MCP list change listener:', error)
        }
      }
    }
  }
}

/**
 * Global dynamic MCP service registry instance
 */
export const dynamicMcpRegistry = new DynamicMcpServiceRegistry()

/**
 * Initialize dynamic service discovery based on configuration
 * Called during CCJK initialization to enable/disable the feature
 */
export function initializeDynamicServiceDiscovery(): void {
  const config = getMcpToolSearchConfig()

  if (config.dynamicServiceDiscovery) {
    dynamicMcpRegistry.enable()
  }
  else {
    dynamicMcpRegistry.disable()
  }
}
