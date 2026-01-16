/**
 * CCJK Skills Sync Command
 *
 * Provides CLI interface for synchronizing SKILL.md files with cloud storage.
 * Supports sync, push, pull, and list operations.
 *
 * @module commands/skills-sync
 */

import type { SupportedLang } from '../constants.js'
import type { SyncOptions } from '../types/cloud-sync.js'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { getTranslation } from '../i18n/index.js'
import {
  getLocalSkills,
  listCloudSkills,
  loadSyncState,
  pullSkills,
  pushSkills,
  syncAllSkills,
} from '../services/cloud/skills-sync.js'

// ============================================================================
// Types
// ============================================================================

export interface SkillsSyncOptions {
  /** Language for UI */
  lang?: SupportedLang

  /** Conflict resolution strategy */
  conflictResolution?: 'local' | 'remote' | 'newer' | 'prompt'

  /** Dry run (no actual changes) */
  dryRun?: boolean

  /** Force sync (ignore conflicts) */
  force?: boolean

  /** Specific skill IDs to sync */
  skillIds?: string[]

  /** Privacy filter */
  privacy?: 'private' | 'team' | 'public'
}

// ============================================================================
// Main Commands
// ============================================================================

/**
 * Sync all skills (bidirectional)
 */
export async function syncSkills(options: SkillsSyncOptions = {}): Promise<void> {
  const t = getTranslation(options.lang)

  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ${t('skillsSync:title.sync')}`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  try {
    // Show current status
    await showSyncStatus(options)

    // Confirm sync
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: t('skillsSync:prompt.confirmSync'),
      default: true,
    })

    if (!confirm) {
      console.log(ansis.yellow(`\n  ${t('skillsSync:message.cancelled')}`))
      return
    }

    // Perform sync
    console.log(ansis.dim(`\n  ${t('skillsSync:message.syncing')}...\n`))

    const syncOptions: SyncOptions = {
      conflictResolution: options.conflictResolution || 'prompt',
      dryRun: options.dryRun,
      force: options.force,
      skillIds: options.skillIds,
      privacy: options.privacy,
    }

    const result = await syncAllSkills(syncOptions)

    // Display results
    displaySyncResult(result, options.lang)
  }
  catch (error) {
    console.error(ansis.red(`\n  ${t('skillsSync:error.syncFailed')}: ${error}`))
    throw error
  }
}

/**
 * Push local skills to cloud
 */
export async function pushSkillsCommand(options: SkillsSyncOptions = {}): Promise<void> {
  const t = getTranslation(options.lang)

  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ${t('skillsSync:title.push')}`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  try {
    // Get local skills
    const localSkills = await getLocalSkills()
    console.log(ansis.dim(`  ${t('skillsSync:message.foundLocalSkills', { count: localSkills.length })}`))

    if (localSkills.length === 0) {
      console.log(ansis.yellow(`\n  ${t('skillsSync:message.noLocalSkills')}`))
      return
    }

    // Confirm push
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: t('skillsSync:prompt.confirmPush'),
      default: true,
    })

    if (!confirm) {
      console.log(ansis.yellow(`\n  ${t('skillsSync:message.cancelled')}`))
      return
    }

    // Perform push
    console.log(ansis.dim(`\n  ${t('skillsSync:message.pushing')}...\n`))

    const syncOptions: SyncOptions = {
      conflictResolution: 'local',
      dryRun: options.dryRun,
      force: options.force,
      skillIds: options.skillIds,
      privacy: options.privacy,
    }

    const result = await pushSkills(options.skillIds, syncOptions)

    // Display results
    displaySyncResult(result, options.lang)
  }
  catch (error) {
    console.error(ansis.red(`\n  ${t('skillsSync:error.pushFailed')}: ${error}`))
    throw error
  }
}

/**
 * Pull skills from cloud
 */
