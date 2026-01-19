/**
 * CCJK Hooks Sync Command
 *
 * CLI command for managing and synchronizing automation hooks with the cloud.
 * Supports uploading, downloading, enabling/disabling hooks, and browsing templates.
 *
 * @module commands/hooks-sync
 */

import type { SupportedLang } from '../constants.js'
import type { CloudHook, HookTemplate } from '../services/cloud/hooks-sync.js'
import { homedir } from 'node:os'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import hookTemplatesData from '../data/hook-templates.json'
import { i18n } from '../i18n/index.js'
import {
  CloudHooksSyncClient,
  convertFromCloudHook,
} from '../services/cloud/hooks-sync.js'
import { displayBannerWithInfo } from '../utils/banner.js'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler.js'
import { ensureDir, exists, readJsonFile, writeFileAtomic } from '../utils/fs-operations.js'
import { getGlobalRegistry } from '../utils/hooks/registry.js'

// ============================================================================
// Types
// ============================================================================

export interface HooksSyncOptions {
  skipBanner?: boolean
  lang?: SupportedLang
  action?: 'sync' | 'list' | 'enable' | 'disable' | 'templates' | 'upload' | 'download'
  hookId?: string
  category?: string
  privacy?: 'private' | 'team' | 'public'
}

interface LocalHooksStorage {
  version: string
  hooks: CloudHook[]
  lastSyncedAt?: string
}

// ============================================================================
// Constants
// ============================================================================

const HOOKS_DIR = join(homedir(), '.ccjk', 'hooks')
const HOOKS_STORAGE_FILE = join(HOOKS_DIR, 'hooks.json')

// ============================================================================
// Main Command
// ============================================================================

/**
 * Hooks sync command entry point
 */
export async function hooksSync(options: HooksSyncOptions = {}): Promise<void> {
  try {
    // Display banner if not skipped
    if (!options.skipBanner) {
      displayBannerWithInfo()
    }

    const lang = options.lang || 'zh-CN'

    // Execute action based on options
    if (options.action) {
      switch (options.action) {
        case 'sync':
          await syncHooks()
          break
        case 'list':
          await listHooks(options)
          break
        case 'enable':
          if (!options.hookId) {
            console.log(ansis.red(i18n.t('menu:hooksSync.errors.hookIdRequired')))
            return
          }
          await toggleHook(options.hookId, true)
          break
        case 'disable':
          if (!options.hookId) {
            console.log(ansis.red(i18n.t('menu:hooksSync.errors.hookIdRequired')))
            return
          }
          await toggleHook(options.hookId, false)
          break
        case 'templates':
          await browseTemplates(lang, options)
          break
        case 'upload':
          await uploadHooks()
          break
        case 'download':
          await downloadHooks(options)
          break
        default:
          await showHooksMenu(lang)
      }
    }
    else {
      // Show interactive menu
      await showHooksMenu(lang)
    }
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}

// ============================================================================
// Interactive Menu
// ============================================================================

/**
 * Show hooks management menu
 */
async function showHooksMenu(lang: SupportedLang): Promise<void> {
  while (true) {
    console.log(ansis.green.bold(`\n${i18n.t('menu:hooksSync.title')}\n`))

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: i18n.t('menu:mcpMarket.selectAction'),
      choices: [
        { name: `🔄 ${i18n.t('menu:hooksSync.syncNow')}`, value: 'sync' },
        { name: `📋 ${i18n.t('menu:hooksSync.viewStatus')}`, value: 'list' },
        { name: `📚 ${i18n.t('menu:hooksSync.browseTemplates')}`, value: 'templates' },
        { name: `☁️  ${i18n.t('menu:mcpMarket.upload') || 'Upload'}`, value: 'upload' },
        { name: `📥 ${i18n.t('menu:mcpMarket.download') || 'Download'}`, value: 'download' },
        new inquirer.Separator(),
        { name: ansis.gray(`↩️  ${i18n.t('common:back')}`), value: 'back' },
      ],
    }])

    if (!action || action === 'back') {
      break
    }

    switch (action) {
      case 'sync':
        await syncHooks()
        break
      case 'list':
        await listHooks()
        break
      case 'templates':
        await browseTemplates(lang)
        break
      case 'upload':
        await uploadHooks()
        break
      case 'download':
        await downloadHooks()
        break
    }
  }
}

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Sync hooks bidirectionally
 */
