/**
 * Main project detector using heuristics and file analysis
 */

import fs from 'fs-extra'
import path from 'pathe'
import consola from 'consola'
import { glob } from 'tinyglobby'
import type { DetectorConfig, LanguageDetection, FrameworkDetectionResult, ProjectAnalysis, AnalysisMetadata } from './types.js'
import { analyzeTypeScriptProject } from './typescript-analyzer.js'
import { analyzePythonProject } from './python-analyzer.js'
import { analyzeGoProject } from './go-analyzer.js'
import { analyzeRustProject } from './rust-analyzer.js'

const logger = consola.withTag('project-detector')

// Language detection patterns
const LANGUAGE_PATTERNS = {
  typescript: {
    files: ['package.json', 'tsconfig.json', 'tsconfig.build.json'],
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    indicators: ['node_modules', 'yarn.lock', 'package-lock.json', 'pnpm-lock.yaml'],
  },
  javascript: {
    files: ['package.json'],
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    indicators: ['node_modules', 'yarn.lock', 'package-lock.json', 'pnpm-lock.yaml'],
  },
  python: {
    files: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
    extensions: ['.py', '.pyx', '.pyi'],
    indicators: ['.venv', 'venv', '__pycache__', '.python-version'],
  },
  go: {
    files: ['go.mod', 'go.sum'],
    extensions: ['.go'],
    indicators: ['vendor', 'Gopkg.lock'],
  },
  rust: {
    files: ['Cargo.toml', 'Cargo.lock'],
    extensions: ['.rs'],
    indicators: ['target'],
  },
  java: {
    files: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    extensions: ['.java', '.kt'],
    indicators: ['gradlew', 'mvnw'],
  },
  dotnet: {
    files: ['*.csproj', '*.sln', '*.fsproj', '*.vbproj'],
    extensions: ['.cs', '.fs', '.vb'],
    indicators: ['bin', 'obj'],
  },
  ruby: {
    files: ['Gemfile', 'Gemfile.lock'],
    extensions: ['.rb'],
    indicators: ['vendor/bundle'],
  },
  php: {
    files: ['composer.json', 'composer.lock'],
    extensions: ['.php'],
    indicators: ['vendor'],
  },
  swift: {
    files: ['Package.swift'],
    extensions: ['.swift'],
    indicators: ['.build'],
  },
  kotlin: {
    files: ['build.gradle.kts'],
    extensions: ['.kt', '.kts'],
    indicators: ['gradlew'],
  },
  dart: {
    files: ['pubspec.yaml'],
    extensions: ['.dart'],
    indicators: ['.dart_tool'],
  },
} as const

// Framework detection priority for mixed projects
const FRAMEWORK_PRIORITY = {
  'next.js': 10,
  'nuxt': 9,
  'sveltekit': 8,
  'astro': 7,
  'solidstart': 6,
  'qwik': 5,
  'remix': 4,
  'gatsby': 3,
  'create-react-app': 2,
  'vue': 1,
  'angular': 1,
  'react': 0,
}

/**
 * Main project detection function
 */
export async function detectProject(
  projectPath: string,
  config: DetectorConfig,
): Promise<ProjectAnalysis> {
  const startTime = Date.now()
  logger.info(`Detecting project at: ${projectPath}`)

  // Ensure path is absolute
  const absolutePath = path.resolve(projectPath)

  if (!await fs.pathExists(absolutePath)) {
    throw new Error(`Project path does not exist: ${absolutePath}`)
  }

  // Scan files
  const files = await scanProjectFiles(absolutePath, config)
  logger.debug(`Scanned ${files.length} files`)

  // Detect languages
  const languages = await detectLanguages(absolutePath, files, config)
  logger.debug(`Detected languages: ${languages.map(l => l.language).join(', ')}`)

  // Sort by confidence
  languages.sort((a, b) => b.confidence - a.confidence)

  // Analyze based on primary language
  const primaryLanguage = languages[0]
  let frameworks: FrameworkDetectionResult[] = []

  if (primaryLanguage) {
    switch (primaryLanguage.language) {
      case 'typescript':
      case 'javascript':
        frameworks = await analyzeTypeScriptProject(absolutePath, files, languages)
        break
      case 'python':
        frameworks = await analyzePythonProject(absolutePath, files, languages)
        break
      case 'go':
        frameworks = await analyzeGoProject(absolutePath, files, languages)
        break
        case 'rust':
        frameworks = await analyzeRustProject(absolutePath, files, languages)
        break
      // Add more language-specific analyzers as needed
    }
  }

  // Detect package manager
  const packageManager = detectPackageManager(files)

  // Detect build system
  const buildSystem = detectBuildSystem(files, frameworks)

  // Find important config files
  const configFiles = detectConfigFiles(files)

  // Find important directories
  const importantDirs = detectImportantDirs(absolutePath)

  // Create analysis result
  const analysis: ProjectAnalysis = {
    rootPath: absolutePath,
    projectType: determineProjectType(languages, frameworks),
    languages,
    frameworks,
    packageManager,
    buildSystem,
    configFiles,
    importantDirs,
    metadata: {
      timestamp: new Date(),
      duration: Date.now() - startTime,
      filesScanned: files.length,
      confidence: calculateOverallConfidence(languages, frameworks),
      version: '1.0.0',
    },
  }

  logger.info(`Detected project type: ${analysis.projectType}`)
  return analysis
}

