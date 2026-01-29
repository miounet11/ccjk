/**
 * Memory Management CLI Command
 */

import ansis from 'ansis'
import { writeFileSync, readFileSync } from 'node:fs'
import inquirer from 'inquirer'
import { MemoryManager } from '../memory'
import type { MemoryEntry, MemoryQuery } from '../types/memory'
import { i18n, initI18n } from '../i18n'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'

/**
 * Memory command options
 */
export interface MemoryCommandOptions {
  action?: 'list' | 'search' | 'add' | 'delete' | 'stats' | 'export' | 'import' | 'clear'
  query?: string
  type?: string
  scope?: string
  importance?: string
  tags?: string
  project?: string
  file?: string
  configLang?: 'zh-CN' | 'en'
}

/**
 * Main memory command
 */
export async function memory(options: MemoryCommandOptions = {}): Promise<void> {
  try {
    await initI18n(options.configLang || 'zh-CN')
    const isZh = i18n.language === 'zh-CN'

    const manager = new MemoryManager()
    await manager.initialize()

    if (!options.action) {
      await showMemoryMenu(manager, isZh)
    }
    else {
      await executeAction(manager, options, isZh)
    }

    manager.save()
  }
  catch (error) {
    if (handleExitPromptError(error))
      return
    handleGeneralError(error)
  }
}

/**
 * Show interactive memory menu
 */
async function showMemoryMenu(manager: MemoryManager, isZh: boolean): Promise<void> {
  const choices = [
    { name: isZh ? '📋 列出所有记忆' : '📋 List all memories', value: 'list' },
    { name: isZh ? '🔍 搜索记忆' : '🔍 Search memories', value: 'search' },
    { name: isZh ? '➕ 添加记忆' : '➕ Add memory', value: 'add' },
    { name: isZh ? '📊 查看统计' : '📊 View statistics', value: 'stats' },
    { name: isZh ? '📤 导出记忆' : '📤 Export memories', value: 'export' },
    { name: isZh ? '📥 导入记忆' : '📥 Import memories', value: 'import' },
    { name: isZh ? '🗑️  清空记忆' : '🗑️  Clear memories', value: 'clear' },
    { name: isZh ? '🔙 返回' : '🔙 Back', value: 'back' },
  ]

  const { action } = await inquirer.prompt<{ action: string }>({
    type: 'list',
    name: 'action',
    message: isZh ? '选择操作:' : 'Select action:',
    choices,
  })

  if (action === 'back')
    return

  await executeAction(manager, { action: action as any }, isZh)
}

/**
 * Execute a memory action
 */
async function executeAction(
  manager: MemoryManager,
  options: MemoryCommandOptions,
  isZh: boolean,
): Promise<void> {
  switch (options.action) {
    case 'list':
      await listMemories(manager, isZh)
      break
    case 'search':
      await searchMemories(manager, options, isZh)
      break
    case 'add':
      await addMemory(manager, options, isZh)
      break
    case 'delete':
      await deleteMemory(manager, options, isZh)
      break
    case 'stats':
      await showStats(manager, isZh)
      break
    case 'export':
      await exportMemories(manager, options, isZh)
      break
    case 'import':
      await importMemories(manager, options, isZh)
      break
    case 'clear':
      await clearMemories(manager, isZh)
      break
    default:
      console.log(ansis.red(isZh ? '未知操作' : 'Unknown action'))
  }
}

/**
 * List all memories
 */
async function listMemories(manager: MemoryManager, isZh: boolean): Promise<void> {
  const memories = manager.search('', false)

  if (memories.length === 0) {
    console.log(ansis.yellow(isZh ? '\n没有找到记忆' : '\nNo memories found'))
    return
  }

  console.log(ansis.bold.cyan(`\n${isZh ? '记忆列表' : 'Memory List'} (${memories.length})`))
  console.log(ansis.dim('─'.repeat(80)))

  for (const memory of memories.slice(0, 20)) {
    printMemory(memory, isZh)
  }

  if (memories.length > 20) {
    console.log(ansis.dim(`\n... ${isZh ? '还有' : 'and'} ${memories.length - 20} ${isZh ? '条记忆' : 'more memories'}`))
  }
}

/**
 * Search memories
 */
async function searchMemories(
  manager: MemoryManager,
  options: MemoryCommandOptions,
  isZh: boolean,
): Promise<void> {
  let query = options.query

  if (!query) {
    const { searchQuery } = await inquirer.prompt<{ searchQuery: string }>({
      type: 'input',
      name: 'searchQuery',
      message: isZh ? '输入搜索关键词:' : 'Enter search query:',
    })
    query = searchQuery
  }

  if (!query) {
    console.log(ansis.yellow(isZh ? '搜索已取消' : 'Search cancelled'))
    return
  }

  const memoryQuery: MemoryQuery = {
    text: query,
    limit: 10,
  }

  if (options.type)
    memoryQuery.types = [options.type as any]
  if (options.scope)
    memoryQuery.scopes = [options.scope as any]
  if (options.tags)
    memoryQuery.tags = options.tags.split(',')
  if (options.project)
    memoryQuery.project = options.project

  const results = await manager.retrieve(memoryQuery)

  if (results.length === 0) {
    console.log(ansis.yellow(isZh ? '\n没有找到匹配的记忆' : '\nNo matching memories found'))
    return
  }

  console.log(ansis.bold.cyan(`\n${isZh ? '搜索结果' : 'Search Results'} (${results.length})`))
  console.log(ansis.dim('─'.repeat(80)))

  for (const { entry, score } of results) {
    console.log(ansis.green(`\n[${(score * 100).toFixed(1)}% ${isZh ? '相关' : 'relevant'}]`))
    printMemory(entry, isZh)
  }
}

