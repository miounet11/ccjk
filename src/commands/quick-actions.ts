/**
 * Quick Actions - Habit-Forming Daily Commands
 *
 * Provides quick, habit-forming commands that encourage daily engagement:
 * - /morning - Morning health check + stats summary
 * - /commit - Smart commit with compression stats
 * - /review - Daily review (contexts used, tokens saved)
 * - /cleanup - Weekly cleanup (old contexts, VACUUM)
 *
 * Features:
 * - Habit tracking (command usage frequency)
 * - Streak counter (days in a row)
 * - Motivational feedback
 * - Pattern-based suggestions
 */

import type { HealthReport } from '../health/types'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import ansis from 'ansis'
import { join } from 'pathe'
import { runHealthCheck } from '../health/index'
import { getContextPersistence } from '../context/persistence'
import { MetricsDisplay } from '../context/metrics-display'

// ============================================================================
// Types
// ============================================================================

export interface QuickActionsOptions {
  json?: boolean
  silent?: boolean
}

export interface HabitStats {
  totalCommands: number
  lastUsed: number
  streak: number
  longestStreak: number
  commandCounts: Record<string, number>
  firstUsed: number
}

export interface DailyStats {
  date: string
  commands: string[]
  tokensSaved: number
  compressions: number
  costSavings: number
}

// ============================================================================
// Habit Tracking
// ============================================================================

const HABIT_FILE = join(homedir(), '.ccjk', 'habits.json')

function loadHabitStats(): HabitStats {
  try {
    if (!existsSync(HABIT_FILE)) {
      return {
        totalCommands: 0,
        lastUsed: 0,
        streak: 0,
        longestStreak: 0,
        commandCounts: {},
        firstUsed: Date.now(),
      }
    }
    return JSON.parse(readFileSync(HABIT_FILE, 'utf-8'))
  }
  catch {
    return {
      totalCommands: 0,
      lastUsed: 0,
      streak: 0,
      longestStreak: 0,
      commandCounts: {},
      firstUsed: Date.now(),
    }
  }
}

function saveHabitStats(stats: HabitStats): void {
  try {
    const dir = join(homedir(), '.ccjk')
    if (!existsSync(dir)) {
      require('node:fs').mkdirSync(dir, { recursive: true })
    }
    writeFileSync(HABIT_FILE, JSON.stringify(stats, null, 2), 'utf-8')
  }
  catch {
    // Silently fail
  }
}

function updateHabitStats(command: string): HabitStats {
  const stats = loadHabitStats()
  const now = Date.now()
  const lastUsedDate = new Date(stats.lastUsed).toDateString()
  const todayDate = new Date(now).toDateString()
  const yesterdayDate = new Date(now - 24 * 60 * 60 * 1000).toDateString()

  // Update streak
  if (lastUsedDate === todayDate) {
    // Same day, no change to streak
  }
  else if (lastUsedDate === yesterdayDate) {
    // Consecutive day, increment streak
    stats.streak++
  }
  else {
    // Streak broken, reset to 1
    stats.streak = 1
  }

  // Update longest streak
  if (stats.streak > stats.longestStreak) {
    stats.longestStreak = stats.streak
  }

  // Update command counts
  stats.commandCounts[command] = (stats.commandCounts[command] || 0) + 1
  stats.totalCommands++
  stats.lastUsed = now

  saveHabitStats(stats)
  return stats
}

