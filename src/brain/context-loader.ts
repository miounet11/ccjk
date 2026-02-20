/**
 * Context Loader
 *
 * Hierarchical context loading for Brain System.
 * Loads context in layers: project → domain → task → execution.
 *
 * @module brain/context-loader
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'pathe'
import { glob } from 'tinyglobby'
import type { Task } from './orchestrator-types'
import { executionTracer } from './execution-tracer'
import { fsParadigm } from './fs-paradigm'

/**
 * Context layer types
 */
export type ContextLayer = 'project' | 'domain' | 'task' | 'execution'

/**
 * OpenViking-style tiered loading depth
 * L0: Abstract summary (~100 tokens)
 * L1: Overview (~2k tokens)
 * L2: Full content (no limit)
 */
export type ContextDepth = 'L0' | 'L1' | 'L2'

/**
 * Context entry
 */
export interface ContextEntry {
  layer: ContextLayer
  source: string
  content: string
  priority: number
  depth: ContextDepth
  tokenEstimate: number
  metadata?: Record<string, any>
}

/**
 * Loaded context
 */
export interface LoadedContext {
  layers: Map<ContextLayer, ContextEntry[]>
  totalSize: number
  totalTokens: number
  loadedAt: number
  depth: ContextDepth
}

/**
 * Context loading options
 */
export interface ContextLoadOptions {
  projectRoot?: string
  maxSize?: number // Max total context size in bytes
  tokenBudget?: number // Max tokens (overrides maxSize when set)
  depth?: ContextDepth // Target loading depth (default: auto based on budget)
  layers?: ContextLayer[] // Which layers to load
  task?: Task
}

// Token budget thresholds for each depth level (OpenViking-style)
const DEPTH_TOKEN_BUDGETS: Record<ContextDepth, number> = {
  L0: 100, // Abstract summary only
  L1: 2_000, // Overview
  L2: Number.POSITIVE_INFINITY, // Full content
}

// Chars-per-token estimate (conservative)
const CHARS_PER_TOKEN = 4

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function truncateToDepth(content: string, depth: ContextDepth): string {
  if (depth === 'L2') return content
  const maxChars = DEPTH_TOKEN_BUDGETS[depth] * CHARS_PER_TOKEN
  if (content.length <= maxChars) return content
  // For L0: first paragraph or first 400 chars
  if (depth === 'L0') {
    const firstPara = content.split(/\n\n/)[0]
    return firstPara.length <= maxChars ? firstPara : content.slice(0, maxChars)
  }
  // For L1: truncate with ellipsis
  return `${content.slice(0, maxChars)}\n... (truncated, use L2 for full content)`
}

/**
 * Context Loader
 */
export class ContextLoader {
  private cache = new Map<string, LoadedContext>()
  private readonly defaultMaxSize = 100_000 // 100KB default
  private readonly defaultTokenBudget = 8_000 // ~32KB at 4 chars/token

  /**
   * Resolve effective depth from options.
   * If depth is explicit, use it. Otherwise derive from tokenBudget.
   */
  private resolveDepth(tokenBudget: number, explicitDepth?: ContextDepth): ContextDepth {
    if (explicitDepth) return explicitDepth
    if (tokenBudget <= DEPTH_TOKEN_BUDGETS.L0) return 'L0'
    if (tokenBudget <= DEPTH_TOKEN_BUDGETS.L1) return 'L1'
    return 'L2'
  }

  /**
   * Load context hierarchically with OpenViking-style tiered depth control.
   * Pass tokenBudget to automatically select L0/L1/L2 depth.
   */
  async load(options: ContextLoadOptions = {}): Promise<LoadedContext> {
    const {
      projectRoot = process.cwd(),
      maxSize = this.defaultMaxSize,
      tokenBudget,
      depth: explicitDepth,
      layers = ['project', 'domain', 'task', 'execution'],
      task,
    } = options

    const effectiveBudget = tokenBudget ?? this.defaultTokenBudget
    const depth = this.resolveDepth(effectiveBudget, explicitDepth)

    // Check cache (include depth in key)
    const cacheKey = this.getCacheKey(projectRoot, layers, task?.id, depth)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.loadedAt < 60_000) {
      executionTracer.logEvent('context-load', {
        source: 'cache',
        layers: layers.length,
        size: cached.totalSize,
        tokens: cached.totalTokens,
        depth,
      })
      return cached
    }

    // Load layers
    const context: LoadedContext = {
      layers: new Map(),
      totalSize: 0,
      totalTokens: 0,
      loadedAt: Date.now(),
      depth,
    }

