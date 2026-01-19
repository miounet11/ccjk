/**
 * Context Manager - Automatic context management for Claude Code
 *
 * This module provides functionality to:
 * - Auto-detect project type and generate appropriate CLAUDE.md rules
 * - Manage context files (add/remove/view)
 * - Generate project-specific context based on detected patterns
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { dirname, join } from 'pathe'
import { readFile, writeFileAtomic } from './fs-operations'

// ============================================================================
// Types
// ============================================================================

export interface ContextProjectInfo {
  type: ContextProjectType
  framework?: string
  language: string
  packageManager?: string
  hasTests: boolean
  hasDocker: boolean
  hasCi: boolean
  monorepo: boolean
  detectedPatterns: string[]
}

export type ContextProjectType
  = | 'nodejs'
    | 'python'
    | 'rust'
    | 'go'
    | 'java'
    | 'dotnet'
    | 'ruby'
    | 'php'
    | 'unknown'

export interface ContextRule {
  id: string
  name: string
  nameZh: string
  description: string
  descriptionZh: string
  content: string
  contentZh: string
  category: 'coding' | 'testing' | 'docs' | 'workflow' | 'security'
  applicableTo: ContextProjectType[]
}

export interface ContextFile {
  path: string
  type: 'global' | 'project' | 'local'
  exists: boolean
  size?: number
  lastModified?: Date
}

// ============================================================================
// Project Detection
// ============================================================================

/**
 * Detect project type and context from the current directory
 */
export function detectProjectContext(projectPath: string = process.cwd()): ContextProjectInfo {
  const context: ContextProjectInfo = {
    type: 'unknown',
    language: 'unknown',
    hasTests: false,
    hasDocker: false,
    hasCi: false,
    monorepo: false,
    detectedPatterns: [],
  }

  if (!existsSync(projectPath)) {
    return context
  }

  const files = safeReadDir(projectPath)

  // Detect Node.js / JavaScript / TypeScript
  if (files.includes('package.json')) {
    context.type = 'nodejs'
    context.language = files.includes('tsconfig.json') ? 'typescript' : 'javascript'
    context.detectedPatterns.push('package.json')

    // Detect package manager
    if (files.includes('pnpm-lock.yaml')) {
      context.packageManager = 'pnpm'
    }
    else if (files.includes('yarn.lock')) {
      context.packageManager = 'yarn'
    }
    else if (files.includes('bun.lockb')) {
      context.packageManager = 'bun'
    }
    else if (files.includes('package-lock.json')) {
      context.packageManager = 'npm'
    }

    // Detect framework
    const packageJson = readPackageJson(projectPath)
    if (packageJson) {
      context.framework = detectNodeFramework(packageJson)
    }

    // Detect monorepo
    if (files.includes('pnpm-workspace.yaml') || files.includes('lerna.json')) {
      context.monorepo = true
      context.detectedPatterns.push('monorepo')
    }
  }

  // Detect Python
  if (files.includes('pyproject.toml') || files.includes('setup.py') || files.includes('requirements.txt')) {
    context.type = 'python'
    context.language = 'python'
    context.detectedPatterns.push(files.includes('pyproject.toml') ? 'pyproject.toml' : 'requirements.txt')

    // Detect package manager
    if (files.includes('poetry.lock')) {
      context.packageManager = 'poetry'
    }
    else if (files.includes('Pipfile.lock')) {
      context.packageManager = 'pipenv'
    }
    else if (files.includes('uv.lock')) {
      context.packageManager = 'uv'
    }

    // Detect framework
    context.framework = detectPythonFramework(projectPath)
  }

  // Detect Rust
  if (files.includes('Cargo.toml')) {
    context.type = 'rust'
    context.language = 'rust'
    context.packageManager = 'cargo'
    context.detectedPatterns.push('Cargo.toml')

    // Detect workspace (monorepo)
    const cargoContent = readFile(join(projectPath, 'Cargo.toml'))
    if (cargoContent?.includes('[workspace]')) {
      context.monorepo = true
      context.detectedPatterns.push('cargo-workspace')
    }
  }

  // Detect Go
  if (files.includes('go.mod')) {
    context.type = 'go'
    context.language = 'go'
    context.packageManager = 'go'
    context.detectedPatterns.push('go.mod')
  }

  // Detect Java
  if (files.includes('pom.xml') || files.includes('build.gradle') || files.includes('build.gradle.kts')) {
    context.type = 'java'
    context.language = 'java'
    context.packageManager = files.includes('pom.xml') ? 'maven' : 'gradle'
    context.detectedPatterns.push(files.includes('pom.xml') ? 'pom.xml' : 'build.gradle')
  }

  // Detect .NET
  if (files.some(f => f.endsWith('.csproj') || f.endsWith('.fsproj') || f.endsWith('.sln'))) {
    context.type = 'dotnet'
    context.language = files.some(f => f.endsWith('.fsproj')) ? 'fsharp' : 'csharp'
    context.packageManager = 'dotnet'
    context.detectedPatterns.push('.NET project')
  }

  // Detect Ruby
  if (files.includes('Gemfile')) {
    context.type = 'ruby'
    context.language = 'ruby'
    context.packageManager = 'bundler'
    context.detectedPatterns.push('Gemfile')

    // Detect Rails
    if (files.includes('config') && existsSync(join(projectPath, 'config', 'routes.rb'))) {
      context.framework = 'rails'
    }
  }

  // Detect PHP
  if (files.includes('composer.json')) {
    context.type = 'php'
    context.language = 'php'
    context.packageManager = 'composer'
    context.detectedPatterns.push('composer.json')

    // Detect Laravel
    if (files.includes('artisan')) {
      context.framework = 'laravel'
    }
  }

  // Common detections
  context.hasDocker = files.includes('Dockerfile') || files.includes('docker-compose.yml') || files.includes('docker-compose.yaml')
  context.hasCi = files.includes('.github') || files.includes('.gitlab-ci.yml') || files.includes('.circleci')
  context.hasTests = files.includes('tests') || files.includes('test') || files.includes('__tests__') || files.includes('spec')

  if (context.hasDocker)
    context.detectedPatterns.push('docker')
  if (context.hasCi)
    context.detectedPatterns.push('ci/cd')
  if (context.hasTests)
    context.detectedPatterns.push('tests')

  return context
}

