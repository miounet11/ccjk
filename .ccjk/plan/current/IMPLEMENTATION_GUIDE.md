# Implementation Guide - Intelligent Agent & Skills Generation

**For**: Development Team
**Date**: 2026-02-04
**Version**: 1.0

---

## Quick Start

This guide provides practical information for developers implementing the Intelligent Agent and Skills Generation system.

---

## Development Setup

### Prerequisites

```bash
# Ensure you have the required tools
node --version  # Should be 18+
pnpm --version  # Should be 8+

# Clone and setup
cd /Users/lu/ccjk-public
pnpm install
```

### Create Feature Branch

```bash
git checkout -b feature/intelligent-generation
```

### Project Structure

```bash
# Create the new module structure
mkdir -p src/generation/{analysis,engine,validation,knowledge,orchestrator,utils}
mkdir -p src/generation/{analysis,engine,validation,knowledge}/__tests__
mkdir -p templates/generation/{agents,skills}
mkdir -p tests/generation/{e2e,fixtures}
```

---

## Phase 1: Foundation (Week 1-2)

### Day 1-2: Project Structure & Types

#### Create Core Types

**File**: `/Users/lu/ccjk-public/src/generation/types.ts`

```typescript
/**
 * Core types for intelligent generation system
 */

export interface ProjectContext {
  projectPath: string
  projectType: string
  languages: LanguageInfo[]
  frameworks: FrameworkInfo[]
  architecture: ArchitectureInfo
  codePatterns: CodePattern[]
  dependencies: DependencyGraph
  practices: PracticeInfo
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  recommendations: Recommendation[]
  metadata: AnalysisMetadata
}

export interface AnalysisMetadata {
  timestamp: Date
  duration: number
  filesScanned: number
  confidence: number
  version: string
}

export interface CodePattern {
  type: 'design-pattern' | 'architectural-pattern' | 'idiom'
  name: string
  locations: string[]
  frequency: number
  confidence: number
}

export interface ArchitectureInfo {
  layers: Layer[]
  modules: Module[]
  patterns: ArchitecturalPattern[]
  stateManagement?: StateManagementInfo
  errorHandling?: ErrorHandlingInfo
  apiDesign?: ApiDesignInfo
}

export interface GeneratedAgent {
  id: string
  name: MultilingualString
  description: MultilingualString
  persona: string
  instructions: string
  capabilities: AgentCapability[]
  skills: SkillReference[]
  mcpServers: McpServerReference[]
  generatedFrom: 'analysis' | 'template' | 'hybrid'
  confidence: number
  reasoning: string
  customizations: Customization[]
}

export interface GeneratedSkill {
  id: string
  name: MultilingualString
  description: MultilingualString
  category: SkillCategory
  triggers: string[]
  template: string
  tags: string[]
  generatedFrom: 'analysis' | 'template' | 'hybrid'
  confidence: number
  reasoning: string
  examples: string[]
}

// Add more types as needed...
```

#### Create Constants

**File**: `/Users/lu/ccjk-public/src/generation/constants.ts`

```typescript
/**
 * Constants for generation system
 */

export const ANALYSIS_CONFIG = {
  MAX_FILES_TO_SCAN: 10000,
  MIN_CONFIDENCE: 0.6,
  CACHE_TTL: 3600000, // 1 hour
  TIMEOUT: 30000, // 30 seconds
}

export const GENERATION_CONFIG = {
  MAX_AGENTS: 10,
  MAX_SKILLS: 50,
  MIN_QUALITY_SCORE: 70,
  DEFAULT_LANGUAGE: 'en' as const,
}

export const PATTERN_WEIGHTS = {
  'design-pattern': 1.0,
  'architectural-pattern': 1.2,
  'idiom': 0.8,
}

export const FRAMEWORK_PRIORITY = {
  'next.js': 10,
  'nuxt': 9,
  'sveltekit': 8,
  'astro': 7,
  'react': 5,
  'vue': 5,
  'angular': 5,
}
```

### Day 3-5: Code Analyzer

**File**: `/Users/lu/ccjk-public/src/generation/analysis/code-analyzer.ts`

