/**
 * CCJK MCP Command for v8.0.0
 *
 * Intelligent MCP service management based on project analysis.
 * Analyzes project type and recommends appropriate MCP services.
 *
 * Usage:
 *   ccjk ccjk:mcp                    - Interactive mode with project analysis
 *   ccjk ccjk:mcp --tier core        - Install only core tier services
 *   ccjk ccjk:mcp --services eslint,prettier  - Install specific services
 *   ccjk ccjk:mcp --dry-run          - Preview without installing
 *   ccjk ccjk:mcp --json             - JSON output for automation
 */

import type { ProjectAnalysis } from '../analyzers/types'
import type { McpServiceTemplate } from '../config/mcp-templates'
import type { SupportedLang } from '../constants'
import { join } from 'node:path'
import { cwd } from 'node:process'
import ansis from 'ansis'
import consola from 'consola'
import inquirer from 'inquirer'
import { analyzeProject } from '../analyzers'
import { getTemplatesClient } from '../cloud-client'
import { getCompatibleMcpServiceTemplates, mcpServiceTemplates } from '../config/mcp-templates'
import { CLAUDE_DIR } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { backupMcpConfig, mergeMcpServers, readMcpConfig, writeMcpConfig } from '../utils/claude-config'
import { commandExists } from '../utils/platform'

/**
 * Command options interface
 */
export interface CcjkMcpOptions {
  /** Interactive mode (default: true) */
  interactive?: boolean
  /** Service tier filter */
  tier?: 'core' | 'ondemand' | 'scenario' | 'all'
  /** Specific services to install */
  services?: string[]
  /** Services to exclude */
  exclude?: string[]
  /** Auto-install dependencies */
  autoInstall?: boolean
  /** Skip service verification */
  skipVerification?: boolean
  /** Dry run mode (preview only) */
  dryRun?: boolean
  /** JSON output */
  json?: boolean
  /** Language */
  lang?: SupportedLang
  /** Force reinstallation */
  force?: boolean
}

/**
 * Installation result
 */
export interface McpInstallResult {
  /** Service ID */
  id: string
  /** Service name */
  name: string
  /** Installation status */
  status: 'installed' | 'skipped' | 'failed'
  /** Error message if failed */
  error?: string
  /** Whether dependencies were installed */
  dependenciesInstalled?: boolean
}

/**
 * Command execution result
 */
export interface CcjkMcpResult {
  /** Success status */
  success: boolean
  /** Project analysis */
  project: {
    type: string
    languages: string[]
    frameworks: string[]
  }
  /** Services processed */
  services: McpInstallResult[]
  /** Services installed */
  installed: string[]
  /** Services skipped */
  skipped: string[]
  /** Services failed */
  failed: string[]
  /** Execution duration in milliseconds */
  duration: number
  /** Configuration path */
  configPath: string
}

/**
 * Service tier classification
 */
const SERVICE_TIERS: Record<'core' | 'ondemand' | 'scenario', string[]> = {
  core: ['typescript-language-server', 'python-lsp-server', 'gopls', 'rust-analyzer'],
  ondemand: ['eslint-mcp', 'prettier-mcp', 'git-mcp'],
  scenario: ['playwright-mcp', 'puppeteer-mcp'],
}

/**
 * Main command handler
 */
