import type { Recommendation } from '../health/types'
/**
 * CCJK Boost Command - One-Click Optimization
 *
 * Usage: ccjk boost [--dry-run] [--yes]
 */
import ansis from 'ansis'
import { analyzeProject } from '../discovery/project-analyzer'
import { getRecommendations } from '../discovery/skill-matcher'
import { runHealthCheck } from '../health/index'

export interface BoostOptions {
  dryRun?: boolean
  yes?: boolean
  json?: boolean
}

async function executeRecommendation(rec: Recommendation): Promise<{ success: boolean, message: string }> {
  if (!rec.command) {
    return { success: false, message: 'No command available' }
  }

  try {
    const parts = rec.command.split(' ')
    const cmd = parts[0]
    const args = parts.slice(1)

    if (cmd === 'ccjk') {
      return await runCcjkCommand(args)
    }

    const { x } = await import('tinyexec')
    const result = await x(cmd, args, { throwOnError: false })
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? 'Applied' : `Failed: ${result.stderr}`,
    }
  }
  catch (error) {
    return { success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` }
  }
}

async function runCcjkCommand(args: string[]): Promise<{ success: boolean, message: string }> {
  const sub = args[0]
  try {
    if (sub === 'init') {
      const { init } = await import('./init')
      await init({ skipBanner: true, skipPrompt: true })
      return { success: true, message: 'Initialization complete' }
    }
    if (sub === 'ccjk:mcp' || sub === 'ccjk-mcp') {
      const { ccjkMcp } = await import('./ccjk-mcp')
      await ccjkMcp({ interactive: false, dryRun: false, json: false })
      return { success: true, message: 'MCP services configured' }
    }
    if (sub === 'ccjk:skills' || sub === 'ccjk-skills') {
      const { ccjkSkills } = await import('./ccjk-skills')
      await ccjkSkills({ interactive: false, dryRun: false, json: false })
      return { success: true, message: 'Skills installed' }
    }
    if (sub === 'ccjk:agents' || sub === 'ccjk-agents') {
      const { ccjkAgents } = await import('./ccjk-agents')
      await ccjkAgents({ list: false, json: false })
      return { success: true, message: 'Agents configured' }
    }
    if (sub === 'doctor') {
      const { doctor } = await import('./doctor')
      await doctor({})
      return { success: true, message: 'Doctor check complete' }
    }

    const { x } = await import('tinyexec')
    const result = await x('ccjk', args, { throwOnError: false })
    return { success: result.exitCode === 0, message: result.exitCode === 0 ? 'Done' : 'Failed' }
  }
  catch (error) {
    return { success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function boost(options: BoostOptions = {}): Promise<void> {
  console.log(ansis.cyan.bold('\n🚀 CCJK Boost - One-Click Optimization\n'))

  const ora = (await import('ora')).default
  let spinner = ora('Analyzing your setup...').start()

  const [report, profile] = await Promise.all([
    runHealthCheck(),
    Promise.resolve(analyzeProject()),
  ])

  const { skills: recSkills } = getRecommendations(profile)
  spinner.succeed(`Current score: ${ansis.bold(String(report.totalScore))}/100 (Grade ${report.grade})`)

  // Collect actions
  const actions: Array<{ label: string, rec: Recommendation }> = []

  for (const rec of report.recommendations) {
    if (rec.command) {
      actions.push({ label: `${rec.title}: ${rec.description}`, rec })
    }
  }

  if (recSkills.length > 0 && !report.results.find(r => r.name === 'Skills' && r.status === 'pass')) {
    actions.push({
      label: `Install ${recSkills.length} recommended skills for ${profile.language}`,
      rec: { priority: 'medium', title: 'Install Skills', description: `${recSkills.length} skills match your project`, command: 'ccjk ccjk:skills', category: 'skills' },
    })
  }

  if (actions.length === 0) {
    console.log(ansis.green('\n✨ Your setup is already optimized! Score: ') + ansis.green.bold(`${report.totalScore}/100`))
    console.log(ansis.gray('Run "ccjk status" for detailed breakdown.\n'))
    return
  }

  // Display
  console.log(ansis.yellow(`\n📋 ${actions.length} optimization${actions.length > 1 ? 's' : ''} available:\n`))
  for (const a of actions) {
    const priority = a.rec.priority === 'high' ? ansis.red('[HIGH]') : ansis.yellow('[MED]')
    console.log(`  ${priority} ${a.label}`)
    if (a.rec.command)
      console.log(`         ${ansis.gray(a.rec.command)}`)
  }

  if (options.dryRun) {
    console.log(ansis.gray('\n--dry-run: No changes applied.\n'))
    return
  }

  if (!options.yes) {
    const { default: inquirer } = await import('inquirer')
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Apply ${actions.length} optimization${actions.length > 1 ? 's' : ''}?`,
      default: true,
    }])
    if (!confirm) {
      console.log(ansis.gray('\nCancelled.\n'))
      return
    }
  }

  // Apply
  console.log('')
  let applied = 0
  let failed = 0

  for (const action of actions) {
    spinner = ora(action.label).start()
    try {
      const result = await executeRecommendation(action.rec)
      if (result.success) { spinner.succeed(action.label); applied++ }
      else { spinner.warn(`${action.label} ${ansis.gray(`(${result.message})`)}`); failed++ }
    }
    catch { spinner.fail(action.label); failed++ }
  }

  // Re-check
  console.log('')
  spinner = ora('Recalculating score...').start()
  const newReport = await runHealthCheck()
  spinner.stop()

  const delta = newReport.totalScore - report.totalScore
  const deltaStr = delta > 0 ? ansis.green(`+${delta}`) : delta < 0 ? ansis.red(String(delta)) : '±0'

  console.log(ansis.cyan.bold('\n📊 Results'))
  console.log(`   Applied: ${ansis.green(String(applied))}  Failed: ${failed > 0 ? ansis.red(String(failed)) : ansis.gray('0')}`)
  console.log(`   Score: ${ansis.bold(String(report.totalScore))} → ${ansis.bold(String(newReport.totalScore))} (${deltaStr})`)
  console.log(`   Grade: ${report.grade} → ${ansis.bold(newReport.grade)}`)

  if (newReport.totalScore >= 80) {
    console.log(ansis.green('\n   ✨ Excellent setup! Getting the most out of Claude Code.\n'))
  }
  else {
    console.log(ansis.yellow(`\n   Run ${ansis.cyan('ccjk status')} for remaining recommendations.\n`))
  }
}
