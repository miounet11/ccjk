/**
 * 功能模块适配器
 *
 * 将现有的命令和功能模块适配到菜单系统
 */

// API 适配器
export {
  detectApiStatus,
  getApiStatusSummary,
  getApiConfigOptions,
  showApiConfigMenu,
  quickApiSetup,
  needsApiSetup,
  getRecommendedSetupMethod,
} from './api-adapter.js'

export type { ApiConfigOption } from './api-adapter.js'

/**
 * Skills 适配器
 */
export async function getInstalledSkills(): Promise<string[]> {
  try {
    const { checkSuperpowersInstalled, getSuperpowersSkills } = await import('../../utils/superpowers/index.js')
    const status = await checkSuperpowersInstalled()
    if (!status.installed) return []
    return await getSuperpowersSkills()
  } catch {
    return []
  }
}

export async function installSkill(skillName: string): Promise<boolean> {
  try {
    // TODO: 实现技能安装
    console.log(`Installing skill: ${skillName}`)
    return true
  } catch {
    return false
  }
}

/**
 * MCP 适配器
 */
export async function getInstalledMcpServers(): Promise<Array<{ name: string; enabled: boolean }>> {
  try {
    const { existsSync, readFileSync } = await import('node:fs')
    const { join } = await import('pathe')
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    const mcpConfigPath = join(homeDir, '.claude', 'mcp.json')

    if (!existsSync(mcpConfigPath)) return []

    const content = readFileSync(mcpConfigPath, 'utf-8')
    const config = JSON.parse(content)
    const servers = config.mcpServers || {}

    return Object.entries(servers).map(([name, serverConfig]: [string, any]) => ({
      name,
      enabled: serverConfig.enabled !== false,
    }))
  } catch {
    return []
  }
}

export async function searchMcpServers(query: string): Promise<Array<{ name: string; description: string }>> {
  try {
    const { mcpSearch } = await import('../../commands/mcp-market.js')
    // mcpSearch 直接打印结果，这里返回空数组
    await mcpSearch(query)
    return []
  } catch {
    return []
  }
}

/**
 * Agents 适配器
 */
export async function getInstalledAgents(): Promise<string[]> {
  try {
    const { existsSync, readdirSync } = await import('node:fs')
    const { join } = await import('pathe')
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    const agentsDir = join(homeDir, '.claude', 'agents')

    if (!existsSync(agentsDir)) return []

    return readdirSync(agentsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
  } catch {
    return []
  }
}

/**
 * Hooks 适配器
 */
export async function getInstalledHooks(): Promise<Array<{ name: string; type: string }>> {
  try {
    const { existsSync, readFileSync } = await import('node:fs')
    const { join } = await import('pathe')
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    const hooksConfigPath = join(homeDir, '.claude', 'hooks.json')

    if (!existsSync(hooksConfigPath)) return []

    const content = readFileSync(hooksConfigPath, 'utf-8')
    const config = JSON.parse(content)

    const hooks: Array<{ name: string; type: string }> = []

    for (const [type, hookList] of Object.entries(config)) {
      if (Array.isArray(hookList)) {
        hookList.forEach((hook: any) => {
          hooks.push({
            name: hook.name || hook.command || 'unnamed',
            type,
          })
        })
      }
    }

    return hooks
  } catch {
    return []
  }
}

/**
 * Session 适配器
 */
export async function getRecentSessions(): Promise<Array<{ id: string; name: string; date: string }>> {
  // TODO: 实现会话历史获取
  return []
}

export async function createSession(name?: string): Promise<string> {
  // TODO: 实现会话创建
  return `session-${Date.now()}`
}

export async function restoreSession(sessionId: string): Promise<boolean> {
  // TODO: 实现会话恢复
  return false
}

/**
 * Context 适配器
 */
export async function getContextFiles(): Promise<string[]> {
  try {
    const { existsSync, readdirSync } = await import('node:fs')
    const { join } = await import('pathe')
    const cwd = process.cwd()
    const claudeDir = join(cwd, '.claude')

    if (!existsSync(claudeDir)) return []

    return readdirSync(claudeDir)
      .filter(f => f.endsWith('.md') || f.endsWith('.txt'))
  } catch {
    return []
  }
}

/**
 * 诊断适配器
 */
export async function runDiagnostics(): Promise<{
  passed: number
  failed: number
  warnings: number
  details: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string }>
}> {
  const details: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string }> = []

  // 检查 API 配置
  const { detectApiStatus } = await import('./api-adapter.js')
  const apiStatus = await detectApiStatus()
  details.push({
    name: 'API Configuration',
    status: apiStatus.configured ? 'pass' : 'warn',
    message: apiStatus.configured ? 'API is configured' : 'API not configured',
  })

  // 检查 Claude 目录
  const { existsSync } = await import('node:fs')
  const { join } = await import('pathe')
  const homeDir = process.env.HOME || process.env.USERPROFILE || ''
  const claudeDir = join(homeDir, '.claude')
  details.push({
    name: 'Claude Directory',
    status: existsSync(claudeDir) ? 'pass' : 'warn',
    message: existsSync(claudeDir) ? 'Claude directory exists' : 'Claude directory not found',
  })

  // 检查 Node.js 版本
  const nodeVersion = process.version
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10)
  details.push({
    name: 'Node.js Version',
    status: majorVersion >= 18 ? 'pass' : 'fail',
    message: `Node.js ${nodeVersion} (requires >= 18)`,
  })

  const passed = details.filter(d => d.status === 'pass').length
  const failed = details.filter(d => d.status === 'fail').length
  const warnings = details.filter(d => d.status === 'warn').length

  return { passed, failed, warnings, details }
}

/**
 * 更新适配器
 */
export async function checkForUpdates(): Promise<{
  hasUpdates: boolean
  currentVersion: string
  latestVersion: string
}> {
  try {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('pathe')
    const pkgPath = join(process.cwd(), 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const version = pkg.version || 'unknown'
    // TODO: 实现版本检查
    return {
      hasUpdates: false,
      currentVersion: version,
      latestVersion: version,
    }
  } catch {
    return {
      hasUpdates: false,
      currentVersion: 'unknown',
      latestVersion: 'unknown',
    }
  }
}
