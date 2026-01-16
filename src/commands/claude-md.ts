/**
 * CCJK CLAUDE.md Management Command
 *
 * CLI command for managing CLAUDE.md files including:
 * - Template marketplace browsing and application
 * - Cloud synchronization (upload/download)
 * - Version history management
 */

import { existsSync } from 'node:fs'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { i18n } from '../i18n'
import {
  applyTemplate,
  downloadClaudeMd,
  getClaudeMdSyncService,
  uploadClaudeMd,
} from '../services/cloud/claude-md-sync'

// ============================================================================
// Main Command Handler
// ============================================================================

/**
 * CLAUDE.md command entry point
 *
 * @param action - Subcommand action
 * @param args - Additional arguments
 */
export async function claudeMdCommand(
  action: string = 'menu',
  args?: string[],
): Promise<void> {
  switch (action) {
    case 'templates':
    case 'template':
    case 't':
      await browseTemplates()
      break
    case 'apply':
    case 'a':
      await applyTemplateCommand(args?.[0])
      break
    case 'push':
    case 'upload':
    case 'u':
      await uploadCommand(args?.[0])
      break
    case 'pull':
    case 'download':
    case 'd':
      await downloadCommand(args?.[0])
      break
    case 'list':
    case 'ls':
    case 'l':
      await listCloudConfigs()
      break
    case 'versions':
    case 'v':
      await showVersionHistory(args?.[0])
      break
    case 'rollback':
    case 'r':
      await rollbackVersion(args?.[0], args?.[1])
      break
    case 'menu':
    case 'm':
    default:
      await showClaudeMdMenu()
      break
  }
}

// ============================================================================
// Template Marketplace
// ============================================================================

/**
 * Browse template marketplace
 */
async function browseTemplates(): Promise<void> {
  const service = getClaudeMdSyncService()

  console.log(ansis.green.bold(`\n📚 ${i18n.t('claudeMd:templates.title')}\n`))

  // Get categories
  const categories = await service.listCategories()

  // Show category selection
  const { category } = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: i18n.t('claudeMd:templates.selectCategory'),
      choices: [
        { name: i18n.t('claudeMd:templates.allCategories'), value: 'all' },
        ...categories.map(c => ({
          name: `${c.name} - ${c.description}`,
          value: c.id,
        })),
      ],
    },
  ])

  // Get templates
  const templates = await service.listTemplates(
    category === 'all' ? {} : { category },
  )

  if (templates.length === 0) {
    console.log(ansis.yellow(`\n⚠️  ${i18n.t('claudeMd:templates.noTemplates')}`))
    return
  }

  // Show template selection
  const { templateId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'templateId',
      message: i18n.t('claudeMd:templates.selectTemplate'),
      choices: templates.map(t => ({
        name: `${t.name} - ${t.description}`,
        value: t.id,
      })),
    },
  ])

  // Show template details
  const template = templates.find(t => t.id === templateId)
  if (!template) {
    return
  }

  console.log(ansis.green.bold(`\n📄 ${template.name}\n`))
  console.log(ansis.gray(template.description))
  console.log(ansis.gray(`\n${i18n.t('claudeMd:templates.category')}: ${template.category}`))
  console.log(ansis.gray(`${i18n.t('claudeMd:templates.variables')}: ${template.variables.join(', ')}`))

  // Ask if user wants to apply
  const { apply } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'apply',
      message: i18n.t('claudeMd:templates.applyNow'),
      default: true,
    },
  ])

  if (apply) {
    await applyTemplateCommand(templateId)
  }
}

/**
 * Apply template command
 */
