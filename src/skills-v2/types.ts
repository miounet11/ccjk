/**
 * CCJK Skills V2 - Cognitive Protocol Types
 *
 * Skills are not knowledge bases, but cognitive protocols that change how AI thinks.
 * This system implements a three-layer architecture (L1/L2/L3) with forced reasoning chains.
 */

/**
 * Layer definitions for the cognitive protocol stack
 */
export enum Layer {
  L1 = 'L1', // Language mechanisms - syntactic and semantic patterns
  L2 = 'L2', // Design patterns - architectural and structural approaches
  L3 = 'L3', // Domain constraints - business rules and domain-specific logic
}

/**
 * Core cognitive protocol that defines how AI should think
 */
export interface CognitiveProtocol {
  /** The fundamental question this protocol addresses */
  coreQuestion: string

  /** How to trace up to higher-level concepts */
  traceUp: string

  /** How to trace down to implementation details */
  traceDown: string

  /** Quick reference for protocol usage */
  quickReference: Record<string, any>
}

/**
 * Reasoning chain structure that enforces L1→L3→L2 execution flow
 */
export interface ReasoningChain {
  /** L1: Language/Syntax level - what goes wrong at language level */
  layer1: string

  /** L3: Domain constraints - what business rules apply */
  layer3: string

  /** L2: Design pattern - what architectural solution to use */
  layer2: string
}

/**
 * DSL syntax node types for parsing cognitive protocols
 */
export enum DSLNodeType {
  PROTOCOL = 'protocol',
  LAYER = 'layer',
  CONSTRAINT = 'constraint',
  PATTERN = 'pattern',
  TRANSFORM = 'transform',
  TRACE = 'trace',
  REFERENCE = 'reference',
}

/**
 * Base interface for all DSL nodes
 */
export interface DSLNode {
  type: DSLNodeType
  name: string
  location: SourceLocation
}

/**
 * Source location for error reporting
 */
export interface SourceLocation {
  line: number
  column: number
  file?: string
}

/**
 * Protocol definition node
 */
export interface ProtocolNode extends DSLNode {
  type: DSLNodeType.PROTOCOL
  coreQuestion: string
  layers: LayerNode[]
  traces: TraceNode[]
  references: ReferenceNode[]
}

/**
 * Layer definition node
 */
export interface LayerNode extends DSLNode {
  type: DSLNodeType.LAYER
  layer: Layer
  constraints: ConstraintNode[]
  patterns: PatternNode[]
}

/**
 * Constraint definition node (L3)
 */
export interface ConstraintNode extends DSLNode {
  type: DSLNodeType.CONSTRAINT
  condition: string
  validation: string
  errorMessage: string
}

/**
 * Pattern definition node (L2)
 */
export interface PatternNode extends DSLNode {
  type: DSLNodeType.PATTERN
  pattern: string
  implementation: string
  examples: string[]
}

/**
 * Transform definition node (L1)
 */
export interface TransformNode extends DSLNode {
  type: DSLNodeType.TRANSFORM
  from: string
  to: string
  rule: string
}

/**
 * Trace definition node
 */
export interface TraceNode extends DSLNode {
  type: DSLNodeType.TRACE
  direction: 'up' | 'down'
  target: string
  steps: string[]
}

/**
 * Reference definition node
 */
export interface ReferenceNode extends DSLNode {
  type: DSLNodeType.REFERENCE
  key: string
  value: any
  description?: string
}

/**
 * Skill metadata
 */
export interface SkillMetadata {
  id: string
  name: string
  version: string
  description: string
  author: string
  tags: string[]
  layer: Layer
  priority: number
  dependencies: string[]
}

/**
 * Parsed skill definition
 */
export interface Skill {
  metadata: SkillMetadata
  protocol: CognitiveProtocol
  ast: ProtocolNode
  source: string
}

/**
 * Skill execution context
 */
export interface ExecutionContext {
  skill: Skill
  input: any
  reasoningChain: ReasoningChain
  trace: ExecutionTrace
}

