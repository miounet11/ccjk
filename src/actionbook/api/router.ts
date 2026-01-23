/**
 * Query API Router
 *
 * Main API router that combines all query interfaces.
 */

import type { QueryAPI, ASTNode, SymbolTable, CallGraph, ComplexityMetrics, Pattern } from '../types.js'
import { getGlobalIndex } from '../cache/index.js'

// Import query modules
import * as astQueries from './queries/ast.js'
import * as symbolQueries from './queries/symbols.js'
import * as callGraphQueries from './queries/call-graph.js'

/**
 * Query API implementation
 */
export class QueryAPIRouter implements QueryAPI {
  /**
   * Query AST for a file
   */
  async queryAST(filePath: string, offset?: number): Promise<ASTNode | null> {
    return astQueries.queryAST(filePath, offset)
  }

  /**
   * Query symbol table for a file
   */
  async querySymbols(filePath: string): Promise<SymbolTable | null> {
    return symbolQueries.querySymbols(filePath)
  }

  /**
   * Query call graph for a file
   */
  async queryCallGraph(filePath: string): Promise<CallGraph | null> {
    return callGraphQueries.queryCallGraph(filePath)
  }

  /**
   * Query complexity metrics for a file
   */
  async queryComplexity(filePath: string): Promise<ComplexityMetrics | null> {
    const index = getGlobalIndex()
    const key = `${filePath}|complexity`

    const entry = await index.get(key)
    if (!entry) {
      return null
    }

    return entry.data as ComplexityMetrics
  }

  /**
   * Query patterns for a file
   */
  async queryPatterns(filePath: string): Promise<Pattern[] | null> {
    const index = getGlobalIndex()
    const key = `${filePath}|patterns`

    const entry = await index.get(key)
    if (!entry) {
      return null
    }

    return entry.data as Pattern[]
  }

  /**
   * Query all precomputed data for a file
   */
  async queryAll(filePath: string): Promise<{
    ast: ASTNode | null
    symbols: SymbolTable | null
    callGraph: CallGraph | null
    complexity: ComplexityMetrics | null
    patterns: Pattern[] | null
  }> {
    const index = getGlobalIndex()
    const entries = await index.getByFilePath(filePath)

    const result = {
      ast: null as ASTNode | null,
      symbols: null as SymbolTable | null,
      callGraph: null as CallGraph | null,
      complexity: null as ComplexityMetrics | null,
      patterns: null as Pattern[] | null,
    }

    for (const entry of entries) {
      switch (entry.type) {
        case 'ast':
          result.ast = entry.data as ASTNode
          break
        case 'symbol':
          result.symbols = entry.data as SymbolTable
          break
        case 'call-graph':
          result.callGraph = entry.data as CallGraph
          break
        case 'complexity':
          result.complexity = entry.data as ComplexityMetrics
          break
        case 'patterns':
          result.patterns = entry.data as Pattern[]
          break
      }
    }

    return result
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    l1: { hits: number; misses: number; size: number; hitRate: number }
    l2: { size: number }
    combined: { hitRate: number }
  }> {
    const index = getGlobalIndex()
    return index.getStats()
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    const index = getGlobalIndex()
    await index.clear()
  }

  /**
   * Warm up cache for a file
   */
  async warmup(filePath: string): Promise<void> {
    const index = getGlobalIndex()
    await index.warmup(filePath)
  }
}

/**
 * Global query API instance
 */
let globalQueryAPI: QueryAPIRouter | null = null

/**
 * Get or create global query API
 */
export function getQueryAPI(): QueryAPIRouter {
  if (!globalQueryAPI) {
    globalQueryAPI = new QueryAPIRouter()
  }
  return globalQueryAPI
}

/**
 * Export individual query functions for convenience
 */
export const ast = astQueries
export const symbols = symbolQueries
export const callGraph = callGraphQueries
