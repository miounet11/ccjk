import type { CodeToolType } from '../constants'
import { detectCodeToolType } from '../config/smart-defaults'
import { DEFAULT_CODE_TOOL_TYPE } from '../constants'
import { i18n } from '../i18n'
import { readZcfConfigAsync, saveZcfConfig } from './ccjk-config'

/**
 * Code type abbreviation mapping
 */
const CODE_TYPE_ABBREVIATIONS: Record<string, CodeToolType> = {
  cc: 'claude-code',
  cx: 'codex',
} as const

/**
 * Resolve code type from parameter, abbreviation, or default config
 * @param codeTypeParam - Code type parameter from command line
 * @returns Resolved code tool type
 */
export async function resolveCodeType(codeTypeParam?: string): Promise<CodeToolType> {
  // If parameter is provided, resolve it
  if (codeTypeParam) {
    const normalizedParam = codeTypeParam.toLowerCase().trim()

    // Check if it's an abbreviation
    if (normalizedParam in CODE_TYPE_ABBREVIATIONS) {
      return CODE_TYPE_ABBREVIATIONS[normalizedParam]
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

  // No parameter provided, prefer fresh detection over stored config
  // This fixes stale 'codex' values persisted in ~/.ccjk/config.toml
  try {
    const freshDetected = detectCodeToolType() as CodeToolType
    if (isValidCodeType(freshDetected)) {
      // Update stored config with fresh detection result
      try {
        const config = await readZcfConfigAsync()
        if (config && config.codeToolType !== freshDetected) {
          config.codeToolType = freshDetected
          await saveZcfConfig(config)
        }
      }
      catch {
        // Config update is best-effort, don't block on failure
      }
      return freshDetected
    }
  }
  catch {
    // If fresh detection fails, fall through to stored config
  }

  // Fallback: try stored config
  try {
    const config = await readZcfConfigAsync()
    if (config?.codeToolType && isValidCodeType(config.codeToolType)) {
      return config.codeToolType
    }
  }
  catch {
    // If config reading fails, continue to fallback
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
  return ['claude-code', 'codex'].includes(value)
}
