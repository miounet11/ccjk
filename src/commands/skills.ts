/**
 * CCJK Skills Command
 *
 * Provides CLI interface for managing CCJK skills - reusable AI workflows
 * that can be triggered via commands or auto-activated based on context.
 *
 * @module commands/skills
 */

import type { SupportedLang } from '../constants.js'
import type { CcjkSkill, SkillCategory } from '../skills/types.js'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { i18n } from '../i18n/index.js'
import {
  addSkill,
  createBatchSkills,
  getAllSkills,
  getBatchCategories,
  getSkill,
  removeSkill,
  searchSkills,
  setSkillEnabled,
} from '../skills/index.js'

// ============================================================================
// Types
// ============================================================================

export interface SkillsOptions {
  /** Language for UI */
  lang?: SupportedLang
  /** Category filter */
  category?: SkillCategory
  /** Show disabled skills */
  showDisabled?: boolean
  /** Output format */
  format?: 'table' | 'json' | 'list'
}

export interface SkillRunOptions extends SkillsOptions {
  /** Arguments to pass to skill */
  args?: string
}

export interface SkillCreateOptions extends SkillsOptions {
  /** Skill category */
  category?: SkillCategory
  /** Skill triggers */
  triggers?: string[]
  /** Batch creation mode */
  batch?: boolean
  /** Language for batch skills */
  batchLang?: string
  /** Enable SEO skills */
  seo?: boolean
  /** Enable DevOps skills */
  devops?: boolean
}

// ============================================================================
// Main Commands
// ============================================================================

/**
 * List all available skills
 */
export async function listSkills(options: SkillsOptions = {}): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ${i18n.t('skills:title.list')}`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  try {
    const skills = searchSkills({
      category: options.category,
      enabled: options.showDisabled ? undefined : true,
    })

    if (skills.length === 0) {
      console.log(ansis.yellow(`  ${i18n.t('skills:message.noSkills')}`))
      console.log('')
      console.log(ansis.dim(`  ${i18n.t('skills:hint.createSkill')}`))
      console.log(ansis.dim(`    ccjk skills create <name>`))
      console.log('')
      return
    }

    // Group by category
    const byCategory = new Map<SkillCategory, CcjkSkill[]>()
    for (const skill of skills) {
      const categorySkills = byCategory.get(skill.category) || []
      categorySkills.push(skill)
      byCategory.set(skill.category, categorySkills)
    }

    // Display by category
    for (const [category, categorySkills] of byCategory) {
      console.log(ansis.bold.green(`  ${getCategoryIcon(category)} ${i18n.t(`skills:category.${category}`)}`))
      console.log('')

      for (const skill of categorySkills) {
        const statusIcon = skill.enabled ? ansis.green('✓') : ansis.dim('○')
        const name = skill.name[options.lang || 'en']
        const description = skill.description[options.lang || 'en']
        const triggers = skill.triggers.map(t => ansis.green(t)).join(', ')

        console.log(`  ${statusIcon} ${ansis.bold(name)} ${ansis.dim(`(${skill.id})`)}`)
        console.log(`    ${ansis.dim(description)}`)
        console.log(`    ${ansis.dim(i18n.t('skills:label.triggers'))}: ${triggers}`)

        if (skill.tags && skill.tags.length > 0) {
          const tags = skill.tags.map(tag => ansis.bgGray.white(` ${tag} `)).join(' ')
          console.log(`    ${tags}`)
        }

        console.log('')
      }
    }

    console.log(ansis.dim(`  ${i18n.t('skills:message.totalSkills', { count: skills.length })}`))
    console.log('')
  }
  catch (error) {
    console.error(ansis.red(`\n  ${i18n.t('skills:error.listFailed')}: ${error}`))
    throw error
  }
}

/**
 * Run a skill
 */
export async function runSkill(skillName: string, options: SkillRunOptions = {}): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ${i18n.t('skills:title.run')}`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  try {
    // Find skill by ID or trigger
    let skill = getSkill(skillName)

    if (!skill) {
      // Try to find by trigger
      const allSkills = getAllSkills()
      skill = allSkills.find(s => s.triggers.includes(skillName) || s.triggers.includes(`/${skillName}`))
    }

    if (!skill) {
      console.error(ansis.red(`  ${i18n.t('skills:error.skillNotFound', { name: skillName })}`))
      console.log('')
      console.log(ansis.dim(`  ${i18n.t('skills:hint.listSkills')}`))
      console.log(ansis.dim(`    ccjk skills list`))
      console.log('')
      return
    }

    if (!skill.enabled) {
      console.warn(ansis.yellow(`  ${i18n.t('skills:warning.skillDisabled', { name: skill.name[options.lang || 'en'] })}`))
      console.log('')
      console.log(ansis.dim(`  ${i18n.t('skills:hint.enableSkill')}`))
      console.log(ansis.dim(`    ccjk skills enable ${skill.id}`))
      console.log('')
      return
    }

    // Display skill info
    console.log(ansis.bold(`  ${skill.name[options.lang || 'en']}`))
    console.log(ansis.dim(`  ${skill.description[options.lang || 'en']}`))
    console.log('')

    // Display skill template
    console.log(ansis.bold.green(`  ${i18n.t('skills:label.template')}:`))
    console.log('')
    console.log(ansis.dim('  ─'.repeat(30)))
    console.log(skill.template.split('\n').map(line => `  ${line}`).join('\n'))
    console.log(ansis.dim('  ─'.repeat(30)))
    console.log('')

    console.log(ansis.green(`  ✓ ${i18n.t('skills:message.skillExecuted')}`))
    console.log('')
    console.log(ansis.dim(`  ${i18n.t('skills:hint.copyTemplate')}`))
    console.log('')
  }
  catch (error) {
    console.error(ansis.red(`\n  ${i18n.t('skills:error.runFailed')}: ${error}`))
    throw error
  }
}

