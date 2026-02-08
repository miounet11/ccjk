/**
 * Dependency resolver and analyzer
 * Builds dependency graphs and generates installation plans
 *
 * ## Known Limitations
 *
 * ### Transitive Dependencies
 * Currently, transitive dependency analysis is NOT fully implemented.
 * The `all` field in DependencyAnalysis will only contain direct dependencies,
 * even when `analyzeTransitiveDeps` is enabled in DetectorConfig.
 *
 * To properly resolve transitive dependencies, lockfile parsing would be needed:
 * - package-lock.json (npm)
 * - yarn.lock (yarn)
 * - pnpm-lock.yaml (pnpm)
 * - bun.lockb (bun)
 *
 * This limitation affects:
 * - Dependency graph completeness
 * - Conflict detection accuracy
 * - Cloud recommendation quality for complex projects
 *
 * @see https://github.com/ccjk/ccjk/issues/XXX for tracking
 */

import type {
  DependencyAnalysis,
  DependencyConflict,
  DependencyNode,
  DetectorConfig,
  InstallationCommands,
  InstallationPlan,
  ProjectAnalysis,
} from './types.js'
import { promises as fsp } from 'node:fs'
import consola from 'consola'
import path from 'pathe'

// fs-extra compatibility helpers
async function pathExists(p: string): Promise<boolean> {
  try {
    await fsp.access(p)
    return true
  }
  catch {
    return false
  }
}

async function readJson(p: string): Promise<any> {
  const content = await fsp.readFile(p, 'utf-8')
  return JSON.parse(content)
}

async function _readFile(p: string): Promise<string> {
  return fsp.readFile(p, 'utf-8')
}

const logger = consola.withTag('dependency-resolver')

/**
 * Analyze project dependencies
 */
export async function analyzeDependencies(
  analysis: ProjectAnalysis,
  config: DetectorConfig,
): Promise<DependencyAnalysis> {
  logger.info('Analyzing project dependencies')

  // Warn if transitive deps analysis is requested but not implemented
  if (config.analyzeTransitiveDeps) {
    logger.warn(
      'Transitive dependency analysis requested but not fully implemented. '
      + 'The "all" field will only contain direct dependencies. '
      + 'See dependency-resolver.ts for details.',
    )
  }

  const projectPath = analysis.rootPath
  const packageManager = analysis.packageManager
  const _languages = analysis.languages

  // Resolve dependencies based on project type
  let direct: DependencyNode[] = []
  let all: DependencyNode[] = []

  if (packageManager === 'npm' || packageManager === 'yarn' || packageManager === 'pnpm' || packageManager === 'bun') {
    const npmDeps = await analyzeNpmDependencies(projectPath)
    direct = npmDeps.direct
    all = npmDeps.all
  }
  else if (packageManager === 'pip' || packageManager === 'poetry' || packageManager === 'pipenv') {
    const pythonDeps = await analyzePythonDependencies(projectPath, packageManager)
    direct = pythonDeps.direct
    all = pythonDeps.all
  }
  else if (packageManager === 'go') {
    const goDeps = await analyzeGoDependencies(projectPath)
    direct = goDeps.direct
    all = goDeps.all
  }
  else if (packageManager === 'cargo') {
    const rustDeps = await analyzeRustDependencies(projectPath)
    direct = rustDeps.direct
    all = rustDeps.all
  }

  // Build dependency graph
  const graph = buildDependencyGraph(all)

  // Generate installation plan
  const installationPlan = generateInstallationPlan(all, packageManager)

  // Detect conflicts
  const conflicts = detectConflicts(all, graph)

  // Detect circular dependencies
  const circularDeps = detectCircularDependencies(graph)

  logger.info(`Found ${direct.length} direct dependencies, ${all.length} total`)
  if (conflicts.length > 0) {
    logger.warn(`Found ${conflicts.length} dependency conflicts`)
  }
  if (circularDeps.length > 0) {
    logger.warn(`Found ${circularDeps.length} circular dependencies`)
  }

  return {
    direct,
    all,
    graph,
    installationPlan,
    conflicts,
    circularDeps,
  }
}

/**
 * Analyze npm dependencies
 */
