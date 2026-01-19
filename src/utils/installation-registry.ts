/**
 * Installation Source Registry System
 *
 * 🧠 最强大脑方案：声明式安装源注册表
 *
 * 设计理念：
 * 1. 所有安装源通过声明式配置定义，而非硬编码 if-else
 * 2. 新增安装源只需添加配置，无需修改检测逻辑
 * 3. 每个安装源定义自己的：路径模式、检测方法、更新命令
 * 4. 支持优先级排序，确保检测顺序正确
 *
 * 这样设计的好处：
 * - 新增安装方式只需添加一个配置对象
 * - 检测逻辑统一，不会遗漏
 * - 易于测试和维护
 * - 支持未来扩展（如 snap、flatpak 等）
 */

import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import process from 'node:process'

/**
 * Installation source type
 */
export type InstallationSourceType
  = | 'homebrew-cask' // macOS Homebrew cask
    | 'npm' // npm global install
    | 'npm-homebrew-node' // npm via Homebrew's Node.js
    | 'curl' // Official curl installer
    | 'snap' // Linux snap package (future)
    | 'flatpak' // Linux flatpak (future)
    | 'apt' // Debian/Ubuntu apt (future)
    | 'other' // Unknown source

/**
 * Installation source definition
 */
export interface InstallationSourceDefinition {
  /** Unique identifier */
  type: InstallationSourceType

  /** Human-readable name */
  name: string

  /** Priority for detection (higher = checked first) */
  priority: number

  /** Platforms this source applies to */
  platforms: Array<'macos' | 'linux' | 'windows'>

  /** Path patterns that indicate this source (regex or glob) */
  pathPatterns: RegExp[]

  /** Common installation paths to check */
  commonPaths: string[]

  /** Function to get update command */
  getUpdateCommand: () => { command: string, args: string[] }

  /** Whether this is the recommended installation method */
  isRecommended: boolean

  /** Description for users */
  description: string
}

/**
 * Get home directory with fallback
 */
function getHome(): string {
  return process.env.HOME || process.env.USERPROFILE || ''
}

/**
 * Installation Source Registry
 *
 * 所有支持的安装源定义在这里
 * 新增安装方式只需在这个数组中添加配置
 */
