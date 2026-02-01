/**
 * CCJK 交互式菜单系统 - 类型定义
 */

import type { SupportedLang } from '../i18n/index.js'

// 使用 SupportedLang 作为 Locale 的别名
export type Locale = SupportedLang

/**
 * 菜单项优先级
 */
export type MenuPriority = 'core' | 'feature' | 'setting' | 'help'

/**
 * 菜单动作类型
 */
export type MenuActionType = 'command' | 'function' | 'submenu' | 'external'

/**
 * 菜单动作定义
 */
export interface MenuAction {
  type: MenuActionType
  handler: string | (() => Promise<void> | void)
  options?: Record<string, unknown>
}

/**
 * 菜单项定义
 */
export interface MenuItem {
  id: string
  label: string | Record<Locale, string>
  description?: string | Record<Locale, string>
  icon?: string
  shortcut?: string
  action?: MenuAction
  submenu?: MenuItem[]
  condition?: () => boolean | Promise<boolean>
  badge?: () => string | null | Promise<string | null>
  priority?: MenuPriority
  separator?: boolean
}

/**
 * 菜单分组
 */
export interface MenuGroup {
  id: string
  label: string | Record<Locale, string>
  icon?: string
  items: MenuItem[]
  priority?: MenuPriority
}

/**
 * 菜单配置
 */
export interface MenuConfig {
  title: string | Record<Locale, string>
  groups: MenuGroup[]
  footer?: MenuItem[]
}

/**
 * 菜单状态
 */
export interface MenuState {
  currentPath: string[]
  history: string[][]
  searchQuery?: string
  projectInfo?: ProjectInfo
  apiStatus?: ApiStatus
}

/**
 * 项目信息
 */
export interface ProjectInfo {
  name: string
  type?: string
  language?: string
  skillsCount?: number
  mcpCount?: number
  agentsCount?: number
}

/**
 * API 配置状态
 */
export interface ApiStatus {
  configured: boolean
  mode?: 'official' | 'custom' | 'ccr' | 'none'
  provider?: string
  baseUrl?: string
}

/**
 * 菜单渲染选项
 */
export interface MenuRenderOptions {
  showStatusBar?: boolean
  showBreadcrumb?: boolean
  showShortcuts?: boolean
  locale?: Locale
}

/**
 * 菜单选择结果
 */
export interface MenuSelection {
  item: MenuItem
  action: 'select' | 'back' | 'exit' | 'search' | 'help'
}

/**
 * 快捷键定义
 */
export interface Shortcut {
  key: string
  label: string
  action: () => void | Promise<void>
}
