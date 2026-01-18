/**
 * CCJK Analytics Plugin
 *
 * Tracks usage patterns, command execution, and performance metrics
 * to help improve CCJK and provide insights to users.
 *
 * Features:
 * - Command usage tracking
 * - Performance metrics collection
 * - Error pattern analysis
 * - Anonymous usage statistics
 *
 * @module plugins/analytics
 */

import type { CCJKPlugin, HookContext, HookResult, PluginManager } from '../core/plugin-system'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { env, platform } from 'node:process'
import { join } from 'pathe'
import { createPlugin, PluginHookType } from '../core/plugin-system'

/**
 * Analytics data structure
 */
interface AnalyticsData {
  /** Total number of commands executed */
  totalCommands: number
  /** Command execution counts */
  commandCounts: Record<string, number>
  /** Error counts by type */
  errorCounts: Record<string, number>
  /** Average execution times by command */
  executionTimes: Record<string, number[]>
  /** First seen timestamp */
  firstSeen: number
  /** Last seen timestamp */
  lastSeen: number
  /** CCJK version */
  version?: string
  /** User language preference */
  language?: string
  /** Platform information */
  platform?: string
}

/**
 * Analytics storage manager
 */
class AnalyticsStorage {
  private dataPath: string
  private data: AnalyticsData

  constructor() {
    const ccjkDir = join(homedir(), '.ccjk')
    if (!existsSync(ccjkDir)) {
      mkdirSync(ccjkDir, { recursive: true })
    }

    this.dataPath = join(ccjkDir, 'analytics.json')
    this.data = this.load()
  }

  /**
   * Load analytics data from disk
   */
  private load(): AnalyticsData {
    try {
      if (existsSync(this.dataPath)) {
        const content = readFileSync(this.dataPath, 'utf-8')
        return JSON.parse(content)
      }
    }
    catch (error) {
      console.error('[Analytics] Failed to load data:', error)
    }

    // Return default data
    return {
      totalCommands: 0,
      commandCounts: {},
      errorCounts: {},
      executionTimes: {},
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    }
  }

  /**
   * Save analytics data to disk
   */
  private save(): void {
    try {
      writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8')
    }
    catch (error) {
      console.error('[Analytics] Failed to save data:', error)
    }
  }

  /**
   * Track a command execution
   */
  trackCommand(command: string, executionTime?: number): void {
    this.data.totalCommands++
    this.data.commandCounts[command] = (this.data.commandCounts[command] || 0) + 1
    this.data.lastSeen = Date.now()

    if (executionTime !== undefined) {
      if (!this.data.executionTimes[command]) {
        this.data.executionTimes[command] = []
      }
      this.data.executionTimes[command].push(executionTime)

      // Keep only last 100 execution times per command
      if (this.data.executionTimes[command].length > 100) {
        this.data.executionTimes[command].shift()
      }
    }

    this.save()
  }

  /**
   * Track an error
   */
  trackError(errorType: string): void {
    this.data.errorCounts[errorType] = (this.data.errorCounts[errorType] || 0) + 1
    this.data.lastSeen = Date.now()
    this.save()
  }

  /**
   * Update metadata
   */
  updateMetadata(metadata: Partial<Pick<AnalyticsData, 'version' | 'language' | 'platform'>>): void {
    Object.assign(this.data, metadata)
    this.save()
  }

  /**
   * Get analytics summary
   */
  getSummary(): AnalyticsData {
    return { ...this.data }
  }

