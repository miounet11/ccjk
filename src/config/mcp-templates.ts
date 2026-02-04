/**
 * MCP Service Configuration Templates for CCJK v8.0.0
 *
 * Provides comprehensive MCP service definitions with:
 * - Language server integrations (TypeScript, Python, Go, Rust)
 * - Development tooling (ESLint, Prettier, Git)
 * - Testing frameworks (Playwright)
 * - Full bilingual support (en + zh-CN)
 * - Platform compatibility checks
 * - Installation and health check commands
 */

import type { McpServerConfig } from '../types/config'

/**
 * MCP Service Template interface
 * Defines the structure for MCP service configuration templates
 */
export interface McpServiceTemplate {
  /** Unique service identifier */
  id: string

  /** Service name in multiple languages */
  name: {
    'en': string
    'zh-CN': string
  }

  /** Service description in multiple languages */
  description: {
    'en': string
    'zh-CN': string
  }

  /** MCP server type */
  type: 'stdio' | 'sse'

  /** Command to execute the service */
  command: string

  /** Command line arguments */
  args: string[]

  /** Environment variables */
  env: Record<string, string>

  /** Project types this service is required for */
  requiredFor: string[]

  /** Project types this service is optional for */
  optionalFor: string[]

  /** Command to check if service is installed */
  installCheck: string

  /** Command to install the service */
  installCommand: string

  /** Service category for organization */
  category: 'language' | 'tooling' | 'testing' | 'git' | 'browser'

  /** Platform compatibility */
  platforms?: ('windows' | 'macos' | 'linux' | 'wsl' | 'termux')[]

  /** Whether GUI is required */
  requiresGui?: boolean

  /** Additional required system commands */
  requiredCommands?: string[]
}

/**
 * Comprehensive MCP Service Templates
 * 8+ service definitions covering major development needs
 */