async function syncHooks(): Promise<void> {
  console.log(ansis.green(`\n⏳ ${i18n.t('menu:hooksSync.syncNowDesc')}...`))

  try {
    // Load local hooks
    const localHooks = await loadLocalHooks()
    console.log(ansis.dim(`  ${i18n.t('hooksSync:labels.localHooks')}: ${localHooks.length}`))

    // Create cloud client
    const client = new CloudHooksSyncClient({
      enableLogging: false,
    })

    // Sync with cloud
    const result = await client.syncHooks(localHooks, {
      direction: 'bidirectional',
      overwrite: false,
    })

    if (result.success && result.data) {
      console.log(ansis.green(`\n✅ ${i18n.t('hooksSync:actions.syncCompleted')}`))
      console.log(ansis.dim(`  ${i18n.t('hooksSync:labels.uploaded')}: ${result.data.uploaded}`))
      console.log(ansis.dim(`  ${i18n.t('hooksSync:labels.downloaded')}: ${result.data.downloaded}`))
      console.log(ansis.dim(`  ${i18n.t('hooksSync:labels.skipped')}: ${result.data.skipped}`))

      if (result.data.failed > 0) {
        console.log(ansis.yellow(`  ${i18n.t('hooksSync:labels.failed')}: ${result.data.failed}`))
      }

      // Save sync timestamp
      await saveLocalHooks(localHooks, result.data.timestamp)
    }
    else {
      console.log(ansis.red(`\n❌ ${i18n.t('hooksSync:actions.syncError', { error: result.error || 'Unknown error' })}`))
    }
  }
  catch (error) {
    console.log(ansis.red(`\n❌ ${i18n.t('hooksSync:actions.syncError', { error: error instanceof Error ? error.message : String(error) })}`))
  }
}

/**
 * Upload local hooks to cloud
 */
async function uploadHooks(): Promise<void> {
  console.log(ansis.green(`\n⏳ ${i18n.t('hooksSync:actions.uploading')}`))

  try {
    const localHooks = await loadLocalHooks()

    if (localHooks.length === 0) {
      console.log(ansis.yellow(`\n⚠️  ${i18n.t('hooksSync:errors.noHooksFound')}`))
      return
    }

    console.log(ansis.dim(`  ${i18n.t('hooksSync:labels.found')} ${localHooks.length} ${i18n.t('hooksSync:labels.localHooks').toLowerCase()}`))

    const client = new CloudHooksSyncClient()
    const result = await client.uploadHooks(localHooks)

    if (result.success && result.data) {
      console.log(ansis.green(`\n✅ ${i18n.t('hooksSync:actions.uploadCompleted')}`))
      console.log(ansis.dim(`  ${i18n.t('hooksSync:labels.uploaded')}: ${result.data.uploaded}`))
    }
    else {
      console.log(ansis.red(`\n❌ ${i18n.t('hooksSync:actions.uploadError', { error: result.error || 'Unknown error' })}`))
    }
  }
  catch (error) {
    console.log(ansis.red(`\n❌ ${i18n.t('hooksSync:actions.uploadError', { error: error instanceof Error ? error.message : String(error) })}`))
  }
}

/**
 * Download hooks from cloud
 */
async function downloadHooks(options: HooksSyncOptions = {}): Promise<void> {
  console.log(ansis.green(`\n⏳ ${i18n.t('hooksSync:actions.downloading')}`))

  try {
    const client = new CloudHooksSyncClient()
    const result = await client.downloadHooks({
      privacy: options.privacy,
      category: options.category,
    })

    if (result.success && result.data) {
      console.log(ansis.green(`\n✅ ${i18n.t('hooksSync:actions.downloadCompleted')}`))
      console.log(ansis.dim(`  ${i18n.t('hooksSync:labels.downloaded')}: ${result.data.length}`))

      // Save downloaded hooks
      await saveLocalHooks(result.data)

      // Display downloaded hooks
      result.data.forEach((hook) => {
        console.log(`  ${ansis.green('•')} ${hook.name} ${ansis.dim(`(${hook.id})`)}`)
      })
    }
    else {
      console.log(ansis.red(`\n❌ ${i18n.t('hooksSync:actions.downloadError', { error: result.error || 'Unknown error' })}`))
    }
  }
  catch (error) {
    console.log(ansis.red(`\n❌ ${i18n.t('hooksSync:actions.downloadError', { error: error instanceof Error ? error.message : String(error) })}`))
  }
}