/**
 * Show skill information
 */
export async function showSkillInfo(skillName: string, options: SkillsOptions = {}): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ${i18n.t('skills:title.info')}`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  try {
    const skill = getSkill(skillName)

    if (!skill) {
      console.error(ansis.red(`  ${i18n.t('skills:error.skillNotFound', { name: skillName })}`))
      console.log('')
      return
    }

    const name = skill.name[options.lang || 'en']
    const description = skill.description[options.lang || 'en']
    const statusBadge = skill.enabled ? ansis.bgGreen.white(' ENABLED ') : ansis.bgRed.white(' DISABLED ')

    console.log(`${ansis.bold.green(`  ${name}`)} ${statusBadge}`)
    console.log(ansis.dim(`  ${description}`))
    console.log('')

    console.log(ansis.bold(`  ${i18n.t('skills:label.details')}:`))
    console.log(ansis.dim(`    ${i18n.t('skills:label.id')}: ${skill.id}`))
    console.log(ansis.dim(`    ${i18n.t('skills:label.version')}: ${skill.version}`))
    console.log(ansis.dim(`    ${i18n.t('skills:label.category')}: ${i18n.t(`skills:category.${skill.category}`)}`))

    if (skill.author) {
      console.log(ansis.dim(`    ${i18n.t('skills:label.author')}: ${skill.author}`))
    }

    console.log('')
    console.log(ansis.bold(`  ${i18n.t('skills:label.triggers')}:`))
    for (const trigger of skill.triggers) {
      console.log(ansis.green(`    ${trigger}`))
    }

    if (skill.tags && skill.tags.length > 0) {
      console.log('')
      console.log(ansis.bold(`  ${i18n.t('skills:label.tags')}:`))
      const tags = skill.tags.map(tag => ansis.bgGray.white(` ${tag} `)).join(' ')
      console.log(`    ${tags}`)
    }

    if (skill.agents && skill.agents.length > 0) {
      console.log('')
      console.log(ansis.bold(`  ${i18n.t('skills:label.agents')}:`))
      for (const agent of skill.agents) {
        console.log(ansis.dim(`    - ${agent}`))
      }
    }

    console.log('')
    console.log(ansis.bold(`  ${i18n.t('skills:label.template')}:`))
    console.log(ansis.dim(`    ${skill.template.length} ${i18n.t('skills:label.characters')}`))
    console.log('')
  }
  catch (error) {
    console.error(ansis.red(`\n  ${i18n.t('skills:error.infoFailed')}: ${error}`))
    throw error
  }
}

/**
 * Create a new skill
 */
export async function createSkill(skillName: string, options: SkillCreateOptions = {}): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ${i18n.t('skills:title.create')}`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  try {
    // Check if batch mode
    if (options.batch) {
      await createBatchSkillsInteractive(options)
      return
    }

    // Check if skill already exists
    const existing = getSkill(skillName)
    if (existing) {
      console.error(ansis.red(`  ${i18n.t('skills:error.skillExists', { name: skillName })}`))
      console.log('')
      return
    }

    // Interactive prompts
    const answers = await inquirer.prompt<{
      nameEn: string
      nameZh: string
      descriptionEn: string
      descriptionZh: string
      category: SkillCategory
      triggers: string
      template: string
    }>([
      {
        type: 'input',
        name: 'nameEn',
        message: i18n.t('skills:prompt.nameEn'),
        default: skillName,
        validate: (input: string) => input.length > 0 || i18n.t('skills:error.nameRequired'),
      },
      {
        type: 'input',
        name: 'nameZh',
        message: i18n.t('skills:prompt.nameZh'),
        default: skillName,
      },
      {
        type: 'input',
        name: 'descriptionEn',
        message: i18n.t('skills:prompt.descriptionEn'),
        validate: (input: string) => input.length > 0 || i18n.t('skills:error.descriptionRequired'),
      },
      {
        type: 'input',
        name: 'descriptionZh',
        message: i18n.t('skills:prompt.descriptionZh'),
      },
      {
        type: 'list',
        name: 'category',
        message: i18n.t('skills:prompt.category'),
        choices: [
          { name: i18n.t('skills:category.git'), value: 'git' },
          { name: i18n.t('skills:category.dev'), value: 'dev' },
          { name: i18n.t('skills:category.testing'), value: 'testing' },
          { name: i18n.t('skills:category.docs'), value: 'docs' },
          { name: i18n.t('skills:category.review'), value: 'review' },
          { name: i18n.t('skills:category.seo'), value: 'seo' },
          { name: i18n.t('skills:category.devops'), value: 'devops' },
          { name: i18n.t('skills:category.custom'), value: 'custom' },
        ],
        default: options.category || 'custom',
      },
      {
        type: 'input',
        name: 'triggers',
        message: i18n.t('skills:prompt.triggers'),
        default: `/${skillName}`,
        validate: (input: string) => input.length > 0 || i18n.t('skills:error.triggersRequired'),
      },
      {
        type: 'editor',
        name: 'template',
        message: i18n.t('skills:prompt.template'),
        default: getDefaultTemplate(skillName, options.lang),
      },
    ])

    // Create skill object
    const skill: CcjkSkill = {
      id: skillName,
      name: {
        'en': answers.nameEn,
        'zh-CN': answers.nameZh || answers.nameEn,
      },
      description: {
        'en': answers.descriptionEn,
        'zh-CN': answers.descriptionZh || answers.descriptionEn,
      },
      category: answers.category,
      triggers: answers.triggers.split(',').map(t => t.trim()),
      template: answers.template,
      enabled: true,
      version: '1.0.0',
    }

    // Save skill
    const result = addSkill(skill)

    if (result.success) {
      console.log(ansis.green(`\n  ✓ ${i18n.t('skills:message.skillCreated', { name: skill.name[options.lang || 'en'] })}`))
      console.log(ansis.dim(`    ${i18n.t('skills:label.path')}: ${result.path}`))
      console.log('')
      console.log(ansis.dim(`  ${i18n.t('skills:hint.runSkill')}`))
      console.log(ansis.dim(`    ccjk skills run ${skillName}`))
      console.log('')
    }
    else {
      console.error(ansis.red(`\n  ${i18n.t('skills:error.createFailed')}: ${result.error}`))
    }
  }
  catch (error) {
    console.error(ansis.red(`\n  ${i18n.t('skills:error.createFailed')}: ${error}`))
    throw error
  }
}