export async function ccjkMcp(options: CcjkMcpOptions = {}): Promise<CcjkMcpResult> {
  const startTime = Date.now()
  await ensureI18nInitialized()

  // Set language
  if (options.lang) {
    i18n.changeLanguage(options.lang)
  }

  const isZh = i18n.language === 'zh-CN'
  const projectPath = cwd()

  // Initialize result
  const result: CcjkMcpResult = {
    success: false,
    project: {
      type: 'unknown',
      languages: [],
      frameworks: [],
    },
    services: [],
    installed: [],
    skipped: [],
    failed: [],
    duration: 0,
    configPath: join(CLAUDE_DIR, 'mcp.json'),
  }

  try {
    // Step 1: Analyze project
    consola.info(isZh ? '🔍 分析项目中...' : '🔍 Analyzing project...')
    const analysis = await analyzeProject(projectPath, {
      analyzeTransitiveDeps: false,
      // Use default maxFilesToScan of 10000 for better large project support
    })

    result.project.type = analysis.projectType
    result.project.languages = analysis.languages.map(l => l.language)
    result.project.frameworks = analysis.frameworks.map(f => f.name)

    if (!options.json) {
      console.log('')
      console.log(ansis.green(`   ${isZh ? '检测到' : 'Detected'}: ${ansis.bold(analysis.projectType)}`))
      console.log(ansis.dim(`   ${isZh ? '语言' : 'Languages'}: ${analysis.languages.map(l => l.language).join(', ')}`))
      if (analysis.frameworks.length > 0) {
        console.log(ansis.dim(`   ${isZh ? '框架' : 'Frameworks'}: ${analysis.frameworks.map(f => f.name).join(', ')}`))
      }
      console.log('')
    }

    // Step 2: Get recommended services
    const recommendedServices = await getRecommendedServices(analysis, options)
    const availableServices = filterServicesByTier(recommendedServices, options.tier)
    const selectedServices = filterServicesByExclusion(availableServices, options.exclude)

    if (!options.json) {
      console.log(ansis.bold.cyan(`${isZh ? '🔧 推荐的 MCP 服务' : '🔧 Recommended MCP Services'} (${selectedServices.length} ${isZh ? '个' : 'found'}):\n`))

      // Group by tier
      const coreServices = selectedServices.filter(s => SERVICE_TIERS.core.includes(s.id))
      const ondemandServices = selectedServices.filter(s => SERVICE_TIERS.ondemand.includes(s.id))
      const scenarioServices = selectedServices.filter(s => SERVICE_TIERS.scenario.includes(s.id))

      if (coreServices.length > 0) {
        console.log(ansis.bold(`${isZh ? '核心服务' : 'Core Services'}:`))
        coreServices.forEach((service) => {
          const installed = isServiceInstalled(service.id)
          const status = installed ? ansis.green('✅') : ansis.yellow('⭕')
          const name = isZh ? service.name['zh-CN'] : service.name.en
          const desc = isZh ? service.description['zh-CN'] : service.description.en
          console.log(`  ${status} ${ansis.bold(service.id.padEnd(30))} - ${desc}`)
        })
        console.log('')
      }

      if (ondemandServices.length > 0) {
        console.log(ansis.bold(`${isZh ? '按需服务' : 'On-Demand Services'}:`))
        ondemandServices.forEach((service) => {
          const installed = isServiceInstalled(service.id)
          const status = installed ? ansis.green('✅') : ansis.yellow('⭕')
          const name = isZh ? service.name['zh-CN'] : service.name.en
          const desc = isZh ? service.description['zh-CN'] : service.description.en
          console.log(`  ${status} ${ansis.bold(service.id.padEnd(30))} - ${desc}`)
        })
        console.log('')
      }

      if (scenarioServices.length > 0) {
        console.log(ansis.bold(`${isZh ? '场景服务' : 'Scenario Services'}:`))
        scenarioServices.forEach((service) => {
          const installed = isServiceInstalled(service.id)
          const status = installed ? ansis.green('✅') : ansis.yellow('⭕')
          const name = isZh ? service.name['zh-CN'] : service.name.en
          const desc = isZh ? service.description['zh-CN'] : service.description.en
          console.log(`  ${status} ${ansis.bold(service.id.padEnd(30))} - ${desc}`)
        })
        console.log('')
      }
    }

    // Step 3: Interactive confirmation
    let servicesToInstall = selectedServices
    if (options.interactive !== false && !options.json) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `${isZh ? '安装推荐服务' : 'Install recommended services'}?`,
        default: true,
      }])

      if (!confirm) {
        consola.warn(isZh ? '操作已取消' : 'Operation cancelled')
        result.success = true
        result.duration = Date.now() - startTime
        return result
      }

      // Allow service selection
      const { selected } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'selected',
        message: isZh ? '选择要安装的服务' : 'Select services to install',
        choices: selectedServices.map(s => ({
          name: `${s.id} - ${isZh ? s.name['zh-CN'] : s.name.en}`,
          value: s.id,
          checked: true,
        })),
      }])

      servicesToInstall = selectedServices.filter(s => selected.includes(s.id))
    }

    // Step 4: Filter out already installed services (unless forced)
    const alreadyInstalled: string[] = []
    if (!options.force) {
      servicesToInstall = servicesToInstall.filter((s) => {
        const installed = isServiceInstalled(s.id)
        if (installed) {
          alreadyInstalled.push(s.id)
        }
        return !installed
      })
    }

    // Add already installed to skipped list
    result.skipped.push(...alreadyInstalled)

    if (servicesToInstall.length === 0) {
      if (!options.json) {
        console.log(ansis.green(isZh ? '✅ 所有服务已安装' : '✅ All services already installed'))
      }
      result.success = true
      result.duration = Date.now() - startTime
      return result
    }

    // Step 5: Dry run check
    if (options.dryRun) {
      if (!options.json) {
        console.log(ansis.yellow(isZh ? '\n🔍 Dry run 模式 - 预览安装计划' : '\n🔍 Dry run mode - Installation preview'))
        console.log('')
        servicesToInstall.forEach((service) => {
          const name = isZh ? service.name['zh-CN'] : service.name.en
          console.log(`  • ${service.id} (${name})`)
        })
        console.log('')
      }
      result.success = true
      result.duration = Date.now() - startTime
      return result
    }

    // Step 6: Install dependencies
    if (!options.json) {
      console.log(ansis.bold.cyan(`${isZh ? '📦 安装依赖中...' : '📦 Installing dependencies...'}\n`))
    }

    for (const service of servicesToInstall) {
      const installResult = await installServiceDependencies(service, options)
      result.services.push(installResult)

      if (installResult.status === 'installed') {
        result.installed.push(service.id)
      }
      else if (installResult.status === 'skipped') {
        result.skipped.push(service.id)
      }
      else {
        result.failed.push(service.id)
      }

      if (!options.json) {
        const status = installResult.status === 'installed'
          ? ansis.green('✓')
          : installResult.status === 'skipped'
            ? ansis.yellow('○')
            : ansis.red('✗')

        const name = isZh ? service.name['zh-CN'] : service.name.en
        console.log(`  ${status} ${service.id} (${name})`)

        if (installResult.error) {
          console.log(ansis.red(`    ${installResult.error}`))
        }
      }
    }

    // Step 7: Configure MCP services
    if (result.installed.length > 0) {
      if (!options.json) {
        console.log('')
        console.log(ansis.bold.cyan(`${isZh ? '⚙️  配置 MCP 服务中...' : '⚙️  Configuring MCP services...'}\n`))
      }

      // Backup existing config
      backupMcpConfig()

      // Read existing config
      const config = readMcpConfig() || { mcpServers: {} }

      // Add new services
      const newServers: Record<string, any> = {}
      for (const serviceId of result.installed) {
        const service = mcpServiceTemplates[serviceId] || servicesToInstall.find(s => s.id === serviceId)
        if (service) {
          newServers[serviceId] = {
            type: service.type,
            command: service.command,
            args: service.args,
            env: service.env,
          }
        }
      }

      // Merge configs
      const mergedConfig = mergeMcpServers(config, newServers)
      writeMcpConfig(mergedConfig)

      if (!options.json) {
        result.installed.forEach((serviceId) => {
          const service = mcpServiceTemplates[serviceId] || servicesToInstall.find(s => s.id === serviceId)
          const name = service
            ? (isZh ? service.name['zh-CN'] : service.name.en)
            : serviceId
          console.log(`  ${ansis.green('✓')} ${serviceId} (${name})`)
        })
      }
    }

    // Step 8: Verify services (unless skipped)
    if (!options.skipVerification && result.installed.length > 0) {
      if (!options.json) {
        console.log('')
        console.log(ansis.bold.cyan(`${isZh ? '🔍 验证服务...' : '🔍 Verifying services...'}\n`))
      }

      for (const serviceId of result.installed) {
        const service = mcpServiceTemplates[serviceId] || servicesToInstall.find(s => s.id === serviceId)
        const verified = service ? await verifyService(service) : false

        if (!options.json) {
          const name = service
            ? (isZh ? service.name['zh-CN'] : service.name.en)
            : serviceId
          const status = verified ? ansis.green('✓') : ansis.red('✗')
          console.log(`  ${status} ${serviceId} (${name})`)
        }
      }
    }

    // Final summary
    result.success = result.failed.length === 0

    if (!options.json) {
      console.log('')
      if (result.success) {
        console.log(ansis.green.bold(`${isZh ? `✅ 成功配置 ${result.installed.length} 个 MCP 服务！` : `✅ Successfully configured ${result.installed.length} MCP service(s)!`}`))
      }
      else {
        console.log(ansis.yellow.bold(`${isZh ? `⚠️ 部分服务配置失败` : `⚠️ Some services failed to configure`}`))
      }

      console.log('')
      console.log(ansis.bold(isZh ? '下一步:' : 'Next steps:'))
      console.log(`  • ${isZh ? '使用 /ccjk:skills 安装技能' : 'Use /ccjk:skills to install skills'}`)
      console.log(`  • ${isZh ? '使用 /ccjk:agents 创建代理' : 'Use /ccjk:agents to create agents'}`)
      console.log(`  • ${isZh ? '重启 Claude Code 以应用更改' : 'Restart Claude Code to apply changes'}`)
      console.log('')
    }

    result.duration = Date.now() - startTime
    return result
  }
  catch (error) {
    consola.error(isZh ? 'MCP 服务配置失败' : 'MCP service configuration failed', error)
    result.success = false
    result.duration = Date.now() - startTime
    return result
  }
}

