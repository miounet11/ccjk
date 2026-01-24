/**
 * CCJK Skills Installation Command
 *
 * Automatically detects project type and installs relevant skills from templates
 * Integrates with cloud recommendations and local fallback
 *
 * @module commands/ccjk-skills
 */

import type { SupportedLang } from '../constants'
import type { ProjectAnalysis } from '../analyzers'
import type { CcjkSkill, SkillCategory, SkillInstallResult } from '../skills/types'
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import ansis from 'ansis'
import consola from 'consola'
import inquirer from 'inquirer'
import { i18n } from '../i18n'
import { analyzeProject } from '../analyzers'
import { createCompleteCloudClient, type FallbackCloudClient } from '../cloud-client'
import { getSkillParser } from '../plugins-v2'

// ============================================================================
// Types
// ============================================================================

export interface CcjkSkillsOptions {
  /** Language for UI */
  lang?: SupportedLang
  /** Interactive mode (default: true) */
  interactive?: boolean
  /** Skill category filter */
  category?: SkillCategory
  /** Tags to filter skills */
  tags?: string[]
  /** Skills to exclude */
  exclude?: string[]
  /** Dry run mode (don't install) */
  dryRun?: boolean
  /** Output as JSON */
  json?: boolean
  /** Force installation */
  force?: boolean
  /** Target directory */
  targetDir?: string
}

interface RecommendedSkill {
  id: string
  name: Record<SupportedLang, string>
  description: Record<SupportedLang, string>
  category: SkillCategory
  priority: number
  source: 'cloud' | 'local'
  tags: string[]
  agents?: string[]
  templatePath: string
}

// ============================================================================
// Main Command
// ============================================================================

/**
 * Main ccjk:skills command
 */
