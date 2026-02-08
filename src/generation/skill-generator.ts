/**
 * Smart Skill Generator
 *
 * Generates Claude Code compatible skills based on project analysis
 */

import type { GeneratedSkill, GenerationContext } from './types'
import consola from 'consola'
import { recommendSkillCategories } from './project-analyzer'

const logger = consola.withTag('skill-generator')

/**
 * Generate skills based on project analysis
 */
export async function generateSkills(context: GenerationContext): Promise<GeneratedSkill[]> {
  logger.info('Generating skills...')

  const recommendedCategories = recommendSkillCategories(context.analysis)
  const skills: GeneratedSkill[] = []

  logger.info(`Generating skills for categories: ${recommendedCategories.join(', ')}`)

  // Generate skills for each category
  for (const category of recommendedCategories) {
    const categorySkills = await generateSkillsForCategory(category, context)
    for (const skill of categorySkills) {
      if (!context.existingSkills.includes(skill.id)) {
        skills.push(skill)
      }
    }
  }

  // Sort by priority
  skills.sort((a, b) => b.priority - a.priority)

  // Limit to max skills
  const limitedSkills = skills.slice(0, context.preferences.maxSkills)

  logger.success(`Generated ${limitedSkills.length} skills`)

  return limitedSkills
}

/**
 * Generate skills for specific category
 */
async function generateSkillsForCategory(
  category: string,
  context: GenerationContext,
): Promise<GeneratedSkill[]> {
  const { analysis, preferences: _preferences } = context
  const skills: GeneratedSkill[] = []

  // Get skill templates for category
  const templates = getSkillTemplates(category, analysis)

  for (const template of templates) {
    const skill: GeneratedSkill = {
      id: template.id || `${category}-skill`,
      name: template.name || { 'en': category, 'zh-CN': category },
      description: template.description || { 'en': `Skill for ${category}`, 'zh-CN': `${category}技能` },
      category: template.category || 'custom',
      triggers: template.triggers || [],
      actions: template.actions || [],
      requirements: template.requirements,
      priority: template.priority ?? 5,
      tags: buildSkillTags(category, analysis),
      source: 'smart-analysis',
    }
    skills.push(skill)
  }

  return skills
}

/**
 * Build tags for skill
 */
function buildSkillTags(category: string, analysis: any): string[] {
  const tags: string[] = [category]

  // Add project type
  tags.push(analysis.projectType)

  // Add package manager
  if (analysis.packageManager) {
    tags.push(analysis.packageManager)
  }

  return [...new Set(tags)]
}

/**
 * Get skill templates for category
 */
