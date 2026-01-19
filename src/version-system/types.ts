/**
 * Type definitions for the unified version management system
 */

/**
 * Version information for a tool
 */
export interface VersionInfo {
  /** Tool name */
  tool: string;
  /** Current installed version */
  currentVersion?: string;
  /** Latest available version */
  latestVersion?: string;
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Last check timestamp */
  lastChecked: Date;
  /** Whether the tool is installed */
  installed: boolean;
  /** Release notes URL */
  releaseNotesUrl?: string;
  /** Download URL */
  downloadUrl?: string;
}

/**
 * Update status for a tool
 */
export interface UpdateStatus {
  /** Tool name */
  tool: string;
  /** Update status */
  status: 'idle' | 'checking' | 'downloading' | 'installing' | 'completed' | 'failed';
  /** Progress percentage (0-100) */
  progress: number;
  /** Status message */
  message?: string;
  /** Error if failed */
  error?: string;
  /** Start time */
  startTime?: Date;
  /** End time */
  endTime?: Date;
}

/**
 * Version cache entry
 */
export interface VersionCacheEntry {
  /** Version information */
  versionInfo: VersionInfo;
  /** Cache timestamp */
  cachedAt: Date;
  /** Time-to-live in milliseconds */
  ttl: number;
}

/**
 * Version check options
 */
export interface VersionCheckOptions {
  /** Force check even if cached */
  force?: boolean;
  /** Cache TTL in milliseconds (default: 1 hour) */
  cacheTtl?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Include pre-release versions */
  includePrerelease?: boolean;
}

/**
 * Update options
 */
export interface UpdateOptions {
  /** Specific version to update to */
  version?: string;
  /** Force update even if already up-to-date */
  force?: boolean;
  /** Backup before updating */
  backup?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Progress callback */
  onProgress?: (status: UpdateStatus) => void;
}

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  /** Tool name */
  tool: string;
  /** Check interval in milliseconds */
  interval: number;
  /** Whether schedule is enabled */
  enabled: boolean;
  /** Last check time */
  lastCheck?: Date;
  /** Next check time */
  nextCheck?: Date;
  /** Auto-update if available */
  autoUpdate?: boolean;
}

/**
 * Version service configuration
 */
export interface VersionServiceConfig {
  /** Default cache TTL in milliseconds */
  defaultCacheTtl?: number;
  /** Maximum cache size */
  maxCacheSize?: number;
  /** Enable batch checking */
  enableBatchChecking?: boolean;
  /** Batch check interval in milliseconds */
  batchCheckInterval?: number;
  /** Network timeout in milliseconds */
  networkTimeout?: number;
  /** Retry attempts on failure */
  retryAttempts?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

/**
 * Batch check result
 */
export interface BatchCheckResult {
  /** Tools checked */
  tools: string[];
  /** Version information for each tool */
  results: Map<string, VersionInfo>;
  /** Errors encountered */
  errors: Map<string, Error>;
  /** Total time taken in milliseconds */
  duration: number;
  /** Number of cache hits */
  cacheHits: number;
  /** Number of network requests */
  networkRequests: number;
}

/**
 * Version service statistics
 */
export interface VersionServiceStats {
  /** Total version checks */
  totalChecks: number;
  /** Cache hits */
  cacheHits: number;
  /** Cache misses */
  cacheMisses: number;
  /** Network requests */
  networkRequests: number;
  /** Failed checks */
  failedChecks: number;
  /** Average check time in milliseconds */
  averageCheckTime: number;
  /** Total updates performed */
  totalUpdates: number;
  /** Successful updates */
  successfulUpdates: number;
  /** Failed updates */
  failedUpdates: number;
}

/**
 * Version comparison result
 */
export type VersionComparison = 'greater' | 'equal' | 'less' | 'invalid';

/**
 * Update event types
 */
export type UpdateEventType =
  | 'check-started'
  | 'check-completed'
  | 'check-failed'
  | 'update-available'
  | 'update-started'
  | 'update-progress'
  | 'update-completed'
  | 'update-failed';

/**
 * Update event
 */
export interface UpdateEvent {
  /** Event type */
  type: UpdateEventType;
  /** Tool name */
  tool: string;
  /** Event data */
  data?: any;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Version source interface
 */
export interface IVersionSource {
  /** Get latest version for a tool */
  getLatestVersion(tool: string, options?: VersionCheckOptions): Promise<string>;
  /** Get current installed version */
  getCurrentVersion(tool: string): Promise<string | undefined>;
  /** Check if tool is installed */
  isInstalled(tool: string): Promise<boolean>;
  /** Get release notes URL */
  getReleaseNotesUrl(tool: string, version: string): Promise<string | undefined>;
  /** Get download URL */
  getDownloadUrl(tool: string, version: string): Promise<string | undefined>;
}

/**
 * Version updater interface
 */
export interface IVersionUpdater {
  /** Update tool to specific version */
  update(tool: string, version: string, options?: UpdateOptions): Promise<void>;
  /** Check if update is possible */
  canUpdate(tool: string): Promise<boolean>;
  /** Get update command */
  getUpdateCommand(tool: string, version?: string): string;
}