```typescript
import * as ts from 'typescript'
import { parse } from '@babel/parser'
import { readFileSync } from 'fs-extra'
import { glob } from 'tinyglobby'
import type { CodePattern, ProjectContext } from '../types.js'

/**
 * Analyzes code structure and patterns using AST
 */
export class CodeAnalyzer {
  private projectPath: string
  private patterns: Map<string, CodePattern> = new Map()

  constructor(projectPath: string) {
    this.projectPath = projectPath
  }

  /**
   * Analyze TypeScript/JavaScript files
   */
  async analyzeTypeScript(files: string[]): Promise<CodePattern[]> {
    const patterns: CodePattern[] = []

    for (const file of files) {
      if (!file.match(/\.(ts|tsx|js|jsx)$/)) continue

      try {
        const content = readFileSync(file, 'utf-8')
        const sourceFile = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        )

        // Detect patterns
        this.detectSingletonPattern(sourceFile, patterns)
        this.detectFactoryPattern(sourceFile, patterns)
        this.detectObserverPattern(sourceFile, patterns)
        // Add more pattern detectors...
      } catch (error) {
        console.warn(`Failed to analyze ${file}:`, error)
      }
    }

    return this.aggregatePatterns(patterns)
  }

  /**
   * Detect Singleton pattern
   */
  private detectSingletonPattern(
    sourceFile: ts.SourceFile,
    patterns: CodePattern[]
  ): void {
    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node)) {
        const hasPrivateConstructor = node.members.some(
          member =>
            ts.isConstructorDeclaration(member) &&
            member.modifiers?.some(
              mod => mod.kind === ts.SyntaxKind.PrivateKeyword
            )
        )

        const hasGetInstanceMethod = node.members.some(
          member =>
            ts.isMethodDeclaration(member) &&
            member.name.getText() === 'getInstance'
        )

        if (hasPrivateConstructor && hasGetInstanceMethod) {
          patterns.push({
            type: 'design-pattern',
            name: 'Singleton',
            locations: [sourceFile.fileName],
            frequency: 1,
            confidence: 0.9,
          })
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  /**
   * Detect Factory pattern
   */
  private detectFactoryPattern(
    sourceFile: ts.SourceFile,
    patterns: CodePattern[]
  ): void {
    // Implementation for factory pattern detection
    // Look for functions that return different types based on input
  }

  /**
   * Detect Observer pattern
   */
  private detectObserverPattern(
    sourceFile: ts.SourceFile,
    patterns: CodePattern[]
  ): void {
    // Implementation for observer pattern detection
    // Look for subscribe/unsubscribe methods, event emitters, etc.
  }

  /**
   * Aggregate duplicate patterns
   */
  private aggregatePatterns(patterns: CodePattern[]): CodePattern[] {
    const aggregated = new Map<string, CodePattern>()

    for (const pattern of patterns) {
      const key = `${pattern.type}:${pattern.name}`
      const existing = aggregated.get(key)

      if (existing) {
        existing.locations.push(...pattern.locations)
        existing.frequency += pattern.frequency
      } else {
        aggregated.set(key, { ...pattern })
      }
    }

    return Array.from(aggregated.values())
  }
}
```

**Test File**: `/Users/lu/ccjk-public/src/generation/analysis/__tests__/code-analyzer.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { CodeAnalyzer } from '../code-analyzer.js'
import { join } from 'pathe'

describe('CodeAnalyzer', () => {
  it('should detect Singleton pattern', async () => {
    const analyzer = new CodeAnalyzer('/test/project')
    const patterns = await analyzer.analyzeTypeScript([
      join(__dirname, 'fixtures', 'singleton.ts'),
    ])

    expect(patterns).toContainEqual(
      expect.objectContaining({
        type: 'design-pattern',
        name: 'Singleton',
        confidence: expect.any(Number),
      })
    )
  })

  it('should detect Factory pattern', async () => {
    // Test factory pattern detection
  })

  it('should aggregate duplicate patterns', async () => {
    // Test pattern aggregation
  })
})
```

### Day 6-8: Architecture Analyzer

**File**: `/Users/lu/ccjk-public/src/generation/analysis/architecture-analyzer.ts`

