import type { CodeToolType } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { TOOL_MATRIX } from '../config/tool-matrix'
import { ensureI18nInitialized, i18n } from '../i18n'
import { cleanCommand } from '../commands/clean'
import { probeCommand } from '../commands/probe'
import { printCodexRuntimeStatus, printEnvironmentScanReport } from './environment-cleaner'
import { addNumbersToChoices } from './prompt-helpers'

export async function runDoctorHub(tool: CodeToolType): Promise<void> {
  ensureI18nInitialized()

  const supportsProbe = tool !== 'grok'
  let exitHub = false

  while (!exitHub) {
    console.log(ansis.cyan(`\n${i18n.t('hub:doctor.title')}`))
    console.log(ansis.gray(`  ${i18n.t('hub:doctor.subtitle')}`))
    console.log(ansis.dim(`  ${TOOL_MATRIX[tool].displayName}\n`))
    if (tool === 'codex')
      printCodexRuntimeStatus()

    const choices = addNumbersToChoices([
      {
        name: `${i18n.t('hub:doctor.scanReport')} — ${ansis.gray(i18n.t('hub:doctor.scanReportDesc'))}`,
        value: 'scan',
        short: i18n.t('hub:doctor.scanReport'),
      },
      ...(supportsProbe
        ? [{
            name: i18n.t('hub:doctor.probeApi'),
            value: 'probe',
            short: i18n.t('hub:doctor.probeApi'),
          }]
        : []),
      {
        name: `${i18n.t('hub:doctor.smartClean')} — ${ansis.gray(i18n.t('hub:doctor.smartCleanDesc'))}`,
        value: 'smart',
        short: i18n.t('hub:doctor.smartClean'),
      },
      {
        name: `${i18n.t('hub:doctor.purgeAll')} — ${ansis.gray(i18n.t('hub:doctor.purgeAllDesc'))}`,
        value: 'purge',
        short: i18n.t('hub:doctor.purgeAll'),
      },
      {
        name: 'Primary tools health — Clavue / Claude / Codex / Grok',
        value: 'tools-health',
        short: 'Tools health',
      },
      {
        name: 'Repair primary tools — strip dirty settings + recheck',
        value: 'tools-repair',
        short: 'Tools repair',
      },
      {
        name: i18n.t('common:back'),
        value: 'back',
        short: i18n.t('common:back'),
      },
    ])

    const { action } = await inquirer.prompt<{ action: string }>({
      type: 'list',
      name: 'action',
      message: i18n.t('menu:selectFunction'),
      choices,
    })

    switch (action) {
      case 'scan':
        printEnvironmentScanReport()
        break
      case 'probe':
        await probeCommand()
        break
      case 'smart':
        await cleanCommand({ codeType: tool })
        break
      case 'purge':
        await cleanCommand({ codeType: tool, purgeAll: true })
        break
      case 'tools-health': {
        const { checkPrimaryToolsHealth, formatPrimaryToolsHealth } = await import('./primary-tools-health')
        console.log(`\n${formatPrimaryToolsHealth(await checkPrimaryToolsHealth())}\n`)
        break
      }
      case 'tools-repair': {
        const { repairPrimaryToolsHealth, formatPrimaryToolsHealth } = await import('./primary-tools-health')
        console.log(`\n${formatPrimaryToolsHealth(await repairPrimaryToolsHealth())}\n`)
        break
      }
      case 'back':
        exitHub = true
        break
      default:
        break
    }
  }
}