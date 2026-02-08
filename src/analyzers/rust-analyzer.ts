/**
 * Rust project analyzer
 * Detects frameworks like Actix, Rocket, etc.
 */

import type { FrameworkDetectionResult, LanguageDetection } from './types.js'
import { promises as fsp } from 'node:fs'
import consola from 'consola'
import path from 'pathe'
import { parse } from 'smol-toml'

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

async function _readFile(p: string): Promise<string> {
  return fsp.readFile(p, 'utf-8')
}

const logger = consola.withTag('rust-analyzer')

// Rust framework detection patterns
const FRAMEWORK_PATTERNS = {
  'actix-web': {
    dependencies: ['actix-web'],
    indicators: ['HttpServer', 'web::'],
  },
  'rocket': {
    dependencies: ['rocket'],
    indicators: ['rocket::', '#[get]', '#[post]'],
  },
  'tokio': {
    dependencies: ['tokio'],
    indicators: ['tokio::', '#[tokio::main]'],
  },
  'async-std': {
    dependencies: ['async-std'],
    indicators: ['async_std::'],
  },
  'serde': {
    dependencies: ['serde'],
    indicators: ['serde::', 'Serialize', 'Deserialize'],
  },
  'clap': {
    dependencies: ['clap'],
    indicators: ['clap::', 'Command', 'Parser'],
  },
  'axum': {
    dependencies: ['axum'],
    indicators: ['axum::', 'Router'],
  },
  'warp': {
    dependencies: ['warp'],
    indicators: ['warp::', 'Filter'],
  },
  'hyper': {
    dependencies: ['hyper'],
    indicators: ['hyper::', 'Request', 'Response'],
  },
  'tide': {
    dependencies: ['tide'],
    indicators: ['tide::', 'Server'],
  },
  'tracing': {
    dependencies: ['tracing'],
    indicators: ['tracing::', '#[instrument]'],
  },
  'log': {
    dependencies: ['log'],
    indicators: ['log::', 'info!', 'debug!'],
  },
  'anyhow': {
    dependencies: ['anyhow'],
    indicators: ['anyhow::', 'anyhow!'],
  },
  'thiserror': {
    dependencies: ['thiserror'],
    indicators: ['thiserror::', '#[error]'],
  },
  'sqlx': {
    dependencies: ['sqlx'],
    indicators: ['sqlx::', 'PgPool'],
  },
  'diesel': {
    dependencies: ['diesel'],
    indicators: ['diesel::', 'prelude::*'],
  },
  'sea-orm': {
    dependencies: ['sea-orm'],
    indicators: ['sea_orm::', 'Database'],
  },
  'redis': {
    dependencies: ['redis'],
    indicators: ['redis::', 'Connection'],
  },
  'tokio-postgres': {
    dependencies: ['tokio-postgres'],
    indicators: ['tokio_postgres::', 'Client'],
  },
  'prometheus': {
    dependencies: ['prometheus'],
    indicators: ['prometheus::', 'Counter'],
  },
  'sentry': {
    dependencies: ['sentry'],
    indicators: ['sentry::', 'capture_event'],
  },
  'uuid': {
    dependencies: ['uuid'],
    indicators: ['uuid::', 'Uuid'],
  },
  'chrono': {
    dependencies: ['chrono'],
    indicators: ['chrono::', 'DateTime'],
  },
  'regex': {
    dependencies: ['regex'],
    indicators: ['regex::', 'Regex'],
  },
  'rand': {
    dependencies: ['rand'],
    indicators: ['rand::', 'Rng'],
  },
  'serde_json': {
    dependencies: ['serde_json'],
    indicators: ['serde_json::', 'json!'],
  },
  'tower': {
    dependencies: ['tower'],
    indicators: ['tower::', 'Service'],
  },
  'prost': {
    dependencies: ['prost'],
    indicators: ['prost::', 'Message'],
  },
  'tonic': {
    dependencies: ['tonic'],
    indicators: ['tonic::', '#[tonic::async_trait]'],
  },
  'yew': {
    dependencies: ['yew'],
    indicators: ['yew::', 'html!'],
  },
  'leptos': {
    dependencies: ['leptos'],
    indicators: ['leptos::', 'view!'],
  },
  'tauri': {
    dependencies: ['tauri'],
    indicators: ['tauri::', '#[tauri::command]'],
  },
  'bevy': {
    dependencies: ['bevy'],
    indicators: ['bevy::', 'App'],
  },
  'egui': {
    dependencies: ['egui'],
    indicators: ['egui::', 'CentralPanel'],
  },
}

