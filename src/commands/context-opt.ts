/**
 * Context Optimization CLI Commands
 *
 * Provides user-facing commands for context optimization:
 * - stats: View compression statistics
 * - search: Search memory tree
 * - decay: Run confidence decay
 * - config: Show configuration
 */

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { DecayScheduler } from '../context/decay-scheduler.js'
import { MemoryTree } from '../context/memory-tree.js'

export async function contextOptStats(): Promise<void> {
  if (process.env.CCJK_MEMORY_TREE !== 'true') {
    console.error('❌ Memory tree not enabled. Set CCJK_MEMORY_TREE=true')
    process.exit(1)
  }

  try {
    const tree = new MemoryTree()
    const stats = await tree.getStats()

    console.log('\n📊 Memory Tree Statistics\n')
    console.log(`Total Nodes: ${stats.totalNodes}`)
    console.log(`Average Confidence: ${stats.avgConfidence.toFixed(2)}\n`)

    console.log('By Confidence:')
    console.log(`  🟢 Green (≥0.8):  ${stats.greenLeaves}`)
    console.log(`  🟡 Yellow (0.5-0.8): ${stats.yellowLeaves}`)
    console.log(`  🟤 Brown (0.3-0.5):  ${stats.brownLeaves}`)
    console.log(`  ⚫ Archived (<0.3):  ${stats.archived}\n`)

    console.log('By Priority:')
    console.log(`  P0 (Critical): ${stats.byPriority.P0 || 0}`)
    console.log(`  P1 (Important): ${stats.byPriority.P1 || 0}`)
    console.log(`  P2 (Routine): ${stats.byPriority.P2 || 0}`)

    tree.close()
  }
  catch (err) {
    console.error('❌ Failed to get stats:', err)
    process.exit(1)
  }
}

export async function contextOptSearch(query: string, options: { topK?: string } = {}): Promise<void> {
  if (process.env.CCJK_MEMORY_TREE !== 'true') {
    console.error('❌ Memory tree not enabled. Set CCJK_MEMORY_TREE=true')
    process.exit(1)
  }

  try {
    const tree = new MemoryTree()
    const topK = parseInt(options.topK || '5')
    const results = await tree.search(query, { limit: topK })

    if (results.length === 0) {
      console.log('\n🔍 No results found\n')
      tree.close()
      return
    }

    console.log(`\n🔍 Found ${results.length} results:\n`)
    results.forEach((node, i) => {
      console.log(`${i + 1}. [${node.priority}] Confidence: ${node.confidence.toFixed(2)} | Score: ${node.score.toFixed(2)}`)
      console.log(`   ${node.summary.slice(0, 100)}${node.summary.length > 100 ? '...' : ''}`)
      console.log(`   Accessed: ${node.accessCount} times | Last: ${node.lastAccessed.toISOString()}\n`)
    })

    tree.close()
  }
  catch (err) {
    console.error('❌ Search failed:', err)
    process.exit(1)
  }
}

export async function contextOptDecay(): Promise<void> {
  if (process.env.CCJK_MEMORY_TREE !== 'true') {
    console.error('❌ Memory tree not enabled. Set CCJK_MEMORY_TREE=true')
    process.exit(1)
  }

  try {
    const tree = new MemoryTree()
    const threshold = 0.3
    const scheduler = new DecayScheduler(tree, threshold)

    console.log('\n⚙️  Running decay...\n')
    const result = await scheduler.runNow()
    console.log(`✅ Decayed: ${result.decayed} nodes`)
    console.log(`📦 Archived: ${result.archived} nodes\n`)
    console.log('Details:')
    Object.entries(result.details).forEach(([priority, count]) => {
      console.log(`  ${priority}: ${count} nodes`)
    })
    tree.close()
  }
  catch (err) {
    console.error('❌ Decay failed:', err)
    process.exit(1)
  }
}

export async function contextOptConfig(): Promise<void> {
  console.log('\n⚙️  Context Optimization Configuration\n')
  console.log(`CCJK_CONTEXT_OPTIMIZATION: ${process.env.CCJK_CONTEXT_OPTIMIZATION || 'false'}`)
  console.log(`CCJK_TOOL_COMPRESSION: ${process.env.CCJK_TOOL_COMPRESSION || 'true'}`)
  console.log(`CCJK_SEMANTIC_COMPRESSION: ${process.env.CCJK_SEMANTIC_COMPRESSION || 'false'}`)
  console.log(`CCJK_MEMORY_TREE: ${process.env.CCJK_MEMORY_TREE || 'false'}`)
  console.log(`CCJK_MAX_CONTEXT_TOKENS: ${process.env.CCJK_MAX_CONTEXT_TOKENS || '150000'}`)
  console.log(`CCJK_COMPRESSION_TIMEOUT: ${process.env.CCJK_COMPRESSION_TIMEOUT || '50'}ms\n`)

  const ccjkDir = process.env.ZCF_CONFIG_DIR || join(homedir(), '.ccjk')
  const dbPath = join(ccjkDir, 'memory.db')
  const dbExists = existsSync(dbPath)

  console.log(`Memory DB: ${dbPath}`)
  console.log(`DB Exists: ${dbExists ? '✅' : '❌'}\n`)
}
