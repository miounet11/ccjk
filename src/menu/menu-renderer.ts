/**
 * CCJK 交互式菜单系统 - 菜单渲染器
 */

import inquirer from 'inquirer'
import ansis from 'ansis'
import type {
  MenuItem,
  MenuGroup,
  MenuConfig,
  MenuRenderOptions,
  MenuSelection,
  ProjectInfo,
  ApiStatus,
} from './types.js'
import { getLocalizedLabel } from './menu-config.js'

/**
 * 菜单渲染器类
 */
export class MenuRenderer {
  private locale: string
  private showStatusBar: boolean
  private showBreadcrumb: boolean
  private showShortcuts: boolean

  constructor(options: MenuRenderOptions = {}) {
    this.locale = options.locale || 'zh-CN'
    this.showStatusBar = options.showStatusBar ?? true
    this.showBreadcrumb = options.showBreadcrumb ?? true
    this.showShortcuts = options.showShortcuts ?? true
  }

  /**
   * 渲染状态栏
   */
  renderStatusBar(projectInfo?: ProjectInfo, apiStatus?: ApiStatus): string {
    if (!this.showStatusBar) return ''

    const lines: string[] = []
    const width = 60
    const border = '─'.repeat(width - 2)

    lines.push(ansis.dim(`╭${border}╮`))

    // 项目信息行
    if (projectInfo) {
      const projectLine = [
        `Project: ${ansis.cyan(projectInfo.name || 'Unknown')}`,
        projectInfo.type ? `Type: ${ansis.yellow(projectInfo.type)}` : '',
        projectInfo.language ? `Lang: ${ansis.green(projectInfo.language)}` : '',
      ]
        .filter(Boolean)
        .join(' | ')
      lines.push(ansis.dim('│ ') + projectLine.padEnd(width - 4) + ansis.dim(' │'))
    }

    // API 状态行
    if (apiStatus) {
      const statusIcon = apiStatus.configured ? ansis.green('✓') : ansis.yellow('⚠')
      const statusText = apiStatus.configured
        ? `API: ${statusIcon} ${apiStatus.mode || 'configured'}`
        : `API: ${statusIcon} 未配置`
      lines.push(ansis.dim('│ ') + statusText.padEnd(width - 4) + ansis.dim(' │'))
    }

    lines.push(ansis.dim(`╰${border}╯`))

    return lines.join('\n') + '\n'
  }

  /**
   * 渲染面包屑导航
   */
  renderBreadcrumb(path: string[]): string {
    if (!this.showBreadcrumb || path.length === 0) return ''

    const breadcrumb = ['Home', ...path].join(' > ')
    return ansis.dim(`📍 ${breadcrumb}`) + '\n\n'
  }

  /**
   * 渲染菜单项
   */
  private formatMenuItem(item: MenuItem, index: number): string {
    const icon = item.icon || ''
    const label = getLocalizedLabel(item.label, this.locale)
    const description = item.description
      ? ansis.dim(getLocalizedLabel(item.description, this.locale))
      : ''
    const shortcut = item.shortcut ? `${item.shortcut}.` : `${index + 1}.`

    // 简约风格：图标 + 标签 + 描述
    const mainText = `${icon} ${label}`.trim()
    const padding = ' '.repeat(Math.max(1, 30 - mainText.length))

    return `${mainText}${padding}${description}`
  }

  /**
   * 渲染菜单组分隔符
   */
  private renderGroupSeparator(group: MenuGroup): string {
    const label = getLocalizedLabel(group.label, this.locale)
    const icon = group.icon || '◆'
    const separator = '─'.repeat(50)

    if (group.priority === 'core') {
      return `\n  ${ansis.bold('★')} ${ansis.bold(label)} ${ansis.dim(separator)}`
    }

    return `\n  ${icon} ${label} ${ansis.dim(separator)}`
  }

