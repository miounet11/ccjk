/**
 * CCJK Theme System - MUD Style
 *
 * Inspired by classic MUD (Multi-User Dungeon) games,
 * featuring green terminal text on dark backgrounds.
 *
 * "In the beginning, there was green text on black screen..."
 */

import ansis from 'ansis'

/**
 * MUD-style color palette for CCJK
 *
 * Primary: Terminal green - the classic hacker aesthetic
 * Secondary: Bright white - for emphasis and contrast
 * Accent: Dim green - for subtle highlights
 */
export const theme = {
  // === Core Colors ===
  /** Terminal green - main text color */
  primary: ansis.hex('#00FF00'),
  /** Bright white - emphasis and highlights */
  secondary: ansis.white,
  /** Dim green - subtle accents */
  accent: ansis.hex('#00CC00'),

  // === Semantic Colors ===
  /** Success - bright green checkmark */
  success: ansis.hex('#00FF7F'),
  /** Warning - amber/yellow for caution */
  warning: ansis.hex('#FFD700'),
  /** Error - red for failures */
  error: ansis.hex('#FF4444'),
  /** Info - cyan for informational messages */
  info: ansis.hex('#00FFFF'),

  // === Text Styles ===
  /** Muted text - gray for less important info */
  muted: ansis.gray,
  /** Bold text */
  bold: ansis.bold,
  /** Dim text - for background info */
  dim: ansis.dim,

  // === MUD-specific Styles ===
  /** Command prompt style - bright green */
  prompt: ansis.hex('#00FF00').bold,
  /** System message - white */
  system: ansis.white,
  /** NPC/hint text - dim green */
  hint: ansis.hex('#88CC88'),
  /** Quest/task highlight - bright */
  quest: ansis.hex('#00FF00').bold,
  /** Item/feature name - white bold */
  item: ansis.white.bold,
} as const

/**
 * Status indicators with MUD-style symbols
 */
export const status = {
  /** ✓ Success indicator */
  ok: (text: string) => `${ansis.green('✓')} ${text}`,
  /** ✗ Error indicator */
  fail: (text: string) => `${ansis.red('✗')} ${text}`,
  /** ⚠ Warning indicator */
  warn: (text: string) => `${ansis.yellow('⚠')} ${text}`,
  /** ℹ Info indicator */
  info: (text: string) => `${ansis.cyan('ℹ')} ${text}`,
  /** ○ Pending indicator */
  wait: (text: string) => `${ansis.gray('○')} ${text}`,
  /** ◐ In-progress indicator */
  work: (text: string) => `${ansis.green('◐')} ${text}`,
  /** → Arrow indicator */
  step: (text: string) => `${ansis.green('→')} ${text}`,
  /** • Bullet point */
  dot: (text: string) => `${ansis.green('•')} ${text}`,
} as const

/**
 * Box drawing characters for terminal UI
 */
export const box = {
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  heavy: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
} as const

export type BoxStyle = keyof typeof box

/**
 * Format a menu item in MUD style
 *
 * @example
 * menuItem('1', 'Start Game', 'Begin your adventure')
 * // Output: [1] Start Game - Begin your adventure
 */
export function menuItem(key: string, label: string, desc?: string): string {
  const keyPart = theme.primary.bold(`[${key}]`)
  const labelPart = theme.secondary(label)
  const descPart = desc ? theme.muted(` - ${desc}`) : ''
  return `  ${keyPart} ${labelPart}${descPart}`
}

/**
 * Format a section header in MUD style
 *
 * @example
 * header('Inventory')
 * // Output: ═══ Inventory ═══
 */
export function header(title: string, width: number = 50): string {
  const titleLen = title.length + 2
  const sideLen = Math.floor((width - titleLen) / 2)
  const line = '═'.repeat(sideLen)
  return theme.primary(`${line} ${theme.secondary.bold(title)} ${line}`)
}

/**
 * Format a divider line
 */
export function divider(width: number = 50, char: string = '─'): string {
  return theme.muted(char.repeat(width))
}

/**
 * Render a progress bar in MUD style
 *
 * @example
 * progress(75)
 * // Output: [████████████████████░░░░░░░░░░] 75%
 */
export function progress(percent: number, width: number = 30): string {
  const filled = Math.round((percent / 100) * width)
  const empty = width - filled
  const bar = theme.primary('█'.repeat(filled)) + theme.muted('░'.repeat(empty))
  const pct = `${Math.round(percent)}%`.padStart(4)
  return `[${bar}] ${theme.secondary(pct)}`
}

/**
 * Format text in a box
 */
export function boxify(
  content: string,
  style: BoxStyle = 'double',
  title?: string,
): string {
  const chars = box[style]
  const lines = content.split('\n')

  // Calculate max width considering display width
  const getWidth = (s: string): number => {
    let w = 0
    for (const c of s) {
      w += c.match(/[\u4E00-\u9FFF\uFF01-\uFF60\u3000-\u303F]/) ? 2 : 1
    }
    return w
  }

  const maxWidth = Math.max(
    ...lines.map(getWidth),
    title ? getWidth(title) + 4 : 0,
  )

  const paddedLines = lines.map((line) => {
    const padding = maxWidth - getWidth(line)
    return `${chars.v} ${line}${' '.repeat(padding)} ${chars.v}`
  })

  let topBorder = `${chars.tl}${chars.h.repeat(maxWidth + 2)}${chars.tr}`
  if (title) {
    const pad = Math.floor((maxWidth - getWidth(title)) / 2)
    topBorder = `${chars.tl}${chars.h.repeat(pad)} ${title} ${chars.h.repeat(maxWidth - pad - getWidth(title))}${chars.tr}`
  }

  const bottomBorder = `${chars.bl}${chars.h.repeat(maxWidth + 2)}${chars.br}`

  return theme.primary([topBorder, ...paddedLines, bottomBorder].join('\n'))
}

// Re-export for backward compatibility
export { theme as COLORS }
