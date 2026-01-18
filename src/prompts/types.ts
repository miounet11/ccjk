/**
 * Modern Clack-based Prompt System Types
 * Type definitions for the CCJK v4.0.0 prompt system
 */

import type { SupportedLang } from '../constants'

/**
 * Project setup configuration
 */
export interface ProjectSetupConfig {
  projectName: string
  codeType: 'claude-code' | 'codex'
  language: SupportedLang
  aiOutputLanguage: string
  features: string[]
}

/**
 * API configuration options
 */
export interface ApiConfigOptions {
  type: 'auth_token' | 'api_key' | 'ccr_proxy' | 'skip'
  authToken?: string
  apiKey?: string
  ccrProxy?: {
    host: string
    port: number
  }
  provider?: string
}

/**
 * Feature selection options
 */
export interface FeatureOption {
  value: string
  label: string
  hint?: string
  selected?: boolean
}

/**
 * Task execution options
 */
export interface TaskOptions {
  title: string
  task: () => Promise<void>
  enabled?: boolean
}

/**
 * Task group for sequential execution
 */
export interface TaskGroup {
  title: string
  tasks: TaskOptions[]
}

/**
 * Confirmation options
 */
export interface ConfirmOptions {
  message: string
  initialValue?: boolean
  active?: string
  inactive?: string
}

/**
 * Select options
 */
export interface SelectOption<T = string> {
  value: T
  label: string
  hint?: string
}

/**
 * Multi-select options
 */
export interface MultiSelectOption<T = string> {
  value: T
  label: string
  hint?: string
  selected?: boolean
}

/**
 * Text input options
 */
export interface TextInputOptions {
  message: string
  placeholder?: string
  initialValue?: string
  validate?: (value: string) => string | void
  defaultValue?: string
}

/**
 * Password input options
 */
export interface PasswordInputOptions {
  message: string
  validate?: (value: string) => string | void
}

/**
 * Spinner options
 */
export interface SpinnerOptions {
  start: string
  stop?: string
}

/**
 * Progress tracking
 */
export interface ProgressTracker {
  current: number
  total: number
  message: string
}

/**
 * Prompt result with cancellation support
 */
export type PromptResult<T> = T | symbol

/**
 * Prompt group result
 */
export type PromptGroupResult<T> = {
  [K in keyof T]: T[K] | symbol
}
