# Brain API v2.0

## Overview

The Brain API provides intelligent context management and optimization for CCJK. It implements advanced token optimization strategies that achieve up to 83% token savings while maintaining full functionality. The Brain system includes context compression, interview mode, and post-mortem analysis capabilities.

## Features

- **Context Compression**: Reduce token usage by up to 83%
- **Interview Mode**: AI-powered context gathering
- **Post-Mortem Analysis**: Detailed error analysis and recovery
- **Token Optimization**: Smart context trimming strategies
- **Multi-Modal Support**: Text, code, and structured data
- **Real-Time Metrics**: Performance tracking and insights

## Installation

```bash
npm install @ccjk/v2
```

## Quick Start

```typescript
import { BrainSystem, ContextCompressor } from '@ccjk/v2'

// Initialize brain system
const brain = new BrainSystem({
  maxTokens: 100000,
  compressionRatio: 0.83,
  enableMetrics: true
})

// Compress context
const originalContext = {
  files: [{ path: 'src/index.ts', content: '...' }, /* ... */],
  messages: [/* long conversation history */],
  tools: [/* tool definitions */]
}

const compressed = await brain.compressContext(originalContext, {
  strategy: 'intelligent',
  preserve: ['critical-files', 'recent-messages']
})

console.log(`Compressed from ${compressed.originalTokens} to ${compressed.compressedTokens} tokens`)
console.log(`Saved ${compressed.savedPercentage}%`)
```

## API Reference

### BrainSystem

Main class for brain operations.

#### Constructor

```typescript
constructor(options: BrainOptions)
```

**Parameters:**
- `options.maxTokens` - Maximum allowed tokens (default: `100000`)
- `options.compressionRatio` - Target compression ratio (default: `0.83`)
- `options.enableMetrics` - Enable performance metrics (default: `true`)
- `options.cacheSize` - Context cache size (default: `100`)
- `options.strategies` - Custom compression strategies

#### Methods

##### compressContext

```typescript
async compressContext(context: ContextData, options: CompressionOptions): Promise<CompressionResult>
```

Compresses context data to reduce token usage.

**Parameters:**
- `context.files` - Array of file objects with path and content
- `context.messages` - Array of message objects
- `context.tools` - Array of tool definitions
- `context.metadata` - Additional context metadata
- `options.strategy` - Compression strategy ('aggressive', 'intelligent', 'conservative')
- `options.preserve` - Array of preservation rules

**Returns:**
- `compressedContext` - The compressed context data
- `originalTokens` - Original token count
- `compressedTokens` - Compressed token count
- `savedTokens` - Number of tokens saved
- `savedPercentage` - Percentage of tokens saved
- `compressionDetails` - Detailed compression report

**Example:**
```typescript
const result = await brain.compressContext(
  {
    files: [
      { path: 'src/app.ts', content: 'import express from "express"...' },
      { path: 'src/routes.ts', content: 'router.get("/", handler)...' }
    ],
    messages: [
      { role: 'user', content: 'Create a new API endpoint' },
      { role: 'assistant', content: 'I\'ll create a new endpoint...' }
    ],
    tools: [/* tool definitions */]
  },
  {
    strategy: 'intelligent',
    preserve: ['entry-points', 'exports', 'type-definitions']
  }
)

console.log(`Compressed ${result.savedPercentage}% (${result.savedTokens} tokens)`)
```

##### interview

```typescript
async interview(options: InterviewOptions): Promise<InterviewResult>
```

Conducts an AI interview to gather missing context.

**Parameters:**
- `options.topic` - Interview topic
- `options.goals` - Array of goals to achieve
- `options.questions` - Pre-defined questions (optional)
- `options.context` - Initial context
- `options.maxQuestions` - Maximum questions (default: `10`)

**Returns:**
- `collectedContext` - Gathered context
- `questionsAsked` - Questions that were asked
- `responses` - User responses
- `confidence` - Confidence score (0-1)

**Example:**
```typescript
const result = await brain.interview({
  topic: 'Database Schema',
  goals: [
    'Understand current schema',
    'Identify migration needs',
    'Determine performance requirements'
  ],
  context: {
    currentSchema: 'PostgreSQL with 15 tables',
    issues: ['Slow queries on users table']
  }
})

console.log('Interview confidence:', result.confidence)
console.log('Collected context:', result.collectedContext)
```

##### analyze

```typescript
async analyze(context: ContextData): Promise<AnalysisResult>
```

Analyzes context to identify optimization opportunities.

**Returns:**
- `tokenUsage` - Current token usage breakdown
- `optimizationOpportunities` - Array of optimization suggestions
- `criticalElements` - Elements that should not be compressed
- `compressionScore` - Suitability score for compression (0-1)

**Example:**
```typescript
const analysis = await brain.analyze({
  files: [/* file data */],
  messages: [/* message history */],
  tools: [/* tool definitions */]
})

console.log('Current tokens:', analysis.tokenUsage.total)
console.log('Compression score:', analysis.compressionScore)
console.log('Optimizations:', analysis.optimizationOpportunities)
```

