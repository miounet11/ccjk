/**
 * Parser patterns for Claude Code function call output detection
 * Contains regex patterns and markers for identifying tool invocations
 */

/**
 * Tool invocation patterns based on Claude Code's XML-like output format
 */
export const TOOL_PATTERNS = {
  /**
   * Matches tool invocation start: <function_calls>
   */
  FUNCTION_CALLS_START: /<function_calls>/,

  /**
   * Matches tool invocation end: </function_calls>
   */
  FUNCTION_CALLS_END: /<\/function_calls>/,

  /**
   * Matches invoke tag start: <invoke name="ToolName">
   * Captures tool name in group 1
   */
  INVOKE_START: /<invoke name="([^"]+)">/,

  /**
   * Matches invoke tag end: </invoke>
   */
  INVOKE_END: /<\/invoke>/,

  /**
   * Matches parameter tag: <parameter name="param_name">value</parameter>
   * Captures parameter name in group 1 and value in group 2
   */
  PARAMETER: /<parameter name="([^"]+)">([^<]*)<\/parameter>/,

  /**
   * Matches parameter tag start (for multi-line values): <parameter name="param_name">
   * Captures parameter name in group 1
   */
  PARAMETER_START: /<parameter name="([^"]+)">/,

  /**
   * Matches parameter tag end: </parameter>
   */
  PARAMETER_END: /<\/parameter>/,

  /**
   * Matches function results block start: <function_results>
   */
  FUNCTION_RESULTS_START: /<function_results>/,

  /**
   * Matches function results block end: </function_results>
   */
  FUNCTION_RESULTS_END: /<\/function_results>/,

  /**
   * Matches system message in results: <system>message</system>
   */
  SYSTEM_MESSAGE: /<system>([^<]*)<\/system>/,

  /**
   * Matches error message in results: <error>message</error>
   */
  ERROR_MESSAGE: /<error>([^<]*)<\/error>/,

  /**
   * Matches tool output wrapper: <tool_output>content</tool_output>
   */
  TOOL_OUTPUT: /<tool_output>([\s\S]*?)<\/tool_output>/,

  /**
   * Matches system warning: <system-warning>message</system-warning>
   */
  SYSTEM_WARNING: /<system-warning>([^<]*)<\/system-warning>/,
} as const

/**
 * Known Claude Code tool names
 */
export const KNOWN_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Glob',
  'Grep',
  'NotebookEdit',
  'WebFetch',
  'WebSearch',
  'Skill',
  'TodoWrite',
  'mcp__ide__getDiagnostics',
  'mcp__ide__executeCode',
  'mcp__context7__resolve-library-id',
  'mcp__context7__query-docs',
  'mcp__mcp-deepwiki__deepwiki_fetch',
  'mcp__Playwright__browser_close',
  'mcp__Playwright__browser_resize',
  'mcp__Playwright__browser_console_messages',
  'mcp__Playwright__browser_handle_dialog',
  'mcp__Playwright__browser_evaluate',
  'mcp__Playwright__browser_file_upload',
  'mcp__Playwright__browser_fill_form',
  'mcp__Playwright__browser_install',
  'mcp__Playwright__browser_press_key',
  'mcp__Playwright__browser_type',
  'mcp__Playwright__browser_navigate',
  'mcp__Playwright__browser_navigate_back',
  'mcp__Playwright__browser_network_requests',
  'mcp__Playwright__browser_run_code',
  'mcp__Playwright__browser_take_screenshot',
  'mcp__Playwright__browser_snapshot',
  'mcp__Playwright__browser_click',
  'mcp__Playwright__browser_drag',
  'mcp__Playwright__browser_hover',
  'mcp__Playwright__browser_select_option',
  'mcp__Playwright__browser_tabs',
  'mcp__Playwright__browser_wait_for',
] as const

/**
 * Tool categories for classification
 */
export const TOOL_CATEGORIES = {
  FILE_OPERATIONS: ['Read', 'Write', 'Edit', 'Glob'],
  SEARCH: ['Grep', 'WebSearch'],
  EXECUTION: ['Bash', 'mcp__ide__executeCode'],
  WEB: ['WebFetch', 'WebSearch'],
  BROWSER: [
    'mcp__Playwright__browser_close',
    'mcp__Playwright__browser_resize',
    'mcp__Playwright__browser_console_messages',
    'mcp__Playwright__browser_handle_dialog',
    'mcp__Playwright__browser_evaluate',
    'mcp__Playwright__browser_file_upload',
    'mcp__Playwright__browser_fill_form',
    'mcp__Playwright__browser_install',
    'mcp__Playwright__browser_press_key',
    'mcp__Playwright__browser_type',
    'mcp__Playwright__browser_navigate',
    'mcp__Playwright__browser_navigate_back',
    'mcp__Playwright__browser_network_requests',
    'mcp__Playwright__browser_run_code',
    'mcp__Playwright__browser_take_screenshot',
    'mcp__Playwright__browser_snapshot',
    'mcp__Playwright__browser_click',
    'mcp__Playwright__browser_drag',
    'mcp__Playwright__browser_hover',
    'mcp__Playwright__browser_select_option',
    'mcp__Playwright__browser_tabs',
    'mcp__Playwright__browser_wait_for',
  ],
  DOCUMENTATION: ['mcp__context7__resolve-library-id', 'mcp__context7__query-docs', 'mcp__mcp-deepwiki__deepwiki_fetch'],
  IDE: ['mcp__ide__getDiagnostics', 'mcp__ide__executeCode'],
  WORKFLOW: ['Skill', 'TodoWrite', 'NotebookEdit'],
} as const

