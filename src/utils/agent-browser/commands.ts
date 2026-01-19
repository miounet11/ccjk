/**
 * Agent Browser Commands
 *
 * High-level command wrappers for common agent-browser operations.
 * Provides a simplified API for browser automation tasks.
 *
 * @see https://github.com/vercel-labs/agent-browser
 * @module utils/agent-browser/commands
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import ansis from 'ansis'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { getAgentBrowserStatus } from './installer'

const execAsync = promisify(exec)

export interface CommandOptions {
  /** Session name to use */
  session?: string
  /** Return JSON output */
  json?: boolean
  /** Show browser window */
  headed?: boolean
  /** Command timeout in ms */
  timeout?: number
}

export interface SnapshotOptions extends CommandOptions {
  /** Only show interactive elements */
  interactive?: boolean
  /** Remove empty structural elements */
  compact?: boolean
  /** Limit tree depth */
  depth?: number
  /** Scope to CSS selector */
  selector?: string
}

export interface CommandResult {
  success: boolean
  output: string
  error?: string
  data?: any
}

/**
 * Build the base command with common options
 */
function buildCommand(cmd: string, options: CommandOptions = {}): string {
  let command = 'agent-browser'

  if (options.session) {
    command += ` --session ${options.session}`
  }

  if (options.headed) {
    command += ' --headed'
  }

  if (options.json) {
    command += ' --json'
  }

  command += ` ${cmd}`

  return command
}

/**
 * Execute an agent-browser command
 */
async function executeCommand(cmd: string, options: CommandOptions = {}): Promise<CommandResult> {
  const timeout = options.timeout || 30000
  const command = buildCommand(cmd, options)

  try {
    const { stdout, stderr } = await execAsync(command, { timeout })

    let data: any
    if (options.json && stdout) {
      try {
        data = JSON.parse(stdout)
      }
      catch {
        // Not valid JSON, use raw output
      }
    }

    return {
      success: true,
      output: stdout.trim(),
      error: stderr.trim() || undefined,
      data,
    }
  }
  catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Command failed',
    }
  }
}

/**
 * Check if agent-browser is ready to use
 */
export async function ensureReady(): Promise<boolean> {
  ensureI18nInitialized()

  const status = await getAgentBrowserStatus()

  if (!status.isInstalled) {
    console.log(ansis.yellow(`⚠ ${i18n.t('agentBrowser:notInstalled')}`))
    console.log(ansis.green(`  ${i18n.t('agentBrowser:installHint')}`))
    return false
  }

  if (!status.hasBrowser) {
    console.log(ansis.yellow(`⚠ ${i18n.t('agentBrowser:browserNotInstalled')}`))
    console.log(ansis.green(`  ${i18n.t('agentBrowser:browserInstallHint')}`))
    return false
  }

  return true
}

// ============================================================================
// Navigation Commands
// ============================================================================

/**
 * Navigate to a URL
 */
export async function open(url: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`open "${url}"`, options)
}

/**
 * Go back in history
 */
export async function back(options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand('back', options)
}

/**
 * Go forward in history
 */
export async function forward(options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand('forward', options)
}

/**
 * Reload the page
 */
export async function reload(options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand('reload', options)
}

// ============================================================================
// Interaction Commands
// ============================================================================

/**
 * Click an element
 */
export async function click(selector: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`click "${selector}"`, options)
}

/**
 * Double-click an element
 */
export async function dblclick(selector: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`dblclick "${selector}"`, options)
}

/**
 * Fill a text field (clears existing content)
 */
export async function fill(selector: string, text: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`fill "${selector}" "${text}"`, options)
}

/**
 * Type text into an element
 */
export async function type(selector: string, text: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`type "${selector}" "${text}"`, options)
}

/**
 * Press a key
 */
export async function press(key: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`press ${key}`, options)
}

/**
 * Hover over an element
 */
export async function hover(selector: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`hover "${selector}"`, options)
}

/**
 * Select an option in a dropdown
 */
export async function select(selector: string, value: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`select "${selector}" "${value}"`, options)
}

/**
 * Check a checkbox
 */
export async function check(selector: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`check "${selector}"`, options)
}

/**
 * Uncheck a checkbox
 */
export async function uncheck(selector: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`uncheck "${selector}"`, options)
}

/**
 * Scroll the page
 */
export async function scroll(direction: 'up' | 'down' | 'left' | 'right', pixels?: number, options: CommandOptions = {}): Promise<CommandResult> {
  const cmd = pixels ? `scroll ${direction} ${pixels}` : `scroll ${direction}`
  return executeCommand(cmd, options)
}

