/**
 * Intent Interceptor - Shell Hook Integration
 *
 * Analyzes user input to detect skill intents and generates shell hooks
 * for transparent command interception. Integrates with the IntentEngine
 * to provide intelligent skill suggestions.
 *
 * Features:
 * - Analyze user input for skill intent matching
 * - Generate bash/zsh/fish shell hook scripts
 * - Provide Claude Code-friendly suggestions
 * - Support auto-execution and suggestion modes
 *
 * @module plugins-v2/hooks/intent-interceptor
 */

import type {
  IntentMatch,
  IntentRule,
  LocalizedString,
  PluginPackage,
} from '../types'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { join } from 'pathe'
import { getIntentEngine } from '../intent/intent-engine'

// ============================================================================
// Types
// ============================================================================

/**
 * Shell types supported for hook generation
 */
export type ShellType = 'bash' | 'zsh' | 'fish' | 'unknown'

/**
 * Interception result from analyzing user input
 */
export interface InterceptionResult {
  /** Whether an intent was detected */
  detected: boolean
  /** The matched intent (if any) */
  match?: IntentMatch
  /** Suggested skill to execute */
  suggestedSkill?: SuggestedSkill
  /** Prompt for Claude Code */
  claudePrompt?: string
  /** Whether to auto-execute */
  autoExecute: boolean
  /** Confidence level */
  confidence: number
}

/**
 * Suggested skill information
 */
export interface SuggestedSkill {
  /** Plugin ID */
  pluginId: string
  /** Skill ID (if specific) */
  skillId?: string
  /** Skill name (localized) */
  name: LocalizedString
  /** Description of what the skill does */
  description: LocalizedString
  /** Command to execute */
  command: string
  /** Arguments to pass */
  args?: string[]
}

/**
 * Shell hook configuration
 */
export interface ShellHookConfig {
  /** Shell type */
  shellType: ShellType
  /** Hook script content */
  hookScript: string
  /** RC file path */
  rcFile: string
  /** Whether intent interception is enabled */
  intentEnabled: boolean
}

/**
 * Hook installation result
 */
export interface HookInstallResult {
  /** Whether installation succeeded */
  success: boolean
  /** Shell type */
  shellType: ShellType
  /** RC file path */
  rcFile: string
  /** Message */
  message: string
  /** Error (if any) */
  error?: string
}

// ============================================================================
// Constants
// ============================================================================

const HOOK_MARKER = '# CCJK Intent Interceptor Hook'
const HOOK_END_MARKER = '# END CCJK Intent Interceptor Hook'
const MIN_CONFIDENCE_FOR_SUGGESTION = 0.5
const MIN_CONFIDENCE_FOR_AUTO_EXECUTE = 0.85

// ============================================================================
// Intent Interceptor Class
// ============================================================================

/**
 * Intent Interceptor
 *
 * Analyzes user input and generates shell hooks for skill interception
 */
export class IntentInterceptor {
  private installedSkills: Map<string, PluginPackage> = new Map()
  private customRules: IntentRule[] = []
  private lang: 'en' | 'zh-CN' = 'en'

  constructor(lang: 'en' | 'zh-CN' = 'en') {
    this.lang = lang
  }

  // ==========================================================================
  // Intent Analysis
  // ==========================================================================

  /**
   * Analyze user input and detect skill intent
   *
   * @param userInput - User's input text
   * @param cwd - Current working directory
   * @returns Interception result with suggestions
   */
  async analyze(userInput: string, cwd: string = process.cwd()): Promise<InterceptionResult> {
    const engine = getIntentEngine()

    // Detect intents
    const matches = await engine.detect(userInput, cwd)

    if (matches.length === 0) {
      return {
        detected: false,
        autoExecute: false,
        confidence: 0,
      }
    }

    // Get the best match
    const bestMatch = matches[0]

    // Check confidence thresholds
    if (bestMatch.confidence < MIN_CONFIDENCE_FOR_SUGGESTION) {
      return {
        detected: false,
        autoExecute: false,
        confidence: bestMatch.confidence,
      }
    }

    // Build suggested skill
    const suggestedSkill = this.buildSuggestedSkill(bestMatch)

    // Generate Claude prompt
    const claudePrompt = this.generateClaudePrompt(bestMatch, suggestedSkill)

    return {
      detected: true,
      match: bestMatch,
      suggestedSkill,
      claudePrompt,
      autoExecute: bestMatch.confidence >= MIN_CONFIDENCE_FOR_AUTO_EXECUTE && bestMatch.autoExecute,
      confidence: bestMatch.confidence,
    }
  }

