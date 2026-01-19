import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { join } from 'pathe'

/**
 * Detected project information
 */
export interface ProjectInfo {
  name: string
  type: ProjectType
  packageManager: PackageManager
  frameworks: Framework[]
  buildTools: BuildTool[]
  testFrameworks: TestFramework[]
  cicd: CICDSystem[]
  languages: Language[]
  hasTypeScript: boolean
  hasDocker: boolean
  hasMonorepo: boolean
  rootDir: string
}

/**
 * Project type classification
 */
export type ProjectType
  = | 'frontend'
    | 'backend'
    | 'fullstack'
    | 'library'
    | 'cli'
    | 'mobile'
    | 'desktop'
    | 'unknown'

/**
 * Package managers
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown'

/**
 * Frameworks
 */
export type Framework
  = | 'react'
    | 'vue'
    | 'angular'
    | 'svelte'
    | 'nextjs'
    | 'nuxt'
    | 'remix'
    | 'astro'
    | 'express'
    | 'fastify'
    | 'nestjs'
    | 'koa'
    | 'hono'
    | 'django'
    | 'flask'
    | 'fastapi'
    | 'rails'
    | 'laravel'
    | 'spring'
    | 'electron'
    | 'tauri'
    | 'react-native'
    | 'flutter'
    | 'unknown'

/**
 * Build tools
 */
export type BuildTool
  = | 'vite'
    | 'webpack'
    | 'rollup'
    | 'esbuild'
    | 'swc'
    | 'turbopack'
    | 'parcel'
    | 'tsup'
    | 'unbuild'
    | 'unknown'

/**
 * Test frameworks
 */
export type TestFramework
  = | 'jest'
    | 'vitest'
    | 'mocha'
    | 'cypress'
    | 'playwright'
    | 'pytest'
    | 'rspec'
    | 'junit'
    | 'unknown'

/**
 * CI/CD systems
 */
export type CICDSystem
  = | 'github-actions'
    | 'gitlab-ci'
    | 'jenkins'
    | 'circleci'
    | 'travis'
    | 'azure-pipelines'
    | 'unknown'

/**
 * Languages
 */
export type Language
  = | 'typescript'
    | 'javascript'
    | 'python'
    | 'ruby'
    | 'go'
    | 'rust'
    | 'java'
    | 'kotlin'
    | 'php'
    | 'csharp'
    | 'swift'
    | 'dart'

/**
 * Configuration suggestions
 */
export interface ConfigSuggestions {
  workflows: string[]
  mcpServices: string[]
  agents: string[]
  skills: string[]
  subagentGroups: string[]
  outputStyle: string
}

/**
 * Read package.json safely
 */
function readPackageJson(dir: string): any | null {
  const pkgPath = join(dir, 'package.json')
  if (!existsSync(pkgPath))
    return null

  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'))
  }
  catch {
    return null
  }
}

/**
 * Detect package manager
 */
export function detectPackageManager(dir: string): PackageManager {
  if (existsSync(join(dir, 'bun.lockb')))
    return 'bun'
  if (existsSync(join(dir, 'pnpm-lock.yaml')))
    return 'pnpm'
  if (existsSync(join(dir, 'yarn.lock')))
    return 'yarn'
  if (existsSync(join(dir, 'package-lock.json')))
    return 'npm'

  // Check packageManager field
  const pkg = readPackageJson(dir)
  if (pkg?.packageManager) {
    if (pkg.packageManager.startsWith('pnpm'))
      return 'pnpm'
    if (pkg.packageManager.startsWith('yarn'))
      return 'yarn'
    if (pkg.packageManager.startsWith('bun'))
      return 'bun'
  }

  return 'unknown'
}

/**
 * Detect frameworks from dependencies
 */
