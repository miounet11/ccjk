/**
 * Project Analyzer
 *
 * Detects project type, frameworks, tools from the current working directory.
 * Fast, synchronous file checks - no network calls.
 */
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { join } from 'pathe'
import { SETTINGS_FILE } from '../constants'
import type { ProjectProfile } from './types'

export function analyzeProject(root?: string): ProjectProfile {
  const cwd = root || process.cwd()

  const profile: ProjectProfile = {
    language: 'unknown',
    frameworks: [],
    packageManager: 'unknown',
    hasCI: false,
    hasDocker: false,
    hasMCP: false,
    hasClaudeMd: false,
    isMonorepo: false,
    tags: [],
  }

  // Detect package.json
  const pkgPath = join(cwd, 'package.json')
  let pkg: Record<string, any> | null = null
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      profile.projectName = pkg?.name
    }
    catch { /* ignore */ }
  }

  profile.language = detectLanguage(cwd, pkg)
  profile.packageManager = detectPackageManager(cwd)
  profile.frameworks = detectFrameworks(cwd, pkg)
  profile.testFramework = detectTestFramework(cwd, pkg)
  profile.buildTool = detectBuildTool(cwd, pkg)

  profile.hasCI = existsSync(join(cwd, '.github/workflows'))
    || existsSync(join(cwd, '.gitlab-ci.yml'))
    || existsSync(join(cwd, '.circleci'))
    || existsSync(join(cwd, 'Jenkinsfile'))

  profile.hasDocker = existsSync(join(cwd, 'Dockerfile'))
    || existsSync(join(cwd, 'docker-compose.yml'))
    || existsSync(join(cwd, 'docker-compose.yaml'))

  profile.hasMCP = checkMcpConfigured()
  profile.hasClaudeMd = existsSync(join(cwd, 'CLAUDE.md'))

  profile.isMonorepo = existsSync(join(cwd, 'pnpm-workspace.yaml'))
    || existsSync(join(cwd, 'lerna.json'))
    || (pkg?.workspaces != null)

  profile.tags = generateTags(profile)
  return profile
}

function detectLanguage(cwd: string, pkg: Record<string, any> | null): string {
  if (existsSync(join(cwd, 'tsconfig.json')) || pkg?.devDependencies?.typescript) return 'typescript'
  if (existsSync(join(cwd, 'pyproject.toml')) || existsSync(join(cwd, 'setup.py'))) return 'python'
  if (existsSync(join(cwd, 'go.mod'))) return 'go'
  if (existsSync(join(cwd, 'Cargo.toml'))) return 'rust'
  if (existsSync(join(cwd, 'Gemfile'))) return 'ruby'
  if (existsSync(join(cwd, 'pom.xml')) || existsSync(join(cwd, 'build.gradle'))) return 'java'
  if (existsSync(join(cwd, 'Package.swift'))) return 'swift'
  if (pkg) return 'javascript'
  return 'unknown'
}

function detectPackageManager(cwd: string): ProjectProfile['packageManager'] {
  if (existsSync(join(cwd, 'pnpm-lock.yaml')) || existsSync(join(cwd, 'pnpm-workspace.yaml'))) return 'pnpm'
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn'
  if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock'))) return 'bun'
  if (existsSync(join(cwd, 'package-lock.json'))) return 'npm'
  return 'unknown'
}

function detectFrameworks(_cwd: string, pkg: Record<string, any> | null): string[] {
  const frameworks: string[] = []
  const allDeps = { ...pkg?.dependencies, ...pkg?.devDependencies }

  if (allDeps?.react || allDeps?.['react-dom']) frameworks.push('react')
  if (allDeps?.vue) frameworks.push('vue')
  if (allDeps?.svelte) frameworks.push('svelte')
  if (allDeps?.angular || allDeps?.['@angular/core']) frameworks.push('angular')
  if (allDeps?.next) frameworks.push('nextjs')
  if (allDeps?.nuxt) frameworks.push('nuxt')
  if (allDeps?.astro) frameworks.push('astro')
  if (allDeps?.express) frameworks.push('express')
  if (allDeps?.fastify) frameworks.push('fastify')
  if (allDeps?.koa) frameworks.push('koa')
  if (allDeps?.hono) frameworks.push('hono')
  if (allDeps?.['@nestjs/core']) frameworks.push('nestjs')
  if (allDeps?.electron) frameworks.push('electron')
  if (allDeps?.['@tauri-apps/api']) frameworks.push('tauri')
  if (allDeps?.['react-native']) frameworks.push('react-native')
  if (allDeps?.cac || allDeps?.commander || allDeps?.yargs) frameworks.push('cli')

  return frameworks
}

function detectTestFramework(cwd: string, pkg: Record<string, any> | null): string | undefined {
  const allDeps = { ...pkg?.dependencies, ...pkg?.devDependencies }
  if (allDeps?.vitest || existsSync(join(cwd, 'vitest.config.ts'))) return 'vitest'
  if (allDeps?.jest || existsSync(join(cwd, 'jest.config.js'))) return 'jest'
  if (allDeps?.mocha) return 'mocha'
  if (allDeps?.playwright || allDeps?.['@playwright/test']) return 'playwright'
  if (allDeps?.cypress) return 'cypress'
  if (existsSync(join(cwd, 'pytest.ini')) || existsSync(join(cwd, 'conftest.py'))) return 'pytest'
  return undefined
}

function detectBuildTool(cwd: string, pkg: Record<string, any> | null): string | undefined {
  const allDeps = { ...pkg?.dependencies, ...pkg?.devDependencies }
  if (allDeps?.vite || existsSync(join(cwd, 'vite.config.ts'))) return 'vite'
  if (allDeps?.webpack) return 'webpack'
  if (allDeps?.esbuild) return 'esbuild'
  if (allDeps?.unbuild) return 'unbuild'
  if (allDeps?.rollup) return 'rollup'
  if (allDeps?.turbo || existsSync(join(cwd, 'turbo.json'))) return 'turbo'
  return undefined
}

function checkMcpConfigured(): boolean {
  try {
    if (!existsSync(SETTINGS_FILE)) return false
    const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
    return Object.keys(settings.mcpServers || {}).length > 0
  }
  catch {
    return false
  }
}

function generateTags(profile: ProjectProfile): string[] {
  const tags: string[] = []

  tags.push(profile.language)
  tags.push(...profile.frameworks)
  if (profile.testFramework) tags.push(profile.testFramework)
  if (profile.buildTool) tags.push(profile.buildTool)
  if (profile.packageManager !== 'unknown') tags.push(profile.packageManager)
  if (profile.hasCI) tags.push('ci')
  if (profile.hasDocker) tags.push('docker')
  if (profile.isMonorepo) tags.push('monorepo')

  if (profile.frameworks.some(f => ['react', 'vue', 'svelte', 'angular'].includes(f))) tags.push('frontend')
  if (profile.frameworks.some(f => ['express', 'fastify', 'koa', 'nestjs', 'hono'].includes(f))) tags.push('backend')
  if (profile.frameworks.some(f => ['nextjs', 'nuxt', 'astro'].includes(f))) tags.push('fullstack')
  if (profile.frameworks.includes('cli')) tags.push('cli-tool')

  return [...new Set(tags)]
}
