/**
 * CCJK Core - 核心模块导出
 *
 * 包含：
 * - ZeroConfig: 零配置系统
 * - MCPOptimizer: MCP 配置优化器
 * - McpSearch: MCP 工具搜索自动模式 (v3.8+)
 * - LspClient: LSP 客户端包装器 (v3.8+)
 * - LspManager: LSP 服务器管理器 (v3.8+)
 * - ErrorBoundary: 统一错误处理 (v3.8+)
 * - CliGuard: CLI 保护机制 (v3.8+)
 * - LazyLoader: 延迟加载系统 (v3.8+)
 * - ConfigCache: 配置缓存系统 (v3.8+)
 */

export * from './cli-guard'
export { CliGuard } from './cli-guard'

export * from './config-cache'
export { clearCache, ConfigCache, getCacheStats, getConfigCache, invalidateCache } from './config-cache'

// Error handling & performance (v3.8+)
export * from './error-boundary'
export { ApiKeyError, CcjkError, ConfigError, ErrorBoundary, FileNotFoundError, NetworkError, ValidationError } from './error-boundary'

export * from './lazy-loader'
export { LazyLoader } from './lazy-loader'

// LSP exports (v3.8+)
export * from './lsp-client'
export { createLspClient, LspClient } from './lsp-client'

export * from './lsp-manager'
export { getLspManager, LspManager, resetLspManager } from './lsp-manager'

export * from './mcp-optimizer'
export { default as MCPOptimizer } from './mcp-optimizer'

export * from './mcp-search'
export { default as McpSearch } from './mcp-search'

export * from './zero-config'
export { default as ZeroConfig } from './zero-config'
