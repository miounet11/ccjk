import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { x } from 'tinyexec'
import { getClaudeMemoryPath } from '../utils/memory-paths.js'
import { memoryCheck } from '../health/checks/memory-check.js'
import { inspectMemoryFiles, syncMemoryFiles } from '../utils/memory-sync.js'

interface MemoryOptions {
  status?: boolean
  doctor?: boolean
  view?: boolean
  edit?: boolean
  sync?: boolean
  project?: string
}

function formatTimestamp(timestampMs: number): string {
  if (!timestampMs) {
    return 'never'
  }

  return new Date(timestampMs).toISOString()
}

function formatSize(sizeBytes: number): string {
  return `${(sizeBytes / 1024).toFixed(2)} KB`
}

function describeSyncState(syncState: ReturnType<typeof inspectMemoryFiles>['syncState']): string {
  switch (syncState) {
    case 'in-sync':
      return 'Claude and CCJK memory are in sync'
    case 'claude-only':
      return 'Only Claude memory has content'
    case 'ccjk-only':
      return 'Only CCJK memory has content'
    case 'claude-newer':
      return 'Claude memory is newer than the CCJK mirror'
    case 'ccjk-newer':
      return 'CCJK mirror is newer than Claude memory'
    case 'empty':
      return 'No memory content found'
  }
}

async function showMemoryStatus(projectPath?: string): Promise<void> {
  const result = inspectMemoryFiles({ projectPath })

  console.log(ansis.cyan.bold('\n📊 Memory Status'))
  console.log(ansis.gray(`Scope:   ${result.scope}`))
  console.log(ansis.gray(`State:   ${describeSyncState(result.syncState)}`))
  console.log(ansis.gray(`Source:  ${result.source}`))
  console.log(ansis.gray(`Claude:  ${result.paths.claude}`))
  console.log(ansis.gray(`CCJK:    ${result.paths.ccjk}`))
  console.log('')
  console.log(ansis.bold('Claude Memory'))
  console.log(ansis.gray(`  Exists:   ${result.snapshots.claude.exists ? 'yes' : 'no'}`))
  console.log(ansis.gray(`  Content:  ${result.snapshots.claude.hasContent ? 'yes' : 'no'}`))
  console.log(ansis.gray(`  Size:     ${formatSize(result.snapshots.claude.sizeBytes)}`))
  console.log(ansis.gray(`  Updated:  ${formatTimestamp(result.snapshots.claude.mtimeMs)}`))
  console.log(ansis.bold('\nCCJK Mirror'))
  console.log(ansis.gray(`  Exists:   ${result.snapshots.ccjk.exists ? 'yes' : 'no'}`))
  console.log(ansis.gray(`  Content:  ${result.snapshots.ccjk.hasContent ? 'yes' : 'no'}`))
  console.log(ansis.gray(`  Size:     ${formatSize(result.snapshots.ccjk.sizeBytes)}`))
  console.log(ansis.gray(`  Updated:  ${formatTimestamp(result.snapshots.ccjk.mtimeMs)}`))

  if (result.parseMode === 'structured') {
    console.log(ansis.bold('\nStructured Summary'))
    console.log(ansis.gray(`  Entries:    ${result.entryCount}`))
    console.log(ansis.gray(`  Facts:      ${result.factCount}`))
    console.log(ansis.gray(`  Patterns:   ${result.patternCount}`))
    console.log(ansis.gray(`  Decisions:  ${result.decisionCount}`))
  }
  else if (result.parseMode === 'freeform') {
    console.log(ansis.bold('\nStructured Summary'))
    console.log(ansis.gray('  Freeform notes detected; no structured headings parsed'))
  }

  console.log('')
}