export async function pullSkillsCommand(options: SkillsSyncOptions = {}): Promise<void> {
  const t = getTranslation(options.lang)

  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ${t('skillsSync:title.pull')}`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  try {
    // Get cloud skills
    const cloudResponse = await listCloudSkills({ privacy: options.privacy })
    if (!cloudResponse.success) {
      throw new Error(cloudResponse.error || 'Failed to list cloud skills')
    }

    const cloudSkills = cloudResponse.data?.skills || []
    console.log(ansis.dim(`  ${t('skillsSync:message.foundCloudSkills', { count: cloudSkills.length })}`))

    if (cloudSkills.length === 0) {
      console.log(ansis.yellow(`\n  ${t('skillsSync:message.noCloudSkills')}`))
      return
    }

    // Confirm pull
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: t('skillsSync:prompt.confirmPull'),
      default: true,
    })

    if (!confirm) {
      console.log(ansis.yellow(`\n  ${t('skillsSync:message.cancelled')}`))
      return
    }

    // Perform pull
    console.log(ansis.dim(`\n  ${t('skillsSync:message.pulling')}...\n`))

    const syncOptions: SyncOptions = {
      conflictResolution: 'remote',
      dryRun: options.dryRun,
      force: options.force,
      skillIds: options.skillIds,
      privacy: options.privacy,
    }

    const result = await pullSkills(options.skillIds, syncOptions)

    // Display results
    displaySyncResult(result, options.lang)
  }
  catch (error) {
    console.error(ansis.red(`\n  ${t('skillsSync:error.pullFailed')}: ${error}`))
    throw error
  }
}

/**
 * List cloud skills
 */
export async function listCloudSkillsCommand(options: SkillsSyncOptions = {}): Promise<void> {
  const t = getTranslation(options.lang)

  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ${t('skillsSync:title.list')}`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  try {
    const response = await listCloudSkills({ privacy: options.privacy })

    if (!response.success) {
      throw new Error(response.error || 'Failed to list cloud skills')
    }

    const skills = response.data?.skills || []

    if (skills.length === 0) {
      console.log(ansis.yellow(`  ${t('skillsSync:message.noCloudSkills')}`))
      return
    }

    console.log(ansis.bold.green(`  ${t('skillsSync:message.foundCloudSkills', { count: skills.length })}\n`))

    // Display skills in a table format
    for (const skill of skills) {
      const privacyBadge = getPrivacyBadge(skill.privacy)
      console.log(`${ansis.bold(`  ${skill.name}`) + ansis.dim(` v${skill.version}`)} ${privacyBadge}`)
      console.log(ansis.dim(`    ${skill.metadata.description}`))
      if (skill.metadata.tags && skill.metadata.tags.length > 0) {
        const tags = skill.metadata.tags.map(tag => ansis.bgGray.white(` ${tag} `)).join(' ')
        console.log(`    ${tags}`)
      }
      console.log(ansis.dim(`    ${t('skillsSync:label.author')}: ${skill.metadata.author}`))
      console.log(ansis.dim(`    ${t('skillsSync:label.updated')}: ${new Date(skill.updatedAt).toLocaleString()}`))
      console.log('')
    }
  }
  catch (error) {
    console.error(ansis.red(`\n  ${t('skillsSync:error.listFailed')}: ${error}`))
    throw error
  }
}

/**
 * Show sync status
 */
export async function showSyncStatus(options: SkillsSyncOptions = {}): Promise<void> {
  const t = getTranslation(options.lang)

  try {
    const syncState = loadSyncState()
    const localSkills = await getLocalSkills()
    const cloudResponse = await listCloudSkills({ privacy: options.privacy })
    const cloudSkills = cloudResponse.success ? (cloudResponse.data?.skills || []) : []

    console.log(ansis.bold(`  ${t('skillsSync:label.status')}:`))
    console.log(ansis.dim(`    ${t('skillsSync:label.localSkills')}: ${localSkills.length}`))
    console.log(ansis.dim(`    ${t('skillsSync:label.cloudSkills')}: ${cloudSkills.length}`))
    console.log(ansis.dim(`    ${t('skillsSync:label.lastSync')}: ${new Date(syncState.lastGlobalSync).toLocaleString()}`))

    // Count sync states
    const states = Object.values(syncState.skills)
    const synced = states.filter(s => s.status === 'synced').length
    const localAhead = states.filter(s => s.status === 'local_ahead').length
    const remoteAhead = states.filter(s => s.status === 'remote_ahead').length
    const conflicts = states.filter(s => s.status === 'conflict').length
    const localOnly = states.filter(s => s.status === 'local_only').length
    const remoteOnly = states.filter(s => s.status === 'remote_only').length

    console.log('')
    console.log(ansis.bold(`  ${t('skillsSync:label.syncStates')}:`))
    if (synced > 0)
      console.log(ansis.green(`    ✓ ${t('skillsSync:status.synced')}: ${synced}`))
    if (localAhead > 0)
      console.log(ansis.yellow(`    ↑ ${t('skillsSync:status.localAhead')}: ${localAhead}`))
    if (remoteAhead > 0)
      console.log(ansis.yellow(`    ↓ ${t('skillsSync:status.remoteAhead')}: ${remoteAhead}`))
    if (conflicts > 0)
      console.log(ansis.red(`    ⚠ ${t('skillsSync:status.conflict')}: ${conflicts}`))
    if (localOnly > 0)
      console.log(ansis.green(`    ⊕ ${t('skillsSync:status.localOnly')}: ${localOnly}`))
    if (remoteOnly > 0)
      console.log(ansis.green(`    ⊖ ${t('skillsSync:status.remoteOnly')}: ${remoteOnly}`))

    console.log('')
  }
  catch (error) {
    console.warn(ansis.yellow(`  ${t('skillsSync:warning.statusFailed')}: ${error}`))
  }
}

