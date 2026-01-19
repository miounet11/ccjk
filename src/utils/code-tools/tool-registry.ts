import type { CodeToolType } from '../../constants'
import { existsSync } from 'node:fs'
import { exec } from 'tinyexec'
import {
  AIDER_CONFIG_FILE,
  AIDER_DIR,
  CLAUDE_DIR,
  CLINE_CONFIG_FILE,
  CLINE_DIR,
  CODE_TOOL_INFO,
  CODE_TOOL_TYPES,

  CODEX_CONFIG_FILE,
  CODEX_DIR,
  CONTINUE_CONFIG_FILE,
  CONTINUE_DIR,
  CURSOR_CONFIG_FILE,
  CURSOR_DIR,
} from '../../constants'

/**
 * Code tool info type (extracted from CODE_TOOL_INFO)
 */
export type CodeToolInfo = (typeof CODE_TOOL_INFO)[CodeToolType]

/**
 * Tool installation status
 */
export interface ToolStatus {
  tool: CodeToolType
  installed: boolean
  version?: string
  configExists: boolean
  configPath: string
  lastChecked: Date
}

/**
 * Tool installation result
 */
export interface ToolInstallResult {
  tool: CodeToolType
  success: boolean
  message: string
  version?: string
}

/**
 * Get tool config path
 */
export function getToolConfigPath(tool: CodeToolType): string {
  switch (tool) {
    case 'claude-code':
      return CLAUDE_DIR
    case 'codex':
      return CODEX_CONFIG_FILE
    case 'aider':
      return AIDER_CONFIG_FILE
    case 'continue':
      return CONTINUE_CONFIG_FILE
    case 'cline':
      return CLINE_CONFIG_FILE
    case 'cursor':
      return CURSOR_CONFIG_FILE
    default:
      return ''
  }
}

/**
 * Get tool directory
 */
export function getToolDir(tool: CodeToolType): string {
  switch (tool) {
    case 'claude-code':
      return CLAUDE_DIR
    case 'codex':
      return CODEX_DIR
    case 'aider':
      return AIDER_DIR
    case 'continue':
      return CONTINUE_DIR
    case 'cline':
      return CLINE_DIR
    case 'cursor':
      return CURSOR_DIR
    default:
      return ''
  }
}

/**
 * Check if a tool is installed
 */
export async function isToolInstalled(tool: CodeToolType): Promise<boolean> {
  try {
    switch (tool) {
      case 'claude-code':
      {
        const ccResult = await exec('claude', ['--version'])
        return ccResult.exitCode === 0
      }
      case 'codex':
      {
        const cxResult = await exec('codex', ['--version'])
        return cxResult.exitCode === 0
      }
      case 'aider':
      {
        const adResult = await exec('aider', ['--version'])
        return adResult.exitCode === 0
      }
      case 'continue':
        // Continue is typically an extension, check config
        return existsSync(CONTINUE_DIR)
      case 'cline':
        // Cline is a VS Code extension
        return existsSync(CLINE_DIR)
      case 'cursor':
      {
        const cuResult = await exec('cursor', ['--version'])
        return cuResult.exitCode === 0
      }
      default:
        return false
    }
  }
  catch {
    return false
  }
}

/**
 * Get tool version
 */
export async function getToolVersion(tool: CodeToolType): Promise<string | null> {
  try {
    switch (tool) {
      case 'claude-code': {
        const result = await exec('claude', ['--version'])
        return result.stdout.trim()
      }
      case 'codex': {
        const result = await exec('codex', ['--version'])
        return result.stdout.trim()
      }
      case 'aider': {
        const result = await exec('aider', ['--version'])
        return result.stdout.trim()
      }
      case 'cursor': {
        const result = await exec('cursor', ['--version'])
        return result.stdout.trim()
      }
      default:
        return null
    }
  }
  catch {
    return null
  }
}

/**
 * Get status of a tool
 */
export async function getToolStatus(tool: CodeToolType): Promise<ToolStatus> {
  const configPath = getToolConfigPath(tool)
  const installed = await isToolInstalled(tool)
  const version = installed ? await getToolVersion(tool) : undefined

  return {
    tool,
    installed,
    version: version || undefined,
    configExists: existsSync(configPath),
    configPath,
    lastChecked: new Date(),
  }
}

/**
 * Get status of all tools
 */
export async function getAllToolsStatus(): Promise<ToolStatus[]> {
  const statuses: ToolStatus[] = []

  for (const tool of CODE_TOOL_TYPES) {
    statuses.push(await getToolStatus(tool))
  }

  return statuses
}

/**
 * Get installed tools
 */
export async function getInstalledTools(): Promise<CodeToolType[]> {
  const installed: CodeToolType[] = []

  for (const tool of CODE_TOOL_TYPES) {
    if (await isToolInstalled(tool)) {
      installed.push(tool)
    }
  }

  return installed
}

/**
 * Install a tool
 */
export async function installTool(tool: CodeToolType): Promise<ToolInstallResult> {
  const info = CODE_TOOL_INFO[tool]

  try {
    // Parse install command
    const parts = info.installCmd.split(' ')
    const cmd = parts[0]
    const args = parts.slice(1)

    const result = await exec(cmd, args)

    if (result.exitCode === 0) {
      const version = await getToolVersion(tool)
      return {
        tool,
        success: true,
        message: `${info.name} installed successfully`,
        version: version || undefined,
      }
    }
    else {
      return {
        tool,
        success: false,
        message: `Failed to install ${info.name}: ${result.stderr}`,
      }
    }
  }
  catch (error) {
    return {
      tool,
      success: false,
      message: `Failed to install ${info.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Get tool info
 */
export function getToolInfo(tool: CodeToolType): CodeToolInfo {
  return CODE_TOOL_INFO[tool]
}

/**
 * Get all tools info
 */
export function getAllToolsInfo(): Record<CodeToolType, CodeToolInfo> {
  return CODE_TOOL_INFO
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: 'cli' | 'extension' | 'editor'): CodeToolType[] {
  return CODE_TOOL_TYPES.filter(tool => CODE_TOOL_INFO[tool].category === category)
}

/**
 * Format tool status for display
 */
export function formatToolStatus(status: ToolStatus): string {
  const info = CODE_TOOL_INFO[status.tool]
  const icon = status.installed ? '✅' : '❌'
  const version = status.version ? ` (${status.version})` : ''
  const config = status.configExists ? '📄' : '⚠️'

  return `${icon} ${info.name}${version} ${config}`
}

/**
 * Get recommended tools based on project type
 */
export function getRecommendedTools(projectType: string): CodeToolType[] {
  switch (projectType) {
    case 'typescript':
    case 'javascript':
      return ['claude-code', 'aider', 'continue']
    case 'python':
      return ['aider', 'continue', 'claude-code']
    case 'fullstack':
      return ['claude-code', 'cursor', 'aider']
    default:
      return ['claude-code', 'aider']
  }
}