    for (const layer of layers) {
      const entries = await this.loadLayer(layer, projectRoot, task, depth)
      if (entries.length > 0) {
        context.layers.set(layer, entries)
        context.totalSize += entries.reduce((sum, e) => sum + e.content.length, 0)
        context.totalTokens += entries.reduce((sum, e) => sum + e.tokenEstimate, 0)
      }

      // Stop if we exceed budget
      if (context.totalSize > maxSize || context.totalTokens > effectiveBudget) {
        break
      }
    }

    // Cache result
    this.cache.set(cacheKey, context)

    executionTracer.logEvent('context-load', {
      source: 'fresh',
      layers: context.layers.size,
      size: context.totalSize,
      tokens: context.totalTokens,
      depth,
    })

    return context
  }

  /**
   * Load a specific context layer
   */
  private async loadLayer(
    layer: ContextLayer,
    projectRoot: string,
    task?: Task,
    depth: ContextDepth = 'L2',
  ): Promise<ContextEntry[]> {
    switch (layer) {
      case 'project':
        return this.loadProjectContext(projectRoot, depth)
      case 'domain':
        return this.loadDomainContext(projectRoot, task, depth)
      case 'task':
        return this.loadTaskContext(task, depth)
      case 'execution':
        return this.loadExecutionContext(task, depth)
      default:
        return []
    }
  }

  /**
   * Load project-level context
   * - README.md
   * - CLAUDE.md
   * - package.json
   * - tsconfig.json
   */
  private async loadProjectContext(projectRoot: string, depth: ContextDepth = 'L2'): Promise<ContextEntry[]> {
    const entries: ContextEntry[] = []
    const files = ['README.md', 'CLAUDE.md', 'package.json', 'tsconfig.json']

    for (const file of files) {
      const path = join(projectRoot, file)
      if (existsSync(path)) {
        const raw = readFileSync(path, 'utf-8')
        const content = truncateToDepth(raw, depth)
        entries.push({
          layer: 'project',
          source: file,
          content,
          priority: 100,
          depth,
          tokenEstimate: estimateTokens(content),
          metadata: { path },
        })
      }
    }

    return entries
  }

  /**
   * Load domain-specific context
   * Based on task type/domain, load relevant files
   */
  private async loadDomainContext(
    projectRoot: string,
    task?: Task,
    depth: ContextDepth = 'L2',
  ): Promise<ContextEntry[]> {
    if (!task) return []

    const entries: ContextEntry[] = []

    // Detect project structure
    const structure = await fsParadigm.detect(projectRoot)

    // Infer domain from task name/description
    const domain = this.inferDomain(task)
    if (!domain) {
      // No specific domain, load key source files based on paradigm
      const sourceFiles = fsParadigm.getFilesByRole(structure, 'source')
      for (const file of sourceFiles.slice(0, 3)) {
        try {
          const raw = readFileSync(file, 'utf-8')
          const content = truncateToDepth(raw, depth)
          entries.push({
            layer: 'domain',
            source: file.replace(projectRoot, ''),
            content,
            priority: 75,
            depth,
            tokenEstimate: estimateTokens(content),
            metadata: { paradigm: structure.paradigm, path: file },
          })
        }
        catch {
          // Skip unreadable files
        }
      }
      return entries
    }

    // Load domain-specific files using paradigm-aware patterns
    const patterns = this.getDomainPatterns(domain, structure.paradigm)
    for (const pattern of patterns) {
      const files = await glob([pattern], {
        cwd: projectRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      })

      for (const file of files.slice(0, 5)) {
        try {
          const raw = readFileSync(file, 'utf-8')
          const content = truncateToDepth(raw, depth)
          entries.push({
            layer: 'domain',
            source: file.replace(projectRoot, ''),
            content,
            priority: 80,
            depth,
            tokenEstimate: estimateTokens(content),
            metadata: { domain, paradigm: structure.paradigm, path: file },
          })
        }
        catch {
          // Skip unreadable files
        }
      }
    }

    return entries
  }

  /**
   * Load task-specific context
   */
  private async loadTaskContext(task?: Task, depth: ContextDepth = 'L2'): Promise<ContextEntry[]> {
    if (!task) return []

    const entries: ContextEntry[] = []

    // Task description
    if (task.description) {
      const content = truncateToDepth(task.description, depth)
      entries.push({
        layer: 'task',
        source: 'task-description',
        content,
        priority: 90,
        depth,
        tokenEstimate: estimateTokens(content),
        metadata: { taskId: task.id },
      })
    }

    // Task input (skip at L0 — too noisy)
    if (task.input && depth !== 'L0') {
      const content = truncateToDepth(JSON.stringify(task.input, null, 2), depth)
      entries.push({
        layer: 'task',
        source: 'task-input',
        content,
        priority: 85,
        depth,
        tokenEstimate: estimateTokens(content),
        metadata: { taskId: task.id },
      })
    }

    return entries
  }

  /**
   * Load execution-specific context
   * - Recent errors
   * - Previous attempts
   * - Related task outputs
   */
  private async loadExecutionContext(task?: Task, depth: ContextDepth = 'L2'): Promise<ContextEntry[]> {
    if (!task) return []

    const entries: ContextEntry[] = []

    // Previous task output (if retry) — skip at L0
    if (task.output && depth !== 'L0') {
      const content = truncateToDepth(JSON.stringify(task.output, null, 2), depth)
      entries.push({
        layer: 'execution',
        source: 'previous-output',
        content,
        priority: 70,
        depth,
        tokenEstimate: estimateTokens(content),
        metadata: { taskId: task.id },
      })
    }

    return entries
  }

  /**
   * Infer domain from task
   */
  private inferDomain(task: Task): string | null {
    const text = `${task.name} ${task.description || ''}`.toLowerCase()

    // Domain keywords
    const domains = {
      api: ['api', 'endpoint', 'route', 'controller'],
      ui: ['ui', 'component', 'view', 'page', 'frontend'],
      database: ['database', 'db', 'schema', 'migration', 'model'],
      auth: ['auth', 'login', 'user', 'permission', 'session'],
      test: ['test', 'spec', 'e2e', 'unit', 'integration'],
      config: ['config', 'settings', 'env', 'setup'],
    }

    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(kw => text.includes(kw))) {
        return domain
      }
    }

    return null
  }

  /**
   * Get file patterns for a domain (paradigm-aware)
   */
  private getDomainPatterns(domain: string, paradigm?: string): string[] {
    const basePatterns: Record<string, string[]> = {
      api: ['**/api/**/*.ts', '**/routes/**/*.ts', '**/controllers/**/*.ts'],
      ui: ['**/components/**/*.{tsx,vue}', '**/pages/**/*.{tsx,vue}', '**/views/**/*.{tsx,vue}'],
      database: ['**/models/**/*.ts', '**/schema/**/*.ts', '**/migrations/**/*.ts'],
      auth: ['**/auth/**/*.ts', '**/middleware/auth*.ts'],
      test: ['**/*.test.ts', '**/*.spec.ts'],
      config: ['**/config/**/*.ts', '**/*.config.ts'],
    }

    let patterns = basePatterns[domain] || []

    // Adjust patterns based on paradigm
    if (paradigm === 'monorepo') {
      patterns = patterns.map(p => `packages/*/${p}`)
    }
    else if (paradigm === 'fullstack') {
      if (domain === 'ui') {
        patterns = patterns.map(p => `client/${p}`)
      }
      else if (domain === 'api') {
        patterns = patterns.map(p => `server/${p}`)
      }
    }

    return patterns
  }

  /**
   * Get cache key
   */
  private getCacheKey(projectRoot: string, layers: ContextLayer[], taskId?: string, depth: ContextDepth = 'L2'): string {
    return `${projectRoot}:${layers.join(',')}:${taskId || 'none'}:${depth}`
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Format context for LLM consumption
   */
  formatForLLM(context: LoadedContext): string {
    const sections: string[] = []
    sections.push(`<!-- context depth=${context.depth} tokens≈${context.totalTokens} -->\n`)

    const layerOrder: ContextLayer[] = ['project', 'domain', 'task', 'execution']

    for (const layer of layerOrder) {
      const entries = context.layers.get(layer)
      if (!entries || entries.length === 0) continue

      sections.push(`# ${layer.toUpperCase()} CONTEXT\n`)

      const sorted = entries.sort((a, b) => b.priority - a.priority)

      for (const entry of sorted) {
        sections.push(`## ${entry.source} [${entry.depth}]\n`)
        sections.push(entry.content)
        sections.push('\n')
      }
    }

    return sections.join('\n')
  }
}

/**
 * Global context loader instance
 */
export const contextLoader = new ContextLoader()

/**
 * Convenience: load context at a specific OpenViking-style depth.
 *
 * @example
 * // Quick summary for status display
 * const ctx = await loadContextAtDepth('L0')
 *
 * // Full context for deep task execution
 * const ctx = await loadContextAtDepth('L2', { task })
 */
export async function loadContextAtDepth(
  depth: ContextDepth,
  options: Omit<ContextLoadOptions, 'depth'> = {},
): Promise<LoadedContext> {
  return contextLoader.load({ ...options, depth })
}
