/**
 * CCJK 交互式菜单系统 - 菜单配置
 */

import type { MenuConfig, MenuGroup, MenuItem } from './types.js'

/**
 * API 配置管理菜单项（核心卖点）
 */
export const apiConfigMenu: MenuItem = {
  id: 'api-config',
  label: {
    'en': 'API Configuration',
    'zh-CN': 'API 配置管理',
  },
  description: {
    'en': 'One-click API setup, start using Claude',
    'zh-CN': '一键配置 API，开始使用 Claude',
  },
  icon: '🔑',
  shortcut: '1',
  priority: 'core',
  submenu: [
    {
      id: 'api-official',
      label: {
        'en': 'Use Official Login (No API needed)',
        'zh-CN': '使用官方登录（不配置 API）',
      },
      description: {
        'en': 'Recommended for new users',
        'zh-CN': '推荐新用户使用',
      },
      icon: '✨',
      shortcut: '1',
      action: { type: 'command', handler: 'api:official' },
    },
    {
      id: 'api-custom',
      label: {
        'en': 'Custom API Configuration',
        'zh-CN': '自定义 API 配置',
      },
      description: {
        'en': 'Configure API Key and URL',
        'zh-CN': '配置 API Key 和 URL',
      },
      icon: '⚙️',
      shortcut: '2',
      action: { type: 'command', handler: 'api:custom' },
    },
    {
      id: 'api-ccr',
      label: {
        'en': 'Use CCR Proxy',
        'zh-CN': '使用 CCR 代理',
      },
      description: {
        'en': 'Access API through proxy',
        'zh-CN': '通过代理访问 API',
      },
      icon: '🌐',
      shortcut: '3',
      action: { type: 'command', handler: 'api:ccr' },
    },
    {
      id: 'api-switch',
      label: {
        'en': 'Switch API Configuration',
        'zh-CN': '切换 API 配置',
      },
      description: {
        'en': 'Switch between configurations',
        'zh-CN': '在多个配置间切换',
      },
      icon: '🔄',
      shortcut: '4',
      action: { type: 'command', handler: 'api:switch' },
    },
    {
      id: 'api-status',
      label: {
        'en': 'View Current Configuration',
        'zh-CN': '查看当前配置',
      },
      description: {
        'en': 'Show current API settings',
        'zh-CN': '显示当前 API 设置',
      },
      icon: '📋',
      shortcut: '5',
      action: { type: 'command', handler: 'api:status' },
    },
    {
      id: 'api-skip',
      label: {
        'en': 'Skip API Configuration',
        'zh-CN': '跳过 API 配置',
      },
      description: {
        'en': 'Configure later',
        'zh-CN': '稍后配置',
      },
      icon: '⏭️',
      shortcut: '6',
      action: { type: 'function', handler: async () => {} },
    },
  ],
}

/**
 * 快速开始菜单组
 */
export const quickStartGroup: MenuGroup = {
  id: 'quick-start',
  label: {
    'en': 'Quick Start',
    'zh-CN': '快速开始',
  },
  icon: '🚀',
  priority: 'feature',
  items: [
    {
      id: 'init-project',
      label: {
        'en': 'Initialize Project',
        'zh-CN': '初始化项目',
      },
      description: {
        'en': 'Configure CCJK for current project',
        'zh-CN': '为当前项目配置 CCJK',
      },
      icon: '📦',
      action: { type: 'command', handler: 'ccjk:init' },
    },
    {
      id: 'install-skills',
      label: {
        'en': 'Install Skills',
        'zh-CN': '安装技能',
      },
      description: {
        'en': 'One-click install common skill packs',
        'zh-CN': '一键安装常用技能包',
      },
      icon: '🎯',
      action: { type: 'command', handler: 'ccjk:skills' },
    },
    {
      id: 'setup-mcp',
      label: {
        'en': 'Setup MCP Services',
        'zh-CN': '配置 MCP 服务',
      },
      description: {
        'en': 'Configure MCP service connections',
        'zh-CN': '设置 MCP 服务连接',
      },
      icon: '🔌',
      action: { type: 'command', handler: 'ccjk:mcp' },
    },
  ],
}

