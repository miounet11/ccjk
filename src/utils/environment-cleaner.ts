import type { CodeToolType } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { TOOL_MATRIX } from '../config/tool-matrix'
import { CODEX_AGENTS_FILE, CODEX_PROMPTS_DIR } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { readMcpConfig, writeMcpConfig } from './claude-config'
import { readCcjkConfig } from './ccjk-config'
import { readCodexConfig } from './code-tools/codex'
import { backupCodexComplete, getBackupMessage } from './code-tools/codex'
import { deleteAllCodexMcpServices, deleteCodexMcpService, listCodexMcpServiceIds } from './code-tools/codex-toml-updater'
import { exists, isDirectory, readDir, readFile } from './fs-operations'
import { addNumbersToChoices } from './prompt-helpers'
import { detectCodexRuntimes, scanCodexConfigDoctorFindings } from './codex-runtime'
import { moveToTrash } from './trash'

export type CleanupCategory = 'mcp' | 'skill' | 'prompt' | 'agents-file' | 'config'

export interface CleanupCandidate {
  id: string
  category: CleanupCategory
  tool: 'codex' | 'claude' | 'agents' | 'grok'
  label: string
  path?: string
  configKey?: string
  reason: string
  checked: boolean
}

export interface CleanupScanResult {
  candidates: CleanupCandidate[]
}

export interface CleanupExecutionResult {
  removed: string[]
  errors: string[]
}

const MANAGED_MCP_IDS = new Set(MCP_SERVICE_CONFIGS.map(service => service.id.toLowerCase()))

function skillDirsForTool(tool: CleanupCandidate['tool']): string[] {
  if (tool === 'agents')
    return TOOL_MATRIX.clavue.skillsDirs.filter(dir => dir.includes('.agents'))
  if (tool === 'grok')
    return TOOL_MATRIX.grok.skillsDirs
  if (tool === 'codex')
    return TOOL_MATRIX.codex.skillsDirs
  if (tool === 'claude')
    return TOOL_MATRIX['claude-code'].skillsDirs.filter(dir => !dir.includes('.agents'))
  return []
}

function scanSkillDirectory(baseDir: string, tool: CleanupCandidate['tool']): CleanupCandidate[] {
  const results: CleanupCandidate[] = []
  if (!exists(baseDir))
    return results

  for (const entry of readDir(baseDir)) {
    const fullPath = join(baseDir, entry)
    if (!isDirectory(fullPath))
      continue

    const skillFile = join(fullPath, 'SKILL.md')
    if (!exists(skillFile)) {
      results.push({
        id: `skill:${tool}:${entry}:missing-skill-md`,
        category: 'skill',
        tool,
        label: entry,
        path: fullPath,
        reason: i18n.t('clean:reason.skillMissingFile'),
        checked: true,
      })
      continue
    }

    const content = readFile(skillFile).trim()
    if (content.length < 40) {
      results.push({
        id: `skill:${tool}:${entry}:empty-skill`,
        category: 'skill',
        tool,
        label: entry,
        path: fullPath,
        reason: i18n.t('clean:reason.skillEmpty'),
        checked: true,
      })
    }
  }

  return results
}

