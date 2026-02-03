/**
 * Utils Module
 * Centralized utility functions organized by category
 *
 * This module provides a comprehensive set of utility functions
 * organized into logical categories for better navigation and
 * developer experience.
 */

// Array utilities
export * as array from './array'

// Array
export {
  chunk,
  difference,
  flatten as flattenArray,
  intersection,
  partition,
  shuffle,
  union,
  unique,
} from './array/operations'

// Async utilities
export * as async from './async'

// Async
export {
  debounce,
  Mutex,
  parallelLimit,
  retry,
  Semaphore,
  sequence,
  sleep,
  throttle,
  timeout,
  waitFor,
} from './async/helpers'

// Command execution utilities
export * as command from './command'

// Command
export {
  commandExists,
  executeCommand,
  executeCommandStream,
  getCommandPath,
  getCommandVersion,
} from './command/executor'

// Configuration utilities
export * as config from './config'

// Config
export { ConfigManager, createConfigManager } from './config/manager'

export { ConfigValidator, createValidator, validators } from './config/validator'

// Error utilities
export * as error from './error'

// Error
export {
  BaseError,
  ConfigurationError,
  formatError,
  getErrorMessage,
  InternalError,
  NotFoundError,
  TimeoutError,
  tryCatch,
  tryCatchAsync,
  UnauthorizedError,
  ValidationError,
  wrapError,
} from './error/errors'

/**
 * Re-export commonly used utilities for convenience
 */

// File system utilities
export * as fs from './file-system'
// File System
export {
  copyFile,
  deleteDir,
  deleteFile,
  ensureDir,
  exists,
  isDirectory,
  isFile,
  listDirs,
  listFiles,
  moveFile,
  readFile,
  readJSON,
  writeFile,
  writeJSON,
} from './file-system/operations'

// Logger utilities
export * as loggerUtils from './logger'
// Logger
export { createLogger, Logger, logger } from './logger/logger'

// Object utilities
export * as object from './object'

// Object
export {
  deepClone,
  deepMerge,
  flatten,
  get,
  has,
  omit,
  pick,
  set,
  unflatten,
} from './object/operations'

// Platform utilities
export * as platform from './platform'

// Platform
export {
  getArchitecture,
  getPlatform,
  getPlatformInfo,
  isLinux,
  isMacOS,
  isUnix,
  isWindows,
} from './platform/detection'

export {
  getCacheDir,
  getConfigDir,
  getDataDir,
  getHomeDir,
  getTempDir,
} from './platform/paths'

// Stream processor utilities (v3.8+)
export {
  batchProcessFiles,
  type ChunkProcessorOptions,
  countLines,
  type FileInfo,
  getFileInfo,
  getFileSize,
  isLargeFile,
  processLargeFile,
  processLineByLine,
  streamJSON,
  type StreamProcessorOptions,
  streamWriteJSON,
} from './stream-processor'

// String utilities
export * as string from './string'

// String
export {
  camelCase,
  capitalize,
  kebabCase,
  pascalCase,
  slugify,
  snakeCase,
  template,
  truncate,
} from './string/formatters'

// Validation utilities
export * as validation from './validation'

// Validation
export {
  assert,
  assertDefined,
  isArray,
  isBoolean,
  isDefined,
  isEmail,
  isNumber,
  isObject,
  isString,
  isURL,
} from './validation/validators'

// I18n helpers for cloud API multilingual data
export * as i18nHelpers from './i18n-helpers'

export {
  extractDisplayName,
  extractString,
  type MultilingualString,
  normalizeRecommendation,
  normalizeRecommendations,
} from './i18n-helpers'

// Capability discovery utilities
export {
  generateCompactWelcome,
  generateRecommendations,
  generateWelcome,
  getCapabilitiesByType,
  getCapability,
  scanCapabilities,
  type Capability,
  type CapabilityScanResult,
  type CapabilityStatus,
  type CapabilityType,
  type WelcomeOptions,
} from './capability-discovery'