/**
 * Analyze Rust project
 */
export async function analyzeRustProject(
  projectPath: string,
  files: string[],
  _languages: LanguageDetection[],
): Promise<FrameworkDetectionResult[]> {
  logger.info('Analyzing Rust project')

  const frameworks: FrameworkDetectionResult[] = []
  const cargoTomlPath = path.join(projectPath, 'Cargo.toml')

  // Read Cargo.toml
  let cargoToml: any = null
  try {
    if (await pathExists(cargoTomlPath)) {
      const content = await fsp.readFile(cargoTomlPath, 'utf-8')
      cargoToml = parse(content)
    }
  }
  catch (error) {
    logger.warn('Failed to read Cargo.toml:', error)
  }

  // Extract dependencies
  const dependencies = extractCargoDependencies(cargoToml)

  // Scan Rust source files for usage patterns
  const patterns = await scanRustPatterns(projectPath, files)

  // Check for each framework
  for (const [frameworkName, frameworkPatterns] of Object.entries(FRAMEWORK_PATTERNS)) {
    const evidence: string[] = []
    let confidence = 0

    // Check dependencies
    for (const dep of frameworkPatterns.dependencies) {
      if (dependencies[dep]) {
        evidence.push(`Found ${dep} in dependencies`)
        confidence += 0.5
      }
    }

    // Check code indicators
    for (const indicator of frameworkPatterns.indicators) {
      if (patterns[indicator]) {
        evidence.push(`Found pattern: ${indicator}`)
        confidence += 0.3
      }
    }

    // Add framework if detected
    if (confidence > 0) {
      frameworks.push({
        name: frameworkName,
        category: getFrameworkCategory(frameworkName),
        version: dependencies[frameworkName],
        confidence: Math.min(confidence, 1),
        evidence,
      })
    }
  }

  // Detect additional patterns
  await detectAdditionalPatterns(projectPath, files, frameworks, dependencies, patterns, cargoToml)

  // Sort by confidence
  frameworks.sort((a, b) => b.confidence - a.confidence)

  logger.debug(`Detected frameworks: ${frameworks.map(f => `${f.name} (${Math.round(f.confidence * 100)}%)`).join(', ')}`)

  return frameworks
}

/**
 * Extract dependencies from Cargo.toml
 */
function extractCargoDependencies(cargoToml: any): Record<string, string> {
  const dependencies: Record<string, string> = {}

  if (!cargoToml) {
    return dependencies
  }

  // Extract from dependencies section
  const depsSections = [
    cargoToml.dependencies,
    cargoToml['dev-dependencies'],
    cargoToml['build-dependencies'],
  ]

  for (const section of depsSections) {
    if (typeof section === 'object') {
      for (const [name, version] of Object.entries(section)) {
        if (typeof version === 'string') {
          dependencies[name] = version
        }
        else if (typeof version === 'object' && version !== null && 'version' in version) {
          dependencies[name] = (version as { version: string }).version
        }
      }
    }
  }

  // Extract from workspace dependencies
  if (cargoToml.workspace?.dependencies) {
    for (const [name, version] of Object.entries(cargoToml.workspace.dependencies)) {
      if (!dependencies[name]) {
        if (typeof version === 'string') {
          dependencies[name] = version
        }
        else if (typeof version === 'object' && version !== null && 'version' in version) {
          dependencies[name] = (version as { version: string }).version
        }
      }
    }
  }

  return dependencies
}

/**
 * Scan Rust source files for usage patterns
 */