function getSkillTemplates(category: string, analysis: any): Partial<GeneratedSkill>[] {
  const templates: Record<string, Partial<GeneratedSkill>[]> = {
    development: [
      {
        id: 'quick-scaffold',
        name: {
          'en': 'Quick Scaffold',
          'zh-CN': '快速脚手架',
        },
        description: {
          'en': 'Quickly scaffold new components, modules, or files',
          'zh-CN': '快速创建新组件、模块或文件',
        },
        category: 'development',
        triggers: [
          { type: 'command', value: '/scaffold', description: 'Create new scaffold' },
          { type: 'pattern', value: 'create (component|module|file)', description: 'Pattern match' },
        ],
        actions: [
          {
            type: 'prompt',
            content: 'Analyze the project structure and create a new {{type}} following existing patterns',
            description: 'Generate scaffold',
          },
        ],
        priority: 9,
      },
      {
        id: 'code-explain',
        name: {
          'en': 'Code Explainer',
          'zh-CN': '代码解释器',
        },
        description: {
          'en': 'Explain code functionality and logic',
          'zh-CN': '解释代码功能和逻辑',
        },
        category: 'development',
        triggers: [
          { type: 'command', value: '/explain', description: 'Explain code' },
          { type: 'pattern', value: 'explain (this|code|function)', description: 'Pattern match' },
        ],
        actions: [
          {
            type: 'prompt',
            content: 'Analyze and explain the selected code, including its purpose, logic flow, and key concepts',
            description: 'Explain code',
          },
        ],
        priority: 8,
      },
    ],

    testing: [
      {
        id: 'generate-tests',
        name: {
          'en': 'Generate Tests',
          'zh-CN': '生成测试',
        },
        description: {
          'en': 'Generate unit tests for selected code',
          'zh-CN': '为选中代码生成单元测试',
        },
        category: 'testing',
        triggers: [
          { type: 'command', value: '/test', description: 'Generate tests' },
          { type: 'pattern', value: 'write tests? for', description: 'Pattern match' },
        ],
        actions: [
          {
            type: 'prompt',
            content: 'Generate comprehensive unit tests for the selected code using the project\'s testing framework',
            description: 'Generate tests',
          },
        ],
        requirements: [
          { type: 'tool', name: 'testing-framework', optional: false },
        ],
        priority: 9,
      },
      {
        id: 'run-tests',
        name: {
          'en': 'Run Tests',
          'zh-CN': '运行测试',
        },
        description: {
          'en': 'Run project tests and analyze results',
          'zh-CN': '运行项目测试并分析结果',
        },
        category: 'testing',
        triggers: [
          { type: 'command', value: '/run-tests', description: 'Run tests' },
        ],
        actions: [
          {
            type: 'bash',
            content: getTestCommand(analysis),
            description: 'Execute tests',
          },
        ],
        priority: 8,
      },
    ],

    git: [
      {
        id: 'smart-commit',
        name: {
          'en': 'Smart Commit',
          'zh-CN': '智能提交',
        },
        description: {
          'en': 'Generate meaningful commit messages based on changes',
          'zh-CN': '根据更改生成有意义的提交信息',
        },
        category: 'git',
        triggers: [
          { type: 'command', value: '/commit', description: 'Smart commit' },
        ],
        actions: [
          {
            type: 'bash',
            content: 'git diff --staged',
            description: 'Get staged changes',
          },
          {
            type: 'prompt',
            content: 'Analyze the staged changes and generate a conventional commit message',
            description: 'Generate commit message',
          },
        ],
        priority: 10,
      },
      {
        id: 'pr-description',
        name: {
          'en': 'PR Description',
          'zh-CN': 'PR 描述',
        },
        description: {
          'en': 'Generate pull request description from commits',
          'zh-CN': '从提交记录生成 PR 描述',
        },
        category: 'git',
        triggers: [
          { type: 'command', value: '/pr', description: 'Generate PR description' },
        ],
        actions: [
          {
            type: 'bash',
            content: 'git log --oneline main..HEAD',
            description: 'Get commits',
          },
          {
            type: 'prompt',
            content: 'Generate a comprehensive PR description based on the commits',
            description: 'Generate PR description',
          },
        ],
        priority: 9,
      },
    ],

    debugging: [
      {
        id: 'debug-error',
        name: {
          'en': 'Debug Error',
          'zh-CN': '调试错误',
        },
        description: {
          'en': 'Analyze and fix errors in code',
          'zh-CN': '分析并修复代码中的错误',
        },
        category: 'debugging',
        triggers: [
          { type: 'command', value: '/debug', description: 'Debug error' },
          { type: 'pattern', value: 'fix (error|bug|issue)', description: 'Pattern match' },
        ],
        actions: [
          {
            type: 'prompt',
            content: 'Analyze the error, identify the root cause, and provide a fix',
            description: 'Debug and fix',
          },
        ],
        priority: 9,
      },
      {
        id: 'trace-issue',
        name: {
          'en': 'Trace Issue',
          'zh-CN': '追踪问题',
        },
        description: {
          'en': 'Trace the source of an issue through the codebase',
          'zh-CN': '在代码库中追踪问题的来源',
        },
        category: 'debugging',
        triggers: [
          { type: 'command', value: '/trace', description: 'Trace issue' },
        ],
        actions: [
          {
            type: 'prompt',
            content: 'Trace the issue through the codebase, identifying all related code paths',
            description: 'Trace issue',
          },
        ],
        priority: 7,
      },
    ],

    refactoring: [
      {
        id: 'refactor-code',
        name: {
          'en': 'Refactor Code',
          'zh-CN': '重构代码',
        },
        description: {
          'en': 'Refactor selected code for better quality',
          'zh-CN': '重构选中代码以提高质量',
        },
        category: 'refactoring',
        triggers: [
          { type: 'command', value: '/refactor', description: 'Refactor code' },
        ],
        actions: [
          {
            type: 'prompt',
            content: 'Refactor the selected code to improve readability, maintainability, and performance',
            description: 'Refactor code',
          },
        ],
        priority: 8,
      },
      {
        id: 'extract-function',
        name: {
          'en': 'Extract Function',
          'zh-CN': '提取函数',
        },
        description: {
          'en': 'Extract selected code into a reusable function',
          'zh-CN': '将选中代码提取为可复用函数',
        },
        category: 'refactoring',
        triggers: [
          { type: 'command', value: '/extract', description: 'Extract function' },
        ],
        actions: [
          {
            type: 'prompt',
            content: 'Extract the selected code into a well-named, reusable function',
            description: 'Extract function',
          },
        ],
        priority: 7,
      },
    ],

    documentation: [
      {
        id: 'generate-docs',
        name: {
          'en': 'Generate Docs',
          'zh-CN': '生成文档',
        },
        description: {
          'en': 'Generate documentation for code',
          'zh-CN': '为代码生成文档',
        },
        category: 'documentation',
        triggers: [
          { type: 'command', value: '/docs', description: 'Generate docs' },
        ],
        actions: [
          {
            type: 'prompt',
            content: 'Generate comprehensive documentation for the selected code',
            description: 'Generate docs',
          },
        ],
        priority: 7,
      },
      {
        id: 'add-comments',
        name: {
          'en': 'Add Comments',
          'zh-CN': '添加注释',
        },
        description: {
          'en': 'Add inline comments to explain code',
          'zh-CN': '添加行内注释解释代码',
        },
        category: 'documentation',
        triggers: [
          { type: 'command', value: '/comment', description: 'Add comments' },
        ],
        actions: [
          {
            type: 'prompt',
            content: 'Add clear, helpful inline comments to explain the code logic',
            description: 'Add comments',
          },
        ],
        priority: 6,
      },
    ],

    deployment: [
      {
        id: 'deploy-preview',
        name: {
          'en': 'Deploy Preview',
          'zh-CN': '部署预览',
        },
        description: {
          'en': 'Deploy a preview version of the application',
          'zh-CN': '部署应用程序的预览版本',
        },
        category: 'deployment',
        triggers: [
          { type: 'command', value: '/deploy-preview', description: 'Deploy preview' },
        ],
        actions: [
          {
            type: 'bash',
            content: getDeployCommand(analysis, 'preview'),
            description: 'Deploy preview',
          },
        ],
        priority: 7,
      },
      {
        id: 'build-project',
        name: {
          'en': 'Build Project',
          'zh-CN': '构建项目',
        },
        description: {
          'en': 'Build the project for production',
          'zh-CN': '为生产环境构建项目',
        },
        category: 'deployment',
        triggers: [
          { type: 'command', value: '/build', description: 'Build project' },
        ],
        actions: [
          {
            type: 'bash',
            content: getBuildCommand(analysis),
            description: 'Build project',
          },
        ],
        priority: 8,
      },
    ],

    security: [
      {
        id: 'security-scan',
        name: {
          'en': 'Security Scan',
          'zh-CN': '安全扫描',
        },
        description: {
          'en': 'Scan code for security vulnerabilities',
          'zh-CN': '扫描代码中的安全漏洞',
        },
        category: 'security',
        triggers: [
          { type: 'command', value: '/security', description: 'Security scan' },
        ],
        actions: [
          {
            type: 'prompt',
            content: 'Analyze the code for security vulnerabilities following OWASP guidelines',
            description: 'Security scan',
          },
        ],
        priority: 8,
      },
    ],

    performance: [
      {
        id: 'performance-analyze',
        name: {
          'en': 'Performance Analysis',
          'zh-CN': '性能分析',
        },
        description: {
          'en': 'Analyze code for performance issues',
          'zh-CN': '分析代码中的性能问题',
        },
        category: 'performance',
        triggers: [
          { type: 'command', value: '/perf', description: 'Performance analysis' },
        ],
        actions: [
          {
            type: 'prompt',
            content: 'Analyze the code for performance bottlenecks and suggest optimizations',
            description: 'Performance analysis',
          },
        ],
        priority: 7,
      },
    ],
  }

  return templates[category] || []
}