/**
 * 项目管理菜单组
 */
export const projectManagementGroup: MenuGroup = {
  id: 'project-management',
  label: {
    'en': 'Project Management',
    'zh-CN': '项目管理',
  },
  icon: '🛠️',
  priority: 'feature',
  items: [
    {
      id: 'skills-management',
      label: {
        'en': 'Skills Management',
        'zh-CN': 'Skills 技能管理',
      },
      description: {
        'en': 'Install, view, remove skills',
        'zh-CN': '安装、查看、删除技能',
      },
      icon: '🎯',
      action: { type: 'command', handler: 'ccjk:skills' },
    },
    {
      id: 'mcp-management',
      label: {
        'en': 'MCP Services',
        'zh-CN': 'MCP 服务管理',
      },
      description: {
        'en': 'Configure, test MCP services',
        'zh-CN': '配置、测试 MCP 服务',
      },
      icon: '🔌',
      action: { type: 'command', handler: 'ccjk:mcp' },
    },
    {
      id: 'agents-management',
      label: {
        'en': 'Agents Management',
        'zh-CN': 'Agents 代理管理',
      },
      description: {
        'en': 'Create, edit AI agents',
        'zh-CN': '创建、编辑 AI 代理',
      },
      icon: '🤖',
      action: { type: 'command', handler: 'ccjk:agents' },
    },
    {
      id: 'hooks-management',
      label: {
        'en': 'Hooks Management',
        'zh-CN': 'Hooks 钩子管理',
      },
      description: {
        'en': 'Configure Git hooks',
        'zh-CN': '配置 Git 钩子',
      },
      icon: '🪝',
      action: { type: 'command', handler: 'ccjk:hooks' },
    },
  ],
}

/**
 * 会话管理菜单组
 */
export const sessionManagementGroup: MenuGroup = {
  id: 'session-management',
  label: {
    'en': 'Session & Context',
    'zh-CN': '会话管理',
  },
  icon: '💬',
  priority: 'feature',
  items: [
    {
      id: 'session-create',
      label: {
        'en': 'Create New Session',
        'zh-CN': '创建新会话',
      },
      description: {
        'en': 'Start a new conversation session',
        'zh-CN': '开始新的对话会话',
      },
      icon: '➕',
      action: { type: 'command', handler: 'session:create' },
    },
    {
      id: 'session-restore',
      label: {
        'en': 'Restore Session',
        'zh-CN': '恢复会话',
      },
      description: {
        'en': 'Continue from history',
        'zh-CN': '从历史会话继续',
      },
      icon: '🔄',
      action: { type: 'command', handler: 'session:restore' },
    },
    {
      id: 'session-list',
      label: {
        'en': 'Session List',
        'zh-CN': '会话列表',
      },
      description: {
        'en': 'View all saved sessions',
        'zh-CN': '查看所有保存的会话',
      },
      icon: '📋',
      action: { type: 'command', handler: 'session:list' },
    },
    {
      id: 'context-management',
      label: {
        'en': 'Context Management',
        'zh-CN': '上下文管理',
      },
      description: {
        'en': 'Compact, clean context',
        'zh-CN': '压缩、清理上下文',
      },
      icon: '📊',
      action: { type: 'command', handler: 'context:manage' },
    },
    {
      id: 'session-export',
      label: {
        'en': 'Export Session',
        'zh-CN': '导出会话',
      },
      description: {
        'en': 'Export as Markdown',
        'zh-CN': '导出为 Markdown',
      },
      icon: '📤',
      action: { type: 'command', handler: 'session:export' },
    },
    {
      id: 'session-cleanup',
      label: {
        'en': 'Cleanup Cache',
        'zh-CN': '清理缓存',
      },
      description: {
        'en': 'Clean session cache data',
        'zh-CN': '清理会话缓存数据',
      },
      icon: '🧹',
      action: { type: 'command', handler: 'session:cleanup' },
    },
  ],
}