// ============================================================================
// Hook Management
// ============================================================================

/**
 * List local hooks
 */
async function listHooks(options: HooksSyncOptions = {}): Promise<void> {
  console.log(ansis.green.bold(`\n📋 ${i18n.t('hooksSync:labels.localHooks')}\n`))

  try {
    const hooks = await loadLocalHooks()

    if (hooks.length === 0) {
      console.log(ansis.yellow(`  ${i18n.t('hooksSync:errors.noHooksFound')}`))
      return
    }

    // Filter by category if specified
    const filteredHooks = options.category
      ? hooks.filter(h => h.metadata.category === options.category)
      : hooks

    // Group by category
    const byCategory = new Map<string, CloudHook[]>()
    for (const hook of filteredHooks) {
      const category = hook.metadata.category
      if (!byCategory.has(category)) {
        byCategory.set(category, [])
      }
      byCategory.get(category)!.push(hook)
    }

    // Display hooks by category
    for (const [category, categoryHooks] of byCategory) {
      console.log(ansis.bold(`\n${category}:`))
      for (const hook of categoryHooks) {
        const status = hook.enabled ? ansis.green('✓') : ansis.red('✗')
        const privacy = hook.privacy === 'public' ? ansis.green('🌐') : ansis.dim('🔒')
        console.log(`  ${status} ${privacy} ${hook.name} ${ansis.dim(`(${hook.id})`)}`)
        console.log(`     ${ansis.dim(hook.metadata.description)}`)
      }
    }

    console.log(ansis.dim(`\n${i18n.t('hooksSync:labels.total')}: ${filteredHooks.length}`))
  }
  catch (error) {
    console.log(ansis.red(`\n❌ ${i18n.t('common:error')}: ${error instanceof Error ? error.message : String(error)}`))
  }
}

/**
 * Enable or disable a hook
 */
async function toggleHook(hookId: string, enabled: boolean): Promise<void> {
  try {
    const hooks = await loadLocalHooks()
    const hook = hooks.find(h => h.id === hookId)

    if (!hook) {
      console.log(ansis.red(`\n❌ ${i18n.t('hooksSync:errors.hookNotFound', { id: hookId })}`))
      return
    }

    hook.enabled = enabled
    await saveLocalHooks(hooks)

    // Also update in registry
    const registry = getGlobalRegistry()
    convertFromCloudHook(hook)

    // Update hook enabled state in registry
    const entry = registry.get(hookId)
    if (entry) {
      if (enabled) {
        registry.enable(hookId)
      }
      else {
        registry.disable(hookId)
      }
    }

    const status = enabled ? ansis.green(i18n.t('hooksSync:labels.enabled')) : ansis.red(i18n.t('hooksSync:labels.disabled'))
    console.log(`\n✅ ${i18n.t('hooksSync:actions.hookToggled', { status, name: hook.name })}`)
  }
  catch (error) {
    console.log(ansis.red(`\n❌ ${i18n.t('common:error')}: ${error instanceof Error ? error.message : String(error)}`))
  }
}

// ============================================================================
// Template Management
// ============================================================================

/**
 * Browse and install hook templates
 */