export async function ccjkSkills(options: CcjkSkillsOptions = {}): Promise<void> {
  const logger = consola.withTag('ccjk:skills')
  const startTime = Date.now()

  try {
    // Parse options
    const opts: Required<CcjkSkillsOptions> = {
      lang: options.lang || 'en',
      interactive: options.interactive ?? true,
      category: options.category,
      tags: options.tags || [],
      exclude: options.exclude || [],
      dryRun: options.dryRun ?? false,
      json: options.json ?? false,
      force: options.force ?? false,
      targetDir: options.targetDir || process.cwd(),
    }

    // JSON mode output
    if (opts.json) {
      console.log(JSON.stringify({ status: 'starting', options: opts }))
    }

    // Display header
    if (!opts.json) {
      console.log('')
      console.log(ansis.bold.cyan('━'.repeat(60)))
      console.log(ansis.bold.cyan(`  ${i18n.t('ccjk-skills:title')}`))
      console.log(ansis.bold.cyan('━'.repeat(60)))
      console.log('')
    }

    // Step 1: Analyze project
    if (!opts.json) {
      console.log(ansis.bold(`  ${i18n.t('ccjk-skills:analyzing')}`))
    }

    const analysis = await analyzeProject(opts.targetDir, {
      analyzeTransitiveDeps: true,
      maxFilesToScan: 5000,
    })

    if (!opts.json) {
      displayProjectInfo(analysis, opts.lang)
    }

    // Step 2: Get skill recommendations
    if (!opts.json) {
      console.log('')
      console.log(ansis.bold(`  ${i18n.t('ccjk-skills:recommending')}`))
    }

    const recommendedSkills = await getRecommendedSkills(analysis, opts)

    if (recommendedSkills.length === 0) {
      if (!opts.json) {
        console.log(ansis.yellow(`  ${i18n.t('ccjk-skills:noSkillsFound')}`))
        console.log('')
        console.log(ansis.dim(`  ${i18n.t('ccjk-skills:tryDifferentProject')}`))
      } else {
        console.log(JSON.stringify({
          status: 'completed',
          skillsFound: 0,
          skillsInstalled: 0,
          duration: Date.now() - startTime,
        }))
      }
      return
    }

    // Step 3: Filter and select skills
    const selectedSkills = await selectSkills(recommendedSkills, opts)

    if (selectedSkills.length === 0) {
      if (!opts.json) {
        console.log(ansis.yellow(`  ${i18n.t('ccjk-skills:noSkillsSelected')}`))
      } else {
        console.log(JSON.stringify({
          status: 'completed',
          skillsFound: recommendedSkills.length,
          skillsSelected: 0,
          duration: Date.now() - startTime,
        }))
      }
      return
    }

    // Step 4: Install skills
    if (!opts.json) {
      console.log('')
      console.log(ansis.bold(`  ${i18n.t('ccjk-skills:installing')}`))
    }

    const results = await installSkills(selectedSkills, opts)

    // Step 5: Display results
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    if (!opts.json) {
      displayInstallationResults(results, opts.lang)

      if (successful.length > 0) {
        console.log('')
        console.log(ansis.bold(ansis.green(`  ✓ ${i18n.t('ccjk-skills:installedCount', { count: successful.length })}`)))
        console.log('')
        console.log(ansis.bold(`  ${i18n.t('ccjk-skills:nextSteps')}:`))
        console.log(ansis.dim(`    • ${i18n.t('ccjk-skills:useMcpCommand')}`))
        console.log(ansis.dim(`    • ${i18n.t('ccjk-skills:useAgentsCommand')}`))
        console.log(ansis.dim(`    • ${i18n.t('ccjk-skills:useSetupCommand')}`))
      }
    } else {
      console.log(JSON.stringify({
        status: 'completed',
        skillsFound: recommendedSkills.length,
        skillsSelected: selectedSkills.length,
        skillsInstalled: successful.length,
        skillsFailed: failed.length,
        results,
        duration: Date.now() - startTime,
      }))
    }

    logger.success(`Completed in ${Date.now() - startTime}ms`)
  } catch (error) {
    logger.error('Failed to install skills:', error)

    if (options.json) {
      console.log(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }))
    } else {
      console.error(ansis.red(`\n  ${i18n.t('ccjk-skills:error')}: ${error instanceof Error ? error.message : String(error)}`))
    }

    throw error
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Display project analysis information
 */
function displayProjectInfo(analysis: ProjectAnalysis, lang: SupportedLang): void {
  const pm = analysis.packageManager || 'unknown'
  const frameworks = analysis.frameworks.map(f => f.name).join(', ')
  const languages = analysis.languages
    .filter(l => l.confidence > 0.5)
    .map(l => l.language)
    .join(', ')

  console.log(ansis.dim(`    ${i18n.t('ccjk-skills:detected')}: ${languages}`))
  if (frameworks) {
    console.log(ansis.dim(`    ${i18n.t('ccjk-skills:frameworks')}: ${frameworks}`))
  }
  console.log(ansis.dim(`    ${i18n.t('ccjk-skills:packageManager')}: ${pm}`))
  if (analysis.buildSystem) {
    console.log(ansis.dim(`    ${i18n.t('ccjk-skills:buildSystem')}: ${analysis.buildSystem}`))
  }
}

/**
 * Get recommended skills for the project
 */