/**
 * 系统设置菜单组
 */
export const settingsGroup: MenuGroup = {
  id: 'settings',
  label: {
    'en': 'Settings',
    'zh-CN': '系统设置',
  },
  icon: '⚙️',
  priority: 'setting',
  items: [
    {
      id: 'language-setting',
      label: {
        'en': 'Language',
        'zh-CN': '语言设置',
      },
      description: {
        'en': 'Switch interface language',
        'zh-CN': '切换界面语言 (en/zh-CN)',
      },
      icon: '🌐',
      action: { type: 'command', handler: 'settings:language' },
    },
    {
      id: 'advanced-setting',
      label: {
        'en': 'Advanced Settings',
        'zh-CN': '高级设置',
      },
      description: {
        'en': 'Debug, logs, performance',
        'zh-CN': '调试、日志、性能',
      },
      icon: '🔧',
      action: { type: 'command', handler: 'settings:advanced' },
    },
    {
      id: 'reset-setting',
      label: {
        'en': 'Reset Settings',
        'zh-CN': '重置设置',
      },
      description: {
        'en': 'Restore default settings',
        'zh-CN': '恢复默认设置',
      },
      icon: '↩️',
      action: { type: 'command', handler: 'settings:reset' },
    },
  ],
}

/**
 * 帮助文档菜单组
 */
export const helpGroup: MenuGroup = {
  id: 'help',
  label: {
    'en': 'Help & Documentation',
    'zh-CN': '帮助文档',
  },
  icon: '📚',
  priority: 'help',
  items: [
    {
      id: 'command-reference',
      label: {
        'en': 'Command Reference',
        'zh-CN': '命令参考',
      },
      description: {
        'en': 'Detailed command documentation',
        'zh-CN': '所有命令的详细说明',
      },
      icon: '📖',
      action: { type: 'command', handler: 'help:commands' },
    },
    {
      id: 'quick-tutorial',
      label: {
        'en': 'Quick Tutorial',
        'zh-CN': '快速教程',
      },
      description: {
        'en': '5-minute getting started guide',
        'zh-CN': '5 分钟上手指南',
      },
      icon: '🎓',
      action: { type: 'command', handler: 'help:tutorial' },
    },
    {
      id: 'faq',
      label: {
        'en': 'FAQ',
        'zh-CN': '常见问题',
      },
      description: {
        'en': 'FAQ and troubleshooting',
        'zh-CN': 'FAQ 和故障排除',
      },
      icon: '❓',
      action: { type: 'command', handler: 'help:faq' },
    },
    {
      id: 'about',
      label: {
        'en': 'About CCJK',
        'zh-CN': '关于 CCJK',
      },
      description: {
        'en': 'Version info and credits',
        'zh-CN': '版本信息和致谢',
      },
      icon: 'ℹ️',
      action: { type: 'command', handler: 'help:about' },
    },
  ],
}

/**
 * 主菜单配置
 */
export const mainMenuConfig: MenuConfig = {
  title: {
    'en': 'CCJK - Claude Code JK',
    'zh-CN': 'CCJK - Claude Code JK',
  },
  groups: [
    // 核心功能组（API 配置在第一位）
    {
      id: 'core',
      label: {
        'en': 'Core Features',
        'zh-CN': '核心功能',
      },
      icon: '★',
      priority: 'core',
      items: [apiConfigMenu],
    },
    // 功能模块组
    quickStartGroup,
    projectManagementGroup,
    sessionManagementGroup,
    settingsGroup,
    helpGroup,
  ],
  footer: [
    {
      id: 'exit',
      label: {
        'en': 'Exit',
        'zh-CN': '退出',
      },
      icon: '🚪',
      shortcut: 'q',
      action: { type: 'function', handler: async () => process.exit(0) },
    },
  ],
}

/**
 * 获取本地化标签
 */
export function getLocalizedLabel(
  label: string | Record<string, string>,
  locale: string = 'zh-CN',
): string {
  if (typeof label === 'string') {
    return label
  }
  return label[locale] || label.en || Object.values(label)[0] || ''
}
