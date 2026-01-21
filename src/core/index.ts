/**
 * CCJK Core - 核心模块导出
 *
 * 包含：
 * - ZeroConfig: 零配置系统
 * - MCPOptimizer: MCP 配置优化器
 * - McpSearch: MCP 工具搜索自动模式 (v3.8+)
 * - LspClient: LSP 客户端包装器 (v3.8+)
 * - LspManager: LSP 服务器管理器 (v3.8+)
 */

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
// 默认导出
export { default as ZeroConfig } from './zero-config'