async function runMemoryDoctor(projectPath?: string): Promise<void> {
  const result = inspectMemoryFiles({ projectPath })
  const health = await memoryCheck.check()

  console.log(ansis.cyan.bold('\n🩺 Memory Doctor'))
  console.log(ansis.gray(`Project state: ${describeSyncState(result.syncState)}`))
  console.log(ansis.gray(`Health score:  ${health.score}/100 (${health.status})`))
  console.log(ansis.gray(`Summary:       ${health.message}`))

  if (health.details && health.details.length > 0) {
    console.log(ansis.bold('\nHealth Details'))
    for (const detail of health.details) {
      console.log(ansis.gray(`  ${detail}`))
    }
  }

  const recommendations: string[] = []

  if (result.syncState === 'claude-newer' || result.syncState === 'ccjk-newer' || result.syncState === 'claude-only' || result.syncState === 'ccjk-only') {
    recommendations.push('Run `ccjk memory --sync` to reconcile Claude memory and the CCJK mirror')
  }

  if (result.syncState === 'empty') {
    recommendations.push('Add project memory with `ccjk memory --edit` before relying on sync or doctor checks')
  }

  if (health.fix) {
    recommendations.push(health.fix)
  }

  if (recommendations.length > 0) {
    console.log(ansis.bold('\nRecommendations'))
    for (const recommendation of recommendations) {
      console.log(ansis.gray(`  - ${recommendation}`))
    }
  }

  if (health.command) {
    console.log(ansis.bold('\nSuggested Command'))
    console.log(ansis.gray(`  ${health.command}`))
  }

  console.log('')
}

/**
 * Get memory file path for current or specified project
 */
function getMemoryPath(projectPath?: string): string {
  return getClaudeMemoryPath(projectPath)
}

/**
 * Read memory content
 */
function readMemory(memoryPath: string): string {
  if (!existsSync(memoryPath)) {
    return ''
  }
  return readFileSync(memoryPath, 'utf-8')
}

/**
 * Write memory content
 */
function writeMemory(memoryPath: string, content: string): void {
  const dir = join(memoryPath, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(memoryPath, content, 'utf-8')
}

/**
 * Display memory content with syntax highlighting
 */
function displayMemory(content: string, title: string): void {
  console.log(ansis.cyan.bold(`\n${'='.repeat(60)}`))
  console.log(ansis.cyan.bold(`  ${title}`))
  console.log(ansis.cyan.bold(`${'='.repeat(60)}\n`))

  if (!content.trim()) {
    console.log(ansis.gray('  (Empty memory)'))
  }
  else {
    // Simple syntax highlighting for markdown
    const lines = content.split('\n')
    lines.forEach((line) => {
      if (line.startsWith('# ')) {
        console.log(ansis.yellow.bold(line))
      }
      else if (line.startsWith('## ')) {
        console.log(ansis.green.bold(line))
      }
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        console.log(ansis.blue(line))
      }
      else if (line.startsWith('```')) {
        console.log(ansis.magenta(line))
      }
      else {
        console.log(line)
      }
    })
  }

  console.log(ansis.cyan.bold(`\n${'='.repeat(60)}\n`))
}

/**
 * Interactive memory editor
 */
async function editMemoryInteractive(memoryPath: string): Promise<void> {
  const currentContent = readMemory(memoryPath)

  console.log(ansis.yellow('\nCurrent memory content:'))
  displayMemory(currentContent, 'Current Memory')

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Append new content', value: 'append' },
        { name: 'Replace entire content', value: 'replace' },
        { name: 'Clear memory', value: 'clear' },
        { name: 'Open in editor', value: 'editor' },
        { name: 'Cancel', value: 'cancel' },
      ],
    },
  ])

  if (action === 'cancel') {
    console.log(ansis.gray('Cancelled.'))
    return
  }

  if (action === 'clear') {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Are you sure you want to clear all memory?',
        default: false,
      },
    ])

    if (confirmed) {
      writeMemory(memoryPath, '')
      console.log(ansis.green('✓ Memory cleared'))
    }
    return
  }

  if (action === 'editor') {
    const editor = process.env.EDITOR || 'vim'
    try {
      await x(editor, [memoryPath], { nodeOptions: { stdio: 'inherit' } })
      console.log(ansis.green('✓ Memory updated'))
    }
    catch (error) {
      console.error(ansis.red('Failed to open editor:'), error)
    }
    return
  }

  const { newContent } = await inquirer.prompt([
    {
      type: 'input',
      name: 'newContent',
      message: 'Enter content (use \\n for line breaks):',
      default: '',
    },
  ])

  if (!newContent.trim()) {
    console.log(ansis.gray('No content entered.'))
    return
  }

  const formattedContent = newContent.replace(/\\n/g, '\n')

  if (action === 'append') {
    const updated = currentContent
      ? `${currentContent}\n\n${formattedContent}`
      : formattedContent
    writeMemory(memoryPath, updated)
    console.log(ansis.green('✓ Content appended to memory'))
  }
  else if (action === 'replace') {
    writeMemory(memoryPath, formattedContent)
    console.log(ansis.green('✓ Memory replaced'))
  }
}

