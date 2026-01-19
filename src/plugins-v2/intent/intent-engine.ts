/**
 * Intent Detection Engine
 *
 * Automatically detects user intent and activates relevant plugins/skills
 * without requiring explicit slash commands.
 *
 * Features:
 * - Pattern matching (regex + keywords)
 * - Context signal detection (git status, project type, etc.)
 * - Confidence scoring
 * - Auto-execution or suggestion mode
 *
 * @module plugins-v2/intent/intent-engine
 */

import type {
  ContextSignal,
  DetectionContext,
  GitStatus,
  IntentMatch,
  IntentRule,
  ProjectType,
} from '../types'
import { existsSync } from 'node:fs'
import { join } from 'pathe'
import { x } from 'tinyexec'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MIN_CONFIDENCE = 0.6
const PATTERN_WEIGHT = 0.4
const KEYWORD_WEIGHT = 0.3
const CONTEXT_WEIGHT = 0.3

// ============================================================================
// Intent Engine Class
// ============================================================================

/**
 * Intent Detection Engine
 *
 * Analyzes user input and context to detect intent and match plugins
 */
export class IntentEngine {
  private rules: Map<string, IntentRule> = new Map()
  private contextCache: Map<string, { value: boolean, timestamp: number }> = new Map()
  private cacheTTL = 5000 // 5 seconds

  constructor() {
    // Initialize with empty rules, will be populated by plugin manager
  }

  // ==========================================================================
  // Rule Management
  // ==========================================================================

  /**
   * Register an intent rule
   */
  registerRule(rule: IntentRule): void {
    this.rules.set(rule.id, rule)
  }

  /**
   * Register multiple intent rules
   */
  registerRules(rules: IntentRule[]): void {
    for (const rule of rules) {
      this.registerRule(rule)
    }
  }

  /**
   * Unregister an intent rule
   */
  unregisterRule(ruleId: string): void {
    this.rules.delete(ruleId)
  }

  /**
   * Unregister all rules for a plugin
   */
  unregisterPluginRules(pluginId: string): void {
    for (const [id, rule] of this.rules) {
      if (rule.pluginId === pluginId) {
        this.rules.delete(id)
      }
    }
  }

  /**
   * Get all registered rules
   */
  getRules(): IntentRule[] {
    return Array.from(this.rules.values())
  }

  // ==========================================================================
  // Intent Detection
  // ==========================================================================

  /**
   * Detect intent from user input and context
   *
   * @param userInput - User's input text
   * @param cwd - Current working directory
   * @returns Array of intent matches sorted by confidence
   */
  async detect(userInput: string, cwd: string): Promise<IntentMatch[]> {
    // Build detection context
    const context = await this.buildContext(userInput, cwd)

    // Match against all rules
    const matches: IntentMatch[] = []

    for (const rule of this.rules.values()) {
      const match = this.matchRule(rule, context)
      if (match && match.confidence >= (rule.minConfidence ?? DEFAULT_MIN_CONFIDENCE)) {
        matches.push(match)
      }
    }

    // Sort by confidence (descending) then priority (descending)
    matches.sort((a, b) => {
      const confDiff = b.confidence - a.confidence
      if (Math.abs(confDiff) > 0.1) {
        return confDiff
      }
      const ruleA = this.rules.get(a.intentId)
      const ruleB = this.rules.get(b.intentId)
      return (ruleB?.priority ?? 0) - (ruleA?.priority ?? 0)
    })

    return matches
  }

  /**
   * Get the best matching intent
   */
  async detectBest(userInput: string, cwd: string): Promise<IntentMatch | null> {
    const matches = await this.detect(userInput, cwd)
    return matches.length > 0 ? matches[0] : null
  }

  /**
   * Check if any intent should auto-execute
   */
  async detectAutoExecute(userInput: string, cwd: string): Promise<IntentMatch | null> {
    const matches = await this.detect(userInput, cwd)
    return matches.find(m => m.autoExecute && m.confidence >= 0.8) ?? null
  }

  // ==========================================================================
  // Context Building
  // ==========================================================================