export const INSTALLATION_SOURCES: InstallationSourceDefinition[] = [
  // ==================== macOS Sources ====================
  {
    type: 'homebrew-cask',
    name: 'Homebrew Cask',
    priority: 100, // Highest priority on macOS
    platforms: ['macos'],
    pathPatterns: [
      /\/Caskroom\/claude-code\//,
      /\/opt\/homebrew\/Caskroom\//,
      /\/usr\/local\/Caskroom\//,
    ],
    commonPaths: [
      '/opt/homebrew/Caskroom/claude-code',
      '/usr/local/Caskroom/claude-code',
    ],
    getUpdateCommand: () => ({ command: 'brew', args: ['upgrade', '--cask', 'claude-code'] }),
    isRecommended: true,
    description: 'Official recommended installation method for macOS',
  },

  // ==================== Cross-platform Sources ====================
  {
    type: 'curl',
    name: 'Official Installer (curl)',
    priority: 90, // High priority - official method
    platforms: ['macos', 'linux'],
    pathPatterns: [
      // ~/.local/bin/claude (Linux/macOS curl default)
      new RegExp(`${getHome().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\.local/bin/claude`),
      // ~/.claude/bin/claude (alternative location)
      new RegExp(`${getHome().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\.claude/`),
      // Generic patterns
      /\.local\/bin\/claude$/,
      /\.claude\/bin\/claude$/,
      /\.claude\/local\/bin\/claude$/,
    ],
    commonPaths: [
      `${getHome()}/.local/bin/claude`,
      `${getHome()}/.claude/bin/claude`,
      `${getHome()}/.claude/local/bin/claude`,
    ],
    getUpdateCommand: () => ({
      command: 'sh',
      args: ['-c', 'curl -fsSL https://claude.ai/install.sh | sh'],
    }),
    isRecommended: true,
    description: 'Official curl installer from claude.ai',
  },

  {
    type: 'npm',
    name: 'npm Global',
    priority: 50, // Medium priority
    platforms: ['macos', 'linux', 'windows'],
    pathPatterns: [
      /\/node_modules\/@anthropic-ai\/claude-code/,
      /\/npm\//,
      /\/fnm_multishells\//,
      /\/\.nvm\//,
      /\/\.volta\//,
      /\/\.asdf\/installs\/nodejs\//,
      /\/\.nodenv\//,
      /\/\.n\/bin\//,
    ],
    commonPaths: [
      '/usr/local/bin/claude',
      '/usr/bin/claude',
      `${getHome()}/.npm-global/bin/claude`,
      // Node version manager paths
      `${getHome()}/.nvm/versions/node`,
      `${getHome()}/.fnm/node-versions`,
      `${getHome()}/.volta/bin/claude`,
      `${getHome()}/.asdf/shims/claude`,
    ],
    getUpdateCommand: () => ({ command: 'npm', args: ['update', '-g', '@anthropic-ai/claude-code'] }),
    isRecommended: false,
    description: 'npm global installation',
  },

  {
    type: 'npm-homebrew-node',
    name: 'npm via Homebrew Node',
    priority: 45, // Slightly lower than regular npm
    platforms: ['macos'],
    pathPatterns: [
      /\/Cellar\/node\//,
      /\/opt\/homebrew\/lib\/node_modules\//,
      /\/usr\/local\/lib\/node_modules\//,
    ],
    commonPaths: [
      '/opt/homebrew/Cellar/node',
      '/usr/local/Cellar/node',
      '/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code',
      '/usr/local/lib/node_modules/@anthropic-ai/claude-code',
    ],
    getUpdateCommand: () => ({ command: 'npm', args: ['update', '-g', '@anthropic-ai/claude-code'] }),
    isRecommended: false,
    description: 'npm installation via Homebrew-managed Node.js',
  },

  // ==================== Future Linux Sources ====================
  {
    type: 'snap',
    name: 'Snap Package',
    priority: 80,
    platforms: ['linux'],
    pathPatterns: [
      /\/snap\/claude-code\//,
      /\/snap\/bin\/claude/,
    ],
    commonPaths: [
      '/snap/bin/claude',
      '/snap/claude-code/current/bin/claude',
    ],
    getUpdateCommand: () => ({ command: 'snap', args: ['refresh', 'claude-code'] }),
    isRecommended: false,
    description: 'Snap package (future support)',
  },

  {
    type: 'flatpak',
    name: 'Flatpak',
    priority: 75,
    platforms: ['linux'],
    pathPatterns: [
      /\/flatpak\//,
      /com\.anthropic\.claude/,
    ],
    commonPaths: [
      `${getHome()}/.local/share/flatpak/exports/bin/com.anthropic.claude`,
      '/var/lib/flatpak/exports/bin/com.anthropic.claude',
    ],
    getUpdateCommand: () => ({ command: 'flatpak', args: ['update', 'com.anthropic.claude'] }),
    isRecommended: false,
    description: 'Flatpak package (future support)',
  },

  {
    type: 'apt',
    name: 'APT Package',
    priority: 85,
    platforms: ['linux'],
    pathPatterns: [
      /\/usr\/bin\/claude$/,
      /\/usr\/local\/bin\/claude$/,
    ],
    commonPaths: [
      '/usr/bin/claude',
      '/usr/local/bin/claude',
    ],
    getUpdateCommand: () => ({ command: 'apt', args: ['upgrade', 'claude-code'] }),
    isRecommended: false,
    description: 'APT package (future support)',
  },
]

/**
 * Detect installation source from a given path
 *
 * @param path - The path to check
 * @param platform - Current platform
 * @returns Matching installation source or null
 */
export function detectSourceFromPath(
  path: string,
  platform: 'macos' | 'linux' | 'windows',
): InstallationSourceDefinition | null {
  // Sort by priority (highest first)
  const sortedSources = [...INSTALLATION_SOURCES]
    .filter(s => s.platforms.includes(platform))
    .sort((a, b) => b.priority - a.priority)

  for (const source of sortedSources) {
    for (const pattern of source.pathPatterns) {
      if (pattern.test(path)) {
        return source
      }
    }
  }

  return null
}