/**
 * Execution trace for debugging
 */
export interface ExecutionTrace {
  startTime: Date
  endTime?: Date
  steps: ExecutionStep[]
  errors: ExecutionError[]
}

/**
 * Single execution step
 */
export interface ExecutionStep {
  timestamp: Date
  layer: Layer
  action: string
  result: any
  metadata?: Record<string, any>
}

/**
 * Execution error
 */
export interface ExecutionError {
  timestamp: Date
  layer: Layer
  error: string
  recovery?: string
}

/**
 * Router match result
 */
export interface RouterMatch {
  skill: Skill
  score: number
  keywords: string[]
  confidence: number
}

/**
 * Router configuration
 */
export interface RouterConfig {
  minConfidence: number
  maxResults: number
  keywordWeights: Record<string, number>
  layerWeights: Record<Layer, number>
}

/**
 * Parser configuration
 */
export interface ParserConfig {
  strict: boolean
  allowUnknownNodes: boolean
  validateSemantics: boolean
  maxDepth: number
}

/**
 * Runtime configuration
 */
export interface RuntimeConfig {
  enforceReasoningChain: boolean
  traceExecution: boolean
  maxExecutionTime: number
  allowFallback: boolean
  outputFormat: 'json' | 'text' | 'structured'
}

/**
 * Skill loading options
 */
export interface SkillLoadOptions {
  layer?: Layer
  tags?: string[]
  priority?: number
  hotReload?: boolean
}

/**
 * Skill execution result
 */
export interface ExecutionResult {
  success: boolean
  output: any
  reasoningChain: ReasoningChain
  trace: ExecutionTrace
  metadata: {
    executionTime: number
    tokensUsed: number
    layerAccessed: Layer[]
  }
}

/**
 * Error types
 */
export enum SkillErrorType {
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  ROUTER_ERROR = 'ROUTER_ERROR',
  LAYER_ERROR = 'LAYER_ERROR',
}

/**
 * Base error class
 */
export class SkillError extends Error {
  constructor(
    public type: SkillErrorType,
    public message: string,
    public location?: SourceLocation,
    public layer?: Layer,
    public originalError?: Error,
  ) {
    super(message)
    this.name = 'SkillError'
  }
}

/**
 * Type guards
 */
export function isProtocolNode(node: DSLNode): node is ProtocolNode {
  return node.type === DSLNodeType.PROTOCOL
}

export function isLayerNode(node: DSLNode): node is LayerNode {
  return node.type === DSLNodeType.LAYER
}

export function isConstraintNode(node: DSLNode): node is ConstraintNode {
  return node.type === DSLNodeType.CONSTRAINT
}

export function isPatternNode(node: DSLNode): node is PatternNode {
  return node.type === DSLNodeType.PATTERN
}

/**
 * Example DSL syntax:
 *
 * protocol "Error Handling" {
 *   coreQuestion: "How should errors be handled in this context?"
 *
 *   layer L1 {
 *     transform "throw new Error" -> "Result<T, E>"
 *     rule "Avoid exceptions in functional code"
 *   }
 *
 *   layer L3 {
 *     constraint "All errors must be typed"
 *     validation "error instanceof KnownError"
 *     message "Use typed errors for better handling"
 *   }
 *
 *   layer L2 {
 *     pattern "Result Type"
 *     implementation "Use Result<T, E> for all fallible operations"
 *     examples: ["parse() -> Result<AST, ParseError>"]
 *   }
 *
 *   trace up {
 *     steps: ["Identify error type", "Map to domain error", "Wrap in result"]
 *   }
 *
 *   trace down {
 *     steps: ["Extract error info", "Format for user", "Log for debugging"]
 *   }
 *
 *   reference {
 *     "rust-result": "https://doc.rust-lang.org/std/result/"
 *     "ts-result": "https://github.com/supermacro/neverthrow"
 *   }
 * }
 */
