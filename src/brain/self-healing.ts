/**
 * Self-Healing System - Automatic fault detection and recovery
 * Provides fault detection, recovery strategies, degradation handling, and alerting
 */

import type { HealthMonitor } from './health-monitor'
import type { MetricsCollector } from './metrics'
import type { RecoveryAction, RecoveryStrategy, SelfHealingConfig } from './types'
import type { AgentMetrics } from './orchestrator-types'

export interface FaultDetectionResult {
  agentId: string
  faultType: 'timeout' | 'high_error_rate' | 'resource_exhaustion' | 'performance_degradation' | 'crash'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  metrics?: AgentMetrics
  timestamp: number
}

export interface RecoveryAttempt {
  agentId: string
  action: RecoveryAction
  timestamp: number
  success: boolean
  error?: string
}

export interface AlertNotification {
  agentId: string
  level: 'info' | 'warning' | 'error' | 'critical'
  message: string
  timestamp: number
  metadata?: Record<string, any>
}

export type AlertHandler = (notification: AlertNotification) => void | Promise<void>

export class SelfHealingSystem {
  private config: SelfHealingConfig
  private healthMonitor: HealthMonitor
  private metricsCollector: MetricsCollector
  private recoveryAttempts: Map<string, RecoveryAttempt[]> = new Map()
  private alertHandlers: Set<AlertHandler> = new Set()
  private degradationMode: Map<string, boolean> = new Map()

  constructor(
    healthMonitor: HealthMonitor,
    metricsCollector: MetricsCollector,
    config: Partial<SelfHealingConfig> = {},
  ) {
    this.healthMonitor = healthMonitor
    this.metricsCollector = metricsCollector

    this.config = {
      enabled: config.enabled ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 5000,
      errorRateThreshold: config.errorRateThreshold ?? 0.2,
      cpuThreshold: config.cpuThreshold ?? 90,
      memoryThreshold: config.memoryThreshold ?? 90,
      strategies: config.strategies ?? [],
      autoRecover: config.autoRecover ?? true,
      maxRecoveryAttempts: config.maxRecoveryAttempts ?? 3,
    }

    // Subscribe to health status changes
    this.setupHealthMonitoring()
  }

  /**
   * Detect faults in agent
   */
  detectFaults(agentId: string): FaultDetectionResult[] {
    const faults: FaultDetectionResult[] = []
    const healthStatus = this.healthMonitor.getHealthStatus(agentId)
    const metrics = this.metricsCollector.getAgentMetrics(agentId)

    // Check for timeout
    if (healthStatus.status === 'dead') {
      faults.push({
        agentId,
        faultType: 'timeout',
        severity: 'critical',
        description: `Agent has not responded for ${Math.round(healthStatus.timeSinceLastHeartbeat / 1000)}s`,
        timestamp: Date.now(),
      })
    }

    // Check for high error rate (using successRate: 0-1)
    const errorRate = 1 - metrics.successRate
    if (errorRate > this.config.errorRateThreshold) {
      faults.push({
        agentId,
        faultType: 'high_error_rate',
        severity: errorRate > 0.5 ? 'critical' : 'high',
        description: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
        timestamp: Date.now(),
      })
    }

    // Check for slow performance
    if (metrics.avgTaskDuration > 30000) { // 30 seconds
      faults.push({
        agentId,
        faultType: 'performance_degradation',
        severity: 'medium',
        description: `Slow performance - Avg duration: ${(metrics.avgTaskDuration / 1000).toFixed(1)}s`,
        timestamp: Date.now(),
      })
    }

    // Check for performance degradation
    if (healthStatus.status === 'degraded') {
      faults.push({
        agentId,
        faultType: 'performance_degradation',
        severity: 'medium',
        description: 'Agent performance is degraded',
        timestamp: Date.now(),
      })
    }

    return faults
  }

