/**
 * Health Monitor - Agent health monitoring and auto-restart system
 * Provides heartbeat detection, performance monitoring, and automatic recovery
 */

import type { AgentMetrics, HealthStatus, MonitorConfig } from './types'

export interface HeartbeatRecord {
  agentId: string
  timestamp: number
  status: 'alive' | 'dead' | 'degraded'
  metrics?: AgentMetrics
}

export interface HealthCheckResult {
  agentId: string
  healthy: boolean
  status: HealthStatus
  lastHeartbeat: number
  timeSinceLastHeartbeat: number
  issues: string[]
}

export class HealthMonitor {
  private heartbeats: Map<string, HeartbeatRecord> = new Map()
  private config: MonitorConfig
  private checkInterval?: NodeJS.Timeout
  private listeners: Map<string, Set<(result: HealthCheckResult) => void>> = new Map()

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      heartbeatTimeout: config.heartbeatTimeout ?? 30000, // 30 seconds
      checkInterval: config.checkInterval ?? 10000, // 10 seconds
      maxRestartAttempts: config.maxRestartAttempts ?? 3,
      restartCooldown: config.restartCooldown ?? 60000, // 1 minute
      degradedThreshold: config.degradedThreshold ?? 0.7, // 70% performance
      autoRestart: config.autoRestart ?? true,
    }
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.checkInterval) {
      return
    }

    this.checkInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.config.checkInterval)
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = undefined
    }
  }

  /**
   * Record agent heartbeat
   */
  recordHeartbeat(agentId: string, metrics?: AgentMetrics): void {
    const status = this.determineStatus(metrics)

    this.heartbeats.set(agentId, {
      agentId,
      timestamp: Date.now(),
      status,
      metrics,
    })
  }

  /**
   * Get agent health status
   */
  getHealthStatus(agentId: string): HealthCheckResult {
    const heartbeat = this.heartbeats.get(agentId)
    const now = Date.now()

    if (!heartbeat) {
      return {
        agentId,
        healthy: false,
        status: 'unknown',
        lastHeartbeat: 0,
        timeSinceLastHeartbeat: Infinity,
        issues: ['No heartbeat recorded'],
      }
    }

    const timeSinceLastHeartbeat = now - heartbeat.timestamp
    const isTimeout = timeSinceLastHeartbeat > this.config.heartbeatTimeout
    const issues: string[] = []

    if (isTimeout) {
      issues.push(`Heartbeat timeout (${Math.round(timeSinceLastHeartbeat / 1000)}s)`)
    }

    if (heartbeat.status === 'degraded') {
      issues.push('Performance degraded')
    }

    if (heartbeat.metrics) {
      if (heartbeat.metrics.errorRate > 0.1) {
        issues.push(`High error rate: ${(heartbeat.metrics.errorRate * 100).toFixed(1)}%`)
      }
      if (heartbeat.metrics.memoryUsage > 0.9) {
        issues.push(`High memory usage: ${(heartbeat.metrics.memoryUsage * 100).toFixed(1)}%`)
      }
    }

    const healthy = !isTimeout && heartbeat.status === 'alive' && issues.length === 0
    const status: HealthStatus = isTimeout ? 'dead' : heartbeat.status === 'degraded' ? 'degraded' : healthy ? 'healthy' : 'unhealthy'

    return {
      agentId,
      healthy,
      status,
      lastHeartbeat: heartbeat.timestamp,
      timeSinceLastHeartbeat,
      issues,
    }
  }

  /**
   * Get all agents health status
   */
  getAllHealthStatus(): HealthCheckResult[] {
    const results: HealthCheckResult[] = []

    for (const agentId of this.heartbeats.keys()) {
      results.push(this.getHealthStatus(agentId))
    }

    return results
  }

  /**
   * Subscribe to health status changes
   */
  subscribe(agentId: string, callback: (result: HealthCheckResult) => void): () => void {
    if (!this.listeners.has(agentId)) {
      this.listeners.set(agentId, new Set())
    }

    this.listeners.get(agentId)!.add(callback)

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(agentId)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.listeners.delete(agentId)
        }
      }
    }
  }

  /**
   * Remove agent from monitoring
   */
  removeAgent(agentId: string): void {
    this.heartbeats.delete(agentId)
    this.listeners.delete(agentId)
  }

  /**
   * Clear all monitoring data
   */
  clear(): void {
    this.heartbeats.clear()
    this.listeners.clear()
  }

  /**
   * Perform health check on all agents
   */
  private performHealthCheck(): void {
    for (const agentId of this.heartbeats.keys()) {
      const result = this.getHealthStatus(agentId)

      // Notify listeners
      const listeners = this.listeners.get(agentId)
      if (listeners) {
        for (const callback of listeners) {
          try {
            callback(result)
          }
          catch (error) {
            console.error(`Error in health check listener for ${agentId}:`, error)
          }
        }
      }

      // Auto-restart if configured and agent is dead
      if (this.config.autoRestart && result.status === 'dead') {
        this.triggerAutoRestart(agentId)
      }
    }
  }

  /**
   * Determine agent status based on metrics
   */
  private determineStatus(metrics?: AgentMetrics): 'alive' | 'dead' | 'degraded' {
    if (!metrics) {
      return 'alive'
    }

    // Check if performance is degraded
    const performanceScore = this.calculatePerformanceScore(metrics)
    if (performanceScore < this.config.degradedThreshold) {
      return 'degraded'
    }

    return 'alive'
  }

  /**
   * Calculate performance score (0-1)
   */
  private calculatePerformanceScore(metrics: AgentMetrics): number {
    const weights = {
      successRate: 0.4,
      responseTime: 0.3,
      memoryUsage: 0.2,
      cpuUsage: 0.1,
    }

    const successRate = 1 - metrics.errorRate
    const responseTimeScore = Math.max(0, 1 - (metrics.avgResponseTime / 10000)) // 10s baseline
    const memoryScore = 1 - metrics.memoryUsage
    const cpuScore = 1 - metrics.cpuUsage

    return (
      successRate * weights.successRate
      + responseTimeScore * weights.responseTime
      + memoryScore * weights.memoryUsage
      + cpuScore * weights.cpuUsage
    )
  }

  /**
   * Trigger auto-restart for dead agent
   */
  private triggerAutoRestart(agentId: string): void {
    // This is a placeholder for auto-restart logic
    // In a real implementation, this would integrate with the agent lifecycle manager
    console.warn(`[HealthMonitor] Agent ${agentId} is dead, auto-restart triggered`)
  }

  /**
   * Get monitoring statistics
   */
  getStatistics(): {
    totalAgents: number
    healthyAgents: number
    degradedAgents: number
    unhealthyAgents: number
    deadAgents: number
  } {
    const statuses = this.getAllHealthStatus()

    return {
      totalAgents: statuses.length,
      healthyAgents: statuses.filter(s => s.status === 'healthy').length,
      degradedAgents: statuses.filter(s => s.status === 'degraded').length,
      unhealthyAgents: statuses.filter(s => s.status === 'unhealthy').length,
      deadAgents: statuses.filter(s => s.status === 'dead').length,
    }
  }
}

/**
 * Create a singleton health monitor instance
 */
let globalHealthMonitor: HealthMonitor | undefined

export function getHealthMonitor(config?: Partial<MonitorConfig>): HealthMonitor {
  if (!globalHealthMonitor) {
    globalHealthMonitor = new HealthMonitor(config)
  }
  return globalHealthMonitor
}

export function resetHealthMonitor(): void {
  if (globalHealthMonitor) {
    globalHealthMonitor.stop()
    globalHealthMonitor.clear()
    globalHealthMonitor = undefined
  }
}
