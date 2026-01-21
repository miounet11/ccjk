/**
 * Config Subcommand Main Entry Point
 *
 * Consolidated configuration command for CCJK v4.
 * Routes to appropriate subcommands: api, switch, list, get, set.
 *
 * Usage:
 *   ccjk config                           Show config help
 *   ccjk config api [provider] [key]       Configure API provider
 *   ccjk config switch <target>            Switch configuration profile
 *   ccjk config list                       List all configurations
 *   ccjk config get <key>                  Get configuration value
 *   ccjk config set <key> <value>          Set configuration value
 *
 * Global options:
 *   --lang, -l <zh-CN|en>     Display language
 *   --json, -j                Output as JSON
 *   --code-type, -T <type>    Code tool type (claude-code, codex)
 */

import type { SupportedLang } from '../../constants'
import type { ApiConfigOptions, BaseConfigOptions, GetConfigOptions, ListConfigOptions, SetConfigOptions, SwitchConfigOptions } from './types'

import ansis from 'ansis'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { apiCommand } from './api'
import { getCommand } from './get'
import { listCommand } from './list'
import { setCommand } from './set'
import { switchCommand } from './switch'

/**
 * Show config command help
 */
function showHelp(): void {
  const isZh = i18n.language === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? 'Config Commands' : '配置命令'))
  console.log('')
  console.log(`  ${ansis.green('ccjk config api [provider] [key]')}         ${isZh ? 'Configure API provider' : '配置 API 供应商'}`)
  console.log(`  ${ansis.green('ccjk config switch <target>')}             ${isZh ? 'Switch configuration profile' : '切换配置文件'}`)
  console.log(`  ${ansis.green('ccjk config list')}                        ${isZh ? 'List all configurations' : '列出所有配置'}`)
  console.log(`  ${ansis.green('ccjk config get <key>')}                   ${isZh ? 'Get configuration value' : '获取配置值'}`)
  console.log(`  ${ansis.green('ccjk config set <key> <value>')}           ${isZh ? 'Set configuration value' : '设置配置值'}`)
  console.log('')

  console.log(ansis.bold(isZh ? 'API Command Options:' : 'API 命令选项:'))
  console.log(`  ${ansis.green('--list')}                                 ${isZh ? 'List available providers' : '列出可用供应商'}`)
  console.log(`  ${ansis.green('--show')}                                 ${isZh ? 'Show current API configuration' : '显示当前 API 配置'}`)
  console.log(`  ${ansis.green('--code-type, -T <type>')}                 ${isZh ? 'Code tool type' : '代码工具类型'}`)
  console.log('')

  console.log(ansis.bold(isZh ? 'Switch Command Options:' : 'Switch 命令选项:'))
  console.log(`  ${ansis.green('--list')}                                 ${isZh ? 'List available profiles' : '列出可用配置文件'}`)
  console.log(`  ${ansis.green('--code-type, -T <type>')}                 ${isZh ? 'Code tool type' : '代码工具类型'}`)
  console.log('')

  console.log(ansis.bold(isZh ? 'List Command Options:' : 'List 命令选项:'))
  console.log(`  ${ansis.green('--scope <all|ccjk|claude|state>')}        ${isZh ? 'Configuration scope' : '配置作用域'}`)
  console.log(`  ${ansis.green('--verbose, -v')}                          ${isZh ? 'Show detailed information' : '显示详细信息'}`)
  console.log('')

  console.log(ansis.bold(isZh ? 'Get Command Options:' : 'Get 命令选项:'))
  console.log(`  ${ansis.green('--show-source')}                          ${isZh ? 'Show value source file' : '显示值来源文件'}`)
  console.log('')

  console.log(ansis.bold(isZh ? 'Set Command Options:' : 'Set 命令选项:'))
  console.log(`  ${ansis.green('--scope <ccjk|claude|state>')}            ${isZh ? 'Configuration scope' : '配置作用域'}`)
  console.log(`  ${ansis.green('--type <string|number|boolean|json>')}    ${isZh ? 'Value type' : '值类型'}`)
  console.log(`  ${ansis.green('--no-backup')}                            ${isZh ? 'Skip backup creation' : '跳过备份创建'}`)
  console.log('')

  console.log(ansis.bold(isZh ? 'Global Options:' : '全局选项:'))
  console.log(`  ${ansis.green('--lang, -l <zh-CN|en>')}                 ${isZh ? 'Display language' : '显示语言'}`)
  console.log(`  ${ansis.green('--json, -j')}                            ${isZh ? 'Output as JSON' : '以 JSON 格式输出'}`)
  console.log('')

  console.log(ansis.bold(isZh ? 'Examples:' : '示例:'))
  console.log(ansis.dim('  ccjk config api --list'))
  console.log(ansis.dim('  ccjk config api glm sk-...'))
  console.log(ansis.dim('  ccjk config switch --list'))
  console.log(ansis.dim('  ccjk config switch official'))
  console.log(ansis.dim('  ccjk config list'))
  console.log(ansis.dim('  ccjk config get general.preferredLang'))
  console.log(ansis.dim('  ccjk config set general.preferredLang zh-CN'))
  console.log(ansis.dim('  ccjk config set env.CUSTOM_VAR "value" --scope claude'))
  console.log('')
}

/**
 * Config command main handler
 *
 * Routes to appropriate subcommand based on arguments.
 *
 * @param args - Command arguments [subcommand, ...subargs]
 * @param options - Command options
 */
export async function configCommand(args: string[], options: BaseConfigOptions = {}): Promise<void> {
  // Initialize i18n if needed
  await ensureI18nInitialized()

  // No subcommand - show help
  if (args.length === 0) {
    showHelp()
    return
  }

  const [subcommand, ...subargs] = args

  // Route to appropriate subcommand
  switch (subcommand) {
    case 'api': {
      const apiOptions: ApiConfigOptions = {
        lang: options.lang,
        json: options.json,
      }
      await apiCommand(subargs, apiOptions)
      break
    }

    case 'switch': {
      const switchOptions: SwitchConfigOptions = {
        lang: options.lang,
        json: options.json,
      }
      // First arg may be a target, rest are options
      const target = subargs[0]
      await switchCommand(target, switchOptions)
      break
    }

    case 'list':
    case 'ls': {
      const listOptions: ListConfigOptions = {
        lang: options.lang,
        json: options.json,
      }
      await listCommand(listOptions)
      break
    }

    case 'get': {
      const key = subargs[0]
      const getOptions: GetConfigOptions = {
        lang: options.lang,
        json: options.json,
      }
      await getCommand(key, getOptions)
      break
    }

    case 'set': {
      const key = subargs[0]
      const value = subargs.slice(1).join(' ')
      const setOptions: SetConfigOptions = {
        lang: options.lang,
        json: options.json,
      }
      await setCommand(key, value, setOptions)
      break
    }

    default: {
      const isZh = i18n.language === 'zh-CN'
      console.log('')
      console.log(ansis.yellow(isZh
        ? `Unknown config subcommand: ${subcommand}`
        : `未知的配置子命令: ${subcommand}`))
      console.log('')
      showHelp()
    }
  }
}

/**
 * Legacy command handler for backward compatibility
 * @deprecated Use configCommand instead
 */
export async function handleConfigCommand(args: string[] = []): Promise<void> {
  return configCommand(args)
}

/**
 * Default export for command registry
 */
export default configCommand
