/**
 * CCJK Tools Command
 * Manage multiple AI coding tools (Claude Code, Codex, Aider, Continue, Cline, Cursor)
 */
import ansis from 'ansis'
import ora from 'ora'
import type { CodeToolType, SupportedLang } from '../constants'
import { CODE_TOOL_INFO, CODE_TOOL_TYPES } from '../constants'
import { COLORS, boxify, STATUS } from '../utils/banner'
import {
  getAllToolsStatus,
  getToolStatus,
  installTool,
  type ToolStatus,
} from '../utils/code-tools'
import { getTranslation } from '../i18n'

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
  const spinner = ora('Scanning installed AI tools...').start()
  const toolsStatus = await getAllToolsStatus()
  spinner.stop()

  if (options.json) {
    console.log(JSON.stringify(toolsStatus, null, 2))
    return
  }

  console.log('')
  console.log(COLORS.primary('╔═══════════════════════════════════════════════════════════════╗'))
  console.log(COLORS.primary('║') + COLORS.accent('                    AI Coding Tools Status                    ') + COLORS.primary('║'))
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
        ? (tool.configExists ? ansis.green(' [configured]') : ansis.yellow(' [not configured]'))
        : ''
      console.log(`    ${statusIcon} ${info.name}${version}${configStatus}`)
      console.log(ansis.gray(`       ${info.description}`))
    }
    console.log('')
  }

  if (cliTools.length > 0) renderToolList(cliTools, '🖥️  CLI Tools')
  if (extensionTools.length > 0) renderToolList(extensionTools, '🔌 IDE Extensions')
  if (editorTools.length > 0) renderToolList(editorTools, '✏️  AI Editors')

  // Summary
  const installed = toolsStatus.filter(t => t.installed).length
  const configured = toolsStatus.filter(t => t.configExists).length
  console.log(ansis.gray(`  Summary: ${installed}/${toolsStatus.length} installed, ${configured}/${installed} configured`))
  console.log('')
}

/**
 * Install a specific tool
 */
export async function installToolCommand(
  toolId: string,
  options: ToolsCommandOptions = {},
): Promise<void> {
  // Validate tool ID
  if (!CODE_TOOL_TYPES.includes(toolId as CodeToolType)) {
    console.log(STATUS.error(`Unknown tool: ${toolId}`))
    console.log(ansis.gray(`Available tools: ${CODE_TOOL_TYPES.join(', ')}`))
    return
  }

  const tool = toolId as CodeToolType
  const info = CODE_TOOL_INFO[tool]

  // Check if already installed
  const status = await getToolStatus(tool)
  if (status.installed) {
    console.log(STATUS.info(`${info.name} is already installed (${status.version || 'version unknown'})`))
    return
  }

  const spinner = ora(`Installing ${info.name}...`).start()
  const result = await installTool(tool)

  if (result.success) {
    spinner.succeed(result.message)
  } else {
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
    console.log(STATUS.error(`Unknown tool: ${toolId}`))
    console.log(ansis.gray(`Available tools: ${CODE_TOOL_TYPES.join(', ')}`))
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

Status: ${status.installed ? '✓ Installed' : '✗ Not installed'}
Version: ${status.version || 'N/A'}
Config: ${status.configExists ? '✓ Configured' : '⚠ Not configured'}
Config Path: ${status.configPath}
Category: ${info.category}
Website: ${info.website}

Install Command:
  ${info.installCmd}
`, 'rounded', info.name))
}

/**
 * Show recommended tools for the current project
 */
export async function showRecommendedTools(options: ToolsCommandOptions = {}): Promise<void> {
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
  console.log(COLORS.secondary('  🌟 Recommended AI Coding Tools:'))
  console.log('')

  for (const rec of recommended) {
    const info = CODE_TOOL_INFO[rec.tool]
    const status = await getToolStatus(rec.tool)
    const statusIcon = status.installed ? ansis.green('✓') : ansis.gray('○')

    console.log(`  ${statusIcon} ${ansis.bold(info.name)}`)
    console.log(ansis.gray(`     ${rec.reason}`))
    if (!status.installed) {
      console.log(ansis.cyan(`     Install: ${info.installCmd}`))
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
        console.log(STATUS.error('Please specify a tool to install'))
        console.log(ansis.gray(`Usage: ccjk tools install <tool>`))
        console.log(ansis.gray(`Available tools: ${CODE_TOOL_TYPES.join(', ')}`))
        return
      }
      await installToolCommand(target, options)
      break

    case 'status':
    case 's':
      if (!target) {
        await listTools(options)
      } else {
        await showToolStatus(target, options)
      }
      break

    case 'recommend':
    case 'rec':
      await showRecommendedTools(options)
      break

    default:
      console.log(STATUS.error(`Unknown action: ${action}`))
      console.log(ansis.gray('Available actions: list, install, status, recommend'))
  }
}

export default toolsCommand