/**
 * Token estimation constants
 */
export const TOKEN_ESTIMATION = {
  /** Average characters per token for English text */
  CHARS_PER_TOKEN_EN: 4,
  /** Average characters per token for Chinese text */
  CHARS_PER_TOKEN_ZH: 1.5,
  /** Chinese character regex */
  CHINESE_CHAR_REGEX: /[\u4E00-\u9FA5]/g,
  /** Maximum result length to store (truncate beyond this) */
  MAX_RESULT_LENGTH: 10000,
  /** Maximum argument value length to store */
  MAX_ARG_LENGTH: 5000,
} as const

/**
 * Parser configuration constants
 */
export const PARSER_CONFIG = {
  /** Buffer size for streaming parser (bytes) */
  BUFFER_SIZE: 8192,
  /** Maximum time to wait for tool completion (ms) */
  TOOL_TIMEOUT: 300000, // 5 minutes
  /** Debounce time for emitting events (ms) */
  EVENT_DEBOUNCE: 100,
  /** Maximum number of incomplete tools to track */
  MAX_INCOMPLETE_TOOLS: 10,
} as const

/**
 * Helper function to estimate token count from text
 */
export function estimateTokens(text: string): number {
  if (!text)
    return 0

  const chineseChars = (text.match(TOKEN_ESTIMATION.CHINESE_CHAR_REGEX) || []).length
  const otherChars = text.length - chineseChars

  return Math.ceil(
    chineseChars / TOKEN_ESTIMATION.CHARS_PER_TOKEN_ZH
    + otherChars / TOKEN_ESTIMATION.CHARS_PER_TOKEN_EN,
  )
}

/**
 * Helper function to truncate text if too long
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength)
    return text
  return `${text.slice(0, maxLength)}... [truncated ${text.length - maxLength} chars]`
}

/**
 * Helper function to check if a tool name is known
 */
export function isKnownTool(toolName: string): boolean {
  return KNOWN_TOOLS.includes(toolName as any)
}

/**
 * Helper function to get tool category
 */
export function getToolCategory(toolName: string): string | null {
  for (const [category, tools] of Object.entries(TOOL_CATEGORIES)) {
    if ((tools as readonly string[]).includes(toolName)) {
      return category
    }
  }
  return null
}

/**
 * Helper function to extract tool name from invoke tag
 */
export function extractToolName(line: string): string | null {
  const match = line.match(TOOL_PATTERNS.INVOKE_START)
  return match ? match[1] : null
}

/**
 * Helper function to extract parameter from line
 */
export function extractParameter(line: string): { name: string, value: string } | null {
  const match = line.match(TOOL_PATTERNS.PARAMETER)
  if (match) {
    return { name: match[1], value: match[2] }
  }
  return null
}

/**
 * Helper function to check if line contains function_calls start
 */
export function isFunctionCallsStart(line: string): boolean {
  return TOOL_PATTERNS.FUNCTION_CALLS_START.test(line)
}

/**
 * Helper function to check if line contains function_calls end
 */
export function isFunctionCallsEnd(line: string): boolean {
  return TOOL_PATTERNS.FUNCTION_CALLS_END.test(line)
}

/**
 * Helper function to check if line contains invoke start
 */
export function isInvokeStart(line: string): boolean {
  return TOOL_PATTERNS.INVOKE_START.test(line)
}

/**
 * Helper function to check if line contains invoke end
 */
export function isInvokeEnd(line: string): boolean {
  return TOOL_PATTERNS.INVOKE_END.test(line)
}

/**
 * Helper function to check if line contains function_results start
 */
export function isFunctionResultsStart(line: string): boolean {
  return TOOL_PATTERNS.FUNCTION_RESULTS_START.test(line)
}

/**
 * Helper function to check if line contains function_results end
 */
export function isFunctionResultsEnd(line: string): boolean {
  return TOOL_PATTERNS.FUNCTION_RESULTS_END.test(line)
}

/**
 * Helper function to extract system message
 */
export function extractSystemMessage(line: string): string | null {
  const match = line.match(TOOL_PATTERNS.SYSTEM_MESSAGE)
  return match ? match[1] : null
}

/**
 * Helper function to extract error message
 */
export function extractErrorMessage(line: string): string | null {
  const match = line.match(TOOL_PATTERNS.ERROR_MESSAGE)
  return match ? match[1] : null
}
