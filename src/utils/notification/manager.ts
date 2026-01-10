/**
 * CCJK Notification System - Notification Manager
 *
 * Central manager for the notification system.
 * Handles task monitoring, notification sending, and reply processing.
 */

import type {
  NotificationChannel,
  NotificationConfig,
  NotificationMessage,
  NotificationResult,
  ReplyHandler,
  TaskStatus,
  UserReply,
} from './types'
import {
  getEnabledChannels,
  loadNotificationConfig,
} from './config'

// ============================================================================
// Notification Manager Class
// ============================================================================

/**
 * Notification Manager
 *
 * Singleton class that manages the notification system lifecycle.
 */
export class NotificationManager {
  private static instance: NotificationManager | null = null

  private config: NotificationConfig | null = null
  private currentTask: TaskStatus | null = null
  private taskStartTime: Date | null = null
  private thresholdTimer: NodeJS.Timeout | null = null
  private replyHandlers: Set<ReplyHandler> = new Set()
  private isInitialized: boolean = false

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  /**
   * Initialize the notification manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    this.config = await loadNotificationConfig()
    this.isInitialized = true
  }

  /**
   * Check if notification system is enabled and configured
   */
  async isEnabled(): Promise<boolean> {
    if (!this.config) {
      this.config = await loadNotificationConfig()
    }

    if (!this.config.enabled) {
      return false
    }

    // Check if at least one channel is enabled
    const enabledChannels = await getEnabledChannels()
    return enabledChannels.length > 0
  }

  /**
   * Reload configuration
   */
  async reloadConfig(): Promise<void> {
    this.config = await loadNotificationConfig()
  }

  // ==========================================================================
  // Task Monitoring
  // ==========================================================================

  /**
   * Start monitoring a task
   *
   * @param taskId - Unique task identifier
   * @param description - Task description
   */
  async startTask(taskId: string, description: string): Promise<void> {
    if (!await this.isEnabled()) {
      return
    }

    this.currentTask = {
      taskId,
      description,
      startTime: new Date(),
      status: 'running',
    }
    this.taskStartTime = new Date()

    // Set up threshold timer
    this.setupThresholdTimer()
  }

  /**
   * Update current task status
   *
   * @param status - New task status
   * @param result - Optional result message
   */
  async updateTask(
    status: TaskStatus['status'],
    result?: string,
  ): Promise<void> {
    if (!this.currentTask) {
      return
    }

    this.currentTask.status = status
    this.currentTask.result = result

    if (this.taskStartTime) {
      this.currentTask.duration = Date.now() - this.taskStartTime.getTime()
    }

    // Clear threshold timer if task is no longer running
    if (status !== 'running') {
      this.clearThresholdTimer()
    }
  }

  /**
   * Complete the current task
   *
   * @param result - Task result summary
   */
  async completeTask(result?: string): Promise<NotificationResult[]> {
    if (!this.currentTask) {
      return []
    }

    await this.updateTask('completed', result)

    // Send completion notification
    const results = await this.sendNotification({
      type: 'task_completed',
      task: this.currentTask,
      actions: [
        { id: 'continue', label: '继续', value: 'continue', primary: true },
        { id: 'new_task', label: '新任务', value: 'new_task' },
      ],
    })

    // Clear current task
    this.currentTask = null
    this.taskStartTime = null

    return results
  }

  /**
   * Mark current task as failed
   *
   * @param error - Error message
   */
  async failTask(error: string): Promise<NotificationResult[]> {
    if (!this.currentTask) {
      return []
    }

    await this.updateTask('failed')
    this.currentTask.error = error

    // Send failure notification
    const results = await this.sendNotification({
      type: 'task_failed',
      task: this.currentTask,
      priority: 'high',
    })

    // Clear current task
    this.currentTask = null
    this.taskStartTime = null

    return results
  }

  /**
   * Cancel current task
   */
  async cancelTask(): Promise<void> {
    if (!this.currentTask) {
      return
    }

    await this.updateTask('cancelled')
    this.clearThresholdTimer()
    this.currentTask = null
    this.taskStartTime = null
  }

  /**
   * Get current task status
   */
  getCurrentTask(): TaskStatus | null {
    return this.currentTask
  }

  // ==========================================================================
  // Threshold Timer
  // ==========================================================================

  /**
   * Set up the threshold timer
   */
  private setupThresholdTimer(): void {
    this.clearThresholdTimer()

    if (!this.config) {
      return
    }

    const thresholdMs = this.config.threshold * 60 * 1000

    this.thresholdTimer = setTimeout(async () => {
      await this.onThresholdReached()
    }, thresholdMs)
  }

