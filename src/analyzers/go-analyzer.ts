/**
 * Go project analyzer
 * Detects frameworks like Gin, Echo, etc.
 */

import type { FrameworkDetectionResult, LanguageDetection } from './types.js'
import consola from 'consola'
import fs from 'fs-extra'
import path from 'pathe'

const logger = consola.withTag('go-analyzer')

// Go framework detection patterns
const FRAMEWORK_PATTERNS = {
  gin: {
    imports: ['github.com/gin-gonic/gin'],
    indicators: ['gin.Default()', 'gin.Context'],
  },
  echo: {
    imports: ['github.com/labstack/echo/v4'],
    indicators: ['echo.New()', 'echo.Context'],
  },
  fiber: {
    imports: ['github.com/gofiber/fiber/v2'],
    indicators: ['fiber.New()', 'fiber.Ctx'],
  },
  chi: {
    imports: ['github.com/go-chi/chi/v5'],
    indicators: ['chi.NewRouter()', 'chi.Router'],
  },
  mux: {
    imports: ['github.com/gorilla/mux'],
    indicators: ['mux.NewRouter()', 'mux.Router'],
  },
  httprouter: {
    imports: ['github.com/julienschmidt/httprouter'],
    indicators: ['httprouter.New()', 'httprouter.Params'],
  },
  fasthttp: {
    imports: ['github.com/valyala/fasthttp'],
    indicators: ['fasthttp.Server', 'fasthttp.RequestHandler'],
  },
  grpc: {
    imports: ['google.golang.org/grpc'],
    indicators: ['grpc.NewServer()', 'grpc.Dial'],
  },
  protobuf: {
    imports: ['google.golang.org/protobuf'],
    indicators: ['.proto', 'proto.Marshal'],
  },
  gorm: {
    imports: ['gorm.io/gorm'],
    indicators: ['gorm.Open', 'gorm.DB'],
  },
  sql: {
    imports: ['database/sql'],
    indicators: ['sql.Open', 'sql.DB'],
  },
  ent: {
    imports: ['entgo.io/ent'],
    indicators: ['ent.Client', 'ent.Schema'],
  },
  cobra: {
    imports: ['github.com/spf13/cobra'],
    indicators: ['cobra.Command', 'cobra.Execute'],
  },
  viper: {
    imports: ['github.com/spf13/viper'],
    indicators: ['viper.New', 'viper.Get'],
  },
  testify: {
    imports: ['github.com/stretchr/testify'],
    indicators: ['assert.Equal', 'require.NoError'],
  },
  mock: {
    imports: ['github.com/golang/mock'],
    indicators: ['gomock.Controller', 'mockgen'],
  },
  redis: {
    imports: ['github.com/redis/go-redis/v9'],
    indicators: ['redis.NewClient', 'redis.Client'],
  },
  mongo: {
    imports: ['go.mongodb.org/mongo-driver'],
    indicators: ['mongo.Connect', 'mongo.Database'],
  },
  prometheus: {
    imports: ['github.com/prometheus/client_golang'],
    indicators: ['prometheus.Counter', 'promhttp.Handler'],
  },
  jaeger: {
    imports: ['github.com/uber/jaeger-client-go'],
    indicators: ['jaeger.NewTracer', 'jaeger.Config'],
  },
  kubernetes: {
    imports: ['k8s.io/client-go'],
    indicators: ['kubernetes.Clientset', 'k8s.io'],
  },
}

/**
 * Analyze Go project
 */
export async function analyzeGoProject(
  projectPath: string,
  files: string[],
  languages: LanguageDetection[],
): Promise<FrameworkDetectionResult[]> {
  logger.info('Analyzing Go project')

  const frameworks: FrameworkDetectionResult[] = []
  const goModPath = path.join(projectPath, 'go.mod')

  // Read go.mod
  let goMod: any = null
  try {
    if (await fs.pathExists(goModPath)) {
      const content = await fs.readFile(goModPath, 'utf-8')
      goMod = parseGoMod(content)
    }
  }
  catch (error) {
    logger.warn('Failed to read go.mod:', error)
  }

  // Scan Go source files for imports
  const imports = await scanGoImports(projectPath, files)

  // Check for each framework
  for (const [frameworkName, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
    const evidence: string[] = []
    let confidence = 0

    // Check imports
    for (const importPath of patterns.imports) {
      if (imports[importPath]) {
        evidence.push(`Found import: ${importPath}`)
        confidence += 0.5
      }
    }

    // Check code indicators
    for (const indicator of patterns.indicators) {
      const filesWithIndicator = Object.values(imports).flat()
      if (filesWithIndicator.some(f => f.includes(indicator))) {
        evidence.push(`Found pattern: ${indicator}`)
        confidence += 0.3
      }
    }

    // Add framework if detected
    if (confidence > 0) {
      frameworks.push({
        name: frameworkName,
        category: getFrameworkCategory(frameworkName),
        confidence: Math.min(confidence, 1),
        evidence,
      })
    }
  }

  // Detect additional patterns
  await detectAdditionalPatterns(projectPath, files, frameworks, imports)

  // Sort by confidence
  frameworks.sort((a, b) => b.confidence - a.confidence)

  logger.debug(`Detected frameworks: ${frameworks.map(f => `${f.name} (${Math.round(f.confidence * 100)}%)`).join(', ')}`)

  return frameworks
}

/**
 * Parse go.mod file
 */
function parseGoMod(content: string): { module?: string, go?: string, requires: Record<string, string> } {
  const result: { module?: string, go?: string, requires: Record<string, string> } = {
    requires: {},
  }

  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('module')) {
      result.module = trimmed.split(' ')[1]
    }
    else if (trimmed.startsWith('go')) {
      result.go = trimmed.split(' ')[1]
    }
    else if (trimmed.startsWith('require')) {
      // Handle single require
      const parts = trimmed.split(' ')
      if (parts.length >= 3) {
        result.requires[parts[1]] = parts[2]
      }
    }
    else if (trimmed.includes(' ')) {
      // Handle require block
      const parts = trimmed.split(' ')
      if (parts.length >= 2 && !trimmed.startsWith('//')) {
        result.requires[parts[0]] = parts[1]
      }
    }
  }

  return result
}