async function analyzeNpmDependencies(
  projectPath: string,
): Promise<{ direct: DependencyNode[], all: DependencyNode[] }> {
  const packageJsonPath = path.join(projectPath, 'package.json')

  if (!await pathExists(packageJsonPath)) {
    return { direct: [], all: [] }
  }

  try {
    const packageJson = await readJson(packageJsonPath)
    const direct: DependencyNode[] = []

    // Process dependencies
    const processDeps = (deps: Record<string, string>, isDev: boolean, isPeer: boolean): DependencyNode[] => {
      if (!deps)
        return []

      return Object.entries(deps).map(([name, version]) => ({
        name,
        version: version as string,
        type: (isDev ? 'dev' : isPeer ? 'peer' : 'runtime') as DependencyNode['type'],
        isDev,
        isPeer,
        isOptional: false,
      }))
    }

    const deps = processDeps(packageJson.dependencies, false, false)
    const devDeps = processDeps(packageJson.devDependencies, true, false)
    const peerDeps = processDeps(packageJson.peerDependencies, false, true)
    const optionalDeps = processDeps(packageJson.optionalDependencies, false, false).map(d => ({
      ...d,
      isOptional: true,
      type: 'optional' as const,
    }))

    direct.push(...deps, ...devDeps, ...peerDeps, ...optionalDeps)

    // For simplicity, we're not resolving transitive dependencies here
    // In a real implementation, you'd parse package-lock.json or yarn.lock
    const all = [...direct]

    return { direct, all }
  }
  catch (error) {
    logger.warn('Failed to analyze npm dependencies:', error)
    return { direct: [], all: [] }
  }
}

/**
 * Analyze Python dependencies
 */
async function analyzePythonDependencies(
  projectPath: string,
  packageManager: string,
): Promise<{ direct: DependencyNode[], all: DependencyNode[] }> {
  const direct: DependencyNode[] = []
  const all: DependencyNode[] = []

  // Try different file formats based on package manager
  if (packageManager === 'poetry') {
    const pyprojectPath = path.join(projectPath, 'pyproject.toml')
    if (await pathExists(pyprojectPath)) {
      try {
        const { parse } = await import('smol-toml')
        const content = await fsp.readFile(pyprojectPath, 'utf-8')
        const pyproject = parse(content) as Record<string, any>

        const deps = (pyproject.tool?.poetry?.dependencies || {}) as Record<string, unknown>
        const devDeps = (pyproject.tool?.poetry?.['dev-dependencies'] || {}) as Record<string, unknown>

        for (const [name, version] of Object.entries(deps)) {
          direct.push({
            name,
            version: typeof version === 'string' ? version : 'latest',
            type: 'runtime' as const,
            isDev: false,
            isPeer: false,
            isOptional: false,
          })
        }

        for (const [name, version] of Object.entries(devDeps)) {
          direct.push({
            name,
            version: typeof version === 'string' ? version : 'latest',
            type: 'dev' as const,
            isDev: true,
            isPeer: false,
            isOptional: false,
          })
        }
      }
      catch (error) {
        logger.warn('Failed to parse pyproject.toml:', error)
      }
    }
  }
  else if (packageManager === 'pipenv') {
    const pipfilePath = path.join(projectPath, 'Pipfile')
    if (await pathExists(pipfilePath)) {
      try {
        const { parse } = await import('smol-toml')
        const content = await fsp.readFile(pipfilePath, 'utf-8')
        const pipfile = parse(content) as Record<string, any>

        const deps = (pipfile.packages || {}) as Record<string, unknown>
        const devDeps = (pipfile['dev-packages'] || {}) as Record<string, unknown>

        for (const [name, version] of Object.entries(deps)) {
          direct.push({
            name,
            version: typeof version === 'string' ? version : 'latest',
            type: 'runtime' as const,
            isDev: false,
            isPeer: false,
            isOptional: false,
          })
        }

        for (const [name, version] of Object.entries(devDeps)) {
          direct.push({
            name,
            version: typeof version === 'string' ? version : 'latest',
            type: 'dev' as const,
            isDev: true,
            isPeer: false,
            isOptional: false,
          })
        }
      }
      catch (error) {
        logger.warn('Failed to parse Pipfile:', error)
      }
    }
  }
  else {
    // Default to requirements.txt
    const requirementsPath = path.join(projectPath, 'requirements.txt')
    if (await pathExists(requirementsPath)) {
      try {
        const content = await fsp.readFile(requirementsPath, 'utf-8')
        const lines = content.split('\n')

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed && !trimmed.startsWith('#')) {
            const match = trimmed.match(/^([\w-]+)([[~=><].*)?$/)
            if (match) {
              direct.push({
                name: match[1],
                version: match[2] || 'latest',
                type: 'runtime' as const,
                isDev: false,
                isPeer: false,
                isOptional: false,
              })
            }
          }
        }
      }
      catch (error) {
        logger.warn('Failed to parse requirements.txt:', error)
      }
    }
  }

  all.push(...direct)
  return { direct, all }
}

