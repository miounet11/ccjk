/**
 * Context Builder for Workflow Generation
 *
 * This module enriches the project context with information
 * from the file system, dependencies, and environment.
 */

import type { ProjectContext, ContextBuilderConfig } from '../types.js'
import { promises as fs } from 'fs'
import { join } from 'path'
import { glob } from 'glob'

export class ContextBuilder {
  private config: ContextBuilderConfig

  constructor(config: ContextBuilderConfig = {}) {
    this.config = {
      includeFileSystem: config.includeFileSystem !== false,
      includeDependencies: config.includeDependencies !== false,
      includeEnvironment: config.includeEnvironment !== false,
      includeGitHistory: config.includeGitHistory || false,
      maxFileSize: config.maxFileSize || 1024 * 100, // 100KB
      maxFiles: config.maxFiles || 50,
    }
  }

  /**
   * Build enriched context for workflow generation
   */
  async build(baseContext: ProjectContext): Promise<ProjectContext> {
    const enriched: ProjectContext = { ...baseContext }

    if (this.config.includeFileSystem) {
      enriched.customContext = {
        ...enriched.customContext,
        fileSystem: await this.analyzeFileSystem(),
      }
    }

    if (this.config.includeDependencies) {
      enriched.dependencies = {
        ...enriched.dependencies,
        ...(await this.analyzeDependencies()),
      }
    }

    if (this.config.includeEnvironment) {
      enriched.environmentVariables = {
        ...enriched.environmentVariables,
        ...(await this.analyzeEnvironment()),
      }
    }

    return enriched
  }

  /**
   * Analyze file system structure
   */
  private async analyzeFileSystem(): Promise<{
    structure: string[]
    hasTests: boolean
    hasDocs: boolean
    hasConfig: boolean
    mainFiles: string[]
  }> {
    try {
      const files = await glob('**/*', {
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
        maxDepth: 3,
      })

      const structure = files.slice(0, this.config.maxFiles)

      const hasTests = structure.some(f => f.includes('.test.') || f.includes('.spec.') || f.includes('/test/') || f.includes('/tests/'))
      const hasDocs = structure.some(f => f.endsWith('.md') || f.includes('/docs/') || f.includes('/doc/'))
      const hasConfig = structure.some(f => f.includes('config.') || f.includes('.config.') || f.includes('rc.'))

      const mainFiles = structure.filter(f =>
        f.includes('index.') ||
        f.includes('main.') ||
        f.includes('app.') ||
        f.includes('cli.') ||
        f.includes('package.json')
      ).slice(0, 10)

      return {
        structure,
        hasTests,
        hasDocs,
        hasConfig,
        mainFiles,
      }
    }
    catch {
      return {
        structure: [],
        hasTests: false,
        hasDocs: false,
        hasConfig: false,
        mainFiles: [],
      }
    }
  }

  /**
   * Analyze project dependencies
   */
  private async analyzeDependencies(): Promise<Record<string, string>> {
    try {
      const packageJsonPath = join(process.cwd(), 'package.json')
      const content = await fs.readFile(packageJsonPath, 'utf-8')
      const pkg = JSON.parse(content) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }

      return {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      }
    }
    catch {
      return {}
    }
  }

  /**
   * Analyze environment variables
   */
  private async analyzeEnvironment(): Promise<Record<string, string>> {
    const env: Record<string, string> = {}

    // Collect common development environment variables
    const envKeys = [
      'NODE_ENV',
      'CI',
      'DEBUG',
      'PATH',
      'HOME',
      'USER',
      'LANG',
    ]

    for (const key of envKeys) {
      if (process.env[key]) {
        env[key] = process.env[key]!
      }
    }

    return env
  }

  /**
   * Detect project language from file system
   */
  async detectLanguage(): Promise<string> {
    try {
      const files = await glob('*.{js,ts,py,go,rs,java,kt,cs}', {
        ignore: ['**/node_modules/**', '**/dist/**'],
      })

      if (files.length === 0) {
        return 'unknown'
      }

      const extensions = files.map(f => f.split('.').pop())
      const counts: Record<string, number> = {}

      for (const ext of extensions) {
        if (ext) {
          counts[ext] = (counts[ext] || 0) + 1
        }
      }

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
      const top = sorted[0]?.[0]

      const languageMap: Record<string, string> = {
        js: 'javascript',
        ts: 'typescript',
        py: 'python',
        go: 'go',
        rs: 'rust',
        java: 'java',
        kt: 'kotlin',
        cs: 'csharp',
      }

      return top ? languageMap[top] || top : 'unknown'
    }
    catch {
      return 'unknown'
    }
  }

  /**
   * Detect framework from dependencies
   */
  async detectFramework(): Promise<string | undefined> {
    try {
      const packageJsonPath = join(process.cwd(), 'package.json')
      const content = await fs.readFile(packageJsonPath, 'utf-8')
      const pkg = JSON.parse(content) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }

      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      }

      // Framework detection patterns
      const patterns: Record<string, string[]> = {
        react: ['react', 'react-dom'],
        vue: ['vue'],
        angular: ['@angular/core'],
        svelte: ['svelte'],
        next: ['next'],
        nuxt: ['nuxt'],
        express: ['express'],
        fastify: ['fastify'],
        nest: ['@nestjs/core'],
        'electron': ['electron'],
        vite: ['vite'],
        webpack: ['webpack'],
      }

      for (const [framework, deps] of Object.entries(patterns)) {
        if (deps.some(dep => dep in allDeps)) {
          return framework
        }
      }

      return undefined
    }
    catch {
      return undefined
    }
  }

  /**
   * Detect package manager
   */
  async detectPackageManager(): Promise<string> {
    try {
      // Check for lock files
      const lockFiles = await glob('*-lock.json', { maxDepth: 1 })
      if (lockFiles.includes('package-lock.json')) {
        return 'npm'
      }
      if (lockFiles.includes('pnpm-lock.yaml')) {
        return 'pnpm'
      }
      if (lockFiles.includes('yarn.lock')) {
        return 'yarn'
      }
      if (lockFiles.includes('bun.lockb')) {
        return 'bun'
      }

      // Default to npm
      return 'npm'
    }
    catch {
      return 'npm'
    }
  }
}