function scanCodexMcpCandidates(): CleanupCandidate[] {
  const config = readCodexConfig()
  if (!config?.mcpServices?.length)
    return []

  const seen = new Set<string>()
  const results: CleanupCandidate[] = []

  for (const service of config.mcpServices) {
    const id = service.id.toLowerCase()
    if (seen.has(id)) {
      results.push({
        id: `mcp:codex:${id}:duplicate`,
        category: 'mcp',
        tool: 'codex',
        label: service.id,
        configKey: service.id,
        reason: i18n.t('clean:reason.mcpDuplicate'),
        checked: true,
      })
    }
    seen.add(id)

    const hasCommand = Boolean(service.command?.trim())
    const hasUrl = Boolean((service as { url?: string }).url?.trim())
    if (!hasCommand && !hasUrl) {
      results.push({
        id: `mcp:codex:${id}:broken`,
        category: 'mcp',
        tool: 'codex',
        label: service.id,
        configKey: service.id,
        reason: i18n.t('clean:reason.mcpBroken'),
        checked: true,
      })
      continue
    }

    if (!MANAGED_MCP_IDS.has(id)) {
      results.push({
        id: `mcp:codex:${id}:unmanaged`,
        category: 'mcp',
        tool: 'codex',
        label: service.id,
        configKey: service.id,
        reason: i18n.t('clean:reason.mcpUnmanaged'),
        checked: true,
      })
    }
  }

  if (config.mcpServices.length > 3) {
    for (const service of config.mcpServices) {
      const id = service.id.toLowerCase()
      if (results.some(item => item.configKey === service.id))
        continue
      results.push({
        id: `mcp:codex:${id}:bloat`,
        category: 'mcp',
        tool: 'codex',
        label: service.id,
        configKey: service.id,
        reason: i18n.t('clean:reason.mcpBloat', { count: config.mcpServices.length }),
        checked: false,
      })
    }
  }

  return results
}

function scanClaudeMcpCandidates(): CleanupCandidate[] {
  const config = readMcpConfig('claude-code')
  if (!config?.mcpServers)
    return []

  const results: CleanupCandidate[] = []
  const entries = Object.entries(config.mcpServers)

  if (entries.length > 3) {
    for (const [name] of entries) {
      results.push({
        id: `mcp:claude:${name}:bloat`,
        category: 'mcp',
        tool: 'claude',
        label: name,
        configKey: name,
        reason: i18n.t('clean:reason.mcpBloat', { count: entries.length }),
        checked: false,
      })
    }
  }

  for (const [name, server] of entries) {
    const hasCommand = Boolean(server.command?.trim())
    const hasUrl = Boolean(server.url?.trim())
    if (!hasCommand && !hasUrl) {
      results.push({
        id: `mcp:claude:${name}:broken`,
        category: 'mcp',
        tool: 'claude',
        label: name,
        configKey: name,
        reason: i18n.t('clean:reason.mcpBroken'),
        checked: true,
      })
      continue
    }

    if (!MANAGED_MCP_IDS.has(name.toLowerCase())) {
      const already = results.some(item => item.configKey === name)
      if (!already) {
        results.push({
          id: `mcp:claude:${name}:unmanaged`,
          category: 'mcp',
          tool: 'claude',
          label: name,
          configKey: name,
          reason: i18n.t('clean:reason.mcpUnmanaged'),
          checked: true,
        })
      }
    }
  }

  return results
}

function scanCodexPromptCandidates(): CleanupCandidate[] {
  if (!exists(CODEX_PROMPTS_DIR))
    return []

  return readDir(CODEX_PROMPTS_DIR)
    .filter(file => file.endsWith('.md'))
    .map((file) => {
      const fullPath = join(CODEX_PROMPTS_DIR, file)
      return {
        id: `prompt:codex:${file}`,
        category: 'prompt' as const,
        tool: 'codex' as const,
        label: file,
        path: fullPath,
        reason: i18n.t('clean:reason.promptInstalled'),
        checked: false,
      }
    })
}

function scanAllSkillDirectories(baseDir: string, tool: CleanupCandidate['tool']): CleanupCandidate[] {
  if (!exists(baseDir))
    return []

  const results: CleanupCandidate[] = []
  for (const entry of readDir(baseDir)) {
    if (entry === '.' || entry === '..')
      continue
    const fullPath = join(baseDir, entry)
    if (!isDirectory(fullPath))
      continue
    results.push({
      id: `skill:${tool}:${entry}:all`,
      category: 'skill',
      tool,
      label: entry,
      path: fullPath,
      reason: i18n.t('clean:reason.skillPurgeAll'),
      checked: true,
    })
  }
  return results
}

function scanAgentsFileCandidates(): CleanupCandidate[] {
  const files = [
    CODEX_AGENTS_FILE,
    join(TOOL_MATRIX.codex.configRoot, 'AGENTS.override.md'),
  ]
  const results: CleanupCandidate[] = []

  for (const filePath of files) {
    if (!exists(filePath))
      continue
    const name = filePath.split('/').pop() || filePath
    results.push({
      id: `agents-file:codex:${name}`,
      category: 'agents-file',
      tool: 'codex',
      label: name,
      path: filePath,
      reason: i18n.t('clean:reason.agentsFileStale'),
      checked: true,
    })
  }

  return results
}

