/**
 * Decay Scheduler - Manages confidence decay for memory nodes
 *
 * Features:
 * - Manual decay execution
 * - Optional scheduled decay (user must explicitly start)
 * - Clear user feedback
 * - Graceful shutdown
 */

import cron from 'node-cron';
import { MemoryTree } from './memory-tree';

export interface DecayResult {
  decayed: number;
  archived: number;
  details: Record<string, number>;
}

export class DecayScheduler {
  private memoryTree: MemoryTree;
  private task: cron.ScheduledTask | null = null;
  private archiveThreshold: number;

  constructor(memoryTree: MemoryTree, archiveThreshold: number = 0.3) {
    this.memoryTree = memoryTree;
    this.archiveThreshold = archiveThreshold;
  }

  /**
   * Start scheduled decay (user must explicitly call this)
   */
  start(schedule: string = '0 2 * * *'): void {
    if (this.task) {
      console.warn('[CCJK Context] Decay scheduler already running');
      return;
    }

    // Validate cron expression
    if (!cron.validate(schedule)) {
      throw new Error(`Invalid cron expression: ${schedule}`);
    }

    console.log(`[CCJK Context] Starting decay scheduler: ${schedule}`);
    console.log('[CCJK Context] This will run in the background. Use .stop() to disable.');

    this.task = cron.schedule(schedule, async () => {
      console.log('[CCJK Context] Running scheduled decay...');

      try {
        const result = await this.runDecay();
        console.log(`[CCJK Context] Decayed ${result.decayed} nodes, archived ${result.archived} nodes`);
      } catch (err) {
        console.error('[CCJK Context] Decay error:', err);
      }
    });
  }

  /**
   * Stop scheduled decay
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[CCJK Context] Decay scheduler stopped');
    }
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.task !== null;
  }

  /**
   * Run decay manually
   */
  async runNow(): Promise<DecayResult> {
    return this.runDecay();
  }

  /**
   * Preview what would be decayed (dry run)
   */
  async preview(): Promise<{
    wouldDecay: number;
    wouldArchive: number;
    stats: any;
  }> {
    const stats = this.memoryTree.getStats();

    return {
      wouldDecay: stats.totalNodes - stats.byPriority['P0'] || 0,
      wouldArchive: stats.brownLeaves,
      stats
    };
  }

  /**
   * Internal decay execution
   */
  private async runDecay(): Promise<DecayResult> {
    // Run confidence decay
    const decayResult = this.memoryTree.decay();

    // Archive low-confidence nodes
    const archived = this.memoryTree.archiveLowConfidence(this.archiveThreshold);

    return {
      decayed: decayResult.decayed,
      archived,
      details: decayResult.details
    };
  }
}
