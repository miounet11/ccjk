/**
 * 主菜单配置
 * API 配置管理作为核心卖点放在第一位置
 */
import type { MenuConfig, MenuGroup } from '../types'

/**
 * 核心功能组 - API 配置放在最前面
 */
const coreGroup: MenuGroup = {
  id: 'core',
  label: {
    'en': 'Core Features',
    'zh-CN': '核心功能',
  },
  icon: '⭐',
  priority: 'core',
  items: [
    {
      id: 'api-config',
      label: {
        'en': '🔑 API Configuration',
        'zh-CN': '🔑 API 配置管理',
      },
      description: {
        'en': 'One-click setup for AI providers (Anthropic, OpenAI, Azure, etc.)',
        'zh-CN': '一键配置 AI 服务提供商（Anthropic、OpenAI、Azure 等）',
      },
      shortcut: 'a',
      action: {
        type: 'command',
        handler: 'api-config',
      },
      priority: 'core',
    },
  ],
}

/**
 * 功能模块组
 */
const featuresGroup: MenuGroup = {
  id: 'features',
  label: {
    'en': 'Features',
    'zh-CN': '功能模块',
  },
  icon: '🛠️',
  priority: 'feature',
  items: [
    {
      id: 'skills',
      label: {
        'en': '📚 Skills Management',
        'zh-CN': '📚 Skills 管理',
      },
      description: {
        'en': 'Manage and configure AI skill templates',
        'zh-CN': '管理和配置 AI 技能模板',
      },
      shortcut: 's',
      action: {
        type: 'command',
        handler: 'skills',
      },
      priority: 'feature',
    },
    {
      id: 'mcp',
      label: {
        'en': '🔌 MCP Servers',
        'zh-CN': '🔌 MCP 服务器',
      },
      description: {
        'en': 'Configure Model Context Protocol servers',
        'zh-CN': '配置 Model Context Protocol 服务器',
      },
      shortcut: 'm',
      action: {
        type: 'command',
        handler: 'mcp',
      },
      priority: 'feature',
    },
    {
      id: 'session',
      label: {
        'en': '💾 Session Management',
        'zh-CN': '💾 Session 管理',
      },
      description: {
        'en': 'Manage session history and recovery',
        'zh-CN': '管理会话历史和恢复',
      },
      shortcut: 'e',
      action: {
        type: 'command',
        handler: 'session',
      },
      priority: 'feature',
    },
  ],
}

/**
 * 系统设置组
 */
const settingsGroup: MenuGroup = {
  id: 'settings',
  label: {
    'en': 'Settings',
    'zh-CN': '系统设置',
  },
  icon: '⚙️',
  priority: 'setting',
  items: [
    {
      id: 'settings',
      label: {
        'en': '⚙️ Settings',
        'zh-CN': '⚙️ 设置',
      },
      description: {
        'en': 'Configure CCJK global settings',
        'zh-CN': '配置 CCJK 全局设置',
      },
      shortcut: 't',
      action: {
        type: 'command',
        handler: 'settings',
      },
      priority: 'setting',
    },
  ],
}

/**
 * 帮助和退出
 */
const footerItems = [
  {
    id: 'help',
    label: {
      'en': '❓ Help',
      'zh-CN': '❓ 帮助',
    },
    description: {
      'en': 'View help information and documentation',
      'zh-CN': '查看帮助信息和文档',
    },
    shortcut: 'h',
    action: {
      type: 'command' as const,
      handler: 'help',
    },
    priority: 'help' as const,
  },
  {
    id: 'exit',
    label: {
      'en': '🚪 Exit',
      'zh-CN': '🚪 退出',
    },
    description: {
      'en': 'Exit CCJK menu',
      'zh-CN': '退出 CCJK 菜单',
    },
    shortcut: 'q',
    action: {
      type: 'command' as const,
      handler: 'exit',
    },
    priority: 'help' as const,
  },
]

/**
 * 主菜单配置
 */
export const mainMenuConfig: MenuConfig = {
  title: {
    'en': 'CCJK - Claude Code Chinese Enhanced',
    'zh-CN': 'CCJK - Claude Code 中文增强版',
  },
  groups: [coreGroup, featuresGroup, settingsGroup],
  footer: footerItems,
}

export default mainMenuConfig