function scanAllCodexMcpCandidates(): CleanupCandidate[] {
  const parsedIds = new Set(
    (readCodexConfig()?.mcpServices || []).map(service => service.id.toLowerCase()),
  )
  const rawIds = listCodexMcpServiceIds()

  const ids = new Set<string>()
  for (const id of rawIds)
    ids.add(id)
  for (const id of parsedIds)
    ids.add(id)

  return Array.from(ids).map(id => ({
    id: `mcp:codex:${id.toLowerCase()}:all`,
    category: 'mcp' as const,
    tool: 'codex' as const,
    label: id,
    configKey: id,
    reason: parsedIds.has(id.toLowerCase())
      ? i18n.t('clean:reason.mcpPurgeAll')
      : i18n.t('clean:reason.mcpOrphan'),
    checked: true,
  }))
}

function scanAllClaudeMcpCandidates(): CleanupCandidate[] {
  const config = readMcpConfig('claude-code')
  if (!config?.mcpServers)
    return []

  return Object.keys(config.mcpServers).map(name => ({
    id: `mcp:claude:${name}:all`,
    category: 'mcp' as const,
    tool: 'claude' as const,
    label: name,
    configKey: name,
    reason: i18n.t('clean:reason.mcpPurgeAll'),
    checked: true,
  }))
}

export function scanPurgeAllEnvironment(): CleanupScanResult {
  ensureI18nInitialized()

  const candidates = [
    ...scanAllCodexMcpCandidates(),
    ...scanAllClaudeMcpCandidates(),
    ...scanAllSkillDirectories(skillDirsForTool('codex')[0], 'codex'),
    ...skillDirsForTool('claude').flatMap(dir => scanAllSkillDirectories(dir, 'claude')),
    ...skillDirsForTool('agents').flatMap(dir => scanAllSkillDirectories(dir, 'agents')),
    ...skillDirsForTool('grok').flatMap(dir => scanAllSkillDirectories(dir, 'grok')),
    ...scanCodexPromptCandidates().map(item => ({ ...item, checked: true, reason: i18n.t('clean:reason.promptPurgeAll') })),
    ...scanAgentsFileCandidates(),
  ]

  const unique = new Map<string, CleanupCandidate>()
  for (const item of candidates)
    unique.set(item.id, item)

  return { candidates: Array.from(unique.values()) }
}

const SCAN_SECTION_KEYS: Record<CleanupCategory, string> = {
  mcp: 'hub:doctor.scanSection.mcp',
  skill: 'hub:doctor.scanSection.skill',
  prompt: 'hub:doctor.scanSection.prompt',
  'agents-file': 'hub:doctor.scanSection.agents',
  config: 'hub:doctor.scanSection.config',
}

function scanCodexConfigCandidates(): CleanupCandidate[] {
  const findings = scanCodexConfigDoctorFindings()
  return findings
    .filter(finding => finding.severity === 'warn')
    .map((finding) => {
      const label = finding.messageParams
        ? i18n.t(finding.messageKey, finding.messageParams)
        : i18n.t(finding.messageKey)
      return {
        id: `config:codex:${finding.id}`,
        category: 'config' as const,
        tool: 'codex' as const,
        label,
        reason: i18n.t('clean:reason.configDoctor'),
        checked: true,
      }
    })
}

