# Actionbook Precomputation Engine

> High-performance precomputation engine for code analysis with LevelDB storage and incremental indexing.

## Overview

Actionbook is a sophisticated precomputation engine that analyzes codebases and stores precomputed data (AST, symbols, call graphs, complexity metrics, patterns) for ultra-fast querying. It features:

- **Two-tier caching**: L1 memory cache (LRU) + L2 LevelDB storage
- **Incremental indexing**: Only reindex changed files and their dependencies
- **File watching**: Automatic updates via chokidar
- **Query API**: Fast queries for AST, symbols, call graphs, complexity, and patterns
- **Compression**: Automatic gzip/brotli compression for large data
- **Dependency tracking**: Bidirectional dependency graph for cascade updates

## Performance

- **Query latency**: <10ms (P95)
- **Indexing speed**: <1s per file
- **Cache hit rate**: >90%
- **Storage efficiency**: 70-90% compression ratio

## Installation

```bash
npm install
```

## Quick Start

```typescript
import { createEngine } from './actionbook/index.js'

// Create engine instance
const engine = createEngine({
  cachePath: './.actionbook-cache',
  watchMode: true,
  compressionEnabled: true,
})

// Initialize
await engine.initialize()

// Index a directory
await engine.indexDirectory('./src', ['.ts', '.tsx'])

// Watch for changes
await engine.watchDirectory('./src')

// Query data
const symbols = await engine.query.querySymbols('./src/utils.ts')
const callGraph = await engine.query.queryCallGraph('./src/utils.ts')
const complexity = await engine.query.queryComplexity('./src/utils.ts')

// Get cache stats
const stats = await engine.getCacheStats()
console.log('Cache hit rate:', stats.combined.hitRate)

// Shutdown
await engine.shutdown()
```

## Architecture

### Module Structure

```
src/actionbook/
├── types.ts              # Type definitions
├── index.ts              # Main entry point
├── precompute/           # Precomputation modules
│   ├── ast-parser.ts      # AST parsing (TypeScript/JavaScript)
│   ├── symbol-extractor.ts # Symbol extraction
│   ├── call-graph.ts      # Call graph generation
│   ├── complexity.ts      # Complexity metrics
│   └── patterns.ts        # Pattern detection
├── cache/                # Cache system
│   ├── storage.ts         # LevelDB storage
│   ├── memory.ts          # LRU memory cache
│   ├── index.ts           # Multi-level index
│   └── compression.ts     # Data compression
├── api/                  # Query API
│   ├── queries/           # Query modules
│   │   ├── ast.ts
│   │   ├── symbols.ts
│   │   └── call-graph.ts
│   └── router.ts          # API router
└── indexer/              # Indexing system
    ├── watcher.ts         # File watcher
    ├── incremental.ts     # Incremental indexer
    └── dependency.ts      # Dependency tracker
```

### Data Flow

```
1. File Changed
   ↓
2. File Watcher detects change
   ↓
3. Incremental Indexer:
   - Parse AST
   - Extract symbols
   - Generate call graph
   - Calculate complexity
   - Detect patterns
   ↓
4. Multi-Level Index:
   - Store in L2 (LevelDB)
   - Promote hot data to L1 (Memory)
   ↓
5. Dependency Tracker:
   - Update dependency graph
   - Schedule dependent files for reindexing
   ↓
6. Query API:
   - Serve from L1 if available
   - Fallback to L2
   - Return precomputed data
```

## Precomputed Data

### 1. AST (Abstract Syntax Tree)

Complete AST representation with metadata.

```typescript
interface ASTNode {
  type: string
  name?: string
  range: Range
  children: ASTNode[]
  metadata: Record<string, any>
}
```

**Query Example**:

```typescript
// Get AST for file
const ast = await engine.query.queryAST('./src/utils.ts')

// Find node at position
const node = await engine.query.ast.queryASTAtPosition('./src/utils.ts', 42, 10)

// Find all functions
const functions = await engine.query.ast.queryASTByType('./src/utils.ts', 'FunctionDeclaration')
```

### 2. Symbol Table

All symbols (functions, classes, variables, types) with scope information.

```typescript
interface SymbolTable {
  filePath: string
  symbols: Symbol[]
  exports: Symbol[]
  imports: Import[]
  scopes: Scope[]
}

interface Symbol {
  id: string
  name: string
  kind: SymbolKind
  range: Range
  definingScope: string
  references: Reference[]
  metadata: Record<string, any>
}
```

**Query Example**:

