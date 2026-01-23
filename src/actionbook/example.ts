/**
 * Actionbook Engine Usage Example
 *
 * Demonstrates how to use the actionbook precomputation engine
 * for code analysis and querying.
 */

import { createEngine } from './index.js'
import * as path from 'node:path'

/**
 * Main example function
 */
async function main() {
  console.log('🚀 Actionbook Engine Example\n')

  // Create engine instance
  const engine = createEngine({
    cachePath: './example-cache',
    watchMode: true,
    compressionEnabled: true,
    logLevel: 'info',
  })

  try {
    // Initialize engine
    console.log('Initializing engine...')
    await engine.initialize()
    console.log('✅ Engine initialized\n')

    // Index sample files (create some test files first)
    const testFiles = [
      './test-files/sample.ts',
      './test-files/complex.ts',
      './test-files/imports.ts',
    ]

    // Create test files if they don't exist
    await createTestFiles()

    // Index files
    console.log('Indexing test files...')
    const stats = await engine.indexFiles(testFiles)
    console.log(`✅ Indexed ${stats.filesIndexed}/${stats.totalFiles} files\n`)

    // Perform queries
    console.log('🔍 Performing queries...\n')

    // Query AST
    console.log('AST Query:')
    const ast = await engine.query.queryAST('./test-files/sample.ts')
    if (ast) {
      console.log(`  - Root node type: ${ast.type}`)
      console.log(`  - Children count: ${ast.children.length}`)
    }

    // Query symbols
    console.log('\nSymbol Query:')
    const symbols = await engine.query.querySymbols('./test-files/sample.ts')
    if (symbols) {
      const functions = symbols.symbols.filter(s => s.kind === 'function')
      console.log(`  - Total symbols: ${symbols.symbols.length}`)
      console.log(`  - Functions: ${functions.length}`)
      console.log(`  - Exports: ${symbols.exports.length}`)
      console.log(`  - Imports: ${symbols.imports.length}`)
    }

    // Query call graph
    console.log('\nCall Graph Query:')
    const callGraph = await engine.query.queryCallGraph('./test-files/sample.ts')
    if (callGraph) {
      console.log(`  - Call nodes: ${callGraph.nodes.length}`)
      console.log(`  - Call edges: ${callGraph.edges.length}`)
      console.log(`  - Entry points: ${callGraph.entryPoints.length}`)

      // Find most called functions
      const mostCalled = await engine.query.callGraph.queryMostCalledFunctions('./test-files/sample.ts', 3)
      if (mostCalled.length > 0) {
        console.log('  - Most called functions:')
        mostCalled.forEach(({ name, count }) => {
          console.log(`    * ${name}: ${count} calls`)
        })
      }
    }

    // Query complexity
    console.log('\nComplexity Metrics:')
    const complexity = await engine.query.queryComplexity('./test-files/sample.ts')
    if (complexity) {
      console.log(`  - Cyclomatic complexity: ${complexity.cyclomatic}`)
      console.log(`  - Cognitive complexity: ${complexity.cognitive}`)
      console.log(`  - Maintainability index: ${complexity.maintainabilityIndex.toFixed(1)}`)
      console.log(`  - Lines of code: ${complexity.linesOfCode}`)
      console.log(`  - Estimated bugs: ${complexity.halstead.bugs.toFixed(2)}`)
    }

    // Query patterns
    console.log('\nDetected Patterns:')
    const patterns = await engine.query.queryPatterns('./test-files/sample.ts')
    if (patterns) {
      const warnings = patterns.filter(p => p.severity === 'warning')
      const errors = patterns.filter(p => p.severity === 'error')
      console.log(`  - Total patterns: ${patterns.length}`)
      console.log(`  - Warnings: ${warnings.length}`)
      console.log(`  - Errors: ${errors.length}`)

      if (warnings.length > 0) {
        console.log('  - Warnings:')
        warnings.forEach(p => {
          console.log(`    * ${p.name}: ${p.description}`)
        })
      }
    }

    // Get cache statistics
    console.log('\n📊 Cache Statistics:')
    const stats = await engine.getCacheStats()
    console.log(`  - L1 cache hits: ${stats.l1.hits}`)
    console.log(`  - L1 cache misses: ${stats.l1.misses}`)
    console.log(`  - L1 cache size: ${stats.l1.size}`)
    console.log(`  - L1 hit rate: ${(stats.l1.hitRate * 100).toFixed(1)}%`)
    console.log(`  - L2 cache size: ${stats.l2.size}`)
    console.log(`  - Combined hit rate: ${(stats.combined.hitRate * 100).toFixed(1)}%`)

    // Watch mode example
    if (engine.config.watchMode) {
      console.log('\n👀 Watch mode enabled. Watching for changes...')
      await engine.watchDirectory('./test-files')

      // Simulate file changes
      console.log('\nSimulating file changes...')
      await simulateFileChange()

      // Wait a bit for reindexing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check if anything was reindexed
      const newStats = await engine.getCacheStats()
      console.log(`\nAfter changes - New combined hit rate: ${(newStats.combined.hitRate * 100).toFixed(1)}%`)
    }

    // Dependency analysis
    console.log('\n🔗 Dependency Analysis:')
    const graph = engine.getDependencyGraph()
    for (const [file, deps] of graph) {
      console.log(`  - ${file} depends on:`)
      for (const dep of deps) {
        console.log(`    * ${dep}`)
      }
    }

    // Circular dependency detection
    const cycles = engine.getCircularDependencies()
    if (cycles.length > 0) {
      console.log('\n⚠️  Circular Dependencies Detected:')
      cycles.forEach(cycle => {
        console.log(`  - ${cycle.join(' → ')}`)
      })
    } else {
      console.log('\n✅ No circular dependencies detected')
    }

  }
  catch (error) {
    console.error('❌ Error:', error)
  }
  finally {
    // Shutdown engine
    console.log('\n🛑 Shutting down engine...')
    await engine.shutdown()
    console.log('✅ Engine shutdown complete')
  }
}

