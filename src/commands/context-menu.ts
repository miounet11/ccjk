/**
 * Context Management Menu
 *
 * Interactive menu for managing CLAUDE.md context files
 */

import type { ContextFile, ContextProjectInfo, ContextRule } from '../utils/context-manager'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { i18n } from '../i18n'
import {
  detectProjectContext,
  formatFileSize,
  generateContextContent,
  getApplicableRules,
  getContextFiles,
  getContextFileTypeLabel,
  getProjectTypeLabel,
  getRecommendedRules,
  mergeContextContent,
  readContextFile,
  writeContextFile,
} from '../utils/context-manager'

// ============================================================================
// Main Menu
// ============================================================================

/**
 * Show context management menu
 */
export async function showContextMenu(): Promise<void> {
  const lang = i18n.language as 'en' | 'zh-CN'
  const isZh = lang === 'zh-CN'

  console.log(ansis.cyan.bold(`\n📋 ${isZh ? '上下文管理' : 'Context Management'}\n`))

  // Detect project context
  const context = detectProjectContext()
  displayProjectInfo(context, lang)

  // Show menu options
  const { action } = await inquirer.prompt<{ action: string }>([
    {
      type: 'list',
      name: 'action',
      message: isZh ? '选择操作' : 'Select action',
      choices: [
        {
          name: `🔍 ${isZh ? '查看上下文文件' : 'View Context Files'}`,
          value: 'view',
        },
        {
          name: `✨ ${isZh ? '自动生成规则' : 'Auto-generate Rules'}`,
          value: 'generate',
        },
        {
          name: `📝 ${isZh ? '添加规则' : 'Add Rules'}`,
          value: 'add',
        },
        {
          name: `📖 ${isZh ? '查看可用规则' : 'Browse Available Rules'}`,
          value: 'browse',
        },
        {
          name: `🔙 ${isZh ? '返回' : 'Back'}`,
          value: 'back',
        },
      ],
    },
  ])

  switch (action) {
    case 'view':
      await viewContextFiles(lang)
      break
    case 'generate':
      await generateContextRules(context, lang)
      break
    case 'add':
      await addRulesToContext(context, lang)
      break
    case 'browse':
      await browseRules(context, lang)
      break
    case 'back':
      return
  }

  // Show menu again unless user chose to go back
  if (action !== 'back') {
    await showContextMenu()
  }
}

// ============================================================================
// Display Functions
// ============================================================================

/**
 * Display detected project information
 */
function displayProjectInfo(context: ContextProjectInfo, lang: 'en' | 'zh-CN'): void {
  const isZh = lang === 'zh-CN'

  console.log(ansis.dim('─'.repeat(50)))
  console.log(ansis.bold(isZh ? '检测到的项目信息：' : 'Detected Project Info:'))

  const typeLabel = getProjectTypeLabel(context.type, lang)
  console.log(`  ${isZh ? '类型' : 'Type'}: ${ansis.cyan(typeLabel)}`)
  console.log(`  ${isZh ? '语言' : 'Language'}: ${ansis.cyan(context.language)}`)

  if (context.framework) {
    console.log(`  ${isZh ? '框架' : 'Framework'}: ${ansis.cyan(context.framework)}`)
  }

  if (context.packageManager) {
    console.log(`  ${isZh ? '包管理器' : 'Package Manager'}: ${ansis.cyan(context.packageManager)}`)
  }

  const features: string[] = []
  if (context.hasTests)
    features.push(isZh ? '测试' : 'Tests')
  if (context.hasDocker)
    features.push('Docker')
  if (context.hasCi)
    features.push('CI/CD')
  if (context.monorepo)
    features.push('Monorepo')

  if (features.length > 0) {
    console.log(`  ${isZh ? '特性' : 'Features'}: ${ansis.green(features.join(', '))}`)
  }

  console.log(ansis.dim('─'.repeat(50)))
  console.log('')
}

/**
 * Display context file information
 */