async function applyTemplateCommand(templateId?: string): Promise<void> {
  const service = getClaudeMdSyncService()

  // Get template ID if not provided
  if (!templateId) {
    const templates = await service.listTemplates()
    const { selectedId } = await inquirer.prompt<{ selectedId: string }>([
      {
        type: 'list',
        name: 'selectedId',
        message: i18n.t('claudeMd:templates.selectTemplate'),
        choices: templates.map(t => ({
          name: `${t.name} - ${t.description}`,
          value: t.id,
        })),
      },
    ])
    templateId = selectedId
  }

  // Get template - templateId is guaranteed to be string at this point
  const template = await service.getTemplate(templateId as string)
  if (!template) {
    console.log(ansis.red(`\n❌ ${i18n.t('claudeMd:templates.notFound', { id: templateId })}`))
    return
  }

  // Get project path
  const { projectPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectPath',
      message: i18n.t('claudeMd:templates.projectPath'),
      default: process.cwd(),
      validate: (input: string) => {
        if (!existsSync(input)) {
          return i18n.t('claudeMd:templates.pathNotExist')
        }
        return true
      },
    },
  ])

  // Collect variable values
  const variables: Record<string, string> = {}

  for (const variable of template.variables) {
    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message: i18n.t('claudeMd:templates.enterVariable', { variable }),
        default: getDefaultValue(variable),
      },
    ])
    variables[variable] = value
  }

  // Apply template
  console.log(ansis.green(`\n⏳ ${i18n.t('claudeMd:templates.applying')}`))

  const result = await applyTemplate(templateId as string, projectPath, variables)

  if (result.success) {
    console.log(ansis.green(`\n✅ ${i18n.t('claudeMd:templates.applied', { path: result.filePath })}`))
  }
  else {
    console.log(ansis.red(`\n❌ ${i18n.t('claudeMd:templates.applyFailed', { error: result.error })}`))
  }
}

/**
 * Get default value for variable
 */
function getDefaultValue(variable: string): string {
  switch (variable) {
    case 'PROJECT_NAME':
      return process.cwd().split('/').pop() || 'my-project'
    case 'AUTHOR':
      return process.env.USER || 'Unknown'
    case 'PORT':
      return '3000'
    case 'DESCRIPTION':
      return 'Project description'
    case 'TECH_STACK':
      return 'Technology stack'
    default:
      return ''
  }
}

// ============================================================================
// Cloud Sync
// ============================================================================

/**
 * Upload CLAUDE.md to cloud
 */
async function uploadCommand(filePath?: string): Promise<void> {
  console.log(ansis.green.bold(`\n☁️  ${i18n.t('claudeMd:cloud.uploadTitle')}\n`))

  // Get file path
  if (!filePath) {
    const { path } = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: i18n.t('claudeMd:cloud.filePath'),
        default: join(process.cwd(), 'CLAUDE.md'),
        validate: (input: string) => {
          if (!existsSync(input)) {
            return i18n.t('claudeMd:cloud.fileNotExist')
          }
          return true
        },
      },
    ])
    filePath = path
  }

  // Get metadata
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: i18n.t('claudeMd:cloud.configName'),
      default: process.cwd().split('/').pop() || 'My Config',
    },
    {
      type: 'list',
      name: 'projectType',
      message: i18n.t('claudeMd:cloud.projectType'),
      choices: [
        { name: 'Node.js', value: 'nodejs' },
        { name: 'Python', value: 'python' },
        { name: 'React', value: 'react' },
        { name: 'Next.js', value: 'nextjs' },
        { name: 'Rust', value: 'rust' },
        { name: 'Go', value: 'go' },
        { name: i18n.t('claudeMd:cloud.other'), value: 'other' },
      ],
    },
    {
      type: 'list',
      name: 'privacy',
      message: i18n.t('claudeMd:cloud.privacy'),
      choices: [
        { name: i18n.t('claudeMd:cloud.private'), value: 'private' },
        { name: i18n.t('claudeMd:cloud.team'), value: 'team' },
        { name: i18n.t('claudeMd:cloud.public'), value: 'public' },
      ],
      default: 'private',
    },
    {
      type: 'input',
      name: 'description',
      message: i18n.t('claudeMd:cloud.description'),
    },
    {
      type: 'input',
      name: 'tags',
      message: i18n.t('claudeMd:cloud.tags'),
    },
  ])

  // Upload
  console.log(ansis.green(`\n⏳ ${i18n.t('claudeMd:cloud.uploading')}`))

  const result = await uploadClaudeMd(filePath as string, {
    name: answers.name,
    projectType: answers.projectType,
    privacy: answers.privacy,
    description: answers.description,
    tags: answers.tags ? answers.tags.split(',').map((t: string) => t.trim()) : [],
  })

  if (result.success) {
    console.log(ansis.green(`\n✅ ${i18n.t('claudeMd:cloud.uploaded', { id: result.id })}`))
  }
  else {
    console.log(ansis.red(`\n❌ ${i18n.t('claudeMd:cloud.uploadFailed', { error: result.error })}`))
  }
}