/**
 * Add a new memory
 */
async function addMemory(
  manager: MemoryManager,
  options: MemoryCommandOptions,
  isZh: boolean,
): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'content',
      message: isZh ? '记忆内容:' : 'Memory content:',
      validate: (input: string) => input.length > 0 || (isZh ? '内容不能为空' : 'Content cannot be empty'),
    },
    {
      type: 'list',
      name: 'type',
      message: isZh ? '类型:' : 'Type:',
      choices: [
        { name: isZh ? '决策 (Decision)' : 'Decision', value: 'decision' },
        { name: isZh ? '模式 (Pattern)' : 'Pattern', value: 'pattern' },
        { name: isZh ? '偏好 (Preference)' : 'Preference', value: 'preference' },
        { name: isZh ? '上下文 (Context)' : 'Context', value: 'context' },
        { name: isZh ? '学习 (Learning)' : 'Learning', value: 'learning' },
        { name: isZh ? '错误 (Error)' : 'Error', value: 'error' },
        { name: isZh ? '工作流 (Workflow)' : 'Workflow', value: 'workflow' },
      ],
    },
    {
      type: 'list',
      name: 'importance',
      message: isZh ? '重要性:' : 'Importance:',
      choices: [
        { name: isZh ? '关键 (Critical)' : 'Critical', value: 'critical' },
        { name: isZh ? '高 (High)' : 'High', value: 'high' },
        { name: isZh ? '中 (Medium)' : 'Medium', value: 'medium' },
        { name: isZh ? '低 (Low)' : 'Low', value: 'low' },
      ],
    },
    {
      type: 'list',
      name: 'scope',
      message: isZh ? '作用域:' : 'Scope:',
      choices: [
        { name: isZh ? '全局 (Global)' : 'Global', value: 'global' },
        { name: isZh ? '项目 (Project)' : 'Project', value: 'project' },
        { name: isZh ? '会话 (Session)' : 'Session', value: 'session' },
      ],
    },
    {
      type: 'input',
      name: 'tags',
      message: isZh ? '标签 (逗号分隔):' : 'Tags (comma-separated):',
    },
    {
      type: 'input',
      name: 'project',
      message: isZh ? '项目名称 (可选):' : 'Project name (optional):',
    },
  ])

  const entry = await manager.store(
    answers.content,
    answers.type,
    answers.importance,
    answers.scope,
    answers.tags ? answers.tags.split(',').map((t: string) => t.trim()) : [],
    {
      sessionId: `cli_${Date.now()}`,
      timestamp: Date.now(),
      project: answers.project || undefined,
    },
  )

  console.log(ansis.green(`\n✓ ${isZh ? '记忆已添加' : 'Memory added'}: ${entry.id}`))
  printMemory(entry, isZh)
}

/**
 * Delete a memory
 */
async function deleteMemory(
  manager: MemoryManager,
  options: MemoryCommandOptions,
  isZh: boolean,
): Promise<void> {
  const { memoryId } = await inquirer.prompt<{ memoryId: string }>({
    type: 'input',
    name: 'memoryId',
    message: isZh ? '输入要删除的记忆ID:' : 'Enter memory ID to delete:',
  })

  if (!memoryId) {
    console.log(ansis.yellow(isZh ? '删除已取消' : 'Deletion cancelled'))
    return
  }

  const memory = manager.get(memoryId)
  if (!memory) {
    console.log(ansis.red(isZh ? '\n记忆未找到' : '\nMemory not found'))
    return
  }

  console.log(ansis.yellow('\n' + (isZh ? '将要删除:' : 'About to delete:')))
  printMemory(memory, isZh)

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: isZh ? '确认删除?' : 'Confirm deletion?',
    default: false,
  })

  if (confirm) {
    manager.delete(memoryId)
    console.log(ansis.green(`\n✓ ${isZh ? '记忆已删除' : 'Memory deleted'}`))
  }
  else {
    console.log(ansis.yellow(isZh ? '删除已取消' : 'Deletion cancelled'))
  }
}

/**
 * Show memory statistics
 */