export function detectFrameworks(dir: string): Framework[] {
  const frameworks: Framework[] = []
  const pkg = readPackageJson(dir)
  if (!pkg)
    return frameworks

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  }

  // Frontend frameworks
  if (allDeps.react)
    frameworks.push('react')
  if (allDeps.vue)
    frameworks.push('vue')
  if (allDeps['@angular/core'])
    frameworks.push('angular')
  if (allDeps.svelte)
    frameworks.push('svelte')

  // Meta-frameworks
  if (allDeps.next)
    frameworks.push('nextjs')
  if (allDeps.nuxt)
    frameworks.push('nuxt')
  if (allDeps['@remix-run/react'])
    frameworks.push('remix')
  if (allDeps.astro)
    frameworks.push('astro')

  // Backend frameworks
  if (allDeps.express)
    frameworks.push('express')
  if (allDeps.fastify)
    frameworks.push('fastify')
  if (allDeps['@nestjs/core'])
    frameworks.push('nestjs')
  if (allDeps.koa)
    frameworks.push('koa')
  if (allDeps.hono)
    frameworks.push('hono')

  // Desktop/Mobile
  if (allDeps.electron)
    frameworks.push('electron')
  if (allDeps['@tauri-apps/api'])
    frameworks.push('tauri')
  if (allDeps['react-native'])
    frameworks.push('react-native')

  // Check for Python frameworks
  if (existsSync(join(dir, 'requirements.txt')) || existsSync(join(dir, 'pyproject.toml'))) {
    const reqPath = join(dir, 'requirements.txt')
    if (existsSync(reqPath)) {
      const reqs = readFileSync(reqPath, 'utf-8').toLowerCase()
      if (reqs.includes('django'))
        frameworks.push('django')
      if (reqs.includes('flask'))
        frameworks.push('flask')
      if (reqs.includes('fastapi'))
        frameworks.push('fastapi')
    }
  }

  // Check for Ruby frameworks
  if (existsSync(join(dir, 'Gemfile'))) {
    const gemfile = readFileSync(join(dir, 'Gemfile'), 'utf-8').toLowerCase()
    if (gemfile.includes('rails'))
      frameworks.push('rails')
  }

  // Check for PHP frameworks
  if (existsSync(join(dir, 'composer.json'))) {
    try {
      const composer = JSON.parse(readFileSync(join(dir, 'composer.json'), 'utf-8'))
      if (composer.require?.['laravel/framework'])
        frameworks.push('laravel')
    }
    catch {}
  }

  return frameworks
}

/**
 * Detect build tools
 */
export function detectBuildTools(dir: string): BuildTool[] {
  const tools: BuildTool[] = []
  const pkg = readPackageJson(dir)

  // Check config files
  if (existsSync(join(dir, 'vite.config.ts')) || existsSync(join(dir, 'vite.config.js')))
    tools.push('vite')
  if (existsSync(join(dir, 'webpack.config.js')) || existsSync(join(dir, 'webpack.config.ts')))
    tools.push('webpack')
  if (existsSync(join(dir, 'rollup.config.js')) || existsSync(join(dir, 'rollup.config.ts')))
    tools.push('rollup')
  if (existsSync(join(dir, 'tsup.config.ts')) || existsSync(join(dir, 'tsup.config.js')))
    tools.push('tsup')

  // Check dependencies
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (allDeps.esbuild)
      tools.push('esbuild')
    if (allDeps['@swc/core'])
      tools.push('swc')
    if (allDeps.turbo)
      tools.push('turbopack')
    if (allDeps.parcel)
      tools.push('parcel')
    if (allDeps.unbuild)
      tools.push('unbuild')
  }

  return tools
}

/**
 * Detect test frameworks
 */
export function detectTestFrameworks(dir: string): TestFramework[] {
  const frameworks: TestFramework[] = []
  const pkg = readPackageJson(dir)

  // Check config files
  if (existsSync(join(dir, 'vitest.config.ts')) || existsSync(join(dir, 'vitest.config.js')))
    frameworks.push('vitest')
  if (existsSync(join(dir, 'jest.config.js')) || existsSync(join(dir, 'jest.config.ts')))
    frameworks.push('jest')
  if (existsSync(join(dir, 'cypress.config.ts')) || existsSync(join(dir, 'cypress.config.js')))
    frameworks.push('cypress')
  if (existsSync(join(dir, 'playwright.config.ts')))
    frameworks.push('playwright')
  if (existsSync(join(dir, 'pytest.ini')) || existsSync(join(dir, 'conftest.py')))
    frameworks.push('pytest')

  // Check dependencies
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (allDeps.vitest && !frameworks.includes('vitest'))
      frameworks.push('vitest')
    if (allDeps.jest && !frameworks.includes('jest'))
      frameworks.push('jest')
    if (allDeps.mocha)
      frameworks.push('mocha')
    if (allDeps.cypress && !frameworks.includes('cypress'))
      frameworks.push('cypress')
    if (allDeps['@playwright/test'] && !frameworks.includes('playwright'))
      frameworks.push('playwright')
  }

  return frameworks
}

