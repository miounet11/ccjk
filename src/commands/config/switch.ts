/**
 * Config Switch Subcommand
 *
 * Handles switching between configuration profiles for Claude Code and Codex.
 * Supports listing available profiles and switching to a specific profile.
 *
 * Usage:
 *   ccjk config switch <target>              Switch to profile
 *   ccjk config switch --list                List available profiles
 *   ccjk config switch --code-type <type>    Specify code tool type
 *
 * Special targets for Claude Code:
 *   - official: Switch to official OAuth login
 *   - ccr: Switch to CCR proxy
 */

import type { CodeToolType } from '../../constants'
import type { SwitchConfigOptions } from './types'

import ansis from 'ansis'
import { config } from '../../config/unified'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType, resolveCodeToolType } from '../../constants'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { ClaudeCodeConfigManager } from '../../utils/claude-code-config-manager'
import { listCodexProviders as listCodexProvidersUtil, readCodexConfig, switchCodexProvider as switchCodexProviderUtil, switchToOfficialLogin } from '../../utils/code-tools/codex'

/**
 * Resolve code type with fallback to CCJK config
 *
 * @param codeType - Code type from options
 * @returns Resolved code type
 */
function resolveCodeType(codeType?: unknown): CodeToolType {
  if (codeType !== undefined) {
    if (isCodeToolType(codeType as CodeToolType)) {
      return codeType as CodeToolType
    }
    return resolveCodeToolType(codeType as string)
  }

  // Fall back to CCJK config
  const ccjkConfig = config.ccjk.read()
  if (ccjkConfig?.general?.currentTool && isCodeToolType(ccjkConfig.general.currentTool)) {
    return ccjkConfig.general.currentTool
  }

  return DEFAULT_CODE_TOOL_TYPE
}

/**
 * List available Claude Code profiles
 *
 * @param options - Command options
 */
async function listClaudeCodeProfiles(_options: SwitchConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  try {
    const ccjkConfig = config.ccjk.read()
    const claudeConfig = config.claude.read()

    if (!ccjkConfig || !ccjkConfig.tools?.claudeCode) {
      console.log(ansis.yellow(isZh
        ? 'No CCJK configuration found'
        : '未找到 CCJK 配置'))
      console.log(ansis.dim(isZh
        ? 'Run "ccjk init" to initialize configuration'
        : '运行 "ccjk init" 初始化配置'))
      console.log('')
      return
    }

    const profiles = ccjkConfig.tools.claudeCode.profiles || {}
    const currentProfileId = ccjkConfig.tools.claudeCode.currentProfile || ''
    const hasApiConfig = claudeConfig?.env?.ANTHROPIC_BASE_URL || claudeConfig?.env?.ANTHROPIC_API_KEY || claudeConfig?.env?.ANTHROPIC_AUTH_TOKEN

    console.log('')
    console.log(ansis.bold.cyan(isZh ? 'Claude Code Configuration Profiles' : 'Claude Code 配置文件'))
    console.log(ansis.dim('─'.repeat(60)))
    console.log('')

    // Display special profiles
    const isOfficialMode = !currentProfileId || !hasApiConfig
    console.log(`${isOfficialMode ? ansis.green('● ') : '  '}${ansis.bold('Official Login')}${isOfficialMode ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`)
    console.log(`  ${ansis.green('ID:')} official`)
    console.log(`  ${ansis.dim(isZh ? 'Use Anthropic official OAuth login' : '使用 Anthropic 官方 OAuth 登录')}`)
    console.log('')

    const ccrProfile = profiles['ccr-proxy']
    if (ccrProfile) {
      const isCcr = currentProfileId === 'ccr-proxy'
      console.log(`${isCcr ? ansis.green('● ') : '  '}${ansis.bold(ccrProfile.name || 'CCR Proxy')}${isCcr ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`)
      console.log(`  ${ansis.green('ID:')} ccr`)
      console.log(`  ${ansis.dim(isZh ? 'Claude Code Router proxy configuration' : 'Claude Code Router 代理配置')}`)
      console.log('')
    }

    // Display custom profiles
    for (const [id, profile] of Object.entries(profiles)) {
      if (id === 'ccr-proxy')
        continue // Already displayed above

      const isCurrent = id === currentProfileId
      console.log(`${isCurrent ? ansis.green('● ') : '  '}${ansis.bold(profile.name || id)}${isCurrent ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`)
      console.log(`  ${ansis.green('ID:')} ${id}`)

      if (profile.baseUrl) {
        console.log(`  ${ansis.green('URL:')} ${ansis.dim(profile.baseUrl)}`)
      }

      if (profile.authType) {
        console.log(`  ${ansis.green('Auth:')} ${profile.authType}`)
      }

      console.log('')
    }
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? 'Failed to list Claude Code profiles'
      : '列出 Claude Code 配置文件失败'))
    if (error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
  }
}