/**
 * Get recommended services based on project analysis
 */
async function getRecommendedServices(
  analysis: ProjectAnalysis,
  options: CcjkMcpOptions,
): Promise<McpServiceTemplate[]> {
  const services: McpServiceTemplate[] = []
  const projectType = analysis.projectType.toLowerCase()
  const languages = analysis.languages.map(l => l.language.toLowerCase())
  const frameworks = analysis.frameworks.map(f => f.name.toLowerCase())
  const isZh = i18n.language === 'zh-CN'

  // Try to fetch from cloud v8 Templates API first
  try {
    const templatesClient = getTemplatesClient({ language: isZh ? 'zh-CN' : 'en' })
    const cloudMcpServices = await templatesClient.getOfficialMcpServers()

    if (cloudMcpServices.length > 0) {
      consola.success(isZh ? `从云端获取 ${cloudMcpServices.length} 个 MCP 服务` : `Fetched ${cloudMcpServices.length} MCP services from cloud`)

      // Filter by project relevance
      const relevantServices = cloudMcpServices.filter((mcp) => {
        const tags = mcp.tags || []
        const category = mcp.category || ''
        const compatibility = mcp.compatibility || {}

        // Check if MCP matches project
        return (
          tags.some(tag => languages.includes(tag) || frameworks.includes(tag) || projectType.includes(tag))
          || (compatibility.languages || []).some((lang: string) => languages.includes(lang.toLowerCase()))
          || (compatibility.frameworks || []).some((fw: string) => frameworks.includes(fw.toLowerCase()))
          || category === 'core' // Always include core services
        )
      })

      // Convert cloud templates to local format
      for (const mcp of (relevantServices.length > 0 ? relevantServices : cloudMcpServices.slice(0, 10))) {
        // Check if we have a local template for this service
        const localTemplate = mcpServiceTemplates[mcp.id] || mcpServiceTemplates[mcp.name_en.toLowerCase().replace(/\s+/g, '-')]

        if (localTemplate) {
          services.push(localTemplate)
        }
        else {
          // Create a template from cloud data
          const cloudTemplate: McpServiceTemplate = {
            id: mcp.id || mcp.name_en.toLowerCase().replace(/\s+/g, '-'),
            name: {
              'en': mcp.name_en,
              'zh-CN': mcp.name_zh_cn || mcp.name_en,
            },
            description: {
              'en': mcp.description_en || '',
              'zh-CN': mcp.description_zh_cn || mcp.description_en || '',
            },
            type: 'stdio',
            command: mcp.npm_package ? 'npx' : 'node',
            args: mcp.npm_package ? ['-y', mcp.npm_package] : [],
            installCommand: mcp.install_command || `npm install -g ${mcp.npm_package || mcp.id}`,
            installCheck: mcp.npm_package ? `npx ${mcp.npm_package} --version` : 'echo ok',
            category: 'tooling',
            requiredFor: [],
            optionalFor: ['all'],
            env: {},
          }
          services.push(cloudTemplate)
        }
      }

      if (services.length > 0) {
        return services
      }
    }
  }
  catch (error) {
    consola.warn(isZh ? '云端获取失败，使用本地模板' : 'Cloud fetch failed, using local templates')
  }

  // Fallback to local templates
  const allServices = getCompatibleMcpServiceTemplates()

  // Find services required for this project type
  for (const service of allServices) {
    // Check if explicitly requested
    if (options.services && options.services.length > 0) {
      if (options.services.includes(service.id)) {
        services.push(service)
      }
      continue
    }

    // Check if excluded
    if (options.exclude && options.exclude.includes(service.id)) {
      continue
    }

    // Check if required for project type
    if (service.requiredFor.includes(projectType)
      || service.requiredFor.includes('all')) {
      services.push(service)
      continue
    }

    // Check if optional for project type
    if (service.optionalFor.includes(projectType)
      || service.optionalFor.includes('all')) {
      services.push(service)
      continue
    }

    // Check for language matches
    for (const lang of languages) {
      if (service.requiredFor.includes(lang) || service.optionalFor.includes(lang)) {
        services.push(service)
        break
      }
    }
  }

  // Remove duplicates
  const uniqueServices = Array.from(
    new Map(services.map(s => [s.id, s])).values(),
  )

  return uniqueServices
}

