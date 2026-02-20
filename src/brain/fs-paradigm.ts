/**
 * File System Paradigm
 *
 * Defines standard file organization patterns for different project types.
 * Helps Brain System understand project structure and locate relevant files.
 *
 * @module brain/fs-paradigm
 */

import { existsSync } from 'node:fs'
import { join } from 'pathe'
import { glob } from 'tinyglobby'

/**
 * Project paradigm types
 */
export type ParadigmType =
  | 'monorepo'
  | 'fullstack'
  | 'frontend'
  | 'backend'
  | 'library'
  | 'cli'
  | 'unknown'

/**
 * File role in project
 */
export type FileRole =
  | 'config'
  | 'source'
  | 'test'
  | 'docs'
  | 'build'
  | 'assets'
  | 'types'

/**
 * File pattern definition
 */
export interface FilePattern {
  pattern: string
  role: FileRole
  priority: number
  description: string
}

/**
 * Paradigm definition
 */
export interface Paradigm {
  type: ParadigmType
  name: string
  description: string
  indicators: string[] // Files that indicate this paradigm
  patterns: FilePattern[]
  conventions: {
    sourceDir?: string
    testDir?: string
    configDir?: string
    buildDir?: string
  }
}

/**
 * Detected project structure
 */
export interface ProjectStructure {
  paradigm: ParadigmType
  root: string
  conventions: Paradigm['conventions']
  fileMap: Map<FileRole, string[]>
  confidence: number // 0-100
}

/**
 * Paradigm definitions
 */
const PARADIGMS: Paradigm[] = [
  {
    type: 'monorepo',
    name: 'Monorepo',
    description: 'Multi-package repository (pnpm workspace, Turborepo, Nx)',
    indicators: ['pnpm-workspace.yaml', 'turbo.json', 'nx.json', 'lerna.json'],
    patterns: [
      { pattern: 'packages/*/src/**/*.ts', role: 'source', priority: 90, description: 'Package source' },
      { pattern: 'apps/*/src/**/*.ts', role: 'source', priority: 90, description: 'App source' },
      { pattern: 'packages/*/test/**/*.test.ts', role: 'test', priority: 80, description: 'Package tests' },
      { pattern: '**/package.json', role: 'config', priority: 100, description: 'Package configs' },
    ],
    conventions: {
      sourceDir: 'packages/*/src',
      testDir: 'packages/*/test',
      configDir: '.',
      buildDir: 'packages/*/dist',
    },
  },
  {
    type: 'fullstack',
    name: 'Full-Stack',
    description: 'Frontend + Backend in one repo',
    indicators: ['client/', 'server/', 'frontend/', 'backend/'],
    patterns: [
      { pattern: 'client/src/**/*.{ts,tsx}', role: 'source', priority: 90, description: 'Frontend source' },
      { pattern: 'server/src/**/*.ts', role: 'source', priority: 90, description: 'Backend source' },
      { pattern: 'shared/**/*.ts', role: 'source', priority: 85, description: 'Shared code' },
      { pattern: '**/*.test.ts', role: 'test', priority: 80, description: 'Tests' },
    ],
    conventions: {
      sourceDir: 'src',
      testDir: 'test',
      configDir: '.',
      buildDir: 'dist',
    },
  },
  {
    type: 'frontend',
    name: 'Frontend',
    description: 'React, Vue, Angular, etc.',
    indicators: ['src/components/', 'src/pages/', 'src/views/', 'public/', 'vite.config.ts', 'next.config.js'],
    patterns: [
      { pattern: 'src/components/**/*.{tsx,vue}', role: 'source', priority: 95, description: 'Components' },
      { pattern: 'src/pages/**/*.{tsx,vue}', role: 'source', priority: 90, description: 'Pages' },
      { pattern: 'src/hooks/**/*.ts', role: 'source', priority: 85, description: 'Hooks' },
      { pattern: 'src/utils/**/*.ts', role: 'source', priority: 80, description: 'Utils' },
      { pattern: 'src/**/*.test.{ts,tsx}', role: 'test', priority: 80, description: 'Tests' },
      { pattern: 'public/**/*', role: 'assets', priority: 60, description: 'Static assets' },
    ],
    conventions: {
      sourceDir: 'src',
      testDir: 'src',
      configDir: '.',
      buildDir: 'dist',
    },
  },
  {
    type: 'backend',
    name: 'Backend',
    description: 'Node.js API, Express, Fastify, etc.',
    indicators: ['src/routes/', 'src/controllers/', 'src/models/', 'src/api/'],
    patterns: [
      { pattern: 'src/routes/**/*.ts', role: 'source', priority: 95, description: 'Routes' },
      { pattern: 'src/controllers/**/*.ts', role: 'source', priority: 90, description: 'Controllers' },
      { pattern: 'src/models/**/*.ts', role: 'source', priority: 90, description: 'Models' },
      { pattern: 'src/middleware/**/*.ts', role: 'source', priority: 85, description: 'Middleware' },
      { pattern: 'src/services/**/*.ts', role: 'source', priority: 85, description: 'Services' },
      { pattern: 'test/**/*.test.ts', role: 'test', priority: 80, description: 'Tests' },
    ],
    conventions: {
      sourceDir: 'src',
      testDir: 'test',
      configDir: '.',
      buildDir: 'dist',
    },
  },
  {
    type: 'library',
    name: 'Library',
    description: 'Reusable library or package',
    indicators: ['src/index.ts', 'lib/', 'build.config.ts'],
    patterns: [
      { pattern: 'src/**/*.ts', role: 'source', priority: 90, description: 'Source' },
      { pattern: 'test/**/*.test.ts', role: 'test', priority: 80, description: 'Tests' },
      { pattern: 'types/**/*.d.ts', role: 'types', priority: 85, description: 'Type definitions' },
    ],
    conventions: {
      sourceDir: 'src',
      testDir: 'test',
      configDir: '.',
      buildDir: 'dist',
    },
  },
  {
    type: 'cli',
    name: 'CLI Tool',
    description: 'Command-line interface tool',
    indicators: ['src/cli.ts', 'src/commands/', 'bin/'],
    patterns: [
      { pattern: 'src/commands/**/*.ts', role: 'source', priority: 95, description: 'Commands' },
      { pattern: 'src/cli.ts', role: 'source', priority: 100, description: 'CLI entry' },
      { pattern: 'src/utils/**/*.ts', role: 'source', priority: 80, description: 'Utils' },
      { pattern: 'test/**/*.test.ts', role: 'test', priority: 80, description: 'Tests' },
    ],
    conventions: {
      sourceDir: 'src',
      testDir: 'test',
      configDir: '.',
      buildDir: 'dist',
    },
  },
]