```typescript
import { readFileSync, existsSync } from 'fs-extra'
import { join } from 'pathe'
import type { ArchitectureInfo, Layer, Module } from '../types.js'

/**
 * Analyzes project architecture
 */
export class ArchitectureAnalyzer {
  private projectPath: string

  constructor(projectPath: string) {
    this.projectPath = projectPath
  }

  /**
   * Analyze project architecture
   */
  async analyze(): Promise<ArchitectureInfo> {
    const layers = await this.detectLayers()
    const modules = await this.detectModules()
    const patterns = await this.detectArchitecturalPatterns()

    return {
      layers,
      modules,
      patterns,
      stateManagement: await this.detectStateManagement(),
      errorHandling: await this.detectErrorHandling(),
      apiDesign: await this.detectApiDesign(),
    }
  }

  /**
   * Detect architectural layers
   */
  private async detectLayers(): Promise<Layer[]> {
    const layers: Layer[] = []

    // Check for common layer directories
    const layerDirs = [
      { name: 'presentation', paths: ['src/components', 'src/pages', 'src/views'] },
      { name: 'business', paths: ['src/services', 'src/domain', 'src/core'] },
      { name: 'data', paths: ['src/models', 'src/repositories', 'src/data'] },
      { name: 'infrastructure', paths: ['src/infrastructure', 'src/lib', 'src/utils'] },
    ]

    for (const layer of layerDirs) {
      for (const path of layer.paths) {
        const fullPath = join(this.projectPath, path)
        if (existsSync(fullPath)) {
          layers.push({
            name: layer.name,
            path,
            confidence: 0.8,
          })
          break
        }
      }
    }

    return layers
  }

  /**
   * Detect modules
   */
  private async detectModules(): Promise<Module[]> {
    // Implementation for module detection
    return []
  }

  /**
   * Detect architectural patterns
   */
  private async detectArchitecturalPatterns() {
    // Implementation for architectural pattern detection
    return []
  }

  /**
   * Detect state management approach
   */
  private async detectStateManagement() {
    // Check for Redux, MobX, Zustand, etc.
    return undefined
  }

  /**
   * Detect error handling patterns
   */
  private async detectErrorHandling() {
    // Check for error boundaries, try-catch patterns, etc.
    return undefined
  }

  /**
   * Detect API design patterns
   */
  private async detectApiDesign() {
    // Check for REST, GraphQL, tRPC, etc.
    return undefined
  }
}
```

### Day 9-10: Context Builder

**File**: `/Users/lu/ccjk-public/src/generation/analysis/context-builder.ts`

```typescript
import type { ProjectContext, ProjectAnalysis } from '../types.js'
import { CodeAnalyzer } from './code-analyzer.js'
import { ArchitectureAnalyzer } from './architecture-analyzer.js'
import { DependencyAnalyzer } from './dependency-analyzer.js'
import { PracticeAnalyzer } from './practice-analyzer.js'

/**
 * Builds comprehensive project context from analysis results
 */
export class ContextBuilder {
  /**
   * Build project context
   */
  async build(
    projectPath: string,
    projectAnalysis: ProjectAnalysis
  ): Promise<ProjectContext> {
    const startTime = Date.now()

    // Run analyzers
    const codeAnalyzer = new CodeAnalyzer(projectPath)
    const archAnalyzer = new ArchitectureAnalyzer(projectPath)
    const depAnalyzer = new DependencyAnalyzer(projectPath)
    const practiceAnalyzer = new PracticeAnalyzer(projectPath)

    // Gather analysis results
    const [codePatterns, architecture, dependencies, practices] =
      await Promise.all([
        codeAnalyzer.analyzeTypeScript([]), // Pass actual files
        archAnalyzer.analyze(),
        depAnalyzer.analyze(),
        practiceAnalyzer.analyze(),
      ])

    // Generate insights
    const strengths = this.identifyStrengths({
      codePatterns,
      architecture,
      practices,
    })
    const weaknesses = this.identifyWeaknesses({
      codePatterns,
      architecture,
      practices,
    })
    const opportunities = this.identifyOpportunities({
      codePatterns,
      architecture,
      practices,
    })
    const recommendations = this.generateRecommendations({
      strengths,
      weaknesses,
      opportunities,
    })

    // Calculate overall confidence
    const confidence = this.calculateConfidence({
      projectAnalysis,
      codePatterns,
      architecture,
    })

    return {
      projectPath,
      projectType: projectAnalysis.projectType,
      languages: projectAnalysis.languages,
      frameworks: projectAnalysis.frameworks,
      architecture,
      codePatterns,
      dependencies,
      practices,
      strengths,
      weaknesses,
      opportunities,
      recommendations,
      metadata: {
        timestamp: new Date(),
        duration: Date.now() - startTime,
        filesScanned: projectAnalysis.metadata.filesScanned,
        confidence,
        version: '1.0.0',
      },
    }
  }

  private identifyStrengths(data: any): string[] {
    const strengths: string[] = []

    // Analyze patterns
    if (data.codePatterns.length > 5) {
      strengths.push('Uses multiple design patterns')
    }

    // Analyze architecture
    if (data.architecture.layers.length >= 3) {
      strengths.push('Well-structured layered architecture')
    }

    // Analyze practices
    if (data.practices.testingStrategy?.coverage > 80) {
      strengths.push('High test coverage')
    }

    return strengths
  }

  private identifyWeaknesses(data: any): string[] {
    // Implementation for weakness identification
    return []
  }

  private identifyOpportunities(data: any): string[] {
    // Implementation for opportunity identification
    return []
  }

  private generateRecommendations(data: any) {
    // Implementation for recommendation generation
    return []
  }

  private calculateConfidence(data: any): number {
    // Implementation for confidence calculation
    return 0.85
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// Example test structure
import { describe, it, expect, beforeEach } from 'vitest'

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  })

  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test
    })

    it('should handle edge case', () => {
      // Test
    })

    it('should handle error case', () => {
      // Test
    })
  })
})
```