  /**
   * Attempt to recover agent
   */
  async recover(agentId: string, strategy?: RecoveryStrategy): Promise<boolean> {
    if (!this.config.autoRecover) {
      return false
    }

    const attempts = this.recoveryAttempts.get(agentId) ?? []
    if (attempts.length >= this.config.maxRecoveryAttempts) {
      await this.sendAlert({
        agentId,
        level: 'critical',
        message: `Max recovery attempts (${this.config.maxRecoveryAttempts}) reached for agent ${agentId}`,
        timestamp: Date.now(),
      })
      return false
    }

    const faults = this.detectFaults(agentId)
    if (faults.length === 0) {
      return true // No faults detected
    }

    // Determine recovery strategy
    const recoveryStrategy = strategy ?? this.determineRecoveryStrategy(faults)

    // Execute recovery actions
    for (const action of recoveryStrategy.actions) {
      const success = await this.executeRecoveryAction(agentId, action)

      const attempt: RecoveryAttempt = {
        agentId,
        action,
        timestamp: Date.now(),
        success,
      }

      if (!this.recoveryAttempts.has(agentId)) {
        this.recoveryAttempts.set(agentId, [])
      }
      this.recoveryAttempts.get(agentId)!.push(attempt)

      if (!success) {
        await this.sendAlert({
          agentId,
          level: 'error',
          message: `Recovery action '${action}' failed for agent ${agentId}`,
          timestamp: Date.now(),
        })
      }
      else {
        await this.sendAlert({
          agentId,
          level: 'info',
          message: `Recovery action '${action}' succeeded for agent ${agentId}`,
          timestamp: Date.now(),
        })
      }
    }

    // Verify recovery
    const stillFaulty = this.detectFaults(agentId).length > 0
    return !stillFaulty
  }

  /**
   * Enable degradation mode for agent
   */
  enableDegradation(agentId: string): void {
    if (!this.config.enabled) {
      return
    }

    this.degradationMode.set(agentId, true)

    this.sendAlert({
      agentId,
      level: 'warning',
      message: `Degradation mode enabled for agent ${agentId}`,
      timestamp: Date.now(),
    }).catch(console.error)
  }

  /**
   * Disable degradation mode for agent
   */
  disableDegradation(agentId: string): void {
    this.degradationMode.delete(agentId)

    this.sendAlert({
      agentId,
      level: 'info',
      message: `Degradation mode disabled for agent ${agentId}`,
      timestamp: Date.now(),
    }).catch(console.error)
  }

  /**
   * Check if agent is in degradation mode
   */
  isInDegradationMode(agentId: string): boolean {
    return this.degradationMode.get(agentId) ?? false
  }

  /**
   * Register alert handler
   */
  onAlert(handler: AlertHandler): () => void {
    this.alertHandlers.add(handler)

    // Return unsubscribe function
    return () => {
      this.alertHandlers.delete(handler)
    }
  }

  /**
   * Send alert notification
   */
  async sendAlert(notification: AlertNotification): Promise<void> {
    // Check alert threshold
    const levels = ['info', 'warning', 'error', 'critical']
    const notificationLevel = levels.indexOf(notification.level)
    const thresholdLevel = levels.indexOf('warning') // Default threshold

    if (notificationLevel < thresholdLevel) {
      return // Below threshold
    }

    // Notify all handlers
    const promises = Array.from(this.alertHandlers).map(handler =>
      Promise.resolve(handler(notification)).catch(error =>
        console.error('Error in alert handler:', error),
      ),
    )

    await Promise.all(promises)
  }

  /**
   * Get recovery history for agent
   */
  getRecoveryHistory(agentId: string): RecoveryAttempt[] {
    return this.recoveryAttempts.get(agentId) ?? []
  }

  /**
   * Clear recovery history for agent
   */
  clearRecoveryHistory(agentId: string): void {
    this.recoveryAttempts.delete(agentId)
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    totalAgents: number
    healthyAgents: number
    degradedAgents: number
    faultyAgents: number
    recoveryAttempts: number
  } {
    const allAgents = this.metricsCollector.getAllAgents()
    const healthStats = this.healthMonitor.getStatistics()

    let totalRecoveryAttempts = 0
    for (const attempts of this.recoveryAttempts.values()) {
      totalRecoveryAttempts += attempts.length
    }

    return {
      totalAgents: allAgents.length,
      healthyAgents: healthStats.healthyAgents,
      degradedAgents: healthStats.degradedAgents,
      faultyAgents: healthStats.unhealthyAgents + healthStats.deadAgents,
      recoveryAttempts: totalRecoveryAttempts,
    }
  }