/**
 * File System Paradigm Detector
 */
export class FsParadigm {
  private cache = new Map<string, ProjectStructure>()

  /**
   * Detect project paradigm
   */
  async detect(projectRoot: string): Promise<ProjectStructure> {
    // Check cache
    const cached = this.cache.get(projectRoot)
    if (cached) return cached

    // Try each paradigm
    const scores = await Promise.all(
      PARADIGMS.map(async paradigm => ({
        paradigm,
        score: await this.scoreParadigm(paradigm, projectRoot),
      })),
    )

    // Find best match
    const best = scores.reduce((a, b) => (b.score > a.score ? b : a))

    // Build file map
    const fileMap = await this.buildFileMap(best.paradigm, projectRoot)

    const structure: ProjectStructure = {
      paradigm: best.paradigm.type,
      root: projectRoot,
      conventions: best.paradigm.conventions,
      fileMap,
      confidence: best.score,
    }

    // Cache result
    this.cache.set(projectRoot, structure)

    return structure
  }

  /**
   * Score how well a paradigm matches the project
   */
  private async scoreParadigm(paradigm: Paradigm, projectRoot: string): Promise<number> {
    let score = 0

    // Check indicators (strong signal)
    for (const indicator of paradigm.indicators) {
      const exists = await this.checkPath(projectRoot, indicator)
      if (exists) {
        score += 30
      }
    }

    // Check patterns (weaker signal)
    for (const pattern of paradigm.patterns) {
      const files = await glob([pattern.pattern], {
        cwd: projectRoot,
        absolute: false,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      })

      if (files.length > 0) {
        score += Math.min(files.length * 2, 20) // Cap at 20 per pattern
      }
    }

    return Math.min(score, 100)
  }

  /**
   * Build file map for paradigm
   */
  private async buildFileMap(
    paradigm: Paradigm,
    projectRoot: string,
  ): Promise<Map<FileRole, string[]>> {
    const fileMap = new Map<FileRole, string[]>()

    for (const pattern of paradigm.patterns) {
      const files = await glob([pattern.pattern], {
        cwd: projectRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      })

      const existing = fileMap.get(pattern.role) || []
      fileMap.set(pattern.role, [...existing, ...files])
    }

    return fileMap
  }

  /**
   * Check if path exists (supports glob patterns)
   */
  private async checkPath(root: string, pattern: string): Promise<boolean> {
    // Direct file check
    if (!pattern.includes('*')) {
      return existsSync(join(root, pattern))
    }

    // Glob check
    const files = await glob([pattern], {
      cwd: root,
      absolute: false,
      ignore: ['**/node_modules/**'],
    })

    return files.length > 0
  }

  /**
   * Get files by role
   */
  getFilesByRole(structure: ProjectStructure, role: FileRole): string[] {
    return structure.fileMap.get(role) || []
  }

  /**
   * Get paradigm definition
   */
  getParadigm(type: ParadigmType): Paradigm | undefined {
    return PARADIGMS.find(p => p.type === type)
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Format structure for display
   */
  formatStructure(structure: ProjectStructure): string {
    const lines: string[] = []

    lines.push(`Paradigm: ${structure.paradigm} (${structure.confidence}% confidence)`)
    lines.push(`Root: ${structure.root}`)
    lines.push('')

    lines.push('Conventions:')
    if (structure.conventions.sourceDir) {
      lines.push(`  Source: ${structure.conventions.sourceDir}`)
    }
    if (structure.conventions.testDir) {
      lines.push(`  Test: ${structure.conventions.testDir}`)
    }
    if (structure.conventions.buildDir) {
      lines.push(`  Build: ${structure.conventions.buildDir}`)
    }
    lines.push('')

    lines.push('File Map:')
    for (const [role, files] of structure.fileMap) {
      lines.push(`  ${role}: ${files.length} files`)
    }

    return lines.join('\n')
  }
}

/**
 * Global paradigm detector instance
 */
export const fsParadigm = new FsParadigm()