  /**
   * Build detection context from user input and environment
   */
  async buildContext(userInput: string, cwd: string): Promise<DetectionContext> {
    const [gitStatus, projectType, activeSignals] = await Promise.all([
      this.detectGitStatus(cwd),
      this.detectProjectType(cwd),
      this.detectActiveSignals(cwd),
    ])

    return {
      userInput,
      cwd,
      gitStatus,
      projectType,
      activeSignals,
    }
  }

  /**
   * Detect git status
   */
  async detectGitStatus(cwd: string): Promise<GitStatus> {
    const isRepo = existsSync(join(cwd, '.git'))

    if (!isRepo) {
      return { isRepo: false, hasChanges: false, hasStaged: false }
    }

    try {
      // Check for changes
      const statusResult = await x('git', ['status', '--porcelain'], { nodeOptions: { cwd } })
      const hasChanges = statusResult.stdout.trim().length > 0

      // Check for staged changes
      const stagedResult = await x('git', ['diff', '--cached', '--name-only'], { nodeOptions: { cwd } })
      const hasStaged = stagedResult.stdout.trim().length > 0

      // Get current branch
      const branchResult = await x('git', ['branch', '--show-current'], { nodeOptions: { cwd } })
      const branch = branchResult.stdout.trim()

      // Get remote
      const remoteResult = await x('git', ['remote', 'get-url', 'origin'], { nodeOptions: { cwd } })
      const remote = remoteResult.stdout.trim() || undefined

      return { isRepo, hasChanges, hasStaged, branch, remote }
    }
    catch {
      return { isRepo, hasChanges: false, hasStaged: false }
    }
  }

  /**
   * Detect project type from files
   */
  async detectProjectType(cwd: string): Promise<ProjectType> {
    // Check for specific framework files
    if (existsSync(join(cwd, 'next.config.js')) || existsSync(join(cwd, 'next.config.mjs')) || existsSync(join(cwd, 'next.config.ts'))) {
      return 'nextjs'
    }

    if (existsSync(join(cwd, 'vue.config.js')) || existsSync(join(cwd, 'vite.config.ts'))) {
      // Check if it's Vue
      const pkgPath = join(cwd, 'package.json')
      if (existsSync(pkgPath)) {
        try {
          const pkg = await import(pkgPath)
          if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
            return 'vue'
          }
        }
        catch {
          // Ignore
        }
      }
    }

    // Check package.json for React
    const pkgPath = join(cwd, 'package.json')
    if (existsSync(pkgPath)) {
      try {
        const pkg = await import(pkgPath)
        if (pkg.dependencies?.react || pkg.devDependencies?.react) {
          return 'react'
        }
      }
      catch {
        // Ignore
      }
    }

    // Check for TypeScript
    if (existsSync(join(cwd, 'tsconfig.json'))) {
      return 'typescript'
    }

    // Check for Node.js
    if (existsSync(join(cwd, 'package.json'))) {
      return 'nodejs'
    }

    // Check for Python
    if (existsSync(join(cwd, 'requirements.txt')) || existsSync(join(cwd, 'pyproject.toml'))) {
      return 'python'
    }

    // Check for Rust
    if (existsSync(join(cwd, 'Cargo.toml'))) {
      return 'rust'
    }

    // Check for Go
    if (existsSync(join(cwd, 'go.mod'))) {
      return 'go'
    }

