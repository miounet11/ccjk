/**
 * Subagent management system for Claude Code 2.1.x context: fork feature
 *
 * This module provides comprehensive subagent lifecycle management including:
 * - Fork mode: Create isolated subagent contexts
 * - Inherit mode: Create subagents that inherit parent context
 * - Transcript persistence: Save execution history to JSON/Markdown
 * - Event system: Monitor subagent lifecycle events
 * - Timeout management: Automatic timeout handling
 * - Statistics: Track subagent execution metrics
 *
 * @example
 * ```typescript
 * import { SubagentManager } from './utils/subagent'
 *
 * // Create manager
 * const manager = new SubagentManager({
 *   defaultTimeout: 300000,
 *   maxConcurrent: 10,
 *   autoSaveTranscripts: true
 * })
 *
 * // Create a fork subagent
 * const state = manager.fork({
 *   id: 'code-analyzer',
 *   name: 'Code Analyzer',
 *   mode: 'fork',
 *   skill: {
 *     path: '/path/to/analyzer.md',
 *     name: 'analyzer'
 *   },
 *   initialPrompt: 'Analyze the codebase for security issues'
 * })
 *
 * // Listen to events
 * manager.on('complete', (state) => {
 *   console.log('Subagent completed:', state.result)
 * })
 *
 * manager.on('fail', (state) => {
 *   console.error('Subagent failed:', state.error)
 * })
 *
 * // Add transcript entries
 * manager.addTranscript(state.id, {
 *   timestamp: new Date(),
 *   type: 'assistant',
 *   content: 'Starting security analysis...'
 * })
 *
 * // Complete the subagent
 * manager.complete(state.id, {
 *   issuesFound: 3,
 *   summary: 'Found 3 potential security issues'
 * })
 * ```
 *
 * @module subagent
 */

// Export main manager class
// Import for createSubagentManager
import { SubagentManager } from './manager'

export { SubagentManager } from './manager'

// Export transcript utilities
export {
  cleanupTranscripts,
  getTranscriptStats,
  listTranscripts,
  loadTranscript,
  saveTranscript,
} from './transcript'

// Export all types
export type {
  SkillMdFile,
  SubagentConfig,
  SubagentEvents,
  SubagentManagerOptions,
  SubagentState,
  SubagentStatus,
  TranscriptCleanupOptions,
  TranscriptEntry,
  TranscriptEntryType,
  TranscriptSaveOptions,
} from './types'

/**
 * Create a default SubagentManager instance
 *
 * @returns Configured SubagentManager instance
 *
 * @example
 * ```typescript
 * import { createSubagentManager } from './utils/subagent'
 *
 * const manager = createSubagentManager()
 * const state = manager.fork({
 *   id: 'test',
 *   name: 'Test Agent',
 *   mode: 'fork'
 * })
 * ```
 */
export function createSubagentManager(options?: import('./types').SubagentManagerOptions): import('./manager').SubagentManager {
  return new SubagentManager(options)
}
