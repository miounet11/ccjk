/**
 * Memory System - Cross-session AI memory for Claude Code
 *
 * This module provides persistent memory storage and retrieval across sessions,
 * enabling Claude to remember decisions, patterns, preferences, and context.
 */

export { MemoryManager } from './manager'
export { MemoryStore } from './store'
export { EmbeddingService } from './embedding'
export { MemoryRetrieval } from './retrieval'
export { AutoCapture } from './auto-capture'

export type {
  MemoryType,
  MemoryImportance,
  MemoryScope,
  MemorySource,
  MemoryEmbedding,
  MemoryEntry,
  MemoryIndex,
  MemoryConfig,
  MemoryQuery,
  MemoryResult,
  MemoryStats,
  CapturePattern,
  MemoryExport,
  MemoryInjectionContext,
  MemoryInjection,
} from '../types/memory'

export { DEFAULT_MEMORY_CONFIG } from '../types/memory'