/**
 * Safely read directory contents
 */
function safeReadDir(dirPath: string): string[] {
  try {
    return readdirSync(dirPath)
  }
  catch {
    return []
  }
}

/**
 * Read and parse package.json
 */
function readPackageJson(projectPath: string): Record<string, unknown> | null {
  try {
    const content = readFile(join(projectPath, 'package.json'))
    if (content) {
      return JSON.parse(content)
    }
  }
  catch {
    // Ignore parse errors
  }
  return null
}

/**
 * Detect Node.js framework from package.json
 */
function detectNodeFramework(packageJson: Record<string, unknown>): string | undefined {
  const deps = {
    ...(packageJson.dependencies as Record<string, string> || {}),
    ...(packageJson.devDependencies as Record<string, string> || {}),
  }

  if (deps.next)
    return 'nextjs'
  if (deps.nuxt)
    return 'nuxt'
  if (deps['@angular/core'])
    return 'angular'
  if (deps.vue)
    return 'vue'
  if (deps.react)
    return 'react'
  if (deps.svelte)
    return 'svelte'
  if (deps.express)
    return 'express'
  if (deps.fastify)
    return 'fastify'
  if (deps.nestjs || deps['@nestjs/core'])
    return 'nestjs'
  if (deps.hono)
    return 'hono'
  if (deps.elysia)
    return 'elysia'

  return undefined
}

/**
 * Detect Python framework
 */
function detectPythonFramework(projectPath: string): string | undefined {
  const files = safeReadDir(projectPath)

  // Check for common framework indicators
  if (files.includes('manage.py'))
    return 'django'
  if (files.includes('app.py') || files.includes('main.py')) {
    const content = readFile(join(projectPath, files.includes('app.py') ? 'app.py' : 'main.py'))
    if (content) {
      if (content.includes('FastAPI'))
        return 'fastapi'
      if (content.includes('Flask'))
        return 'flask'
    }
  }

  return undefined
}

// ============================================================================
// Context Rules
// ============================================================================

/**
 * Get predefined context rules
 */