async function getRecommendedSkills(
  analysis: ProjectAnalysis,
  options: Required<CcjkSkillsOptions>,
): Promise<RecommendedSkill[]> {
  const logger = consola.withTag('recommender')
  const recommendations: RecommendedSkill[] = []

  try {
    // Create cloud client with fallback
    const cloudClient = createCompleteCloudClient({
      timeout: 5000,
      retries: 2,
    }) as FallbackCloudClient

    // Prepare request
    const request = {
      projectType: analysis.projectType,
      languages: analysis.languages.map(l => ({
        language: l.language,
        confidence: l.confidence,
        fileCount: l.fileCount,
      })),
      frameworks: analysis.frameworks.map(f => ({
        name: f.name,
        version: f.version,
        confidence: f.confidence,
      })),
      packageManager: analysis.packageManager,
      buildSystem: analysis.buildSystem,
      dependencies: analysis.dependencies?.direct.map(d => ({
        name: d.name,
        version: d.version,
        type: d.type,
        isDev: d.isDev,
      })),
      configFiles: analysis.configFiles,
      metadata: {
        confidence: analysis.metadata.confidence,
        filesScanned: analysis.metadata.filesScanned,
      },
    }

    // Get cloud recommendations
    logger.info('Fetching cloud recommendations...')
    const cloudResponse = await cloudClient.analyzeProject(request)

    if (cloudResponse.recommendations) {
      for (const rec of cloudResponse.recommendations) {
        if (rec.type === 'skill') {
          const skill = await cloudClient.getTemplate(rec.id, options.lang)
          if (skill) {
            recommendations.push({
              id: rec.id,
              name: skill.name,
              description: skill.description,
              category: rec.category || 'custom',
              priority: rec.relevanceScore * 10,
              source: 'cloud',
              tags: rec.tags || [],
              agents: rec.agents,
              templatePath: skill.contentPath || rec.id,
            })
          }
        }
      }
    }
  } catch (error) {
    logger.warn('Cloud recommendations failed, using local fallback:', error)
  }

  // Add local recommendations
  const localSkills = await getLocalRecommendations(analysis, options)
  recommendations.push(...localSkills)

  // Remove duplicates (cloud takes precedence)
  const seen = new Set<string>()
  const unique: RecommendedSkill[] = []

  for (const skill of recommendations) {
    if (!seen.has(skill.id)) {
      seen.add(skill.id)
      unique.push(skill)
    }
  }

  // Filter by options
  let filtered = unique

  if (options.category) {
    filtered = filtered.filter(s => s.category === options.category)
  }

  if (options.tags.length > 0) {
    filtered = filtered.filter(s =>
      options.tags.some(tag => s.tags.includes(tag))
    )
  }

  if (options.exclude.length > 0) {
    filtered = filtered.filter(s =>
      !options.exclude.includes(s.id)
    )
  }

  // Sort by priority
  filtered.sort((a, b) => b.priority - a.priority)

  return filtered
}

/**
 * Get local skill recommendations based on project analysis
 */
