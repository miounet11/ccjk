/**
 * Pattern Detector
 *
 * Detects various code patterns including anti-patterns, code smells,
 * security risks, and performance issues.
 */

import type { ASTNode, Pattern } from '../types.js'

/**
 * Detect patterns in AST
 */
export function detectPatterns(ast: ASTNode): Pattern[] {
  const patterns: Pattern[] = []

  patterns.push(...detectAntiPatterns(ast))
  patterns.push(...detectCodeSmells(ast))
  patterns.push(...detectSecurityRisks(ast))
  patterns.push(...detectPerformanceIssues(ast))

  return patterns
}

/**
 * Detect anti-patterns
 */
function detectAntiPatterns(node: ASTNode, patterns: Pattern[] = []): Pattern[] {
  // God object detection (large class/file)
  if (node.children.length > 50) {
    patterns.push({
      id: `pattern-god-object-${node.range.start.line}`,
      type: 'anti-pattern',
      name: 'God Object',
      range: node.range,
      description: 'This element has too many children and may be doing too much',
      suggestions: [
        'Consider splitting into smaller, more focused components',
        'Apply Single Responsibility Principle',
      ],
      severity: 'warning',
    })
  }

  // Magic numbers
  if (node.type === 'Literal' && typeof node.metadata.value === 'number') {
    const value = node.metadata.value
    if (value !== 0 && value !== 1 && Math.abs(value) > 10) {
      patterns.push({
        id: `pattern-magic-number-${node.range.start.line}`,
        type: 'anti-pattern',
        name: 'Magic Number',
        range: node.range,
        description: 'Unnamed numeric literal',
        suggestions: [
          'Replace with named constant',
          'Use configuration object for related values',
        ],
        severity: 'info',
      })
    }
  }

  for (const child of node.children) {
    detectAntiPatterns(child, patterns)
  }

  return patterns
}

/**
 * Detect code smells
 */
function detectCodeSmells(node: ASTNode, patterns: Pattern[] = []): Pattern[] {
  // Long function
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
    const loc = node.range.end.line - node.range.start.line
    if (loc > 50) {
      patterns.push({
        id: `pattern-long-function-${node.range.start.line}`,
        type: 'code-smell',
        name: 'Long Function',
        range: node.range,
        description: `Function has ${loc} lines (consider < 20)`,
        suggestions: [
          'Break down into smaller functions',
          'Extract logical blocks into helper functions',
        ],
        severity: 'warning',
      })
    }

    // Too many parameters
    const paramCount = node.metadata.paramCount || 0
    if (paramCount > 5) {
      patterns.push({
        id: `pattern-too-many-params-${node.range.start.line}`,
        type: 'code-smell',
        name: 'Too Many Parameters',
        range: node.range,
        description: `Function has ${paramCount} parameters (consider < 5)`,
        suggestions: [
          'Use parameter object',
          'Split function into smaller functions',
        ],
        severity: 'info',
      })
    }
  }

  // Nested callbacks
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    const callbackDepth = countCallbackDepth(node)
    if (callbackDepth > 3) {
      patterns.push({
        id: `pattern-callback-hell-${node.range.start.line}`,
        type: 'code-smell',
        name: 'Callback Hell',
        range: node.range,
        description: `Deep callback nesting (${callbackDepth} levels)`,
        suggestions: [
          'Use async/await instead of callbacks',
          'Extract callbacks to named functions',
        ],
        severity: 'warning',
      })
    }
  }

  for (const child of node.children) {
    detectCodeSmells(child, patterns)
  }

  return patterns
}

/**
 * Detect security risks
 */
