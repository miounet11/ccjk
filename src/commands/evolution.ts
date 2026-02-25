/**
 * Evolution Layer Commands
 *
 * Provides CLI commands for interacting with the Evolution Layer:
 * - List top capabilities (genes)
 * - Search for solutions
 * - View gene details
 * - Publish new genes
 */

import ansis from 'ansis'
import { A2AClient } from '../../packages/ccjk-evolution/dist/index.mjs'
import { getCloudBaseUrl } from '../constants'
import { i18n } from '../i18n'

interface Gene {
  id: string
  type: string
  sha256: string
  problem: {
    signature: string
    context: string[]
  }
  solution: {
    strategy: string
    code?: string
    steps: string[]
  }
  quality: {
    gdi: number
    usageCount: number
    successRate: number
    avgTime: number
  }
  metadata?: {
    author?: string
    createdAt?: string
    tags?: string[]
  }
}

/**
 * Handle evolution command (for cli-lazy.ts)
 */
export async function handleEvolutionCommand(
  action: string | undefined,
  args: unknown[],
  options: any,
): Promise<void> {
  try {
    const client = new A2AClient(getCloudBaseUrl('MAIN'))
    // Register once per command invocation
    await client.hello({
      id: 'ccjk-cli',
      name: 'ccjk',
      version: '1.0.0',
      capabilities: ['fetch', 'report', 'publish'],
    })

    switch (action) {
      case 'top':
        await showTopCapabilities(client, options)
        break
      case 'search':
        await searchSolutions(client, args[0] as string, options)
        break
      case 'show':
        await showGeneDetails(client, args[0] as string)
        break
      case 'stats':
        await showStats(client)
        break
      default:
        await showTopCapabilities(client, { limit: '30', minGdi: '70' })
    }
  }
  catch (error) {
    const failedMsg = i18n.t('evolution:failed', 'Failed')
    console.error(ansis.red('❌ ' + failedMsg + ':'), (error as Error).message)
    process.exit(1)
  }
}

/**
 * Show top capabilities
 */
async function showTopCapabilities(client: A2AClient, options: any): Promise<void> {
  const fetchingMsg = i18n.t('evolution:fetching', 'Fetching top capabilities...')
  console.log(ansis.blue('📊 ' + fetchingMsg))

  const genes = await client.fetch(
    {
      signature: '*',
      context: [],
      minGDI: Number.parseInt(options.minGdi || '70'),
    },
    Number.parseInt(options.limit || '30'),
  )

  const foundMsg = i18n.t('evolution:found', 'Found {{count}} capabilities', { count: genes.length })
  console.log(ansis.green('\n✅ ' + foundMsg + '\n'))

  if (genes.length === 0) {
    const noResultsMsg = i18n.t('evolution:noResults', 'No capabilities found')
    console.log(ansis.yellow(noResultsMsg))
    return
  }

  genes.forEach((gene, index) => {
    console.log(ansis.bold(`${index + 1}. ${gene.id.substring(0, 8)}`))

    const problemLabel = ansis.cyan(i18n.t('evolution:problem', 'Problem'))
    console.log('   ' + problemLabel + ': ' + gene.problem.signature)

    const solutionLabel = ansis.yellow(i18n.t('evolution:solution', 'Solution'))
    console.log('   ' + solutionLabel + ': ' + gene.solution.strategy)

    console.log('   ' + ansis.green('GDI') + ': ' + gene.quality.gdi.toFixed(1))

    const usedLabel = ansis.gray(i18n.t('evolution:used', 'Used'))
    const timesLabel = i18n.t('evolution:times', 'times')
    console.log('   ' + usedLabel + ': ' + gene.quality.usageCount + ' ' + timesLabel)

    const successLabel = ansis.gray(i18n.t('evolution:success', 'Success'))
    const successRate = (gene.quality.successRate * 100).toFixed(1)
    console.log('   ' + successLabel + ': ' + successRate + '%')

    console.log()
  })
}

/**
 * Search for solutions
 */
async function searchSolutions(client: A2AClient, query: string, options: any): Promise<void> {
  const searchingMsg = i18n.t('evolution:searching', 'Searching for: {{query}}', { query })
  console.log(ansis.blue('🔍 ' + searchingMsg))

  const genes = await client.fetch(
    {
      signature: query,
      context: [],
      minGDI: Number.parseInt(options.minGdi || '60'),
    },
    Number.parseInt(options.limit || '10'),
  )

  if (genes.length === 0) {
    const noSolutionsMsg = i18n.t('evolution:noSolutions', 'No solutions found')
    console.log(ansis.yellow('\n' + noSolutionsMsg))
    return
  }

  const foundMsg = i18n.t('evolution:foundSolutions', 'Found {{count}} solutions', { count: genes.length })
  console.log(ansis.green('\n✅ ' + foundMsg + '\n'))

  genes.forEach((gene, index) => {
    console.log(ansis.bold(`${index + 1}. ${gene.problem.signature}`))
    console.log('   ' + gene.solution.strategy)

    const usedLabel = i18n.t('evolution:used', 'Used')
    console.log('   GDI: ' + gene.quality.gdi.toFixed(1) + ' | ' + usedLabel + ': ' + gene.quality.usageCount + 'x')

    if (gene.problem.context.length > 0) {
      const contextLabel = ansis.gray(i18n.t('evolution:context', 'Context'))
      console.log('   ' + contextLabel + ': ' + gene.problem.context.join(', '))
    }
    console.log()
  })
}

/**
 * Show gene details
 */
