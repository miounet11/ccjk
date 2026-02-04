/**
 * Example 1: Error Traceability System
 *
 * Demonstrates how to trace errors through the three-layer framework
 */

import { ErrorLayer, TraceabilityAnalyzer } from '@ccjk/v2/brain'

/**
 * Example: Analyzing a TypeScript compilation error
 */
export async function errorTraceExample() {
  const analyzer = new TraceabilityAnalyzer()

  // Simulated TypeScript error
  const error = {
    message: 'TypeError: Cannot read property \'map\' of undefined',
    stack: `
      at processFiles (src/utils/file-processor.ts:42:15)
      at main (src/index.ts:18:5)
      at Object.<anonymous> (src/index.ts:25:3)
    `,
    code: 'E0382',
    file: 'src/utils/file-processor.ts',
    line: 42,
  }

  // Analyze the error
  const analysis = await analyzer.analyze(error)

  console.log('Error Analysis:', analysis)

  /**
   * Expected Output:
   *
   * {
   *   layer: ErrorLayer.SYNTAX,
   *   classification: {
   *     type: 'TypeError',
   *     category: 'null-safety',
   *     severity: 'error'
   *   },
   *   domainConstraint: {
   *     domain: 'data-processing',
   *     constraint: 'array-existence',
   *     violated: true
   *   },
   *   solutionPattern: {
   *     pattern: 'null-coalescing',
   *     confidence: 0.95,
   *     examples: ['array?.map(...)', 'array?.map(...) ?? []']
   *   },
   *   trace: {
   *     file: 'src/utils/file-processor.ts',
   *     line: 42,
   *     function: 'processFiles',
   *     suggestion: 'Check if array exists before mapping'
   *   }
   * }
   */

  return analysis
}

/**
 * Example: Multi-layer error trace
 */
export async function multiLayerTraceExample() {
  const analyzer = new TraceabilityAnalyzer()

  // Simulated error that spans multiple layers
  const errors = [
    {
      message: 'Failed to fetch data from API',
      layer: ErrorLayer.RUNTIME,
    },
    {
      message: 'Network request timeout',
      layer: ErrorLayer.RUNTIME,
    },
    {
      message: 'API endpoint not configured',
      layer: ErrorLayer.SEMANTIC,
    },
  ]

  const trace = await analyzer.traceChain(errors)

  console.log('Error Chain Trace:', trace)

  /**
   * Expected Output:
   *
   * {
   *   chain: [
   *     {
   *       error: 'Failed to fetch data from API',
   *       layer: 'runtime',
   *       rootCause: false
   *     },
   *     {
   *       error: 'Network request timeout',
   *       layer: 'runtime',
   *       rootCause: false
   *     },
   *     {
   *       error: 'API endpoint not configured',
   *       layer: 'semantic',
   *       rootCause: true,
   *       suggestion: 'Configure API endpoint in environment variables'
   *     }
   *   ],
   *   summary: {
   *     rootCause: 'API endpoint not configured',
   *     layer: 'semantic',
   *     fixComplexity: 'low'
   *   }
   * }
   */

  return trace
}

/**
 * Example: Real-time error monitoring
 */
export async function realtimeMonitoringExample() {
  const analyzer = new TraceabilityAnalyzer()

  // Enable real-time monitoring
  analyzer.enableMonitoring({
    onAnalyzed: (analysis) => {
      console.log(`[${analysis.layer}] ${analysis.classification.type}`)
      console.log(`  Constraint: ${analysis.domainConstraint.domain}`)
      console.log(`  Pattern: ${analysis.solutionPattern.pattern}`)
    },
    onErrorChain: (chain) => {
      console.log(`Error chain length: ${chain.length}`)
      console.log(`Root cause: ${chain.summary.rootCause}`)
    },
  })

  // Simulate error occurring
  const error = new Error('Database connection failed')

  analyzer.monitor(error)

  // Output:
  // [runtime] DatabaseConnectionError
  //   Constraint: database-connectivity
  //   Pattern: retry-with-exponential-backoff
  // Error chain length: 1
  // Root cause: Database connection failed
}

/**
 * Helper function to demonstrate error classification
 */
export async function errorClassificationExample() {
  const analyzer = new TraceabilityAnalyzer()

  const errors = [
    'Unexpected token',
    'Cannot read property of undefined',
    'Type string is not assignable to number',
    'Module not found',
    'Maximum call stack size exceeded',
  ]

  for (const error of errors) {
    const layer = analyzer.classifyLayer(error)
    console.log(`"${error}" → ${layer}`)
  }

  // Output:
  // "Unexpected token" → SYNTAX
  // "Cannot read property of undefined" → RUNTIME
  // "Type string is not assignable to number" → SEMANTIC
  // "Module not found" → RUNTIME
  // "Maximum call stack size exceeded" → RUNTIME
}
