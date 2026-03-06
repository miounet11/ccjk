/**
 * CCJK Project Intelligence - Stack Detector
 *
 * Detects frameworks, languages, and versions in a project.
 */

import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { join } from 'pathe'

export interface StackInfo {
  languages: string[]
  frameworks: FrameworkInfo[]
  packageManager: string | null
  runtime: string | null
}

export interface FrameworkInfo {
  name: string
  version: string | null
  type: 'frontend' | 'backend' | 'fullstack' | 'testing' | 'build'
}

/**
 * Detect project stack
 */
export async function detectStack(projectRoot = '.'): Promise<StackInfo> {
  const languages = await detectLanguages(projectRoot)
  const frameworks = await detectFrameworks(projectRoot)
  const packageManager = await detectPackageManager(projectRoot)
  const runtime = await detectRuntime(projectRoot)

  return {
    languages,
    frameworks,
    packageManager,
    runtime,
  }
}

/**
 * Detect programming languages
 */
async function detectLanguages(projectRoot: string): Promise<string[]> {
  const languages = new Set<string>()

  // Check for TypeScript
  if (await fileExists(join(projectRoot, 'tsconfig.json'))) {
    languages.add('TypeScript')
  }

  // Check for JavaScript (package.json is a strong indicator)
  if (await fileExists(join(projectRoot, 'package.json'))) {
    languages.add('JavaScript')
  }

  // Check for Python
  if (await fileExists(join(projectRoot, 'requirements.txt'))
    || await fileExists(join(projectRoot, 'pyproject.toml'))
    || await fileExists(join(projectRoot, 'setup.py'))) {
    languages.add('Python')
  }

  // Check for Go
  if (await fileExists(join(projectRoot, 'go.mod'))) {
    languages.add('Go')
  }

  // Check for Rust
  if (await fileExists(join(projectRoot, 'Cargo.toml'))) {
    languages.add('Rust')
  }

  // Check for Java
  if (await fileExists(join(projectRoot, 'pom.xml'))
    || await fileExists(join(projectRoot, 'build.gradle'))) {
    languages.add('Java')
  }

  return Array.from(languages)
}

/**
 * Detect frameworks and their versions
 */
async function detectFrameworks(projectRoot: string): Promise<FrameworkInfo[]> {
  const frameworks: FrameworkInfo[] = []

  // Try to read package.json for Node.js projects
  const packageJsonPath = join(projectRoot, 'package.json')
  if (await fileExists(packageJsonPath)) {
    const packageJson = await readPackageJson(packageJsonPath)
    if (packageJson) {
      frameworks.push(...detectNodeFrameworks(packageJson))
    }
  }

  // Check for Python frameworks
  const requirementsPath = join(projectRoot, 'requirements.txt')
  if (await fileExists(requirementsPath)) {
    frameworks.push(...await detectPythonFrameworks(requirementsPath))
  }

  return frameworks
}

/**
 * Detect Node.js frameworks from package.json
 */
function detectNodeFrameworks(packageJson: any): FrameworkInfo[] {
  const frameworks: FrameworkInfo[] = []
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

  const frameworkMap: Record<string, { type: FrameworkInfo['type'] }> = {
    next: { type: 'fullstack' },
    react: { type: 'frontend' },
    vue: { type: 'frontend' },
    nuxt: { type: 'fullstack' },
    svelte: { type: 'frontend' },
    angular: { type: 'frontend' },
    express: { type: 'backend' },
    fastify: { type: 'backend' },
    koa: { type: 'backend' },
    nestjs: { type: 'backend' },
    vitest: { type: 'testing' },
    jest: { type: 'testing' },
    vite: { type: 'build' },
    webpack: { type: 'build' },
    esbuild: { type: 'build' },
  }

  for (const [name, config] of Object.entries(frameworkMap)) {
    if (deps[name]) {
      frameworks.push({
        name,
        version: deps[name].replace(/^[\^~]/, ''),
        type: config.type,
      })
    }
  }

  return frameworks
}

/**
 * Detect Python frameworks from requirements.txt
 */
async function detectPythonFrameworks(requirementsPath: string): Promise<FrameworkInfo[]> {
  const frameworks: FrameworkInfo[] = []

  try {
    const content = await readFile(requirementsPath, 'utf-8')
    const lines = content.split('\n')

    const frameworkMap: Record<string, { type: FrameworkInfo['type'] }> = {
      django: { type: 'fullstack' },
      flask: { type: 'backend' },
      fastapi: { type: 'backend' },
      pytest: { type: 'testing' },
    }

    for (const line of lines) {
      const match = line.match(/^([\w-]+)(?:==|>=|<=)?([\d.]+)?/)
      if (match) {
        const [, name, version] = match
        const config = frameworkMap[name.toLowerCase()]
        if (config) {
          frameworks.push({
            name,
            version: version || null,
            type: config.type,
          })
        }
      }
    }
  }
  catch {
    // Ignore errors
  }

  return frameworks
}

/**
 * Detect package manager
 */
async function detectPackageManager(projectRoot: string): Promise<string | null> {
  if (await fileExists(join(projectRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }
  if (await fileExists(join(projectRoot, 'yarn.lock'))) {
    return 'yarn'
  }
  if (await fileExists(join(projectRoot, 'package-lock.json'))) {
    return 'npm'
  }
  if (await fileExists(join(projectRoot, 'bun.lockb'))) {
    return 'bun'
  }
  return null
}

/**
 * Detect runtime
 */
async function detectRuntime(projectRoot: string): Promise<string | null> {
  const packageJsonPath = join(projectRoot, 'package.json')
  if (await fileExists(packageJsonPath)) {
    const packageJson = await readPackageJson(packageJsonPath)
    if (packageJson?.engines?.node) {
      return `Node.js ${packageJson.engines.node}`
    }
    return 'Node.js'
  }

  if (await fileExists(join(projectRoot, 'go.mod'))) {
    return 'Go'
  }

  if (await fileExists(join(projectRoot, 'Cargo.toml'))) {
    return 'Rust'
  }

  return null
}

/**
 * Read and parse package.json
 */
async function readPackageJson(path: string): Promise<any> {
  try {
    const content = await readFile(path, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return null
  }
}

/**
 * Check if file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  }
  catch {
    return false
  }
}