/**
 * Download CLAUDE.md from cloud
 */
async function downloadCommand(configId?: string): Promise<void> {
  const service = getClaudeMdSyncService()

  console.log(ansis.green.bold(`\n☁️  ${i18n.t('claudeMd:cloud.downloadTitle')}\n`))

  // Get config ID if not provided
  if (!configId) {
    const configs = await service.listCloudConfigs()

    if (configs.length === 0) {
      console.log(ansis.yellow(`\n⚠️  ${i18n.t('claudeMd:cloud.noConfigs')}`))
      return
    }

    const { selectedId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedId',
        message: i18n.t('claudeMd:cloud.selectConfig'),
        choices: configs.map(c => ({
          name: `${c.name} (${c.projectType}) - ${c.metadata.description}`,
          value: c.id,
        })),
      },
    ])
    configId = selectedId
  }

  // Get project path
  const { projectPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectPath',
      message: i18n.t('claudeMd:cloud.projectPath'),
      default: process.cwd(),
    },
  ])

  // Download
  console.log(ansis.green(`\n⏳ ${i18n.t('claudeMd:cloud.downloading')}`))

  const result = await downloadClaudeMd(configId as string, projectPath)

  if (result.success) {
    console.log(ansis.green(`\n✅ ${i18n.t('claudeMd:cloud.downloaded', { path: result.filePath })}`))
  }
  else {
    console.log(ansis.red(`\n❌ ${i18n.t('claudeMd:cloud.downloadFailed', { error: result.error })}`))
  }
}

/**
 * List cloud configs
 */
async function listCloudConfigs(): Promise<void> {
  const service = getClaudeMdSyncService()

  console.log(ansis.green.bold(`\n☁️  ${i18n.t('claudeMd:cloud.listTitle')}\n`))

  const configs = await service.listCloudConfigs()

  if (configs.length === 0) {
    console.log(ansis.yellow(`⚠️  ${i18n.t('claudeMd:cloud.noConfigs')}`))
    return
  }

  for (const config of configs) {
    console.log(ansis.green(`\n📄 ${config.name}`))
    console.log(ansis.gray(`   ID: ${config.id}`))
    console.log(ansis.gray(`   ${i18n.t('claudeMd:cloud.type')}: ${config.projectType}`))
    console.log(ansis.gray(`   ${i18n.t('claudeMd:cloud.privacy')}: ${config.privacy}`))
    console.log(ansis.gray(`   ${i18n.t('claudeMd:cloud.updated')}: ${config.metadata.updatedAt}`))
    console.log(ansis.gray(`   ${i18n.t('claudeMd:cloud.usage')}: ${config.metadata.usageCount}`))
  }
}

// ============================================================================
// Version History
// ============================================================================

/**
 * Show version history
 */
async function showVersionHistory(configId?: string): Promise<void> {
  const service = getClaudeMdSyncService()

  console.log(ansis.green.bold(`\n📜 ${i18n.t('claudeMd:version.title')}\n`))

  // Get config ID if not provided
  if (!configId) {
    const configs = await service.listCloudConfigs()

    if (configs.length === 0) {
      console.log(ansis.yellow(`\n⚠️  ${i18n.t('claudeMd:cloud.noConfigs')}`))
      return
    }

    const { selectedId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedId',
        message: i18n.t('claudeMd:cloud.selectConfig'),
        choices: configs.map(c => ({
          name: `${c.name} (${c.projectType})`,
          value: c.id,
        })),
      },
    ])
    configId = selectedId
  }

  // Get versions
  const versions = await service.listVersions(configId as string)

  if (versions.length === 0) {
    console.log(ansis.yellow(`\n⚠️  ${i18n.t('claudeMd:version.noVersions')}`))
    return
  }

  for (const version of versions) {
    console.log(ansis.green(`\n📌 ${version.id}`))
    console.log(ansis.gray(`   ${i18n.t('claudeMd:version.timestamp')}: ${version.timestamp}`))
    console.log(ansis.gray(`   ${i18n.t('claudeMd:version.message')}: ${version.message}`))
  }
}

