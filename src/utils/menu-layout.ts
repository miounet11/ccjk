import type { CodeToolType } from '../constants'
import { homedir } from 'node:os'
import ansis from 'ansis'
import { TOOL_MATRIX } from '../config/tool-matrix'
import { i18n } from '../i18n'

export type MenuSectionId = 'operator' | 'doctor' | 'cross' | 'ccjk'

export interface MenuLine {
  key: string
  labelKey: string
  descKey: string
}

export interface MenuSection {
  id: MenuSectionId
  titleKey: string
  lines: MenuLine[]
}

export interface ToolMenuLayout {
  toolLabelKey: string
  operatorLines: MenuLine[]
  doctorLines: MenuLine[]
  ccjkUninstallKey: string
  ccjkUninstallDescKey: string
  ccjkUpdateKey: string
  ccjkUpdateDescKey: string
}

function line(key: string, labelKey: string, descKey: string): MenuLine {
  return { key, labelKey, descKey }
}

const CROSS_TOOL_LINES: MenuLine[] = [
  line('g', 'menu:menuOptions.grokCrossTool', 'menu:menuDescriptions.grokCrossTool'),
  line('x', 'menu:menuOptions.reasonixCrossTool', 'menu:menuDescriptions.reasonixCrossTool'),
]

const DOCTOR_HUB = line('h', 'menu:menuOptions.doctorHub', 'menu:menuDescriptions.doctorHub')
const OPERATOR_HUB = line('w', 'menu:menuOptions.operatorHub', 'menu:menuDescriptions.operatorHub')

const CLAUDE_FAMILY_OPERATOR: MenuLine[] = [
  line('1', 'menu:menuOptions.fullInit', 'menu:menuDescriptions.fullInit'),
  line('2', 'menu:menuOptions.importWorkflow', 'menu:menuDescriptions.importWorkflow'),
  line('3', 'menu:menuOptions.configureApiOrCcr', 'menu:menuDescriptions.configureApiOrCcr'),
  line('4', 'menu:menuOptions.configureMcp', 'menu:menuDescriptions.configureMcp'),
  line('5', 'menu:menuOptions.configureModel', 'menu:menuDescriptions.configureModel'),
  line('6', 'menu:menuOptions.configureAiMemory', 'menu:menuDescriptions.configureAiMemory'),
  line('7', 'menu:menuOptions.configureEnvPermission', 'menu:menuDescriptions.configureEnvPermission'),
]