/**
 * Detect CI/CD systems
 */
export function detectCICDSystems(dir: string): CICDSystem[] {
  const systems: CICDSystem[] = []

  if (existsSync(join(dir, '.github', 'workflows')))
    systems.push('github-actions')
  if (existsSync(join(dir, '.gitlab-ci.yml')))
    systems.push('gitlab-ci')
  if (existsSync(join(dir, 'Jenkinsfile')))
    systems.push('jenkins')
  if (existsSync(join(dir, '.circleci')))
    systems.push('circleci')
  if (existsSync(join(dir, '.travis.yml')))
    systems.push('travis')
  if (existsSync(join(dir, 'azure-pipelines.yml')))
    systems.push('azure-pipelines')

  return systems
}

/**
 * Detect programming languages
 */
export function detectLanguages(dir: string): Language[] {
  const languages: Language[] = []

  // TypeScript/JavaScript
  if (existsSync(join(dir, 'tsconfig.json')))
    languages.push('typescript')
  if (existsSync(join(dir, 'package.json'))) {
    if (!languages.includes('typescript'))
      languages.push('javascript')
  }

  // Python
  if (existsSync(join(dir, 'requirements.txt')) || existsSync(join(dir, 'pyproject.toml')) || existsSync(join(dir, 'setup.py')))
    languages.push('python')

  // Ruby
  if (existsSync(join(dir, 'Gemfile')))
    languages.push('ruby')

  // Go
  if (existsSync(join(dir, 'go.mod')))
    languages.push('go')

  // Rust
  if (existsSync(join(dir, 'Cargo.toml')))
    languages.push('rust')

  // Java/Kotlin
  if (existsSync(join(dir, 'pom.xml')) || existsSync(join(dir, 'build.gradle'))) {
    languages.push('java')
    if (existsSync(join(dir, 'build.gradle.kts')))
      languages.push('kotlin')
  }

  // PHP
  if (existsSync(join(dir, 'composer.json')))
    languages.push('php')

  // Swift
  if (existsSync(join(dir, 'Package.swift')))
    languages.push('swift')

  // Dart/Flutter
  if (existsSync(join(dir, 'pubspec.yaml')))
    languages.push('dart')

  return languages
}

/**
 * Determine project type
 */
export function determineProjectType(info: Partial<ProjectInfo>): ProjectType {
  const frameworks = info.frameworks || []

  // Mobile
  if (frameworks.includes('react-native') || frameworks.includes('flutter'))
    return 'mobile'

  // Desktop
  if (frameworks.includes('electron') || frameworks.includes('tauri'))
    return 'desktop'

  // Check for CLI indicators
  const pkg = info.rootDir ? readPackageJson(info.rootDir) : null
  if (pkg?.bin)
    return 'cli'

  // Library (has main/exports but no app framework)
  if (pkg?.main || pkg?.exports) {
    const hasAppFramework = frameworks.some(f =>
      ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'express', 'fastify', 'nestjs'].includes(f),
    )
    if (!hasAppFramework)
      return 'library'
  }

  // Fullstack (has both frontend and backend frameworks)
  const frontendFrameworks = ['react', 'vue', 'angular', 'svelte']
  const backendFrameworks = ['express', 'fastify', 'nestjs', 'koa', 'hono', 'django', 'flask', 'fastapi', 'rails', 'laravel']
  const metaFrameworks = ['nextjs', 'nuxt', 'remix', 'astro']

  const hasFrontend = frameworks.some(f => frontendFrameworks.includes(f))
  const hasBackend = frameworks.some(f => backendFrameworks.includes(f))
  const hasMeta = frameworks.some(f => metaFrameworks.includes(f))

  if (hasMeta)
    return 'fullstack'
  if (hasFrontend && hasBackend)
    return 'fullstack'
  if (hasFrontend)
    return 'frontend'
  if (hasBackend)
    return 'backend'

  return 'unknown'
}

/**
 * Detect full project information
 */