```typescript
// Get all symbols
const symbols = await engine.query.querySymbols('./src/utils.ts')

// Get exported functions
const exports = await engine.query.symbols.queryExports('./src/utils.ts')
const functions = exports.filter(s => s.kind === 'function')

// Find symbol at position
const symbol = await engine.query.symbols.querySymbolAtPosition('./src/utils.ts', 42, 10)
```

### 3. Call Graph

Function call relationships with entry points and call chains.

```typescript
interface CallGraph {
  filePath: string
  nodes: CallNode[]
  edges: CallEdge[]
  entryPoints: string[]
}

interface CallNode {
  id: string
  name: string
  kind: 'function' | 'method' | 'constructor' | 'arrow'
  range: Range
  isAsync: boolean
  isGenerator: boolean
}

interface CallEdge {
  from: string
  to: string
  range: Range
  isDynamic: boolean
  callCount: number
}
```

**Query Example**:

```typescript
// Get call graph
const callGraph = await engine.query.queryCallGraph('./src/utils.ts')

// Find entry points
const entryPoints = await engine.query.callGraph.queryEntryPoints('./src/utils.ts')

// Find callers of a function
const callers = await engine.query.callGraph.queryCallers('./src/utils.ts', 'myFunction')

// Find call chain
const chain = await engine.query.callGraph.queryCallChain('./src/utils.ts', 'main', 'helper')

// Find recursive functions
const recursive = await engine.query.callGraph.queryRecursiveFunctions('./src/utils.ts')
```

### 4. Complexity Metrics

Cyclomatic, cognitive, Halstead, and maintainability metrics.

```typescript
interface ComplexityMetrics {
  cyclomatic: number
  cognitive: number
  halstead: HalsteadMetrics
  maintainabilityIndex: number
  linesOfCode: number
  commentRatio: number
}

interface HalsteadMetrics {
  n1: number  // distinct operators
  n2: number  // distinct operands
  N1: number  // total operators
  N2: number  // total operands
  difficulty: number
  effort: number
  bugs: number
}
```

**Query Example**:

```typescript
// Get complexity metrics
const metrics = await engine.query.queryComplexity('./src/utils.ts')

console.log('Cyclomatic complexity:', metrics.cyclomatic)
console.log('Cognitive complexity:', metrics.cognitive)
console.log('Maintainability index:', metrics.maintainabilityIndex)
console.log('Estimated bugs:', metrics.halstead.bugs)
```

### 5. Patterns

Code smells, anti-patterns, security risks, and performance issues.

```typescript
interface Pattern {
  id: string
  type: PatternType
  name: string
  range: Range
  description: string
  suggestions: string[]
  severity: 'info' | 'warning' | 'error'
}

type PatternType =
  | 'anti-pattern'
  | 'code-smell'
  | 'security-risk'
  | 'performance-issue'
  | 'best-practice'
  | 'architecture-pattern'
```

**Query Example**:

```typescript
// Get all patterns
const patterns = await engine.query.queryPatterns('./src/utils.ts')

// Filter by severity
const errors = patterns.filter(p => p.severity === 'error')
const warnings = patterns.filter(p => p.severity === 'warning')

// Filter by type
const securityRisks = patterns.filter(p => p.type === 'security-risk')
const codeSmells = patterns.filter(p => p.type === 'code-smell')
```

## Cache System

### Two-Tier Architecture

```
L1: Memory Cache (LRU)
├── Fast access (~1ms)
├── Limited size (1000 entries)
└── TTL: 30 minutes

L2: LevelDB Storage
├── Persistent storage
├── Compression (gzip/brotli)
├── Unlimited size
└── TTL: 7 days
```

### Cache Promotion/Demotion

```typescript
// Hot data (frequently accessed) → Promoted to L1
// Cold data (infrequently accessed) → Demoted to L2
// Expired data → Evicted from both levels
```

### Compression

```typescript
// Automatic compression based on data size and type
// AST/CallGraph: Always compressed (high redundancy)
// Symbols/Patterns: Compressed if > 1KB
// Complexity: Rarely compressed (small size)

// Compression algorithms
- Gzip: Good balance (default)
- Brotli: Best compression (slower)
- None: For incompressible data
```

## Incremental Indexing

### Strategy

1. **File Changed** → Detected by watcher
2. **Checksum Validation** → Only reindex if content changed
3. **Dependency Analysis** → Identify affected files
4. **Batch Processing** → Process in parallel (10 concurrent)
5. **Cascade Updates** → Reindex dependents if exports changed

### Dependency Graph

```typescript
// Track imports as dependencies
import { helper } from './helper'  // Creates edge: current → helper

// Bidirectional tracking
- Dependencies: Files this file imports
- Dependents: Files that import this file

// Circular dependency detection
const cycles = engine.getCircularDependencies()
```

### Watch Mode

