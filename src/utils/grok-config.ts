import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import ansis from 'ansis'

export const GROK_AUTH_FILE = join(homedir(), '.grok', 'auth.json')

export function isGrokInstalled(): boolean {
  try {
    execSync('command -v grok', { stdio: 'ignore' })
    return true
  }
  catch {
    return false
  }
}

export function isGrokLoggedIn(): boolean {
  if (!existsSync(GROK_AUTH_FILE)) return false
  try {
    const data = JSON.parse(readFileSync(GROK_AUTH_FILE, 'utf-8')) as Record<string, unknown>
    return Object.keys(data).some(k => k.includes('auth.x.ai'))
  }
  catch {
    return false
  }
}

export function getGrokQuickStatus(): { installed: boolean; loggedIn: boolean; hint: string } {
  if (!isGrokInstalled()) {
    return {
      installed: false,
      loggedIn: false,
      hint: '未安装：curl -fsSL https://x.ai/cli/install.sh | bash',
    }
  }
  const loggedIn = isGrokLoggedIn()
  return {
    installed: true,
    loggedIn,
    hint: loggedIn
      ? '已登录（OAuth，~/.grok/auth.json）'
      : '未登录，运行 `grok login`',
  }
}

export function buildGrokHints(): string[] {
  const s = getGrokQuickStatus()
  const lines: string[] = []
  if (!s.installed) {
    lines.push(ansis.dim('  安装: ') + ansis.cyan('curl -fsSL https://x.ai/cli/install.sh | bash'))
    return lines
  }
  if (!s.loggedIn) {
    lines.push(ansis.yellow('  登录: ') + ansis.cyan('grok login'))
  }
  lines.push(ansis.dim('  启动: ') + ansis.cyan('grok'))
  lines.push(ansis.dim('  模型: ') + ansis.cyan('grok models'))
  return lines
}