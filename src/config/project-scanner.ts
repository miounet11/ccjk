/**
 * Project Environment Scanner
 *
 * Detects project language, framework, toolchain, database, and runtime environment
 * from the current working directory. Used by SmartDefaultsDetector to provide
 * project-aware recommendations for MCP services, hooks, and skills.
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { join } from 'pathe'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProjectLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'csharp'
  | 'unknown'

export type ProjectFramework =
  | 'next'
  | 'nuxt'
  | 'react'
  | 'vue'
  | 'angular'
  | 'svelte'
  | 'express'
  | 'fastify'
  | 'nest'
  | 'fastapi'
  | 'django'
  | 'flask'
  | 'gin'
  | 'actix'
  | 'spring'
  | 'rails'
  | 'laravel'
  | 'tauri'
  | 'electron'
  | 'none'

export type TestRunner =
  | 'vitest'
  | 'jest'
  | 'mocha'
  | 'pytest'
  | 'go-test'
  | 'cargo-test'
  | 'junit'
  | 'rspec'
  | 'phpunit'
  | 'none'

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'poetry' | 'cargo' | 'go' | 'maven' | 'gradle' | 'none'

export type Linter = 'eslint' | 'biome' | 'oxlint' | 'pylint' | 'ruff' | 'flake8' | 'golangci-lint' | 'clippy' | 'rubocop' | 'none'

export type Formatter = 'prettier' | 'biome' | 'black' | 'ruff' | 'gofmt' | 'rustfmt' | 'none'

export type Database = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis' | 'none'

export interface RuntimeEnvironment {
  /** Running inside Docker container */
  isContainer: boolean
  /** No display server (headless server) */
  isHeadless: boolean
  /** SSH session */
  isSSH: boolean
  /** CI/CD environment */
  isCI: boolean
  /** WSL (Windows Subsystem for Linux) */
  isWSL: boolean
  /** Has browser available */
  hasBrowser: boolean
}

export interface ProjectContext {
  /** Primary language */
  language: ProjectLanguage
  /** Additional languages detected */
  secondaryLanguages: ProjectLanguage[]
  /** Web/app framework */
  framework: ProjectFramework
  /** Test runner */
  testRunner: TestRunner
  /** Package manager */
  packageManager: PackageManager
  /** Linter */
  linter: Linter
  /** Formatter */
  formatter: Formatter
  /** Database (from config files, docker-compose, etc.) */
  database: Database
  /** Runtime environment characteristics */
  runtime: RuntimeEnvironment
  /** Is monorepo */
  isMonorepo: boolean
  /** Uses conventional commits */
  usesConventionalCommits: boolean
  /** Has existing husky/lint-staged */
  hasGitHooks: boolean
  /** Has Docker/docker-compose */
  hasDocker: boolean
  /** Has CI config (.github/workflows, .gitlab-ci, etc.) */
  hasCI: boolean
  /** Project root (CWD used for scanning) */
  root: string
}

// ─── Scanner ─────────────────────────────────────────────────────────────────

/**
 * Scan the current working directory and detect project context.
 * All detection is read-only and fast (no network, no installs).
 */