export const mcpServiceTemplates: Record<string, McpServiceTemplate> = {
  // ============================================================================
  // Language Server Integrations
  // ============================================================================

  'typescript-language-server': {
    id: 'typescript-language-server',
    name: {
      'en': 'TypeScript Language Server',
      'zh-CN': 'TypeScript 语言服务器',
    },
    description: {
      'en': 'Provides TypeScript/JavaScript language support with IntelliSense, error checking, and refactoring',
      'zh-CN': '提供 TypeScript/JavaScript 语言支持，包括智能感知、错误检查和重构功能',
    },
    type: 'stdio',
    command: 'typescript-language-server',
    args: ['--stdio'],
    env: {},
    requiredFor: ['typescript', 'javascript', 'react', 'vue', 'angular', 'nextjs'],
    optionalFor: ['nodejs', 'web'],
    installCheck: 'typescript-language-server --version',
    installCommand: 'npm install -g typescript-language-server typescript',
    category: 'language',
    platforms: ['windows', 'macos', 'linux', 'wsl'],
    requiredCommands: ['node', 'npm'],
  },

  'python-lsp-server': {
    id: 'python-lsp-server',
    name: {
      'en': 'Python LSP Server',
      'zh-CN': 'Python LSP 服务器',
    },
    description: {
      'en': 'Python Language Server Protocol implementation with linting, formatting, and code completion',
      'zh-CN': 'Python 语言服务器协议实现，提供代码检查、格式化和自动补全功能',
    },
    type: 'stdio',
    command: 'pylsp',
    args: [],
    env: {},
    requiredFor: ['python', 'django', 'flask', 'fastapi'],
    optionalFor: ['data-science', 'machine-learning'],
    installCheck: 'pylsp --version',
    installCommand: 'pip install python-lsp-server[all]',
    category: 'language',
    platforms: ['windows', 'macos', 'linux', 'wsl'],
    requiredCommands: ['python', 'pip'],
  },

  'gopls': {
    id: 'gopls',
    name: {
      'en': 'Go Language Server',
      'zh-CN': 'Go 语言服务器',
    },
    description: {
      'en': 'Official Go language server providing code intelligence, navigation, and refactoring',
      'zh-CN': '官方 Go 语言服务器，提供代码智能、导航和重构功能',
    },
    type: 'stdio',
    command: 'gopls',
    args: [],
    env: {},
    requiredFor: ['go', 'golang'],
    optionalFor: ['microservices', 'backend'],
    installCheck: 'gopls version',
    installCommand: 'go install golang.org/x/tools/gopls@latest',
    category: 'language',
    platforms: ['windows', 'macos', 'linux', 'wsl'],
    requiredCommands: ['go'],
  },

  'rust-analyzer': {
    id: 'rust-analyzer',
    name: {
      'en': 'Rust Analyzer',
      'zh-CN': 'Rust 分析器',
    },
    description: {
      'en': 'Fast and feature-rich language server for Rust with real-time diagnostics and code assistance',
      'zh-CN': '快速且功能丰富的 Rust 语言服务器，提供实时诊断和代码辅助',
    },
    type: 'stdio',
    command: 'rust-analyzer',
    args: [],
    env: {},
    requiredFor: ['rust', 'cargo'],
    optionalFor: ['systems-programming', 'webassembly'],
    installCheck: 'rust-analyzer --version',
    installCommand: 'rustup component add rust-analyzer',
    category: 'language',
    platforms: ['windows', 'macos', 'linux', 'wsl'],
    requiredCommands: ['rustup', 'cargo'],
  },

  // ============================================================================
  // Development Tooling
  // ============================================================================

  'eslint-mcp': {
    id: 'eslint-mcp',
    name: {
      'en': 'ESLint MCP Server',
      'zh-CN': 'ESLint MCP 服务器',
    },
    description: {
      'en': 'JavaScript/TypeScript linting and code quality analysis through MCP protocol',
      'zh-CN': '通过 MCP 协议提供 JavaScript/TypeScript 代码检查和质量分析',
    },
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-eslint@latest'],
    env: {},
    requiredFor: [],
    optionalFor: ['javascript', 'typescript', 'react', 'vue', 'angular', 'nodejs'],
    installCheck: 'npx @modelcontextprotocol/server-eslint@latest --version',
    installCommand: 'npm install -g @modelcontextprotocol/server-eslint',
    category: 'tooling',
    platforms: ['windows', 'macos', 'linux', 'wsl'],
    requiredCommands: ['node', 'npm'],
  },

  'prettier-mcp': {
    id: 'prettier-mcp',
    name: {
      'en': 'Prettier MCP Server',
      'zh-CN': 'Prettier MCP 服务器',
    },
    description: {
      'en': 'Code formatting service for multiple languages through MCP protocol',
      'zh-CN': '通过 MCP 协议为多种语言提供代码格式化服务',
    },
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-prettier@latest'],
    env: {},
    requiredFor: [],
    optionalFor: ['javascript', 'typescript', 'html', 'css', 'json', 'markdown', 'yaml'],
    installCheck: 'npx @modelcontextprotocol/server-prettier@latest --version',
    installCommand: 'npm install -g @modelcontextprotocol/server-prettier',
    category: 'tooling',
    platforms: ['windows', 'macos', 'linux', 'wsl'],
    requiredCommands: ['node', 'npm'],
  },

  // ============================================================================
  // Git Integration
  // ============================================================================

  'git-mcp': {
    id: 'git-mcp',
    name: {
      'en': 'Git MCP Server',
      'zh-CN': 'Git MCP 服务器',
    },
    description: {
      'en': 'Git repository operations and version control through MCP protocol',
      'zh-CN': '通过 MCP 协议提供 Git 仓库操作和版本控制功能',
    },
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-git@latest'],
    env: {},
    requiredFor: [],
    optionalFor: ['all'],
    installCheck: 'npx @modelcontextprotocol/server-git@latest --version',
    installCommand: 'npm install -g @modelcontextprotocol/server-git',
    category: 'git',
    platforms: ['windows', 'macos', 'linux', 'wsl'],
    requiredCommands: ['git', 'node', 'npm'],
  },

  // ============================================================================
  // Testing Frameworks
  // ============================================================================

  'playwright-mcp': {
    id: 'playwright-mcp',
    name: {
      'en': 'Playwright MCP Server',
      'zh-CN': 'Playwright MCP 服务器',
    },
    description: {
      'en': 'End-to-end testing and browser automation through MCP protocol',
      'zh-CN': '通过 MCP 协议提供端到端测试和浏览器自动化功能',
    },
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@playwright/mcp-server@latest'],
    env: {},
    requiredFor: [],
    optionalFor: ['testing', 'e2e', 'web', 'automation'],
    installCheck: 'npx @playwright/mcp-server@latest --version',
    installCommand: 'npm install -g @playwright/mcp-server',
    category: 'testing',
    platforms: ['windows', 'macos', 'linux'],
    requiresGui: false, // Can run headless
    requiredCommands: ['node', 'npm'],
  },

  // ============================================================================
  // Browser Automation
  // ============================================================================

  'puppeteer-mcp': {
    id: 'puppeteer-mcp',
    name: {
      'en': 'Puppeteer MCP Server',
      'zh-CN': 'Puppeteer MCP 服务器',
    },
    description: {
      'en': 'Chrome/Chromium browser automation and web scraping through MCP protocol',
      'zh-CN': '通过 MCP 协议提供 Chrome/Chromium 浏览器自动化和网页抓取功能',
    },
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer@latest'],
    env: {},
    requiredFor: [],
    optionalFor: ['web-scraping', 'automation', 'testing'],
    installCheck: 'npx @modelcontextprotocol/server-puppeteer@latest --version',
    installCommand: 'npm install -g @modelcontextprotocol/server-puppeteer',
    category: 'browser',
    platforms: ['windows', 'macos', 'linux'],
    requiresGui: false, // Can run headless
    requiredCommands: ['node', 'npm'],
  },

  // ============================================================================
  // Additional Language Servers
  // ============================================================================

  'vscode-json-language-server': {
    id: 'vscode-json-language-server',
    name: {
      'en': 'JSON Language Server',
      'zh-CN': 'JSON 语言服务器',
    },
    description: {
      'en': 'JSON schema validation, completion, and formatting support',
      'zh-CN': '提供 JSON 模式验证、自动补全和格式化支持',
    },
    type: 'stdio',
    command: 'vscode-json-language-server',
    args: ['--stdio'],
    env: {},
    requiredFor: [],
    optionalFor: ['json', 'configuration', 'api'],
    installCheck: 'vscode-json-language-server --version',
    installCommand: 'npm install -g vscode-langservers-extracted',
    category: 'language',
    platforms: ['windows', 'macos', 'linux', 'wsl'],
    requiredCommands: ['node', 'npm'],
  },

  'yaml-language-server': {
    id: 'yaml-language-server',
    name: {
      'en': 'YAML Language Server',
      'zh-CN': 'YAML 语言服务器',
    },
    description: {
      'en': 'YAML schema validation, completion, and syntax highlighting',
      'zh-CN': '提供 YAML 模式验证、自动补全和语法高亮',
    },
    type: 'stdio',
    command: 'yaml-language-server',
    args: ['--stdio'],
    env: {},
    requiredFor: [],
    optionalFor: ['yaml', 'kubernetes', 'docker-compose', 'ci-cd'],
    installCheck: 'yaml-language-server --version',
    installCommand: 'npm install -g yaml-language-server',
    category: 'language',
    platforms: ['windows', 'macos', 'linux', 'wsl'],
    requiredCommands: ['node', 'npm'],
  },
}