export const TOOL_MENU_LAYOUTS: Record<CodeToolType, ToolMenuLayout> = {
  clavue: {
    toolLabelKey: 'menu:toolHeaders.clavue',
    operatorLines: [
      line('1', 'menu:menuOptions.clavueFullInit', 'menu:menuDescriptions.clavueFullInit'),
      line('2', 'menu:menuOptions.clavueUpdateWorkflow', 'menu:menuDescriptions.clavueUpdateWorkflow'),
      line('3', 'menu:menuOptions.clavueConfigureApi', 'menu:menuDescriptions.clavueConfigureApi'),
      line('4', 'menu:menuOptions.clavueConfigureMcp', 'menu:menuDescriptions.clavueConfigureMcp'),
      line('5', 'menu:menuOptions.clavueConfigureModel', 'menu:menuDescriptions.clavueConfigureModel'),
      line('6', 'menu:menuOptions.clavueConfigureAiMemory', 'menu:menuDescriptions.clavueConfigureAiMemory'),
      line('7', 'menu:menuOptions.clavueConfigureEnvPermission', 'menu:menuDescriptions.clavueConfigureEnvPermission'),
    ],
    doctorLines: [DOCTOR_HUB],
    ccjkUninstallKey: 'menu:menuOptions.clavueUninstall',
    ccjkUninstallDescKey: 'menu:menuDescriptions.clavueUninstall',
    ccjkUpdateKey: 'menu:menuOptions.clavueCheckUpdates',
    ccjkUpdateDescKey: 'menu:menuDescriptions.clavueCheckUpdates',
  },
  'claude-code': {
    toolLabelKey: 'menu:toolHeaders.claudeCode',
    operatorLines: CLAUDE_FAMILY_OPERATOR,
    doctorLines: [DOCTOR_HUB],
    ccjkUninstallKey: 'menu:menuOptions.uninstall',
    ccjkUninstallDescKey: 'menu:menuDescriptions.uninstall',
    ccjkUpdateKey: 'menu:menuOptions.checkUpdates',
    ccjkUpdateDescKey: 'menu:menuDescriptions.checkUpdates',
  },
  codex: {
    toolLabelKey: 'menu:toolHeaders.codex',
    operatorLines: [
      line('1', 'menu:menuOptions.codexFullInit', 'menu:menuDescriptions.codexFullInitWithPreset'),
      line('2', 'menu:menuOptions.codexImportWorkflow', 'menu:menuDescriptions.codexImportWorkflow'),
      line('3', 'menu:menuOptions.codexConfigureApi', 'menu:menuDescriptions.codexConfigureApi'),
      line('4', 'menu:menuOptions.codexConfigureMcp', 'menu:menuDescriptions.codexConfigureMcp'),
      line('5', 'menu:menuOptions.codexConfigureModel', 'menu:menuDescriptions.codexConfigureModel'),
      line('6', 'menu:menuOptions.codexConfigureAiMemory', 'menu:menuDescriptions.codexConfigureAiMemory'),
    ],
    doctorLines: [DOCTOR_HUB],
    ccjkUninstallKey: 'menu:menuOptions.codexUninstall',
    ccjkUninstallDescKey: 'menu:menuDescriptions.codexUninstall',
    ccjkUpdateKey: 'menu:menuOptions.codexCheckUpdates',
    ccjkUpdateDescKey: 'menu:menuDescriptions.codexCheckUpdates',
  },
  grok: {
    toolLabelKey: 'menu:toolHeaders.grok',
    operatorLines: [
      line('1', 'menu:menuOptions.grokInit', 'menu:menuDescriptions.grokInit'),
      line('2', 'menu:menuOptions.grokStatus', 'menu:menuDescriptions.grokStatus'),
    ],
    doctorLines: [DOCTOR_HUB],
    ccjkUninstallKey: 'menu:menuOptions.uninstall',
    ccjkUninstallDescKey: 'menu:menuDescriptions.uninstall',
    ccjkUpdateKey: 'menu:menuOptions.checkUpdates',
    ccjkUpdateDescKey: 'menu:menuDescriptions.checkUpdates',
  },
}

export function shortenHomePath(path: string): string {
  const home = homedir()
  if (path.startsWith(home))
    return `~${path.slice(home.length)}`
  return path
}

export function getMenuValidChoices(tool: CodeToolType): string[] {
  return buildMenuListChoices(tool)
    .filter(choice => !choice.disabled)
    .map(choice => choice.value)
    .flatMap(value => [value, value.toUpperCase()])
}

export interface MenuListChoice {
  name: string
  value: string
  disabled?: boolean | string
}

function formatChoiceLabel(item: MenuLine): string {
  return `${item.key.toUpperCase()}. ${i18n.t(item.labelKey)} ${ansis.gray(`— ${i18n.t(item.descKey)}`)}`
}

function sectionSeparator(titleKey: string): MenuListChoice {
  return {
    name: ansis.dim(`── ${i18n.t(titleKey)} ──`),
    value: `__section_${titleKey}`,
    disabled: true,
  }
}