export function getContextRules(): ContextRule[] {
  return [
    // Coding Style Rules
    {
      id: 'prefer-functional',
      name: 'Prefer Functional Style',
      nameZh: '优先函数式风格',
      description: 'Prefer functional programming patterns over imperative',
      descriptionZh: '优先使用函数式编程模式而非命令式',
      content: `## Coding Style
- Prefer functional programming patterns (map, filter, reduce) over imperative loops
- Use pure functions where possible
- Avoid side effects in functions`,
      contentZh: `## 编码风格
- 优先使用函数式编程模式（map、filter、reduce）而非命令式循环
- 尽可能使用纯函数
- 避免函数中的副作用`,
      category: 'coding',
      applicableTo: ['nodejs', 'python', 'rust', 'go', 'java', 'dotnet', 'ruby', 'php', 'unknown'],
    },
    {
      id: 'explicit-types',
      name: 'Explicit Type Annotations',
      nameZh: '显式类型注解',
      description: 'Always use explicit type annotations',
      descriptionZh: '始终使用显式类型注解',
      content: `## Type Safety
- Always use explicit type annotations for function parameters and return types
- Avoid using 'any' type
- Use strict null checks`,
      contentZh: `## 类型安全
- 始终为函数参数和返回类型使用显式类型注解
- 避免使用 'any' 类型
- 使用严格的空值检查`,
      category: 'coding',
      applicableTo: ['nodejs', 'python', 'rust', 'java', 'dotnet'],
    },
    {
      id: 'error-handling',
      name: 'Comprehensive Error Handling',
      nameZh: '全面的错误处理',
      description: 'Always handle errors explicitly',
      descriptionZh: '始终显式处理错误',
      content: `## Error Handling
- Always handle errors explicitly, never ignore them
- Use try-catch blocks for async operations
- Provide meaningful error messages
- Log errors with context information`,
      contentZh: `## 错误处理
- 始终显式处理错误，不要忽略
- 对异步操作使用 try-catch 块
- 提供有意义的错误消息
- 记录带有上下文信息的错误`,
      category: 'coding',
      applicableTo: ['nodejs', 'python', 'rust', 'go', 'java', 'dotnet', 'ruby', 'php', 'unknown'],
    },

    // Testing Rules
    {
      id: 'test-first',
      name: 'Test-First Development',
      nameZh: '测试优先开发',
      description: 'Write tests before implementation',
      descriptionZh: '在实现之前编写测试',
      content: `## Testing
- Write tests before implementing features (TDD)
- Each function should have corresponding unit tests
- Use descriptive test names that explain the expected behavior`,
      contentZh: `## 测试
- 在实现功能之前编写测试（TDD）
- 每个函数都应有对应的单元测试
- 使用描述性的测试名称来解释预期行为`,
      category: 'testing',
      applicableTo: ['nodejs', 'python', 'rust', 'go', 'java', 'dotnet', 'ruby', 'php', 'unknown'],
    },
    {
      id: 'high-coverage',
      name: 'High Test Coverage',
      nameZh: '高测试覆盖率',
      description: 'Maintain high test coverage',
      descriptionZh: '保持高测试覆盖率',
      content: `## Test Coverage
- Maintain at least 80% code coverage
- Cover edge cases and error scenarios
- Include integration tests for critical paths`,
      contentZh: `## 测试覆盖率
- 保持至少 80% 的代码覆盖率
- 覆盖边界情况和错误场景
- 为关键路径包含集成测试`,
      category: 'testing',
      applicableTo: ['nodejs', 'python', 'rust', 'go', 'java', 'dotnet', 'ruby', 'php', 'unknown'],
    },

    // Documentation Rules
    {
      id: 'doc-comments',
      name: 'Documentation Comments',
      nameZh: '文档注释',
      description: 'Add documentation comments to all public APIs',
      descriptionZh: '为所有公共 API 添加文档注释',
      content: `## Documentation
- Add JSDoc/docstring comments to all public functions and classes
- Include parameter descriptions and return value documentation
- Add usage examples for complex functions`,
      contentZh: `## 文档
- 为所有公共函数和类添加 JSDoc/docstring 注释
- 包含参数描述和返回值文档
- 为复杂函数添加使用示例`,
      category: 'docs',
      applicableTo: ['nodejs', 'python', 'rust', 'go', 'java', 'dotnet', 'ruby', 'php', 'unknown'],
    },

    // Workflow Rules
    {
      id: 'conventional-commits',
      name: 'Conventional Commits',
      nameZh: '约定式提交',
      description: 'Use conventional commit messages',
      descriptionZh: '使用约定式提交消息',
      content: `## Git Workflow
- Use conventional commit format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore
- Keep commits atomic and focused`,
      contentZh: `## Git 工作流
- 使用约定式提交格式：type(scope): description
- 类型：feat、fix、docs、style、refactor、test、chore
- 保持提交原子化和专注`,
      category: 'workflow',
      applicableTo: ['nodejs', 'python', 'rust', 'go', 'java', 'dotnet', 'ruby', 'php', 'unknown'],
    },
    {
      id: 'pr-guidelines',
      name: 'PR Guidelines',
      nameZh: 'PR 指南',
      description: 'Follow PR best practices',
      descriptionZh: '遵循 PR 最佳实践',
      content: `## Pull Requests
- Keep PRs small and focused (< 400 lines)
- Include clear description of changes
- Add screenshots for UI changes
- Request reviews from relevant team members`,
      contentZh: `## Pull Requests
- 保持 PR 小而专注（< 400 行）
- 包含清晰的变更描述
- 为 UI 变更添加截图
- 向相关团队成员请求审查`,
      category: 'workflow',
      applicableTo: ['nodejs', 'python', 'rust', 'go', 'java', 'dotnet', 'ruby', 'php', 'unknown'],
    },

    // Security Rules
    {
      id: 'security-basics',
      name: 'Security Best Practices',
      nameZh: '安全最佳实践',
      description: 'Follow security best practices',
      descriptionZh: '遵循安全最佳实践',
      content: `## Security
- Never commit secrets or credentials
- Validate and sanitize all user inputs
- Use parameterized queries for database operations
- Keep dependencies updated`,
      contentZh: `## 安全
- 永远不要提交密钥或凭证
- 验证和清理所有用户输入
- 对数据库操作使用参数化查询
- 保持依赖项更新`,
      category: 'security',
      applicableTo: ['nodejs', 'python', 'rust', 'go', 'java', 'dotnet', 'ruby', 'php', 'unknown'],
    },
  ]
}

