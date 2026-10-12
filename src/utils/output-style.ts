import type { CodeToolType, SupportedLang } from '../constants'
import type { ClaudeSettings } from '../types/config'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { normalizeClaudeFamilySettings } from './claude-settings-normalizer'
import { resolveClaudeFamilySettingsTarget } from './runtime-settings'
import { ensureI18nInitialized, i18n } from '../i18n'
import { copyFile, ensureDir, exists, removeFile } from './fs-operations'
import { readJsonConfig, writeJsonConfig } from './json-config'
import { addNumbersToChoices } from './prompt-helpers'
import { promptBoolean } from './toggle-prompt'
import { updateCcjkConfig } from './ccjk-config'
import { CUSTOM_OUTPUT_STYLE_CONFIGS } from '../config/output-styles'

export interface OutputStyle {
  id: string
  isCustom: boolean
  filePath?: string
}

const OUTPUT_STYLES: OutputStyle[] = [
  ...CUSTOM_OUTPUT_STYLE_CONFIGS.map(style => ({
    id: style.id,
    isCustom: true as const,
    filePath: style.filename,
  })),
  // Built-in styles (no template files)
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

export async function copyOutputStyles(selectedStyles: string[], lang: SupportedLang, codeTool?: CodeToolType): Promise<void> {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  const outputStylesDir = join(target.configDir, 'output-styles')
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

export function setGlobalDefaultOutputStyle(styleId: string, codeTool?: CodeToolType): void {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  const existingSettings = readJsonConfig<ClaudeSettings>(target.settingsFile) || {}

  const updatedSettings: ClaudeSettings = {
    ...existingSettings,
    outputStyle: styleId,
  }

  normalizeClaudeFamilySettings(updatedSettings, { codeTool: target.codeTool })
  writeJsonConfig(target.settingsFile, updatedSettings)
}

export function clearGlobalOutputStyle(codeTool?: CodeToolType): void {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  const existingSettings = readJsonConfig<ClaudeSettings>(target.settingsFile) || {}

  const rest = { ...existingSettings }
  delete rest.outputStyle
  normalizeClaudeFamilySettings(rest, { codeTool: target.codeTool })
  writeJsonConfig(target.settingsFile, rest)
}

export function hasLegacyPersonalityFiles(codeTool?: CodeToolType): boolean {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  return LEGACY_FILES.some(filename => exists(join(target.configDir, filename)))
}

export function cleanupLegacyPersonalityFiles(codeTool?: CodeToolType): void {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  LEGACY_FILES.forEach((filename) => {
    const filePath = join(target.configDir, filename)
    if (exists(filePath)) {
      removeFile(filePath)
    }
  })
}

export async function configureOutputStyle(
  preselectedStyles?: string[],
  preselectedDefault?: string,
  codeTool?: CodeToolType,
): Promise<void> {
  ensureI18nInitialized()
  const target = resolveClaudeFamilySettingsTarget(codeTool)

  // Create static output style list for i18n-ally compatibility
  // Order: default first for discoverability, then custom styles, then other built-in styles
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
  if (hasLegacyPersonalityFiles(target.codeTool) && !preselectedStyles) {
    console.log(ansis.yellow(`⚠️  ${i18n.t('configuration:legacyFilesDetected')}`))

    const cleanupLegacy = await promptBoolean({
      message: i18n.t('configuration:cleanupLegacyFiles'),
      defaultValue: true,
    })

    if (cleanupLegacy) {
      cleanupLegacyPersonalityFiles(target.codeTool)
      console.log(ansis.green(`✔ ${i18n.t('configuration:legacyFilesRemoved')}`))
    }
  }
  else if (hasLegacyPersonalityFiles(target.codeTool) && preselectedStyles) {
    cleanupLegacyPersonalityFiles(target.codeTool)
  }

  let selectedStyles: string[]
  let defaultStyle: string

  if (preselectedStyles && preselectedDefault) {
    // Non-interactive mode
    selectedStyles = preselectedStyles
    defaultStyle = preselectedDefault
    if (defaultStyle === 'none') {
      await copyOutputStyles(selectedStyles, 'zh-CN', target.codeTool)
      clearGlobalOutputStyle(target.codeTool)
      updateCcjkConfig({
        outputStyles: selectedStyles,
        defaultOutputStyle: 'none',
      })
      console.log(ansis.green(`✔ ${i18n.t('configuration:outputStyleCleared')}`))
      return
    }
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
          checked: false, // 默认不安装任何输出风格，保持工具原始行为
        }
      })),
      // Allow empty selection - user can choose to not install any custom styles
    })

    selectedStyles = promptedStyles || []

    // If no custom styles selected, ask user if they want to set a built-in default style or skip entirely
    if (selectedStyles.length === 0) {
      const builtinStyles = availableStyles.filter(style => !style.isCustom)
      const noneOption = { id: '__none__', name: i18n.t('configuration:noOutputStyle'), description: i18n.t('configuration:noOutputStyleDesc') }
      const { defaultStyle: promptedDefault } = await inquirer.prompt<{ defaultStyle: string }>({
        type: 'list',
        name: 'defaultStyle',
        message: i18n.t('configuration:selectDefaultOutputStyle'),
        choices: addNumbersToChoices([
          // Show "none" option first
          {
            name: `${noneOption.name} - ${ansis.gray(noneOption.description)}`,
            value: '__none__',
            short: noneOption.name,
          },
          // Then show built-in styles
          ...builtinStyles.map((style) => {
            const styleInfo = outputStyleList.find(s => s.id === style.id)
            return {
              name: `${styleInfo?.name || style.id} - ${ansis.gray(styleInfo?.description || '')}`,
              value: style.id,
              short: styleInfo?.name || style.id,
            }
          }),
        ]),
        default: '__none__',
      })

      if (!promptedDefault) {
        // User cancelled the prompt - do nothing
        console.log(ansis.yellow(i18n.t('common:cancelled')))
        return
      }

      if (promptedDefault === '__none__') {
        // User explicitly chose not to use any output style - clear existing settings
        clearGlobalOutputStyle(target.codeTool)
        updateCcjkConfig({
          outputStyles: [],
          defaultOutputStyle: 'none',
        })
        console.log(ansis.green(`✔ ${i18n.t('configuration:outputStyleCleared')}`))
        return
      }

      // User selected a built-in style as default
      defaultStyle = promptedDefault
      setGlobalDefaultOutputStyle(defaultStyle, target.codeTool)
      updateCcjkConfig({
        outputStyles: [],
        defaultOutputStyle: defaultStyle,
      })
      console.log(ansis.green(`✔ ${i18n.t('configuration:outputStyleInstalled')}`))
      console.log(ansis.gray(`  ${i18n.t('configuration:defaultStyle')}: ${defaultStyle}`))
      return
    }

    const noneOption = { id: '__none__', name: i18n.t('configuration:noOutputStyle'), description: i18n.t('configuration:noOutputStyleDesc') }
    const { defaultStyle: promptedDefault } = await inquirer.prompt<{ defaultStyle: string }>({
      type: 'list',
      name: 'defaultStyle',
      message: i18n.t('configuration:selectDefaultOutputStyle'),
      choices: addNumbersToChoices([
        {
          name: `${noneOption.name} - ${ansis.gray(noneOption.description)}`,
          value: '__none__',
          short: noneOption.name,
        },
        // Show selected custom styles first (only what user actually installed)
        ...selectedStyles.map((styleId) => {
          const styleInfo = outputStyleList.find(s => s.id === styleId)
          return {
            name: `${styleInfo?.name || styleId} - ${ansis.gray(styleInfo?.description || '')}`,
            value: styleId,
            short: styleInfo?.name || styleId,
          }
        }),
        // Then show all built-in styles (always available), with default first
        ...availableStyles
          .filter(style => !style.isCustom)
          .sort((a, b) => a.id === 'default' ? -1 : b.id === 'default' ? 1 : 0)
          .map((style) => {
            const styleInfo = outputStyleList.find(s => s.id === style.id)
            return {
              name: `${styleInfo?.name || style.id} - ${ansis.gray(styleInfo?.description || '')}`,
              value: style.id,
              short: styleInfo?.name || style.id,
            }
          }),
      ]),
      default: '__none__',
    })

    if (!promptedDefault) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }

    defaultStyle = promptedDefault
  }

  // Copy selected output styles using configLang for template language
  await copyOutputStyles(selectedStyles, 'zh-CN', target.codeTool)

  if (defaultStyle === '__none__' || defaultStyle === 'none') {
    clearGlobalOutputStyle(target.codeTool)
    updateCcjkConfig({
      outputStyles: selectedStyles,
      defaultOutputStyle: 'none',
    })
    console.log(ansis.green(`✔ ${i18n.t('configuration:outputStyleInstalled')}`))
    console.log(ansis.gray(`  ${i18n.t('configuration:selectedStyles')}: ${selectedStyles.join(', ')}`))
    console.log(ansis.gray(`  ${i18n.t('configuration:defaultStyle')}: none`))
    return
  }

  setGlobalDefaultOutputStyle(defaultStyle, target.codeTool)

  // Update CCJK config
  updateCcjkConfig({
    outputStyles: selectedStyles,
    defaultOutputStyle: defaultStyle,
  })

  console.log(ansis.green(`✔ ${i18n.t('configuration:outputStyleInstalled')}`))
  console.log(ansis.gray(`  ${i18n.t('configuration:selectedStyles')}: ${selectedStyles.join(', ')}`))
  console.log(ansis.gray(`  ${i18n.t('configuration:defaultStyle')}: ${defaultStyle}`))
}