  /**
   * Get top commands
   */
  getTopCommands(limit = 10): Array<{ command: string, count: number }> {
    return Object.entries(this.data.commandCounts)
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Get average execution time for a command
   */
  getAverageExecutionTime(command: string): number | null {
    const times = this.data.executionTimes[command]
    if (!times || times.length === 0) {
      return null
    }

    const sum = times.reduce((acc, time) => acc + time, 0)
    return sum / times.length
  }

  /**
   * Clear all analytics data
   */
  clear(): void {
    this.data = {
      totalCommands: 0,
      commandCounts: {},
      errorCounts: {},
      executionTimes: {},
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    }
    this.save()
  }
}

/**
 * Analytics plugin implementation
 */
const analyticsPlugin: CCJKPlugin = createPlugin({
  name: 'ccjk-analytics',
  version: '1.0.0',
  description: 'Tracks usage patterns and performance metrics for CCJK',
  author: 'CCJK Team',

  config: {
    enabled: true,
    options: {
      // Whether to track command execution
      trackCommands: true,
      // Whether to track errors
      trackErrors: true,
      // Whether to track performance metrics
      trackPerformance: true,
      // Whether to show analytics summary on shutdown
      showSummaryOnShutdown: false,
    },
  },

  async init(manager: PluginManager): Promise<void> {
    const storage = new AnalyticsStorage()

    // Update metadata
    storage.updateMetadata({
      version: env.npm_package_version,
      platform,
    })

    // Store storage instance for use in hooks
    ;(manager as any)._analyticsStorage = storage
  },

  hooks: {
    /**
     * Track command execution start
     */
    [PluginHookType.PreCommand]: async (context: HookContext): Promise<HookResult> => {
      // Store start time in metadata for performance tracking
      if (!context.metadata) {
        context.metadata = {}
      }
      context.metadata.commandStartTime = Date.now()

      return {
        success: true,
        continue: true,
      }
    },

    /**
     * Track command execution completion
     */
    [PluginHookType.PostCommand]: async (context: HookContext): Promise<HookResult> => {
      const storage = (context as any)._analyticsStorage as AnalyticsStorage | undefined

      if (!storage || !context.command) {
        return { success: true, continue: true }
      }

      // Calculate execution time
      const startTime = context.metadata?.commandStartTime as number | undefined
      const executionTime = startTime ? Date.now() - startTime : undefined

      // Track command
      storage.trackCommand(context.command, executionTime)

      return {
        success: true,
        message: `Tracked command: ${context.command}`,
        continue: true,
      }
    },

    /**
     * Track errors
     */
    [PluginHookType.OnError]: async (context: HookContext): Promise<HookResult> => {
      const storage = (context as any)._analyticsStorage as AnalyticsStorage | undefined

      if (!storage || !context.error) {
        return { success: true, continue: true }
      }

      // Track error
      const errorType = context.error.name || 'UnknownError'
      storage.trackError(errorType)

      return {
        success: true,
        message: `Tracked error: ${errorType}`,
        continue: true,
      }
    },

    /**
     * Show analytics summary on shutdown
     */
    [PluginHookType.Shutdown]: async (context: HookContext): Promise<HookResult> => {
      const storage = (context as any)._analyticsStorage as AnalyticsStorage | undefined

      if (!storage) {
        return { success: true, continue: true }
      }

      const plugin = (context as any)._plugin as CCJKPlugin | undefined
      const showSummary = plugin?.config?.options?.showSummaryOnShutdown

      if (showSummary) {
        const summary = storage.getSummary()
        const topCommands = storage.getTopCommands(5)

        console.log('\n📊 CCJK Analytics Summary:')
        console.log(`   Total commands: ${summary.totalCommands}`)
        console.log(`   Total errors: ${Object.values(summary.errorCounts).reduce((a, b) => a + b, 0)}`)
        console.log(`   Top commands:`)
        topCommands.forEach(({ command, count }) => {
          const avgTime = storage.getAverageExecutionTime(command)
          const timeStr = avgTime ? ` (avg: ${avgTime.toFixed(0)}ms)` : ''
          console.log(`     - ${command}: ${count}${timeStr}`)
        })
      }

      return {
        success: true,
        continue: true,
      }
    },
  },

  commands: [
    {
      name: 'analytics',
      description: 'View CCJK analytics and usage statistics',
      aliases: ['stats', 'usage'],
      async handler(args: string[], _options: Record<string, any>): Promise<void> {
        const storage = new AnalyticsStorage()
        const summary = storage.getSummary()

        if (args.includes('clear')) {
          storage.clear()
          console.log('✅ Analytics data cleared')
          return
        }

        console.log('\n📊 CCJK Analytics Report\n')
        console.log('═══════════════════════════════════════')

        // Overview
        console.log('\n📈 Overview:')
        console.log(`   Total commands executed: ${summary.totalCommands}`)
        console.log(`   Total errors: ${Object.values(summary.errorCounts).reduce((a, b) => a + b, 0)}`)
        console.log(`   First used: ${new Date(summary.firstSeen).toLocaleString()}`)
        console.log(`   Last used: ${new Date(summary.lastSeen).toLocaleString()}`)

        if (summary.version) {
          console.log(`   CCJK version: ${summary.version}`)
        }

        // Top commands
        const topCommands = storage.getTopCommands(10)
        if (topCommands.length > 0) {
          console.log('\n🏆 Top Commands:')
          topCommands.forEach(({ command, count }, index) => {
            const avgTime = storage.getAverageExecutionTime(command)
            const timeStr = avgTime ? ` (avg: ${avgTime.toFixed(0)}ms)` : ''
            console.log(`   ${index + 1}. ${command}: ${count} times${timeStr}`)
          })
        }

        // Error summary
        const errorEntries = Object.entries(summary.errorCounts)
        if (errorEntries.length > 0) {
          console.log('\n⚠️  Error Summary:')
          errorEntries
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .forEach(([errorType, count]) => {
              console.log(`   - ${errorType}: ${count} times`)
            })
        }

        console.log('\n═══════════════════════════════════════')
        console.log('\n💡 Tip: Use "ccjk analytics clear" to reset analytics data\n')
      },
    },
  ],
})

export default analyticsPlugin