async function getLocalRecommendations(
  analysis: ProjectAnalysis,
  _options: Required<CcjkSkillsOptions>,
): Promise<RecommendedSkill[]> {
  const skills: RecommendedSkill[] = []
  const langMap = analysis.languages.reduce((acc, l) => {
    acc[l.language] = l.confidence
    return acc
  }, {} as Record<string, number>)

  const fwMap = analysis.frameworks.reduce((acc, f) => {
    acc[f.name.toLowerCase()] = f.confidence
    return acc
  }, {} as Record<string, number>)

  // TypeScript
  if (langMap.typescript > 0.5) {
    skills.push({
      id: 'ts-best-practices',
      name: { en: 'TypeScript Best Practices', 'zh-CN': 'TypeScript 最佳实践' },
      description: {
        en: 'TypeScript 5.3+ best practices and patterns for type-safe development',
        'zh-CN': 'TypeScript 5.3+ 最佳实践和类型安全开发模式'
      },
      category: 'dev',
      priority: 8,
      source: 'local',
      tags: ['typescript', 'types', 'patterns'],
      templatePath: 'ts-best-practices.md',
    })
  }

  // React
  if (fwMap.react > 0.5) {
    skills.push({
      id: 'react-patterns',
      name: { en: 'React Patterns', 'zh-CN': 'React 设计模式' },
      description: {
        en: 'React component design patterns and optimization techniques',
        'zh-CN': 'React 组件设计模式和优化技巧'
      },
      category: 'dev',
      priority: 7,
      source: 'local',
      tags: ['react', 'frontend', 'patterns'],
      templatePath: 'react-patterns.md',
    })
  }

  // Next.js
  if (fwMap.next > 0.5) {
    skills.push({
      id: 'nextjs-optimization',
      name: { en: 'Next.js Optimization', 'zh-CN': 'Next.js 性能优化' },
      description: {
        en: 'Next.js performance optimization and best practices',
        'zh-CN': 'Next.js 性能优化和最佳实践'
      },
      category: 'dev',
      priority: 7,
      source: 'local',
      tags: ['nextjs', 'performance', 'optimization'],
      templatePath: 'nextjs-optimization.md',
    })
  }

  // Python
  if (langMap.python > 0.5) {
    skills.push({
      id: 'python-pep8',
      name: { en: 'Python PEP 8', 'zh-CN': 'Python PEP 8' },
      description: {
        en: 'Python coding standards and best practices following PEP 8',
        'zh-CN': '遵循 PEP 8 的 Python 编码标准和最佳实践'
      },
      category: 'dev',
      priority: 7,
      source: 'local',
      tags: ['python', 'pep8', 'standards'],
      templatePath: 'python-pep8.md',
    })
  }

  // Testing
  if (analysis.configFiles.some(f => f.includes('test'))) {
    skills.push({
      id: 'testing-best-practices',
      name: { en: 'Testing Best Practices', 'zh-CN': '测试最佳实践' },
      description: {
        en: 'Testing-driven development workflows and best practices',
        'zh-CN': '测试驱动开发工作流和最佳实践'
      },
      category: 'testing',
      priority: 6,
      source: 'local',
      tags: ['testing', 'tdd', 'quality'],
      templatePath: 'testing-best-practices.md',
    })
  }

  // Git
  if (analysis.configFiles.includes('.git')) {
    skills.push({
      id: 'git-workflow',
      name: { en: 'Git Workflow', 'zh-CN': 'Git 工作流' },
      description: {
        en: 'Git branch management strategies and best practices',
        'zh-CN': 'Git 分支管理策略和最佳实践'
      },
      category: 'git',
      priority: 5,
      source: 'local',
      tags: ['git', 'workflow', 'vcs'],
      templatePath: 'git-workflow.md',
    })
  }

  return skills
}

/**
 * Select skills interactively or automatically
 */
async function selectSkills(
  recommendations: RecommendedSkill[],
  options: Required<CcjkSkillsOptions>,
): Promise<RecommendedSkill[]> {
  if (!options.interactive) {
    // Auto mode: select all skills with priority >= 5
    return recommendations.filter(s => s.priority >= 5)
  }

  // Interactive mode
  console.log('')
  console.log(ansis.bold(ansis.cyan(`  ${i18n.t('ccjk-skills:recommendedSkills', { count: recommendations.length })}`)))
  console.log('')

  const choices = recommendations.map(skill => ({
    name: `${getCategoryIcon(skill.category)} ${skill.name[options.lang]} ${ansis.dim(`(${skill.category})`)}`,
    value: skill,
    checked: skill.priority >= 7, // Auto-check high priority skills
  }))

  const { selected } = await inquirer.prompt<{ selected: RecommendedSkill[] }>([
    {
      type: 'checkbox',
      name: 'selected',
      message: i18n.t('ccjk-skills:selectSkills'),
      choices,
      pageSize: 10,
    },
  ])

  return selected
}

/**
 * Install selected skills
 */
