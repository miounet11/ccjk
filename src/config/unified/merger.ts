/**
 * Smart Configuration Merger
 *
 * Handles intelligent merging of configurations with conflict resolution,
 * array handling strategies, and validation
 */

import type { ClaudeSettings } from '../../types/config'
import type { DeepMergeOptions } from '../../utils/object-utils'
import type { CcjkConfig, ConfigMergeOptions, ConfigValidationError, MergeStrategy, ValidationResult } from './types'

import { deepMerge, isPlainObject } from '../../utils/object-utils'

/**
 * Merge result with metadata
 */
export interface MergeResult<T = unknown> {
  result: T
  conflicts: MergeConflict[]
  warnings: string[]
  sourceInfo: SourceInfo
}

/**
 * Merge conflict information
 */
export interface MergeConflict {
  path: string
  baseValue: unknown
  sourceValue: unknown
  resolvedValue: unknown
  strategy: MergeStrategy
}

/**
 * Source information for merge
 */
export interface SourceInfo {
  baseProvided: boolean
  sourceProvided: boolean
  mergeTime: number
}

/**
 * Default merge options
 */
const DEFAULT_MERGE_OPTIONS: Required<ConfigMergeOptions> = {
  strategy: 'merge',
  priority: 'user',
  arrayMerge: 'unique',
  deep: true,
}

/**
 * Merge two configurations with smart conflict resolution
 */
export function mergeConfigs<T extends Record<string, unknown>>(
  base: T | null,
  source: Partial<T> | null,
  options: ConfigMergeOptions = {},
): MergeResult<T> {
  const opts = { ...DEFAULT_MERGE_OPTIONS, ...options }
  const startTime = Date.now()

  const conflicts: MergeConflict[] = []
  const warnings: string[] = []

  // Handle null cases
  const baseConfig = base || ({} as T)
  const sourceConfig = source || ({} as Partial<T>)

  // Apply merge strategy
  let result: T
  switch (opts.strategy) {
    case 'replace':
      result = { ...baseConfig, ...sourceConfig } as T
      break
    case 'preserve':
      result = mergePreserve(baseConfig, sourceConfig, conflicts, opts)
      break
    case 'ask':
      // For 'ask' strategy, we collect conflicts but default to merge
      result = mergeWithConflictTracking(baseConfig, sourceConfig, conflicts, opts)
      if (conflicts.length > 0) {
        warnings.push(`${conflicts.length} conflicts detected. Review resolved values.`)
      }
      break
    case 'merge':
    default:
      result = mergeWithConflictTracking(baseConfig, sourceConfig, conflicts, opts)
      break
  }

  return {
    result,
    conflicts,
    warnings,
    sourceInfo: {
      baseProvided: base !== null,
      sourceProvided: source !== null,
      mergeTime: Date.now() - startTime,
    },
  }
}

/**
 * Merge with conflict tracking (deep merge with customizable array handling)
 */
function mergeWithConflictTracking<T extends Record<string, unknown>>(
  base: T,
  source: Partial<T>,
  conflicts: MergeConflict[],
  options: Required<ConfigMergeOptions>,
): T {
  const deepOptions: DeepMergeOptions = {
    mergeArrays: true,
    arrayMergeStrategy: options.arrayMerge,
  }

  return deepMerge(base, source, deepOptions)
}

/**
 * Preserve strategy - only add new keys, never override existing
 */
function mergePreserve<T extends Record<string, unknown>>(
  base: T,
  source: Partial<T>,
  conflicts: MergeConflict[],
  options: Required<ConfigMergeOptions>,
): T {
  const result = { ...base }

  for (const key in source) {
    if (!(key in result)) {
      (result as any)[key] = source[key]
    }
    else if (options.deep && isPlainObject(source[key]) && isPlainObject(result[key])) {
      (result as any)[key] = mergePreserve(
        result[key] as Record<string, unknown>,
        source[key] as Partial<Record<string, unknown>>,
        conflicts,
        options,
      )
    }
  }

  return result
}

