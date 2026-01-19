/**
 * Unified Version Management System
 *
 * Consolidates version checking, updating, and scheduling into a single API.
 * Reduces duplicate code and network calls through smart caching.
 *
 * @example
 * ```typescript
 * import { createVersionService } from './version-system';
 *
 * const service = createVersionService();
 *
 * // Check version
 * const info = await service.checkVersion('claude-code');
 * console.log(info.updateAvailable);
 *
 * // Update tool
 * await service.updateTool('claude-code');
 *
 * // Schedule checks
 * service.scheduleCheck('claude-code', 3600000); // Check every hour
 * service.startScheduler();
 * ```
 */

// Core service
export { VersionService, createVersionService } from './service';

// Components
export { VersionCache } from './cache';
export { VersionChecker } from './checker';
export { VersionUpdater } from './updater';
export { VersionScheduler } from './scheduler';

// Types
export type {
  VersionInfo,
  UpdateStatus,
  VersionCacheEntry,
  VersionCheckOptions,
  UpdateOptions,
  ScheduleConfig,
  VersionServiceConfig,
  VersionServiceStats,
  BatchCheckResult,
  UpdateEvent,
  UpdateEventType,
  VersionComparison,
  IVersionSource,
  IVersionUpdater,
} from './types';
