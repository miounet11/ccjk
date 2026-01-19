/**
 * Unified version check scheduler
 * Handles scheduled version checks and auto-updates
 */

import { EventEmitter } from 'events';
import { ScheduleConfig, UpdateEvent, UpdateEventType } from './types';
import { VersionChecker } from './checker';
import { VersionUpdater } from './updater';

/**
 * Scheduler for automated version checks
 */
export class VersionScheduler extends EventEmitter {
  private schedules: Map<string, ScheduleConfig>;
  private timers: Map<string, NodeJS.Timeout>;
  private checker: VersionChecker;
  private updater: VersionUpdater;
  private running: boolean = false;

  constructor(checker: VersionChecker, updater: VersionUpdater) {
    super();
    this.schedules = new Map();
    this.timers = new Map();
    this.checker = checker;
    this.updater = updater;
  }

  /**
   * Schedule version check for a tool
   */
  scheduleCheck(
    tool: string,
    interval: number,
    autoUpdate: boolean = false
  ): void {
    // Cancel existing schedule if any
    this.cancelSchedule(tool);

    const config: ScheduleConfig = {
      tool,
      interval,
      enabled: true,
      autoUpdate,
      nextCheck: new Date(Date.now() + interval),
    };

    this.schedules.set(tool, config);

    // Start the schedule
    if (this.running) {
      this.startSchedule(tool, config);
    }
  }

  /**
   * Cancel schedule for a tool
   */
  cancelSchedule(tool: string): void {
    const timer = this.timers.get(tool);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(tool);
    }