/**
 * Merge Claude settings with special handling for sensitive fields
 */
export function mergeClaudeSettings(
  base: ClaudeSettings | null,
  source: Partial<ClaudeSettings> | null,
  options: ConfigMergeOptions = {},
): MergeResult<ClaudeSettings> {
  const opts = { ...DEFAULT_MERGE_OPTIONS, ...options }

  // Special handling for env variables - user values always win
  const mergeResult = mergeConfigs(base || {}, source || {}, opts)

  // Ensure env is handled correctly
  if (base?.env && source?.env) {
    mergeResult.result.env = {
      ...source.env,
      ...base.env, // User env vars take priority
    }
  }
  else if (source?.env) {
    mergeResult.result.env = { ...source.env }
  }
  else if (base?.env) {
    mergeResult.result.env = { ...base.env }
  }

  // Special handling for permissions - unique merge
  if (base?.permissions?.allow && source?.permissions?.allow) {
    mergeResult.result.permissions = mergeResult.result.permissions || {}
    mergeResult.result.permissions.allow = mergeArraysUnique(
      base.permissions.allow,
      source.permissions.allow,
    )
  }

  return mergeResult as MergeResult<ClaudeSettings>
}

/**
 * Merge CCJK config with special handling
 */
export function mergeCcjkConfig(
  base: CcjkConfig | null,
  source: Partial<CcjkConfig> | null,
  options: ConfigMergeOptions = {},
): MergeResult<CcjkConfig> {
  const opts = { ...DEFAULT_MERGE_OPTIONS, ...options }

  // For CCJK config, preserve user's general settings
  const mergeResult = mergeConfigs<Record<string, unknown>>((base || {}) as Record<string, unknown>, (source || {}) as Record<string, unknown>, opts)

  // Ensure general section preserves user preferences
  if (base?.general && source?.general) {
    const result = mergeResult.result as unknown as CcjkConfig
    result.general = {
      ...source.general,
      // Preserve these user preferences
      preferredLang: base.general.preferredLang,
      currentTool: base.general.currentTool,
    }
  }

  return mergeResult as unknown as MergeResult<CcjkConfig>
}

/**
 * Merge arrays with unique values
 */
export function mergeArraysUnique<T>(arr1: T[], arr2: T[]): T[] {
  const combined = [...(arr1 || []), ...(arr2 || [])]
  return Array.from(new Set(combined))
}

/**
 * Detect conflicts between two configurations
 */
export function detectConflicts<T extends Record<string, unknown>>(
  base: T | null,
  source: Partial<T> | null,
): MergeConflict[] {
  const conflicts: MergeConflict[] = []

  if (!base || !source) {
    return conflicts
  }

  for (const key in source) {
    if (key in base && base[key] !== source[key]) {
      conflicts.push({
        path: key,
        baseValue: base[key],
        sourceValue: source[key],
        resolvedValue: source[key], // Default: source wins
        strategy: 'merge',
      })
    }
  }

  return conflicts
}

/**
 * Validate merged configuration
 */
