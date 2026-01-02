import ansis from 'ansis'
import { homepage, version } from '../../package.json'
import { ensureI18nInitialized, i18n } from '../i18n'

// Enhanced color palette for CCJK
export const COLORS = {
  primary: ansis.hex('#00D4FF'), // Cyan blue
  secondary: ansis.hex('#00FF88'), // Spring green
  accent: ansis.hex('#FFD700'), // Gold
  warning: ansis.hex('#FFA500'), // Orange
  error: ansis.hex('#FF4444'), // Red
  success: ansis.hex('#00FF7F'), // Green
  muted: ansis.gray,
  bold: ansis.bold,
}

function getDisplayWidth(str: string): number {
  let width = 0
  for (const char of str) {
    // Chinese characters, full-width symbols, and other wide characters
    if (char.match(/[\u4E00-\u9FFF\uFF01-\uFF60\u3000-\u303F]/)) {
      width += 2
    }
    else {
      width += 1
    }
  }
  return width
}

function padToDisplayWidth(str: string, targetWidth: number): string {
  const currentWidth = getDisplayWidth(str)
  const paddingNeeded = Math.max(0, targetWidth - currentWidth)
  return str + ' '.repeat(paddingNeeded)
}

export function displayBanner(subtitle?: string): void {
  ensureI18nInitialized()
  const defaultSubtitle = i18n.t('cli:banner.subtitle')
  const subtitleText = subtitle || defaultSubtitle
  const paddedSubtitle = padToDisplayWidth(subtitleText, 28)

  console.log(
    ansis.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗  ██████╗      ██╗██╗  ██╗                           ║
║  ██╔════╝ ██╔════╝      ██║██║ ██╔╝                           ║
║  ██║      ██║           ██║█████╔╝    ${ansis.white.bold('Claude Code JinKu')}       ║
║  ██║      ██║      ██   ██║██╔═██╗    ${ansis.gray(`v${version}`)}${' '.repeat(Math.max(0, 17 - version.length))}║
║  ╚██████╗ ╚██████╗ ╚█████╔╝██║  ██╗                           ║
║   ╚═════╝  ╚═════╝  ╚════╝ ╚═╝  ╚═╝   ${ansis.gray(paddedSubtitle)} ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`),
  )
}

export function displayBannerWithInfo(subtitle?: string): void {
  displayBanner(subtitle)
  console.log(ansis.gray(`  ${ansis.cyan('ccjk')} - Advanced AI Development Assistant`))
  console.log(ansis.gray(`  ${ansis.cyan(homepage)}\n`))
}

// Progress bar utility
export function renderProgressBar(progress: number, width: number = 30): string {
  const filled = Math.round((progress / 100) * width)
  const empty = width - filled
  const bar = COLORS.primary('█'.repeat(filled)) + ansis.gray('░'.repeat(empty))
  const percentage = `${Math.round(progress)}%`.padStart(4)
  return `[${bar}] ${ansis.cyan(percentage)}`
}

// Box drawing utilities
export type BoxStyle = 'single' | 'double' | 'rounded' | 'heavy'

const BOX_CHARS: Record<BoxStyle, { tl: string, tr: string, bl: string, br: string, h: string, v: string }> = {
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  heavy: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
}

export function boxify(content: string, style: BoxStyle = 'double', title?: string): string {
  const chars = BOX_CHARS[style]
  const lines = content.split('\n')
  const maxWidth = Math.max(...lines.map(getDisplayWidth), title ? getDisplayWidth(title) + 4 : 0)

  const paddedLines = lines.map((line) => {
    const padding = maxWidth - getDisplayWidth(line)
    return `${chars.v} ${line}${' '.repeat(padding)} ${chars.v}`
  })

  let topBorder = `${chars.tl}${chars.h.repeat(maxWidth + 2)}${chars.tr}`
  if (title) {
    const titlePadding = Math.floor((maxWidth - getDisplayWidth(title)) / 2)
    topBorder = `${chars.tl}${chars.h.repeat(titlePadding)} ${title} ${chars.h.repeat(maxWidth - titlePadding - getDisplayWidth(title))}${chars.tr}`
  }

  const bottomBorder = `${chars.bl}${chars.h.repeat(maxWidth + 2)}${chars.br}`

  return [topBorder, ...paddedLines, bottomBorder].join('\n')
}

// Section divider
export function sectionDivider(title?: string, width: number = 50): string {
  if (!title) {
    return ansis.cyan('═'.repeat(width))
  }
  const padding = Math.floor((width - getDisplayWidth(title) - 2) / 2)
  return ansis.cyan(`${'═'.repeat(padding)} ${ansis.white.bold(title)} ${'═'.repeat(width - padding - getDisplayWidth(title) - 2)}`)
}

// Status indicators
export const STATUS = {
  success: (text: string) => `${ansis.green('✓')} ${text}`,
  error: (text: string) => `${ansis.red('✗')} ${text}`,
  warning: (text: string) => `${ansis.yellow('⚠')} ${text}`,
  info: (text: string) => `${ansis.blue('ℹ')} ${text}`,
  pending: (text: string) => `${ansis.gray('○')} ${text}`,
  inProgress: (text: string) => `${ansis.cyan('◐')} ${text}`,
}

// Menu item formatter
export function menuItem(key: string, label: string, description?: string): string {
  const keyPart = ansis.cyan.bold(`[${key}]`)
  const labelPart = ansis.white(label)
  const descPart = description ? ansis.gray(` - ${description}`) : ''
  return `  ${keyPart} ${labelPart}${descPart}`
}