```typescript
// Enable automatic file watching
const engine = createEngine({ watchMode: true })

// Watch directory for changes
await engine.watchDirectory('./src')

// Watcher events
watcher.on('change', (event) => {
  console.log('File changed:', event.path, event.type)
})

watcher.on('indexed', (stats) => {
  console.log('Indexed:', stats.added, 'Added:', stats.removed)
})

watcher.on('error', (error) => {
  console.error('Watcher error:', error)
})
```

## Query API Reference

### High-Level Queries

```typescript
// Query all precomputed data
const all = await engine.query.queryAll('./src/utils.ts')

// Individual queries
const ast = await engine.query.queryAST('./src/utils.ts')
const symbols = await engine.query.querySymbols('./src/utils.ts')
const callGraph = await engine.query.queryCallGraph('./src/utils.ts')
const complexity = await engine.query.queryComplexity('./src/utils.ts')
const patterns = await engine.query.queryPatterns('./src/utils.ts')
```

### Low-Level Queries

```typescript
// AST queries
import * as ast from './actionbook/api/queries/ast.js'

const node = await ast.queryASTAtPosition('./src/utils.ts', 42, 10)
const functions = await ast.queryASTByType('./src/utils.ts', 'FunctionDeclaration')

// Symbol queries
import * as symbols from './actionbook/api/queries/symbols.js'

const exports = await symbols.queryExports('./src/utils.ts')
const imports = await symbols.queryImports('./src/utils.ts')
const functions = await symbols.queryFunctions('./src/utils.ts')

// Call graph queries
import * as callGraph from './actionbook/api/queries/call-graph.js'

const entryPoints = await callGraph.queryEntryPoints('./src/utils.ts')
const callers = await callGraph.queryCallers('./src/utils.ts', 'myFunction')
const callees = await callGraph.queryCallees('./src/utils.ts', 'myFunction')
const chain = await callGraph.queryCallChain('./src/utils.ts', 'main', 'helper')
```

## Advanced Usage

### Custom Configuration

```typescript
const engine = createEngine({
  cachePath: './custom-cache-path',
  watchMode: true,
  compressionEnabled: true,
  maxMemoryCacheSize: 2000,
  logLevel: 'debug',
})
```

### Manual Indexing

```typescript
// Index single file
const data = await engine.indexFile('./src/utils.ts')

// Index multiple files
const stats = await engine.indexFiles([
  './src/utils.ts',
  './src/helpers.ts',
])

// Index directory
const stats = await engine.indexDirectory('./src', ['.ts', '.tsx'])
```

### Cache Management

```typescript
// Warm up cache
await engine.warmup(['./src/utils.ts', './src/helpers.ts'])

// Get cache statistics
const stats = await engine.getCacheStats()
console.log('L1 hit rate:', stats.l1.hitRate)
console.log('L2 size:', stats.l2.size)
console.log('Combined hit rate:', stats.combined.hitRate)

// Clear all caches
await engine.clearCache()
```

### Dependency Analysis

```typescript
// Get dependency graph
const graph = engine.getDependencyGraph()
for (const [file, deps] of graph) {
  console.log(`${file} depends on:`, Array.from(deps))
}

// Detect circular dependencies
const cycles = engine.getCircularDependencies()
for (const cycle of cycles) {
  console.error('Circular dependency:', cycle.join(' → '))
}
```

## Performance Tuning

### Optimization Tips

1. **Increase L1 cache size** for large codebases:
   ```typescript
   createEngine({ maxMemoryCacheSize: 5000 })
   ```

2. **Disable watch mode** for CI/CD:
   ```typescript
   createEngine({ watchMode: false })
   ```

3. **Use selective indexing** for faster startup:
   ```typescript
   // Only index specific files
   await engine.indexFiles(['./src/core.ts'])
   ```

4. **Batch queries** to reduce overhead:
   ```typescript
   const files = ['./src/a.ts', './src/b.ts', './src/c.ts']
   const results = await Promise.all(
     files.map(f => engine.query.querySymbols(f))
   )
   ```

## Troubleshooting

### Common Issues

**Issue**: Slow initial indexing
**Solution**: Increase batch size or index selectively

**Issue**: Low cache hit rate
**Solution**: Warm up cache with frequently accessed files

**Issue**: High memory usage
**Solution**: Reduce L1 cache size or disable compression

**Issue**: Watcher not detecting changes
**Solution**: Check file permissions and ensure watch mode is enabled

### Debug Mode

```typescript
const engine = createEngine({ logLevel: 'debug' })

// Enable verbose logging
engine.log('debug', 'Debug message')
```

## API Reference

See [API Documentation](./docs/API.md) for complete API reference.

## License

MIT