/**
 * Scan project files
 */
async function scanProjectFiles(
  projectPath: string,
  config: DetectorConfig,
): Promise<string[]> {
  const patterns = ['**/*']
  const ignore = config.excludePatterns

  if (!config.includeNodeModules) {
    ignore.push('node_modules/**')
  }

  const files = await glob(patterns, {
    cwd: projectPath,
    ignore,
    absolute: false,
  })

  // Limit number of files if needed
  if (files.length > config.maxFilesToScan) {
    logger.warn(`Too many files (${files.length}), limiting to ${config.maxFilesToScan}`)
    return files.slice(0, config.maxFilesToScan)
  }

  return files
}

/**
 * Detect programming languages
 */
async function detectLanguages(
  projectPath: string,
  files: string[],
  config: DetectorConfig,
): Promise<LanguageDetection[]> {
  const languageCounts = new Map<string, number>()
  const languageIndicators = new Map<string, Set<string>>()

  // Count files by extension and check indicators
  for (const file of files) {
    const ext = path.extname(file).toLowerCase()

    for (const [language, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      if (patterns.extensions.includes(ext)) {
        languageCounts.set(language, (languageCounts.get(language) || 0) + 1)
      }
    }
  }

  // Check for language-specific files and indicators
  const fileSet = new Set(files)

  for (const [language, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    const indicators: string[] = []

    // Check for specific files
    for (const file of patterns.files) {
      if (fileSet.has(file) || fileSet.has(file.toLowerCase())) {
        indicators.push(`Found ${file}`)
        languageCounts.set(language, (languageCounts.get(language) || 0) + 10) // Higher weight for config files
      }
    }

    // Check for indicators
    for (const indicator of patterns.indicators) {
      if (fileSet.has(indicator) || await fs.pathExists(path.join(projectPath, indicator))) {
        indicators.push(`Found ${indicator}`)
        languageCounts.set(language, (languageCounts.get(language) || 0) + 5)
      }
    }

    if (indicators.length > 0) {
      languageIndicators.set(language, new Set(indicators))
    }
  }

  // Calculate confidence scores
  const totalFiles = files.length
  const languages: LanguageDetection[] = []

  for (const [language, count] of languageCounts) {
    const confidence = Math.min(count / totalFiles, 1)

    if (confidence >= config.minConfidence) {
      languages.push({
        language,
        confidence,
        fileCount: count,
        indicators: Array.from(languageIndicators.get(language) || []),
      })
    }
  }

  return languages
}

/**
 * Detect package manager
 */
function detectPackageManager(files: string[]): string | undefined {
  const managers = {
    'pnpm-lock.yaml': 'pnpm',
    'yarn.lock': 'yarn',
    'package-lock.json': 'npm',
    'bun.lockb': 'bun',
    'requirements.txt': 'pip',
    'Pipfile': 'pipenv',
    'pyproject.toml': 'poetry',
    'go.mod': 'go',
    'Cargo.toml': 'cargo',
    'pom.xml': 'maven',
    'build.gradle': 'gradle',
    'Gemfile': 'bundler',
    'composer.json': 'composer',
    'pubspec.yaml': 'pub',
  }

  for (const [file, manager] of Object.entries(managers)) {
    if (files.includes(file)) {
      return manager
    }
  }

  return undefined
}

/**
 * Detect build system
 */
function detectBuildSystem(files: string[], frameworks: FrameworkDetectionResult[]): string | undefined {
  // Check for framework-specific build systems first
  for (const framework of frameworks) {
    if (framework.name.includes('next')) return 'next'
    if (framework.name.includes('nuxt')) return 'nuxt'
    if (framework.name.includes('sveltekit')) return 'svelte'
    if (framework.name.includes('astro')) return 'astro'
  }

  // Check for build config files
  const buildFiles = {
    'webpack.config.js': 'webpack',
    'webpack.config.ts': 'webpack',
    'vite.config.ts': 'vite',
    'vite.config.js': 'vite',
    'rollup.config.js': 'rollup',
    'rollup.config.ts': 'rollup',
    'esbuild.config.js': 'esbuild',
    'tsconfig.json': 'tsc',
    '.babelrc': 'babel',
    'babel.config.js': 'babel',
    '.swcrc': 'swc',
    'Makefile': 'make',
    'CMakeLists.txt': 'cmake',
    'BUILD': 'bazel',
  }

  for (const [file, system] of Object.entries(buildFiles)) {
    if (files.includes(file)) {
      return system
    }
  }

  return undefined
}

/**
 * Detect important configuration files
 */
function detectConfigFiles(files: string[]): string[] {
  const configPatterns = [
    'package.json',
    'tsconfig.json',
    'jsconfig.json',
    'pyproject.toml',
    'requirements.txt',
    'setup.py',
    'go.mod',
    'Cargo.toml',
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'composer.json',
    'Gemfile',
    'pubspec.yaml',
    'docker-compose.yml',
    'docker-compose.yaml',
    'Dockerfile',
    '.env',
    '.env.example',
    '.gitignore',
    '.dockerignore',
    'README.md',
    'readme.md',
    'README.rst',
    'readme.rst',
  ]

  return files.filter(file => configPatterns.includes(file))
}

/**
 * Detect important directories
 */
function detectImportantDirs(projectPath: string): string[] {
  const importantDirs = [
    'src',
    'lib',
    'app',
    'public',
    'static',
    'assets',
    'components',
    'pages',
    'views',
    'templates',
    'styles',
    'css',
    'scss',
    'sass',
    'less',
    'tests',
    'test',
    'spec',
    '__tests__',
    'docs',
    'doc',
    'examples',
    'samples',
    'scripts',
    'bin',
    'tools',
    'config',
    'configs',
    'build',
    'dist',
    'out',
    'target',
    '.github',
    '.vscode',
    '.idea',
  ]

  const foundDirs: string[] = []

  for (const dir of importantDirs) {
    if (fs.existsSync(path.join(projectPath, dir))) {
      foundDirs.push(dir)
    }
  }

  return foundDirs
}

/**
 * Determine project type based on languages and frameworks
 */
function determineProjectType(
  languages: LanguageDetection[],
  frameworks: FrameworkDetectionResult[],
): string {
  if (languages.length === 0) {
    return 'unknown'
  }

  // Sort frameworks by priority
  const sortedFrameworks = [...frameworks].sort((a, b) => {
    const priorityA = FRAMEWORK_PRIORITY[a.name.toLowerCase()] || 0
    const priorityB = FRAMEWORK_PRIORITY[b.name.toLowerCase()] || 0
    return priorityB - priorityA
  })

  // If we have high-confidence frameworks, use them
  if (sortedFrameworks.length > 0 && sortedFrameworks[0].confidence > 0.7) {
    return sortedFrameworks[0].name
  }

  // Otherwise, use primary language
  return languages[0].language
}

/**
 * Calculate overall analysis confidence
 */
function calculateOverallConfidence(
  languages: LanguageDetection[],
  frameworks: FrameworkDetectionResult[],
): number {
  if (languages.length === 0) return 0

  // Weight language confidence heavily
  const langConfidence = languages.reduce((sum, lang) => sum + lang.confidence, 0) / languages.length

  // Add framework confidence if available
  let frameworkConfidence = 0
  if (frameworks.length > 0) {
    frameworkConfidence = frameworks.reduce((sum, fw) => sum + fw.confidence, 0) / frameworks.length
  }

  // Combine with language having more weight
  return frameworkConfidence > 0
    ? (langConfidence * 0.7 + frameworkConfidence * 0.3)
    : langConfidence
}