/**
 * Sync memory using AutoMemoryBridge
 */
async function syncMemory(projectPath?: string): Promise<void> {
  console.log(ansis.cyan('\nSyncing memory with AutoMemoryBridge...'))

  try {
    const result = syncMemoryFiles({ projectPath })

    if (result.source === 'none') {
      console.log(ansis.yellow('⚠ No memory content found in Claude or CCJK storage'))
      console.log(ansis.gray(`  Claude: ${result.paths.claude}`))
      console.log(ansis.gray(`  CCJK:   ${result.paths.ccjk}`))
      return
    }

    const sourceLabel = result.source === 'already-synced'
      ? 'Claude and CCJK memory'
      : `${result.source === 'claude' ? 'Claude' : 'CCJK'} memory`
    const targetLabel = result.updatedTargets.length === 0
      ? 'already in sync'
      : `updated ${result.updatedTargets.map(target => target === 'claude' ? 'Claude' : 'CCJK').join(', ')}`

    console.log(ansis.green(`✓ Synced ${sourceLabel} (${targetLabel})`))
    console.log(ansis.gray(`  Claude: ${result.paths.claude}`))
    console.log(ansis.gray(`  CCJK:   ${result.paths.ccjk}`))

    if (result.parseMode === 'structured') {
      console.log(ansis.gray(
        `  Structured entries: ${result.entryCount} `
        + `(facts ${result.factCount}, patterns ${result.patternCount}, decisions ${result.decisionCount})`,
      ))
    }
    else if (result.parseMode === 'freeform') {
      console.log(ansis.gray('  Synced freeform notes (no structured headings detected)'))
    }
  }
  catch (error) {
    console.error(ansis.red('Failed to sync memory:'), error)
    throw error
  }
}

/**
 * Main memory command handler
 */
export async function memoryCommand(options: MemoryOptions): Promise<void> {
  const memoryPath = getMemoryPath(options.project)

  // Handle direct flags
  if (options.status) {
    await showMemoryStatus(options.project)
    return
  }

  if (options.doctor) {
    await runMemoryDoctor(options.project)
    return
  }

  if (options.view) {
    const content = readMemory(memoryPath)
    const title = options.project
      ? `Project Memory: ${options.project}`
      : 'Global Memory'
    displayMemory(content, title)
    return
  }

  if (options.edit) {
    await editMemoryInteractive(memoryPath)
    return
  }

  if (options.sync) {
    await syncMemory(options.project)
    return
  }

  // Interactive mode
  console.log(ansis.cyan.bold('\n📝 Memory Management'))
  console.log(ansis.gray(`Memory path: ${memoryPath}\n`))

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '📊 Status', value: 'status' },
        { name: '🩺 Doctor', value: 'doctor' },
        { name: '👁️  View memory', value: 'view' },
        { name: '✏️  Edit memory', value: 'edit' },
        { name: '🔄 Sync memory (AutoMemoryBridge)', value: 'sync' },
        { name: '📊 Memory stats', value: 'stats' },
        { name: '🚪 Exit', value: 'exit' },
      ],
    },
  ])

  switch (action) {
    case 'status':
      await showMemoryStatus(options.project)
      break

    case 'doctor':
      await runMemoryDoctor(options.project)
      break

    case 'view': {
      const content = readMemory(memoryPath)
      const title = options.project
        ? `Project Memory: ${options.project}`
        : 'Global Memory'
      displayMemory(content, title)
      break
    }

    case 'edit':
      await editMemoryInteractive(memoryPath)
      break

    case 'sync':
      await syncMemory(options.project)
      break

    case 'stats': {
      const content = readMemory(memoryPath)
      const lines = content.split('\n').length
      const words = content.split(/\s+/).filter(w => w.length > 0).length
      const chars = content.length

      console.log(ansis.cyan('\n📊 Memory Statistics:'))
      console.log(ansis.gray(`  Lines: ${lines}`))
      console.log(ansis.gray(`  Words: ${words}`))
      console.log(ansis.gray(`  Characters: ${chars}`))
      console.log(ansis.gray(`  Size: ${(chars / 1024).toFixed(2)} KB\n`))
      break
    }

    case 'exit':
      console.log(ansis.gray('Goodbye!'))
      break
  }
}