function displayContextFile(file: ContextFile, lang: 'en' | 'zh-CN'): void {
  const isZh = lang === 'zh-CN'
  const typeLabel = getContextFileTypeLabel(file.type, lang)
  const statusIcon = file.exists ? ansis.green('✓') : ansis.dim('○')

  console.log(`  ${statusIcon} ${ansis.bold(typeLabel)}`)
  console.log(`     ${ansis.dim(file.path)}`)

  if (file.exists && file.size !== undefined) {
    const sizeStr = formatFileSize(file.size)
    const dateStr = file.lastModified
      ? file.lastModified.toLocaleDateString()
      : isZh ? '未知' : 'Unknown'
    console.log(`     ${ansis.dim(`${sizeStr} | ${isZh ? '修改于' : 'Modified'}: ${dateStr}`)}`)
  }
  else if (!file.exists) {
    console.log(`     ${ansis.dim(isZh ? '(不存在)' : '(not exists)')}`)
  }
}

// ============================================================================
// View Context Files
// ============================================================================

/**
 * View all context files
 */
async function viewContextFiles(lang: 'en' | 'zh-CN'): Promise<void> {
  const isZh = lang === 'zh-CN'
  const files = getContextFiles()

  console.log(ansis.cyan.bold(`\n📁 ${isZh ? '上下文文件' : 'Context Files'}\n`))

  for (const file of files) {
    displayContextFile(file, lang)
    console.log('')
  }

  // Ask if user wants to view content of any file
  const existingFiles = files.filter(f => f.exists)

  if (existingFiles.length > 0) {
    const { viewFile } = await inquirer.prompt<{ viewFile: string }>([
      {
        type: 'list',
        name: 'viewFile',
        message: isZh ? '查看文件内容？' : 'View file content?',
        choices: [
          ...existingFiles.map(f => ({
            name: `${getContextFileTypeLabel(f.type, lang)} - ${f.path}`,
            value: f.path,
          })),
          {
            name: isZh ? '跳过' : 'Skip',
            value: 'skip',
          },
        ],
      },
    ])

    if (viewFile !== 'skip') {
      const content = readContextFile(viewFile)
      if (content) {
        console.log(ansis.dim(`\n${'─'.repeat(50)}`))
        console.log(content)
        console.log(ansis.dim(`${'─'.repeat(50)}\n`))
      }
      else {
        console.log(ansis.yellow(isZh ? '无法读取文件内容' : 'Unable to read file content'))
      }
    }
  }
}

// ============================================================================
// Generate Context Rules
// ============================================================================

/**
 * Auto-generate context rules based on project detection
 */
async function generateContextRules(context: ContextProjectInfo, lang: 'en' | 'zh-CN'): Promise<void> {
  const isZh = lang === 'zh-CN'

  console.log(ansis.cyan.bold(`\n✨ ${isZh ? '自动生成规则' : 'Auto-generate Rules'}\n`))

  // Get recommended rules
  const recommendedIds = getRecommendedRules(context)
  const applicableRules = getApplicableRules(context.type)

  // Let user select rules with recommended ones pre-selected
  const { selectedRules } = await inquirer.prompt<{ selectedRules: string[] }>([
    {
      type: 'checkbox',
      name: 'selectedRules',
      message: isZh ? '选择要应用的规则（推荐规则已预选）' : 'Select rules to apply (recommended rules pre-selected)',
      choices: applicableRules.map(rule => ({
        name: `${recommendedIds.includes(rule.id) ? ansis.green('★') : ' '} ${isZh ? rule.nameZh : rule.name} - ${ansis.dim(isZh ? rule.descriptionZh : rule.description)}`,
        value: rule.id,
        checked: recommendedIds.includes(rule.id),
      })),
    },
  ])

  if (selectedRules.length === 0) {
    console.log(ansis.yellow(isZh ? '未选择任何规则' : 'No rules selected'))
    return
  }

  // Ask where to save
  const { location } = await inquirer.prompt<{ location: 'project' | 'local' | 'global' }>([
    {
      type: 'list',
      name: 'location',
      message: isZh ? '保存位置' : 'Save location',
      choices: [
        {
          name: `${isZh ? '项目根目录' : 'Project root'} (CLAUDE.md)`,
          value: 'project',
        },
        {
          name: `${isZh ? '本地目录' : 'Local directory'} (.claude/CLAUDE.md)`,
          value: 'local',
        },
        {
          name: `${isZh ? '全局目录' : 'Global directory'} (~/.claude/CLAUDE.md)`,
          value: 'global',
        },
      ],
      default: 'project',
    },
  ])

  // Get target file path
  const files = getContextFiles()
  const targetFile = files.find(f => f.type === location)

  if (!targetFile) {
    console.log(ansis.red(isZh ? '无法确定目标路径' : 'Unable to determine target path'))
    return
  }

  // Check if file exists
  if (targetFile.exists) {
    const { overwrite } = await inquirer.prompt<{ overwrite: 'overwrite' | 'merge' | 'cancel' }>([
      {
        type: 'list',
        name: 'overwrite',
        message: isZh ? '文件已存在，如何处理？' : 'File exists, how to proceed?',
        choices: [
          {
            name: isZh ? '合并（添加新规则）' : 'Merge (add new rules)',
            value: 'merge',
          },
          {
            name: isZh ? '覆盖' : 'Overwrite',
            value: 'overwrite',
          },
          {
            name: isZh ? '取消' : 'Cancel',
            value: 'cancel',
          },
        ],
      },
    ])

    if (overwrite === 'cancel') {
      return
    }

    if (overwrite === 'merge') {
      const existingContent = readContextFile(targetFile.path)
      if (existingContent) {
        const mergedContent = mergeContextContent(existingContent, selectedRules, lang)
        const success = await writeContextFile(targetFile.path, mergedContent)

        if (success) {
          console.log(ansis.green(`\n✅ ${isZh ? '规则已合并到' : 'Rules merged to'}: ${targetFile.path}`))
        }
        else {
          console.log(ansis.red(`\n❌ ${isZh ? '写入失败' : 'Write failed'}`))
        }
        return
      }
    }
  }

  // Generate new content
  const content = generateContextContent(context, selectedRules, lang)
  const success = await writeContextFile(targetFile.path, content)

  if (success) {
    console.log(ansis.green(`\n✅ ${isZh ? '已生成' : 'Generated'}: ${targetFile.path}`))
  }
  else {
    console.log(ansis.red(`\n❌ ${isZh ? '写入失败' : 'Write failed'}`))
  }
}

