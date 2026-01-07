import type { CodeToolType, SupportedLang } from '../constants'
import type { ToolStatus } from '../utils/code-tools'
/**
 * CCJK Tools Command
 * Manage multiple AI coding tools (Claude Code, Codex, Aider, Continue, Cline, Cursor)
 */
import ansis from 'ansis'
import ora from 'ora'
import { CODE_TOOL_INFO, CODE_TOOL_TYPES } from '../constants'
import { format, i18n } from '../i18n'
import { boxify, COLORS, STATUS } from '../utils/banner'
import {
  getAllToolsStatus,
  getToolStatus,
  installTool,

} from '../utils/code-tools'

/**
 * Tools command options
 */
export interface ToolsCommandOptions {
  lang?: SupportedLang
  json?: boolean
}

/**
 * List all tools and their status
 */
export async function listTools(options: ToolsCommandOptions = {}): Promise<void> {
  const spinner = ora(i18n.t('tools:scanning')).start()
  const toolsStatus = await getAllToolsStatus()
  spinner.stop()

  if (options.json) {
    console.log(JSON.stringify(toolsStatus, null, 2))
    return
  }

  console.log('')
  console.log(COLORS.primary('╔═══════════════════════════════════════════════════════════════╗'))
  console.log(COLORS.primary('║') + COLORS.accent(`                    ${i18n.t('tools:title')}                    `.slice(0, 60)) + COLORS.primary('║'))
  console.log(COLORS.primary('╚═══════════════════════════════════════════════════════════════╝'))
  console.log('')

  // Group by category
  const cliTools = toolsStatus.filter(t => CODE_TOOL_INFO[t.tool].category === 'cli')
  const extensionTools = toolsStatus.filter(t => CODE_TOOL_INFO[t.tool].category === 'extension')
  const editorTools = toolsStatus.filter(t => CODE_TOOL_INFO[t.tool].category === 'editor')

  const renderToolList = (tools: ToolStatus[], title: string) => {
    console.log(COLORS.secondary(`  ${title}:`))
    for (const tool of tools) {
      const info = CODE_TOOL_INFO[tool.tool]
      const statusIcon = tool.installed ? ansis.green('✓') : ansis.gray('○')
      const version = tool.version ? ansis.cyan(` v${tool.version}`) : ''
      const configStatus = tool.installed
        ? (tool.configExists ? ansis.green(` [${i18n.t('tools:configured')}]`) : ansis.yellow(` [${i18n.t('tools:notConfigured')}]`))
        : ''
      console.log(`    ${statusIcon} ${info.name}${version}${configStatus}`)
      console.log(ansis.gray(`       ${info.description}`))
    }
    console.log('')
  }

  if (cliTools.length > 0)
    renderToolList(cliTools, `🖥️  ${i18n.t('tools:cliTools')}`)
  if (extensionTools.length > 0)
    renderToolList(extensionTools, `🔌 ${i18n.t('tools:ideExtensions')}`)
  if (editorTools.length > 0)
    renderToolList(editorTools, `✏️  ${i18n.t('tools:aiEditors')}`)

  // Summary
  const installed = toolsStatus.filter(t => t.installed).length
  const configured = toolsStatus.filter(t => t.configExists).length
  console.log(ansis.gray(`  ${format(i18n.t('tools:summary'), { installed: String(installed), total: String(toolsStatus.length), configured: String(configured), installedCount: String(installed) })}`))
  console.log('')
}

/**
 * Install a specific tool
 */
export async function installToolCommand(
  toolId: string,
  _options: ToolsCommandOptions = {},
): Promise<void> {
  // Validate tool ID
  if (!CODE_TOOL_TYPES.includes(toolId as CodeToolType)) {
    console.log(STATUS.error(format(i18n.t('tools:unknownTool'), { tool: toolId })))
    console.log(ansis.gray(format(i18n.t('tools:availableTools'), { tools: CODE_TOOL_TYPES.join(', ') })))
    return
  }

  const tool = toolId as CodeToolType
  const info = CODE_TOOL_INFO[tool]

  // Check if already installed
  const status = await getToolStatus(tool)
  if (status.installed) {
    console.log(STATUS.info(format(i18n.t('tools:alreadyInstalled'), { name: info.name, version: status.version || 'unknown' })))
    return
  }

  const spinner = ora(format(i18n.t('tools:installing'), { name: info.name })).start()
  const result = await installTool(tool)

  if (result.success) {
    spinner.succeed(result.message)
  }
  else {
    spinner.fail(result.message)
  }
}

