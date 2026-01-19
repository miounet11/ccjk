/**
 * Context Manager Adapter for CLI Commands
 *
 * 为 CLI 命令提供统一的上下文管理接口
 * 底层使用 context/context-manager.ts 的实现
 */

import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { ContextManager as BaseContextManager, ContextAnalyzer } from '../../context/context-manager'

// ============================================================================
// Types
// ============================================================================

export interface ContextStatus {
  sessionId: string | null
  startTime: number | null
  duration: string | null
  totalTokens: number
  compressedTokens: number
  compressionRatio: number | null
  tokensSaved: number
  autoCompress: boolean
  threshold: number
  lastCompressed: number | null
  compressionsToday: number
  storagePath: string
  cacheSize: string
  model: string
}

export interface CompressResult {
  originalTokens: number
  compressedTokens: number
  duration: number
}

export interface HistoryEntry {
  id: string
  timestamp: number
  originalTokens: number
  compressedTokens: number
  sessionId: string
}

export interface ContextConfig {
  autoCompress: boolean
  threshold: number
  model: string
  maxHistory: number
  retentionDays: number
}

// ============================================================================
// Context Manager Adapter
// ============================================================================

class ContextManagerAdapter {
  private baseManager: BaseContextManager
  private configPath: string
  private historyPath: string
  private config: ContextConfig