    return 'unknown'
  }

  /**
   * Detect active context signals
   */
  async detectActiveSignals(cwd: string): Promise<ContextSignal[]> {
    const signals: ContextSignal[] = []

    // Git signals
    const gitStatus = await this.detectGitStatus(cwd)
    if (gitStatus.isRepo) {
      signals.push('git_is_repo')
      if (gitStatus.hasChanges)
        signals.push('git_has_changes')
      if (gitStatus.hasStaged)
        signals.push('git_has_staged')
      if (gitStatus.remote)
        signals.push('git_has_remote')
    }

    // Project signals
    if (existsSync(join(cwd, 'package.json')))
      signals.push('has_package_json')
    if (existsSync(join(cwd, 'tsconfig.json')))
      signals.push('has_tsconfig')
    if (existsSync(join(cwd, 'Dockerfile')) || existsSync(join(cwd, 'docker-compose.yml')))
      signals.push('has_dockerfile')

    // Test signals
    if (existsSync(join(cwd, 'tests')) || existsSync(join(cwd, '__tests__')) || existsSync(join(cwd, 'test'))) {
      signals.push('has_tests')
    }

    // Directory signals
    if (cwd.includes('/src') || existsSync(join(cwd, 'src'))) {
      signals.push('in_src_directory')
    }

    return signals
  }

  // ==========================================================================
  // Rule Matching
  // ==========================================================================

  /**
   * Match a single rule against context
   */
  private matchRule(rule: IntentRule, context: DetectionContext): IntentMatch | null {
    const matchedPatterns: string[] = []
    const matchedSignals: ContextSignal[] = []

    // Pattern matching
    let patternScore = 0
    for (const pattern of rule.patterns) {
      try {
        const regex = new RegExp(pattern, 'i')
        if (regex.test(context.userInput)) {
          matchedPatterns.push(pattern)
          patternScore += 1 / rule.patterns.length
        }
      }
      catch {
        // Invalid regex, try simple includes
        if (context.userInput.toLowerCase().includes(pattern.toLowerCase())) {
          matchedPatterns.push(pattern)
          patternScore += 1 / rule.patterns.length
        }
      }
    }

    // Keyword matching
    let keywordScore = 0
    const inputLower = context.userInput.toLowerCase()
    for (const keyword of rule.keywords) {
      if (inputLower.includes(keyword.toLowerCase())) {
        keywordScore += 1 / rule.keywords.length
      }
    }

    // Context signal matching
    let contextScore = 0
    if (rule.contextSignals.length > 0) {
      for (const signal of rule.contextSignals) {
        if (context.activeSignals.includes(signal)) {
          matchedSignals.push(signal)
          contextScore += 1 / rule.contextSignals.length
        }
      }
    }
    else {
      // No context signals required, give full score
      contextScore = 1
    }

    // File pattern matching (bonus)
    let fileBonus = 0
    if (rule.filePatterns && rule.filePatterns.length > 0) {
      for (const pattern of rule.filePatterns) {
        if (existsSync(join(context.cwd, pattern))) {
          fileBonus += 0.1
        }
      }
    }

    // Calculate final confidence
    const confidence = Math.min(1, (patternScore * PATTERN_WEIGHT)
      + (keywordScore * KEYWORD_WEIGHT)
      + (contextScore * CONTEXT_WEIGHT)
      + fileBonus)

    // Must have at least some pattern or keyword match
    if (patternScore === 0 && keywordScore === 0) {
      return null
    }

    return {
      pluginId: rule.pluginId,
      intentId: rule.id,
      confidence,
      matchedPatterns,
      matchedSignals,
      suggestedAction: rule.name,
      autoExecute: rule.autoExecute && confidence >= 0.8,
    }
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Clear context cache
   */
  clearCache(): void {
    this.contextCache.clear()
  }

  /**
   * Get cached value or compute
   */
  private async getCachedOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
  ): Promise<T> {
    const cached = this.contextCache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.value as T
    }

    const value = await compute()
    this.contextCache.set(key, { value: value as boolean, timestamp: Date.now() })
    return value
  }
}

// ============================================================================
// Built-in Intent Rules
// ============================================================================

/**
 * Default intent rules for common tasks
 */