  /**
   * Build suggested skill from intent match
   */
  private buildSuggestedSkill(match: IntentMatch): SuggestedSkill {
    const plugin = this.installedSkills.get(match.pluginId)

    // Default command based on plugin ID
    const command = `ccjk plugin run ${match.pluginId}`

    return {
      pluginId: match.pluginId,
      skillId: match.intentId,
      name: match.suggestedAction,
      description: this.getSkillDescription(match, plugin),
      command,
      args: [],
    }
  }

  /**
   * Get skill description from match and plugin
   */
  private getSkillDescription(match: IntentMatch, plugin?: PluginPackage): LocalizedString {
    if (plugin?.manifest.description) {
      return plugin.manifest.description
    }

    // Generate description based on intent
    const descriptions: Record<string, LocalizedString> = {
      'intent:git-commit': {
        'en': 'Automatically generate commit message and commit changes',
        'zh-CN': '自动生成提交信息并提交更改',
      },
      'intent:code-review': {
        'en': 'Review code changes and provide suggestions',
        'zh-CN': '审查代码更改并提供建议',
      },
      'intent:generate-tests': {
        'en': 'Generate test cases for your code',
        'zh-CN': '为代码生成测试用例',
      },
      'intent:generate-docs': {
        'en': 'Generate documentation for your code',
        'zh-CN': '为代码生成文档',
      },
      'intent:deploy': {
        'en': 'Deploy your application',
        'zh-CN': '部署应用程序',
      },
      'intent:docker': {
        'en': 'Generate Docker configuration',
        'zh-CN': '生成 Docker 配置',
      },
      'intent:refactor': {
        'en': 'Refactor and optimize code',
        'zh-CN': '重构和优化代码',
      },
    }

    return descriptions[match.intentId] || {
      'en': 'Execute skill action',
      'zh-CN': '执行技能操作',
    }
  }

  /**
   * Generate Claude Code-friendly prompt
   */
  private generateClaudePrompt(match: IntentMatch, skill: SuggestedSkill): string {
    const name = skill.name[this.lang] || skill.name.en
    const description = skill.description[this.lang] || skill.description.en
    const confidencePercent = Math.round(match.confidence * 100)

    if (this.lang === 'zh-CN') {
      return `
检测到技能意图: ${name}
置信度: ${confidencePercent}%
描述: ${description}

匹配的模式: ${match.matchedPatterns.join(', ') || '无'}
匹配的上下文信号: ${match.matchedSignals.join(', ') || '无'}

建议执行: ${skill.command}

是否要执行此技能？回复 "是" 或 "y" 确认，或继续输入其他指令。
`.trim()
    }

    return `
Detected skill intent: ${name}
Confidence: ${confidencePercent}%
Description: ${description}

Matched patterns: ${match.matchedPatterns.join(', ') || 'none'}
Matched context signals: ${match.matchedSignals.join(', ') || 'none'}

Suggested command: ${skill.command}

Would you like to execute this skill? Reply "yes" or "y" to confirm, or continue with other instructions.
`.trim()
  }

  // ==========================================================================
  // Shell Hook Generation
  // ==========================================================================

  /**
   * Detect the current shell type
   */
  detectShellType(): ShellType {
    const shell = process.env.SHELL || ''

    if (shell.includes('bash'))
      return 'bash'
    if (shell.includes('zsh'))
      return 'zsh'
    if (shell.includes('fish'))
      return 'fish'

    return 'unknown'
  }

  /**
   * Get the RC file path for a given shell type
   */
  getShellRcFile(shellType: ShellType): string {
    const home = homedir()

    switch (shellType) {
      case 'bash':
        // Prefer .bashrc, fallback to .bash_profile
        if (existsSync(join(home, '.bashrc'))) {
          return join(home, '.bashrc')
        }
        return join(home, '.bash_profile')

      case 'zsh':
        return join(home, '.zshrc')

      case 'fish':
        return join(home, '.config', 'fish', 'config.fish')

      default:
        return join(home, '.profile')
    }
  }

  /**
   * Generate shell hook script for intent interception
   *
   * @param shellType - Target shell type
   * @param options - Hook generation options
   * @returns Shell hook configuration
   */
  generateHookScript(
    shellType: ShellType = this.detectShellType(),
    options: {
      enableIntentDetection?: boolean
      ccjkPath?: string
    } = {},
  ): ShellHookConfig {
    const {
      enableIntentDetection = true,
      ccjkPath = 'npx ccjk',
    } = options

    const rcFile = this.getShellRcFile(shellType)
    let hookScript: string

    switch (shellType) {
      case 'bash':
      case 'zsh':
        hookScript = this.generateBashZshHook(ccjkPath, enableIntentDetection)
        break

      case 'fish':
        hookScript = this.generateFishHook(ccjkPath, enableIntentDetection)
        break

      default:
        hookScript = this.generateBashZshHook(ccjkPath, enableIntentDetection)
    }

    return {
      shellType,
      hookScript,
      rcFile,
      intentEnabled: enableIntentDetection,
    }
  }