##### postMortem

```typescript
async postMortem(error: Error, context: ContextData): Promise<PostMortemResult>
```

Performs detailed error analysis and recovery suggestions.

**Returns:**
- `errorAnalysis` - Structured error analysis
- `recoverySuggestions` - Array of recovery strategies
- `contextRecovery` - Recovered context (if applicable)
- `preventionTips` - Tips to prevent similar errors

**Example:**
```typescript
try {
  // Some operation
} catch (error) {
  const postMortem = await brain.postMortem(error, context)

  console.log('Error cause:', postMortem.errorAnalysis.cause)
  console.log('Recovery steps:', postMortem.recoverySuggestions)
  console.log('Prevention:', postMortem.preventionTips)
}
```

##### getMetrics

```typescript
getMetrics(): MetricsData
```

Returns performance metrics.

**Returns:**
- `totalRequests` - Total compression requests
- `averageCompressionRatio` - Average compression achieved
- `cacheHitRate` - Cache hit rate (0-1)
- `processingTime` - Average processing time in ms
- `tokenSavings` - Total tokens saved
- `strategiesUsed` - Count of each strategy used

##### clearCache

```typescript
clearCache(): void
```

Clears the context cache.

### ContextCompressor

Low-level context compression utilities.

#### Methods

##### compressFiles

```typescript
static compressFiles(files: FileData[], options: CompressionOptions): CompressedFile[]
```

Compresses file data.

##### compressMessages

```typescript
static compressMessages(messages: MessageData[], options: CompressionOptions): CompressedMessage[]
```

Compresses message history.

##### compressTools

```typescript
static compressTools(tools: ToolDefinition[], options: CompressionOptions): CompressedTool[]
```

Compresses tool definitions.

### Types

```typescript
interface ContextData {
  files?: FileData[]
  messages?: MessageData[]
  tools?: ToolDefinition[]
  metadata?: Record<string, any>
}

interface FileData {
  path: string
  content: string
  size?: number
  language?: string
  importance?: number // 0-1
}

interface MessageData {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  metadata?: Record<string, any>
}

interface CompressionOptions {
  strategy: 'aggressive' | 'intelligent' | 'conservative'
  preserve?: string[] // Array of preservation rules
  maxTokens?: number
  targetRatio?: number
}

interface CompressionResult {
  compressedContext: ContextData
  originalTokens: number
  compressedTokens: number
  savedTokens: number
  savedPercentage: number
  compressionDetails: CompressionReport
}

interface CompressionReport {
  files: FileCompression[]
  messages: MessageCompression[]
  tools: ToolCompression[]
  strategyUsed: string
  timestamp: string
}

interface InterviewOptions {
  topic: string
  goals: string[]
  questions?: string[]
  context?: Record<string, any>
  maxQuestions?: number
}

interface InterviewResult {
  collectedContext: Record<string, any>
  questionsAsked: string[]
  responses: Record<string, any>
  confidence: number
}

interface AnalysisResult {
  tokenUsage: TokenUsage
  optimizationOpportunities: Optimization[]
  criticalElements: string[]
  compressionScore: number
}

interface PostMortemResult {
  errorAnalysis: ErrorAnalysis
  recoverySuggestions: RecoveryStrategy[]
  contextRecovery?: ContextData
  preventionTips: string[]
}

interface MetricsData {
  totalRequests: number
  averageCompressionRatio: number
  cacheHitRate: number
  processingTime: number
  tokenSavings: number
  strategiesUsed: Record<string, number>
}
```

## Configuration

### Compression Strategies

**Aggressive**
- Maximum compression (up to 90%)
- May lose some non-critical information
- Best for: Large contexts, non-critical operations

**Intelligent** (Default)
- Balanced compression (83% average)
- Preserves critical information
- Best for: Most use cases

**Conservative**
- Minimal compression (50-60%)
- Preserves all important information
- Best for: Critical contexts, debugging

### Preservation Rules

Define what should not be compressed:

```typescript
const preservationRules = [
  'entry-points',      // Keep main entry points
  'exports',           // Keep exported functions
  'type-definitions',  // Keep TypeScript types
  'critical-files',    // Marked as critical
  'recent-messages',   // Last 10 messages
  'user-input',        // User-provided content
  'error-messages',    // Error information
  'config',            // Configuration data
  'metadata'           // Important metadata
]
```

### Cache Configuration

```typescript
const brain = new BrainSystem({
  cacheSize: 200,              // Number of contexts to cache
  cacheExpiration: 3600000,    // Cache expiration in ms (1 hour)
  enableCompressionCache: true // Cache compression results
})
```

## Examples

### Example 1: Code Review Context Compression

