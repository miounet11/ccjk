/**
 * Utils Module
 * Centralized utility functions organized by category
 *
 * This module provides a comprehensive set of utility functions
 * organized into logical categories for better navigation and
 * developer experience.
 */

// Configuration utilities
export * as config from './config';

// Platform utilities
export * as platform from './platform';

// Command execution utilities
export * as command from './command';

// File system utilities
export * as fs from './file-system';

// Validation utilities
export * as validation from './validation';

// String utilities
export * as string from './string';

// Object utilities
export * as object from './object';

// Array utilities
export * as array from './array';

// Async utilities
export * as async from './async';

// Error utilities
export * as error from './error';

// Logger utilities
export * as loggerUtils from './logger';

/**
 * Re-export commonly used utilities for convenience
 */

// Config
export { ConfigManager, createConfigManager } from './config/manager';
export { ConfigValidator, createValidator, validators } from './config/validator';

// Platform
export {
  getPlatform,
  getArchitecture,
  isMacOS,
  isLinux,
  isWindows,
  isUnix,
  getPlatformInfo,
} from './platform/detection';
export {
  getHomeDir,
  getConfigDir,
  getDataDir,
  getCacheDir,
  getTempDir,
} from './platform/paths';

// Command
export {
  executeCommand,
  executeCommandStream,
  commandExists,
  getCommandPath,
  getCommandVersion,
} from './command/executor';

// File System
export {
  exists,
  isFile,
  isDirectory,
  ensureDir,
  readFile,
  writeFile,
  readJSON,
  writeJSON,
  copyFile,
  moveFile,
  deleteFile,
  deleteDir,
  listFiles,
  listDirs,
} from './file-system/operations';

// Validation
export {
  isDefined,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isEmail,
  isURL,
  assertDefined,
  assert,
} from './validation/validators';

// String
export {
  capitalize,
  camelCase,
  pascalCase,
  snakeCase,
  kebabCase,
  truncate,
  slugify,
  template,
} from './string/formatters';

// Object
export {
  deepClone,
  deepMerge,
  get,
  set,
  has,
  pick,
  omit,
  flatten,
  unflatten,
} from './object/operations';

// Array
export {
  unique,
  flatten as flattenArray,
  chunk,
  shuffle,
  partition,
  intersection,
  union,
  difference,
} from './array/operations';

// Async
export {
  sleep,
  retry,
  timeout,
  debounce,
  throttle,
  parallelLimit,
  sequence,
  waitFor,
  Mutex,
  Semaphore,
} from './async/helpers';

// Error
export {
  BaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  TimeoutError,
  InternalError,
  ConfigurationError,
  getErrorMessage,
  formatError,
  wrapError,
  tryCatch,
  tryCatchAsync,
} from './error/errors';

// Logger
export { Logger, createLogger, logger } from './logger/logger';