  /**
   * Generate bash/zsh hook script
   */
  private generateBashZshHook(ccjkPath: string, enableIntent: boolean): string {
    const intentCheck = enableIntent
      ? `
  # Intent detection - analyze input before passing to claude
  if [[ -n "\$1" && "\$1" != /* && "\$1" != -* ]]; then
    local intent_result
    intent_result=\$(${ccjkPath} intent-check "\$*" 2>/dev/null)
    if [[ \$? -eq 0 && -n "\$intent_result" ]]; then
      echo "\$intent_result"
      read -r -p "Execute suggested skill? [y/N] " response
      if [[ "\$response" =~ ^[Yy]\$ ]]; then
        eval "\$(echo "\$intent_result" | grep 'Suggested command:' | sed 's/Suggested command: //')"
        return \$?
      fi
    fi
  fi`
      : ''

    return `
${HOOK_MARKER}
# This hook enables intent-based skill interception for claude commands
# Installed by CCJK Plugin System 2.0

ccjk_claude() {
  # Find the real claude command path (bypass this function)
  local real_claude
  real_claude=\$(command -v claude 2>/dev/null)

  if [[ -z "\$real_claude" ]]; then
    echo "Error: claude command not found"
    return 1
  fi

  # Handle /plugin command - use CCJK's plugin marketplace
  if [[ "\$1" == "/plugin" ]]; then
    shift
    ${ccjkPath} plugin "\$@"
    return \$?
  fi

  # Handle /skill command - skill management
  if [[ "\$1" == "/skill" ]]; then
    shift
    ${ccjkPath} skill "\$@"
    return \$?
  fi

  # Other native slash commands - pass through directly
  if [[ "\$1" == /* ]]; then
    "\$real_claude" "\$@"
    return \$?
  fi
${intentCheck}

  # Check for recursion prevention
  if [[ -n "\$CCJK_INTENT_ACTIVE" ]]; then
    "\$real_claude" "\$@"
    return \$?
  fi

  export CCJK_INTENT_ACTIVE=1
  "\$real_claude" "\$@"
  local exit_code=\$?
  unset CCJK_INTENT_ACTIVE
  return \$exit_code
}

# Alias claude to use intent interceptor
alias claude='ccjk_claude'
${HOOK_END_MARKER}
`
  }

  /**
   * Generate fish hook script
   */
  private generateFishHook(ccjkPath: string, enableIntent: boolean): string {
    const intentCheck = enableIntent
      ? `
  # Intent detection - analyze input before passing to claude
  if test (count $argv) -gt 0; and not string match -q '/*' -- $argv[1]; and not string match -q '-*' -- $argv[1]
    set intent_result (${ccjkPath} intent-check "$argv" 2>/dev/null)
    if test $status -eq 0; and test -n "$intent_result"
      echo $intent_result
      read -l -P "Execute suggested skill? [y/N] " response
      if string match -qi 'y' -- $response
        set cmd (echo $intent_result | grep 'Suggested command:' | sed 's/Suggested command: //')
        eval $cmd
        return $status
      end
    end
  end`
      : ''

    return `
${HOOK_MARKER}
# This hook enables intent-based skill interception for claude commands
# Installed by CCJK Plugin System 2.0

function ccjk_claude
  # Find the real claude command path
  set real_claude (command -v claude 2>/dev/null)

  if test -z "$real_claude"
    echo "Error: claude command not found"
    return 1
  end

  # Handle /plugin command - use CCJK's plugin marketplace
  if test "$argv[1]" = "/plugin"
    set -e argv[1]
    ${ccjkPath} plugin $argv
    return $status
  end

  # Handle /skill command - skill management
  if test "$argv[1]" = "/skill"
    set -e argv[1]
    ${ccjkPath} skill $argv
    return $status
  end

  # Other native slash commands - pass through directly
  if string match -q '/*' -- $argv[1]
    $real_claude $argv
    return $status
  end
${intentCheck}

  # Check for recursion prevention
  if set -q CCJK_INTENT_ACTIVE
    $real_claude $argv
    return $status
  end

  set -x CCJK_INTENT_ACTIVE 1
  $real_claude $argv
  set exit_code $status
  set -e CCJK_INTENT_ACTIVE
  return $exit_code
end

# Alias claude to use intent interceptor
alias claude='ccjk_claude'
${HOOK_END_MARKER}
`
  }