export function buildMenuListChoices(tool: CodeToolType): MenuListChoice[] {
  const layout = TOOL_MENU_LAYOUTS[tool]
  const choices: MenuListChoice[] = [
    sectionSeparator('menu:menuSections.operator'),
    {
      name: formatChoiceLabel(OPERATOR_HUB),
      value: OPERATOR_HUB.key,
    },
    ...layout.operatorLines.map(item => ({
      name: formatChoiceLabel(item),
      value: item.key,
    })),
    sectionSeparator('menu:menuSections.doctor'),
    ...layout.doctorLines.map(item => ({
      name: formatChoiceLabel(item),
      value: item.key,
    })),
    sectionSeparator('menu:menuSections.crossTool'),
    ...CROSS_TOOL_LINES.map(item => ({
      name: formatChoiceLabel(item),
      value: item.key,
    })),
    sectionSeparator('menu:menuSections.ccjk'),
    {
      name: formatChoiceLabel(line('0', 'menu:menuOptions.changeLanguage', 'menu:menuDescriptions.changeLanguage')),
      value: '0',
    },
    {
      name: formatChoiceLabel(line('s', 'menu:menuOptions.switchCodeTool', 'menu:menuDescriptions.switchCodeTool')),
      value: 's',
    },
    {
      name: formatChoiceLabel(line('-', layout.ccjkUninstallKey, layout.ccjkUninstallDescKey)),
      value: '-',
    },
    {
      name: formatChoiceLabel(line('+', layout.ccjkUpdateKey, layout.ccjkUpdateDescKey)),
      value: '+',
    },
    {
      name: `${ansis.red('Q.')} ${ansis.red(i18n.t('menu:menuOptions.exit'))}`,
      value: 'q',
    },
  ]

  return choices
}

function printSectionTitle(titleKey: string): void {
  const title = i18n.t(titleKey)
  const padded = ` ${title} `
  const width = Math.max(42, padded.length + 4)
  const dashes = '─'.repeat(Math.max(2, Math.floor((width - padded.length) / 2)))
  console.log(`  ${dashes}${ansis.bold(padded)}${dashes}`)
}

function printMenuLine(item: MenuLine): void {
  const key = item.key.length === 1 ? `${item.key.toUpperCase()}.` : `${item.key}.`
  console.log(
    `  ${ansis.cyan(key.padEnd(4))} ${i18n.t(item.labelKey)} ${ansis.gray(`- ${i18n.t(item.descKey)}`)}`,
  )
}

export function printToolMenuHeader(tool: CodeToolType): void {
  const entry = TOOL_MATRIX[tool]
  const layout = TOOL_MENU_LAYOUTS[tool]
  const configRoot = shortenHomePath(entry.configRoot)
  const roles = entry.roles.includes('both')
    ? i18n.t('menu:roleBadge.both')
    : entry.roles.includes('doctor')
      ? i18n.t('menu:roleBadge.doctor')
      : i18n.t('menu:roleBadge.operator')

  console.log(ansis.dim(`\n  ${i18n.t('menu:tagline')}`))
  console.log(
    ansis.white(
      `  ${i18n.t(layout.toolLabelKey)}  ${ansis.dim('|')}  ${ansis.gray(i18n.t('menu:configRoot', { path: configRoot }))}  ${ansis.dim('|')}  ${roles}`,
    ),
  )
  console.log('')
}

export function printToolMenuBody(tool: CodeToolType): void {
  const layout = TOOL_MENU_LAYOUTS[tool]

  console.log(ansis.cyan(i18n.t('menu:selectFunction')))
  console.log('')

  printSectionTitle('menu:menuSections.operator')
  for (const item of layout.operatorLines)
    printMenuLine(item)
  console.log('')

  printSectionTitle('menu:menuSections.doctor')
  for (const item of layout.doctorLines)
    printMenuLine(item)
  console.log('')

  printSectionTitle('menu:menuSections.crossTool')
  for (const item of CROSS_TOOL_LINES)
    printMenuLine(item)
  console.log('')

  printSectionTitle('menu:menuSections.ccjk')
  printMenuLine(line('0', 'menu:menuOptions.changeLanguage', 'menu:menuDescriptions.changeLanguage'))
  printMenuLine(line('s', 'menu:menuOptions.switchCodeTool', 'menu:menuDescriptions.switchCodeTool'))
  printMenuLine(line('-', layout.ccjkUninstallKey, layout.ccjkUninstallDescKey))
  printMenuLine(line('+', layout.ccjkUpdateKey, layout.ccjkUpdateDescKey))
  console.log(`  ${ansis.red('Q.')} ${ansis.red(i18n.t('menu:menuOptions.exit'))}`)
  console.log('')
}

export function getToolMenuLayout(tool: CodeToolType): ToolMenuLayout {
  return TOOL_MENU_LAYOUTS[tool]
}