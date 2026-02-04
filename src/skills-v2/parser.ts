/**
 * CCJK Skills V2 - DSL Parser (Simplified JSON-based)
 *
 * Parses cognitive protocol DSL (JSON-based) into AST with comprehensive error handling
 * and semantic validation.
 */

import type {
  CognitiveProtocol,
  ConstraintNode,
  LayerNode,
  ParserConfig,
  PatternNode,
  ProtocolNode,
  ReferenceNode,
  Skill,
  SkillMetadata,
  SourceLocation,
  TraceNode,
} from './types.js'
import {
  DSLNodeType,
  Layer,
  SkillError,
  SkillErrorType,
} from './types.js'

/**
 * JSON-based DSL structure
 */
interface ProtocolJSON {
  name: string
  coreQuestion: string
  layers: LayerJSON[]
  traces: TraceJSON[]
  references: Record<string, string>
}

interface LayerJSON {
  layer: string
  transforms?: TransformJSON[]
  constraints?: ConstraintJSON[]
  patterns?: PatternJSON[]
}

interface TransformJSON {
  from: string
  to: string
  rule?: string
}

interface ConstraintJSON {
  condition: string
  validation?: string
  message?: string
}

interface PatternJSON {
  name: string
  implementation?: string
  examples?: string[]
}

interface TraceJSON {
  direction: 'up' | 'down'
  steps: string[]
}

/**
 * Simplified parser for JSON-based DSL
 */
export class Parser {
  private config: ParserConfig
  private input: string

  constructor(
    input: string,
    config: ParserConfig = {
      strict: true,
      allowUnknownNodes: false,
      validateSemantics: true,
      maxDepth: 10,
    },
  ) {
    this.input = input.trim()
    this.config = config
  }

  parse(filename?: string): ProtocolNode {
    try {
      // Try to parse as JSON
      const json = JSON.parse(this.input) as ProtocolJSON

      // Validate structure
      this.validateProtocol(json)

      // Build AST
      return this.buildAST(json, filename)
    }
    catch (error) {
      if (error instanceof SyntaxError) {
        throw new SkillError(
          SkillErrorType.PARSE_ERROR,
          `Invalid JSON syntax: ${error.message}`,
          { line: 1, column: 1, file: filename },
        )
      }
      throw error
    }
  }

  private validateProtocol(json: any): void {
    if (!json.name || typeof json.name !== 'string') {
      throw new SkillError(
        SkillErrorType.PARSE_ERROR,
        'Protocol must have a name',
        { line: 1, column: 1 },
      )
    }

    if (!json.coreQuestion || typeof json.coreQuestion !== 'string') {
      throw new SkillError(
        SkillErrorType.PARSE_ERROR,
        'Protocol must have a coreQuestion',
        { line: 1, column: 1 },
      )
    }

    if (!Array.isArray(json.layers)) {
      throw new SkillError(
        SkillErrorType.PARSE_ERROR,
        'Protocol must have layers array',
        { line: 1, column: 1 },
      )
    }
  }

  private buildAST(json: ProtocolJSON, filename?: string): ProtocolNode {
    const location: SourceLocation = {
      line: 1,
      column: 1,
      file: filename,
    }

    const layers: LayerNode[] = json.layers.map(layerJson =>
      this.buildLayerNode(layerJson, location),
    )

    const traces: TraceNode[] = (json.traces || []).map(traceJson =>
      this.buildTraceNode(traceJson, location),
    )

    const references: ReferenceNode[] = Object.keys(json.references || {}).map(key =>
      this.buildReferenceNode(key, json.references![key], location),
    )

    return {
      type: DSLNodeType.PROTOCOL,
      name: json.name,
      location,
      coreQuestion: json.coreQuestion,
      layers,
      traces,
      references,
    }
  }

  private buildLayerNode(json: LayerJSON, location: SourceLocation): LayerNode {
    const layer = json.layer as Layer

    const constraints: ConstraintNode[] = (json.constraints || []).map(c =>
      this.buildConstraintNode(c, location),
    )

    const patterns: PatternNode[] = (json.patterns || []).map(p =>
      this.buildPatternNode(p, location),
    )

    return {
      type: DSLNodeType.LAYER,
      name: layer,
      location,
      layer,
      constraints,
      patterns,
    }
  }

  private buildConstraintNode(json: ConstraintJSON, location: SourceLocation): ConstraintNode {
    return {
      type: DSLNodeType.CONSTRAINT,
      name: json.condition,
      location,
      condition: json.condition,
      validation: json.validation || '',
      errorMessage: json.message || '',
    }
  }

  private buildPatternNode(json: PatternJSON, location: SourceLocation): PatternNode {
    return {
      type: DSLNodeType.PATTERN,
      name: json.name,
      location,
      pattern: json.name,
      implementation: json.implementation || '',
      examples: json.examples || [],
    }
  }

  private buildTraceNode(json: TraceJSON, location: SourceLocation): TraceNode {
    return {
      type: DSLNodeType.TRACE,
      name: `trace ${json.direction}`,
      location,
      direction: json.direction,
      target: '',
      steps: json.steps,
    }
  }

  private buildReferenceNode(key: string, value: string, location: SourceLocation): ReferenceNode {
    return {
      type: DSLNodeType.REFERENCE,
      name: key,
      location,
      key,
      value,
      description: '',
    }
  }
}

/**
 * Create a skill from parsed AST
 */
export function createSkill(ast: ProtocolNode, source: string): Skill {
  // Extract metadata
  const metadata: SkillMetadata = {
    id: ast.name.toLowerCase().replace(/\s+/g, '-'),
    name: ast.name,
    version: '1.0.0',
    description: `Cognitive protocol for ${ast.name}`,
    author: 'CCJK',
    tags: [ast.name.toLowerCase(), 'cognitive-protocol'],
    layer: Layer.L2, // Default to L2
    priority: 50,
    dependencies: [],
  }

  // Determine primary layer from layers
  if (ast.layers.length > 0) {
    metadata.layer = ast.layers[0].layer
  }

  // Create cognitive protocol
  const protocol: CognitiveProtocol = {
    coreQuestion: ast.coreQuestion,
    traceUp: '',
    traceDown: '',
    quickReference: {},
  }

  // Extract trace information
  for (const trace of ast.traces) {
    if (trace.direction === 'up') {
      protocol.traceUp = trace.steps.join(' → ')
    }
    else if (trace.direction === 'down') {
      protocol.traceDown = trace.steps.join(' → ')
    }
  }

  // Extract references
  for (const ref of ast.references) {
    protocol.quickReference[ref.key] = ref.value
  }

  return {
    metadata,
    protocol,
    ast,
    source,
  }
}