/**
 * List available Codex providers
 *
 * @param options - Command options
 */
async function listCodexProviders(_options: SwitchConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  try {
    const providers = await listCodexProvidersUtil()
    const existingConfig = readCodexConfig()
    const currentProvider = existingConfig?.modelProvider
    const isCommented = existingConfig?.modelProviderCommented

    if (!providers || providers.length === 0) {
      console.log(ansis.yellow(isZh
        ? 'No Codex providers available'
        : '没有可用的 Codex 供应商'))
      console.log('')
      return
    }

    console.log('')
    console.log(ansis.bold.cyan(isZh ? 'Codex API Providers' : 'Codex API 供应商'))
    console.log(ansis.dim('─'.repeat(60)))
    console.log('')

    // Display official login option
    const isOfficialMode = !currentProvider || isCommented
    console.log(`${isOfficialMode ? ansis.green('● ') : '  '}${ansis.bold('Official Login')}${isOfficialMode ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`)
    console.log(`  ${ansis.green('ID:')} official`)
    console.log(`  ${ansis.dim(isZh ? 'Use Codex official login' : '使用 Codex 官方登录')}`)
    console.log('')

    // Display providers
    for (const provider of providers) {
      const isCurrent = currentProvider === provider.id && !isCommented
      console.log(`${isCurrent ? ansis.green('● ') : '  '}${ansis.bold(provider.name)}${isCurrent ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`)
      console.log(`  ${ansis.green('ID:')} ${provider.id}`)
      console.log(`  ${ansis.green('URL:')} ${ansis.dim(provider.baseUrl)}`)

      if (provider.tempEnvKey) {
        console.log(`  ${ansis.green('Env:')} ${ansis.dim(provider.tempEnvKey)}`)
      }

      console.log('')
    }
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? 'Failed to list Codex providers'
      : '列出 Codex 供应商失败'))
    if (error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
  }
}

/**
 * Switch Claude Code profile
 *
 * @param target - Target profile ID or special value
 * @param options - Command options
 */
