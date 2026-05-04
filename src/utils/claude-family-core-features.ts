import type { CodeToolType, SupportedLang } from '../constants'
import type { McpServerConfig } from '../types'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'pathe'
import { MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { WORKFLOW_CONFIG_BASE } from '../config/workflows'
import { installCcr, isCcrInstalled } from './ccr/installer'
import {
  buildMcpServerConfig,
  fixWindowsMcpConfig,
  mergeMcpServers,
  readMcpConfig,
  syncMcpPermissions,
  writeMcpConfig,
} from './claude-config'
import { readJsonConfig } from './json-config'
import {
  copyOutputStyles,
  getAvailableOutputStyles,
  setGlobalDefaultOutputStyle,
} from './output-style'
import { commandExists } from './platform'
import { resolveClaudeFamilySettingsTarget } from './runtime-settings'
import { selectAndInstallWorkflows } from './workflow-installer'

export type CoreFeatureStatus = 'installed' | 'repaired' | 'already-present' | 'skipped' | 'failed'

export interface CoreFeatureResult {
  feature: 'workflows' | 'mcp' | 'permissions' | 'output-styles' | 'ccr' | 'native-goals'
  status: CoreFeatureStatus
  message: string
  details?: string[]
  error?: string
}

export interface EnsureClaudeFamilyCoreFeaturesOptions {
  codeTool?: CodeToolType
  configLang?: SupportedLang
  installCcr?: boolean
}

export interface ClaudeFamilyCoreFeatureState {
  workflows: {
    installed: number
    expected: number
    missing: string[]
  }
  mcp: {
    installed: string[]
    expected: string[]
    missing: string[]
  }
  permissions: {
    allowCount: number
    missing: string[]
  }
  outputStyles: {
    installed: number
    expected: number
    missing: string[]
  }
  ccr: {
    installed: boolean
    hasCorrectPackage?: boolean
  }
}

const DEFAULT_CONFIG_LANG: SupportedLang = 'en'
const OUTPUT_STYLE_TEMPLATE_LANG: SupportedLang = 'zh-CN'

export function getCoreWorkflowIds(): string[] {
  return WORKFLOW_CONFIG_BASE
    .filter(workflow => workflow.defaultSelected)
    .sort((a, b) => a.order - b.order)
    .map(workflow => workflow.id)
}

export function getCoreMcpServiceIds(): string[] {
  return MCP_SERVICE_CONFIGS
    .filter(service => service.defaultSelected && !service.requiresApiKey)
    .map(service => service.id)
}

export function getCoreOutputStyleIds(): string[] {
  return getAvailableOutputStyles()
    .filter(style => style.isCustom)
    .map(style => style.id)
}

export function getCoreMcpPermission(serviceId: string): string {
  return `mcp__${serviceId.toLowerCase().replace(/-/g, '_')}__*`
}

function listMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return []
  }

  try {
    return readdirSync(dir, { recursive: true })
      .map(entry => String(entry))
      .filter(entry => entry.endsWith('.md'))
  }
  catch {
    return []
  }
}

function readPermissionAllow(codeTool?: CodeToolType): string[] {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  const settings = readJsonConfig<any>(target.settingsFile) || {}
  return Array.isArray(settings.permissions?.allow)
    ? settings.permissions.allow.filter((item: unknown): item is string => typeof item === 'string')
    : []
}

export async function inspectClaudeFamilyCoreFeatures(
  codeTool?: CodeToolType,
): Promise<ClaudeFamilyCoreFeatureState> {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  const expectedWorkflows = getCoreWorkflowIds()
  const expectedMcpServices = getCoreMcpServiceIds()
  const expectedOutputStyles = getCoreOutputStyleIds()

  const commandFiles = listMarkdownFiles(join(target.configDir, 'commands', 'ccjk'))
  const installedMcp = Object.keys(readMcpConfig(target.codeTool)?.mcpServers || {})
  const allow = readPermissionAllow(target.codeTool)
  const styleFiles = listMarkdownFiles(join(target.configDir, 'output-styles'))

  const ccrStatus = await isCcrInstalled().catch(() => ({ isInstalled: false, hasCorrectPackage: false }))

  return {
    workflows: {
      installed: commandFiles.length,
      expected: expectedWorkflows.length,
      missing: commandFiles.length > 0 ? [] : expectedWorkflows,
    },
    mcp: {
      installed: installedMcp,
      expected: expectedMcpServices,
      missing: expectedMcpServices.filter(serviceId => !installedMcp.includes(serviceId)),
    },
    permissions: {
      allowCount: allow.length,
      missing: expectedMcpServices
        .map(getCoreMcpPermission)
        .filter(permission => !allow.includes(permission)),
    },
    outputStyles: {
      installed: styleFiles.length,
      expected: expectedOutputStyles.length,
      missing: expectedOutputStyles.filter(styleId => !styleFiles.includes(`${styleId}.md`)),
    },
    ccr: {
      installed: ccrStatus.isInstalled,
      hasCorrectPackage: ccrStatus.hasCorrectPackage,
    },
  }
}

