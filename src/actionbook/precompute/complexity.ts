/**
 * Complexity Analyzer
 *
 * Calculates various complexity metrics including cyclomatic complexity,
 * cognitive complexity, Halstead metrics, and maintainability index.
 */

import type { ASTNode, ComplexityMetrics, HalsteadMetrics } from '../types.js'

/**
 * Calculate complexity metrics for AST
 */
export function calculateComplexity(ast: ASTNode, source: string): ComplexityMetrics {
  const cyclomatic = calculateCyclomaticComplexity(ast)
  const cognitive = calculateCognitiveComplexity(ast)
  const halstead = calculateHalsteadMetrics(ast)
  const maintainability = calculateMaintainabilityIndex(ast, source, cyclomatic, halstead)
  const linesOfCode = countLinesOfCode(source)
  const commentRatio = calculateCommentRatio(source)

  return {
    cyclomatic,
    cognitive,
    halstead,
    maintainabilityIndex: maintainability,
    linesOfCode,
    commentRatio,
  }
}

/**
 * Calculate cyclomatic complexity
 * M = E - N + 2*P
 * Where E = edges, N = nodes, P = connected components
 */
function calculateCyclomaticComplexity(ast: ASTNode): number {
  let complexity = 1 // Base complexity

  for (const child of ast.children) {
    complexity += calculateCyclomaticComplexity(child)

    // Add complexity for decision points
    if (
      child.type === 'IfStatement'
      || child.type === 'ConditionalExpression'
      || child.type === 'ForStatement'
      || child.type === 'ForInStatement'
      || child.type === 'ForOfStatement'
      || child.type === 'WhileStatement'
      || child.type === 'DoWhileStatement'
      || child.type === 'SwitchCase'
    ) {
      complexity++
    }

    // Add complexity for catch clauses
    if (child.type === 'CatchClause') {
      complexity++
    }
  }

  return complexity
}

/**
 * Calculate cognitive complexity
 * Based on nesting levels and decision points
 */
function calculateCognitiveComplexity(ast: ASTNode, nestingLevel = 0): number {
  let complexity = 0

  for (const child of ast.children) {
    // Add complexity for decision points
    if (
      child.type === 'IfStatement'
      || child.type === 'ConditionalExpression'
      || child.type === 'ForStatement'
      || child.type === 'ForInStatement'
      || child.type === 'ForOfStatement'
      || child.type === 'WhileStatement'
      || child.type === 'DoWhileStatement'
      || child.type === 'CatchClause'
    ) {
      complexity += 1 + nestingLevel
    }

    // Add complexity for switch cases
    if (child.type === 'SwitchCase') {
      complexity += 1 + nestingLevel
    }

    // Recursively process children with increased nesting
    complexity += calculateCognitiveComplexity(child, nestingLevel + 1)
  }

  return complexity
}

/**
 * Calculate Halstead metrics
 */
function calculateHalsteadMetrics(ast: ASTNode): HalsteadMetrics {
  const operators = new Set<string>()
  const operands = new Set<string>()
  let totalOperators = 0
  let totalOperands = 0

  extractHalsteadTokens(ast, operators, operands, totalOperators, totalOperands)

  const n1 = operators.size
  const n2 = operands.size
  const N1 = totalOperators
  const N2 = totalOperands

  const vocabulary = n1 + n2
  const length = N1 + N2
  const calculatedLength = n1 * Math.log2(n1) + n2 * Math.log2(n2)
  const volume = length * Math.log2(vocabulary)
  const difficulty = (n1 / 2) * (N2 / n2)
  const effort = difficulty * volume
  const time = effort / 18
  const bugs = effort / 3000

  return {
    n1,
    n2,
    N1,
    N2,
    vocabulary,
    difficulty,
    effort,
    bugs,
    time,
  }
}

/**
 * Extract Halstead tokens from AST
 */
function extractHalsteadTokens(
  node: ASTNode,
  operators: Set<string>,
  operands: Set<string>,
  totalOperators: number,
  totalOperands: number,
): void {
  // Count operators
  const operatorTypes = [
    'BinaryExpression',
    'LogicalExpression',
    'UnaryExpression',
    'AssignmentExpression',
    'UpdateExpression',
    'IfStatement',
    'ForStatement',
    'WhileStatement',
    'DoWhileStatement',
    'SwitchStatement',
    'ConditionalExpression',
  ]

  if (operatorTypes.includes(node.type)) {
    operators.add(node.type)
    totalOperators++
  }

  // Count operands
  if (node.type === 'Identifier' && node.name) {
    operands.add(node.name)
    totalOperands++
  }
  else if (node.type === 'Literal') {
    operands.add('literal')
    totalOperands++
  }

  for (const child of node.children) {
    extractHalsteadTokens(child, operators, operands, totalOperators, totalOperands)
  }
}

/**
 * Calculate maintainability index
 * MI = 171 - 5.2 * ln(Halstead Volume) - 0.23 * Cyclomatic Complexity - 16.2 * ln(Lines of Code)
 */
function calculateMaintainabilityIndex(
  ast: ASTNode,
  source: string,
  cyclomatic: number,
  halstead: HalsteadMetrics,
): number {
  const loc = countLinesOfCode(source)
  const volume = (halstead.N1 + halstead.N2) * Math.log2(halstead.vocabulary)

  const mi = 171
    - 5.2 * Math.log(volume)
    - 0.23 * cyclomatic
    - 16.2 * Math.log(loc)

  return Math.max(0, Math.min(100, mi))
}

/**
 * Count lines of code
 */
function countLinesOfCode(source: string): number {
  const lines = source.split('\n')
  return lines.filter(line => line.trim().length > 0).length
}

/**
 * Calculate comment ratio
 */
function calculateCommentRatio(source: string): number {
  const lines = source.split('\n')
  const totalLines = lines.filter(line => line.trim().length > 0).length
  const commentLines = lines.filter(line => /^\s*\/\//.test(line) || /^\s*\/\*/.test(line)).length

  return totalLines > 0 ? commentLines / totalLines : 0
}
