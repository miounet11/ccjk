/**
 * CCJK Banner & UI Utilities
 *
 * MUD-style terminal aesthetics: green text, white highlights
 */

import type { BoxStyle } from './theme'
import ansis from 'ansis'
import { homepage, version } from '../../package.json'
import { ensureI18nInitialized, i18n } from '../i18n'
import {
  box,
  boxify,
  COLORS,
  divider,
  header,
  menuItem,
  progress,
  status,
  theme,
} from './theme'

// Re-export theme utilities for backward compatibility
export {
  box,
  boxify,
  type BoxStyle,
  COLORS,
  divider,
  header,
  menuItem,
  progress,
  status,
  theme,
}

/** Calculate display width considering CJK characters */
export function getDisplayWidth(str: string): number {
  let width = 0
  for (const char of str) {
    // CJK characters and full-width symbols take 2 columns
    if (char.match(/[\u4E00-\u9FFF\uFF01-\uFF60\u3000-\u303F]/)) {
      width += 2
    }
    else {
      width += 1
    }
  }
  return width
}

/** Pad string to target display width */
export function padToDisplayWidth(str: string, targetWidth: number): string {
  const currentWidth = getDisplayWidth(str)
  const paddingNeeded = Math.max(0, targetWidth - currentWidth)
  return str + ' '.repeat(paddingNeeded)
}

/**
 * Display CCJK ASCII banner in MUD style
 *
 * Green border with white highlights - classic terminal aesthetic
 */
export function displayBanner(subtitle?: string): void {
  ensureI18nInitialized()
  const defaultSubtitle = i18n.t('cli:banner.subtitle')
  const subtitleText = subtitle || defaultSubtitle
  const paddedSubtitle = padToDisplayWidth(subtitleText, 28)

  // MUD style: green border, white text highlights
  console.log(
    ansis.green.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗  ██████╗      ██╗██╗  ██╗                           ║
║  ██╔════╝ ██╔════╝      ██║██║ ██╔╝                           ║
║  ██║      ██║           ██║█████╔╝    ${ansis.white.bold('JinKu')}                 ║
║  ██║      ██║      ██   ██║██╔═██╗    ${ansis.gray(`v${version}`)}${' '.repeat(Math.max(0, 17 - version.length))}║
║  ╚██████╗ ╚██████╗ ╚█████╔╝██║  ██╗                           ║
║   ╚═════╝  ╚═════╝  ╚════╝ ╚═╝  ╚═╝   ${ansis.gray(paddedSubtitle)} ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`),
  )
}

/** Display banner with additional info */
export function displayBannerWithInfo(subtitle?: string): void {
  displayBanner(subtitle)
  console.log(ansis.gray(`  ${ansis.green('ccjk')} - Advanced AI Development Assistant`))
  console.log(ansis.gray(`  ${ansis.green(homepage)}\n`))
}

/** Render progress bar (legacy, use theme.progress instead) */
export function renderProgressBar(pct: number, width: number = 30): string {
  const filled = Math.round((pct / 100) * width)
  const empty = width - filled
  const bar = theme.primary('█'.repeat(filled)) + ansis.gray('░'.repeat(empty))
  const percentage = `${Math.round(pct)}%`.padStart(4)
  return `[${bar}] ${theme.secondary(percentage)}`
}

/** Section divider with optional title */
export function sectionDivider(title?: string, width: number = 50): string {
  if (!title) {
    return theme.primary('═'.repeat(width))
  }
  const padding = Math.floor((width - getDisplayWidth(title) - 2) / 2)
  return theme.primary(`${'═'.repeat(padding)} ${ansis.white.bold(title)} ${'═'.repeat(width - padding - getDisplayWidth(title) - 2)}`)
}

/**
 * Display command discovery banner with bilingual command list
 * Shows CCJK commands and Claude Code commands
 */
export function displayCommandDiscovery(): void {
  ensureI18nInitialized()
  const isZhCN = i18n.language === 'zh-CN'

  // CCJK Commands section
  console.log(ansis.green.bold(`\n${i18n.t('cli:commandDiscovery.title')}`))
  console.log(ansis.gray('─'.repeat(60)))

  const ccjkCommands = [
    { cmd: '/status', desc: i18n.t('cli:commandDiscovery.status'), descEn: 'Brain Dashboard' },
    { cmd: '/health', desc: i18n.t('cli:commandDiscovery.health'), descEn: 'Health Check' },
    { cmd: '/search', desc: i18n.t('cli:commandDiscovery.search'), descEn: 'Search Contexts' },
    { cmd: '/compress', desc: i18n.t('cli:commandDiscovery.compress'), descEn: 'Compression Stats' },
    { cmd: '/tasks', desc: i18n.t('cli:commandDiscovery.tasks'), descEn: 'Task Manager' },
    { cmd: '/backup', desc: i18n.t('cli:commandDiscovery.backup'), descEn: 'Create Backup' },
    { cmd: '/optimize', desc: i18n.t('cli:commandDiscovery.optimize'), descEn: 'Optimize DB' },
  ]

  for (const { cmd, desc, descEn } of ccjkCommands) {
    const cmdPadded = cmd.padEnd(12)
    if (isZhCN) {
      console.log(`  ${ansis.cyan(cmdPadded)} - ${ansis.white(desc)} ${ansis.gray(`(${descEn})`)}`)}
    else {
      console.log(`  ${ansis.cyan(cmdPadded)} - ${ansis.white(desc)}`)
    }
  }

  // Claude Code Commands section
  console.log(ansis.green.bold(`\n${i18n.t('cli:commandDiscovery.claudeCodeTitle')}`))
  console.log(ansis.gray('─'.repeat(60)))

  const claudeCommands = [
    { cmd: '/help', desc: i18n.t('cli:commandDiscovery.help'), descEn: 'Show all commands' },
    { cmd: '/clear', desc: i18n.t('cli:commandDiscovery.clear'), descEn: 'Clear conversation' },
    { cmd: '/reset', desc: i18n.t('cli:commandDiscovery.reset'), descEn: 'Reset session' },
  ]

  for (const { cmd, desc, descEn } of claudeCommands) {
    const cmdPadded = cmd.padEnd(12)
    if (isZhCN) {
      console.log(`  ${ansis.cyan(cmdPadded)} - ${ansis.white(desc)} ${ansis.gray(`(${descEn})`)}`)}
    else {
      console.log(`  ${ansis.cyan(cmdPadded)} - ${ansis.white(desc)}`)
    }
  }

  console.log(ansis.gray('\n' + '─'.repeat(60)))
  console.log(ansis.gray(`  ${i18n.t('cli:commandDiscovery.footer')}\n`))
}

/** Status indicators (legacy, use theme.status instead) */
export const STATUS = {
  success: status.ok,
  error: status.fail,
  warning: status.warn,
  info: status.info,
  pending: status.wait,
  inProgress: status.work,
}