async function ensureWorkflows(codeTool: CodeToolType, configLang: SupportedLang): Promise<CoreFeatureResult> {
  const before = await inspectClaudeFamilyCoreFeatures(codeTool)
  if (before.workflows.installed > 0) {
    return {
      feature: 'workflows',
      status: 'already-present',
      message: `${before.workflows.installed} workflow command(s) installed`,
    }
  }

  try {
    await selectAndInstallWorkflows(configLang, getCoreWorkflowIds(), { codeToolType: codeTool })
    const after = await inspectClaudeFamilyCoreFeatures(codeTool)
    return {
      feature: 'workflows',
      status: after.workflows.installed > 0 ? 'installed' : 'failed',
      message: `${after.workflows.installed} workflow command(s) installed`,
      details: getCoreWorkflowIds(),
    }
  }
  catch (error) {
    return {
      feature: 'workflows',
      status: 'failed',
      message: 'Workflow installation failed',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function buildCoreMcpServers(): Record<string, McpServerConfig> {
  const servers: Record<string, McpServerConfig> = {}

  for (const serviceId of getCoreMcpServiceIds()) {
    const service = MCP_SERVICE_CONFIGS.find(item => item.id === serviceId)
    if (!service) {
      continue
    }
    servers[service.id] = buildMcpServerConfig(service.config)
  }

  return servers
}

async function ensureMcp(codeTool: CodeToolType): Promise<CoreFeatureResult> {
  const before = await inspectClaudeFamilyCoreFeatures(codeTool)
  if (before.mcp.missing.length === 0) {
    return {
      feature: 'mcp',
      status: 'already-present',
      message: `${before.mcp.installed.length} MCP service(s) configured`,
      details: before.mcp.installed,
    }
  }

  try {
    const existingConfig = readMcpConfig(codeTool)
    const mergedConfig = fixWindowsMcpConfig(mergeMcpServers(existingConfig, buildCoreMcpServers()))
    writeMcpConfig(mergedConfig, codeTool)
    syncMcpPermissions(codeTool)

    const after = await inspectClaudeFamilyCoreFeatures(codeTool)
    return {
      feature: 'mcp',
      status: after.mcp.missing.length === 0 ? 'installed' : 'repaired',
      message: `${after.mcp.installed.length} MCP service(s) configured`,
      details: after.mcp.installed,
    }
  }
  catch (error) {
    return {
      feature: 'mcp',
      status: 'failed',
      message: 'MCP configuration failed',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function ensurePermissions(codeTool: CodeToolType): Promise<CoreFeatureResult> {
  try {
    syncMcpPermissions(codeTool)
    const after = await inspectClaudeFamilyCoreFeatures(codeTool)
    return {
      feature: 'permissions',
      status: after.permissions.missing.length === 0 ? 'repaired' : 'failed',
      message: `${after.permissions.allowCount} permission rule(s) configured`,
      details: after.permissions.missing.length > 0 ? after.permissions.missing : undefined,
    }
  }
  catch (error) {
    return {
      feature: 'permissions',
      status: 'failed',
      message: 'Permission repair failed',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function ensureOutputStyles(codeTool: CodeToolType): Promise<CoreFeatureResult> {
  const styleIds = getCoreOutputStyleIds()
  const before = await inspectClaudeFamilyCoreFeatures(codeTool)
  if (before.outputStyles.missing.length === 0) {
    return {
      feature: 'output-styles',
      status: 'already-present',
      message: `${before.outputStyles.installed} output style(s) installed`,
    }
  }

  try {
    await copyOutputStyles(styleIds, OUTPUT_STYLE_TEMPLATE_LANG, codeTool)
    setGlobalDefaultOutputStyle(styleIds.includes('linus-mode') ? 'linus-mode' : styleIds[0], codeTool)
    const after = await inspectClaudeFamilyCoreFeatures(codeTool)
    return {
      feature: 'output-styles',
      status: after.outputStyles.missing.length === 0 ? 'installed' : 'repaired',
      message: `${after.outputStyles.installed} output style(s) installed`,
      details: styleIds,
    }
  }
  catch (error) {
    return {
      feature: 'output-styles',
      status: 'failed',
      message: 'Output style installation failed',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function ensureCcr(install: boolean): Promise<CoreFeatureResult> {
  try {
    const before = await isCcrInstalled()
    if (before.hasCorrectPackage) {
      return {
        feature: 'ccr',
        status: 'already-present',
        message: 'CCR proxy package installed',
      }
    }

    if (!install) {
      return {
        feature: 'ccr',
        status: 'skipped',
        message: before.isInstalled
          ? 'CCR command exists, but the managed package is not installed'
          : 'CCR proxy package not installed',
      }
    }

    await installCcr()
    const hasCommand = await commandExists('ccr')
    return {
      feature: 'ccr',
      status: hasCommand ? 'installed' : 'failed',
      message: hasCommand ? 'CCR proxy package installed' : 'CCR proxy command not found after install',
    }
  }
  catch (error) {
    return {
      feature: 'ccr',
      status: 'failed',
      message: 'CCR installation failed',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function ensureNativeGoals(codeTool: CodeToolType): Promise<CoreFeatureResult> {
  if (codeTool !== 'clavue') {
    return {
      feature: 'native-goals',
      status: 'skipped',
      message: 'Native /goal is not managed for this runtime',
    }
  }

  const hasCommand = await commandExists('clavue')
  return {
    feature: 'native-goals',
    status: hasCommand ? 'already-present' : 'failed',
    message: hasCommand
      ? 'Clavue native /goal available'
      : 'Clavue command not found',
  }
}

export async function ensureClaudeFamilyCoreFeatures(
  options: EnsureClaudeFamilyCoreFeaturesOptions = {},
): Promise<CoreFeatureResult[]> {
  const target = resolveClaudeFamilySettingsTarget(options.codeTool)
  const configLang = options.configLang || DEFAULT_CONFIG_LANG

  const results: CoreFeatureResult[] = []
  results.push(await ensureWorkflows(target.codeTool, configLang))
  results.push(await ensureMcp(target.codeTool))
  results.push(await ensurePermissions(target.codeTool))
  results.push(await ensureOutputStyles(target.codeTool))
  results.push(await ensureNativeGoals(target.codeTool))
  results.push(await ensureCcr(options.installCcr !== false))
  return results
}
