/**
 * CCJK Error Prevention System
 * 智能错误预防系统 - 彻底杜绝 Claude Code CLI 常见错误
 */

export * from './middleware'
export { ErrorPreventionMiddleware, getMiddleware, resetMiddleware } from './middleware'
export * from './smart-bash-tool'
export { SmartBashTool } from './smart-bash-tool'
export * from './smart-path-resolver'

export { SmartPathResolver } from './smart-path-resolver'
export * from './smart-write-tool'
export { SmartWriteTool } from './smart-write-tool'
export * from './types'

// Re-export commonly used types
export type {
  BashOptions,
  BashResult,
  ErrorAnalysis,
  ErrorType,
  PathOptions,
  PathResult,
  WriteOptions,
  WriteResult,
} from './types'
