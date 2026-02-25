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
    await client.hello('ccjk', '1.0.0', ['fetch', 'report', 'publish'])

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

  const genes = await client.fetch({
    minGDI: Number.parseInt(options.minGdi || '70'),
    limit: Number.parseInt(options.limit || '30'),
  })

  const foundMsg = i18n.t('evolution:found', 'Found {{count}} capabilities', { count: genes.length })
  console.log(ansis.green('\n✅ ' + foundMsg + '\n'))

  if (genes.length === 0) {
    const noResultsMsg = i18n.t('evolution:noResults', 'No capabilities found')
    console.log(ansis.yellow(noResultsMsg))
    return
  }

  genes.forEach((gene, index) => {
    console.log(ansis.bold(`${index + 1}. ${gene.geneId.substring(0, 8)}`))

    const problemLabel = ansis.cyan(i18n.t('evolution:problem', 'Problem'))
    console.log('   ' + problemLabel + ': ' + gene.problemSignature)

    const solutionLabel = ansis.yellow(i18n.t('evolution:solution', 'Solution'))
    console.log('   ' + solutionLabel + ': ' + gene.solutionStrategy)

    console.log('   ' + ansis.green('GDI') + ': ' + gene.gdi.toFixed(1))

    const usedLabel = ansis.gray(i18n.t('evolution:used', 'Used'))
    const timesLabel = i18n.t('evolution:times', 'times')
    console.log('   ' + usedLabel + ': ' + gene.usageCount + ' ' + timesLabel)

    const successLabel = ansis.gray(i18n.t('evolution:success', 'Success'))
    const successRate = (gene.successRate * 100).toFixed(1)
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

  const genes = await client.fetch({
    signature: query,
    minGDI: Number.parseInt(options.minGdi || '60'),
    limit: Number.parseInt(options.limit || '10'),
  })

  if (genes.length === 0) {
    const noSolutionsMsg = i18n.t('evolution:noSolutions', 'No solutions found')
    console.log(ansis.yellow('\n' + noSolutionsMsg))
    return
  }

  const foundMsg = i18n.t('evolution:foundSolutions', 'Found {{count}} solutions', { count: genes.length })
  console.log(ansis.green('\n✅ ' + foundMsg + '\n'))

  genes.forEach((gene, index) => {
    console.log(ansis.bold(`${index + 1}. ${gene.problemSignature}`))
    console.log('   ' + gene.solutionStrategy)

    const usedLabel = i18n.t('evolution:used', 'Used')
    console.log('   GDI: ' + gene.gdi.toFixed(1) + ' | ' + usedLabel + ': ' + gene.usageCount + 'x')

    if (gene.tags.length > 0) {
      const tagsLabel = ansis.gray(i18n.t('evolution:tags', 'Tags'))
      console.log('   ' + tagsLabel + ': ' + gene.tags.join(', '))
    }
    console.log()
  })
}

/**
 * Show gene details
 */
async function showGeneDetails(client: A2AClient, geneId: string): Promise<void> {
  // Search by ID prefix
  const genes = await client.fetch({ geneId, limit: 5 })
  const gene = genes.find(g => g.geneId.startsWith(geneId))

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

  const stats = await client.stats()

  console.log(ansis.bold('\n📈 Evolution Layer Statistics\n'))

  const totalLabel = ansis.cyan(i18n.t('evolution:totalGenes', 'Total Genes in Pool'))
  console.log(totalLabel + ': ' + stats.totalGenesInPool)

  const myLabel = ansis.cyan(i18n.t('evolution:myContributions', 'My Contributions'))
  console.log(myLabel + ': ' + stats.myContributions)

  const reportsLabel = ansis.cyan(i18n.t('evolution:reportsSubmitted', 'Reports Submitted'))
  console.log(reportsLabel + ': ' + stats.reportsSubmitted)

  const successLabel = ansis.cyan(i18n.t('evolution:successRate', 'Success Rate'))
  console.log(successLabel + ': ' + (stats.successRate * 100).toFixed(1) + '%')
}

/**
 * Display gene details
 */
function displayGene(gene: Gene): void {
  const detailsLabel = i18n.t('evolution:geneDetails', 'Gene Details')
  console.log(ansis.bold('\n📦 ' + detailsLabel + '\n'))

  console.log(ansis.cyan('ID') + ': ' + gene.geneId)
  console.log(ansis.cyan('Version') + ': ' + gene.version)
  console.log()

  const problemLabel = i18n.t('evolution:problem', 'Problem')
  console.log(ansis.bold(problemLabel + ':'))
  console.log('  ' + gene.problemSignature)
  console.log()

  const solutionLabel = i18n.t('evolution:solution', 'Solution')
  console.log(ansis.bold(solutionLabel + ':'))

  const strategyLabel = i18n.t('evolution:strategy', 'Strategy')
  console.log('  ' + strategyLabel + ': ' + gene.solutionStrategy)

  if (gene.solutionCode) {
    const codeLabel = i18n.t('evolution:code', 'Code')
    console.log('  ' + codeLabel + ':')
    const codeLines = gene.solutionCode.split('\n').map((line: string) => '    ' + line).join('\n')
    console.log(ansis.gray(codeLines))
  }

  if (gene.solutionSteps.length > 0) {
    const stepsLabel = i18n.t('evolution:steps', 'Steps')
    console.log('  ' + stepsLabel + ':')
    gene.solutionSteps.forEach((step: string, i: number) => {
      console.log('    ' + (i + 1) + '. ' + step)
    })
  }
  console.log()

  const qualityLabel = i18n.t('evolution:quality', 'Quality')
  console.log(ansis.bold(qualityLabel + ':'))
  console.log('  GDI: ' + gene.gdi.toFixed(1))

  const successRateLabel = i18n.t('evolution:successRate', 'Success Rate')
  console.log('  ' + successRateLabel + ': ' + (gene.successRate * 100).toFixed(1) + '%')

  const usageCountLabel = i18n.t('evolution:usageCount', 'Usage Count')
  console.log('  ' + usageCountLabel + ': ' + gene.usageCount)

  const passRateLabel = i18n.t('evolution:passRate', 'Pass Rate')
  console.log('  ' + passRateLabel + ': ' + (gene.passRate * 100).toFixed(1) + '%')

  if (gene.tags.length > 0) {
    console.log()
    const tagsLabel = i18n.t('evolution:tags', 'Tags')
    console.log('  ' + tagsLabel + ': ' + gene.tags.join(', '))
  }

  const createdLabel = i18n.t('evolution:createdAt', 'Created At')
  console.log('  ' + createdLabel + ': ' + gene.createdAt)
}