/**
 * Get MCP service template by ID
 *
 * @param id - Service template ID
 * @returns Service template or undefined if not found
 */
export function getMcpServiceTemplate(id: string): McpServiceTemplate | undefined {
  return mcpServiceTemplates[id]
}

/**
 * Get all MCP service templates
 *
 * @returns Array of all service templates
 */
export function getAllMcpServiceTemplates(): McpServiceTemplate[] {
  return Object.values(mcpServiceTemplates)
}

/**
 * Get MCP service templates by category
 *
 * @param category - Service category to filter by
 * @returns Array of service templates in the specified category
 */
export function getMcpServiceTemplatesByCategory(
  category: McpServiceTemplate['category'],
): McpServiceTemplate[] {
  return Object.values(mcpServiceTemplates).filter(template => template.category === category)
}

/**
 * Get MCP service templates required for a project type
 *
 * @param projectType - Project type (e.g., 'typescript', 'python', 'react')
 * @returns Array of service templates required for the project type
 */
export function getRequiredMcpServiceTemplates(projectType: string): McpServiceTemplate[] {
  return Object.values(mcpServiceTemplates).filter(template =>
    template.requiredFor.includes(projectType),
  )
}

/**
 * Get MCP service templates optional for a project type
 *
 * @param projectType - Project type (e.g., 'typescript', 'python', 'react')
 * @returns Array of service templates optional for the project type
 */
