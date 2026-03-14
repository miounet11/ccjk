import type { CodexFullInitOptions, CodexMcpService } from './codex'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { getMcpServices, getMcpServicesWithCompatibility, isMcpServiceCompatible, MCP_SERVICE_CONFIGS } from '../../config/mcp-services'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { updateZcfConfig } from '../ccjk-config'
import { getSystemRoot, isWindows } from '../platform'
import { addNumbersToChoices } from '../prompt-helpers'
import { backupCodexComplete, getBackupMessage, readCodexConfig, writeCodexConfig } from './codex'
import { applyCodexPlatformCommand } from './codex-platform'

const CODEX_RECOMMENDED_MCP_SERVICE_IDS = ['context7', 'open-websearch', 'mcp-deepwiki', 'serena'] as const
const CODEX_MANAGED_MCP_SERVICE_IDS = new Set(MCP_SERVICE_CONFIGS.map(service => service.id.toLowerCase()))

export function getRecommendedCodexMcpServiceIds(): string[] {
  return CODEX_RECOMMENDED_MCP_SERVICE_IDS.filter((id) => {
    const config = MCP_SERVICE_CONFIGS.find(service => service.id === id)
    if (!config) {
      return false
    }

    return isMcpServiceCompatible(id).compatible
  })
}

export function reconcileCodexMcpServices(existingServices: CodexMcpService[], selectedServices: CodexMcpService[]): CodexMcpService[] {
  const preservedServices = existingServices.filter(service => !CODEX_MANAGED_MCP_SERVICE_IDS.has(service.id.toLowerCase()))
  return [...preservedServices, ...selectedServices]
}

function applyWindowsEnvToCodexMcpServices(services: CodexMcpService[]): CodexMcpService[] {
  return services.map((svc) => {
    if (isWindows()) {
      const systemRoot = getSystemRoot()
      if (systemRoot) {
        return {
          ...svc,
          env: {
            ...(svc.env || {}),
            SYSTEMROOT: systemRoot,
          },
        }
      }
    }

    return svc
  })
}

async function selectCodexMcpServices(existingServiceIds: string[]): Promise<string[] | undefined> {
  ensureI18nInitialized()

  const services = await getMcpServicesWithCompatibility()
  const recommendedIds = new Set(getRecommendedCodexMcpServiceIds())
  const currentIds = new Set(existingServiceIds.map(id => id.toLowerCase()))
  const useCurrentSelection = currentIds.size > 0

  const choices = addNumbersToChoices(services.map(service => ({
    name: `${service.name} - ${ansis.gray(service.description)}`,
    value: service.id,
    checked: useCurrentSelection ? currentIds.has(service.id.toLowerCase()) : recommendedIds.has(service.id),
    disabled: service.compatible ? false : service.incompatibleReason || true,
  })))

  const { services: selectedIds } = await inquirer.prompt<{ services: string[] }>({
    type: 'checkbox',
    name: 'services',
    message: `${i18n.t('mcp:selectMcpServices')}${i18n.t('common:multiSelectHint')}`,
    choices,
  })

  if (selectedIds === undefined) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return undefined
  }

  return selectedIds
}