  // ==========================================================================
  // Skill Registration
  // ==========================================================================

  /**
   * Register an installed skill for intent matching
   */
  registerSkill(plugin: PluginPackage): void {
    this.installedSkills.set(plugin.manifest.id, plugin)

    // Register plugin intents with the engine
    if (plugin.intents) {
      const engine = getIntentEngine()
      engine.registerRules(plugin.intents)
    }
  }

  /**
   * Unregister a skill
   */
  unregisterSkill(pluginId: string): void {
    this.installedSkills.delete(pluginId)

    const engine = getIntentEngine()
    engine.unregisterPluginRules(pluginId)
  }

  /**
   * Register custom intent rules
   */
  registerCustomRules(rules: IntentRule[]): void {
    this.customRules.push(...rules)

    const engine = getIntentEngine()
    engine.registerRules(rules)
  }

  /**
   * Get all registered skills
   */
  getRegisteredSkills(): PluginPackage[] {
    return Array.from(this.installedSkills.values())
  }

  // ==========================================================================
  // Hook Management
  // ==========================================================================

  /**
   * Check if intent hook is installed
   */
  isHookInstalled(shellType: ShellType = this.detectShellType()): boolean {
    const rcFile = this.getShellRcFile(shellType)

    if (!existsSync(rcFile)) {
      return false
    }

    const content = readFileSync(rcFile, 'utf-8')
    return content.includes(HOOK_MARKER)
  }

  /**
   * Get hook installation instructions
   */
  getInstallInstructions(shellType: ShellType = this.detectShellType()): string {
    const config = this.generateHookScript(shellType)

    if (this.lang === 'zh-CN') {
      return `
要启用意图拦截，请将以下内容添加到 ${config.rcFile}:

${config.hookScript}

然后运行: source ${config.rcFile}

或者运行: npx ccjk hook install
`.trim()
    }

    return `
To enable intent interception, add the following to ${config.rcFile}:

${config.hookScript}

Then run: source ${config.rcFile}

Or run: npx ccjk hook install
`.trim()
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Set language for prompts
   */
  setLanguage(lang: 'en' | 'zh-CN'): void {
    this.lang = lang
  }

  /**
   * Get current language
   */
  getLanguage(): 'en' | 'zh-CN' {
    return this.lang
  }

  /**
   * Format interception result for display
   */
  formatResult(result: InterceptionResult): string {
    if (!result.detected) {
      return ''
    }

    return result.claudePrompt || ''
  }

  /**
   * Check if input looks like a skill invocation
   */
  looksLikeSkillInvocation(input: string): boolean {
    // Check for common skill-related keywords
    const skillKeywords = [
      // English
      'commit',
      'review',
      'test',
      'deploy',
      'refactor',
      'document',
      'fix',
      'optimize',
      // Chinese
      '提交',
      '审查',
      '测试',
      '部署',
      '重构',
      '文档',
      '修复',
      '优化',
    ]

    const inputLower = input.toLowerCase()
    return skillKeywords.some(keyword => inputLower.includes(keyword.toLowerCase()))
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let interceptorInstance: IntentInterceptor | null = null

/**
 * Get the singleton IntentInterceptor instance
 */
export function getIntentInterceptor(lang: 'en' | 'zh-CN' = 'en'): IntentInterceptor {
  if (!interceptorInstance) {
    interceptorInstance = new IntentInterceptor(lang)
  }
  return interceptorInstance
}

/**
 * Reset the interceptor instance (for testing)
 */
export function resetIntentInterceptor(): void {
  interceptorInstance = null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Analyze user input for skill intent
 */
export async function analyzeIntent(
  userInput: string,
  cwd?: string,
  lang: 'en' | 'zh-CN' = 'en',
): Promise<InterceptionResult> {
  const interceptor = getIntentInterceptor(lang)
  return interceptor.analyze(userInput, cwd)
}

/**
 * Generate shell hook script
 */
export function generateShellHook(
  shellType?: ShellType,
  options?: { enableIntentDetection?: boolean, ccjkPath?: string },
): ShellHookConfig {
  const interceptor = getIntentInterceptor()
  return interceptor.generateHookScript(shellType, options)
}

/**
 * Check if hook is installed
 */
export function isIntentHookInstalled(shellType?: ShellType): boolean {
  const interceptor = getIntentInterceptor()
  return interceptor.isHookInstalled(shellType)
}
