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
import { mergeAndCleanPermissions } from './permission-cleaner'
import { addNumbersToChoices } from './prompt-helpers'
import { promptBoolean } from './toggle-prompt'

export interface OutputStyle {
  id: string
  isCustom: boolean
  filePath?: string
}

const OUTPUT_STYLES: OutputStyle[] = [
  // Custom styles (have template files) - 大神模式
  {
    id: 'linus-mode',
    isCustom: true,
    filePath: 'linus-mode.md',
  },
  {
    id: 'uncle-bob-mode',
    isCustom: true,
    filePath: 'uncle-bob-mode.md',
  },
  {
    id: 'dhh-mode',
    isCustom: true,
    filePath: 'dhh-mode.md',
  },
  {
    id: 'carmack-mode',
    isCustom: true,
    filePath: 'carmack-mode.md',
  },
  {
    id: 'jobs-mode',
    isCustom: true,
    filePath: 'jobs-mode.md',
  },
  {
    id: 'evan-you-mode',
    isCustom: true,
    filePath: 'evan-you-mode.md',
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

/**
 * Built-in output styles that use the deprecated `outputStyle` settings.json field.
 * Claude Code 2.1+ deprecated this field in favor of system prompt alternatives.
 * Custom styles (linus-mode, etc.) stored as .md files are NOT affected.
 */
const BUILTIN_STYLE_IDS = new Set(['default', 'explanatory', 'learning'])

export function setGlobalDefaultOutputStyle(styleId: string): void {
  // Warn if using deprecated built-in outputStyle field (Claude Code 2.1+)
  if (BUILTIN_STYLE_IDS.has(styleId)) {
    console.log(ansis.yellow(`⚠️  Note: Built-in output styles (${styleId}) are deprecated in Claude Code 2.1+.`))
    console.log(ansis.gray('   Custom styles (linus-mode, etc.) stored as .md files are still fully supported.'))
  }

  // Get template permissions for validation
  const templatePermissions = getTemplatePermissions()

  const existingSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE) || {}

  // Clean permissions before writing
  const cleanedPermissions = mergeAndCleanPermissions(
    templatePermissions,
    existingSettings.permissions?.allow,
  )

  const updatedSettings: ClaudeSettings = {
    ...existingSettings,
    outputStyle: styleId,
    // Ensure clean permissions
    permissions: {
      allow: cleanedPermissions,
    },
  }

  // Remove problematic fields
  if ((updatedSettings as any).plansDirectory === null) {
    delete (updatedSettings as any).plansDirectory
  }

  writeJsonConfig(SETTINGS_FILE, updatedSettings)
}

/**
 * Get template permissions from template settings.json
 */
function getTemplatePermissions(): string[] {
  try {
    const { readFileSync } = require('node:fs')
    const { fileURLToPath } = require('node:url')
    const { dirname, join } = require('pathe')

    const currentFilePath = fileURLToPath(import.meta.url)
    const distDir = dirname(dirname(currentFilePath))
    const rootDir = dirname(distDir)
    const templatePath = join(rootDir, 'templates', 'claude-code', 'common', 'settings.json')

    if (require('node:fs').existsSync(templatePath)) {
      const template = JSON.parse(readFileSync(templatePath, 'utf-8'))
      return template.permissions?.allow || []
    }
  }
  catch (_error) {
    // Silently fall back to default
  }
  // Default permissions if template not found
  // Note: Claude Code only recognizes tool-based patterns, not Allow* names
  return [
    'Bash(git *)',
    'Bash(npm *)',
    'Bash(pnpm *)',
    'Bash(node *)',
    'Read(*)',
    'Edit(*)',
    'Write(*)',
  ]
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
      id: 'linus-mode',
      name: i18n.t('configuration:outputStyles.linus-mode.name'),
      description: i18n.t('configuration:outputStyles.linus-mode.description'),
    },
    {
      id: 'uncle-bob-mode',
      name: i18n.t('configuration:outputStyles.uncle-bob-mode.name'),
      description: i18n.t('configuration:outputStyles.uncle-bob-mode.description'),
    },
    {
      id: 'dhh-mode',
      name: i18n.t('configuration:outputStyles.dhh-mode.name'),
      description: i18n.t('configuration:outputStyles.dhh-mode.description'),
    },
    {
      id: 'carmack-mode',
      name: i18n.t('configuration:outputStyles.carmack-mode.name'),
      description: i18n.t('configuration:outputStyles.carmack-mode.description'),
    },
    {
      id: 'jobs-mode',
      name: i18n.t('configuration:outputStyles.jobs-mode.name'),
      description: i18n.t('configuration:outputStyles.jobs-mode.description'),
    },
    {
      id: 'evan-you-mode',
      name: i18n.t('configuration:outputStyles.evan-you-mode.name'),
      description: i18n.t('configuration:outputStyles.evan-you-mode.description'),
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
          checked: true, // Default to all selected
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
      default: selectedStyles.includes('linus-mode') ? 'linus-mode' : selectedStyles[0],
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