  constructor() {
    this.baseManager = new BaseContextManager()
    const ccjkDir = path.join(os.homedir(), '.ccjk')
    const contextDir = path.join(ccjkDir, 'context-compression')

    // 确保目录存在
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true })
    }

    this.configPath = path.join(contextDir, 'config.json')
    this.historyPath = path.join(contextDir, 'history.json')

    // 加载或创建配置
    this.config = this.loadConfig()
  }

  /**
   * 加载配置
   */
  private loadConfig(): ContextConfig {
    const defaultConfig: ContextConfig = {
      autoCompress: true,
      threshold: 50000,
      model: 'haiku',
      maxHistory: 100,
      retentionDays: 30,
    }

    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8')
        return { ...defaultConfig, ...JSON.parse(content) }
      }
      catch {
        return defaultConfig
      }
    }

    // 保存默认配置
    fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2))
    return defaultConfig
  }

  /**
   * 获取当前状态
   */
  async getStatus(): Promise<ContextStatus> {
    const sessions = this.baseManager.getProjectSessions()
    const currentSession = sessions[sessions.length - 1]

    let totalTokens = 0
    const compressedTokens = 0
    let sessionId: string | null = null
    let startTime: number | null = null

    if (currentSession) {
      sessionId = path.basename(currentSession, '.jsonl')
      const status = this.baseManager.getSessionStatus(currentSession)
      totalTokens = status.tokenEstimate

      // 获取文件创建时间
      try {
        const stats = fs.statSync(currentSession)
        startTime = stats.birthtimeMs
      }
      catch {
        // ignore
      }
    }

    // 计算压缩统计
    const history = await this.getHistory()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const compressionsToday = history.filter(h => h.timestamp >= todayStart.getTime()).length

    const lastEntry = history[history.length - 1]
    const lastCompressed = lastEntry?.timestamp || null

    // 计算总压缩量
    const totalSaved = history.reduce((sum, h) => sum + (h.originalTokens - h.compressedTokens), 0)

    return {
      sessionId,
      startTime,
      duration: startTime ? this.formatDuration(Date.now() - startTime) : null,
      totalTokens,
      compressedTokens,
      compressionRatio: totalTokens > 0 ? compressedTokens / totalTokens : null,
      tokensSaved: totalSaved,
      autoCompress: this.config.autoCompress,
      threshold: this.config.threshold,
      lastCompressed,
      compressionsToday,
      storagePath: path.dirname(this.configPath),
      cacheSize: this.getCacheSize(),
      model: this.config.model,
    }
  }

  /**
   * 压缩上下文
   */
  async compress(sessionId?: string): Promise<CompressResult> {
    const startTime = Date.now()
    const sessions = this.baseManager.getProjectSessions()

    let targetSession: string | undefined
    if (sessionId) {
      targetSession = sessions.find(s => path.basename(s, '.jsonl').includes(sessionId))
    }
    else {
      targetSession = sessions[sessions.length - 1]
    }

    if (!targetSession) {
      throw new Error('No session found to compress')
    }

    const beforeStatus = this.baseManager.getSessionStatus(targetSession)
    await this.baseManager.compact(targetSession, {
      keepLastN: 20,
      preserveDecisions: true,
      preserveCodeChanges: true,
    })

    const afterStatus = this.baseManager.getSessionStatus(targetSession)
    const duration = Date.now() - startTime

    // 记录历史
    await this.addHistoryEntry({
      id: `compress-${Date.now()}`,
      timestamp: Date.now(),
      originalTokens: beforeStatus.tokenEstimate,
      compressedTokens: afterStatus.tokenEstimate,
      sessionId: path.basename(targetSession, '.jsonl'),
    })

    return {
      originalTokens: beforeStatus.tokenEstimate,
      compressedTokens: afterStatus.tokenEstimate,
      duration,
    }
  }

  /**
   * 获取压缩历史
   */
  async getHistory(): Promise<HistoryEntry[]> {
    if (!fs.existsSync(this.historyPath)) {
      return []
    }

    try {
      const content = fs.readFileSync(this.historyPath, 'utf-8')
      return JSON.parse(content)
    }
    catch {
      return []
    }
  }

  /**
   * 添加历史记录
   */
  private async addHistoryEntry(entry: HistoryEntry): Promise<void> {
    const history = await this.getHistory()
    history.push(entry)

    // 限制历史数量
    const trimmed = history.slice(-this.config.maxHistory)

    fs.writeFileSync(this.historyPath, JSON.stringify(trimmed, null, 2))
  }

  /**
   * 恢复上下文
   */
  async restore(id: string): Promise<void> {
    const archiveDir = path.join(os.homedir(), '.claude', 'archive')
    if (!fs.existsSync(archiveDir)) {
      throw new Error('No archives found')
    }

    const archives = fs.readdirSync(archiveDir).filter(f => f.includes(id))
    if (archives.length === 0) {
      throw new Error(`Archive not found: ${id}`)
    }

    const archiveFile = path.join(archiveDir, archives[0])
    const sessions = this.baseManager.getProjectSessions()
    const currentSession = sessions[sessions.length - 1]

    if (!currentSession) {
      throw new Error('No current session to restore to')
    }

    const success = this.baseManager.restoreArchive(archiveFile, currentSession)
    if (!success) {
      throw new Error('Failed to restore archive')
    }
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<ContextConfig> {
    return this.config
  }

  /**
   * 清除缓存
   */
  async clear(): Promise<void> {
    const contextDir = path.dirname(this.configPath)
    const cacheFiles = ['history.json']

    for (const file of cacheFiles) {
      const filePath = path.join(contextDir, file)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  /**
   * 获取缓存大小
   */
  private getCacheSize(): string {
    const contextDir = path.dirname(this.configPath)
    let totalSize = 0

    try {
      const files = fs.readdirSync(contextDir)
      for (const file of files) {
        const filePath = path.join(contextDir, file)
        const stats = fs.statSync(filePath)
        if (stats.isFile()) {
          totalSize += stats.size
        }
      }
    }
    catch {
      return 'N/A'
    }

    if (totalSize < 1024) {
      return `${totalSize} B`
    }
    if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(1)} KB`
    }
    return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let instance: ContextManagerAdapter | null = null

export function getContextManager(): ContextManagerAdapter {
  if (!instance) {
    instance = new ContextManagerAdapter()
  }
  return instance
}

export { ContextAnalyzer }
