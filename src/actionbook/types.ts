/**
 * Precomputation Engine Type Definitions
 *
 * Provides type definitions for AST nodes, symbol tables, call graphs,
 * complexity metrics, and precomputed data structures.
 */

/**
 * Precomputed data for a single file
 */
export interface PrecomputedData {
  filePath: string
  ast: ASTNode
  symbols: SymbolTable
  callGraph: CallGraph
  complexity: ComplexityMetrics
  patterns: Pattern[]
  lastModified: number
  checksum: string
}

/**
 * Cache entry structure for LevelDB storage
 */
export interface CacheEntry {
  key: string // filePath + offset
  type: 'ast' | 'symbol' | 'call-graph' | 'complexity' | 'patterns'
  data: any
  checksum: string // SHA-256
  timestamp: number
  compressed: boolean
}

/**
 * Generic AST node representation
 */
export interface ASTNode {
  type: string
  name?: string
  range: Range
  children: ASTNode[]
  metadata: Record<string, any>
}

/**
 * Source code range
 */
export interface Range {
  start: Position
  end: Position
}

/**
 * Position in source file
 */
export interface Position {
  line: number
  column: number
  offset?: number
}

/**
 * Symbol table containing all symbols in a file
 */
export interface SymbolTable {
  filePath: string
  symbols: Symbol[]
  exports: Symbol[]
  imports: Import[]
  scopes: Scope[]
}

/**
 * Individual symbol definition
 */
export interface Symbol {
  id: string
  name: string
  kind: SymbolKind
  range: Range
  definingScope: string
  references: Reference[]
  metadata: Record<string, any>
}

/**
 * Symbol kinds
 */
export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'constant'
  | 'parameter'
  | 'method'
  | 'property'
  | 'enum'
  | 'enumMember'
  | 'module'
  | 'namespace'

/**
 * Reference to a symbol
 */
export interface Reference {
  filePath: string
  range: Range
  context: string
}

/**
 * Import statement
 */
export interface Import {
  module: string
  imports: ImportSpecifier[]
  range: Range
  isDynamic: boolean
}

/**
 * Import specifier
 */
export interface ImportSpecifier {
  name: string
  alias?: string
  kind: 'named' | 'default' | 'namespace'
}

/**
 * Scope definition
 */
export interface Scope {
  id: string
  kind: 'module' | 'function' | 'class' | 'block'
  range: Range
  parent?: string
  children: string[]
  symbols: string[]
}

/**
 * Call graph for a file
 */
export interface CallGraph {
  filePath: string
  nodes: CallNode[]
  edges: CallEdge[]
  entryPoints: string[]
}

/**
 * Call graph node (function/method)
 */
export interface CallNode {
  id: string
  name: string
  kind: 'function' | 'method' | 'constructor' | 'arrow'
  range: Range
  isAsync: boolean
  isGenerator: boolean
}

/**
 * Call graph edge (function call relationship)
 */
export interface CallEdge {
  from: string // caller function ID
  to: string // callee function ID
  range: Range
  isDynamic: boolean
  callCount: number
}

/**
 * Complexity metrics for code analysis
 */
export interface ComplexityMetrics {
  cyclomatic: number
  cognitive: number
  halstead: HalsteadMetrics
  maintainabilityIndex: number
  linesOfCode: number
  commentRatio: number
}

/**
 * Halstead complexity metrics
 */
export interface HalsteadMetrics {
  n1: number // distinct operators
  n2: number // distinct operands
  N1: number // total operators
  N2: number // total operands
  vocabulary: number
  difficulty: number
  effort: number
  bugs: number
  time: number
}

/**
 * Code pattern detected during analysis
 */
export interface Pattern {
  id: string
  type: PatternType
  name: string
  range: Range
  description: string
  suggestions: string[]
  severity: 'info' | 'warning' | 'error'
}

/**
 * Pattern types
 */
export type PatternType =
  | 'anti-pattern'
  | 'code-smell'
  | 'security-risk'
  | 'performance-issue'
  | 'best-practice'
  | 'architecture-pattern'

/**
 * Query API interface
 */
export interface QueryAPI {
  queryAST(filePath: string, offset?: number): Promise<ASTNode | null>
  querySymbols(filePath: string): Promise<SymbolTable | null>
  queryCallGraph(filePath: string): Promise<CallGraph | null>
  queryComplexity(filePath: string): Promise<ComplexityMetrics | null>
  queryPatterns(filePath: string): Promise<Pattern[] | null>
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

/**
 * Indexing statistics
 */
export interface IndexingStats {
  filesIndexed: number
  totalFiles: number
  errors: string[]
  duration: number
}