/**
 * Interactive skills sync menu
 */
export async function skillsSyncMenu(options: SkillsSyncOptions = {}): Promise<void> {
  const t = getTranslation(options.lang)

  while (true) {
    console.log('')
    console.log(ansis.bold.cyan('━'.repeat(60)))
    console.log(ansis.bold.cyan(`  ${t('skillsSync:menu.title')}`))
    console.log(ansis.bold.cyan('━'.repeat(60)))
    console.log('')

    const { action } = await inquirer.prompt<{ action: string }>({
      type: 'list',
      name: 'action',
      message: t('skillsSync:menu.prompt'),
      choices: [
        { name: `🔄 ${t('skillsSync:menu.sync')}`, value: 'sync' },
        { name: `↑ ${t('skillsSync:menu.push')}`, value: 'push' },
        { name: `↓ ${t('skillsSync:menu.pull')}`, value: 'pull' },
        { name: `📋 ${t('skillsSync:menu.list')}`, value: 'list' },
        { name: `📊 ${t('skillsSync:menu.status')}`, value: 'status' },
        new inquirer.Separator(),
        { name: `🔙 ${t('skillsSync:menu.back')}`, value: 'back' },
      ],
    })

    if (action === 'back') {
      break
    }

    try {
      switch (action) {
        case 'sync':
          await syncSkills(options)
          break
        case 'push':
          await pushSkillsCommand(options)
          break
        case 'pull':
          await pullSkillsCommand(options)
          break
        case 'list':
          await listCloudSkillsCommand(options)
          break
        case 'status':
          await showSyncStatus(options)
          break
      }
    }
    catch (error) {
      console.error(ansis.red(`\n  ${t('common.error')}: ${error}`))
    }

    // Pause before showing menu again
    await inquirer.prompt({
      type: 'input',
      name: 'continue',
      message: t('common.pressEnterToContinue'),
    })
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Display sync result
 */
function displaySyncResult(result: any, lang?: SupportedLang): void {
  const t = getTranslation(lang)

  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ${t('skillsSync:result.title')}`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  if (result.success) {
    console.log(ansis.bold.green(`  ✓ ${t('skillsSync:result.success')}`))
  }
  else {
    console.log(ansis.bold.red(`  ✗ ${t('skillsSync:result.failed')}`))
    if (result.error) {
      console.log(ansis.red(`    ${result.error}`))
    }
  }

  console.log('')
  console.log(ansis.bold(`  ${t('skillsSync:result.statistics')}:`))
  console.log(ansis.dim(`    ${t('skillsSync:result.total')}: ${result.total}`))
  console.log(ansis.green(`    ${t('skillsSync:result.succeeded')}: ${result.succeeded}`))
  if (result.failed > 0) {
    console.log(ansis.red(`    ${t('skillsSync:result.failed')}: ${result.failed}`))
  }
  if (result.conflicts > 0) {
    console.log(ansis.yellow(`    ${t('skillsSync:result.conflicts')}: ${result.conflicts}`))
  }
  console.log(ansis.green(`    ${t('skillsSync:result.uploaded')}: ${result.uploaded}`))
  console.log(ansis.green(`    ${t('skillsSync:result.downloaded')}: ${result.downloaded}`))
  console.log(ansis.dim(`    ${t('skillsSync:result.skipped')}: ${result.skipped}`))
  console.log(ansis.dim(`    ${t('skillsSync:result.duration')}: ${(result.durationMs / 1000).toFixed(2)}s`))

  // Show detailed results if there are failures or conflicts
  if (result.failed > 0 || result.conflicts > 0) {
    console.log('')
    console.log(ansis.bold(`  ${t('skillsSync:result.details')}:`))

    for (const item of result.results) {
      if (!item.success || item.action === 'conflict') {
        const icon = item.success ? '⚠' : '✗'
        const color = item.success ? ansis.yellow : ansis.red
        console.log(color(`    ${icon} ${item.skillName}`))
        if (item.error) {
          console.log(ansis.dim(`      ${item.error}`))
        }
        if (item.action === 'conflict') {
          console.log(ansis.dim(`      ${t('skillsSync:result.conflictHint')}`))
        }
      }
    }
  }

  console.log('')
}

/**
 * Get privacy badge
 */
function getPrivacyBadge(privacy: string): string {
  switch (privacy) {
    case 'private':
      return ansis.bgRed.white(' PRIVATE ')
    case 'team':
      return ansis.bgYellow.black(' TEAM ')
    case 'public':
      return ansis.bgGreen.white(' PUBLIC ')
    default:
      return ''
  }
}
