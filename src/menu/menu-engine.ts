/**
 * CCJK 交互式菜单系统 - 菜单引擎
 */

import type {
  MenuItem,
  MenuConfig,
  MenuState,
  MenuSelection,
  ProjectInfo,
  ApiStatus,
  MenuRenderOptions,
} from './types.js'
import { MenuRenderer } from './menu-renderer.js'
import { mainMenuConfig, getLocalizedLabel } from './menu-config.js'

/**
 * 菜单引擎类
 */
export class MenuEngine {
  private renderer: MenuRenderer
  private state: MenuState
  private config: MenuConfig
  private commandHandlers: Map<string, () => Promise<void> | void>

  constructor(options: MenuRenderOptions = {}) {
    this.renderer = new MenuRenderer(options)
    this.state = {
      currentPath: [],
      history: [],
      searchQuery: undefined,
      projectInfo: undefined,
      apiStatus: undefined,
    }
    this.config = mainMenuConfig
    this.commandHandlers = new Map()
  }

  /**
   * 注册命令处理器
   */
  registerHandler(command: string, handler: () => Promise<void> | void): void {
    this.commandHandlers.set(command, handler)
  }

  /**
   * 批量注册命令处理器
   */
  registerHandlers(handlers: Record<string, () => Promise<void> | void>): void {
    for (const [command, handler] of Object.entries(handlers)) {
      this.commandHandlers.set(command, handler)
    }
  }

  /**
   * 设置项目信息
   */
  setProjectInfo(info: ProjectInfo): void {
    this.state.projectInfo = info
  }

  /**
   * 设置 API 状态
   */
  setApiStatus(status: ApiStatus): void {
    this.state.apiStatus = status
  }

  /**
   * 刷新项目信息（按需分析）
   */
  async refreshProjectInfo(): Promise<void> {
    try {
      // 动态导入以避免循环依赖
      const { detectProjectInfo } = await import('./utils/project-detector.js')
      this.state.projectInfo = await detectProjectInfo()
    } catch {
      // 如果检测失败，使用默认值
      this.state.projectInfo = {
        name: 'Unknown',
        type: undefined,
        language: undefined,
      }
    }
  }

  /**
   * 刷新 API 状态
   */
  async refreshApiStatus(): Promise<void> {
    try {
      // 动态导入以避免循环依赖
      const { detectApiStatus } = await import('./adapters/api-adapter.js')
      this.state.apiStatus = await detectApiStatus()
    } catch {
      // 如果检测失败，使用默认值
      this.state.apiStatus = {
        configured: false,
        mode: 'none',
      }
    }
  }

  /**
   * 执行菜单动作
   */
  private async executeAction(item: MenuItem): Promise<boolean> {
    if (!item.action) return false

    const { type, handler } = item.action

    switch (type) {
      case 'command': {
        if (typeof handler === 'string') {
          const commandHandler = this.commandHandlers.get(handler)
          if (commandHandler) {
            await commandHandler()
            return true
          }
          console.log(`Command not found: ${handler}`)
          return false
        }
        return false
      }

      case 'function': {
        if (typeof handler === 'function') {
          await handler()
          return true
        }
        return false
      }

      case 'submenu': {
        // 子菜单由渲染器处理
        return true
      }

      case 'external': {
        if (typeof handler === 'string') {
          const { exec } = await import('node:child_process')
          exec(`open ${handler}`)
          return true
        }
        return false
      }

      default:
        return false
    }
  }

  /**
   * 处理菜单选择
   */
  private async handleSelection(selection: MenuSelection): Promise<'continue' | 'exit' | 'back'> {
    const { item, action } = selection

    switch (action) {
      case 'exit':
        return 'exit'

      case 'back':
        if (this.state.currentPath.length > 0) {
          this.state.currentPath.pop()
          this.state.history.pop()
        }
        return 'continue'

      case 'select': {
        // 如果有子菜单，进入子菜单
        if (item.submenu && item.submenu.length > 0) {
          const label = getLocalizedLabel(item.label, this.renderer.getLocale())
          this.state.currentPath.push(label)
          this.state.history.push(this.state.currentPath.slice())

          const subSelection = await this.renderer.renderSubmenu(
            item,
            this.state.currentPath
          )

          return this.handleSelection(subSelection)
        }

        // 执行动作
        await this.executeAction(item)
        return 'continue'
      }

      default:
        return 'continue'
    }
  }

  /**
   * 启动菜单
   */
  async start(): Promise<void> {
    let running = true

    while (running) {
      try {
        // 渲染主菜单
        const selection = await this.renderer.renderMainMenu(
          this.config,
          this.state.projectInfo,
          this.state.apiStatus
        )

        // 处理选择
        const result = await this.handleSelection(selection)

        if (result === 'exit') {
          running = false
        }
      } catch (error) {
        // 处理用户中断 (Ctrl+C)
        if ((error as any)?.isTtyError || (error as any)?.message?.includes('User force closed')) {
          running = false
        } else {
          console.error('Menu error:', error)
          running = false
        }
      }
    }
  }

  /**
   * 导航到指定菜单
   */
  async navigate(path: string[]): Promise<void> {
    this.state.currentPath = path
    this.state.history = [path.slice()]
  }

  /**
   * 返回上级
   */
  async back(): Promise<void> {
    if (this.state.currentPath.length > 0) {
      this.state.currentPath.pop()
      this.state.history.pop()
    }
  }

  /**
   * 退出菜单
   */
  exit(): void {
    process.exit(0)
  }

  /**
   * 获取当前状态
   */
  getState(): MenuState {
    return { ...this.state }
  }

  /**
   * 设置语言
   */
  setLocale(locale: string): void {
    this.renderer.setLocale(locale)
  }
}

/**
 * 创建菜单引擎实例
 */
export function createMenuEngine(options?: MenuRenderOptions): MenuEngine {
  return new MenuEngine(options)
}
