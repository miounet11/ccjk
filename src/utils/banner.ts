import ansis from 'ansis'
import { homepage, version } from '../../package.json'
import { ensureI18nInitialized, i18n } from '../i18n'

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
  const paddedTitle = padToDisplayWidth('CCJK', 55)

  console.log(
    ansis.green.bold(`
╔════════════════════════════════════════════════════════════════╗
║  ${ansis.hex('#34d399')('┏╮╭┓')}        ${ansis.white.bold('CCJK')} · ${ansis.hex('#86efac')('中国龍 · Jade Dragon')}                         ║
║  ${ansis.hex('#22c55e')('╰╲╱╯')}   ██████╗ ██████╗     ██╗  ██╗      ${ansis.hex('#bbf7d0')(paddedSubtitle)} ║
║   ${ansis.hex('#16a34a')('╭龍╮')} ██╔════╝██╔════╝     ██║ ██╔╝                         ║
║  ${ansis.hex('#15803d')('╭╯╰╲')} ██║     ██║          █████╔╝     ${ansis.hex('#84cc16')('◇')}                   ║
║  ${ansis.hex('#166534')('╰╮╭╯')} ██║     ██║          ██╔═██╗    ${ansis.hex('#22c55e')('╱╲')}                  ║
║   ${ansis.hex('#14532d')('╰╯')}  ╚██████╗╚██████╗     ██║  ██╗  ${ansis.hex('#4ade80')('╱  ╲')}                 ║
║        ╚═════╝ ╚═════╝     ╚═╝  ╚═╝ ${ansis.hex('#16a34a')('╲__╱')}                 ║
║                                                                ║
║   ${ansis.white.bold(paddedTitle)} — Clavue / Claude / Codex / Grok 统一配置     ║
║   ${ansis.hex('#bbf7d0')('Emerald setup experience for four AI coding tools')}         ║
╚════════════════════════════════════════════════════════════════╝
`),
  )
}

export function displayBannerWithInfo(subtitle?: string): void {
  displayBanner(subtitle)
  console.log(ansis.gray(`  Version: ${ansis.green(version)}  |  ${ansis.green(homepage)}\n`))
}