/**
 * Get test command based on project analysis
 */
function getTestCommand(analysis: any): string {
  const pm = analysis.packageManager || 'npm'

  // Check for testing framework
  const hasVitest = analysis.dependencies?.direct.some((d: any) => d.name === 'vitest')
  const hasJest = analysis.dependencies?.direct.some((d: any) => d.name === 'jest')

  if (hasVitest) {
    return pm === 'npm' ? 'npm run test' : `${pm} test`
  }
  if (hasJest) {
    return pm === 'npm' ? 'npm test' : `${pm} test`
  }

  // Default based on package manager
  switch (pm) {
    case 'pnpm':
      return 'pnpm test'
    case 'yarn':
      return 'yarn test'
    case 'bun':
      return 'bun test'
    case 'cargo':
      return 'cargo test'
    case 'go':
      return 'go test ./...'
    case 'pip':
    case 'poetry':
      return 'pytest'
    default:
      return 'npm test'
  }
}

/**
 * Get build command based on project analysis
 */
function getBuildCommand(analysis: any): string {
  const pm = analysis.packageManager || 'npm'
  const buildSystem = analysis.buildSystem

  switch (buildSystem) {
    case 'vite':
      return pm === 'npm' ? 'npm run build' : `${pm} build`
    case 'next':
      return pm === 'npm' ? 'npm run build' : `${pm} build`
    case 'webpack':
      return pm === 'npm' ? 'npm run build' : `${pm} build`
    case 'tsc':
      return 'tsc'
    default:
      switch (pm) {
        case 'cargo':
          return 'cargo build --release'
        case 'go':
          return 'go build'
        default:
          return pm === 'npm' ? 'npm run build' : `${pm} build`
      }
  }
}

/**
 * Get deploy command based on project analysis
 */
function getDeployCommand(analysis: any, type: 'preview' | 'production'): string {
  // Check for deployment platform
  const hasVercel = analysis.configFiles.some((f: string) => f.includes('vercel.json'))
  const hasNetlify = analysis.configFiles.some((f: string) => f.includes('netlify.toml'))
  const hasDocker = analysis.configFiles.some((f: string) => f.toLowerCase().includes('dockerfile'))

  if (hasVercel) {
    return type === 'preview' ? 'vercel' : 'vercel --prod'
  }
  if (hasNetlify) {
    return type === 'preview' ? 'netlify deploy' : 'netlify deploy --prod'
  }
  if (hasDocker) {
    return 'docker build -t app . && docker run -p 3000:3000 app'
  }

  return 'echo "No deployment configuration found"'
}