export function getOptionalMcpServiceTemplates(projectType: string): McpServiceTemplate[] {
  return Object.values(mcpServiceTemplates).filter(template =>
    template.optionalFor.includes(projectType) || template.optionalFor.includes('all'),
  )
}

/**
 * Convert MCP service template to MCP server configuration
 *
 * @param template - Service template to convert
 * @returns MCP server configuration
 */
export function templateToMcpServerConfig(template: McpServiceTemplate): McpServerConfig {
  return {
    type: template.type,
    command: template.command,
    args: template.args,
    env: template.env,
  }
}

/**
 * Check if a service template is compatible with the current platform
 *
 * @param template - Service template to check
 * @param platform - Target platform (optional, auto-detected if not provided)
 * @returns True if compatible, false otherwise
 */
export function isTemplateCompatible(
  template: McpServiceTemplate,
  platform?: 'windows' | 'macos' | 'linux' | 'wsl' | 'termux',
): boolean {
  // If no platform restrictions, assume compatible
  if (!template.platforms || template.platforms.length === 0) {
    return true
  }

  // Auto-detect platform if not provided
  if (!platform) {
    const process = globalThis.process
    if (!process)
      return true // Browser environment, assume compatible

    const platformMap: Record<string, 'windows' | 'macos' | 'linux'> = {
      win32: 'windows',
      darwin: 'macos',
      linux: 'linux',
    }

    platform = platformMap[process.platform] || 'linux'

    // Check for WSL
    if (platform === 'linux' && process.env.WSL_DISTRO_NAME) {
      platform = 'wsl'
    }
  }

  return template.platforms.includes(platform)
}

/**
 * Get service templates compatible with current platform
 *
 * @param platform - Target platform (optional, auto-detected if not provided)
 * @returns Array of compatible service templates
 */
export function getCompatibleMcpServiceTemplates(
  platform?: 'windows' | 'macos' | 'linux' | 'wsl' | 'termux',
): McpServiceTemplate[] {
  return Object.values(mcpServiceTemplates).filter(template =>
    isTemplateCompatible(template, platform),
  )
}

/**
 * Service template categories with descriptions
 */
export const MCP_SERVICE_CATEGORIES = {
  language: {
    'en': 'Language Servers',
    'zh-CN': '语言服务器',
  },
  tooling: {
    'en': 'Development Tools',
    'zh-CN': '开发工具',
  },
  testing: {
    'en': 'Testing Frameworks',
    'zh-CN': '测试框架',
  },
  git: {
    'en': 'Version Control',
    'zh-CN': '版本控制',
  },
  browser: {
    'en': 'Browser Automation',
    'zh-CN': '浏览器自动化',
  },
} as const

/**
 * Common project types for service recommendations
 */
export const PROJECT_TYPES = [
  'typescript',
  'javascript',
  'python',
  'go',
  'rust',
  'react',
  'vue',
  'angular',
  'nodejs',
  'django',
  'flask',
  'fastapi',
  'nextjs',
  'testing',
  'e2e',
  'web',
  'api',
  'microservices',
  'backend',
  'frontend',
  'fullstack',
] as const

export type ProjectType = typeof PROJECT_TYPES[number]