```typescript
// Large codebase with many files
const context = {
  files: [
    { path: 'src/index.ts', content: '...', importance: 1.0 },
    { path: 'src/utils.ts', content: '...', importance: 0.8 },
    { path: 'src/old.ts', content: '...', importance: 0.3 },
    // ... 100 more files
  ],
  messages: [
    { role: 'user', content: 'Review this PR' },
    { role: 'assistant', content: 'I\'ll review the changes...' },
    // ... long conversation
  ]
}

// Compress for code review
const compressed = await brain.compressContext(context, {
  strategy: 'intelligent',
  preserve: ['entry-points', 'type-definitions', 'recent-messages'],
  maxTokens: 50000
})

// Result: Reduced from 150k to 25k tokens (83% compression)
console.log(`Review context: ${compressed.savedPercentage}% smaller`)
```

### Example 2: Interview Mode for Requirements

```typescript
// Gather requirements through AI interview
const interview = await brain.interview({
  topic: 'API Requirements',
  goals: [
    'Understand endpoint structure',
    'Determine authentication needs',
    'Identify rate limiting requirements',
    'Define response formats'
  ],
  context: {
    project: 'Customer API',
    existing: 'REST API v1'
  },
  maxQuestions: 15
})

console.log('Interview results:', interview.collectedContext)
console.log('Confidence:', interview.confidence)

// Use collected context for API design
const apiDesign = await designAPI(interview.collectedContext)
```

### Example 3: Error Analysis

```typescript
try {
  await processLargeDataset(dataset)
} catch (error) {
  // Get detailed error analysis
  const analysis = await brain.postMortem(error, {
    files: [{ path: 'dataset.json', content: JSON.stringify(dataset) }],
    messages: [/* conversation history */]
  })

  // Recovery strategies
  console.log('Recovery options:')
  for (const strategy of analysis.recoverySuggestions) {
    console.log(`- ${strategy.type}: ${strategy.description}`)
  }

  // Prevent future errors
  console.log('Prevention tips:', analysis.preventionTips)
}
```

### Example 4: Metrics and Monitoring

```typescript
// Get performance metrics
const metrics = brain.getMetrics()

console.log('Brain Performance:')
console.log(`- Compression requests: ${metrics.totalRequests}`)
console.log(`- Average ratio: ${(metrics.averageCompressionRatio * 100).toFixed(1)}%`)
console.log(`- Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`)
console.log(`- Token savings: ${metrics.tokenSavings.toLocaleString()}`)

// Monitor strategy usage
console.log('Strategy usage:')
Object.entries(metrics.strategiesUsed).forEach(([strategy, count]) => {
  console.log(`- ${strategy}: ${count} times`)
})
```

### Example 5: Custom Compression Strategy

```typescript
// Define custom compression strategy
const customStrategy = {
  name: 'domain-specific',
  compress: (context, options) => {
    // Custom logic for domain-specific compression
    if (context.files.some(f => f.path.endsWith('.feature'))) {
      // Preserve all feature files
      return { preserved: true }
    }

    // Apply standard compression
    return ContextCompressor.compressFiles(context.files, options)
  }
}

// Use custom strategy
const brain = new BrainSystem({
  strategies: [customStrategy]
})

const result = await brain.compressContext(context, {
  strategy: 'domain-specific'
})
```

## Error Handling

### CompressionError

Thrown when compression fails.

```typescript
try {
  await brain.compressContext(context, options)
} catch (error) {
  if (error instanceof CompressionError) {
    console.error('Compression failed:', error.message)
    console.error('Strategy:', error.strategy)
    console.error('Context:', error.context)
  }
}
```

### InterviewError

Thrown during interview process.

```typescript
try {
  await brain.interview({ topic: 'invalid' })
} catch (error) {
  if (error instanceof InterviewError) {
    console.error('Interview failed:', error.message)
  }
}
```

## Performance

- **Compression Speed**: ~1000 tokens/ms on modern hardware
- **Cache Hit Rate**: 80%+ with typical usage patterns
- **Memory Usage**: O(n) where n is cache size
- **Token Optimization**: 83% average savings
- **Processing Time**: < 100ms for typical contexts

## Best Practices

1. **Choose the Right Strategy**
   - Use 'intelligent' for general purpose
   - Use 'aggressive' for very large contexts
   - Use 'conservative' for debugging

2. **Define Preservation Rules**
   - Always preserve entry points
   - Keep recent user messages
   - Protect critical configuration

3. **Use Interview Mode Wisely**
   - Define clear goals
   - Limit question count
   - Provide initial context

4. **Monitor Metrics**
   - Check compression ratios
   - Monitor cache hit rates
   - Track token savings

5. **Handle Errors Gracefully**
   - Always have fallback for compression
   - Use conservative mode for critical operations
   - Implement retry logic

## See Also

- [Hooks API](./hooks-v2.md) - Traceability and enforcement
- [Skills API](./skills-v2.md) - Dynamic skill loading
- [Agents API](./agents-v2.md) - Multi-agent orchestration
- [Workflow API](./workflow-v2.md) - Workflow generation

---

**Source**: [src/brain/context-compression/compressor.ts](../../src/brain/context-compression/compressor.ts#L1)

**Last Updated**: 2026-01-23