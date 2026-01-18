/**
 * Modern Clack-based Prompt System
 * Entry point for CCJK v4.0.0 prompt system
 */

// Export modern prompts
export {
  error,
  handleCancel,
  initPrompts,
  isCancel,
  log,
  note,
  outroPrompts,
  promptAiOutputLanguage,
  promptApiConfiguration,
  promptConfirm,
  promptConfirmation,
  promptFeatureSelection,
  promptLanguageSelection,
  promptMultiSelect,
  promptPassword,
  promptProjectSetup,
  promptSelect,
  promptText,
  spinner,
  step,
  success,
  warn,
  withProgress,
  withSteps,
} from './modern'

// Export task execution
export {
  executeTask,
  executeTaskGroups,
  executeTasks,
  executeTasksParallel,
  executeTasksWithProgress,
  executeTaskWithRetry,
  executeTaskWithTimeout,
  showTaskSummary,
  TaskProgressTracker,
} from './tasks'

// Export all types
export type * from './types'