export function detectProject(dir: string = process.cwd()): ProjectInfo {
  const pkg = readPackageJson(dir)

  const frameworks = detectFrameworks(dir)
  const languages = detectLanguages(dir)

  const info: ProjectInfo = {
    name: pkg?.name || 'unknown',
    type: 'unknown',
    packageManager: detectPackageManager(dir),
    frameworks,
    buildTools: detectBuildTools(dir),
    testFrameworks: detectTestFrameworks(dir),
    cicd: detectCICDSystems(dir),
    languages,
    hasTypeScript: existsSync(join(dir, 'tsconfig.json')),
    hasDocker: existsSync(join(dir, 'Dockerfile')) || existsSync(join(dir, 'docker-compose.yml')),
    hasMonorepo: existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, 'lerna.json')) || (pkg?.workspaces != null),
    rootDir: dir,
  }

  info.type = determineProjectType(info)

  return info
}

/**
 * Generate configuration suggestions based on project
 */
export function generateSuggestions(project: ProjectInfo): ConfigSuggestions {
  const suggestions: ConfigSuggestions = {
    workflows: ['git'],
    mcpServices: [],
    agents: [],
    skills: [],
    subagentGroups: [],
    outputStyle: 'technical-precise',
  }

  // Language-based suggestions
  if (project.hasTypeScript || project.languages.includes('typescript')) {
    suggestions.subagentGroups.push('typescript-dev')
    suggestions.skills.push('ts-debug', 'ts-refactor', 'ts-test')
  }

  if (project.languages.includes('python')) {
    suggestions.subagentGroups.push('python-dev')
    suggestions.skills.push('py-debug', 'py-refactor', 'py-test')
  }

  // Framework-based suggestions
  if (project.frameworks.includes('nextjs') || project.frameworks.includes('nuxt')) {
    suggestions.workflows.push('frontend', 'testing')
    suggestions.agents.push('ccjk-performance-expert')
  }

  if (project.frameworks.includes('express') || project.frameworks.includes('fastify') || project.frameworks.includes('nestjs')) {
    suggestions.workflows.push('backend', 'testing')
    suggestions.agents.push('ccjk-security-expert')
  }

  // DevOps suggestions
  if (project.hasDocker || project.cicd.length > 0) {
    suggestions.workflows.push('devops')
    suggestions.subagentGroups.push('devops-team')
    suggestions.skills.push('devops-docker', 'devops-ci')
  }

  // Test framework suggestions
  if (project.testFrameworks.length > 0) {
    suggestions.workflows.push('testing')
    suggestions.agents.push('ccjk-testing-specialist')
  }

  // Monorepo suggestions
  if (project.hasMonorepo) {
    suggestions.agents.push('ccjk-code-reviewer')
  }

  // SEO for frontend/fullstack
  if (project.type === 'frontend' || project.type === 'fullstack') {
    suggestions.subagentGroups.push('seo-team')
    suggestions.skills.push('seo-meta', 'seo-schema')
  }

  // Security for all projects
  suggestions.subagentGroups.push('security-team')

  // Remove duplicates
  suggestions.workflows = [...new Set(suggestions.workflows)]
  suggestions.agents = [...new Set(suggestions.agents)]
  suggestions.skills = [...new Set(suggestions.skills)]
  suggestions.subagentGroups = [...new Set(suggestions.subagentGroups)]

  return suggestions
}

/**
 * Get a human-readable project summary
 */
export function getProjectSummary(project: ProjectInfo): string {
  const parts: string[] = []

  parts.push(`Project: ${project.name}`)
  parts.push(`Type: ${project.type}`)

  if (project.languages.length > 0) {
    parts.push(`Languages: ${project.languages.join(', ')}`)
  }

  if (project.frameworks.length > 0) {
    parts.push(`Frameworks: ${project.frameworks.join(', ')}`)
  }

  if (project.buildTools.length > 0) {
    parts.push(`Build: ${project.buildTools.join(', ')}`)
  }

  if (project.testFrameworks.length > 0) {
    parts.push(`Testing: ${project.testFrameworks.join(', ')}`)
  }

  parts.push(`Package Manager: ${project.packageManager}`)

  const features: string[] = []
  if (project.hasTypeScript)
    features.push('TypeScript')
  if (project.hasDocker)
    features.push('Docker')
  if (project.hasMonorepo)
    features.push('Monorepo')

  if (features.length > 0) {
    parts.push(`Features: ${features.join(', ')}`)
  }

  return parts.join('\n')
}
