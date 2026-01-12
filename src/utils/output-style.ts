import type { SupportedLang } from '../constants'
import type { ClaudeSettings } from '../types/config'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { CLAUDE_DIR, SETTINGS_FILE } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { updateZcfConfig } from './ccjk-config'
import { copyFile, ensureDir, exists, removeFile } from './fs-operations'
import { readJsonConfig, writeJsonConfig } from './json-config'
import { addNumbersToChoices } from './prompt-helpers'
import { promptBoolean } from './toggle-prompt'

export interface OutputStyle {
  id: string
  isCustom: boolean
  filePath?: string
}

const OUTPUT_STYLES: OutputStyle[] = [
  // Custom styles (have template files) - Efficiency-focused styles
  {
    id: 'speed-coder',
    isCustom: true,
    filePath: 'speed-coder.md',
  },
  {
    id: 'senior-architect',
    isCustom: true,
    filePath: 'senior-architect.md',
  },
  {
    id: 'pair-programmer',
    isCustom: true,
    filePath: 'pair-programmer.md',
  },
  // Built-in styles (no template files) - Claude Code native styles
  {
    id: 'default',
    isCustom: false,
  },
  {
    id: 'explanatory',
    isCustom: false,
  },
  {
    id: 'learning',
    isCustom: false,
  },
]

const LEGACY_FILES = ['personality.md', 'rules.md', 'technical-guides.md', 'mcp.md', 'language.md']

export function getAvailableOutputStyles(): OutputStyle[] {
  return OUTPUT_STYLES
}

export async function copyOutputStyles(selectedStyles: string[], lang: SupportedLang): Promise<void> {
  const outputStylesDir = join(CLAUDE_DIR, 'output-styles')
  ensureDir(outputStylesDir)

  // Get the root directory of the package
  const currentFilePath = fileURLToPath(import.meta.url)
  const distDir = dirname(dirname(currentFilePath))
  const rootDir = dirname(distDir)
  // Use shared output-styles from common directory
  const templateDir = join(rootDir, 'templates', 'common', 'output-styles', lang)

  for (const styleId of selectedStyles) {
    const style = OUTPUT_STYLES.find(s => s.id === styleId)
    if (!style || !style.isCustom || !style.filePath) {
      continue // Skip built-in styles or invalid styles
    }

    const sourcePath = join(templateDir, style.filePath)
    const destPath = join(outputStylesDir, style.filePath)

    if (exists(sourcePath)) {
      copyFile(sourcePath, destPath)
    }
  }
}

export function setGlobalDefaultOutputStyle(styleId: string): void {
  const existingSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE) || {}

  const updatedSettings: ClaudeSettings = {
    ...existingSettings,
    outputStyle: styleId,
  }

  writeJsonConfig(SETTINGS_FILE, updatedSettings)
}

export function hasLegacyPersonalityFiles(): boolean {
  return LEGACY_FILES.some(filename => exists(join(CLAUDE_DIR, filename)))
}

export function cleanupLegacyPersonalityFiles(): void {
  LEGACY_FILES.forEach((filename) => {
    const filePath = join(CLAUDE_DIR, filename)
    if (exists(filePath)) {
      removeFile(filePath)
    }
  })
}