/**
 * Show status of a specific tool
 */
export async function showToolStatus(
  toolId: string,
  options: ToolsCommandOptions = {},
): Promise<void> {
  if (!CODE_TOOL_TYPES.includes(toolId as CodeToolType)) {
    console.log(STATUS.error(format(i18n.t('tools:unknownTool'), { tool: toolId })))
    console.log(ansis.gray(format(i18n.t('tools:availableTools'), { tools: CODE_TOOL_TYPES.join(', ') })))
    return
  }

  const tool = toolId as CodeToolType
  const info = CODE_TOOL_INFO[tool]
  const status = await getToolStatus(tool)

  if (options.json) {
    console.log(JSON.stringify({ ...status, info }, null, 2))
    return
  }

  console.log('')
  console.log(boxify(`
${info.name}

${i18n.t('tools:status')}: ${status.installed ? `✓ ${i18n.t('tools:installed')}` : `✗ ${i18n.t('tools:notInstalled')}`}
${i18n.t('tools:version')}: ${status.version || 'N/A'}
${i18n.t('tools:config')}: ${status.configExists ? `✓ ${i18n.t('tools:configured')}` : `⚠ ${i18n.t('tools:notConfigured')}`}
${i18n.t('tools:configPath')}: ${status.configPath}
${i18n.t('tools:category')}: ${info.category}
${i18n.t('tools:website')}: ${info.website}

${i18n.t('tools:installCommand')}:
  ${info.installCmd}
`, 'rounded', info.name))
}

/**
 * Show recommended tools for the current project
 */
export async function showRecommendedTools(_options: ToolsCommandOptions = {}): Promise<void> {
  const recommended = [
    {
      tool: 'claude-code' as CodeToolType,
      reason: 'Best for complex reasoning and code generation',
    },
    {
      tool: 'aider' as CodeToolType,
      reason: 'Great for terminal-based pair programming',
    },
    {
      tool: 'continue' as CodeToolType,
      reason: 'Excellent VS Code integration with multiple models',
    },
  ]

  console.log('')
  console.log(COLORS.secondary(`  🌟 ${i18n.t('tools:recommended')}`))
  console.log('')

  for (const rec of recommended) {
    const info = CODE_TOOL_INFO[rec.tool]
    const status = await getToolStatus(rec.tool)
    const statusIcon = status.installed ? ansis.green('✓') : ansis.gray('○')

    console.log(`  ${statusIcon} ${ansis.bold(info.name)}`)
    console.log(ansis.gray(`     ${rec.reason}`))
    if (!status.installed) {
      console.log(ansis.cyan(`     ${format(i18n.t('tools:installCmd'), { cmd: info.installCmd })}`))
    }
    console.log('')
  }
}

/**
 * Main tools command handler
 */
export async function toolsCommand(
  action: string = 'list',
  target?: string,
  options: ToolsCommandOptions = {},
): Promise<void> {
  switch (action) {
    case 'list':
    case 'ls':
      await listTools(options)
      break

    case 'install':
    case 'i':
      if (!target) {
        console.log(STATUS.error(i18n.t('tools:specifyTool')))
        console.log(ansis.gray(format(i18n.t('tools:usage'), { action: 'install' })))
        console.log(ansis.gray(format(i18n.t('tools:availableTools'), { tools: CODE_TOOL_TYPES.join(', ') })))
        return
      }
      await installToolCommand(target, options)
      break

    case 'status':
    case 's':
      if (!target) {
        await listTools(options)
      }
      else {
        await showToolStatus(target, options)
      }
      break

    case 'recommend':
    case 'rec':
      await showRecommendedTools(options)
      break

    default:
      console.log(STATUS.error(format(i18n.t('tools:unknownAction'), { action })))
      console.log(ansis.gray(i18n.t('tools:availableActions')))
  }
}

export default toolsCommand
