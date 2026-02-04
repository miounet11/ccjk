/**
 * CCJK 交互式菜单系统
 *
 * 提供用户友好的交互式菜单界面，整合 CCJK 的全部功能。
 *
 * 核心特性：
 * - 🔑 API 配置管理（核心卖点）- 一键配置 API
 * - 🚀 快速开始 - 初始化项目、安装技能
 * - 🛠️ 项目管理 - Skills、MCP、Agents、Hooks
 * - 💬 会话管理 - Session、Context 管理
 * - ⚙️ 系统设置 - 语言、主题、高级设置
 * - 📚 帮助文档 - 命令参考、教程、关于
 */

// 新菜单系统导出（CLI 入口）
export { runCli } from './cli.js'

export { mainMenuConfig as newMainMenuConfig } from './config/main-menu.js'

// 菜单配置导出
export {
  apiConfigMenu,
  getLocalizedLabel,
  helpGroup,
  mainMenuConfig,
  projectManagementGroup,
  quickStartGroup,
  sessionManagementGroup,
  settingsGroup,
} from './menu-config.js'

// 菜单引擎导出
export { createMenuEngine, MenuEngine } from './menu-engine.js'

// 菜单渲染器导出
export { createMenuRenderer, MenuRenderer } from './menu-renderer.js'
// 类型导出
export * from './types.js'

/**
 * 显示交互式菜单（新版本）
 */
export async function showMenu(): Promise<void> {
  const { runCli } = await import('./cli.js')
  await runCli()
}

/**
 * 快速启动交互式菜单
 *
 * @example
 * ```typescript
 * import { startMenu } from './menu'
 *
 * // 启动菜单
 * await startMenu()
 *
 * // 带选项启动
 * await startMenu({ locale: 'en' })
 * ```
 */
export async function startMenu(options: {
  locale?: string
  showStatusBar?: boolean
  showBreadcrumb?: boolean
  showShortcuts?: boolean
} = {}): Promise<void> {
  const { createMenuEngine } = await import('./menu-engine.js')

  const engine = createMenuEngine({
    locale: options.locale as any,
    showStatusBar: options.showStatusBar ?? true,
    showBreadcrumb: options.showBreadcrumb ?? true,
    showShortcuts: options.showShortcuts ?? true,
  })

  // 注册默认命令处理器
  await registerDefaultHandlers(engine)

  // 启动菜单
  await engine.start()
}

/**
 * 注册默认命令处理器
 */
async function registerDefaultHandlers(engine: import('./menu-engine.js').MenuEngine): Promise<void> {
  // API 配置相关
  engine.registerHandlers({
    'api:official': async () => {
      console.log('使用官方登录...')
      // TODO: 实现官方登录逻辑
    },
    'api:custom': async () => {
      const { runWizard } = await import('../commands/api.js')
      await runWizard()
    },
    'api:ccr': async () => {
      const { runCcrMenuFeature } = await import('../utils/tools.js')
      await runCcrMenuFeature()
    },
    'api:switch': async () => {
      const { configSwitchCommand } = await import('../commands/config-switch.js')
      await configSwitchCommand({ codeType: 'claude-code' })
    },
    'api:status': async () => {
      console.log('查看当前 API 配置...')
      // TODO: 显示当前配置状态
    },
  })

  // 快速开始相关
  engine.registerHandlers({
    'ccjk:init': async () => {
      const { init } = await import('../commands/init.js')
      await init({ skipBanner: true })
    },
    'ccjk:skills': async () => {
      // TODO: 实现技能管理
      console.log('技能管理...')
    },
    'ccjk:mcp': async () => {
      const { mcpHelp } = await import('../commands/mcp.js')
      mcpHelp()
    },
    'ccjk:agents': async () => {
      // TODO: 实现代理管理
      console.log('代理管理...')
    },
    'ccjk:hooks': async () => {
      const { hooksSync } = await import('../commands/hooks-sync.js')
      await hooksSync({})
    },
  })

  // 会话管理相关
  engine.registerHandlers({
    'session:create': async () => {
      console.log('创建新会话...')
    },
    'session:restore': async () => {
      console.log('恢复会话...')
    },
    'session:list': async () => {
      console.log('会话列表...')
    },
    'context:manage': async () => {
      const { showContextMenu } = await import('../commands/context-menu.js')
      await showContextMenu()
    },
    'session:export': async () => {
      console.log('导出会话...')
    },
    'session:cleanup': async () => {
      console.log('清理缓存...')
    },
  })

  // 设置相关
  engine.registerHandlers({
    'settings:language': async () => {
      const { changeScriptLanguageFeature } = await import('../utils/features.js')
      const { i18n } = await import('../i18n/index.js')
      await changeScriptLanguageFeature(i18n.language as any)
    },
    'settings:advanced': async () => {
      console.log('高级设置...')
    },
    'settings:reset': async () => {
      console.log('重置设置...')
    },
  })

  // 帮助相关
  engine.registerHandlers({
    'help:commands': async () => {
      console.log('命令参考...')
    },
    'help:tutorial': async () => {
      console.log('快速教程...')
    },
    'help:faq': async () => {
      console.log('常见问题...')
    },
    'help:about': async () => {
      // 版本号从 CLI 模块获取
      const VERSION = '1.0.0'
      console.log(`CCJK - Claude Code JK v${VERSION}`)
      console.log('https://github.com/anthropics/claude-code')
    },
  })
}
