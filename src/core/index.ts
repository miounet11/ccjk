/**
 * CCJK Core - 核心模块导出
 *
 * 包含：
 * - ZeroConfig: 零配置系统
 * - MCPOptimizer: MCP 配置优化器
 */

export * from './mcp-optimizer'
export { default as MCPOptimizer } from './mcp-optimizer'

export * from './zero-config'
// 默认导出
export { default as ZeroConfig } from './zero-config'