/**
 * Analyze Go dependencies
 */
async function analyzeGoDependencies(
  projectPath: string,
): Promise<{ direct: DependencyNode[], all: DependencyNode[] }> {
  const goModPath = path.join(projectPath, 'go.mod')

  if (!await pathExists(goModPath)) {
    return { direct: [], all: [] }
  }

  try {
    const content = await fsp.readFile(goModPath, 'utf-8')
    const lines = content.split('\n')
    const direct: DependencyNode[] = []
    let inRequireBlock = false

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed.startsWith('require (')) {
        inRequireBlock = true
        continue
      }

      if (inRequireBlock && trimmed === ')') {
        inRequireBlock = false
        continue
      }

      if (trimmed.startsWith('require ') || inRequireBlock) {
        const parts = trimmed.split(/\s+/)
        if (parts.length >= 2) {
          const name = parts[0].replace('require ', '')
          const version = parts[1]

          direct.push({
            name,
            version,
            type: 'runtime',
            isDev: false,
            isPeer: false,
            isOptional: false,
          })
        }
      }
    }

    const all = [...direct]
    return { direct, all }
  }
  catch (error) {
    logger.warn('Failed to analyze Go dependencies:', error)
    return { direct: [], all: [] }
  }
}

/**
 * Analyze Rust dependencies
 */
async function analyzeRustDependencies(
  projectPath: string,
): Promise<{ direct: DependencyNode[], all: DependencyNode[] }> {
  const cargoTomlPath = path.join(projectPath, 'Cargo.toml')

  if (!await pathExists(cargoTomlPath)) {
    return { direct: [], all: [] }
  }

  try {
    const { parse } = await import('smol-toml')
    const content = await fsp.readFile(cargoTomlPath, 'utf-8')
    const cargoToml = parse(content) as Record<string, any>
    const direct: DependencyNode[] = []

    const processDeps = (deps: Record<string, any> | undefined, isDev: boolean): DependencyNode[] => {
      if (!deps)
        return []

      return Object.entries(deps).map(([name, version]) => ({
        name,
        version: typeof version === 'string' ? version : version?.version || 'latest',
        type: (isDev ? 'dev' : 'runtime') as DependencyNode['type'],
        isDev,
        isPeer: false,
        isOptional: false,
      }))
    }

    const deps = processDeps(cargoToml.dependencies as Record<string, any> | undefined, false)
    const devDeps = processDeps(cargoToml['dev-dependencies'] as Record<string, any> | undefined, true)
    const buildDeps = processDeps(cargoToml['build-dependencies'] as Record<string, any> | undefined, false)

    direct.push(...deps, ...devDeps, ...buildDeps)

    const all = [...direct]
    return { direct, all }
  }
  catch (error) {
    logger.warn('Failed to analyze Rust dependencies:', error)
    return { direct: [], all: [] }
  }
}

/**
 * Build dependency graph
 */
function buildDependencyGraph(dependencies: DependencyNode[]): Map<string, DependencyNode[]> {
  const graph = new Map<string, DependencyNode[]>()

  // Initialize graph with all dependencies
  for (const dep of dependencies) {
    graph.set(dep.name, [])
  }

  // Build edges (this would require analyzing each package's dependencies)
  // For now, we're creating a simple graph structure
  // In a real implementation, you'd need to resolve transitive dependencies

  return graph
}

/**
 * Generate installation plan
 */
function generateInstallationPlan(
  dependencies: DependencyNode[],
  packageManager?: string,
): InstallationPlan {
  // Topological sort would go here
  // For now, we're returning a simple plan
  const order = [...dependencies]

  // Separate by type
  const runtime = order.filter(d => d.type === 'runtime')
  const _dev = order.filter(d => d.type === 'dev')
  const _peer = order.filter(d => d.type === 'peer')
  const _optional = order.filter(d => d.type === 'optional')

  // Count parallelizable dependencies
  const parallelizable = runtime.length

  const commands = generateInstallationCommands(packageManager)

  return {
    order,
    total: dependencies.length,
    parallelizable,
    commands,
  }
}

/**
 * Generate installation commands
 */