async function scanRustPatterns(
  projectPath: string,
  files: string[],
): Promise<Record<string, number>> {
  const patterns: Record<string, number> = {}
  const rustFiles = files.filter(f => f.endsWith('.rs'))

  for (const file of rustFiles) {
    try {
      const content = await fsp.readFile(path.join(projectPath, file), 'utf-8')

      // Extract common patterns
      const patternRegex = /(\w+::|@\[|!\w+\()/g
      let match

      while ((match = patternRegex.exec(content)) !== null) {
        const pattern = match[1]
        patterns[pattern] = (patterns[pattern] || 0) + 1
      }

      // Extract macro usage
      const macroRegex = /(\w+!)/g
      while ((match = macroRegex.exec(content)) !== null) {
        const macroName = match[1]
        patterns[macroName] = (patterns[macroName] || 0) + 1
      }

      // Extract trait usage
      const traitRegex = /:\s*([\w\s,]+)(?:\s*\{|<)/g
      while ((match = traitRegex.exec(content)) !== null) {
        const traits = match[1].split(',').map(t => t.trim())
        for (const trait of traits) {
          patterns[trait] = (patterns[trait] || 0) + 1
        }
      }
    }
    catch (error) {
      logger.warn(`Failed to read ${file}:`, error)
    }
  }

  return patterns
}

/**
 * Get framework category
 */
function getFrameworkCategory(framework: string): string {
  const categories = {
    web: [
      'actix-web',
      'rocket',
      'axum',
      'warp',
      'hyper',
      'tide',
    ],
    async: ['tokio', 'async-std'],
    serialization: ['serde', 'serde_json'],
    cli: ['clap'],
    error: ['anyhow', 'thiserror'],
    logging: ['tracing', 'log'],
    database: ['sqlx', 'diesel', 'sea-orm', 'tokio-postgres'],
    cache: ['redis'],
    monitoring: ['prometheus', 'sentry'],
    utility: ['uuid', 'chrono', 'regex', 'rand'],
    middleware: ['tower'],
    rpc: ['prost', 'tonic'],
    frontend: ['yew', 'leptos'],
    desktop: ['tauri'],
    game: ['bevy'],
    gui: ['egui'],
  }

  for (const [category, frameworks] of Object.entries(categories)) {
    if (frameworks.includes(framework)) {
      return category
    }
  }

  return 'other'
}

/**
 * Detect additional patterns
 */
async function detectAdditionalPatterns(
  projectPath: string,
  files: string[],
  frameworks: FrameworkDetectionResult[],
  dependencies: Record<string, string>,
  patterns: Record<string, number>,
  cargoToml: any,
): Promise<void> {
  // Check for Rust edition
  if (cargoToml?.package?.edition) {
    frameworks.push({
      name: 'rust',
      category: 'language',
      version: cargoToml.package.edition,
      confidence: 0.9,
      evidence: ['Found Cargo.toml'],
    })
  }

  // Check for workspace
  if (cargoToml?.workspace) {
    frameworks.push({
      name: 'workspace',
      category: 'workspace',
      confidence: 0.9,
      evidence: ['Found workspace in Cargo.toml'],
    })
  }

  // Check for binary targets
  if (cargoToml?.bin) {
    frameworks.push({
      name: 'binary',
      category: 'build',
      confidence: 0.8,
      evidence: ['Found binary targets'],
    })
  }

  // Check for library
  if (cargoToml?.lib) {
    frameworks.push({
      name: 'library',
      category: 'build',
      confidence: 0.8,
      evidence: ['Found library configuration'],
    })
  }

  // Check for Docker
  const dockerFiles = ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml']
  for (const file of dockerFiles) {
    if (files.includes(file)) {
      frameworks.push({
        name: 'docker',
        category: 'deployment',
        confidence: 0.9,
        evidence: [`Found ${file}`],
      })
    }
  }

  // Check for testing patterns
  if (files.some(f => f.endsWith('_test.rs')) || (patterns['#['] && patterns['#['] > 0)) {
    frameworks.push({
      name: 'testing',
      category: 'testing',
      confidence: 0.7,
      evidence: ['Found test files'],
    })
  }

  // Check for benchmarking
  if (files.some(f => f.endsWith('_bench.rs'))) {
    frameworks.push({
      name: 'benchmark',
      category: 'testing',
      confidence: 0.8,
      evidence: ['Found benchmark files'],
    })
  }

  // Check for examples
  if (files.some(f => f.startsWith('examples/'))) {
    frameworks.push({
      name: 'examples',
      category: 'documentation',
      confidence: 0.7,
      evidence: ['Found examples directory'],
    })
  }

  // Check for CI/CD
  const ciFiles = {
    '.github/workflows': 'github-actions',
    '.gitlab-ci.yml': 'gitlab-ci',
    'Jenkinsfile': 'jenkins',
    '.travis.yml': 'travis-ci',
  }

  for (const [file, tool] of Object.entries(ciFiles)) {
    if (files.includes(file) || files.some(f => f.startsWith(file))) {
      frameworks.push({
        name: tool,
        category: 'ci-cd',
        confidence: 0.8,
        evidence: [`Found ${file}`],
      })
    }
  }

  // Check for build tools
  const buildFiles = {
    'Makefile': 'make',
    'justfile': 'just',
    'build.rs': 'build-script',
  }

  for (const [file, tool] of Object.entries(buildFiles)) {
    if (files.includes(file)) {
      frameworks.push({
        name: tool,
        category: 'build',
        confidence: 0.8,
        evidence: [`Found ${file}`],
      })
    }
  }

  // Check for protobuf
  if (files.some(f => f.endsWith('.proto'))) {
    frameworks.push({
      name: 'protobuf',
      category: 'rpc',
      confidence: 0.9,
      evidence: ['Found .proto files'],
    })
  }

  // Check for WASM support
  if (dependencies['wasm-bindgen'] || dependencies['wasm-pack']) {
    frameworks.push({
      name: 'wasm',
      category: 'webassembly',
      confidence: 0.8,
      evidence: ['Found WASM dependencies'],
    })
  }

  // Check for no_std
  if (patterns['#![no_std]']) {
    frameworks.push({
      name: 'no_std',
      category: 'embedded',
      confidence: 0.9,
      evidence: ['Found #![no_std]'],
    })
  }

  // Check for proc macros
  if (cargoToml?.lib?.proc_macro) {
    frameworks.push({
      name: 'proc-macro',
      category: 'meta',
      confidence: 0.9,
      evidence: ['Found proc-macro configuration'],
    })
  }

  // Check for linting tools
  if (dependencies.clippy) {
    frameworks.push({
      name: 'clippy',
      category: 'linting',
      confidence: 0.8,
      evidence: ['Found clippy dependency'],
    })
  }

  // Check for formatting
  if (dependencies.rustfmt) {
    frameworks.push({
      name: 'rustfmt',
      category: 'formatting',
      confidence: 0.8,
      evidence: ['Found rustfmt dependency'],
    })
  }

  // Check for documentation tools
  if (dependencies.rustdoc) {
    frameworks.push({
      name: 'rustdoc',
      category: 'documentation',
      confidence: 0.8,
      evidence: ['Found rustdoc dependency'],
    })
  }

  // Check for package registry
  if (cargoToml?.package?.publish) {
    frameworks.push({
      name: 'crates.io',
      category: 'registry',
      confidence: 0.7,
      evidence: ['Found publish configuration'],
    })
  }

  // Check for license
  if (cargoToml?.package?.license) {
    frameworks.push({
      name: cargoToml.package.license,
      category: 'legal',
      confidence: 0.6,
      evidence: ['Found license in Cargo.toml'],
    })
  }

  // Detect package type
  if (cargoToml?.package) {
    const type = cargoToml.bin ? 'binary' : cargoToml.lib ? 'library' : 'unknown'
    frameworks.push({
      name: type,
      category: 'package',
      confidence: 0.9,
      evidence: [`Detected as ${type}`],
    })
  }

  // Check for targets directory (indicative of Cargo workspace build artifacts)
  if (files.includes('target/') || files.some(f => f.startsWith('target/'))) {
    // This is just build artifacts, not a framework
    logger.debug('Found target/ directory (build artifacts)')
  }

  // Check for Cargo.lock
  if (files.includes('Cargo.lock')) {
    frameworks.push({
      name: 'cargo-lock',
      category: 'dependency',
      confidence: 0.9,
      evidence: ['Found Cargo.lock'],
    })
  }
}