/**
 * Filter services by tier
 */
function filterServicesByTier(
  services: McpServiceTemplate[],
  tier?: 'core' | 'ondemand' | 'scenario' | 'all',
): McpServiceTemplate[] {
  if (!tier || tier === 'all') {
    return services
  }

  const tierServices = SERVICE_TIERS[tier]
  return services.filter(s => tierServices.includes(s.id))
}

/**
 * Filter services by exclusion list
 */
function filterServicesByExclusion(
  services: McpServiceTemplate[],
  exclude?: string[],
): McpServiceTemplate[] {
  if (!exclude || exclude.length === 0) {
    return services
  }

  return services.filter(s => !exclude.includes(s.id))
}

/**
 * Check if service is already installed
 */
function isServiceInstalled(serviceId: string): boolean {
  const config = readMcpConfig()
  return config?.mcpServers?.[serviceId] !== undefined
}

/**
 * Install service dependencies
 */
async function installServiceDependencies(
  service: McpServiceTemplate,
  options: CcjkMcpOptions,
): Promise<McpInstallResult> {
  const result: McpInstallResult = {
    id: service.id,
    name: i18n.language === 'zh-CN' ? service.name['zh-CN'] : service.name.en,
    status: 'installed',
  }

  try {
    // Check if already installed
    if (isServiceInstalled(service.id) && !options.force) {
      result.status = 'skipped'
      return result
    }

    // Check if command exists
    const commandExists = await checkCommandExists(service.command)
    if (commandExists) {
      result.dependenciesInstalled = false
      return result
    }

    // Install dependencies
    if (options.autoInstall) {
      consola.info(`Installing ${service.id}...`)
      const { exec } = await import('tinyexec')
      const [cmd, ...args] = service.installCommand.split(' ')
      await exec(cmd, args)
      result.dependenciesInstalled = true
    }
    else {
      result.status = 'skipped'
      result.error = i18n.language === 'zh-CN'
        ? '依赖未安装，使用 --auto-install 自动安装'
        : 'Dependencies not installed, use --auto-install to install automatically'
    }

    return result
  }
  catch (error) {
    result.status = 'failed'
    result.error = error instanceof Error ? error.message : String(error)
    return result
  }
}