// ============================================================================
// Information Commands
// ============================================================================

/**
 * Get accessibility snapshot (optimized for AI)
 */
export async function snapshot(options: SnapshotOptions = {}): Promise<CommandResult> {
  let cmd = 'snapshot'

  if (options.interactive) {
    cmd += ' -i'
  }

  if (options.compact) {
    cmd += ' -c'
  }

  if (options.depth) {
    cmd += ` -d ${options.depth}`
  }

  if (options.selector) {
    cmd += ` -s "${options.selector}"`
  }

  return executeCommand(cmd, options)
}

/**
 * Get text content of an element
 */
export async function getText(selector: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`get text "${selector}"`, options)
}

/**
 * Get an attribute value
 */
export async function getAttribute(selector: string, attr: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`get attr "${selector}" ${attr}`, options)
}

/**
 * Get page title
 */
export async function getTitle(options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand('get title', options)
}

/**
 * Get current URL
 */
export async function getUrl(options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand('get url', options)
}

/**
 * Take a screenshot
 */
export async function screenshot(path?: string, options: CommandOptions & { fullPage?: boolean } = {}): Promise<CommandResult> {
  let cmd = 'screenshot'

  if (path) {
    cmd += ` "${path}"`
  }

  if (options.fullPage) {
    cmd += ' --full'
  }

  return executeCommand(cmd, options)
}

// ============================================================================
// State Check Commands
// ============================================================================

/**
 * Check if element is visible
 */
export async function isVisible(selector: string, options: CommandOptions = {}): Promise<boolean> {
  const result = await executeCommand(`is visible "${selector}"`, options)
  return result.success && result.output.toLowerCase().includes('true')
}

/**
 * Check if element is enabled
 */
export async function isEnabled(selector: string, options: CommandOptions = {}): Promise<boolean> {
  const result = await executeCommand(`is enabled "${selector}"`, options)
  return result.success && result.output.toLowerCase().includes('true')
}

/**
 * Check if checkbox is checked
 */
export async function isChecked(selector: string, options: CommandOptions = {}): Promise<boolean> {
  const result = await executeCommand(`is checked "${selector}"`, options)
  return result.success && result.output.toLowerCase().includes('true')
}

// ============================================================================
// Wait Commands
// ============================================================================

/**
 * Wait for an element to appear
 */
export async function waitForSelector(selector: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`wait "${selector}"`, { ...options, timeout: options.timeout || 30000 })
}

/**
 * Wait for text to appear
 */
export async function waitForText(text: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`wait --text "${text}"`, { ...options, timeout: options.timeout || 30000 })
}

/**
 * Wait for a specific time
 */
export async function wait(ms: number, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`wait ${ms}`, options)
}

// ============================================================================
// Browser Control Commands
// ============================================================================

/**
 * Close the browser
 */
export async function close(options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand('close', options)
}

/**
 * Evaluate JavaScript in the page
 */
export async function evaluate(js: string, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`eval "${js.replace(/"/g, '\\"')}"`, options)
}

// ============================================================================
// Tab Commands
// ============================================================================

/**
 * List all tabs
 */
export async function listTabs(options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand('tab', options)
}

/**
 * Create a new tab
 */
export async function newTab(url?: string, options: CommandOptions = {}): Promise<CommandResult> {
  const cmd = url ? `tab new "${url}"` : 'tab new'
  return executeCommand(cmd, options)
}

/**
 * Switch to a tab
 */
export async function switchTab(index: number, options: CommandOptions = {}): Promise<CommandResult> {
  return executeCommand(`tab ${index}`, options)
}

/**
 * Close a tab
 */
export async function closeTab(index?: number, options: CommandOptions = {}): Promise<CommandResult> {
  const cmd = index !== undefined ? `tab close ${index}` : 'tab close'
  return executeCommand(cmd, options)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Run a quick browser task (open, execute, close)
 */
export async function quickTask(
  url: string,
  task: (session: string) => Promise<any>,
  options: { session?: string, headed?: boolean } = {},
): Promise<{ success: boolean, result?: any, error?: string }> {
  const session = options.session || `quick-${Date.now()}`

  try {
    // Open URL
    const openResult = await open(url, { session, headed: options.headed })
    if (!openResult.success) {
      return { success: false, error: openResult.error }
    }

    // Wait for page to load
    await wait(1000, { session })

    // Execute task
    const result = await task(session)

    // Close browser
    await close({ session })

    return { success: true, result }
  }
  catch (error: any) {
    // Try to close browser on error
    await close({ session }).catch(() => {})

    return { success: false, error: error.message }
  }
}