function detectSecurityRisks(node: ASTNode, patterns: Pattern[] = []): Pattern[] {
  // eval usage
  if (node.type === 'CallExpression' && node.name === 'eval') {
    patterns.push({
      id: `pattern-eval-${node.range.start.line}`,
      type: 'security-risk',
      name: 'Use of eval()',
      range: node.range,
      description: 'eval() can execute arbitrary code and is a security risk',
      suggestions: [
        'Avoid eval() completely',
        'Use JSON.parse() for JSON data',
        'Use object property access for dynamic properties',
      ],
      severity: 'error',
    })
  }

  // innerHTML usage
  if (
    (node.type === 'AssignmentExpression' || node.type === 'CallExpression')
    && node.name?.includes('innerHTML')
  ) {
    patterns.push({
      id: `pattern-innerhtml-${node.range.start.line}`,
      type: 'security-risk',
      name: 'innerHTML Usage',
      range: node.range,
      description: 'Setting innerHTML can lead to XSS vulnerabilities',
      suggestions: [
        'Use textContent instead',
        'Sanitize HTML before insertion',
        'Use DOM methods (createElement, appendChild)',
      ],
      severity: 'warning',
    })
  }

  // Hardcoded credentials
  if (node.type === 'VariableDeclarator') {
    const name = node.name?.toLowerCase() || ''
    if (name.includes('password') || name.includes('secret') || name.includes('token') || name.includes('api_key')) {
      patterns.push({
        id: `pattern-hardcoded-secret-${node.range.start.line}`,
        type: 'security-risk',
        name: 'Hardcoded Secret',
        range: node.range,
        description: 'Potential hardcoded credential or secret',
        suggestions: [
          'Use environment variables',
          'Use secret management service',
          'Never commit secrets to code',
        ],
        severity: 'error',
      })
    }
  }

  for (const child of node.children) {
    detectSecurityRisks(child, patterns)
  }

  return patterns
}

/**
 * Detect performance issues
 */
function detectPerformanceIssues(node: ASTNode, patterns: Pattern[] = []): Pattern[] {
  // Loop with heavy operations
  if (node.type === 'ForStatement' || node.type === 'WhileStatement') {
    const hasHeavyOps = node.children.some(child =>
      child.type === 'CallExpression'
      && (child.name?.includes('querySelector') || child.name?.includes('innerHTML')),
    )

    if (hasHeavyOps) {
      patterns.push({
        id: `pattern-loop-heavy-ops-${node.range.start.line}`,
        type: 'performance-issue',
        name: 'Heavy Operation in Loop',
        range: node.range,
        description: 'Loop contains DOM or heavy I/O operations',
        suggestions: [
          'Move heavy operations outside loop',
          'Cache DOM queries before loop',
          'Use batch processing',
        ],
        severity: 'warning',
      })
    }
  }

  // Deep nesting in loops
  if (node.type === 'ForStatement' || node.type === 'WhileStatement') {
    const loopNestingDepth = countLoopNesting(node)
    if (loopNestingDepth > 2) {
      patterns.push({
        id: `pattern-nested-loops-${node.range.start.line}`,
        type: 'performance-issue',
        name: 'Nested Loops',
        range: node.range,
        description: `${loopNestingDepth} levels of loop nesting (O(n^${loopNestingDepth}) complexity)`,
        suggestions: [
          'Consider using data structures with better lookup (Map, Set)',
          'Break into multiple loops',
          'Use functional methods (map, filter, reduce)',
        ],
        severity: 'info',
      })
    }
  }

  for (const child of node.children) {
    detectPerformanceIssues(child, patterns)
  }

  return patterns
}

/**
 * Count callback nesting depth
 */
function countCallbackDepth(node: ASTNode, depth = 0): number {
  let maxDepth = depth

  for (const child of node.children) {
    if (child.type === 'ArrowFunctionExpression' || child.type === 'FunctionExpression') {
      const childDepth = countCallbackDepth(child, depth + 1)
      maxDepth = Math.max(maxDepth, childDepth)
    }
    else {
      const childDepth = countCallbackDepth(child, depth)
      maxDepth = Math.max(maxDepth, childDepth)
    }
  }

  return maxDepth
}

/**
 * Count loop nesting depth
 */
function countLoopNesting(node: ASTNode, depth = 1): number {
  let maxDepth = depth

  for (const child of node.children) {
    if (child.type === 'ForStatement' || child.type === 'WhileStatement' || child.type === 'ForInStatement' || child.type === 'ForOfStatement') {
      const childDepth = countLoopNesting(child, depth + 1)
      maxDepth = Math.max(maxDepth, childDepth)
    }
    else {
      const childDepth = countLoopNesting(child, depth)
      maxDepth = Math.max(maxDepth, childDepth)
    }
  }

  return maxDepth
}
