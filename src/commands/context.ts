/**
 * Context Command
 *
 * View and manage hierarchical context loading.
 *
 * @module commands/context
 */

import ansis from 'ansis'
import { contextLoader } from '../brain/context-loader'
import type { Task } from '../brain/orchestrator-types'

export interface ContextOptions {
  show?: boolean
  layers?: string
  task?: string
  clear?: boolean
}

/**
 * Context command handler
 */
export async function contextCommand(options: ContextOptions = {}): Promise<void> {
  // Clear cache
  if (options.clear) {
    contextLoader.clearCache()
    console.log(ansis.green('\n✅ Context cache cleared\n'))
    return
  }

  // Show context
  if (options.show) {
    const layers = options.layers
      ? options.layers.split(',').map(l => l.trim() as any)
      : ['project', 'domain', 'task', 'execution']

    // Create mock task if task name provided
    let task: Task | undefined
    if (options.task) {
      task = {
        id: 'preview',
        name: options.task,
        description: `Preview context for: ${options.task}`,
        input: {},
        metadata: {},
      }
    }

    console.log(ansis.cyan.bold('\n🔍 Loading Context...\n'))

    const context = await contextLoader.load({
      projectRoot: process.cwd(),
      layers,
      task,
    })

    console.log(ansis.white(`Total Size: ${formatBytes(context.totalSize)}`))
    console.log(ansis.white(`Layers: ${context.layers.size}`))
    console.log()

    // Show each layer
    for (const [layer, entries] of context.layers) {
      console.log(ansis.cyan.bold(`📁 ${layer.toUpperCase()}`))
      console.log(ansis.gray(`   ${entries.length} entries`))

      for (const entry of entries) {
        const size = formatBytes(entry.content.length)
        console.log(ansis.white(`   • ${entry.source} (${size})`))
      }

      console.log()
    }

    // Show formatted output
    if (context.totalSize < 10_000) {
      console.log(ansis.cyan.bold('📄 Formatted Context:\n'))
      console.log(ansis.gray('─'.repeat(60)))
      console.log(contextLoader.formatForLLM(context))
      console.log(ansis.gray('─'.repeat(60)))
      console.log()
    }
    else {
      console.log(ansis.yellow('⚠️  Context too large to display (use --layers to filter)\n'))
    }

    return
  }

  // Default: show help
  console.log(ansis.cyan.bold('\n🔍 Context Management\n'))
  console.log(ansis.white('Usage:'))
  console.log(ansis.gray('  ccjk context --show                    # Show all context layers'))
  console.log(ansis.gray('  ccjk context --show --layers project   # Show specific layers'))
  console.log(ansis.gray('  ccjk context --show --task "api work"  # Preview context for task'))
  console.log(ansis.gray('  ccjk context --clear                   # Clear context cache'))
  console.log()
  console.log(ansis.white('Available Layers:'))
  console.log(ansis.gray('  • project    - README, CLAUDE.md, package.json, tsconfig.json'))
  console.log(ansis.gray('  • domain     - Domain-specific files (api, ui, database, etc.)'))
  console.log(ansis.gray('  • task       - Task description and input'))
  console.log(ansis.gray('  • execution  - Previous outputs and errors'))
  console.log()
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
