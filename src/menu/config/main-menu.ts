/**
 * 主菜单配置
 * API 配置管理作为核心卖点放在第一位置
 */
import type { MenuConfig, MenuItem } from '../types'

/**
 * 主菜单项定义
 */
const menuItems: MenuItem[] = [
  // 🔑 API 配置管理 - 核心卖点，放在第一位置
  {
    id: 'api-config',
    label: '🔑 API 配置管理',
    description: '一键配置 AI 服务提供商（Anthropic、OpenAI、Azure 等）',
    action: 'api-config',
    shortcut: 'a',
    category: 'core',
  },

  // 📚 Skills 管理
  {
    id: 'skills',
    label: '📚 Skills 管理',
    description: '管理和配置 AI 技能模板',
    action: 'skills',
    shortcut: 's',
    category: 'features',
  },

  // 🔌 MCP 服务器
  {
    id: 'mcp',
    label: '🔌 MCP 服务器',
    description: '配置 Model Context Protocol 服务器',
    action: 'mcp',
    shortcut: 'm',
    category: 'features',
  },

  // 💾 Session 管理
  {
    id: 'session',
    label: '💾 Session 管理',
    description: '管理会话历史和恢复',
    action: 'session',
    shortcut: 'e',
    category: 'features',
  },

  // ⚙️ 设置
  {
    id: 'settings',
    label: '⚙️ 设置',
    description: '配置 CCJK 全局设置',
    action: 'settings',
    shortcut: 't',
    category: 'system',
  },

  // ❓ 帮助
  {
    id: 'help',
    label: '❓ 帮助',
    description: '查看帮助信息和文档',
    action: 'help',
    shortcut: 'h',
    category: 'system',
  },

  // 🚪 退出
  {
    id: 'exit',
    label: '🚪 退出',
    description: '退出 CCJK 菜单',
    action: 'exit',
    shortcut: 'q',
    category: 'system',
  },
]

/**
 * 主菜单配置
 */
export const mainMenuConfig: MenuConfig = {
  title: 'CCJK - Claude Code 中文增强版',
  subtitle: '选择一个功能开始使用',
  items: menuItems,
  showShortcuts: true,
  showDescriptions: true,
}

export default mainMenuConfig
