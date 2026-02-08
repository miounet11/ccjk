/**
 * CCJK 2.0 - Three-Layer Traceability Analyzer
 * Analyzes errors through L1 (surface), L2 (pattern), and L3 (domain) layers
 */

import type {
  DomainConstraint,
  ErrorClassification,
  PatternMatch,
  Solution,
  TraceabilityAnalysis,
  TraceabilityChain,
} from './types.js'
import { TraceabilityLayer } from './types.js'

/**
 * Traceability Analyzer
 * Performs three-layer analysis of errors to identify root causes
 */
export class TraceabilityAnalyzer {
  /**
   * Analyze an error through all three layers
   */
  async analyze(error: Error | string): Promise<TraceabilityAnalysis> {
    const startTime = Date.now()

    // L1: Classify the surface error
    const errorClassification = this.classifyError(error)

    // L2: Match design patterns
    const patterns = await this.matchPatterns(errorClassification)

    // L3: Check domain constraints
    const constraints = await this.checkDomainConstraints(errorClassification, patterns)

    // Generate solution
    const solution = this.generateSolution(errorClassification, patterns, constraints)

    // Build traceability chain
    const chain: TraceabilityChain = {
      chainId: this.generateChainId(),
      inputError: errorClassification,
      patterns,
      constraints,
      recommendedSolution: solution,
      timestamp: new Date().toISOString(),
    }

    const analysisTime = Date.now() - startTime
    const confidence = this.calculateConfidence(chain)

    return {
      success: true,
      chain,
      analysisTime,
      confidence,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * L1: Classify surface error
   */
  private classifyError(error: Error | string): ErrorClassification {
    const errorMessage = typeof error === 'string' ? error : error.message
    const stackTrace = typeof error === 'string' ? undefined : error.stack

    // Simple classification logic (can be enhanced with ML)
    let errorType = 'unknown'
    const layer: TraceabilityLayer = TraceabilityLayer.L1_ERROR

    if (errorMessage.includes('TypeError') || errorMessage.includes('type')) {
      errorType = 'type_error'
    }
    else if (errorMessage.includes('ReferenceError') || errorMessage.includes('not defined')) {
      errorType = 'reference_error'
    }
    else if (errorMessage.includes('SyntaxError') || errorMessage.includes('syntax')) {
      errorType = 'syntax_error'
    }
    else if (errorMessage.includes('RangeError') || errorMessage.includes('range')) {
      errorType = 'range_error'
    }
    else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorType = 'network_error'
    }

    return {
      layer,
      errorType,
      errorMessage,
      stackTrace,
      confidence: 0.8,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * L2: Match design patterns
   */
  private async matchPatterns(error: ErrorClassification): Promise<PatternMatch[]> {
    const patterns: PatternMatch[] = []

    // Pattern matching logic (can be enhanced with pattern database)
    if (error.errorType === 'type_error') {
      patterns.push({
        patternId: 'type-safety',
        patternName: 'Type Safety Pattern',
        description: 'Ensure type safety through TypeScript strict mode',
        layer: TraceabilityLayer.L2_PATTERN,
        matched: true,
        confidence: 0.9,
        context: { errorType: error.errorType },
      })
    }

    if (error.errorType === 'network_error') {
      patterns.push({
        patternId: 'retry-pattern',
        patternName: 'Retry Pattern',
        description: 'Implement retry logic for network failures',
        layer: TraceabilityLayer.L2_PATTERN,
        matched: true,
        confidence: 0.85,
        context: { errorType: error.errorType },
      })
    }

    return patterns
  }

  /**
   * L3: Check domain constraints
   */
  private async checkDomainConstraints(
    error: ErrorClassification,
    _patterns: PatternMatch[],
  ): Promise<DomainConstraint[]> {
    const constraints: DomainConstraint[] = []

    // Domain constraint checking (can be enhanced with domain rules engine)
    if (error.errorType === 'type_error') {
      constraints.push({
        constraintId: 'strict-typing',
        domain: 'typescript',
        rule: 'All variables must have explicit types',
        description: 'TypeScript strict mode requires explicit typing',
        severity: 'high',
        violated: true,
        context: { errorType: error.errorType },
      })
    }

    return constraints
  }

  /**
   * Generate recommended solution
   */
  private generateSolution(
    error: ErrorClassification,
    _patterns: PatternMatch[],
    _constraints: DomainConstraint[],
  ): Solution {
    // Solution generation logic (can be enhanced with AI)
    const steps: string[] = []
    const tradeoffs: string[] = []

    if (error.errorType === 'type_error') {
      steps.push('Enable TypeScript strict mode in tsconfig.json')
      steps.push('Add explicit type annotations to all variables')
      steps.push('Run type checker: tsc --noEmit')
      tradeoffs.push('Increased development time for type annotations')
      tradeoffs.push('Better code quality and maintainability')
    }

    return {
      solutionId: this.generateSolutionId(),
      type: 'implementation',
      title: `Fix ${error.errorType}`,
      description: `Address the ${error.errorType} by following best practices`,
      steps,
      rationale: 'Prevent similar errors in the future',
      tradeoffs,
      priority: 'high',
    }
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(chain: TraceabilityChain): number {
    const errorConfidence = chain.inputError.confidence
    const patternConfidence = chain.patterns.length > 0
      ? chain.patterns.reduce((sum, p) => sum + p.confidence, 0) / chain.patterns.length
      : 0.5
    const constraintWeight = chain.constraints.length > 0 ? 0.9 : 0.7

    return (errorConfidence * 0.4 + patternConfidence * 0.4 + constraintWeight * 0.2)
  }

  /**
   * Generate unique chain ID
   */
  private generateChainId(): string {
    return `chain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * Generate unique solution ID
   */
  private generateSolutionId(): string {
    return `solution-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
}

/**
 * Factory function to create analyzer instance
 */
export function createTraceabilityAnalyzer(): TraceabilityAnalyzer {
  return new TraceabilityAnalyzer()
}