export function scanProject(cwd?: string): ProjectContext {
  const root = cwd || process.cwd()

  const pkg = readPackageJson(root)
  const language = detectLanguage(root, pkg)
  const secondaryLanguages = detectSecondaryLanguages(root, pkg, language)

  return {
    language,
    secondaryLanguages,
    framework: detectFramework(root, pkg),
    testRunner: detectTestRunner(root, pkg),
    packageManager: detectPackageManager(root),
    linter: detectLinter(root, pkg),
    formatter: detectFormatter(root, pkg),
    database: detectDatabase(root),
    runtime: detectRuntime(),
    isMonorepo: detectMonorepo(root, pkg),
    usesConventionalCommits: detectConventionalCommits(root, pkg),
    hasGitHooks: detectGitHooks(root, pkg),
    hasDocker: existsSync(join(root, 'Dockerfile')) || existsSync(join(root, 'docker-compose.yml')) || existsSync(join(root, 'docker-compose.yaml')),
    hasCI: detectCI(root),
    root,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readPackageJson(root: string): Record<string, any> | null {
  const p = join(root, 'package.json')
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf-8'))
  }
  catch {
    return null
  }
}

function hasDep(pkg: Record<string, any> | null, name: string): boolean {
  if (!pkg) return false
  return !!(
    pkg.dependencies?.[name]
    || pkg.devDependencies?.[name]
    || pkg.peerDependencies?.[name]
  )
}

function hasAnyDep(pkg: Record<string, any> | null, names: string[]): boolean {
  return names.some(n => hasDep(pkg, n))
}

// ─── Language Detection ──────────────────────────────────────────────────────

function detectLanguage(root: string, pkg: Record<string, any> | null): ProjectLanguage {
  // TypeScript indicators
  if (existsSync(join(root, 'tsconfig.json')) || hasDep(pkg, 'typescript')) {
    return 'typescript'
  }
  // Python indicators
  if (
    existsSync(join(root, 'pyproject.toml'))
    || existsSync(join(root, 'setup.py'))
    || existsSync(join(root, 'requirements.txt'))
    || existsSync(join(root, 'Pipfile'))
  ) {
    return 'python'
  }
  // Go
  if (existsSync(join(root, 'go.mod'))) {
    return 'go'
  }
  // Rust
  if (existsSync(join(root, 'Cargo.toml'))) {
    return 'rust'
  }
  // Java
  if (existsSync(join(root, 'pom.xml')) || existsSync(join(root, 'build.gradle')) || existsSync(join(root, 'build.gradle.kts'))) {
    return 'java'
  }
  // Ruby
  if (existsSync(join(root, 'Gemfile'))) {
    return 'ruby'
  }
  // PHP
  if (existsSync(join(root, 'composer.json'))) {
    return 'php'
  }
  // Swift
  if (existsSync(join(root, 'Package.swift'))) {
    return 'swift'
  }
  // C#
  if (existsSync(join(root, '*.csproj')) || existsSync(join(root, '*.sln'))) {
    return 'csharp'
  }
  // JavaScript (package.json exists but no TS)
  if (pkg) {
    return 'javascript'
  }

  return 'unknown'
}

function detectSecondaryLanguages(
  root: string,
  pkg: Record<string, any> | null,
  primary: ProjectLanguage,
): ProjectLanguage[] {
  const langs: ProjectLanguage[] = []
  const checks: [ProjectLanguage, () => boolean][] = [
    ['typescript', () => existsSync(join(root, 'tsconfig.json')) || hasDep(pkg, 'typescript')],
    ['javascript', () => !!pkg],
    ['python', () => existsSync(join(root, 'pyproject.toml')) || existsSync(join(root, 'requirements.txt'))],
    ['go', () => existsSync(join(root, 'go.mod'))],
    ['rust', () => existsSync(join(root, 'Cargo.toml'))],
  ]
  for (const [lang, check] of checks) {
    if (lang !== primary && check()) langs.push(lang)
  }
  return langs
}

// ─── Framework Detection ─────────────────────────────────────────────────────

function detectFramework(root: string, pkg: Record<string, any> | null): ProjectFramework {
  if (!pkg) {
    // Non-JS frameworks
    if (existsSync(join(root, 'pyproject.toml'))) {
      const content = safeRead(join(root, 'pyproject.toml'))
      if (content.includes('fastapi')) return 'fastapi'
      if (content.includes('django')) return 'django'
      if (content.includes('flask')) return 'flask'
    }
    if (existsSync(join(root, 'requirements.txt'))) {
      const content = safeRead(join(root, 'requirements.txt'))
      if (content.includes('fastapi')) return 'fastapi'
      if (content.includes('django')) return 'django'
      if (content.includes('flask')) return 'flask'
    }
    return 'none'
  }

  // JS/TS frameworks — order matters (more specific first)
  if (hasDep(pkg, 'next')) return 'next'
  if (hasDep(pkg, 'nuxt')) return 'nuxt'
  if (hasDep(pkg, '@angular/core')) return 'angular'
  if (hasDep(pkg, 'svelte') || hasDep(pkg, '@sveltejs/kit')) return 'svelte'
  if (hasDep(pkg, '@nestjs/core')) return 'nest'
  if (hasDep(pkg, '@tauri-apps/api') || hasDep(pkg, '@tauri-apps/cli')) return 'tauri'
  if (hasDep(pkg, 'electron')) return 'electron'
  if (hasDep(pkg, 'vue')) return 'vue'
  if (hasDep(pkg, 'react')) return 'react'
  if (hasDep(pkg, 'fastify')) return 'fastify'
  if (hasDep(pkg, 'express')) return 'express'

  return 'none'
}

// ─── Test Runner Detection ───────────────────────────────────────────────────

function detectTestRunner(root: string, pkg: Record<string, any> | null): TestRunner {
  if (hasDep(pkg, 'vitest')) return 'vitest'
  if (hasDep(pkg, 'jest') || hasDep(pkg, '@jest/core')) return 'jest'
  if (hasDep(pkg, 'mocha')) return 'mocha'
  if (existsSync(join(root, 'pytest.ini')) || existsSync(join(root, 'conftest.py'))) return 'pytest'
  if (existsSync(join(root, 'pyproject.toml'))) {
    const content = safeRead(join(root, 'pyproject.toml'))
    if (content.includes('[tool.pytest') || content.includes('pytest')) return 'pytest'
  }
  if (existsSync(join(root, 'go.mod'))) return 'go-test'
  if (existsSync(join(root, 'Cargo.toml'))) return 'cargo-test'
  if (existsSync(join(root, 'pom.xml')) || existsSync(join(root, 'build.gradle'))) return 'junit'
  if (existsSync(join(root, 'Gemfile'))) {
    const content = safeRead(join(root, 'Gemfile'))
    if (content.includes('rspec')) return 'rspec'
  }
  if (hasDep(pkg, 'phpunit') || existsSync(join(root, 'phpunit.xml'))) return 'phpunit'
  return 'none'
}

// ─── Package Manager Detection ───────────────────────────────────────────────

function detectPackageManager(root: string): PackageManager {
  if (existsSync(join(root, 'pnpm-lock.yaml')) || existsSync(join(root, 'pnpm-workspace.yaml'))) return 'pnpm'
  if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) return 'bun'
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn'
  if (existsSync(join(root, 'package-lock.json'))) return 'npm'
  if (existsSync(join(root, 'poetry.lock'))) return 'poetry'
  if (existsSync(join(root, 'Pipfile.lock')) || existsSync(join(root, 'requirements.txt'))) return 'pip'
  if (existsSync(join(root, 'Cargo.lock'))) return 'cargo'
  if (existsSync(join(root, 'go.sum'))) return 'go'
  if (existsSync(join(root, 'pom.xml'))) return 'maven'
  if (existsSync(join(root, 'build.gradle')) || existsSync(join(root, 'build.gradle.kts'))) return 'gradle'
  return 'none'
}