// ============================================================================
// Add Rules to Context
// ============================================================================

/**
 * Add specific rules to context file
 */
async function addRulesToContext(context: ContextProjectInfo, lang: 'en' | 'zh-CN'): Promise<void> {
  const isZh = lang === 'zh-CN'

  console.log(ansis.cyan.bold(`\n📝 ${isZh ? '添加规则' : 'Add Rules'}\n`))

  const applicableRules = getApplicableRules(context.type)

  // Let user select rules
  const { selectedRules } = await inquirer.prompt<{ selectedRules: string[] }>([
    {
      type: 'checkbox',
      name: 'selectedRules',
      message: isZh ? '选择要添加的规则' : 'Select rules to add',
      choices: applicableRules.map(rule => ({
        name: `${isZh ? rule.nameZh : rule.name} - ${ansis.dim(isZh ? rule.descriptionZh : rule.description)}`,
        value: rule.id,
      })),
    },
  ])

  if (selectedRules.length === 0) {
    console.log(ansis.yellow(isZh ? '未选择任何规则' : 'No rules selected'))
    return
  }

  // Ask where to save
  const files = getContextFiles()
  const existingFiles = files.filter(f => f.exists)

  let targetPath: string

  if (existingFiles.length > 0) {
    const { target } = await inquirer.prompt<{ target: string }>([
      {
        type: 'list',
        name: 'target',
        message: isZh ? '添加到哪个文件？' : 'Add to which file?',
        choices: [
          ...existingFiles.map(f => ({
            name: `${getContextFileTypeLabel(f.type, lang)} - ${f.path}`,
            value: f.path,
          })),
          {
            name: isZh ? '创建新文件' : 'Create new file',
            value: 'new',
          },
        ],
      },
    ])

    if (target === 'new') {
      const { location } = await inquirer.prompt<{ location: 'project' | 'local' | 'global' }>([
        {
          type: 'list',
          name: 'location',
          message: isZh ? '保存位置' : 'Save location',
          choices: [
            { name: `${isZh ? '项目根目录' : 'Project root'} (CLAUDE.md)`, value: 'project' },
            { name: `${isZh ? '本地目录' : 'Local directory'} (.claude/CLAUDE.md)`, value: 'local' },
            { name: `${isZh ? '全局目录' : 'Global directory'} (~/.claude/CLAUDE.md)`, value: 'global' },
          ],
        },
      ])
      targetPath = files.find(f => f.type === location)?.path || ''
    }
    else {
      targetPath = target
    }
  }
  else {
    // No existing files, ask where to create
    const { location } = await inquirer.prompt<{ location: 'project' | 'local' | 'global' }>([
      {
        type: 'list',
        name: 'location',
        message: isZh ? '保存位置' : 'Save location',
        choices: [
          { name: `${isZh ? '项目根目录' : 'Project root'} (CLAUDE.md)`, value: 'project' },
          { name: `${isZh ? '本地目录' : 'Local directory'} (.claude/CLAUDE.md)`, value: 'local' },
          { name: `${isZh ? '全局目录' : 'Global directory'} (~/.claude/CLAUDE.md)`, value: 'global' },
        ],
      },
    ])
    targetPath = files.find(f => f.type === location)?.path || ''
  }

  if (!targetPath) {
    console.log(ansis.red(isZh ? '无法确定目标路径' : 'Unable to determine target path'))
    return
  }

  // Read existing content or create new
  const existingContent = readContextFile(targetPath)

  let finalContent: string
  if (existingContent) {
    finalContent = mergeContextContent(existingContent, selectedRules, lang)
  }
  else {
    finalContent = generateContextContent(context, selectedRules, lang)
  }

  const success = await writeContextFile(targetPath, finalContent)

  if (success) {
    console.log(ansis.green(`\n✅ ${isZh ? '规则已添加到' : 'Rules added to'}: ${targetPath}`))
  }
  else {
    console.log(ansis.red(`\n❌ ${isZh ? '写入失败' : 'Write failed'}`))
  }
}