export async function configureOutputStyle(
  preselectedStyles?: string[],
  preselectedDefault?: string,
): Promise<void> {
  ensureI18nInitialized()

  // Create static output style list for i18n-ally compatibility
  const outputStyleList = [
    {
      id: 'default',
      name: i18n.t('configuration:outputStyles.default.name'),
      description: i18n.t('configuration:outputStyles.default.description'),
    },
    {
      id: 'speed-coder',
      name: i18n.t('configuration:outputStyles.speed-coder.name'),
      description: i18n.t('configuration:outputStyles.speed-coder.description'),
    },
    {
      id: 'senior-architect',
      name: i18n.t('configuration:outputStyles.senior-architect.name'),
      description: i18n.t('configuration:outputStyles.senior-architect.description'),
    },
    {
      id: 'pair-programmer',
      name: i18n.t('configuration:outputStyles.pair-programmer.name'),
      description: i18n.t('configuration:outputStyles.pair-programmer.description'),
    },
    {
      id: 'explanatory',
      name: i18n.t('configuration:outputStyles.explanatory.name'),
      description: i18n.t('configuration:outputStyles.explanatory.description'),
    },
    {
      id: 'learning',
      name: i18n.t('configuration:outputStyles.learning.name'),
      description: i18n.t('configuration:outputStyles.learning.description'),
    },
  ]

  const availableStyles = getAvailableOutputStyles()

  // Check for legacy files
  if (hasLegacyPersonalityFiles() && !preselectedStyles) {
    console.log(ansis.yellow(`⚠️  ${i18n.t('configuration:legacyFilesDetected')}`))

    const cleanupLegacy = await promptBoolean({
      message: i18n.t('configuration:cleanupLegacyFiles'),
      defaultValue: true,
    })

    if (cleanupLegacy) {
      cleanupLegacyPersonalityFiles()
      console.log(ansis.green(`✔ ${i18n.t('configuration:legacyFilesRemoved')}`))
    }
  }
  else if (hasLegacyPersonalityFiles() && preselectedStyles) {
    // Auto cleanup in non-interactive mode
    cleanupLegacyPersonalityFiles()
  }

  let selectedStyles: string[]
  let defaultStyle: string

  if (preselectedStyles && preselectedDefault) {
    // Non-interactive mode
    selectedStyles = preselectedStyles
    defaultStyle = preselectedDefault
  }
  else {
    // Interactive mode - only show custom styles for installation
    const customStyles = availableStyles.filter(style => style.isCustom)
    const { selectedStyles: promptedStyles } = await inquirer.prompt<{ selectedStyles: string[] }>({
      type: 'checkbox',
      name: 'selectedStyles',
      message: `${i18n.t('configuration:selectOutputStyles')}${i18n.t('common:multiSelectHint')}`,
      choices: addNumbersToChoices(customStyles.map((style) => {
        const styleInfo = outputStyleList.find(s => s.id === style.id)
        return {
          name: `${styleInfo?.name || style.id} - ${ansis.gray(styleInfo?.description || '')}`,
          value: style.id,
          checked: false, // Let user choose, not pre-selected
        }
      })),
      validate: async input => input.length > 0 || i18n.t('configuration:selectAtLeastOne'),
    })

    if (!promptedStyles || promptedStyles.length === 0) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }

    selectedStyles = promptedStyles

    const { defaultStyle: promptedDefault } = await inquirer.prompt<{ defaultStyle: string }>({
      type: 'list',
      name: 'defaultStyle',
      message: i18n.t('configuration:selectDefaultOutputStyle'),
      choices: addNumbersToChoices([
        // Show selected custom styles first (only what user actually installed)
        ...selectedStyles.map((styleId) => {
          const styleInfo = outputStyleList.find(s => s.id === styleId)
          return {
            name: `${styleInfo?.name || styleId} - ${ansis.gray(styleInfo?.description || '')}`,
            value: styleId,
            short: styleInfo?.name || styleId,
          }
        }),
        // Then show all built-in styles (always available)
        ...availableStyles
          .filter(style => !style.isCustom)
          .map((style) => {
            const styleInfo = outputStyleList.find(s => s.id === style.id)
            return {
              name: `${styleInfo?.name || style.id} - ${ansis.gray(styleInfo?.description || '')}`,
              value: style.id,
              short: styleInfo?.name || style.id,
            }
          }),
      ]),
      default: selectedStyles.includes('senior-architect') ? 'senior-architect' : selectedStyles[0],
    })

    if (!promptedDefault) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }

    defaultStyle = promptedDefault
  }

  // Copy selected output styles using configLang for template language
  await copyOutputStyles(selectedStyles, 'zh-CN')

  // Set global default output style
  setGlobalDefaultOutputStyle(defaultStyle)

  // Update CCJK config
  updateZcfConfig({
    outputStyles: selectedStyles,
    defaultOutputStyle: defaultStyle,
  })

  console.log(ansis.green(`✔ ${i18n.t('configuration:outputStyleInstalled')}`))
  console.log(ansis.gray(`  ${i18n.t('configuration:selectedStyles')}: ${selectedStyles.join(', ')}`))
  console.log(ansis.gray(`  ${i18n.t('configuration:defaultStyle')}: ${defaultStyle}`))
}