export async function configureCodexMcp(options?: CodexFullInitOptions): Promise<void> {
  ensureI18nInitialized()

  const { skipPrompt = false } = options ?? {}
  const existingConfig = readCodexConfig()
  const backupPath = backupCodexComplete()
  if (backupPath)
    console.log(ansis.gray(getBackupMessage(backupPath)))

  // Skip-prompt 模式：自动安装无 API Key 的默认 MCP
  if (skipPrompt) {
    // Ensure workflows/prompts are installed in non-interactive mode
    // Respect options.workflows if provided
    const { runCodexWorkflowSelection } = await import('./codex')
    await runCodexWorkflowSelection({ skipPrompt: true, workflows: options?.workflows ?? [] })

    // Respect options.mcpServices if provided
    // If mcpServices is false, skip MCP installation entirely
    if (options?.mcpServices === false) {
      updateZcfConfig({ codeToolType: 'codex' })
      console.log(ansis.green(i18n.t('codex:mcpConfigured')))
      return
    }

    // Use provided mcpServices list or default to all non-API-key services
    const defaultServiceIds = Array.isArray(options?.mcpServices)
      ? options.mcpServices
      : getRecommendedCodexMcpServiceIds()

    const baseProviders = existingConfig?.providers || []
    const existingServices = existingConfig?.mcpServices || []
    const selection: CodexMcpService[] = []

    for (const id of defaultServiceIds) {
      const configInfo = MCP_SERVICE_CONFIGS.find(service => service.id === id)
      if (!configInfo)
        continue
      if (!isMcpServiceCompatible(id).compatible)
        continue

      let command = configInfo.config.command || id
      let args = (configInfo.config.args || []).map(arg => String(arg))

      // Special handling: serena context should be "codex" for Codex
      if (id === 'serena') {
        const idx = args.indexOf('--context')
        if (idx >= 0 && idx + 1 < args.length)
          args[idx + 1] = 'codex'
        else
          args.push('--context', 'codex')
      }

      const serviceConfig: CodexMcpService = { id: id.toLowerCase(), command, args }
      applyCodexPlatformCommand(serviceConfig)
      command = serviceConfig.command
      args = serviceConfig.args || []

      const env = { ...(configInfo.config.env || {}) }
      if (isWindows()) {
        const systemRoot = getSystemRoot()
        if (systemRoot)
          env.SYSTEMROOT = systemRoot
      }

      selection.push({
        id: id.toLowerCase(),
        command,
        args,
        env: Object.keys(env).length > 0 ? env : undefined,
        startup_timeout_sec: 30,
      })
    }

    const finalServices = applyWindowsEnvToCodexMcpServices(reconcileCodexMcpServices(existingServices, selection))

    writeCodexConfig({
      model: existingConfig?.model || null,
      modelProvider: existingConfig?.modelProvider || null,
      providers: baseProviders,
      mcpServices: finalServices,
      managed: true,
      otherConfig: existingConfig?.otherConfig || [],
    })
    updateZcfConfig({ codeToolType: 'codex' })
    console.log(ansis.green(i18n.t('codex:mcpConfigured')))
    return
  }

  const selectedIds = await selectCodexMcpServices(existingConfig?.mcpServices?.map(service => service.id) || [])
  if (!selectedIds)
    return

  const servicesMeta = await getMcpServices()
  const baseProviders = existingConfig?.providers || []
  const selection: CodexMcpService[] = []
  const existingServices = existingConfig?.mcpServices || []

  if (selectedIds.length === 0) {
    console.log(ansis.yellow(i18n.t('codex:noMcpConfigured')))

    const preserved = applyWindowsEnvToCodexMcpServices(reconcileCodexMcpServices(existingServices, []))

    writeCodexConfig({
      model: existingConfig?.model || null,
      modelProvider: existingConfig?.modelProvider || null,
      providers: baseProviders,
      mcpServices: preserved,
      managed: true,
      otherConfig: existingConfig?.otherConfig || [],
    })
    updateZcfConfig({ codeToolType: 'codex' })
    return
  }

  for (const id of selectedIds) {
    const configInfo = MCP_SERVICE_CONFIGS.find(service => service.id === id)
    if (!configInfo)
      continue

    const serviceMeta = servicesMeta.find(service => service.id === id)
    let command = configInfo.config.command || id
    let args = (configInfo.config.args || []).map(arg => String(arg))

    // Special handling: serena context should be "codex" for Codex
    if (id === 'serena') {
      const idx = args.indexOf('--context')
      if (idx >= 0 && idx + 1 < args.length) {
        args[idx + 1] = 'codex'
      }
      else {
        args.push('--context', 'codex')
      }
    }

    const serviceConfig: CodexMcpService = { id: id.toLowerCase(), command, args }
    applyCodexPlatformCommand(serviceConfig)
    command = serviceConfig.command
    args = serviceConfig.args || []

    const env = { ...(configInfo.config.env || {}) }

    if (isWindows()) {
      const systemRoot = getSystemRoot()
      if (systemRoot)
        env.SYSTEMROOT = systemRoot
    }

    if (configInfo.requiresApiKey && configInfo.apiKeyEnvVar) {
      const promptMessage = serviceMeta?.apiKeyPrompt || i18n.t('mcp:apiKeyPrompt')
      const { apiKey } = await inquirer.prompt<{ apiKey: string }>([{
        type: 'input',
        name: 'apiKey',
        message: promptMessage,
        validate: (input: string) => !!input || i18n.t('api:keyRequired'),
      }])

      if (!apiKey)
        continue

      env[configInfo.apiKeyEnvVar] = apiKey
    }

    selection.push({
      id: id.toLowerCase(),
      command: serviceConfig.command,
      args: serviceConfig.args,
      env: Object.keys(env).length > 0 ? env : undefined,
      startup_timeout_sec: 30,
    })
  }

  const finalServices = applyWindowsEnvToCodexMcpServices(reconcileCodexMcpServices(existingServices, selection))

  writeCodexConfig({
    model: existingConfig?.model || null,
    modelProvider: existingConfig?.modelProvider || null,
    providers: baseProviders,
    mcpServices: finalServices,
    managed: true,
    otherConfig: existingConfig?.otherConfig || [],
  })

  updateZcfConfig({ codeToolType: 'codex' })
  console.log(ansis.green(i18n.t('codex:mcpConfigured')))
}
