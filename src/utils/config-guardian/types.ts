/**
 * Type definitions for Config Guardian module
 */

/**
 * Information about a command file
 */
export interface CommandFileInfo {
  /** File name (e.g., 'feat.md') */
  name: string
  /** Full path to the file */
  path: string
  /** Whether the file exists */
  exists: boolean
  /** File size in bytes (if exists) */
  size?: number
  /** Last modified timestamp (if exists) */
  lastModified?: Date
}

/**
 * Result of configuration validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean
  /** List of all expected command files */
  expectedFiles: CommandFileInfo[]
  /** List of missing command files */
  missingFiles: CommandFileInfo[]
  /** List of existing command files */
  existingFiles: CommandFileInfo[]
  /** Validation timestamp */
  timestamp: Date
}

/**
 * Result of configuration repair operation
 */
export interface RepairResult {
  /** Whether repair was successful */
  success: boolean
  /** Number of files repaired */
  repairedCount: number
  /** List of repaired files */
  repairedFiles: string[]
  /** List of files that failed to repair */
  failedFiles: string[]
  /** Error messages (if any) */
  errors: string[]
  /** Repair timestamp */
  timestamp: Date
}

/**
 * Overall guardian status
 */
export interface GuardianStatus {
  /** Whether configuration is healthy */
  healthy: boolean
  /** Validation result */
  validation: ValidationResult
  /** Repair result (if repair was performed) */
  repair?: RepairResult
  /** Status message */
  message: string
}
