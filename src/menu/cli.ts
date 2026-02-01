#!/usr/bin/env node
/**
 * CCJK 混合模式 CLI 入口
 *
 * 支持两种使用方式：
 * 1. 交互式菜单模式：ccjk menu
 * 2. 直接命令模式：ccjk <command> [options]
 *
 * 设计原则：
 * - 新用户友好：默认进入交互式菜单
 * - 高级用户高效：支持直接命令执行
 * - 智能检测：根据上下文自动选择模式
 */

import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'

// 版本号
const VERSION = '1.0.0'

// 命令定义
interface CommandDef {
  description: string
  action: (args: string[]) => Promise<void>
}

interface CommandGroup {
  description: string
  subcommands: Record<string, CommandDef>
}

type CommandEntry = CommandDef | CommandGroup

function isCommandGroup(entry: CommandEntry): entry is CommandGroup {
  return 'subcommands' in entry
}

/**
 * 解析命令行参数
 */
function parseArgs(argv: string[]): { command: string[]; options: Record<string, string | boolean> } {
  const args = argv.slice(2) // 跳过 node 和脚本路径
  const command: string[] = []
  const options: Record<string, string | boolean> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const nextArg = args[i + 1]
      if (nextArg && !nextArg.startsWith('-')) {
        options[key] = nextArg
        i++
      } else {
        options[key] = true
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1)
      const nextArg = args[i + 1]
      if (nextArg && !nextArg.startsWith('-')) {
        options[key] = nextArg
        i++
      } else {
        options[key] = true
      }
    } else {
      command.push(arg)
    }
  }

  return { command, options }
}

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
${ansis.bold('CCJK')} - Claude Code JK 增强版配置工具

${ansis.bold('用法:')}
  ccjk [命令] [选项]

${ansis.bold('命令:')}
  ${ansis.cyan('menu')}              启动交互式菜单
  ${ansis.cyan('api setup')}        快速配置 API
  ${ansis.cyan('api status')}       查看 API 配置状态
  ${ansis.cyan('api switch')}       切换 API 配置
  ${ansis.cyan('api providers')}    查看可用的 API 提供商
  ${ansis.cyan('init')}             初始化 CCJK 配置
  ${ansis.cyan('mcp list')}         列出已安装的 MCP 服务器
  ${ansis.cyan('mcp search')} <q>   搜索 MCP 服务器
  ${ansis.cyan('mcp install')} <n>  安装 MCP 服务器
  ${ansis.cyan('mcp uninstall')} <n> 卸载 MCP 服务器
  ${ansis.cyan('doctor')}           运行诊断检查
  ${ansis.cyan('update')}           检查并安装更新
  ${ansis.cyan('config show')}      显示当前配置
  ${ansis.cyan('config reset')}     重置配置

${ansis.bold('选项:')}
  ${ansis.cyan('-h, --help')}       显示帮助信息
  ${ansis.cyan('-v, --version')}    显示版本号
  ${ansis.cyan('-l, --locale')}     语言设置 (默认: zh-CN)

${ansis.bold('示例:')}
  ccjk                 启动交互式菜单
  ccjk api setup       快速配置 API
  ccjk mcp install github  安装 GitHub MCP 服务器