/**
 * Get rules applicable to a project type
 */
export function getApplicableRules(projectType: ContextProjectType): ContextRule[] {
  return getContextRules().filter(rule =>
    rule.applicableTo.includes(projectType) || rule.applicableTo.includes('unknown'),
  )
}

// ============================================================================
// Context File Management
// ============================================================================

/**
 * Get all context file locations
 */
export function getContextFiles(projectPath: string = process.cwd()): ContextFile[] {
  const home = homedir()
  const files: ContextFile[] = []

  // Global CLAUDE.md
  const globalPath = join(home, '.claude', 'CLAUDE.md')
  files.push({
    path: globalPath,
    type: 'global',
    exists: existsSync(globalPath),
    ...getFileStats(globalPath),
  })

  // Project CLAUDE.md
  const projectClaudeMd = join(projectPath, 'CLAUDE.md')
  files.push({
    path: projectClaudeMd,
    type: 'project',
    exists: existsSync(projectClaudeMd),
    ...getFileStats(projectClaudeMd),
  })

  // Local .claude/CLAUDE.md
  const localPath = join(projectPath, '.claude', 'CLAUDE.md')
  files.push({
    path: localPath,
    type: 'local',
    exists: existsSync(localPath),
    ...getFileStats(localPath),
  })

  return files
}

/**
 * Get file stats if file exists
 */
function getFileStats(filePath: string): { size?: number, lastModified?: Date } {
  try {
    if (existsSync(filePath)) {
      const stats = statSync(filePath)
      return {
        size: stats.size,
        lastModified: stats.mtime,
      }
    }
  }
  catch {
    // Ignore errors
  }
  return {}
}

/**
 * Read context file content
 */
export function readContextFile(filePath: string): string | null {
  return readFile(filePath)
}

/**
 * Write context file with atomic write
 */
export async function writeContextFile(filePath: string, content: string): Promise<boolean> {
  try {
    // Ensure directory exists
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      const { mkdirSync } = await import('node:fs')
      mkdirSync(dir, { recursive: true })
    }

    await writeFileAtomic(filePath, content)
    return true
  }
  catch {
    return false
  }
}

// ============================================================================
// Context Generation
// ============================================================================

/**
 * Generate CLAUDE.md content based on project context
 */