export const DEFAULT_INTENT_RULES: IntentRule[] = [
  // Git Commit Intent
  {
    id: 'intent:git-commit',
    name: { 'en': 'Git Commit', 'zh-CN': 'Git 提交' },
    patterns: [
      '提交.*代码',
      '提交.*更改',
      '提交.*修改',
      'commit.*changes',
      'commit.*code',
      'save.*changes',
      '保存.*修改',
    ],
    keywords: ['commit', '提交', 'save', 'push', '保存'],
    contextSignals: ['git_is_repo', 'git_has_changes'],
    filePatterns: ['.git/'],
    priority: 90,
    pluginId: 'git-helper',
    skillId: 'smart-commit',
    autoExecute: false,
  },

  // Code Review Intent
  {
    id: 'intent:code-review',
    name: { 'en': 'Code Review', 'zh-CN': '代码审查' },
    patterns: [
      '审查.*代码',
      'review.*code',
      '检查.*代码',
      'check.*code',
      '代码.*问题',
    ],
    keywords: ['review', '审查', 'check', '检查', 'lint'],
    contextSignals: ['git_has_changes', 'in_src_directory'],
    priority: 85,
    pluginId: 'code-reviewer',
    autoExecute: false,
  },

  // Test Generation Intent
  {
    id: 'intent:generate-tests',
    name: { 'en': 'Generate Tests', 'zh-CN': '生成测试' },
    patterns: [
      '写.*测试',
      '生成.*测试',
      'write.*test',
      'generate.*test',
      'create.*test',
      '添加.*测试',
    ],
    keywords: ['test', '测试', 'spec', 'jest', 'vitest'],
    contextSignals: ['has_package_json', 'has_tests'],
    priority: 80,
    pluginId: 'test-generator',
    autoExecute: false,
  },

  // Documentation Intent
  {
    id: 'intent:generate-docs',
    name: { 'en': 'Generate Documentation', 'zh-CN': '生成文档' },
    patterns: [
      '写.*文档',
      '生成.*文档',
      'write.*doc',
      'generate.*doc',
      '添加.*注释',
      'add.*comment',
    ],
    keywords: ['doc', '文档', 'readme', 'comment', '注释'],
    contextSignals: ['in_src_directory'],
    priority: 75,
    pluginId: 'doc-generator',
    autoExecute: false,
  },

  // Deploy Intent
  {
    id: 'intent:deploy',
    name: { 'en': 'Deploy', 'zh-CN': '部署' },
    patterns: [
      '部署.*项目',
      '部署.*应用',
      'deploy.*project',
      'deploy.*app',
      '发布.*线上',
    ],
    keywords: ['deploy', '部署', 'publish', '发布', 'release'],
    contextSignals: ['has_package_json', 'git_has_remote'],
    priority: 70,
    pluginId: 'vercel-deploy',
    autoExecute: false,
  },

  // Docker Intent
  {
    id: 'intent:docker',
    name: { 'en': 'Docker Operations', 'zh-CN': 'Docker 操作' },
    patterns: [
      '创建.*dockerfile',
      '生成.*docker',
      'create.*dockerfile',
      'generate.*docker',
      '容器化',
    ],
    keywords: ['docker', 'container', '容器', 'dockerfile'],
    contextSignals: ['has_package_json'],
    filePatterns: ['Dockerfile', 'docker-compose.yml'],
    priority: 65,
    pluginId: 'docker-helper',
    autoExecute: false,
  },

  // Refactor Intent
  {
    id: 'intent:refactor',
    name: { 'en': 'Refactor Code', 'zh-CN': '重构代码' },
    patterns: [
      '重构.*代码',
      '优化.*代码',
      'refactor.*code',
      'optimize.*code',
      '简化.*代码',
      'simplify.*code',
    ],
    keywords: ['refactor', '重构', 'optimize', '优化', 'simplify', '简化'],
    contextSignals: ['in_src_directory'],
    priority: 60,
    pluginId: 'code-simplifier',
    autoExecute: false,
  },
]

// ============================================================================
// Singleton Instance
// ============================================================================

let engineInstance: IntentEngine | null = null

/**
 * Get the singleton IntentEngine instance
 */
export function getIntentEngine(): IntentEngine {
  if (!engineInstance) {
    engineInstance = new IntentEngine()
    // Register default rules
    engineInstance.registerRules(DEFAULT_INTENT_RULES)
  }
  return engineInstance
}

/**
 * Reset the engine instance (for testing)
 */
export function resetIntentEngine(): void {
  engineInstance = null
}