/**
 * Scan Go source files for imports
 */
async function scanGoImports(
  projectPath: string,
  files: string[],
): Promise<Record<string, string[]>> {
  const imports: Record<string, string[]> = {}
  const goFiles = files.filter(f => f.endsWith('.go'))

  for (const file of goFiles) {
    try {
      const content = await fs.readFile(path.join(projectPath, file), 'utf-8')
      const fileImports = extractGoImports(content)

      for (const importPath of fileImports) {
        if (!imports[importPath]) {
          imports[importPath] = []
        }
        imports[importPath].push(file)
      }
    }
    catch (error) {
      logger.warn(`Failed to read ${file}:`, error)
    }
  }

  return imports
}

/**
 * Extract imports from Go source code
 */
function extractGoImports(content: string): string[] {
  const imports: string[] = []

  // Match import statements
  const importRegex = /import\s+(?:\(\s*([\s\S]*?)\s*\)|(["`][^"`]+["`]))/g
  let match

  while ((match = importRegex.exec(content)) !== null) {
    const importBlock = match[1] || match[2]

    if (importBlock) {
      // Extract individual imports
      const singleImportRegex = /["`]([^"`]+)["`]/g
      let importMatch

      while ((importMatch = singleImportRegex.exec(importBlock)) !== null) {
        imports.push(importMatch[1])
      }
    }
  }

  return imports
}

/**
 * Get framework category
 */
function getFrameworkCategory(framework: string): string {
  const categories = {
    web: [
      'gin',
      'echo',
      'fiber',
      'chi',
      'mux',
      'httprouter',
      'fasthttp',
    ],
    rpc: ['grpc', 'protobuf'],
    database: ['gorm', 'sql', 'ent'],
    cli: ['cobra', 'viper'],
    testing: ['testify', 'mock'],
    cache: ['redis'],
    database2: ['mongo'],
    monitoring: ['prometheus', 'jaeger'],
    infrastructure: ['kubernetes'],
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
  imports: Record<string, string[]>,
): Promise<void> {
  // Check for Go version
  const goModPath = path.join(projectPath, 'go.mod')
  if (files.includes('go.mod') && await fs.pathExists(goModPath)) {
    try {
      const content = await fs.readFile(goModPath, 'utf-8')
      const goVersionMatch = content.match(/^go\s+(\d+\.\d+)/m)
      if (goVersionMatch) {
        frameworks.push({
          name: 'go',
          category: 'language',
          version: goVersionMatch[1],
          confidence: 0.9,
          evidence: ['Found go.mod'],
        })
      }
    }
    catch (error) {
      logger.warn('Failed to read go.mod:', error)
    }
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
  if (files.some(f => f.endsWith('_test.go'))) {
    frameworks.push({
      name: 'testing',
      category: 'testing',
      confidence: 0.7,
      evidence: ['Found test files'],
    })
  }

  // Check for build tools
  const buildFiles = {
    'Makefile': 'make',
    'Dockerfile': 'docker',
    '.goreleaser.yml': 'goreleaser',
    '.goreleaser.yaml': 'goreleaser',
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

  // Check for linting tools
  const lintingTools = [
    'github.com/golangci/golangci-lint',
    'golang.org/x/lint',
    'honnef.co/go/tools',
  ]

  for (const tool of lintingTools) {
    if (imports[tool]) {
      frameworks.push({
        name: 'golangci-lint',
        category: 'linting',
        confidence: 0.8,
        evidence: [`Found ${tool} import`],
      })
    }
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

  // Check for protobuf
  if (files.some(f => f.endsWith('.proto'))) {
    frameworks.push({
      name: 'protobuf',
      category: 'rpc',
      confidence: 0.9,
      evidence: ['Found .proto files'],
    })
  }

  // Check for workspace
  const goWorkPath = path.join(projectPath, 'go.work')
  if (files.includes('go.work') && await fs.pathExists(goWorkPath)) {
    frameworks.push({
      name: 'workspace',
      category: 'workspace',
      confidence: 0.9,
      evidence: ['Found go.work'],
    })
  }

  // Check for vendor directory
  if (files.includes('vendor/') || files.some(f => f.startsWith('vendor/'))) {
    frameworks.push({
      name: 'vendor',
      category: 'dependency',
      confidence: 0.8,
      evidence: ['Found vendor directory'],
    })
  }
}