function getDaysUsed(): number {
  const stats = loadHabitStats()
  if (stats.totalCommands === 0) return 0

  const firstDate = new Date(stats.firstUsed)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - firstDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// ============================================================================
// Motivational Messages
// ============================================================================

function getMotivationalMessage(stats: HabitStats, tokensSaved: number, costSavings: number): string {
  const messages: string[] = []

  // Streak messages
  if (stats.streak >= 7) {
    messages.push(ansis.green.bold(`🎉 ${stats.streak}-day streak! You're on fire!`))
  }
  else if (stats.streak >= 3) {
    messages.push(ansis.cyan(`🔥 ${stats.streak}-day streak! Keep it going!`))
  }
  else if (stats.streak === 1) {
    messages.push(ansis.yellow(`✨ New streak started! Come back tomorrow!`))
  }

  // Cost savings messages
  if (costSavings >= 50) {
    messages.push(ansis.green.bold(`💰 You've saved $${costSavings.toFixed(2)} this week!`))
  }
  else if (costSavings >= 10) {
    messages.push(ansis.cyan(`💵 $${costSavings.toFixed(2)} saved this week!`))
  }

  // Token savings messages
  if (tokensSaved >= 100000) {
    messages.push(ansis.magenta.bold(`🚀 ${MetricsDisplay.formatTokenCount(tokensSaved)} tokens saved!`))
  }
  else if (tokensSaved >= 10000) {
    messages.push(ansis.blue(`📊 ${MetricsDisplay.formatTokenCount(tokensSaved)} tokens saved!`))
  }

  // Milestone messages
  if (stats.totalCommands === 10) {
    messages.push(ansis.yellow(`🎯 10 commands milestone! You're getting the hang of it!`))
  }
  else if (stats.totalCommands === 50) {
    messages.push(ansis.green(`🏆 50 commands milestone! You're a power user!`))
  }
  else if (stats.totalCommands === 100) {
    messages.push(ansis.magenta.bold(`👑 100 commands milestone! You're a CCJK master!`))
  }

  // Longest streak messages
  if (stats.longestStreak >= 30) {
    messages.push(ansis.magenta.bold(`🏅 Longest streak: ${stats.longestStreak} days! Legendary!`))
  }
  else if (stats.longestStreak >= 14) {
    messages.push(ansis.green(`🏅 Longest streak: ${stats.longestStreak} days!`))
  }

  return messages.length > 0 ? messages.join('\n  ') : ''
}

function getSuggestion(stats: HabitStats): string {
  const now = Date.now()
  const lastUsed = stats.lastUsed
  const hoursSinceLastUse = (now - lastUsed) / (1000 * 60 * 60)

  // Suggest cleanup if it's been a week
  if (hoursSinceLastUse >= 168) {
    return ansis.yellow(`💡 Tip: Run ${ansis.cyan('ccjk cleanup')} weekly to keep DB healthy`)
  }

  // Suggest review if it's been a day
  if (hoursSinceLastUse >= 24) {
    return ansis.yellow(`💡 Tip: Run ${ansis.cyan('ccjk review')} to see your daily stats`)
  }

  // Suggest commit if they haven't used it much
  if ((stats.commandCounts.commit || 0) < 5) {
    return ansis.yellow(`💡 Tip: Try ${ansis.cyan('ccjk commit')} for smart commits with compression stats`)
  }

  // Random tips
  const tips = [
    `💡 Tip: ${ansis.cyan('ccjk morning')} gives you a quick health check`,
    `💡 Tip: ${ansis.cyan('ccjk review')} shows your token savings`,
    `💡 Tip: ${ansis.cyan('ccjk cleanup')} keeps your database optimized`,
  ]

  return tips[Math.floor(Math.random() * tips.length)]
}

// ============================================================================
// Commands
// ============================================================================

/**
 * Morning command - Quick health check + stats summary
 */
export async function morningCommand(options: QuickActionsOptions = {}): Promise<void> {
  const stats = updateHabitStats('morning')

  if (!options.silent) {
    console.log()
    console.log(ansis.cyan.bold('☀️  Good morning! Here\'s your CCJK status:'))
    console.log()
  }

  try {
    // Get health report
    const health = await runHealthCheck()

    // Get compression metrics
    const persistence = getContextPersistence()
    const metrics = persistence.getCompressionMetricsStats()

    if (options.json) {
      console.log(JSON.stringify({
        health,
        metrics,
        habits: stats,
      }, null, 2))
      return
    }

    // Display health score
    const gradeColor = health.grade === 'S' ? ansis.magenta.bold
      : health.grade === 'A' ? ansis.green.bold
        : health.grade === 'B' ? ansis.cyan.bold
          : health.grade === 'C' ? ansis.yellow.bold
            : ansis.red.bold

    console.log(`  ${ansis.gray('Health Score:')} ${gradeColor(health.grade)} ${ansis.gray(`(${health.totalScore}/100)`)}`)

    // Display compression stats
    if (metrics.totalCompressions > 0) {
      console.log(`  ${ansis.gray('Total Saved:')} ${ansis.green(MetricsDisplay.formatTokenCount(metrics.totalTokensSaved))} tokens`)
      console.log(`  ${ansis.gray('Cost Savings:')} ${ansis.green.bold(MetricsDisplay.formatCost(metrics.estimatedCostSavings))}`)

      if (metrics.sessionStats && metrics.sessionStats.compressions > 0) {
        console.log(`  ${ansis.gray('Last 24h:')} ${ansis.white(metrics.sessionStats.compressions)} compressions, ${ansis.green(MetricsDisplay.formatCost(metrics.sessionStats.costSavings))} saved`)
      }
    }

    // Display streak
    if (stats.streak > 0) {
      console.log(`  ${ansis.gray('Streak:')} ${ansis.yellow(`${stats.streak} day${stats.streak > 1 ? 's' : ''}`)}`)
    }

    console.log()

    // Display motivational message
    const message = getMotivationalMessage(stats, metrics.totalTokensSaved, metrics.weeklyStats?.costSavings || 0)
    if (message) {
      console.log(`  ${message}`)
      console.log()
    }

    // Display top recommendations
    if (health.recommendations.length > 0) {
      console.log(ansis.yellow.bold('  📋 Top Recommendations:'))
      for (const rec of health.recommendations.slice(0, 2)) {
        const priority = rec.priority === 'high' ? ansis.red('!') : rec.priority === 'medium' ? ansis.yellow('•') : ansis.gray('·')
        console.log(`  ${priority} ${rec.title}`)
        if (rec.command) {
          console.log(`    ${ansis.gray('→')} ${ansis.cyan(rec.command)}`)
        }
      }
      console.log()
    }

    // Display suggestion
    const suggestion = getSuggestion(stats)
    if (suggestion) {
      console.log(`  ${suggestion}`)
      console.log()
    }
  }
  catch (error) {
    console.error(ansis.red('Error running morning command:'), error)
    process.exit(1)
  }
}

/**
 * Review command - Daily review (contexts used, tokens saved)
 */
export async function reviewCommand(options: QuickActionsOptions = {}): Promise<void> {
  const stats = updateHabitStats('review')

  if (!options.silent) {
    console.log()
    console.log(ansis.cyan.bold('📊 Daily Review'))
    console.log()
  }

  try {
    const persistence = getContextPersistence()
    const metrics = persistence.getCompressionMetricsStats()

    if (options.json) {
      console.log(JSON.stringify({
        metrics,
        habits: stats,
      }, null, 2))
      return
    }

    // Overall stats
    console.log(ansis.cyan.bold('  Overall Statistics'))
    console.log(`  ${ansis.gray('Total Compressions:')} ${ansis.white(metrics.totalCompressions)}`)
    console.log(`  ${ansis.gray('Total Saved:')} ${ansis.green(MetricsDisplay.formatTokenCount(metrics.totalTokensSaved))} tokens`)
    console.log(`  ${ansis.gray('Avg Reduction:')} ${ansis.yellow(MetricsDisplay.formatRatio(metrics.averageCompressionRatio))}`)
    console.log(`  ${ansis.gray('Cost Savings:')} ${ansis.green.bold(MetricsDisplay.formatCost(metrics.estimatedCostSavings))}`)
    console.log()

    // Session stats (last 24h)
    if (metrics.sessionStats && metrics.sessionStats.compressions > 0) {
      console.log(ansis.cyan.bold('  Last 24 Hours'))
      console.log(`  ${ansis.gray('Compressions:')} ${ansis.white(metrics.sessionStats.compressions)}`)
      console.log(`  ${ansis.gray('Tokens Saved:')} ${ansis.green(MetricsDisplay.formatTokenCount(metrics.sessionStats.tokensSaved))}`)
      console.log(`  ${ansis.gray('Cost Savings:')} ${ansis.green(MetricsDisplay.formatCost(metrics.sessionStats.costSavings))}`)
      console.log()
    }

    // Weekly stats
    if (metrics.weeklyStats && metrics.weeklyStats.compressions > 0) {
      console.log(ansis.cyan.bold('  Last 7 Days'))
      console.log(`  ${ansis.gray('Compressions:')} ${ansis.white(metrics.weeklyStats.compressions)}`)
      console.log(`  ${ansis.gray('Tokens Saved:')} ${ansis.green(MetricsDisplay.formatTokenCount(metrics.weeklyStats.tokensSaved))}`)
      console.log(`  ${ansis.gray('Cost Savings:')} ${ansis.green(MetricsDisplay.formatCost(metrics.weeklyStats.costSavings))}`)
      console.log()
    }

    // Monthly stats
    if (metrics.monthlyStats && metrics.monthlyStats.compressions > 0) {
      console.log(ansis.cyan.bold('  Last 30 Days'))
      console.log(`  ${ansis.gray('Compressions:')} ${ansis.white(metrics.monthlyStats.compressions)}`)
      console.log(`  ${ansis.gray('Tokens Saved:')} ${ansis.green(MetricsDisplay.formatTokenCount(metrics.monthlyStats.tokensSaved))}`)
      console.log(`  ${ansis.gray('Cost Savings:')} ${ansis.green(MetricsDisplay.formatCost(metrics.monthlyStats.costSavings))}`)
      console.log()
    }

    // Habit stats
    console.log(ansis.cyan.bold('  Your Habits'))
    console.log(`  ${ansis.gray('Total Commands:')} ${ansis.white(stats.totalCommands)}`)
    console.log(`  ${ansis.gray('Current Streak:')} ${ansis.yellow(`${stats.streak} day${stats.streak !== 1 ? 's' : ''}`)}`)
    console.log(`  ${ansis.gray('Longest Streak:')} ${ansis.yellow(`${stats.longestStreak} day${stats.longestStreak !== 1 ? 's' : ''}`)}`)
    console.log(`  ${ansis.gray('Days Active:')} ${ansis.white(getDaysUsed())}`)
    console.log()

    // Motivational message
    const message = getMotivationalMessage(stats, metrics.totalTokensSaved, metrics.weeklyStats?.costSavings || 0)
    if (message) {
      console.log(`  ${message}`)
      console.log()
    }

    // Suggestion
    const suggestion = getSuggestion(stats)
    if (suggestion) {
      console.log(`  ${suggestion}`)
      console.log()
    }
  }
  catch (error) {
    console.error(ansis.red('Error running review command:'), error)
    process.exit(1)
  }
}

/**
 * Cleanup command - Weekly cleanup (old contexts, VACUUM)
 */
export async function cleanupCommand(options: QuickActionsOptions = {}): Promise<void> {
  const stats = updateHabitStats('cleanup')

  if (!options.silent) {
    console.log()
    console.log(ansis.cyan.bold('🧹 Database Cleanup'))
    console.log()
  }

  try {
    const persistence = getContextPersistence()

    // Get stats before cleanup
    const statsBefore = persistence.getStats()

    if (!options.silent) {
      console.log(`  ${ansis.gray('Database size before:')} ${ansis.white(MetricsDisplay.formatBytes(statsBefore.totalSize))}`)
      console.log(`  ${ansis.gray('Total contexts:')} ${ansis.white(statsBefore.totalContexts)}`)
      console.log()
    }

    // Clean up old contexts (older than 30 days)
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
    const deletedContexts = persistence.cleanup(maxAge)

    if (!options.silent && deletedContexts > 0) {
      console.log(`  ${ansis.green('✓')} Deleted ${ansis.white(deletedContexts)} old context${deletedContexts !== 1 ? 's' : ''}`)
    }

    // Clean up old compression metrics (older than 90 days)
    const metricsMaxAge = 90 * 24 * 60 * 60 * 1000 // 90 days
    const deletedMetrics = persistence.cleanupCompressionMetrics(metricsMaxAge)

    if (!options.silent && deletedMetrics > 0) {
      console.log(`  ${ansis.green('✓')} Deleted ${ansis.white(deletedMetrics)} old metric${deletedMetrics !== 1 ? 's' : ''}`)
    }

    // Vacuum database
    if (!options.silent) {
      console.log(`  ${ansis.gray('Running VACUUM...')}`)
    }
    persistence.vacuum()

    // Get stats after cleanup
    const statsAfter = persistence.getStats()
    const sizeSaved = statsBefore.totalSize - statsAfter.totalSize

    if (!options.silent) {
      console.log(`  ${ansis.green('✓')} VACUUM complete`)
      console.log()
      console.log(`  ${ansis.gray('Database size after:')} ${ansis.white(MetricsDisplay.formatBytes(statsAfter.totalSize))}`)
      console.log(`  ${ansis.gray('Space reclaimed:')} ${ansis.green(MetricsDisplay.formatBytes(sizeSaved))}`)
      console.log(`  ${ansis.gray('Total contexts:')} ${ansis.white(statsAfter.totalContexts)}`)
      console.log()
      console.log(`  ${ansis.green.bold('✓ Cleanup complete!')}`)
      console.log()
    }

    if (options.json) {
      console.log(JSON.stringify({
        deletedContexts,
        deletedMetrics,
        sizeSaved,
        statsBefore,
        statsAfter,
      }, null, 2))
    }

    // Motivational message
    if (!options.silent) {
      const message = getMotivationalMessage(stats, 0, 0)
      if (message) {
        console.log(`  ${message}`)
        console.log()
      }

      console.log(`  ${ansis.yellow(`💡 Tip: Run cleanup weekly to keep your database healthy`)}`)
      console.log()
    }
  }
  catch (error) {
    console.error(ansis.red('Error running cleanup command:'), error)
    process.exit(1)
  }
}

/**
 * Get habit statistics
 */
export function getHabitStats(): HabitStats {
  return loadHabitStats()
}

/**
 * Reset habit statistics (for testing)
 */
export function resetHabitStats(): void {
  const emptyStats: HabitStats = {
    totalCommands: 0,
    lastUsed: 0,
    streak: 0,
    longestStreak: 0,
    commandCounts: {},
    firstUsed: Date.now(),
  }
  saveHabitStats(emptyStats)
}