export function validateMergedConfig<T extends Record<string, unknown>>(
  config: T,
  validators: ConfigValidator<T>[] = [],
): ValidationResult {
  const errors: ConfigValidationError[] = []
  const warnings: ConfigValidationError[] = []

  for (const validator of validators) {
    try {
      const result = validator.validate(config)
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    }
    catch (error) {
      errors.push({
        path: 'validation',
        message: error instanceof Error ? error.message : String(error),
        code: 'validator_error',
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Config validator interface
 */
export interface ConfigValidator<T = unknown> {
  name: string
  validate: (config: T) => ValidationResult
}

/**
 * Schema-based validator
 */
export class SchemaValidator<T extends Record<string, unknown>> implements ConfigValidator<T> {
  name = 'schema'

  constructor(
    private schema: ValidationSchema<T>,
  ) {}

  validate(config: T): ValidationResult {
    const errors: ConfigValidationError[] = []
    const warnings: ConfigValidationError[] = []

    for (const key in this.schema) {
      const fieldSchema = this.schema[key]
      if (!fieldSchema) {
        continue
      }

      // Check required
      if (fieldSchema.required && !(key in config)) {
        errors.push({
          path: key,
          message: `Required field missing`,
          code: 'required',
        })
        continue
      }

      const value = (config as any)[key]
      if (value === undefined) {
        continue
      }

      // Type validation
      if (fieldSchema.type && typeof value !== fieldSchema.type) {
        errors.push({
          path: key,
          message: `Expected ${fieldSchema.type}, got ${typeof value}`,
          code: 'type_mismatch',
          value,
        })
      }

      // Enum validation
      if (fieldSchema.enum && !fieldSchema.enum.includes(value as any)) {
        errors.push({
          path: key,
          message: `Value must be one of: ${fieldSchema.enum.join(', ')}`,
          code: 'invalid_enum',
          value,
        })
      }

      // Custom validator
      if (fieldSchema.validator) {
        const result = fieldSchema.validator(value as any, config as any)
        if (!result.valid) {
          errors.push({
            path: key,
            message: result.message || 'Validation failed',
            code: result.code || 'custom_validation_failed',
            value,
          })
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings }
  }
}

/**
 * Validation schema definition
 */
export type ValidationSchema<T extends Record<string, unknown>> = {
  [K in keyof T]?: FieldSchema<T[K]>
}

/**
 * Field schema definition
 */
export interface FieldSchema<T> {
  type?: string
  required?: boolean
  enum?: T[]
  validator?: (value: T, config: T) => { valid: boolean, message?: string, code?: string }
}

/**
 * Apply merge result with validation
 */
export function applyMergeWithValidation<T extends Record<string, unknown>>(
  base: T | null,
  source: Partial<T> | null,
  options: ConfigMergeOptions = {},
  validators: ConfigValidator<T>[] = [],
): { result: T, validation: ValidationResult, mergeInfo: MergeResult<T> } {
  const mergeInfo = mergeConfigs(base, source, options)
  const validation = validateMergedConfig(mergeInfo.result, validators)

  return {
    result: mergeInfo.result,
    validation,
    mergeInfo,
  }
}

/**
 * Create a preset merger for specific use cases
 */
export function createMerger<T extends Record<string, unknown>>(
  defaultOptions: ConfigMergeOptions,
  defaultValidators: ConfigValidator<T>[] = [],
) {
  return {
    merge: (base: T | null, source: Partial<T> | null, options?: ConfigMergeOptions) =>
      mergeConfigs(base, source, { ...defaultOptions, ...options }),
    mergeWithValidation: (base: T | null, source: Partial<T> | null, options?: ConfigMergeOptions) =>
      applyMergeWithValidation(base, source, { ...defaultOptions, ...options }, defaultValidators),
    validate: (config: T) => validateMergedConfig(config, defaultValidators),
  }
}

/**
 * Predefined mergers for common use cases
 */
export const PresetMergers = {
  /**
   * Template merger - templates provide defaults but user config wins
   */
  template: createMerger<ClaudeSettings>(
    { strategy: 'merge', priority: 'user', arrayMerge: 'unique', deep: true },
    [],
  ),

  /**
   * Update merger - new config updates replace old values
   */
  update: createMerger<ClaudeSettings>(
    { strategy: 'merge', priority: 'user', arrayMerge: 'replace', deep: true },
    [],
  ),

  /**
   * Safe merger - preserve existing values
   */
  safe: createMerger<ClaudeSettings>(
    { strategy: 'preserve', priority: 'user', arrayMerge: 'concat', deep: true },
    [],
  ),
}