  /**
   * Clear the threshold timer
   */
  private clearThresholdTimer(): void {
    if (this.thresholdTimer) {
      clearTimeout(this.thresholdTimer)
      this.thresholdTimer = null
    }
  }

  /**
   * Called when task duration exceeds threshold
   */
  private async onThresholdReached(): Promise<void> {
    if (!this.currentTask || this.currentTask.status !== 'running') {
      return
    }

    // Update duration
    if (this.taskStartTime) {
      this.currentTask.duration = Date.now() - this.taskStartTime.getTime()
    }

    // Send progress notification
    await this.sendNotification({
      type: 'task_progress',
      task: this.currentTask,
      actions: [
        { id: 'view', label: '查看详情', value: 'view' },
        { id: 'cancel', label: '取消', value: 'cancel' },
      ],
    })
  }

  // ==========================================================================
  // Notification Sending
  // ==========================================================================

  /**
   * Send a notification to all enabled channels
   *
   * @param message - Notification message
   * @returns Results from each channel
   */
  async sendNotification(message: NotificationMessage): Promise<NotificationResult[]> {
    if (!await this.isEnabled()) {
      return []
    }

    // Check quiet hours
    if (this.isInQuietHours()) {
      return []
    }

    const enabledChannels = await getEnabledChannels()
    const results: NotificationResult[] = []

    for (const channel of enabledChannels) {
      try {
        const result = await this.sendToChannel(channel, message)
        results.push(result)
      }
      catch (error) {
        results.push({
          success: false,
          channel,
          sentAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return results
  }

  /**
   * Send notification to a specific channel
   *
   * @param channel - Target channel
   * @param _message - Notification message (unused in placeholder implementation)
   * @returns Send result
   */
  private async sendToChannel(
    channel: NotificationChannel,
    _message: NotificationMessage,
  ): Promise<NotificationResult> {
    // This will be implemented in cloud-client.ts
    // For now, return a placeholder result
    return {
      success: true,
      channel,
      sentAt: new Date(),
      messageId: `msg_${Date.now()}`,
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(): boolean {
    if (!this.config?.quietHours?.enabled) {
      return false
    }

    const now = new Date()
    const currentHour = now.getHours()
    const { startHour, endHour } = this.config.quietHours

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startHour > endHour) {
      return currentHour >= startHour || currentHour < endHour
    }

    // Normal quiet hours (e.g., 12:00 - 14:00)
    return currentHour >= startHour && currentHour < endHour
  }

  // ==========================================================================
  // Reply Handling
  // ==========================================================================

  /**
   * Register a reply handler
   *
   * @param handler - Handler function
   */
  onReply(handler: ReplyHandler): void {
    this.replyHandlers.add(handler)
  }

  /**
   * Unregister a reply handler
   *
   * @param handler - Handler function to remove
   */
  offReply(handler: ReplyHandler): void {
    this.replyHandlers.delete(handler)
  }

  /**
   * Process a user reply
   *
   * @param reply - User reply
   */
  async handleReply(reply: UserReply): Promise<void> {
    for (const handler of this.replyHandlers) {
      try {
        await handler(reply)
      }
      catch (error) {
        console.error('Reply handler error:', error)
      }
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Cleanup and shutdown the notification manager
   */
  async shutdown(): Promise<void> {
    this.clearThresholdTimer()
    this.replyHandlers.clear()
    this.currentTask = null
    this.taskStartTime = null
    this.isInitialized = false
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    if (NotificationManager.instance) {
      NotificationManager.instance.shutdown()
      NotificationManager.instance = null
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the notification manager instance
 */
export function getNotificationManager(): NotificationManager {
  return NotificationManager.getInstance()
}

/**
 * Initialize the notification system
 */
export async function initializeNotifications(): Promise<void> {
  const manager = getNotificationManager()
  await manager.initialize()
}

/**
 * Start monitoring a task
 */
export async function startTaskMonitoring(taskId: string, description: string): Promise<void> {
  const manager = getNotificationManager()
  await manager.startTask(taskId, description)
}

/**
 * Complete the current task
 */
export async function completeTaskMonitoring(result?: string): Promise<NotificationResult[]> {
  const manager = getNotificationManager()
  return manager.completeTask(result)
}

/**
 * Fail the current task
 */
export async function failTaskMonitoring(error: string): Promise<NotificationResult[]> {
  const manager = getNotificationManager()
  return manager.failTask(error)
}

/**
 * Cancel the current task
 */
export async function cancelTaskMonitoring(): Promise<void> {
  const manager = getNotificationManager()
  await manager.cancelTask()
}