export function generateContextContent(
  context: ContextProjectInfo,
  selectedRules: string[],
  lang: 'en' | 'zh-CN' = 'en',
): string {
  const isZh = lang === 'zh-CN'
  const rules = getContextRules().filter(r => selectedRules.includes(r.id))

  const lines: string[] = []

  // Header
  lines.push(isZh ? '# 项目规则' : '# Project Rules')
  lines.push('')

  // Project info
  lines.push(isZh ? '## 项目信息' : '## Project Information')
  lines.push(`- ${isZh ? '类型' : 'Type'}: ${context.type}`)
  lines.push(`- ${isZh ? '语言' : 'Language'}: ${context.language}`)
  if (context.framework) {
    lines.push(`- ${isZh ? '框架' : 'Framework'}: ${context.framework}`)
  }
  if (context.packageManager) {
    lines.push(`- ${isZh ? '包管理器' : 'Package Manager'}: ${context.packageManager}`)
  }
  lines.push('')

  // Add selected rules
  for (const rule of rules) {
    lines.push(isZh ? rule.contentZh : rule.content)
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push(isZh
    ? `*由 CCJK 自动生成于 ${new Date().toISOString().split('T')[0]}*`
    : `*Auto-generated by CCJK on ${new Date().toISOString().split('T')[0]}*`)

  return lines.join('\n')
}

/**
 * Get recommended rules based on project context
 */
export function getRecommendedRules(context: ContextProjectInfo): string[] {
  const recommended: string[] = []

  // Always recommend error handling and security
  recommended.push('error-handling', 'security-basics')

  // Recommend type annotations for typed languages
  if (['nodejs', 'python', 'rust', 'java', 'dotnet'].includes(context.type)) {
    if (context.language === 'typescript' || context.type === 'rust' || context.type === 'java') {
      recommended.push('explicit-types')
    }
  }

  // Recommend testing if project has tests
  if (context.hasTests) {
    recommended.push('test-first', 'high-coverage')
  }

  // Recommend conventional commits if has CI
  if (context.hasCi) {
    recommended.push('conventional-commits', 'pr-guidelines')
  }

  // Recommend documentation
  recommended.push('doc-comments')

  return recommended
}

/**
 * Merge new rules into existing CLAUDE.md content
 */
export function mergeContextContent(
  existingContent: string,
  newRules: string[],
  lang: 'en' | 'zh-CN' = 'en',
): string {
  const isZh = lang === 'zh-CN'
  const rules = getContextRules().filter(r => newRules.includes(r.id))

  // Check if rules already exist
  const existingRuleIds: string[] = []
  for (const rule of getContextRules()) {
    const marker = isZh ? rule.contentZh.split('\n')[0] : rule.content.split('\n')[0]
    if (existingContent.includes(marker)) {
      existingRuleIds.push(rule.id)
    }
  }

  // Filter out already existing rules
  const newRulesToAdd = rules.filter(r => !existingRuleIds.includes(r.id))

  if (newRulesToAdd.length === 0) {
    return existingContent
  }

  // Add new rules before the footer
  const footerMarker = '---'
  const footerIndex = existingContent.lastIndexOf(footerMarker)

  let content = existingContent
  const newContent = newRulesToAdd.map(r => isZh ? r.contentZh : r.content).join('\n\n')

  if (footerIndex > 0) {
    content = `${existingContent.slice(0, footerIndex) + newContent}\n\n${existingContent.slice(footerIndex)}`
  }
  else {
    content = `${existingContent}\n\n${newContent}`
  }

  return content
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display name for project type
 */
export function getProjectTypeLabel(type: ContextProjectType, lang: 'en' | 'zh-CN' = 'en'): string {
  const labels: Record<ContextProjectType, { en: string, zh: string }> = {
    nodejs: { en: 'Node.js', zh: 'Node.js' },
    python: { en: 'Python', zh: 'Python' },
    rust: { en: 'Rust', zh: 'Rust' },
    go: { en: 'Go', zh: 'Go' },
    java: { en: 'Java', zh: 'Java' },
    dotnet: { en: '.NET', zh: '.NET' },
    ruby: { en: 'Ruby', zh: 'Ruby' },
    php: { en: 'PHP', zh: 'PHP' },
    unknown: { en: 'Unknown', zh: '未知' },
  }

  return lang === 'zh-CN' ? labels[type].zh : labels[type].en
}

/**
 * Get context file type label
 */
export function getContextFileTypeLabel(type: ContextFile['type'], lang: 'en' | 'zh-CN' = 'en'): string {
  const labels: Record<ContextFile['type'], { en: string, zh: string }> = {
    global: { en: 'Global', zh: '全局' },
    project: { en: 'Project', zh: '项目' },
    local: { en: 'Local', zh: '本地' },
  }

  return lang === 'zh-CN' ? labels[type].zh : labels[type].en
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
