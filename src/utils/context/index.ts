/**
 * Context Compression System - Utilities
 * Module exports for context management utilities
 */

// Re-export types from context.ts
export type {
  FCSummary,
  RetryConfig,
  SessionConfig,
  SessionEvent,
  SessionEventType,
  SessionStatus,
  SummarizationRequest,
  SummarizationResponse,
  ThresholdLevel,
  TokenEstimation,
} from '../../types/context'
export * from './api-client'
// CLI Wrapper - Transparent proxy for Claude Code
export * from './cli-wrapper'
// Cloud Sync - Cross-device synchronization
export * from './cloud-sync'
export {
  ConfigManager,
  createConfigManager,
  DEFAULT_CONTEXT_CONFIG,
  getConfig,
  getConfigManager,
  loadConfig,
  resetConfig,
  saveConfig,
} from './config-manager'
// Context Manager - Main orchestrator
export * from './context-manager'

// Intelligent Fusion Layer
export {
  createIntelligentFusionManager,
  getFusionManager,
  IntelligentFusionManager,
  resetFusionManager,
} from './intelligent-fusion'

export type {
  FusionConfig,
  LearningEvent,
  OptimizationRequest,
  OptimizedContext,
} from './intelligent-fusion'

// Advanced Context Compression (Engram-Inspired)
export {
  createLayeredMemoryManager,
  LayeredMemoryManager,
} from './layered-memory'

export type {
  CodePattern,
  CommandTemplate,
  CompressedContext,
  DecisionRecord,
  DynamicContext,
  ErrorInfo,
  LayeredMemory,
  ProjectNode,
  RelevanceScore,
  SessionCache,
  StaticKnowledge,
} from './layered-memory'

// MiroThinker Context Compressor (去肉留骨策略)
export {
  compressConversation,
  createMiroThinkerCompressor,
  generateCompressionReport,
  MiroThinkerCompressor,
} from './miro-thinker'

export type {
  CompressedConversation,
  ConversationMessage,
  MessageRole,
  MiroThinkerConfig,
} from './miro-thinker'

// Multi-Head Compressor (mHC-Inspired)
export {
  createMultiHeadCompressor,
  MultiHeadCompressor,
} from './multi-head-compressor'

export type {
  CompressedOutput,
  CompressedSegment,
  CompressionHead,
  FileContext,
  MultiHeadCompressorConfig,
  RawContext,
} from './multi-head-compressor'

export {
  extractProjectHashFromPath,
  generateProjectHash,
  getProjectIdentity,
  isValidProjectHash,
  projectHashCache,
} from './project-hash'

export * from './session-manager'

export * from './shell-hook'

// Local storage system exports
export {
  createStorageManager,
  getStorageManager,
  StorageManager,
} from './storage-manager'

// Storage type exports
export type {
  CleanupResult,
  ContextConfig,
  CurrentSessionPointer,
  FCLogEntry,
  FCLogQueryOptions,
  FCStatus,
  SessionListOptions,
  SessionMeta,
  StorageResult,
  StorageStats,
  SyncQueueItem,
  SyncStatus,
} from './storage-types'

// Re-export Session from storage-types (more complete definition)
export type { Session } from './storage-types'

export * from './summarizer'

export {
  createSyncQueueManager,
  SyncQueueManager,
} from './sync-queue'

export * from './token-estimator'