// ============================================================================
// Browse Rules
// ============================================================================

/**
 * Browse all available rules
 */
async function browseRules(context: ContextProjectInfo, lang: 'en' | 'zh-CN'): Promise<void> {
  const isZh = lang === 'zh-CN'

  console.log(ansis.cyan.bold(`\n📖 ${isZh ? '可用规则' : 'Available Rules'}\n`))

  const applicableRules = getApplicableRules(context.type)

  // Group by category
  const categories: Record<string, ContextRule[]> = {}
  for (const rule of applicableRules) {
    if (!categories[rule.category]) {
      categories[rule.category] = []
    }
    categories[rule.category].push(rule)
  }

  const categoryLabels: Record<string, { en: string, zh: string }> = {
    coding: { en: 'Coding Style', zh: '编码风格' },
    testing: { en: 'Testing', zh: '测试' },
    docs: { en: 'Documentation', zh: '文档' },
    workflow: { en: 'Workflow', zh: '工作流' },
    security: { en: 'Security', zh: '安全' },
  }

  for (const [category, rules] of Object.entries(categories)) {
    const label = isZh ? categoryLabels[category]?.zh : categoryLabels[category]?.en
    console.log(ansis.bold(`\n${label || category}:`))

    for (const rule of rules) {
      const name = isZh ? rule.nameZh : rule.name
      const desc = isZh ? rule.descriptionZh : rule.description
      console.log(`  ${ansis.cyan('•')} ${ansis.bold(name)}`)
      console.log(`    ${ansis.dim(desc)}`)
    }
  }

  console.log('')

  // Ask if user wants to view rule details
  const { viewRule } = await inquirer.prompt<{ viewRule: string }>([
    {
      type: 'list',
      name: 'viewRule',
      message: isZh ? '查看规则详情？' : 'View rule details?',
      choices: [
        ...applicableRules.map(r => ({
          name: isZh ? r.nameZh : r.name,
          value: r.id,
        })),
        {
          name: isZh ? '跳过' : 'Skip',
          value: 'skip',
        },
      ],
    },
  ])

  if (viewRule !== 'skip') {
    const rule = applicableRules.find(r => r.id === viewRule)
    if (rule) {
      console.log(ansis.dim(`\n${'─'.repeat(50)}`))
      console.log(ansis.bold(isZh ? rule.nameZh : rule.name))
      console.log(ansis.dim(isZh ? rule.descriptionZh : rule.description))
      console.log('')
      console.log(isZh ? rule.contentZh : rule.content)
      console.log(ansis.dim(`${'─'.repeat(50)}\n`))
    }
  }
}