/**
 * Rollback to version
 */
async function rollbackVersion(configId?: string, versionId?: string): Promise<void> {
  const service = getClaudeMdSyncService()

  console.log(ansis.green.bold(`\n⏪ ${i18n.t('claudeMd:version.rollbackTitle')}\n`))

  // Get config ID if not provided
  if (!configId) {
    const configs = await service.listCloudConfigs()

    if (configs.length === 0) {
      console.log(ansis.yellow(`\n⚠️  ${i18n.t('claudeMd:cloud.noConfigs')}`))
      return
    }

    const { selectedId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedId',
        message: i18n.t('claudeMd:cloud.selectConfig'),
        choices: configs.map(c => ({
          name: `${c.name} (${c.projectType})`,
          value: c.id,
        })),
      },
    ])
    configId = selectedId
  }

  // Get version ID if not provided
  if (!versionId) {
    const versions = await service.listVersions(configId as string)

    if (versions.length === 0) {
      console.log(ansis.yellow(`\n⚠️  ${i18n.t('claudeMd:version.noVersions')}`))
      return
    }

    const { selectedVersionId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedVersionId',
        message: i18n.t('claudeMd:version.selectVersion'),
        choices: versions.map(v => ({
          name: `${v.timestamp} - ${v.message}`,
          value: v.id,
        })),
      },
    ])
    versionId = selectedVersionId
  }

  // Confirm rollback
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('claudeMd:version.confirmRollback'),
      default: false,
    },
  ])

  if (!confirm) {
    console.log(ansis.yellow(`\n⏸️  ${i18n.t('claudeMd:version.cancelled')}`))
    return
  }

  // Rollback
  console.log(ansis.green(`\n⏳ ${i18n.t('claudeMd:version.rolling')}`))

  const result = await service.rollbackToVersion(configId as string, versionId as string)

  if (result.success) {
    console.log(ansis.green(`\n✅ ${i18n.t('claudeMd:version.rolledBack')}`))
  }
  else {
    console.log(ansis.red(`\n❌ ${i18n.t('claudeMd:version.rollbackFailed', { error: result.error })}`))
  }
}

// ============================================================================
// Main Menu
// ============================================================================

/**
 * Show CLAUDE.md management menu
 */
async function showClaudeMdMenu(): Promise<void> {
  console.log(ansis.green.bold(`\n📝 ${i18n.t('claudeMd:menu.title')}\n`))

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: i18n.t('claudeMd:menu.selectAction'),
      choices: [
        {
          name: `📚 ${i18n.t('claudeMd:menu.browseTemplates')}`,
          value: 'templates',
        },
        {
          name: `📄 ${i18n.t('claudeMd:menu.applyTemplate')}`,
          value: 'apply',
        },
        {
          name: `☁️  ${i18n.t('claudeMd:menu.uploadCloud')}`,
          value: 'upload',
        },
        {
          name: `📥 ${i18n.t('claudeMd:menu.downloadCloud')}`,
          value: 'download',
        },
        {
          name: `📋 ${i18n.t('claudeMd:menu.listConfigs')}`,
          value: 'list',
        },
        {
          name: `📜 ${i18n.t('claudeMd:menu.versionHistory')}`,
          value: 'versions',
        },
        {
          name: `⏪ ${i18n.t('claudeMd:menu.rollback')}`,
          value: 'rollback',
        },
        {
          name: `🚪 ${i18n.t('claudeMd:menu.exit')}`,
          value: 'exit',
        },
      ],
    },
  ])

  if (action === 'exit') {
    console.log(ansis.green(`\n👋 ${i18n.t('claudeMd:menu.goodbye')}`))
    return
  }

  await claudeMdCommand(action)

  // Show menu again
  await showClaudeMdMenu()
}