async function showGeneDetails(client: A2AClient, geneId: string): Promise<void> {
  // Search by ID prefix — avoids fetching entire gene pool
  const genes = await client.fetch({ signature: geneId, context: [] }, 5)
  const gene = genes.find(g => g.id.startsWith(geneId))

  if (!gene) {
    const notFoundMsg = i18n.t('evolution:geneNotFound', 'Gene not found')
    console.log(ansis.red(notFoundMsg))
    return
  }

  displayGene(gene)
}

/**
 * Show statistics
 */
async function showStats(client: A2AClient): Promise<void> {
  const fetchingMsg = i18n.t('evolution:fetchingStats', 'Fetching statistics...')
  console.log(ansis.blue('📊 ' + fetchingMsg))

  const allGenes = await client.fetch({ signature: '*', context: [] }, 1000)

  const totalGenes = allGenes.length
  const avgGDI = allGenes.reduce((sum, g) => sum + g.quality.gdi, 0) / totalGenes
  const totalUsage = allGenes.reduce((sum, g) => sum + g.quality.usageCount, 0)
  const avgSuccessRate = allGenes.reduce((sum, g) => sum + g.quality.successRate, 0) / totalGenes

  const typeCount = allGenes.reduce((acc, g) => {
    acc[g.type] = (acc[g.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log(ansis.bold('\n📈 Evolution Layer Statistics\n'))

  const totalLabel = ansis.cyan(i18n.t('evolution:totalGenes', 'Total Genes'))
  console.log(totalLabel + ': ' + totalGenes)

  const avgGdiLabel = ansis.cyan(i18n.t('evolution:avgGDI', 'Average GDI'))
  console.log(avgGdiLabel + ': ' + avgGDI.toFixed(1))

  const totalUsageLabel = ansis.cyan(i18n.t('evolution:totalUsage', 'Total Usage'))
  console.log(totalUsageLabel + ': ' + totalUsage)

  const avgSuccessLabel = ansis.cyan(i18n.t('evolution:avgSuccess', 'Average Success Rate'))
  console.log(avgSuccessLabel + ': ' + (avgSuccessRate * 100).toFixed(1) + '%')

  console.log()
  const byTypeLabel = i18n.t('evolution:byType', 'By Type')
  console.log(ansis.bold(byTypeLabel + ':'))

  Object.entries(typeCount).forEach(([type, count]) => {
    console.log('  ' + type + ': ' + count)
  })
}

/**
 * Display gene details
 */
function displayGene(gene: Gene): void {
  const detailsLabel = i18n.t('evolution:geneDetails', 'Gene Details')
  console.log(ansis.bold('\n📦 ' + detailsLabel + '\n'))

  console.log(ansis.cyan('ID') + ': ' + gene.id)

  const typeLabel = i18n.t('evolution:type', 'Type')
  console.log(ansis.cyan(typeLabel) + ': ' + gene.type)

  console.log(ansis.cyan('SHA256') + ': ' + gene.sha256)
  console.log()

  const problemLabel = i18n.t('evolution:problem', 'Problem')
  console.log(ansis.bold(problemLabel + ':'))

  const sigLabel = i18n.t('evolution:signature', 'Signature')
  console.log('  ' + sigLabel + ': ' + gene.problem.signature)

  if (gene.problem.context.length > 0) {
    const contextLabel = i18n.t('evolution:context', 'Context')
    console.log('  ' + contextLabel + ': ' + gene.problem.context.join(', '))
  }
  console.log()

  const solutionLabel = i18n.t('evolution:solution', 'Solution')
  console.log(ansis.bold(solutionLabel + ':'))

  const strategyLabel = i18n.t('evolution:strategy', 'Strategy')
  console.log('  ' + strategyLabel + ': ' + gene.solution.strategy)

  if (gene.solution.code) {
    const codeLabel = i18n.t('evolution:code', 'Code')
    console.log('  ' + codeLabel + ':')
    const codeLines = gene.solution.code.split('\n').map(line => '    ' + line).join('\n')
    console.log(ansis.gray(codeLines))
  }

  if (gene.solution.steps.length > 0) {
    const stepsLabel = i18n.t('evolution:steps', 'Steps')
    console.log('  ' + stepsLabel + ':')
    gene.solution.steps.forEach((step, i) => {
      console.log('    ' + (i + 1) + '. ' + step)
    })
  }
  console.log()

  const qualityLabel = i18n.t('evolution:quality', 'Quality')
  console.log(ansis.bold(qualityLabel + ':'))
  console.log('  GDI: ' + gene.quality.gdi.toFixed(1))

  const successRateLabel = i18n.t('evolution:successRate', 'Success Rate')
  console.log('  ' + successRateLabel + ': ' + (gene.quality.successRate * 100).toFixed(1) + '%')

  const usageCountLabel = i18n.t('evolution:usageCount', 'Usage Count')
  console.log('  ' + usageCountLabel + ': ' + gene.quality.usageCount)

  const avgTimeLabel = i18n.t('evolution:avgTime', 'Average Time')
  console.log('  ' + avgTimeLabel + ': ' + gene.quality.avgTime + 's')

  if (gene.metadata) {
    console.log()
    const metadataLabel = i18n.t('evolution:metadata', 'Metadata')
    console.log(ansis.bold(metadataLabel + ':'))

    const authorLabel = i18n.t('evolution:author', 'Author')
    console.log('  ' + authorLabel + ': ' + (gene.metadata.author || '-'))

    const createdLabel = i18n.t('evolution:createdAt', 'Created At')
    console.log('  ' + createdLabel + ': ' + (gene.metadata.createdAt || '-'))

    if (gene.metadata.tags && gene.metadata.tags.length > 0) {
      const tagsLabel = i18n.t('evolution:tags', 'Tags')
      console.log('  ' + tagsLabel + ': ' + gene.metadata.tags.join(', '))
    }
  }
}