async function browseTemplates(lang: SupportedLang, options: HooksSyncOptions = {}): Promise<void> {
  console.log(ansis.green.bold(`\n📚 ${i18n.t('menu:hooksSync.browseTemplates')}\n`))

  try {
    // Load templates from local data file
    const templates = hookTemplatesData.templates as HookTemplate[]
    const categories = hookTemplatesData.categories

    // Filter by category if specified
    const filteredTemplates = options.category
      ? templates.filter(t => t.category === options.category)
      : templates

    if (filteredTemplates.length === 0) {
      console.log(ansis.yellow(`  ${i18n.t('hooksSync:errors.noTemplatesFound')}`))
      return
    }

    // Display categories
    console.log(ansis.bold(`${i18n.t('hooksSync:labels.categories')}:`))
    for (const cat of categories) {
      const count = templates.filter(t => t.category === cat.id).length
      const catName = cat.name[lang as keyof typeof cat.name] || cat.name.en
      console.log(`  ${cat.icon} ${catName} ${ansis.dim(`(${count})`)}`)
    }

    // Select template
    const { templateId } = await inquirer.prompt([{
      type: 'list',
      name: 'templateId',
      message: i18n.t('hooksSync:prompts.selectTemplate'),
      choices: filteredTemplates.map(t => ({
        name: `${t.name} - ${t.description}`,
        value: t.id,
      })),
    }])

    if (!templateId) {
      return
    }

    const template = templates.find(t => t.id === templateId)
    if (!template) {
      return
    }

    // Show template details
    console.log(ansis.bold(`\n${template.name}`))
    console.log(ansis.dim(template.description))
    console.log(ansis.bold(`\n${i18n.t('hooksSync:labels.category')}: `) + template.category)
    console.log(ansis.bold(`${i18n.t('hooksSync:labels.variables')}: `) + template.variables.join(', '))

    // Confirm installation
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('hooksSync:prompts.confirmInstall'),
      default: true,
    }])

    if (!confirm) {
      return
    }

    // Install template
    await installTemplate(template)
  }
  catch (error) {
    console.log(ansis.red(`\n❌ ${i18n.t('common:error')}: ${error instanceof Error ? error.message : String(error)}`))
  }
}

/**
 * Install a hook template
 */
async function installTemplate(template: HookTemplate): Promise<void> {
  try {
    // Create cloud hook from template
    const cloudHook: CloudHook = {
      id: `template-${template.id}-${Date.now()}`,
      ...template.hook,
      metadata: {
        author: 'CCJK Templates',
        description: template.description,
        tags: [template.category],
        category: template.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }

    // Load existing hooks
    const hooks = await loadLocalHooks()

    // Add new hook
    hooks.push(cloudHook)

    // Save hooks
    await saveLocalHooks(hooks)

    // Register in hook registry
    const registry = getGlobalRegistry()
    const localHook = convertFromCloudHook(cloudHook)
    registry.register(localHook)

    console.log(ansis.green(`\n✅ ${i18n.t('hooksSync:actions.templateInstalled', { name: template.name })}`))
  }
  catch (error) {
    console.log(ansis.red(`\n❌ ${i18n.t('hooksSync:actions.installError', { error: error instanceof Error ? error.message : String(error) })}`))
  }
}

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Load local hooks from storage
 */
async function loadLocalHooks(): Promise<CloudHook[]> {
  try {
    // Ensure hooks directory exists
    await ensureDir(HOOKS_DIR)

    // Check if storage file exists
    if (!await exists(HOOKS_STORAGE_FILE)) {
      return []
    }

    // Read storage file
    const storage = await readJsonFile<LocalHooksStorage>(HOOKS_STORAGE_FILE)

    return storage?.hooks || []
  }
  catch (error) {
    console.error(i18n.t('hooksSync:errors.loadHooksFailed'), error)
    return []
  }
}

/**
 * Save local hooks to storage
 */
async function saveLocalHooks(hooks: CloudHook[], lastSyncedAt?: string): Promise<void> {
  try {
    // Ensure hooks directory exists
    await ensureDir(HOOKS_DIR)

    // Create storage object
    const storage: LocalHooksStorage = {
      version: '1.0.0',
      hooks,
      lastSyncedAt: lastSyncedAt || new Date().toISOString(),
    }

    // Write storage file
    await writeFileAtomic(HOOKS_STORAGE_FILE, JSON.stringify(storage, null, 2))
  }
  catch (error) {
    console.error(i18n.t('hooksSync:errors.saveHooksFailed'), error)
    throw error
  }
}

// ============================================================================
// Export
// ============================================================================

export default hooksSync