/**
 * Enable a skill
 */
export async function enableSkill(skillName: string, options: SkillsOptions = {}): Promise<void> {
  try {
    const skill = getSkill(skillName)
    if (!skill) {
      console.error(ansis.red(`  ${i18n.t('skills:error.skillNotFound', { name: skillName })}`))
      return
    }

    if (skill.enabled) {
      console.log(ansis.yellow(`  ${i18n.t('skills:message.alreadyEnabled', { name: skill.name[options.lang || 'en'] })}`))
      return
    }

    const success = setSkillEnabled(skillName, true)
    if (success) {
      console.log(ansis.green(`  ✓ ${i18n.t('skills:message.skillEnabled', { name: skill.name[options.lang || 'en'] })}`))
    }
    else {
      console.error(ansis.red(`  ${i18n.t('skills:error.enableFailed')}`))
    }
  }
  catch (error) {
    console.error(ansis.red(`\n  ${i18n.t('skills:error.enableFailed')}: ${error}`))
    throw error
  }
}

/**
 * Disable a skill
 */
export async function disableSkill(skillName: string, options: SkillsOptions = {}): Promise<void> {
  try {
    const skill = getSkill(skillName)
    if (!skill) {
      console.error(ansis.red(`  ${i18n.t('skills:error.skillNotFound', { name: skillName })}`))
      return
    }

    if (!skill.enabled) {
      console.log(ansis.yellow(`  ${i18n.t('skills:message.alreadyDisabled', { name: skill.name[options.lang || 'en'] })}`))
      return
    }

    const success = setSkillEnabled(skillName, false)
    if (success) {
      console.log(ansis.green(`  ✓ ${i18n.t('skills:message.skillDisabled', { name: skill.name[options.lang || 'en'] })}`))
    }
    else {
      console.error(ansis.red(`  ${i18n.t('skills:error.disableFailed')}`))
    }
  }
  catch (error) {
    console.error(ansis.red(`\n  ${i18n.t('skills:error.disableFailed')}: ${error}`))
    throw error
  }
}