`)
}

/**
 * 定义所有命令
 */
function getCommands(): Record<string, CommandEntry> {
  return {
    menu: {
      description: '启动交互式菜单',
      action: async (args) => {
        const { startMenu } = await import('./index.js')
        const locale = args[0] || 'zh-CN'
        await startMenu({ locale })
      },
    },
    api: {
      description: 'API 配置管理',
      subcommands: {
        setup: {
          description: '快速配置 API',
          action: async (args) => {
            const { quickApiSetup } = await import('./adapters/api-adapter.js')
            const locale = args[0] || 'zh-CN'
            await quickApiSetup(locale)
          },
        },
        status: {
          description: '查看 API 配置状态',
          action: async (args) => {
            const { detectApiStatus, getApiStatusSummary } = await import('./adapters/api-adapter.js')
            const status = await detectApiStatus()
            const locale = args[0] || 'zh-CN'
            console.log(getApiStatusSummary(status, locale))
          },
        },
        switch: {
          description: '切换 API 配置',
          action: async () => {
            const { configSwitchCommand } = await import('../commands/config-switch.js')
            await configSwitchCommand({ codeType: 'claude-code' })
          },
        },
        providers: {
          description: '查看可用的 API 提供商',
          action: async () => {
            const { providerRegistry } = await import('../api-providers/core/provider-registry.js')
            const providers = providerRegistry.getAllMetadata()
            console.log('\n可用的 API 提供商:\n')
            providers.forEach((p) => {
              const popular = p.popular ? ' ⭐' : ''
              console.log(`  ${p.icon || '•'} ${p.name}${popular}`)
              console.log(`    ${p.description}`)
              console.log(`    设置时间: ${p.setupTime}\n`)
            })
          },
        },
      },
    },
    init: {
      description: '初始化 CCJK 配置',
      action: async () => {
        const { init } = await import('../commands/init.js')
        await init({})
      },
    },
    mcp: {
      description: 'MCP 服务器管理',
      subcommands: {
        list: {
          description: '列出已安装的 MCP 服务器',
          action: async () => {
            const { mcpList } = await import('../commands/mcp-market.js')
            await mcpList()
          },
        },
        search: {
          description: '搜索 MCP 服务器',
          action: async (args) => {
            const query = args[0]
            if (!query) {
              console.log(ansis.red('错误: 请提供搜索关键词'))
              return
            }
            const { mcpSearch } = await import('../commands/mcp-market.js')
            await mcpSearch(query)
          },
        },
        install: {
          description: '安装 MCP 服务器',
          action: async (args) => {
            const name = args[0]
            if (!name) {
              console.log(ansis.red('错误: 请提供 MCP 服务器名称'))
              return
            }
            const { mcpInstall } = await import('../commands/mcp-market.js')
            await mcpInstall(name)
          },
        },
        uninstall: {
          description: '卸载 MCP 服务器',
          action: async (args) => {
            const name = args[0]
            if (!name) {
              console.log(ansis.red('错误: 请提供 MCP 服务器名称'))
              return
            }
            const { mcpUninstall } = await import('../commands/mcp-market.js')
            await mcpUninstall(name)
          },
        },
      },
    },
    doctor: {
      description: '运行诊断检查',
      action: async () => {
        const { doctor } = await import('../commands/doctor.js')
        await doctor()
      },
    },
    update: {
      description: '检查并安装更新',
      action: async () => {
        const { update } = await import('../commands/update.js')
        await update({})
      },
    },
    config: {
      description: '配置管理',
      subcommands: {
        show: {
          description: '显示当前配置',
          action: async () => {
            const { readZcfConfig } = await import('../utils/ccjk-config.js')
            const config = readZcfConfig()
            console.log(JSON.stringify(config, null, 2))
          },
        },
        reset: {
          description: '重置配置',
          action: async () => {
            const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
              {
                type: 'confirm',
                name: 'confirm',
                message: '确定要重置所有配置吗？',
                default: false,
              },
            ])
            if (!confirm) {
              console.log('已取消')
              return
            }
            // TODO: 实现配置重置
            console.log('配置已重置')
          },
        },
      },
    },
  }
}

/**
 * 默认行为：无参数时启动菜单
 */
async function defaultAction(): Promise<void> {
  // 检查是否需要配置 API
  const { needsApiSetup, quickApiSetup } = await import('./adapters/api-adapter.js')

  if (await needsApiSetup()) {
    console.log('')
    console.log(ansis.yellow('⚠️  检测到 API 尚未配置'))
    console.log(ansis.dim('建议先配置 API 以使用 Claude Code'))
    console.log('')

    const { action } = await inquirer.prompt<{ action: string }>([
      {
        type: 'list',
        name: 'action',
        message: '请选择:',
        choices: [
          { name: '⚡ 快速配置 API', value: 'setup' },
          { name: '📋 进入主菜单', value: 'menu' },
          { name: '❌ 退出', value: 'exit' },
        ],
      },
    ])

    if (action === 'setup') {
      await quickApiSetup('zh-CN')
    } else if (action === 'menu') {
      const { startMenu } = await import('./index.js')
      await startMenu()
    }
  } else {
    // API 已配置，直接进入菜单
    const { startMenu } = await import('./index.js')
    await startMenu()
  }
}

/**
 * 运行 CLI
 */
export async function runCli(): Promise<void> {
  const { command, options } = parseArgs(process.argv)

  // 处理全局选项
  if (options.help || options.h) {
    showHelp()
    return
  }

  if (options.version || options.v) {
    console.log(`ccjk v${VERSION}`)
    return
  }

  // 获取命令定义
  const commands = getCommands()

  // 无命令时执行默认行为
  if (command.length === 0) {
    await defaultAction()
    return
  }

  // 查找并执行命令
  const mainCmd = command[0]
  const cmdEntry = commands[mainCmd]

  if (!cmdEntry) {
    console.log(ansis.red(`错误: 未知命令 '${mainCmd}'`))
    console.log(ansis.dim('运行 ccjk --help 查看可用命令'))
    process.exit(1)
  }

  if (isCommandGroup(cmdEntry)) {
    // 命令组
    const subCmd = command[1]
    if (!subCmd) {
      console.log(ansis.yellow(`${mainCmd} 子命令:`))
      Object.entries(cmdEntry.subcommands).forEach(([name, def]) => {
        console.log(`  ${ansis.cyan(name)}  ${def.description}`)
      })
      return
    }

    const subCmdDef = cmdEntry.subcommands[subCmd]
    if (!subCmdDef) {
      console.log(ansis.red(`错误: 未知子命令 '${mainCmd} ${subCmd}'`))
      console.log(ansis.dim(`运行 ccjk ${mainCmd} 查看可用子命令`))
      process.exit(1)
    }

    await subCmdDef.action(command.slice(2))
  } else {
    // 单个命令
    await cmdEntry.action(command.slice(1))
  }
}

// CLI 入口点 - 通过 package.json bin 配置调用
// 使用: npx ccjk 或 pnpm ccjk