export function printCodexRuntimeStatus(): void {
  ensureI18nInitialized()
  const summary = detectCodexRuntimes()

  console.log(ansis.white(`  ${i18n.t('hub:doctor.scanSection.runtime')}`))
  console.log(ansis.gray(`    ${i18n.t('codex:runtime.sharedConfig', { path: summary.configHome })}`))
  if (summary.configHomeFromEnv)
    console.log(ansis.gray(`    ${i18n.t('codex:runtime.codexHomeEnv')}`))

  for (const runtime of summary.runtimes) {
    const label = i18n.t(`codex:runtime.kind.${runtime.kind}`)
    if (!runtime.detected) {
      console.log(ansis.dim(`    ${label}: ${i18n.t('codex:runtime.notDetected')}`))
      continue
    }
    const pathText = runtime.path ? ansis.gray(` (${runtime.path})`) : ''
    const weak = runtime.weakSignal ? ansis.yellow(` — ${i18n.t('codex:runtime.weakDesktopSignal')}`) : ''
    console.log(`    ${label}: ${ansis.green(i18n.t('codex:runtime.detected'))}${pathText}${weak}`)
  }
  console.log('')
}

export function printEnvironmentScanReport(): boolean {
  ensureI18nInitialized()

  const smart = scanEnvironmentIssues(false).candidates
  const all = scanEnvironmentIssues(true).candidates

  const configFindings = scanCodexConfigCandidates()

  console.log(ansis.cyan(`\n${i18n.t('hub:doctor.scanReport')}\n`))
  printCodexRuntimeStatus()
  console.log(ansis.gray(`  ${i18n.t('hub:doctor.scanHint', { smart: smart.length, all: all.length })}\n`))

  if (configFindings.length > 0) {
    console.log(ansis.white(`  ${i18n.t('hub:doctor.scanSection.config')} (${configFindings.length})`))
    for (const item of configFindings)
      console.log(`    ${ansis.yellow('[codex]')} ${item.label}`)
    console.log('')
  }

  if (smart.length === 0 && configFindings.length === 0) {
    console.log(ansis.green(`  ${i18n.t('clean:nothingFound')}\n`))
    return false
  }

  if (smart.length === 0) {
    console.log(ansis.green(`  ${i18n.t('clean:nothingFound')}\n`))
    return configFindings.length > 0
  }

  const grouped = new Map<CleanupCategory, CleanupCandidate[]>()
  for (const item of smart) {
    const list = grouped.get(item.category) || []
    list.push(item)
    grouped.set(item.category, list)
  }

  for (const [category, items] of grouped) {
    console.log(ansis.white(`  ${i18n.t(SCAN_SECTION_KEYS[category])} (${items.length})`))
    for (const item of items) {
      console.log(
        `    ${ansis.cyan(`[${item.tool}]`)} ${item.label} ${ansis.gray(`— ${item.reason}`)}`,
      )
    }
    console.log('')
  }

  return true
}

export function scanEnvironmentIssues(purgeAll = false): CleanupScanResult {
  ensureI18nInitialized()

  if (purgeAll)
    return scanPurgeAllEnvironment()

  const candidates = [
    ...scanCodexMcpCandidates(),
    ...scanClaudeMcpCandidates(),
    ...skillDirsForTool('agents').flatMap(dir => scanSkillDirectory(dir, 'agents')),
    ...skillDirsForTool('claude').flatMap(dir => scanSkillDirectory(dir, 'claude')),
    ...skillDirsForTool('codex').flatMap(dir => scanSkillDirectory(dir, 'codex')),
    ...scanCodexPromptCandidates(),
  ]

  const unique = new Map<string, CleanupCandidate>()
  for (const item of candidates)
    unique.set(item.id, item)

  return { candidates: Array.from(unique.values()) }
}

async function removeCodexMcp(serviceId: string): Promise<void> {
  deleteCodexMcpService(serviceId)
}

async function removeClaudeMcp(serviceId: string): Promise<void> {
  const config = readMcpConfig('claude-code')
  if (!config?.mcpServers?.[serviceId])
    return
  const next = { ...config, mcpServers: { ...config.mcpServers } }
  delete next.mcpServers[serviceId]
  writeMcpConfig(next, 'claude-code')
}

