import type { CodeToolType } from '../constants'
import inquirer from 'inquirer'
import { detectCodeToolType } from '../config/smart-defaults'
import { CODE_TOOL_ALIASES, DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../constants'
import { i18n } from '../i18n'
import { readZcfConfigAsync, updateZcfConfig } from './ccjk-config'

/**
 * Code type abbreviation mapping
 */
const CODE_TYPE_ABBREVIATIONS: Record<string, CodeToolType> = {
  cc: 'claude-code',
  mc: 'clavue',
  mycode: 'clavue',
  cx: 'codex',
} as const

export const STARTUP_CODE_TOOL_CHOICES = ['clavue', 'claude-code', 'codex'] as const satisfies readonly CodeToolType[]

/**
 * Resolve code type from parameter, abbreviation, or default config
 * @param codeTypeParam - Code type parameter from command line
 * @returns Resolved code tool type
 */
export async function resolveCodeType(codeTypeParam?: string): Promise<CodeToolType> {
  // If parameter is provided, resolve it
  if (codeTypeParam) {
    const normalizedParam = codeTypeParam.toLowerCase().trim()

    // Check if it's an abbreviation or known alias
    if (normalizedParam in CODE_TYPE_ABBREVIATIONS) {
      return CODE_TYPE_ABBREVIATIONS[normalizedParam]
    }
    if (normalizedParam in CODE_TOOL_ALIASES) {
      return CODE_TOOL_ALIASES[normalizedParam]
    }

    // Check if it's a valid full code type
    if (isValidCodeType(normalizedParam)) {
      return normalizedParam as CodeToolType
    }

    // Prepare valid options for error message
    const validAbbreviations = Object.keys(CODE_TYPE_ABBREVIATIONS)
    const validFullTypes = Object.values(CODE_TYPE_ABBREVIATIONS)
    const validOptions = [...validAbbreviations, ...validFullTypes].join(', ')

    // Get the actual default value that will be used
    let defaultValue = DEFAULT_CODE_TOOL_TYPE
    try {
      const config = await readZcfConfigAsync()
      if (config?.codeToolType && isValidCodeType(config.codeToolType)) {
        defaultValue = config.codeToolType
      }
    }
    catch {
      // If config reading fails, use DEFAULT_CODE_TOOL_TYPE
    }

    // Use i18n for error message
    throw new Error(
      i18n.t('errors:invalidCodeType', { value: codeTypeParam, validOptions, defaultValue }),
    )
  }

  // No parameter provided — respect stored config first (user's explicit choice via "S. Switch")
  const storedType = await getStoredCodeType()
  if (storedType) {
    return storedType
  }

  // No stored config — use fresh detection as fallback
  try {
    const freshDetected = detectCodeToolType() as CodeToolType
    if (isValidCodeType(freshDetected)) {
      return freshDetected
    }
  }
  catch {
    // If detection fails, use default
  }

  // Final fallback to default
  return DEFAULT_CODE_TOOL_TYPE
}

/**
 * Check if a value is a valid code tool type
 * @param value - Value to check
 * @returns True if valid code tool type
 */
function isValidCodeType(value: string): value is CodeToolType {
  return isCodeToolType(value)
}

async function getStoredCodeType(): Promise<CodeToolType | null> {
  try {
    const config = await readZcfConfigAsync()
    if (config?.codeToolType && isValidCodeType(config.codeToolType)) {
      return config.codeToolType
    }
  }
  catch {
    // Ignore config read failures and continue with fallback logic
  }

  return null
}

function persistCodeType(codeToolType: CodeToolType): void {
  updateZcfConfig({ codeToolType })
}

async function promptStartupCodeType(): Promise<CodeToolType> {
  const isZh = i18n.language === 'zh-CN'
  const { codeToolType } = await inquirer.prompt<{ codeToolType: CodeToolType }>({
    type: 'list',
    name: 'codeToolType',
    message: isZh ? '选择代码工具' : 'Choose your code tool',
    choices: STARTUP_CODE_TOOL_CHOICES.map((tool) => {
      if (tool === 'clavue') {
        return {
          name: isZh
            ? `${tool} - Provider-first 控制中心（默认推荐）`
            : `${tool} - Provider-first control center (recommended default)`,
          value: tool,
        }
      }

      if (tool === 'claude-code') {
        return {
          name: isZh
            ? 'Claude Code - Claude 家族经典控制中心'
            : 'Claude Code - Classic Claude-family control center',
          value: tool,
        }
      }

      return {
        name: isZh
          ? 'Codex - Codex 专属控制中心、Provider / MCP / Memory 配置'
          : 'Codex - Codex-specific control center for provider, MCP, and memory setup',
        value: tool,
      }
    }),
    default: 0,
  })

  persistCodeType(codeToolType)
  return codeToolType
}

export async function resolveStartupCodeType(options: {
  codeTypeParam?: string
  interactive?: boolean
} = {}): Promise<CodeToolType> {
  if (options.codeTypeParam) {
    const resolvedType = await resolveCodeType(options.codeTypeParam)
    persistCodeType(resolvedType)
    return resolvedType
  }

  const storedType = await getStoredCodeType()
  if (storedType) {
    return storedType
  }

  if (options.interactive) {
    return await promptStartupCodeType()
  }

  return await resolveCodeType()
}

export const __testUtils = {
  STARTUP_CODE_TOOL_CHOICES,
}