// ─── Linter Detection ────────────────────────────────────────────────────────

function detectLinter(root: string, pkg: Record<string, any> | null): Linter {
  if (hasDep(pkg, '@biomejs/biome') || existsSync(join(root, 'biome.json')) || existsSync(join(root, 'biome.jsonc'))) return 'biome'
  if (hasDep(pkg, 'oxlint') || hasDep(pkg, 'oxc')) return 'oxlint'
  if (hasDep(pkg, 'eslint') || existsSync(join(root, '.eslintrc.json')) || existsSync(join(root, '.eslintrc.js')) || existsSync(join(root, 'eslint.config.js')) || existsSync(join(root, 'eslint.config.mjs'))) return 'eslint'
  // Python
  if (existsSync(join(root, 'ruff.toml')) || existsSync(join(root, '.ruff.toml'))) return 'ruff'
  if (existsSync(join(root, 'pyproject.toml'))) {
    const content = safeRead(join(root, 'pyproject.toml'))
    if (content.includes('[tool.ruff')) return 'ruff'
    if (content.includes('[tool.pylint') || content.includes('pylint')) return 'pylint'
    if (content.includes('flake8')) return 'flake8'
  }
  // Go
  if (existsSync(join(root, '.golangci.yml')) || existsSync(join(root, '.golangci.yaml'))) return 'golangci-lint'
  // Rust — clippy is built-in
  if (existsSync(join(root, 'Cargo.toml'))) return 'clippy'
  // Ruby
  if (existsSync(join(root, '.rubocop.yml'))) return 'rubocop'
  return 'none'
}

// ─── Formatter Detection ─────────────────────────────────────────────────────

function detectFormatter(root: string, pkg: Record<string, any> | null): Formatter {
  if (hasDep(pkg, '@biomejs/biome') || existsSync(join(root, 'biome.json'))) return 'biome'
  if (hasDep(pkg, 'prettier') || existsSync(join(root, '.prettierrc')) || existsSync(join(root, '.prettierrc.json')) || existsSync(join(root, 'prettier.config.js')) || existsSync(join(root, 'prettier.config.mjs'))) return 'prettier'
  // Python
  if (existsSync(join(root, 'pyproject.toml'))) {
    const content = safeRead(join(root, 'pyproject.toml'))
    if (content.includes('[tool.ruff') && content.includes('format')) return 'ruff'
    if (content.includes('[tool.black') || content.includes('black')) return 'black'
  }
  // Go — gofmt is built-in
  if (existsSync(join(root, 'go.mod'))) return 'gofmt'
  // Rust — rustfmt is built-in
  if (existsSync(join(root, 'Cargo.toml'))) return 'rustfmt'
  return 'none'
}

// ─── Database Detection ──────────────────────────────────────────────────────

