/**
 * MCP Service Installer
 * Provides functions to install, uninstall, and list MCP services
 * for both Claude Code and Codex
 */

import type { CodeToolType } from '../constants'
import type { McpServerConfig } from '../types'
import type { CodexConfigData, CodexMcpService } from './code-tools/codex'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { getMcpService, getMcpServices, MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { updateClaudeConfig } from '../config/unified/claude-config'
import { ClAUDE_CONFIG_FILE, CODEX_CONFIG_FILE } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { buildMcpServerConfig, readMcpConfig, writeMcpConfig } from './claude-config'
import { readCodexConfig, writeCodexConfig } from './code-tools/codex'
import { applyCodexPlatformCommand } from './code-tools/codex-platform'
import { exists } from './fs-operations'
import { getSystemRoot, isWindows } from './platform'

export interface McpInstallResult {
  success: boolean
  serviceId: string
  serviceName: string
  error?: string
}

export interface McpUninstallResult {
  success: boolean
  serviceId: string
  error?: string
}

export interface InstalledMcpService {
  id: string
  name: string
  command?: string
  args?: string[]
  url?: string
  type: 'stdio' | 'sse'
}

/**
 * Detect which code tool is currently active/configured
 * @returns The detected code tool type
 */
export function detectActiveTool(): CodeToolType {
  // Check if Claude Code config exists
  const hasClaudeConfig = exists(ClAUDE_CONFIG_FILE)
  // Check if Codex config exists
  const hasCodexConfig = exists(CODEX_CONFIG_FILE)

  // If both exist, prefer Claude Code (more common)
  if (hasClaudeConfig) {
    return 'claude-code'
  }
  if (hasCodexConfig) {
    return 'codex'
  }

  // Default to Claude Code
  return 'claude-code'
}

/**
 * Install an MCP service by ID
 * @param serviceId - The ID of the MCP service to install
 * @param tool - Optional: specify the target tool (claude-code or codex)
 * @param apiKey - Optional: API key for services that require it
 * @returns Installation result
 */
export async function installMcpService(
  serviceId: string,
  tool?: CodeToolType,
  apiKey?: string,
): Promise<McpInstallResult> {
  ensureI18nInitialized()

  // Get service configuration
  const service = await getMcpService(serviceId)
  if (!service) {
    return {
      success: false,
      serviceId,
      serviceName: serviceId,
      error: i18n.t('mcp:installer.serviceNotFound', { id: serviceId }),
    }
  }

  // Check if API key is required but not provided
  if (service.requiresApiKey && !apiKey) {
    // Prompt for API key
    const promptMessage = service.apiKeyPrompt || i18n.t('mcp:apiKeyPrompt')
    const { inputApiKey } = await inquirer.prompt<{ inputApiKey: string }>([{
      type: 'input',
      name: 'inputApiKey',
      message: promptMessage,
      validate: (input: string) => !!input || i18n.t('api:keyRequired'),
    }])

    if (!inputApiKey) {
      return {
        success: false,
        serviceId,
        serviceName: service.name,
        error: i18n.t('mcp:installer.apiKeyRequired'),
      }
    }
    apiKey = inputApiKey
  }

  // Detect target tool if not specified
  const targetTool = tool || detectActiveTool()

  try {
    if (targetTool === 'codex') {
      await installMcpServiceForCodex(serviceId, service.config, apiKey, service.apiKeyEnvVar)
    }
    else {
      await installMcpServiceForClaudeCode(serviceId, service.config, apiKey, service.apiKeyEnvVar)
    }

    return {
      success: true,
      serviceId,
      serviceName: service.name,
    }
  }
  catch (error) {
    return {
      success: false,
      serviceId,
      serviceName: service.name,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Install MCP service for Claude Code
 */
async function installMcpServiceForClaudeCode(
  serviceId: string,
  baseConfig: McpServerConfig,
  apiKey?: string,
  apiKeyEnvVar?: string,
): Promise<void> {
  // Read existing config
  let config = readMcpConfig()
  if (!config) {
    config = { mcpServers: {} }
  }

  // Build the server config with platform-specific adjustments
  const serverConfig = buildMcpServerConfig(
    baseConfig,
    apiKey,
    apiKeyEnvVar ? `YOUR_${apiKeyEnvVar}` : 'YOUR_API_KEY',
    apiKeyEnvVar,
  )

  // Add the MCP service
  if (!config.mcpServers) {
    config.mcpServers = {}
  }
  config.mcpServers[serviceId] = serverConfig

  // Write config
  writeMcpConfig(config)

  // Auto-authorize MCP service in settings.json
  await autoAuthorizeMcpService(serviceId)
}

/**
 * Install MCP service for Codex
 */
async function installMcpServiceForCodex(
  serviceId: string,
  baseConfig: McpServerConfig,
  apiKey?: string,
  apiKeyEnvVar?: string,
): Promise<void> {
  // Read existing config
  const existingConfig = readCodexConfig()

  // Build Codex MCP service config
  let command = baseConfig.command || serviceId
  let args = (baseConfig.args || []).map(arg => String(arg))

  // Special handling for serena: context should be "codex"
  if (serviceId === 'serena') {
    const idx = args.indexOf('--context')
    if (idx >= 0 && idx + 1 < args.length) {
      args[idx + 1] = 'codex'
    }
    else {
      args.push('--context', 'codex')
    }
  }

  // Apply platform-specific command adjustments
  const serviceConfig: CodexMcpService = { id: serviceId.toLowerCase(), command, args }
  applyCodexPlatformCommand(serviceConfig)
  command = serviceConfig.command
  args = serviceConfig.args || []

  // Build environment variables
  const env: Record<string, string> = { ...(baseConfig.env || {}) }

  // Add Windows SYSTEMROOT if needed
  if (isWindows()) {
    const systemRoot = getSystemRoot()
    if (systemRoot) {
      env.SYSTEMROOT = systemRoot
    }
  }

  // Add API key to environment if provided
  if (apiKey && apiKeyEnvVar) {
    env[apiKeyEnvVar] = apiKey
  }

  // Create the new MCP service entry
  const newService: CodexMcpService = {
    id: serviceId.toLowerCase(),
    command,
    args,
    env: Object.keys(env).length > 0 ? env : undefined,
    startup_timeout_sec: 30,
  }

  // Merge with existing services
  const existingServices = existingConfig?.mcpServices || []
  const mergedMap = new Map<string, CodexMcpService>()

  for (const svc of existingServices) {
    mergedMap.set(svc.id.toLowerCase(), { ...svc })
  }
  mergedMap.set(newService.id, newService)

  const finalServices = Array.from(mergedMap.values())

  // Write config
  const configData: CodexConfigData = {
    model: existingConfig?.model || null,
    modelProvider: existingConfig?.modelProvider || null,
    providers: existingConfig?.providers || [],
    mcpServices: finalServices,
    managed: true,
    otherConfig: existingConfig?.otherConfig || [],
  }

  writeCodexConfig(configData)
}

/**
 * Uninstall an MCP service by ID
 * @param serviceId - The ID of the MCP service to uninstall
 * @param tool - Optional: specify the target tool (claude-code or codex)
 * @returns Uninstallation result
 */
export async function uninstallMcpService(
  serviceId: string,
  tool?: CodeToolType,
): Promise<McpUninstallResult> {
  ensureI18nInitialized()

  const targetTool = tool || detectActiveTool()

  try {
    if (targetTool === 'codex') {
      await uninstallMcpServiceFromCodex(serviceId)
    }
    else {
      await uninstallMcpServiceFromClaudeCode(serviceId)
    }

    return {
      success: true,
      serviceId,
    }
  }
  catch (error) {
    return {
      success: false,
      serviceId,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Uninstall MCP service from Claude Code
 */
async function uninstallMcpServiceFromClaudeCode(serviceId: string): Promise<void> {
  const config = readMcpConfig()
  if (!config || !config.mcpServers) {
    throw new Error(i18n.t('mcp:installer.noConfig'))
  }

  // Check if service exists (case-insensitive)
  const normalizedId = serviceId.toLowerCase()
  const existingKey = Object.keys(config.mcpServers).find(
    key => key.toLowerCase() === normalizedId,
  )

  if (!existingKey) {
    throw new Error(i18n.t('mcp:installer.serviceNotInstalled', { id: serviceId }))
  }

  // Remove the service
  delete config.mcpServers[existingKey]

  // Write config
  writeMcpConfig(config)

  // Remove MCP service authorization from settings.json
  await removeAuthorizeMcpService(serviceId)
}

/**
 * Uninstall MCP service from Codex
 */
async function uninstallMcpServiceFromCodex(serviceId: string): Promise<void> {
  const existingConfig = readCodexConfig()
  if (!existingConfig || !existingConfig.mcpServices) {
    throw new Error(i18n.t('mcp:installer.noConfig'))
  }

  const normalizedId = serviceId.toLowerCase()
  const serviceIndex = existingConfig.mcpServices.findIndex(
    svc => svc.id.toLowerCase() === normalizedId,
  )

  if (serviceIndex === -1) {
    throw new Error(i18n.t('mcp:installer.serviceNotInstalled', { id: serviceId }))
  }

  // Remove the service
  existingConfig.mcpServices.splice(serviceIndex, 1)

  // Write config
  writeCodexConfig(existingConfig)
}

/**
 * List all installed MCP services
 * @param tool - Optional: specify the target tool (claude-code or codex)
 * @returns Array of installed MCP services
 */
export async function listInstalledMcpServices(
  tool?: CodeToolType,
): Promise<InstalledMcpService[]> {
  ensureI18nInitialized()

  const targetTool = tool || detectActiveTool()

  if (targetTool === 'codex') {
    return listInstalledMcpServicesFromCodex()
  }
  else {
    return listInstalledMcpServicesFromClaudeCode()
  }
}

/**
 * List installed MCP services from Claude Code
 */
function listInstalledMcpServicesFromClaudeCode(): InstalledMcpService[] {
  const config = readMcpConfig()
  if (!config || !config.mcpServers) {
    return []
  }

  const services: InstalledMcpService[] = []

  for (const [id, serverConfig] of Object.entries(config.mcpServers)) {
    // Try to find the service name from our known services
    const knownService = MCP_SERVICE_CONFIGS.find(
      s => s.id.toLowerCase() === id.toLowerCase(),
    )

    services.push({
      id,
      name: knownService?.id || id,
      command: serverConfig.command,
      args: serverConfig.args,
      url: serverConfig.url,
      type: serverConfig.type || 'stdio',
    })
  }

  return services
}

/**
 * List installed MCP services from Codex
 */
function listInstalledMcpServicesFromCodex(): InstalledMcpService[] {
  const config = readCodexConfig()
  if (!config || !config.mcpServices) {
    return []
  }

  const services: InstalledMcpService[] = []

  for (const svc of config.mcpServices) {
    // Try to find the service name from our known services
    const knownService = MCP_SERVICE_CONFIGS.find(
      s => s.id.toLowerCase() === svc.id.toLowerCase(),
    )

    services.push({
      id: svc.id,
      name: knownService?.id || svc.id,
      command: svc.command,
      args: svc.args,
      type: 'stdio',
    })
  }

  return services
}

/**
 * Check if an MCP service is installed
 * @param serviceId - The ID of the MCP service to check
 * @param tool - Optional: specify the target tool (claude-code or codex)
 * @returns True if the service is installed
 */
export async function isMcpServiceInstalled(
  serviceId: string,
  tool?: CodeToolType,
): Promise<boolean> {
  const installedServices = await listInstalledMcpServices(tool)
  const normalizedId = serviceId.toLowerCase()
  return installedServices.some(svc => svc.id.toLowerCase() === normalizedId)
}

/**
 * Install multiple MCP services
 * @param serviceIds - Array of service IDs to install
 * @param tool - Optional: specify the target tool
 * @returns Array of installation results
 */
export async function installMcpServices(
  serviceIds: string[],
  tool?: CodeToolType,
): Promise<McpInstallResult[]> {
  const results: McpInstallResult[] = []

  for (const serviceId of serviceIds) {
    const result = await installMcpService(serviceId, tool)
    results.push(result)
  }

  return results
}

/**
 * Display installed MCP services in a formatted way
 * @param tool - Optional: specify the target tool
 */
export async function displayInstalledMcpServices(tool?: CodeToolType): Promise<void> {
  ensureI18nInitialized()

  const targetTool = tool || detectActiveTool()
  const services = await listInstalledMcpServices(targetTool)

  if (services.length === 0) {
    console.log(ansis.yellow(i18n.t('mcp:installer.noServicesInstalled')))
    return
  }

  console.log(ansis.green.bold(`\n${i18n.t('mcp:installer.installedServices', { tool: targetTool })}\n`))

  services.forEach((service, idx) => {
    console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(service.name)} ${ansis.dim(`[${service.id}]`)}`)
    if (service.command) {
      console.log(`   ${ansis.dim(`Command: ${service.command}`)}`)
    }
    if (service.url) {
      console.log(`   ${ansis.dim(`URL: ${service.url}`)}`)
    }
    console.log('')
  })
}

/**
 * Get available MCP services that are not yet installed
 * @param tool - Optional: specify the target tool
 * @returns Array of available service IDs
 */
export async function getAvailableMcpServices(tool?: CodeToolType): Promise<string[]> {
  const allServices = await getMcpServices()
  const installedServices = await listInstalledMcpServices(tool)
  const installedIds = new Set(installedServices.map(s => s.id.toLowerCase()))

  return allServices
    .filter(s => !installedIds.has(s.id.toLowerCase()))
    .map(s => s.id)
}

/**
 * Auto-authorize MCP service in settings.json
 * Adds the MCP permission to permissions.allow array
 * @param serviceId - The ID of the MCP service to authorize
 */
async function autoAuthorizeMcpService(serviceId: string): Promise<void> {
  // Format: mcp__<service_id> (lowercase, replace hyphens with underscores)
  const mcpPermission = `mcp__${serviceId.toLowerCase().replace(/-/g, '_')}`

  // Read current settings and update permissions
  const { readClaudeConfig } = await import('../config/unified/claude-config')
  const currentSettings = readClaudeConfig() || {}

  // Ensure permissions.allow array exists
  if (!currentSettings.permissions) {
    currentSettings.permissions = {}
  }
  if (!currentSettings.permissions.allow) {
    currentSettings.permissions.allow = []
  }

  // Check if permission already exists
  if (!currentSettings.permissions.allow.includes(mcpPermission)) {
    currentSettings.permissions.allow.push(mcpPermission)

    // Write updated settings
    updateClaudeConfig({
      permissions: currentSettings.permissions,
    })
  }
}

/**
 * Remove MCP service authorization from settings.json
 * @param serviceId - The ID of the MCP service to deauthorize
 */
async function removeAuthorizeMcpService(serviceId: string): Promise<void> {
  const mcpPermission = `mcp__${serviceId.toLowerCase().replace(/-/g, '_')}`

  const { readClaudeConfig } = await import('../config/unified/claude-config')
  const currentSettings = readClaudeConfig() || {}

  if (currentSettings.permissions?.allow) {
    const index = currentSettings.permissions.allow.indexOf(mcpPermission)
    if (index !== -1) {
      currentSettings.permissions.allow.splice(index, 1)

      updateClaudeConfig({
        permissions: currentSettings.permissions,
      })
    }
  }
}
