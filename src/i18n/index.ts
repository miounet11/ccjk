import type { i18n as I18nInstance } from 'i18next'
import type { SupportedLang } from '../constants'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import { dirname, join } from 'pathe'

// Create i18next instance
export const i18n: I18nInstance = i18next.createInstance()

// All available namespaces based on current project structure
const NAMESPACES = [
  'agent-teams', // Agent Teams quick-enable
  'agentBrowser', // Agent Browser - AI browser automation
  'common',
  'api',
  'ccr',
  'ccjk', // CCJK-specific translations
  'ccjk-skills', // CCJK Skills installation command
  'ccjk-agents', // CCJK Agents management command
  'ccjk-all', // CCJK All-in-one setup command
  'cli',
  'cloud-setup', // Cloud-based setup wizard
  'cloudPlugins', // Cloud-based plugin system
  'cometix',
  'codex',
  'configuration',
  'context', // Context compression system
  'errors',
  'hooks', // Git hooks management
  'hooksSync', // Hooks cloud synchronization
  'installation',
  'interview', // Interview-Driven Development
  'language',
  'lsp', // Language Server Protocol (v3.8+)
  'marketplace', // Marketplace system for plugins, skills, and workflows
  'mcp',
  'menu',
  'multi-config',
  'notification', // Task completion notifications
  'permissions', // Permission system for API providers, models, and tools
  'plugins', // Cloud plugins management
  'registry', // Version checking, China detection, and multiple installations
  'sandbox', // Sandbox mode for secure request/response handling
  'setup', // Setup wizard
  'shencha',
  'skills', // Skills management system
  'skillsSync', // Skills cloud synchronization
  'smartGuide', // Smart Guide for quick actions
  'stats', // Usage statistics
  'superpowers', // Superpowers plugin integration
  'team',
  'thinking', // Thinking mode for Claude Code CLI 2.0.67+
  'tools',
  'uninstall',
  'updater',
  'vim', // Vim mode enhancement for Claude Code CLI 2.1.0+
  'workflow',
  'cloud-sync',
  'workspace', // Workspace diagnostics and guide
] as const

// Ensure i18n is initialized - safety check for utility functions
export function ensureI18nInitialized(): void {
  if (!i18n.isInitialized) {
    throw new Error(
      'i18n is not initialized. Please call initI18n() in CLI command before using utility functions.',
    )
  }
}

// Initialize i18next with fs-backend (should only be called from CLI commands)
export async function initI18n(language: SupportedLang = 'zh-CN'): Promise<void> {
  if (i18n.isInitialized) {
    // If already initialized, just change language without reloading resources
    if (i18n.language !== language) {
      await i18n.changeLanguage(language)
    }
    return
  }

  await i18n
    .use(Backend)
    .init({
      lng: language,
      fallbackLng: 'en',

      // Load all translations as a single flat structure
      ns: NAMESPACES,
      defaultNS: 'common',
      preload: [language], // Preload the selected language

      // Backend configuration for loading JSON files
      backend: {
        loadPath: (() => {
          const currentDir = dirname(fileURLToPath(import.meta.url))

          // For npm packages, we need to find the package root
          // currentDir will be something like: /path/to/node_modules/ccjk/dist/i18n
          // or in chunks: /path/to/node_modules/ccjk/dist/chunks
          const packageRoot = (() => {
            let dir = currentDir
            // Look for package.json to identify package root
            while (dir !== dirname(dir)) {
              if (existsSync(join(dir, 'package.json'))) {
                return dir
              }
              dir = dirname(dir)
            }
            return currentDir
          })()

          // Try multiple possible paths in order of preference
          const possibleBasePaths = [
            join(currentDir, 'locales'), // Development: src/i18n/locales
            join(packageRoot, 'dist/i18n/locales'), // NPM package: /node_modules/ccjk/dist/i18n/locales
            join(process.cwd(), 'dist/i18n/locales'), // Production build: ./dist/i18n/locales
            join(currentDir, '../../../dist/i18n/locales'), // Fallback for deep chunk paths
            join(currentDir, '../../i18n/locales'), // Alternative chunk structure
          ]

          // Find the first path that exists by checking for common.json
          for (const basePath of possibleBasePaths) {
            const testFile = join(basePath, 'zh-CN/common.json')
            if (existsSync(testFile)) {
              return join(basePath, '{{lng}}/{{ns}}.json')
            }
          }

          // Fallback to the production path if none found
          return join(process.cwd(), 'dist/i18n/locales/{{lng}}/{{ns}}.json')
        })(),
      },

      // Interpolation settings
      interpolation: {
        escapeValue: false, // Not needed for server-side usage
      },

      // Enable key separator for nested keys, enable namespace separator
      keySeparator: '.',
      nsSeparator: ':',

      // Debugging (disable for clean output)
      debug: false,
    })

  // Ensure all namespaces are loaded before proceeding
  for (const ns of NAMESPACES) {
    if (ns !== 'common') { // common is already loaded
      await i18n.loadNamespaces(ns)
    }
  }
}

// Simple format function for legacy compatibility
export function format(template: string, values?: Record<string, string>): string {
  if (!values)
    return template

  return Object.keys(values).reduce((result, key) => {
    return result.replace(new RegExp(`{${key}}`, 'g'), values[key])
  }, template)
}

// Language management
export async function changeLanguage(lng: SupportedLang): Promise<void> {
  await i18n.changeLanguage(lng)
}

export function getCurrentLanguage(): SupportedLang {
  return i18n.language as SupportedLang
}

// Get translation function with namespace support
export function getTranslation(_lang?: SupportedLang) {
  return (key: string, options?: Record<string, any>) => {
    // Support namespace:key format
    if (key.includes(':')) {
      return i18n.t(key, options)
    }
    // Default to common namespace
    return i18n.t(`common:${key}`, options)
  }
}

export type { SupportedLang }