    const config = this.schedules.get(tool);
    if (config) {
      config.enabled = false;
    }
  }

  /**
   * Start scheduler
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;

    // Start all enabled schedules
    for (const [tool, config] of this.schedules.entries()) {
      if (config.enabled) {
        this.startSchedule(tool, config);
      }
    }

    this.emit('scheduler-started');
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    this.emit('scheduler-stopped');
  }

  /**
   * Start individual schedule
   */
  private startSchedule(tool: string, config: ScheduleConfig): void {
    const checkAndScheduleNext = async () => {
      try {
        // Emit check started event
        this.emitEvent('check-started', tool);

        // Perform version check
        const versionInfo = await this.checker.checkVersion(tool, {
          force: true,
        });

        config.lastCheck = new Date();
        config.nextCheck = new Date(Date.now() + config.interval);

        // Emit check completed event
        this.emitEvent('check-completed', tool, versionInfo);

        // Check if update is available
        if (versionInfo.updateAvailable) {
          this.emitEvent('update-available', tool, versionInfo);

          // Auto-update if enabled
          if (config.autoUpdate && versionInfo.latestVersion) {
            try {
              this.emitEvent('update-started', tool, versionInfo);

              await this.updater.update(tool, versionInfo.latestVersion, {
                backup: true,
                onProgress: (status) => {
                  this.emitEvent('update-progress', tool, status);
                },
              });

              this.emitEvent('update-completed', tool, versionInfo);
            } catch (error) {
              this.emitEvent('update-failed', tool, {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
        }
      } catch (error) {
        this.emitEvent('check-failed', tool, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Schedule next check if still enabled and running
      if (config.enabled && this.running) {
        const timer = setTimeout(checkAndScheduleNext, config.interval);
        this.timers.set(tool, timer);
      }
    };

    // Start first check
    const timer = setTimeout(checkAndScheduleNext, 0);
    this.timers.set(tool, timer);
  }

  /**
   * Get schedule configuration for a tool
   */
  getSchedule(tool: string): ScheduleConfig | undefined {
    return this.schedules.get(tool);
  }

  /**
   * Get all schedules
   */
  getAllSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get enabled schedules
   */
  getEnabledSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values()).filter((s) => s.enabled);
  }

  /**
   * Update schedule configuration
   */
  updateSchedule(tool: string, updates: Partial<ScheduleConfig>): void {
    const config = this.schedules.get(tool);
    if (!config) {
      throw new Error(`No schedule found for ${tool}`);
    }

    // Update configuration
    Object.assign(config, updates);

    // Restart schedule if interval changed
    if (updates.interval !== undefined && config.enabled && this.running) {
      this.cancelSchedule(tool);
      this.startSchedule(tool, config);
    }
  }

  /**
   * Enable schedule for a tool
   */
  enableSchedule(tool: string): void {
    const config = this.schedules.get(tool);
    if (!config) {
      throw new Error(`No schedule found for ${tool}`);
    }

    config.enabled = true;

    if (this.running) {
      this.startSchedule(tool, config);
    }
  }

  /**
   * Disable schedule for a tool
   */
  disableSchedule(tool: string): void {
    this.cancelSchedule(tool);
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get time until next check for a tool
   */
  getTimeUntilNextCheck(tool: string): number | null {
    const config = this.schedules.get(tool);
    if (!config || !config.nextCheck) {
      return null;
    }

    const now = Date.now();
    const nextCheck = config.nextCheck.getTime();
    const remaining = nextCheck - now;

    return remaining > 0 ? remaining : 0;
  }

  /**
   * Trigger immediate check for a tool
   */
  async triggerCheck(tool: string): Promise<void> {
    const config = this.schedules.get(tool);
    if (!config) {
      throw new Error(`No schedule found for ${tool}`);
    }

    try {
      this.emitEvent('check-started', tool);

      const versionInfo = await this.checker.checkVersion(tool, {
        force: true,
      });

      config.lastCheck = new Date();

      this.emitEvent('check-completed', tool, versionInfo);

      if (versionInfo.updateAvailable) {
        this.emitEvent('update-available', tool, versionInfo);
      }
    } catch (error) {
      this.emitEvent('check-failed', tool, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Trigger immediate check for all scheduled tools
   */
  async triggerAllChecks(): Promise<void> {
    const tools = Array.from(this.schedules.keys());
    await Promise.allSettled(tools.map((tool) => this.triggerCheck(tool)));
  }

  /**
   * Remove schedule for a tool
   */
  removeSchedule(tool: string): void {
    this.cancelSchedule(tool);
    this.schedules.delete(tool);
  }

  /**
   * Clear all schedules
   */
  clearAllSchedules(): void {
    this.stop();
    this.schedules.clear();
    this.timers.clear();
  }

  /**
   * Export schedules to JSON
   */
  exportSchedules(): string {
    const data = Array.from(this.schedules.values()).map((config) => ({
      ...config,
      lastCheck: config.lastCheck?.toISOString(),
      nextCheck: config.nextCheck?.toISOString(),
    }));

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import schedules from JSON
   */
  importSchedules(json: string): void {
    try {
      const data = JSON.parse(json);

      for (const item of data) {
        const config: ScheduleConfig = {
          ...item,
          lastCheck: item.lastCheck ? new Date(item.lastCheck) : undefined,
          nextCheck: item.nextCheck ? new Date(item.nextCheck) : undefined,
        };

        this.schedules.set(config.tool, config);

        if (config.enabled && this.running) {
          this.startSchedule(config.tool, config);
        }
      }
    } catch (error) {
      throw new Error(`Failed to import schedules: ${error}`);
    }
  }

  /**
   * Get schedule statistics
   */
  getStats() {
    const schedules = Array.from(this.schedules.values());

    return {
      totalSchedules: schedules.length,
      enabledSchedules: schedules.filter((s) => s.enabled).length,
      disabledSchedules: schedules.filter((s) => !s.enabled).length,
      autoUpdateEnabled: schedules.filter((s) => s.autoUpdate).length,
      running: this.running,
    };
  }

  /**
   * Emit update event
   */
  private emitEvent(type: UpdateEventType, tool: string, data?: any): void {
    const event: UpdateEvent = {
      type,
      tool,
      data,
      timestamp: new Date(),
    };

    this.emit('update-event', event);
    this.emit(type, event);
  }
}
