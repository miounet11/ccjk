/**
 * Example 2: Domain Constraint Recognition
 *
 * Demonstrates how the system recognizes domain-specific constraints
 */

import { TraceabilityAnalyzer } from '@ccjk/v2/brain'

/**
 * Example: Detecting violated domain constraints
 */
export async function domainConstraintExample() {
  const analyzer = new TraceabilityAnalyzer()

  // Scenario 1: Async/await constraint violation
  const error1 = {
    message: 'await is only valid in async functions',
    code: 'E1308',
    file: 'src/api/client.ts',
  }

  const constraint1 = await analyzer.detectConstraint(error1)

  console.log('Constraint 1:', constraint1)

  /**
   * Expected Output:
   *
   * {
   *   domain: 'async-operations',
   *   category: ConstraintCategory.SYNCHRONICITY,
   *   constraint: 'async-context-required',
   *   violated: true,
   *   severity: 'error',
   *   suggestion: 'Add async keyword to function declaration',
   *   codeFix: {
   *     type: 'add-keyword',
   *     keyword: 'async',
   *     location: 'function-declaration'
   *   }
   * }
   */

  // Scenario 2: Type safety constraint
  const error2 = {
    message: 'Type \'string\' is not assignable to type \'number\'',
    code: 'TS2322',
    file: 'src/types/calculator.ts',
  }

  const constraint2 = await analyzer.detectConstraint(error2)

  console.log('\nConstraint 2:', constraint2)

  /**
   * Expected Output:
   *
   * {
   *   domain: 'type-system',
   *   category: ConstraintCategory.TYPE_SAFETY,
   *   constraint: 'type-compatibility',
   *   violated: true,
   *   severity: 'error',
   *   suggestion: 'Use type conversion or change type definition',
   *   codeFix: {
   *     type: 'type-assertion',
   *     from: 'string',
   *     to: 'number'
   *   }
   * }
   */

  return { constraint1, constraint2 }
}

/**
 * Example: Cross-domain constraint analysis
 */
export async function crossDomainAnalysisExample() {
  const analyzer = new TraceabilityAnalyzer()

  // Error that violates multiple domain constraints
  const complexError = {
    message: 'Promise rejection: Cannot find module',
    code: 'MODULE_NOT_FOUND',
    context: {
      operation: 'import',
      module: '@ccjk/v2/brain',
      environment: 'production',
    },
  }

  const constraints = await analyzer.analyzeConstraints(complexError)

  console.log('Cross-domain Constraints:', constraints)

  /**
   * Expected Output:
   *
   * [
   *     {
   *       domain: 'module-system',
   *       constraint: 'module-availability',
   *       violated: true,
   *       severity: 'error'
   *     },
   *     {
   *       domain: 'dependency-management',
   *       constraint: 'production-dependency',
   *       violated: true,
   *       severity: 'error'
   *     },
   *     {
   *       domain: 'async-operations',
   *       constraint: 'error-handling',
   *       violated: true,
   *       severity: 'warning'
   *     }
   *   ]
   *
   *   recommendations: [
   *     'Install missing module: npm install @ccjk/v2',
   *     'Add error handling for async operations',
   *     'Check if module is listed in dependencies'
   *   ]
   */

  return constraints
}

/**
 * Example: Domain-specific constraint library
 */
export async function domainLibraryExample() {
  const analyzer = new TraceabilityAnalyzer()

  // Get all supported domains
  const domains = analyzer.getSupportedDomains()

  console.log('Supported Domains:')
  domains.forEach((domain) => {
    console.log(`  - ${domain.name}: ${domain.description}`)
    console.log(`    Constraints: ${domain.constraints.length}`)
  })

  /**
   * Expected Output:
   *
   * Supported Domains:
   *   - async-operations: Asynchronous programming constraints
   *     Constraints: 12
   *   - type-system: TypeScript type safety constraints
   *     Constraints: 18
   *   - memory-management: Memory usage and lifecycle constraints
   *     Constraints: 8
   *   - data-flow: Data transformation and validation constraints
   *     Constraints: 15
   *   - error-handling: Error propagation and recovery constraints
   *     Constraints: 10
   *   - api-contracts: API interface and protocol constraints
   *     Constraints: 14
   */

  // Get constraints for a specific domain
  const typeSystemConstraints = analyzer.getDomainConstraints('type-system')

  console.log('\nType System Constraints:')
  typeSystemConstraints.forEach((constraint) => {
    console.log(`  - ${constraint.id}: ${constraint.description}`)
  })

  return domains
}

/**
 * Example: Learning from user feedback
 */
export async function constraintLearningExample() {
  const analyzer = new TraceabilityAnalyzer()

  // User provides feedback on a constraint detection
  const feedback = {
    error: 'Type A is not assignable to type B',
    detectedConstraint: 'type-compatibility',
    userCorrection: 'type-narrowing',
    confidence: 0.9,
  }

  // Learn from feedback
  analyzer.learnFromFeedback(feedback)

  // Future detections will be improved
  const improvedDetection = await analyzer.detectConstraint({
    message: 'Type A is not assignable to type B',
    code: 'TS2322',
  })

  console.log('Improved Detection:', improvedDetection)

  return improvedDetection
}
