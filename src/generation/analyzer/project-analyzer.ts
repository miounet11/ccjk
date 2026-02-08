import type { ProjectAnalysis, ProjectType, TechStack } from '../types'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'pathe'

/**
 * Project analyzer for smart agent/skills generation
 * Analyzes project structure, dependencies, and patterns
 */
export class ProjectAnalyzer {
  private projectRoot: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
  }

  /**
   * Analyze project and return comprehensive analysis
   */
  async analyze(): Promise<ProjectAnalysis> {
    const packageJson = this.readPackageJson()
    const techStack = this.detectTechStack(packageJson)
    const projectType = this.detectProjectType(techStack, packageJson)
    const frameworks = this.detectFrameworks(packageJson)
    const hasTests = this.detectTestFramework(packageJson)
    const hasDatabase = this.detectDatabase(packageJson)
    const hasApi = this.detectApiEndpoints()
    const buildTool = this.detectBuildTool(packageJson)
    const cicd = this.detectCICD()

    const patterns = this.detectPatterns()
    const confidence = this.calculateConfidence(techStack, frameworks)

    return {
      projectRoot: this.projectRoot,
      projectType,
      techStack,
      frameworks,
      hasTests,
      hasDatabase,
      hasApi,
      buildTool,
      cicd,
      patterns,
      confidence,
      packageJson: packageJson ?? undefined,
    }
  }

  /**
   * Read and parse package.json
   */
  private readPackageJson(): Record<string, any> | null {
    const packageJsonPath = join(this.projectRoot, 'package.json')
    if (!existsSync(packageJsonPath)) {
      return null
    }

    try {
      const content = readFileSync(packageJsonPath, 'utf-8')
      return JSON.parse(content)
    }
    catch {
      return null
    }
  }

  /**
   * Detect technology stack from dependencies
   */
  private detectTechStack(packageJson: Record<string, any> | null): TechStack {
    if (!packageJson) {
      return {
        languages: ['javascript'],
        runtime: 'node',
        packageManager: this.detectPackageManager(),
      }
    }

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    const languages: string[] = []
    let runtime: string = 'node'

    // Detect TypeScript
    if (deps.typescript || existsSync(join(this.projectRoot, 'tsconfig.json'))) {
      languages.push('typescript')
    }
    else {
      languages.push('javascript')
    }

    // Detect Deno
    if (existsSync(join(this.projectRoot, 'deno.json')) || existsSync(join(this.projectRoot, 'deno.jsonc'))) {
      runtime = 'deno'
    }

    // Detect Bun
    if (existsSync(join(this.projectRoot, 'bun.lockb'))) {
      runtime = 'bun'
    }

    return {
      languages,
      runtime,
      packageManager: this.detectPackageManager(),
    }
  }

  /**
   * Detect package manager
   */
  private detectPackageManager(): string {
    if (existsSync(join(this.projectRoot, 'pnpm-lock.yaml'))) {
      return 'pnpm'
    }
    if (existsSync(join(this.projectRoot, 'yarn.lock'))) {
      return 'yarn'
    }
    if (existsSync(join(this.projectRoot, 'bun.lockb'))) {
      return 'bun'
    }
    if (existsSync(join(this.projectRoot, 'package-lock.json'))) {
      return 'npm'
    }
    return 'npm'
  }

  /**
   * Detect project type
   */
  private detectProjectType(techStack: TechStack, packageJson: Record<string, any> | null): ProjectType {
    if (!packageJson) {
      return 'unknown'
    }

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    // Check for frontend frameworks
    const hasFrontend = deps.react || deps.vue || deps['@angular/core'] || deps.svelte

    // Check for backend frameworks
    const hasBackend = deps.express || deps.fastify || deps.koa || deps['@nestjs/core'] || deps.hapi

    // Check for fullstack frameworks
    if (deps.next || deps.nuxt || deps['@remix-run/react'] || deps['@sveltejs/kit']) {
      return 'fullstack'
    }

    // Check for CLI tools
    if (packageJson.bin || deps.commander || deps.yargs || deps.cac) {
      return 'cli'
    }

    // Check for libraries
    if (packageJson.main && !hasFrontend && !hasBackend) {
      return 'library'
    }

    // Determine frontend or backend
    if (hasFrontend && hasBackend) {
      return 'fullstack'
    }
    if (hasFrontend) {
      return 'frontend'
    }
    if (hasBackend) {
      return 'backend'
    }

    return 'unknown'
  }

  /**
   * Detect frameworks
   */
  private detectFrameworks(packageJson: Record<string, any> | null): string[] {
    if (!packageJson) {
      return []
    }

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    const frameworks: string[] = []

    // Frontend frameworks
    if (deps.react)
      frameworks.push('react')
    if (deps.vue)
      frameworks.push('vue')
    if (deps['@angular/core'])
      frameworks.push('angular')
    if (deps.svelte)
      frameworks.push('svelte')

    // Fullstack frameworks
    if (deps.next)
      frameworks.push('next.js')
    if (deps.nuxt)
      frameworks.push('nuxt')
    if (deps['@remix-run/react'])
      frameworks.push('remix')
    if (deps['@sveltejs/kit'])
      frameworks.push('sveltekit')

    // Backend frameworks
    if (deps.express)
      frameworks.push('express')
    if (deps.fastify)
      frameworks.push('fastify')
    if (deps.koa)
      frameworks.push('koa')
    if (deps['@nestjs/core'])
      frameworks.push('nestjs')
    if (deps.hapi)
      frameworks.push('hapi')

    return frameworks
  }

  /**
   * Detect test framework
   */
  private detectTestFramework(packageJson: Record<string, any> | null): boolean {
    if (!packageJson) {
      return false
    }

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    return !!(
      deps.vitest
      || deps.jest
      || deps.mocha
      || deps.ava
      || deps['@playwright/test']
      || deps.cypress
    )
  }

  /**
   * Detect database usage
   */
  private detectDatabase(packageJson: Record<string, any> | null): boolean {
    if (!packageJson) {
      return false
    }

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    return !!(
      deps.prisma
      || deps['@prisma/client']
      || deps.drizzle
      || deps['drizzle-orm']
      || deps.typeorm
      || deps.sequelize
      || deps.mongoose
      || deps.pg
      || deps.mysql
      || deps.mysql2
      || deps.sqlite3
      || deps['better-sqlite3']
    )
  }

  /**
   * Detect API endpoints
   */
  private detectApiEndpoints(): boolean {
    // Check for common API directory structures
    const apiDirs = [
      'src/api',
      'src/routes',
      'api',
      'routes',
      'pages/api', // Next.js
      'app/api', // Next.js App Router
    ]

    return apiDirs.some(dir => existsSync(join(this.projectRoot, dir)))
  }

  /**
   * Detect build tool
   */
  private detectBuildTool(packageJson: Record<string, any> | null): string | undefined {
    if (!packageJson) {
      return undefined
    }

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    if (deps.vite || existsSync(join(this.projectRoot, 'vite.config.ts'))) {
      return 'vite'
    }
    if (deps.webpack || existsSync(join(this.projectRoot, 'webpack.config.js'))) {
      return 'webpack'
    }
    if (deps.rollup || existsSync(join(this.projectRoot, 'rollup.config.js'))) {
      return 'rollup'
    }
    if (deps.esbuild) {
      return 'esbuild'
    }
    if (deps.turbo || existsSync(join(this.projectRoot, 'turbo.json'))) {
      return 'turbo'
    }

    return undefined
  }

  /**
   * Detect CI/CD configuration
   */
  private detectCICD(): string[] {
    const cicd: string[] = []

    // GitHub Actions
    if (existsSync(join(this.projectRoot, '.github', 'workflows'))) {
      cicd.push('github-actions')
    }

    // GitLab CI
    if (existsSync(join(this.projectRoot, '.gitlab-ci.yml'))) {
      cicd.push('gitlab-ci')
    }

    // CircleCI
    if (existsSync(join(this.projectRoot, '.circleci', 'config.yml'))) {
      cicd.push('circleci')
    }

    // Travis CI
    if (existsSync(join(this.projectRoot, '.travis.yml'))) {
      cicd.push('travis-ci')
    }

    return cicd
  }

  /**
   * Detect common patterns in the project
   */
  private detectPatterns(): string[] {
    const patterns: string[] = []

    // Monorepo patterns
    if (existsSync(join(this.projectRoot, 'packages')) || existsSync(join(this.projectRoot, 'apps'))) {
      patterns.push('monorepo')
    }

    // TypeScript
    if (existsSync(join(this.projectRoot, 'tsconfig.json'))) {
      patterns.push('typescript')
    }

    // ESLint
    if (existsSync(join(this.projectRoot, '.eslintrc.js')) || existsSync(join(this.projectRoot, 'eslint.config.js'))) {
      patterns.push('eslint')
    }

    // Prettier
    if (existsSync(join(this.projectRoot, '.prettierrc')) || existsSync(join(this.projectRoot, 'prettier.config.js'))) {
      patterns.push('prettier')
    }

    // Docker
    if (existsSync(join(this.projectRoot, 'Dockerfile')) || existsSync(join(this.projectRoot, 'docker-compose.yml'))) {
      patterns.push('docker')
    }

    // Environment files
    if (existsSync(join(this.projectRoot, '.env.example')) || existsSync(join(this.projectRoot, '.env.local'))) {
      patterns.push('env-config')
    }

    return patterns
  }

  /**
   * Calculate confidence score based on detected information
   */
  private calculateConfidence(techStack: TechStack, frameworks: string[]): number {
    let confidence = 0.5 // Base confidence

    // Increase confidence based on detected information
    if (techStack.languages.length > 0)
      confidence += 0.1
    if (techStack.runtime !== 'unknown')
      confidence += 0.1
    if (techStack.packageManager)
      confidence += 0.1
    if (frameworks.length > 0)
      confidence += 0.1
    if (frameworks.length > 2)
      confidence += 0.1

    return Math.min(confidence, 1.0)
  }

  /**
   * Get file count in directory
   */
  private getFileCount(dir: string): number {
    try {
      if (!existsSync(dir)) {
        return 0
      }

      let count = 0
      const items = readdirSync(dir)

      for (const item of items) {
        const fullPath = join(dir, item)
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          count += this.getFileCount(fullPath)
        }
        else {
          count++
        }
      }

      return count
    }
    catch {
      return 0
    }
  }
}

/**
 * Analyze project and return analysis
 */
export async function analyzeProject(projectRoot?: string): Promise<ProjectAnalysis> {
  const analyzer = new ProjectAnalyzer(projectRoot)
  return analyzer.analyze()
}