/**
 * Delete a skill
 */
export async function deleteSkill(skillName: string, options: SkillsOptions = {}): Promise<void> {
  try {
    const skill = getSkill(skillName)
    if (!skill) {
      console.error(ansis.red(`  ${i18n.t('skills:error.skillNotFound', { name: skillName })}`))
      return
    }

    // Confirm deletion
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('skills:prompt.confirmDelete', { name: skill.name[options.lang || 'en'] }),
      default: false,
    })

    if (!confirm) {
      console.log(ansis.yellow(`  ${i18n.t('skills:message.deleteCancelled')}`))
      return
    }

    const success = removeSkill(skillName)
    if (success) {
      console.log(ansis.green(`  ✓ ${i18n.t('skills:message.skillDeleted', { name: skill.name[options.lang || 'en'] })}`))
    }
    else {
      console.error(ansis.red(`  ${i18n.t('skills:error.deleteFailed')}`))
    }
  }
  catch (error) {
    console.error(ansis.red(`\n  ${i18n.t('skills:error.deleteFailed')}: ${error}`))
    throw error
  }
}

/**
 * Interactive skills menu
 */
export async function skillsMenu(options: SkillsOptions = {}): Promise<void> {
  while (true) {
    console.log('')
    console.log(ansis.bold.cyan('━'.repeat(60)))
    console.log(ansis.bold.cyan(`  ${i18n.t('skills:menu.title')}`))
    console.log(ansis.bold.cyan('━'.repeat(60)))
    console.log('')

    const { action } = await inquirer.prompt<{ action: string }>({
      type: 'list',
      name: 'action',
      message: i18n.t('skills:menu.prompt'),
      choices: [
        { name: `📋 ${i18n.t('skills:menu.list')}`, value: 'list' },
        { name: `▶️  ${i18n.t('skills:menu.run')}`, value: 'run' },
        { name: `ℹ️  ${i18n.t('skills:menu.info')}`, value: 'info' },
        { name: `➕ ${i18n.t('skills:menu.create')}`, value: 'create' },
        { name: `📦 ${i18n.t('skills:menu.batch')}`, value: 'batch' },
        { name: `✅ ${i18n.t('skills:menu.enable')}`, value: 'enable' },
        { name: `❌ ${i18n.t('skills:menu.disable')}`, value: 'disable' },
        { name: `🗑️  ${i18n.t('skills:menu.delete')}`, value: 'delete' },
        new inquirer.Separator(),
        { name: `🔙 ${i18n.t('skills:menu.back')}`, value: 'back' },
      ],
    })

    if (action === 'back') {
      break
    }

    try {
      switch (action) {
        case 'list':
          await listSkills(options)
          break
        case 'run': {
          const { skillName } = await inquirer.prompt<{ skillName: string }>({
            type: 'input',
            name: 'skillName',
            message: i18n.t('skills:prompt.skillName'),
          })
          await runSkill(skillName, options)
          break
        }
        case 'info': {
          const { skillName } = await inquirer.prompt<{ skillName: string }>({
            type: 'input',
            name: 'skillName',
            message: i18n.t('skills:prompt.skillName'),
          })
          await showSkillInfo(skillName, options)
          break
        }
        case 'create': {
          const { skillName } = await inquirer.prompt<{ skillName: string }>({
            type: 'input',
            name: 'skillName',
            message: i18n.t('skills:prompt.newSkillName'),
          })
          await createSkill(skillName, options)
          break
        }
        case 'batch':
          await createBatchSkillsInteractive(options)
          break
        case 'enable': {
          const { skillName } = await inquirer.prompt<{ skillName: string }>({
            type: 'input',
            name: 'skillName',
            message: i18n.t('skills:prompt.skillName'),
          })
          await enableSkill(skillName, options)
          break
        }
        case 'disable': {
          const { skillName } = await inquirer.prompt<{ skillName: string }>({
            type: 'input',
            name: 'skillName',
            message: i18n.t('skills:prompt.skillName'),
          })
          await disableSkill(skillName, options)
          break
        }
        case 'delete': {
          const { skillName } = await inquirer.prompt<{ skillName: string }>({
            type: 'input',
            name: 'skillName',
            message: i18n.t('skills:prompt.skillName'),
          })
          await deleteSkill(skillName, options)
          break
        }
      }
    }
    catch (error) {
      console.error(ansis.red(`\n  ${i18n.t('common.error')}: ${error}`))
    }

    // Pause before showing menu again
    await inquirer.prompt({
      type: 'input',
      name: 'continue',
      message: i18n.t('common.pressEnterToContinue'),
    })
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

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

/**
 * Get default template for new skill
 */
function getDefaultTemplate(skillName: string, lang?: SupportedLang): string {
  const isZh = lang === 'zh-CN'

  if (isZh) {
    return `# ${skillName}

## 技能描述

这是一个自定义技能模板。请描述这个技能的用途和功能。

## 使用场景

- 场景 1
- 场景 2
- 场景 3

## 执行步骤

1. 第一步
2. 第二步
3. 第三步

## 注意事项

- 注意事项 1
- 注意事项 2
`
  }

  return `# ${skillName}

## Skill Description

This is a custom skill template. Please describe the purpose and functionality of this skill.

## Use Cases

- Use case 1
- Use case 2
- Use case 3

## Execution Steps

1. Step 1
2. Step 2
3. Step 3

## Notes

- Note 1
- Note 2
`
}

/**
 * Create batch skills interactively
 */
async function createBatchSkillsInteractive(_options: SkillCreateOptions): Promise<void> {
  console.log(ansis.bold(`  ${i18n.t('skills:batch.title')}`))
  console.log('')

  const categories = getBatchCategories()

  const answers = await inquirer.prompt<{
    categories: string[]
  }>([
    {
      type: 'checkbox',
      name: 'categories',
      message: i18n.t('skills:batch.prompt'),
      choices: categories.map(cat => ({
        name: i18n.t(`skills:batch.${cat}`),
        value: cat,
        checked: false,
      })),
    },
  ])

  if (answers.categories.length === 0) {
    console.log(ansis.yellow(`  ${i18n.t('skills:batch.noneSelected')}`))
    return
  }

  console.log('')
  console.log(ansis.dim(`  ${i18n.t('skills:batch.creating')}...`))
  console.log('')

  const results = createBatchSkills({
    lang: answers.categories.includes('typescript')
      ? 'typescript'
      : answers.categories.includes('python')
        ? 'python'
        : undefined,
    seo: answers.categories.includes('seo'),
    devops: answers.categories.includes('devops'),
  })

  const succeeded = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(ansis.green(`  ✓ ${i18n.t('skills:batch.created', { count: succeeded })}`))
  if (failed > 0) {
    console.log(ansis.red(`  ✗ ${i18n.t('skills:batch.failed', { count: failed })}`))
  }
  console.log('')
}