function detectDatabase(root: string): Database {
  // Check docker-compose
  for (const f of ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']) {
    const content = safeRead(join(root, f))
    if (!content) continue
    if (content.includes('postgres')) return 'postgresql'
    if (content.includes('mysql') || content.includes('mariadb')) return 'mysql'
    if (content.includes('mongo')) return 'mongodb'
    if (content.includes('redis')) return 'redis'
  }

  // Check .env files for DATABASE_URL
  for (const f of ['.env', '.env.local', '.env.development']) {
    const content = safeRead(join(root, f))
    if (!content) continue
    if (content.includes('postgres')) return 'postgresql'
    if (content.includes('mysql')) return 'mysql'
    if (content.includes('mongodb') || content.includes('mongo+srv')) return 'mongodb'
    if (content.includes('redis://')) return 'redis'
  }

  // Check for ORM config files
  if (existsSync(join(root, 'prisma', 'schema.prisma'))) {
    const content = safeRead(join(root, 'prisma', 'schema.prisma'))
    if (content.includes('postgresql')) return 'postgresql'
    if (content.includes('mysql')) return 'mysql'
    if (content.includes('sqlite')) return 'sqlite'
    if (content.includes('mongodb')) return 'mongodb'
  }

  // Check for SQLite files
  for (const f of ['*.db', '*.sqlite', '*.sqlite3']) {
    // Simple check — just look for common names
    if (existsSync(join(root, 'db.sqlite')) || existsSync(join(root, 'database.sqlite')) || existsSync(join(root, 'dev.db'))) {
      return 'sqlite'
    }
  }

  return 'none'
}

// ─── Runtime Environment Detection ──────────────────────────────────────────

function detectRuntime(): RuntimeEnvironment {
  const isContainer = existsSync('/.dockerenv')
    || existsSync('/run/.containerenv')
    || safeRead('/proc/1/cgroup').includes('docker')

  const isSSH = !!process.env.SSH_CLIENT || !!process.env.SSH_TTY || !!process.env.SSH_CONNECTION

  const isCI = !!(
    process.env.CI
    || process.env.GITHUB_ACTIONS
    || process.env.GITLAB_CI
    || process.env.JENKINS_URL
    || process.env.CIRCLECI
    || process.env.TRAVIS
    || process.env.BUILDKITE
  )

  const isWSL = safeRead('/proc/version').toLowerCase().includes('microsoft')

  // Headless = no display AND not macOS (macOS always has a display server)
  const isMac = process.platform === 'darwin'
  const hasDisplay = !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY || process.env.TERM_PROGRAM)
  const isHeadless = !isMac && !hasDisplay && !isWSL

  const hasBrowser = isMac || hasDisplay || isWSL

  return {
    isContainer,
    isHeadless,
    isSSH,
    isCI,
    isWSL,
    hasBrowser,
  }
}

// ─── Git / Repo Detection ────────────────────────────────────────────────────

function detectMonorepo(root: string, pkg: Record<string, any> | null): boolean {
  if (pkg?.workspaces) return true
  if (existsSync(join(root, 'pnpm-workspace.yaml'))) return true
  if (existsSync(join(root, 'lerna.json'))) return true
  if (existsSync(join(root, 'nx.json'))) return true
  if (existsSync(join(root, 'turbo.json'))) return true
  return false
}

function detectConventionalCommits(root: string, pkg: Record<string, any> | null): boolean {
  // Check for commitlint config
  if (
    existsSync(join(root, '.commitlintrc.json'))
    || existsSync(join(root, '.commitlintrc.js'))
    || existsSync(join(root, 'commitlint.config.js'))
    || existsSync(join(root, 'commitlint.config.mjs'))
  ) return true
  if (hasDep(pkg, '@commitlint/cli') || hasDep(pkg, '@commitlint/config-conventional')) return true

  // Check recent git log for conventional commit patterns
  try {
    const log = execSync('git log --oneline -10 2>/dev/null', { cwd: root, encoding: 'utf-8', timeout: 3000 })
    const conventionalPattern = /^[a-f0-9]+ (feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\(.+\))?[!]?:/m
    const lines = log.trim().split('\n').filter(Boolean)
    const matches = lines.filter(l => conventionalPattern.test(l))
    // If >50% of recent commits are conventional, assume it's the convention
    return lines.length > 0 && matches.length / lines.length > 0.5
  }
  catch {
    return false
  }
}

function detectGitHooks(root: string, pkg: Record<string, any> | null): boolean {
  if (existsSync(join(root, '.husky'))) return true
  if (hasDep(pkg, 'husky') || hasDep(pkg, 'simple-git-hooks') || hasDep(pkg, 'lefthook')) return true
  if (existsSync(join(root, '.lefthook.yml'))) return true
  return false
}

function detectCI(root: string): boolean {
  return (
    existsSync(join(root, '.github', 'workflows'))
    || existsSync(join(root, '.gitlab-ci.yml'))
    || existsSync(join(root, '.circleci'))
    || existsSync(join(root, 'Jenkinsfile'))
    || existsSync(join(root, '.travis.yml'))
    || existsSync(join(root, 'bitbucket-pipelines.yml'))
  )
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function safeRead(path: string): string {
  try {
    if (!existsSync(path)) return ''
    return readFileSync(path, 'utf-8')
  }
  catch {
    return ''
  }
}