async function showStats(manager: MemoryManager, isZh: boolean): Promise<void> {
  const stats = manager.getStats()

  console.log(ansis.bold.cyan(`\n${isZh ? '记忆统计' : 'Memory Statistics'}`))
  console.log(ansis.dim('─'.repeat(80)))

  console.log(`\n${isZh ? '总计' : 'Total'}: ${ansis.bold(stats.totalCount.toString())}`)
  console.log(`${isZh ? '已归档' : 'Archived'}: ${stats.archivedCount}`)
  console.log(`${isZh ? '存储大小' : 'Storage size'}: ${(stats.storageSizeBytes / 1024).toFixed(2)} KB`)

  console.log(`\n${isZh ? '按类型' : 'By Type'}:`)
  for (const [type, count] of Object.entries(stats.byType)) {
    if (count > 0) {
      console.log(`  ${type}: ${count}`)
    }
  }

  console.log(`\n${isZh ? '按作用域' : 'By Scope'}:`)
  for (const [scope, count] of Object.entries(stats.byScope)) {
    if (count > 0) {
      console.log(`  ${scope}: ${count}`)
    }
  }

  console.log(`\n${isZh ? '按重要性' : 'By Importance'}:`)
  for (const [importance, count] of Object.entries(stats.byImportance)) {
    if (count > 0) {
      console.log(`  ${importance}: ${count}`)
    }
  }
}

/**
 * Export memories to file
 */
async function exportMemories(
  manager: MemoryManager,
  options: MemoryCommandOptions,
  isZh: boolean,
): Promise<void> {
  let filename = options.file

  if (!filename) {
    const { exportFile } = await inquirer.prompt<{ exportFile: string }>({
      type: 'input',
      name: 'exportFile',
      message: isZh ? '导出文件名:' : 'Export filename:',
      default: `memories-${Date.now()}.json`,
    })
    filename = exportFile
  }

  if (!filename) {
    console.log(ansis.yellow(isZh ? '导出已取消' : 'Export cancelled'))
    return
  }

  const data = manager.export()
  writeFileSync(filename, JSON.stringify(data, null, 2))

  console.log(ansis.green(`\n✓ ${isZh ? '记忆已导出到' : 'Memories exported to'}: ${filename}`))
  console.log(`${isZh ? '导出了' : 'Exported'} ${data.memories.length} ${isZh ? '条记忆' : 'memories'}`)}

/**
 * Import memories from file
 */
async function importMemories(
  manager: MemoryManager,
  options: MemoryCommandOptions,
  isZh: boolean,
): Promise<void> {
  let filename = options.file

  if (!filename) {
    const { importFile } = await inquirer.prompt<{ importFile: string }>({
      type: 'input',
      name: 'importFile',
      message: isZh ? '导入文件名:' : 'Import filename:',
    })
    filename = importFile
  }

  if (!filename) {
    console.log(ansis.yellow(isZh ? '导入已取消' : 'Import cancelled'))
    return
  }

  try {
    const data = JSON.parse(readFileSync(filename, 'utf-8'))

    const { merge } = await inquirer.prompt<{ merge: boolean }>({
      type: 'confirm',
      name: 'merge',
      message: isZh ? '合并到现有记忆?' : 'Merge with existing memories?',
      default: true,
    })

    manager.import(data, merge)

    console.log(ansis.green(`\n✓ ${isZh ? '记忆已导入' : 'Memories imported'}`))
    console.log(`${isZh ? '导入了' : 'Imported'} ${data.memories.length} ${isZh ? '条记忆' : 'memories'}`)  }
  catch (error) {
    console.log(ansis.red(`\n${isZh ? '导入失败' : 'Import failed'}: ${error}`))
  }
}

/**
 * Clear all memories
 */
async function clearMemories(manager: MemoryManager, isZh: boolean): Promise<void> {
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: ansis.red(isZh ? '确认清空所有记忆? 此操作不可撤销!' : 'Confirm clearing all memories? This cannot be undone!'),
    default: false,
  })

  if (confirm) {
    manager.clear()
    console.log(ansis.green(`\n✓ ${isZh ? '所有记忆已清空' : 'All memories cleared'}`))
  }
  else {
    console.log(ansis.yellow(isZh ? '操作已取消' : 'Operation cancelled'))
  }
}

/**
 * Print a memory entry
 */
function printMemory(memory: MemoryEntry, isZh: boolean): void {
  console.log(`\n${ansis.bold(memory.summary)}`)
  console.log(ansis.dim(`ID: ${memory.id}`))
  console.log(`${isZh ? '类型' : 'Type'}: ${ansis.cyan(memory.type)} | ${isZh ? '重要性' : 'Importance'}: ${ansis.yellow(memory.importance)} | ${isZh ? '作用域' : 'Scope'}: ${ansis.blue(memory.scope)}`)
  if (memory.tags.length > 0) {
    console.log(`${isZh ? '标签' : 'Tags'}: ${memory.tags.map(t => ansis.magenta(t)).join(', ')}`)
  }
  if (memory.source.project) {
    console.log(`${isZh ? '项目' : 'Project'}: ${memory.source.project}`)
  }
  console.log(ansis.dim(`${isZh ? '访问次数' : 'Access count'}: ${memory.accessCount} | ${isZh ? '最后访问' : 'Last accessed'}: ${new Date(memory.lastAccessed).toLocaleString()}`))
}