async function installSkills(
  skills: RecommendedSkill[],
  options: Required<CcjkSkillsOptions>,
): Promise<SkillInstallResult[]> {
  const results: SkillInstallResult[] = []
  const skillsDir = join(process.env.HOME || homedir(), '.ccjk', 'skills')
  const parser = getSkillParser()

  // Ensure skills directory exists
  if (!await fileExists(skillsDir)) {
    await fs.mkdir(skillsDir, { recursive: true })
  }

  for (const skill of skills) {
    try {
      if (!options.json) {
        process.stdout.write(`   ${ansis.dim('→')} ${skill.name[options.lang]}... `)
      }

      if (options.dryRun) {
        if (!options.json) {
          console.log(ansis.yellow('DRY RUN'))
        }
        results.push({
          skillId: skill.id,
          success: true,
          path: join(skillsDir, skill.id, 'SKILL.md'),
        })
        continue
      }

      // Load template content
      const templateContent = await loadSkillTemplate(skill.templatePath)
      if (!templateContent) {
        throw new Error(`Template not found: ${skill.templatePath}`)
      }

      // Create skill directory
      const skillDir = join(skillsDir, skill.id)
      if (!await fileExists(skillDir)) {
        await fs.mkdir(skillDir, { recursive: true })
      }

      // Generate SKILL.md file
      const skillMdPath = join(skillDir, 'SKILL.md')
      const skillMdContent = generateSkillMdFromTemplate(skill, templateContent)
      await fs.writeFile(skillMdPath, skillMdContent, 'utf-8')

      // Validate the generated file
      try {
        const parsed = parser.parse(skillMdPath)
        if (!parsed.title || !parsed.description) {
          throw new Error('Invalid SKILL.md format')
        }
      } catch (error) {
        throw new Error(`Generated SKILL.md is invalid: ${error instanceof Error ? error.message : String(error)}`)
      }

      if (!options.json) {
        console.log(ansis.green('✓'))
      }

      results.push({
        skillId: skill.id,
        success: true,
        path: skillMdPath,
      })
    } catch (error) {
      if (!options.json) {
        console.log(ansis.red('✗'))
        if (!(error instanceof Error && error.message.includes('DRY RUN'))) {
          console.log(ansis.red(`     ${error instanceof Error ? error.message : String(error)}`))
        }
      }
      results.push({
        skillId: skill.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return results
}

/**
 * Load skill template from file
 */
async function loadSkillTemplate(templatePath: string): Promise<string | null> {
  try {
    // Try local templates first
    const localPath = join(process.cwd(), 'templates', 'skills', templatePath)
    if (await fileExists(localPath)) {
      return await fs.readFile(localPath, 'utf-8')
    }

    // Try package templates
    const packagePath = join(__dirname, '..', '..', 'templates', 'skills', templatePath)
    if (await fileExists(packagePath)) {
      return await fs.readFile(packagePath, 'utf-8')
    }

    return null
  } catch {
    return null
  }
}


/**
 * Generate SKILL.md from template content
 */
function generateSkillMdFromTemplate(skill: RecommendedSkill, templateContent: string): string {
  // The template content is already in SKILL.md format
  // Just return it directly
  return templateContent
}

/**
 * Display installation results
 */
function displayInstallationResults(results: SkillInstallResult[], lang: SupportedLang): void {
  console.log('')

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  if (successful.length > 0) {
    console.log(ansis.bold(ansis.green(`  ✓ ${i18n.t('ccjk-skills:installedCount', { count: successful.length })}`)))
    for (const result of successful) {
      if (result.path) {
        console.log(ansis.dim(`    ${result.path}`))
      }
    }
  }

  if (failed.length > 0) {
    console.log('')
    console.log(ansis.bold(ansis.red(`  ✗ ${i18n.t('ccjk-skills:failedCount', { count: failed.length })}`)))
    for (const result of failed) {
      console.log(ansis.red(`    ${result.skillId}: ${result.error}`))
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Get category icon
 */
function getCategoryIcon(category: SkillCategory): string {
  const icons: Record<SkillCategory, string> = {
    git: '🔀',
    dev: '💻',
    testing: '🧪',
    docs: '📚',
    review: '👀',
    seo: '🔍',
    devops: '🚀',
    custom: '⚙️',
  }
  return icons[category] || '📦'
}