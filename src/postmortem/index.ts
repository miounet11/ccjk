/**
 * Postmortem Intelligence System
 * 尸检报告智能系统 - 从历史 bug 中学习
 *
 * 核心功能:
 * 1. 分析历史 fix commits 生成 Postmortem 报告
 * 2. 自动同步到 CLAUDE.md 指导 AI 开发
 * 3. Pre-release 检查防止重复犯错
 * 4. Post-release 分析持续学习
 * 5. 启动时自动加载（MiroThinker 策略）
 */

// Analyzer
export { PostmortemAnalyzer } from './analyzer'

// Auto-Loader (启动时自动加载)
export {
  autoLoadPostmortem,
  generatePostmortemContext,
  hasPostmortemInClaudeMd,
  isPostmortemInitialized,
  type PostmortemAutoLoadConfig,
  type PostmortemLoadResult,
  quickLoadPostmortem,
} from './auto-loader'

// Manager
export { getPostmortemManager, PostmortemManager } from './manager'

// Types
export type {
  ClaudeMdInjection,
  CodeCheckResult,
  CommitInfo,
  DetectionPattern,
  FixCommitAnalysis,
  PostmortemCategory,
  PostmortemCheckReport,
  PostmortemConfig,
  PostmortemEvent,
  PostmortemHook,
  PostmortemIndex,
  PostmortemMeta,
  PostmortemReport,
  PostmortemSeverity,
  PostmortemStatus,
  ReleaseSummary,
} from './types'