  /**
   * 渲染主菜单
   */
  async renderMainMenu(
    config: MenuConfig,
    projectInfo?: ProjectInfo,
    apiStatus?: ApiStatus
  ): Promise<MenuSelection> {
    // 清屏
    console.clear()

    // 渲染状态栏
    console.log(this.renderStatusBar(projectInfo, apiStatus))

    // 构建选择列表
    const choices: Array<{
      name: string
      value: MenuItem
      short: string
    }> = []

    // 添加分组和菜单项
    for (const group of config.groups) {
      // 添加分组分隔符
      choices.push(new inquirer.Separator(this.renderGroupSeparator(group)) as any)

      // 添加菜单项
      for (let i = 0; i < group.items.length; i++) {
        const item = group.items[i]

        // 检查条件
        if (item.condition) {
          const visible = await item.condition()
          if (!visible) continue
        }

        choices.push({
          name: this.formatMenuItem(item, i),
          value: item,
          short: getLocalizedLabel(item.label, this.locale),
        })
      }
    }

    // 添加底部分隔符
    choices.push(new inquirer.Separator(ansis.dim('\n  ' + '─'.repeat(55))) as any)

    // 添加底部菜单项
    if (config.footer) {
      for (const item of config.footer) {
        choices.push({
          name: this.formatMenuItem(item, 0),
          value: item,
          short: getLocalizedLabel(item.label, this.locale),
        })
      }
    }

    // 添加快捷键提示
    if (this.showShortcuts) {
      const shortcuts = ansis.dim('  q. 退出    h. 帮助    /. 搜索')
      choices.push(new inquirer.Separator(shortcuts) as any)
    }

    // 显示菜单
    const { selection } = await inquirer.prompt<{ selection: MenuItem }>([
      {
        type: 'list',
        name: 'selection',
        message: this.locale === 'zh-CN' ? '请选择操作:' : 'Select an action:',
        choices,
        pageSize: 20,
        loop: false,
      },
    ])

    return {
      item: selection,
      action: 'select',
    }
  }

  /**
   * 渲染子菜单
   */
  async renderSubmenu(
    item: MenuItem,
    breadcrumb: string[]
  ): Promise<MenuSelection> {
    if (!item.submenu || item.submenu.length === 0) {
      return { item, action: 'select' }
    }

    // 清屏
    console.clear()

    // 渲染面包屑
    console.log(this.renderBreadcrumb(breadcrumb))

    // 渲染子菜单标题
    const title = getLocalizedLabel(item.label, this.locale)
    const description = item.description
      ? getLocalizedLabel(item.description, this.locale)
      : ''
    console.log(`${item.icon || ''} ${ansis.bold(title)}`)
    if (description) {
      console.log(ansis.dim(description))
    }
    console.log('')

    // 构建子菜单选择列表
    const choices: Array<{
      name: string
      value: MenuItem | 'back'
      short: string
    }> = []

    // 添加子菜单项
    for (let i = 0; i < item.submenu.length; i++) {
      const subItem = item.submenu[i]

      // 检查条件
      if (subItem.condition) {
        const visible = await subItem.condition()
        if (!visible) continue
      }

      choices.push({
        name: this.formatMenuItem(subItem, i),
        value: subItem,
        short: getLocalizedLabel(subItem.label, this.locale),
      })
    }

    // 添加返回选项
    choices.push(new inquirer.Separator(ansis.dim('\n  ' + '─'.repeat(55))) as any)
    choices.push({
      name: `${ansis.dim('←')} ${this.locale === 'zh-CN' ? '返回主菜单' : 'Back to main menu'}`,
      value: 'back',
      short: 'Back',
    })

    // 显示子菜单
    const { selection } = await inquirer.prompt<{ selection: MenuItem | 'back' }>([
      {
        type: 'list',
        name: 'selection',
        message: this.locale === 'zh-CN' ? '请选择:' : 'Select:',
        choices,
        pageSize: 15,
        loop: false,
      },
    ])

    if (selection === 'back') {
      return { item, action: 'back' }
    }

    return {
      item: selection,
      action: 'select',
    }
  }

  /**
   * 设置语言
   */
  setLocale(locale: string): void {
    this.locale = locale
  }

  /**
   * 获取当前语言
   */
  getLocale(): string {
    return this.locale
  }
}

/**
 * 创建菜单渲染器实例
 */
export function createMenuRenderer(options?: MenuRenderOptions): MenuRenderer {
  return new MenuRenderer(options)
}