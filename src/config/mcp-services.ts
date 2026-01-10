import type { McpServerConfig, McpService } from '../types'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { ensureI18nInitialized, i18n } from '../i18n'

// Pure business configuration without any i18n text
export interface McpServiceConfig {
  id: string
  requiresApiKey: boolean
  apiKeyEnvVar?: string
  config: McpServerConfig
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
  // Documentation and Search Services
  {
    id: 'context7',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp@latest'],
      env: {},
    },
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
  },
  // Browser and Automation Services
  {
    id: 'Playwright',
    requiresApiKey: false,
    config: createPlaywrightMcpConfig(), // Uses default profile with chromium browser
  },
  {
    id: 'puppeteer',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-puppeteer@latest'],
      env: {},
    },
  },
  // Anthropic Official MCP Services
  {
    id: 'filesystem',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-filesystem@latest', '.'],
      env: {},
    },
  },
  {
    id: 'memory',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-memory@latest'],
      env: {},
    },
  },
  {
    id: 'sequential-thinking',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-sequential-thinking@latest'],
      env: {},
    },
  },
  {
    id: 'fetch',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-fetch@latest'],
      env: {},
    },
  },
  {
    id: 'sqlite',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-sqlite@latest'],
      env: {},
    },
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
    {
      id: 'puppeteer',
      name: i18n.t('mcp:services.puppeteer.name'),
      description: i18n.t('mcp:services.puppeteer.description'),
    },
    // Anthropic Official MCP Services
    {
      id: 'filesystem',
      name: i18n.t('mcp:services.filesystem.name'),
      description: i18n.t('mcp:services.filesystem.description'),
    },
    {
      id: 'memory',
      name: i18n.t('mcp:services.memory.name'),
      description: i18n.t('mcp:services.memory.description'),
    },
    {
      id: 'sequential-thinking',
      name: i18n.t('mcp:services.sequential-thinking.name'),
      description: i18n.t('mcp:services.sequential-thinking.description'),
    },
    {
      id: 'fetch',
      name: i18n.t('mcp:services.fetch.name'),
      description: i18n.t('mcp:services.fetch.description'),
    },
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
