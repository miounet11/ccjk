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

// Components
export { VersionCache } from './cache'

export { VersionChecker } from './checker'
export { VersionScheduler } from './scheduler'
// Core service
export { createVersionService, VersionService } from './service'
// Types
export type {
  BatchCheckResult,
  IVersionSource,
  IVersionUpdater,
  ScheduleConfig,
  UpdateEvent,
  UpdateEventType,
  UpdateOptions,
  UpdateStatus,
  VersionCacheEntry,
  VersionCheckOptions,
  VersionComparison,
  VersionInfo,
  VersionServiceConfig,
  VersionServiceStats,
} from './types'

export { VersionUpdater } from './updater'