function generateInstallationCommands(packageManager?: string): InstallationCommands {
  if (!packageManager) {
    return {
      installAll: 'echo "Unknown package manager"',
      installPackage: () => 'echo "Unknown package manager"',
      installDev: 'echo "Unknown package manager"',
      add: () => 'echo "Unknown package manager"',
    }
  }

  const commands: Record<string, InstallationCommands> = {
    npm: {
      installAll: 'npm install',
      installPackage: (name, version) => `npm install ${name}${version ? `@${version}` : ''}`,
      installDev: 'npm install --only=dev',
      add: (name, isDev) => isDev ? `npm install -D ${name}` : `npm install ${name}`,
    },
    yarn: {
      installAll: 'yarn install',
      installPackage: (name, version) => `yarn add ${name}${version ? `@${version}` : ''}`,
      installDev: 'yarn install --dev',
      add: (name, isDev) => isDev ? `yarn add -D ${name}` : `yarn add ${name}`,
    },
    pnpm: {
      installAll: 'pnpm install',
      installPackage: (name, version) => `pnpm add ${name}${version ? `@${version}` : ''}`,
      installDev: 'pnpm install --dev',
      add: (name, isDev) => isDev ? `pnpm add -D ${name}` : `pnpm add ${name}`,
    },
    bun: {
      installAll: 'bun install',
      installPackage: (name, version) => `bun add ${name}${version ? `@${version}` : ''}`,
      installDev: 'bun install --dev',
      add: (name, isDev) => isDev ? `bun add -d ${name}` : `bun add ${name}`,
    },
    pip: {
      installAll: 'pip install -r requirements.txt',
      installPackage: (name, version) => `pip install ${name}${version ? version.replace(/[*=]/, '==') : ''}`,
      installDev: 'pip install -r requirements-dev.txt',
      add: name => `pip install ${name}`,
    },
    poetry: {
      installAll: 'poetry install',
      installPackage: (name, version) => `poetry add ${name}${version ? `=${version}` : ''}`,
      installDev: 'poetry install --with dev',
      add: (name, isDev) => isDev ? `poetry add --group dev ${name}` : `poetry add ${name}`,
    },
    pipenv: {
      installAll: 'pipenv install',
      installPackage: (name, version) => `pipenv install ${name}${version ? `==${version}` : ''}`,
      installDev: 'pipenv install --dev',
      add: (name, isDev) => isDev ? `pipenv install --dev ${name}` : `pipenv install ${name}`,
    },
    go: {
      installAll: 'go mod download',
      installPackage: name => `go get ${name}`,
      installDev: 'go mod download',
      add: name => `go get ${name}`,
    },
    cargo: {
      installAll: 'cargo build',
      installPackage: (name, version) => `cargo add ${name}${version ? ` --vers ${version}` : ''}`,
      installDev: 'cargo build',
      add: name => `cargo add ${name}`,
    },
  }

  return commands[packageManager] || commands.npm
}

/**
 * Detect dependency conflicts
 */
function detectConflicts(
  dependencies: DependencyNode[],
  _graph: Map<string, DependencyNode[]>,
): DependencyConflict[] {
  const conflicts: DependencyConflict[] = []
  const versionMap = new Map<string, Set<string>>()

  // Group dependencies by name and collect versions
  for (const dep of dependencies) {
    if (!versionMap.has(dep.name)) {
      versionMap.set(dep.name, new Set())
    }
    versionMap.get(dep.name)!.add(dep.version)
  }

  // Check for version conflicts
  for (const [name, versions] of versionMap) {
    if (versions.size > 1) {
      conflicts.push({
        package: name,
        versions: Array.from(versions),
        requiredBy: [name],
        severity: 'warning',
      })
    }
  }

  return conflicts
}

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies(
  graph: Map<string, DependencyNode[]>,
): string[][] {
  const circular: string[][] = []
  const visited = new Set<string>()
  const recStack = new Set<string>()
  const path: string[] = []

  const dfs = (node: string): boolean => {
    visited.add(node)
    recStack.add(node)
    path.push(node)

    const neighbors = graph.get(node) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.name)) {
        if (dfs(neighbor.name)) {
          return true
        }
      }
      else if (recStack.has(neighbor.name)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor.name)
        const cycle = path.slice(cycleStart).concat(neighbor.name)
        circular.push(cycle)
        return true
      }
    }

    path.pop()
    recStack.delete(node)
    return false
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node)
    }
  }

  return circular
}