/**
 * Create test files for demonstration
 */
async function createTestFiles() {
  const testDir = './test-files'

  try {
    await fs.mkdir(testDir, { recursive: true })
  } catch {}

  // Sample file with various constructs
  const sampleContent = `
import { helper } from './imports'

// Function with moderate complexity
function calculateSum(numbers: number[]): number {
  let sum = 0
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] > 0) {
      sum += numbers[i]
    }
  }
  return sum
}

// Class with methods
class Calculator {
  private history: number[] = []

  add(a: number, b: number): number {
    const result = a + b
    this.history.push(result)
    return result
  }

  multiply(a: number, b: number): number {
    return a * b
  }
}

// Async function
async function fetchData(url: string): Promise<any> {
  const response = await fetch(url)
  return response.json()
}

// Export
export { calculateSum, Calculator, fetchData }
`

  // Complex file with nested structures
  const complexContent = `
// Deeply nested function with high complexity
function processData(data: any[]): any[] {
  const results = []

  for (let i = 0; i < data.length; i++) {
    if (data[i].type === 'A') {
      if (data[i].value > 100) {
        for (let j = 0; j < data[i].items.length; j++) {
          if (data[i].items[j].active) {
            switch (data[i].items[j].category) {
              case 'X':
                results.push({ type: 'X', value: data[i].items[j].value * 2 })
                break
              case 'Y':
                if (data[i].items[j].value < 50) {
                  results.push({ type: 'Y', value: data[i].items[j].value })
                }
                break
              default:
                results.push({ type: 'Z', value: 0 })
            }
          }
        }
      } else {
        results.push({ type: 'B', value: data[i].value })
      }
    } else if (data[i].type === 'C') {
      try {
        const processed = processData(data[i].nested)
        results.push(...processed)
      } catch (error) {
        console.error('Processing error:', error)
      }
    }
  }

  return results
}

// Anti-pattern: Magic numbers
function calculatePrice(quantity: number): number {
  if (quantity > 100) {
    return quantity * 0.95  // Magic number
  } else if (quantity > 50) {
    return quantity * 0.97  // Magic number
  }
  return quantity * 1.0
}

// Performance issue: Heavy operation in loop
function processLargeArray(items: any[]): void {
  for (let i = 0; i < items.length; i++) {
    // Heavy DOM query in loop (simulated)
    const element = document.querySelector('.item-' + i)
    if (element) {
      element.innerHTML = processItem(items[i])
    }
  }
}
`

  // File with imports
  const importsContent = `
export function helper(): string {
  return 'Helper function'
}

export const CONSTANTS = {
  PI: 3.14159,
  E: 2.71828,
}
`

  await fs.writeFile(path.join(testDir, 'sample.ts'), sampleContent)
  await fs.writeFile(path.join(testDir, 'complex.ts'), complexContent)
  await fs.writeFile(path.join(testDir, 'imports.ts'), importsContent)
}

/**
 * Simulate file changes for watch mode demo
 */
async function simulateFileChange() {
  const filePath = './test-files/sample.ts'

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    // Add a comment to trigger change
    const newContent = content + '\n// Added comment for testing watch mode'
    await fs.writeFile(filePath, newContent)

    console.log('  - Modified sample.ts (added comment)')

    // Wait a bit then revert
    await new Promise(resolve => setTimeout(resolve, 1000))
    await fs.writeFile(filePath, content)
    console.log('  - Reverted changes')
  } catch (error) {
    console.error('Failed to simulate file change:', error)
  }
}

// Run example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

// Import fs at the bottom to avoid hoisting issues
import * as fs from 'node:fs/promises'