async function switchClaudeCodeProfile(target: string, _options: SwitchConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  try {
    let success = false
    let profileName = ''

    if (target === 'official') {
      // Switch to official login
      const result = await ClaudeCodeConfigManager.switchToOfficial()
      if (result.success) {
        success = true
        profileName = isZh ? 'Official Login' : '官方登录'
        // Clear API config
        const { clearApiConfig } = await import('../../config/unified/claude-config')
        clearApiConfig()
      }
      else {
        console.log(ansis.red(isZh
          ? `Failed to switch to official: ${result.error}`
          : `切换到官方登录失败: ${result.error}`))
      }
    }
    else if (target === 'ccr') {
      // Switch to CCR proxy
      const result = await ClaudeCodeConfigManager.switchToCcr()
      if (result.success) {
        success = true
        profileName = isZh ? 'CCR Proxy' : 'CCR 代理'
        // Apply CCR profile settings
        const profile = ClaudeCodeConfigManager.getProfileById('ccr-proxy')
        if (profile) {
          const { setApiConfig } = await import('../../config/unified/claude-config')
          setApiConfig({
            url: profile.baseUrl,
            authType: 'api_key',
          })
        }
      }
      else {
        console.log(ansis.red(isZh
          ? `Failed to switch to CCR: ${result.error}`
          : `切换到 CCR 失败: ${result.error}`))
      }
    }
    else {
      // Switch to custom profile
      const ccjkConfig = config.ccjk.read()
      if (!ccjkConfig?.tools?.claudeCode?.profiles) {
        console.log(ansis.yellow(isZh
          ? 'No custom profiles found'
          : '未找到自定义配置文件'))
        console.log(ansis.dim(isZh
          ? 'Use "ccjk config switch --list" to see available profiles'
          : '使用 "ccjk config switch --list" 查看可用配置文件'))
        console.log('')
        return
      }

      const profiles = ccjkConfig.tools.claudeCode.profiles
      let profile = profiles[target]

      // Try to find by name
      if (!profile) {
        for (const [id, p] of Object.entries(profiles)) {
          if (p.name === target) {
            profile = p
            target = id
            break
          }
        }
      }

      if (!profile) {
        console.log(ansis.red(isZh
          ? `Profile "${target}" not found`
          : `未找到配置文件 "${target}"`))
        console.log('')
        console.log(ansis.dim(isZh ? 'Available profiles:' : '可用配置文件:'))
        for (const [id, p] of Object.entries(profiles)) {
          console.log(`  - ${id} (${p.name || id})`)
        }
        console.log('')
        return
      }

      const result = await ClaudeCodeConfigManager.switchProfile(target)
      if (result.success) {
        success = true
        profileName = profile.name || target

        // Apply profile settings
        const { setApiConfig } = await import('../../config/unified/claude-config')
        setApiConfig({
          url: profile.baseUrl,
          authType: profile.authType as 'api_key' | 'auth_token',
        })
      }
      else {
        console.log(ansis.red(isZh
          ? `Failed to switch to profile: ${result.error}`
          : `切换到配置文件失败: ${result.error}`))
      }
    }

    if (success) {
      console.log('')
      console.log(ansis.green(isZh
        ? `Successfully switched to: ${profileName}`
        : `成功切换到: ${profileName}`))
      console.log('')
    }
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? 'Failed to switch profile'
      : '切换配置文件失败'))
    if (error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
  }
}

/**
 * Switch Codex provider
 *
 * @param target - Target provider ID or 'official'
 * @param options - Command options
 */
async function switchCodexProvider(target: string, _options: SwitchConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  try {
    let success = false
    let providerName = ''

    if (target === 'official') {
      success = await switchToOfficialLogin()
      providerName = isZh ? 'Official Login' : '官方登录'
    }
    else {
      success = await switchCodexProviderUtil(target)
      if (success) {
        const providers = await listCodexProvidersUtil()
        const provider = providers.find(p => p.id === target)
        providerName = provider?.name || target
      }
    }

    if (success) {
      console.log('')
      console.log(ansis.green(isZh
        ? `Successfully switched to: ${providerName}`
        : `成功切换到: ${providerName}`))
      console.log('')
    }
    else {
      console.log(ansis.red(isZh
        ? 'Failed to switch provider'
        : '切换供应商失败'))
    }
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? 'Failed to switch provider'
      : '切换供应商失败'))
    if (error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
  }
}

/**
 * Switch subcommand main handler
 *
 * @param target - Target profile or provider ID
 * @param options - Command options
 */
export async function switchCommand(target?: string, options: SwitchConfigOptions = {}): Promise<void> {
  // Initialize i18n if needed
  await ensureI18nInitialized()

  const isZh = i18n.language === 'zh-CN'

  // Resolve code type
  const codeType = resolveCodeType(options.codeType)

  // Handle --list flag
  if (options.list) {
    if (codeType === 'claude-code') {
      await listClaudeCodeProfiles(options)
    }
    else if (codeType === 'codex') {
      await listCodexProviders(options)
    }
    return
  }

  // Require target for switching
  if (!target) {
    console.log(ansis.yellow(isZh
      ? 'Please specify a target profile or use --list to see available options'
      : '请指定目标配置文件或使用 --list 查看可用选项'))
    console.log('')
    console.log(ansis.dim(isZh
      ? 'Usage: ccjk config switch <target>'
      : '用法: ccjk config switch <目标>'))
    console.log(ansis.dim(isZh
      ? '       ccjk config switch --list'
      : '       ccjk config switch --list'))
    console.log('')
    return
  }

  // Switch based on code type
  if (codeType === 'claude-code') {
    await switchClaudeCodeProfile(target, options)
  }
  else if (codeType === 'codex') {
    await switchCodexProvider(target, options)
  }
}