/**
 * Check if command exists
 */
async function checkCommandExists(command: string): Promise<boolean> {
  try {
    // Extract command name (first part before space)
    const cmdName = command.split(' ')[0]
    return commandExists(cmdName)
  }
  catch {
    return false
  }
}

/**
 * Verify service is working
 */
async function verifyService(service: McpServiceTemplate): Promise<boolean> {
  try {
    const { exec } = await import('tinyexec')
    const [cmd, ...args] = service.installCheck.split(' ')
    const result = await exec(cmd, args, { timeout: 5000 })
    return result.exitCode === 0
  }
  catch {
    return false
  }
}

/**
 * Format result as JSON
 */
export function formatResultAsJson(result: CcjkMcpResult): string {
  return JSON.stringify(result, null, 2)
}

/**
 * Format result for console output
 */
export function formatResultForConsole(result: CcjkMcpResult): string {
  const isZh = i18n.language === 'zh-CN'
  const lines: string[] = []

  lines.push(ansis.bold.cyan(isZh ? '📊 MCP 服务配置摘要' : '📊 MCP Service Configuration Summary'))
  lines.push('')

  lines.push(`${ansis.bold(isZh ? '项目类型' : 'Project Type')}: ${result.project.type}`)
  lines.push(`${ansis.bold(isZh ? '语言' : 'Languages')}: ${result.project.languages.join(', ')}`)
  if (result.project.frameworks.length > 0) {
    lines.push(`${ansis.bold(isZh ? '框架' : 'Frameworks')}: ${result.project.frameworks.join(', ')}`)
  }
  lines.push('')

  lines.push(ansis.bold(isZh ? '安装的服务' : 'Installed Services'))
  result.installed.forEach((id) => {
    lines.push(`  ${ansis.green('✓')} ${id}`)
  })
  lines.push('')

  if (result.skipped.length > 0) {
    lines.push(ansis.bold(isZh ? '跳过的服务' : 'Skipped Services'))
    result.skipped.forEach((id) => {
      lines.push(`  ${ansis.yellow('○')} ${id}`)
    })
    lines.push('')
  }

  if (result.failed.length > 0) {
    lines.push(ansis.bold(isZh ? '失败的服务' : 'Failed Services'))
    result.failed.forEach((id) => {
      lines.push(`  ${ansis.red('✗')} ${id}`)
    })
    lines.push('')
  }

  lines.push(`${ansis.bold(isZh ? '耗时' : 'Duration')}: ${result.duration}ms`)
  lines.push(`${ansis.bold(isZh ? '配置文件' : 'Config File')}: ${result.configPath}`)

  return lines.join('\n')
}