### Integration Tests

```typescript
// Test full analysis pipeline
import { describe, it, expect } from 'vitest'
import { analyzeProject } from '../analysis/index.js'

describe('Analysis Pipeline', () => {
  it('should analyze Next.js project', async () => {
    const context = await analyzeProject('/path/to/nextjs-project')

    expect(context.projectType).toBe('next.js')
    expect(context.frameworks).toContainEqual(
      expect.objectContaining({ name: 'Next.js' })
    )
    expect(context.confidence).toBeGreaterThan(0.8)
  })
})
```

### E2E Tests

```typescript
// Test complete generation workflow
import { describe, it, expect } from 'vitest'
import { generateAgents, generateSkills } from '../index.js'

describe('Generation Workflow', () => {
  it('should generate agents for React project', async () => {
    const agents = await generateAgents('/path/to/react-project', {
      mode: 'auto',
      language: 'en',
    })

    expect(agents).toHaveLength(expect.any(Number))
    expect(agents[0]).toMatchObject({
      name: expect.any(Object),
      description: expect.any(Object),
      capabilities: expect.any(Array),
    })
  })
})
```

---

## Code Style Guidelines

### TypeScript

```typescript
// Use explicit types
function analyze(path: string): Promise<ProjectContext> {
  // Implementation
}

// Use interfaces for complex types
interface AnalysisOptions {
  maxFiles?: number
  minConfidence?: number
  timeout?: number
}

// Use enums for constants
enum PatternType {
  DesignPattern = 'design-pattern',
  ArchitecturalPattern = 'architectural-pattern',
  Idiom = 'idiom',
}

// Document public APIs
/**
 * Analyzes project code structure
 * @param projectPath - Absolute path to project
 * @param options - Analysis options
 * @returns Project context with analysis results
 */
export async function analyzeProject(
  projectPath: string,
  options: AnalysisOptions
): Promise<ProjectContext> {
  // Implementation
}
```

### Error Handling

```typescript
// Use custom error classes
export class AnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AnalysisError'
  }
}

// Handle errors gracefully
try {
  const result = await analyze(path)
  return result
} catch (error) {
  if (error instanceof AnalysisError) {
    logger.error(`Analysis failed: ${error.message}`, error.details)
    throw error
  }
  throw new AnalysisError('Unknown analysis error', 'UNKNOWN', error)
}
```

### Logging

```typescript
import consola from 'consola'

const logger = consola.withTag('generation')

// Use appropriate log levels
logger.info('Starting analysis...')
logger.debug('Analyzing file:', filePath)
logger.warn('Low confidence:', confidence)
logger.error('Analysis failed:', error)
```

---

## Performance Considerations

### Caching