  /**
   * Setup health monitoring
   */
  private setupHealthMonitoring(): void {
    // Monitor all agents
    const checkAllAgents = (): void => {
      const allAgents = this.metricsCollector.getAllAgents()

      for (const agentId of allAgents) {
        const faults = this.detectFaults(agentId)

        if (faults.length > 0) {
          // Attempt recovery
          this.recover(agentId).catch(error =>
            console.error(`Recovery failed for agent ${agentId}:`, error),
          )

          // Enable degradation if needed
          const criticalFaults = faults.filter(f => f.severity === 'critical')
          if (criticalFaults.length > 0 && !this.isInDegradationMode(agentId)) {
            this.enableDegradation(agentId)
          }
        }
        else if (this.isInDegradationMode(agentId)) {
          // Disable degradation if recovered
          this.disableDegradation(agentId)
        }
      }
    }

    // Check periodically
    setInterval(checkAllAgents, 5000) // Every 5 seconds
  }

  /**
   * Determine recovery strategy based on faults
   */
  private determineRecoveryStrategy(faults: FaultDetectionResult[]): RecoveryStrategy {
    const actions: RecoveryAction[] = []

    // Prioritize by severity
    const criticalFaults = faults.filter(f => f.severity === 'critical')
    const highFaults = faults.filter(f => f.severity === 'high')

    if (criticalFaults.some(f => f.faultType === 'timeout' || f.faultType === 'crash')) {
      actions.push('restart')
    }
    else if (highFaults.some(f => f.faultType === 'resource_exhaustion')) {
      actions.push('throttle', 'restart')
    }
    else if (highFaults.some(f => f.faultType === 'high_error_rate')) {
      actions.push('retry', 'restart')
    }
    else {
      actions.push('retry')
    }

    return {
      name: 'auto-recovery',
      actions,
      maxRetries: this.config.maxRecoveryAttempts,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 30000,
      conditions: {},
    }
  }

  /**
   * Execute recovery action
   */
  private async executeRecoveryAction(agentId: string, action: RecoveryAction): Promise<boolean> {
    try {
      switch (action) {
        case 'restart':
          // Placeholder for restart logic
          console.log(`[SelfHealing] Restarting agent ${agentId}`)
          await this.simulateDelay(1000)
          return true

        case 'retry':
          // Placeholder for retry logic
          console.log(`[SelfHealing] Retrying for agent ${agentId}`)
          this.clearRecoveryHistory(agentId)
          await this.simulateDelay(500)
          return true

        case 'skip':
          // Placeholder for skip logic
          console.log(`[SelfHealing] Skipping for agent ${agentId}`)
          await this.simulateDelay(100)
          return true

        case 'escalate':
          // Placeholder for escalate logic
          console.log(`[SelfHealing] Escalating for agent ${agentId}`)
          await this.simulateDelay(300)
          return true

        case 'rollback':
          // Placeholder for rollback logic
          console.log(`[SelfHealing] Rolling back for agent ${agentId}`)
          await this.simulateDelay(1000)
          return true

        case 'throttle':
          // Placeholder for throttle logic
          console.log(`[SelfHealing] Throttling agent ${agentId}`)
          await this.simulateDelay(500)
          return true

        case 'scale_down':
          // Placeholder for scale down logic
          console.log(`[SelfHealing] Scaling down agent ${agentId}`)
          await this.simulateDelay(2000)
          return true

        case 'notify':
          // Placeholder for notify logic
          console.log(`[SelfHealing] Notifying about agent ${agentId}`)
          await this.simulateDelay(100)
          return true

        default:
          console.warn(`[SelfHealing] Unknown recovery action: ${action}`)
          return false
      }
    }
    catch (error) {
      console.error(`[SelfHealing] Error executing recovery action ${action}:`, error)
      return false
    }
  }

  /**
   * Simulate delay (for placeholder actions)
   */
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Create self-healing system instance
 */
export function createSelfHealingSystem(
  healthMonitor: HealthMonitor,
  metricsCollector: MetricsCollector,
  config?: Partial<SelfHealingConfig>,
): SelfHealingSystem {
  return new SelfHealingSystem(healthMonitor, metricsCollector, config)
}