export async function executeCleanup(
  selected: CleanupCandidate[],
  options: { purgeAllMcp?: boolean } = {},
): Promise<CleanupExecutionResult> {
  const removed: string[] = []
  const errors: string[] = []

  const backupPath = backupCodexComplete()
  if (backupPath)
    console.log(ansis.gray(getBackupMessage(backupPath)))

  const codexMcpItems = selected.filter(item => item.category === 'mcp' && item.tool === 'codex')
  if (options.purgeAllMcp && codexMcpItems.length > 0) {
    try {
      deleteAllCodexMcpServices()
      for (const item of codexMcpItems)
        removed.push(`codex MCP: ${item.label}`)
    }
    catch (error) {
      errors.push(`codex MCP: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  for (const item of selected) {
    if (options.purgeAllMcp && item.category === 'mcp' && item.tool === 'codex')
      continue
    try {
      if (item.category === 'mcp' && item.configKey) {
        if (item.tool === 'codex')
          await removeCodexMcp(item.configKey)
        else if (item.tool === 'claude')
          await removeClaudeMcp(item.configKey)
        removed.push(`${item.tool} MCP: ${item.label}`)
      }
      else if ((item.category === 'skill' || item.category === 'prompt' || item.category === 'agents-file') && item.path) {
        const result = await moveToTrash(item.path)
        if (result[0]?.success)
          removed.push(`${item.category === 'agents-file' ? 'AGENTS' : item.category}: ${item.label}`)
        else
          errors.push(result[0]?.error || item.path)
      }
    }
    catch (error) {
      errors.push(`${item.label}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return { removed, errors }
}

function resolveCodeTool(): CodeToolType {
  const config = readCcjkConfig()
  if (config?.codeToolType === 'claude-code' || config?.codeToolType === 'codex')
    return config.codeToolType
  return 'codex'
}

export async function runEnvironmentCleanup(options: {
  codeToolType?: CodeToolType
  skipPrompt?: boolean
  aggressive?: boolean
  purgeAll?: boolean
} = {}): Promise<CleanupExecutionResult> {
  ensureI18nInitialized()
  void resolveCodeTool()
  void options.codeToolType

  if (options.purgeAll && !options.skipPrompt) {
    console.log(ansis.yellow(`\n${i18n.t('clean:purgeAllWarning')}\n`))
  }

  const { candidates } = scanEnvironmentIssues(options.purgeAll)
  if (candidates.length === 0) {
    console.log(ansis.green(i18n.t('clean:nothingFound')))
    return { removed: [], errors: [] }
  }

  let selected = candidates
  if (options.aggressive)
    selected = candidates

  if (!options.skipPrompt) {
    console.log(ansis.cyan(`\n${i18n.t('clean:scanSummary', { count: candidates.length })}\n`))

    const { picked } = await inquirer.prompt<{ picked: string[] }>({
      type: 'checkbox',
      name: 'picked',
      message: `${i18n.t('clean:selectItems')}${i18n.t('common:multiSelectHint')}`,
      choices: addNumbersToChoices(candidates.map(item => ({
        name: `${ansis.cyan(`[${item.tool}]`)} ${item.label} - ${ansis.gray(item.reason)}`,
        value: item.id,
        checked: options.purgeAll || options.aggressive ? true : item.checked,
      }))),
    })

    if (!picked?.length) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return { removed: [], errors: [] }
    }

    selected = candidates.filter(item => picked.includes(item.id))

    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>({
      type: 'confirm',
      name: 'confirmed',
      message: i18n.t('clean:confirmCleanup', { count: selected.length }),
      default: false,
    })

    if (!confirmed) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return { removed: [], errors: [] }
    }
  }
  else if (options.purgeAll || options.aggressive) {
    selected = candidates
  }
  else {
    selected = candidates.filter(item => item.checked)
  }

  const result = await executeCleanup(selected, { purgeAllMcp: options.purgeAll })

  if (result.removed.length > 0) {
    console.log(ansis.green(`\n${i18n.t('clean:cleanupDone', { count: result.removed.length })}`))
    for (const line of result.removed)
      console.log(ansis.gray(`  ✔ ${line}`))
  }

  if (result.errors.length > 0) {
    console.log(ansis.red(`\n${i18n.t('clean:cleanupErrors', { count: result.errors.length })}`))
    for (const line of result.errors)
      console.log(ansis.red(`  ✗ ${line}`))
  }

  return result
}