/**
 * Get all common paths for a platform
 *
 * @param platform - Current platform
 * @returns Array of paths to check
 */
export function getCommonPathsForPlatform(
  platform: 'macos' | 'linux' | 'windows',
): string[] {
  const paths: string[] = []

  for (const source of INSTALLATION_SOURCES) {
    if (source.platforms.includes(platform)) {
      paths.push(...source.commonPaths)
    }
  }

  // Deduplicate and filter existing paths
  return [...new Set(paths)]
}

/**
 * Find installation by checking common paths
 *
 * @param platform - Current platform
 * @returns First found installation path and its source
 */
export function findInstallationByCommonPaths(
  platform: 'macos' | 'linux' | 'windows',
): { path: string, source: InstallationSourceDefinition } | null {
  // Sort sources by priority
  const sortedSources = [...INSTALLATION_SOURCES]
    .filter(s => s.platforms.includes(platform))
    .sort((a, b) => b.priority - a.priority)

  for (const source of sortedSources) {
    for (const commonPath of source.commonPaths) {
      // Handle directory paths (like Caskroom) - need to find actual binary
      if (nodeFs.existsSync(commonPath)) {
        const stats = nodeFs.statSync(commonPath)
        if (stats.isDirectory()) {
          // For directories, look for claude binary inside
          const possibleBinaries = findClaudeBinaryInDirectory(commonPath)
          if (possibleBinaries.length > 0) {
            return { path: possibleBinaries[0], source }
          }
        }
        else if (stats.isFile()) {
          return { path: commonPath, source }
        }
      }
    }
  }

  return null
}

/**
 * Find claude binary in a directory (recursive, max depth 3)
 */
function findClaudeBinaryInDirectory(dir: string, depth = 0): string[] {
  if (depth > 3)
    return []

  const results: string[] = []

  try {
    const entries = nodeFs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = nodePath.join(dir, entry.name)

      if (entry.isFile() && entry.name === 'claude') {
        results.push(fullPath)
      }
      else if (entry.isDirectory() && !entry.name.startsWith('.')) {
        results.push(...findClaudeBinaryInDirectory(fullPath, depth + 1))
      }
    }
  }
  catch {
    // Ignore permission errors
  }

  return results
}

/**
 * Get recommended installation source for a platform
 */
export function getRecommendedSource(
  platform: 'macos' | 'linux' | 'windows',
): InstallationSourceDefinition | null {
  return INSTALLATION_SOURCES
    .filter(s => s.platforms.includes(platform) && s.isRecommended)
    .sort((a, b) => b.priority - a.priority)[0] || null
}

/**
 * Get update command for a source type
 */
export function getUpdateCommandForSource(
  sourceType: InstallationSourceType,
): { command: string, args: string[] } | null {
  const source = INSTALLATION_SOURCES.find(s => s.type === sourceType)
  return source ? source.getUpdateCommand() : null
}

/**
 * Check if a source type is supported on a platform
 */
export function isSourceSupportedOnPlatform(
  sourceType: InstallationSourceType,
  platform: 'macos' | 'linux' | 'windows',
): boolean {
  const source = INSTALLATION_SOURCES.find(s => s.type === sourceType)
  return source ? source.platforms.includes(platform) : false
}

/**
 * Add a custom installation source (for plugins/extensions)
 *
 * This allows third-party tools to register their own installation sources
 */
export function registerCustomSource(source: InstallationSourceDefinition): void {
  // Check for duplicate
  const existingIndex = INSTALLATION_SOURCES.findIndex(s => s.type === source.type)
  if (existingIndex >= 0) {
    INSTALLATION_SOURCES[existingIndex] = source
  }
  else {
    INSTALLATION_SOURCES.push(source)
  }
}

/**
 * Get all sources for a platform, sorted by priority
 */
export function getSourcesForPlatform(
  platform: 'macos' | 'linux' | 'windows',
): InstallationSourceDefinition[] {
  return INSTALLATION_SOURCES
    .filter(s => s.platforms.includes(platform))
    .sort((a, b) => b.priority - a.priority)
}