```typescript
import { LRUCache } from 'lru-cache'

const analysisCache = new LRUCache<string, ProjectContext>({
  max: 100,
  ttl: 1000 * 60 * 60, // 1 hour
})

export async function analyzeProject(
  projectPath: string
): Promise<ProjectContext> {
  // Check cache
  const cached = analysisCache.get(projectPath)
  if (cached) return cached

  // Perform analysis
  const context = await performAnalysis(projectPath)

  // Cache result
  analysisCache.set(projectPath, context)

  return context
}
```

### Parallel Processing

```typescript
// Analyze files in parallel
const results = await Promise.all(
  files.map(file => analyzeFile(file))
)

// Use Promise.allSettled for error tolerance
const results = await Promise.allSettled(
  files.map(file => analyzeFile(file))
)

const successful = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value)
```

### Memory Management

```typescript
// Process large file lists in chunks
const CHUNK_SIZE = 100

for (let i = 0; i < files.length; i += CHUNK_SIZE) {
  const chunk = files.slice(i, i + CHUNK_SIZE)
  const results = await Promise.all(chunk.map(analyzeFile))
  // Process results
}
```

---

## Debugging Tips

### Enable Debug Logging

```bash
# Set environment variable
export DEBUG=ccjk:generation:*

# Or in code
process.env.DEBUG = 'ccjk:generation:*'
```

### Use VSCode Debugger

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Generation",
      "program": "${workspaceFolder}/src/generation/index.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

### Inspect Analysis Results

```typescript
// Add inspection utility
export function inspectContext(context: ProjectContext): void {
  console.log('\n=== Project Context ===")
  console.log('Type:', context.projectType)
  console.log('Languages:', context.languages.map(l => l.language))
  console.log('Frameworks:', context.frameworks.map(f => f.name))
  console.log('Patterns:', context.codePatterns.length)
  console.log('Confidence:', context.metadata.confidence)
  console.log('\nStrengths:')
  context.strengths.forEach(s => console.log('  -', s))
  console.log('\nWeaknesses:')
  context.weaknesses.forEach(w => console.log('  -', w))
}
```

---

## Common Issues & Solutions

### Issue: Analysis Takes Too Long

**Solution**: Implement file filtering and caching

```typescript
// Filter files before analysis
const relevantFiles = files.filter(file => {
  // Skip large files
  const stats = statSync(file)
  if (stats.size > 1024 * 1024) return false // Skip files > 1MB

  // Skip generated files
  if (file.includes('node_modules')) return false
  if (file.includes('.next')) return false

  return true
})
```

### Issue: Low Confidence Scores

**Solution**: Improve pattern detection and add more indicators

```typescript
// Add multiple indicators
const indicators = [
  hasConfigFile,
  hasTypicalStructure,
  hasDependencies,
  hasPatterns,
]

const confidence = indicators.filter(Boolean).length / indicators.length
```

### Issue: Memory Leaks

**Solution**: Clean up resources and use weak references

```typescript
// Clean up after analysis
export class Analyzer {
  private cache = new Map()

  async analyze() {
    try {
      // Analysis logic
    } finally {
      this.cleanup()
    }
  }

  private cleanup() {
    this.cache.clear()
  }
}
```

---

## Resources

### Documentation

- TypeScript Compiler API: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
- Babel Parser: https://babeljs.io/docs/en/babel-parser
- tree-sitter: https://tree-sitter.github.io/tree-sitter/

### Tools

- AST Explorer: https://astexplorer.net/
- TypeScript Playground: https://www.typescriptlang.org/play
- Vitest: https://vitest.dev/

### Internal References

- Existing analyzers: `/Users/lu/ccjk-public/src/analyzers/`
- Agent system: `/Users/lu/ccjk-public/src/brain/agents/`
- Skills system: `/Users/lu/ccjk-public/src/skills/`

---

## Checklist

### Phase 1 Completion

- [ ] Project structure created
- [ ] Core types defined
- [ ] CodeAnalyzer implemented
- [ ] ArchitectureAnalyzer implemented
- [ ] DependencyAnalyzer implemented
- [ ] PracticeAnalyzer implemented
- [ ] ContextBuilder implemented
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests written
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Demo prepared

---

**Next**: Proceed to Phase 2 - Intelligence
