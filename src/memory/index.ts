/**
 * Memory System - Cross-session AI memory for Claude Code
 *
 * This module provides persistent memory storage and retrieval across sessions,
 * enabling Claude to remember decisions, patterns, preferences, and context.
 */

export type {
  CapturePattern,
  MemoryConfig,
  MemoryEmbedding,
  MemoryEntry,
  MemoryExport,
  MemoryImportance,
  MemoryIndex,
  MemoryInjection,
  MemoryInjectionContext,
  MemoryQuery,
  MemoryResult,
  MemoryScope,
  MemorySource,
  MemoryStats,
  MemoryType,
} from '../types/memory'
export { DEFAULT_MEMORY_CONFIG } from '../types/memory'
export { AutoCapture } from './auto-capture'
export { EmbeddingService } from './embedding'
export { MemoryManager } from './manager'

export { MemoryRetrieval } from './retrieval'

export { MemoryStore } from './store'
