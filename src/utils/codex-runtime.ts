import { readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import ansis from 'ansis'
import { join } from 'pathe'
import { resolveCodexHome } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { exists, readFile } from './fs-operations'
import { getPlatform } from './platform'
import { parseToml } from './toml-edit'

/** Codex 可安装的运行时表面：CLI、桌面 App、IDE 扩展共用 CODEX_HOME */
export type CodexRuntimeKind = 'cli' | 'desktop' | 'ide'

export interface CodexRuntimeStatus {
  kind: CodexRuntimeKind
  /** 是否检测到已安装或曾使用 */
  detected: boolean
  /** 可展示的路径（二进制、.app、扩展目录等） */
  path?: string
  /** 弱信号：例如仅有 Electron 数据目录而无 .app */
  weakSignal?: boolean
}

export interface CodexConfigDoctorFinding {
  id: string
  severity: 'warn' | 'info'
  messageKey: string
  messageParams?: Record<string, string>
}

export interface CodexRuntimeSummary {
  configHome: string
  configHomeFromEnv: boolean
  configFile: string
  desktopDataDir: string
  runtimes: CodexRuntimeStatus[]
  findings: CodexConfigDoctorFinding[]
}

const OFFICIAL_PROVIDER_HINTS = new Set([
  'openai',
  'chatgpt',
  'default',
])

function codexDesktopDataDir(): string {
  const platform = getPlatform()
  if (platform === 'macos')
    return join(homedir(), 'Library', 'Application Support', 'Codex')
  if (platform === 'windows') {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
    return join(appData, 'Codex')
  }
  return join(homedir(), '.local', 'share', 'Codex')
}

function listHomebrewCodexAppPaths(): string[] {
  const paths: string[] = []
  for (const prefix of ['/opt/homebrew', '/usr/local']) {
    const caskroom = join(prefix, 'Caskroom', 'codex')
    if (!exists(caskroom))
      continue
    try {
      for (const version of readdirSync(caskroom)) {
        if (version.startsWith('.'))
          continue
        paths.push(join(caskroom, version, 'Codex.app'))
      }
    }
    catch {
      // ignore
    }
  }
  return paths
}

function detectDesktopAppPaths(): string[] {
  const platform = getPlatform()
  const paths: string[] = []

  if (platform === 'macos') {
    paths.push(
      '/Applications/Codex.app',
      join(homedir(), 'Applications', 'Codex.app'),
      ...listHomebrewCodexAppPaths(),
    )
  }
  else if (platform === 'windows') {
    const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
    paths.push(join(localAppData, 'Programs', 'OpenAI', 'Codex', 'Codex.exe'))
  }
  else {
    paths.push(
      join(homedir(), '.local', 'share', 'applications', 'codex.desktop'),
      '/usr/share/applications/codex.desktop',
    )
  }

  return paths.filter(path => exists(path))
}

function detectCliPaths(): string[] {
  const paths: string[] = [
    join(homedir(), '.local', 'bin', 'codex'),
    '/usr/local/bin/codex',
    '/opt/homebrew/bin/codex',
  ]

  if (getPlatform() === 'windows') {
    const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
    paths.push(join(localAppData, 'Programs', 'OpenAI', 'Codex', 'bin', 'codex.exe'))
  }

  for (const prefix of ['/opt/homebrew', '/usr/local']) {
    const cellar = join(prefix, 'Cellar', 'node')
    if (!exists(cellar))
      continue
    try {
      for (const version of readdirSync(cellar)) {
        paths.push(join(cellar, version, 'bin', 'codex'))
      }
    }
    catch {
      // ignore
    }
  }

  return paths.filter(path => exists(path))
}

function detectIdeExtensionPaths(): string[] {
  const roots = [
    join(homedir(), '.vscode', 'extensions'),
    join(homedir(), '.cursor', 'extensions'),
    join(homedir(), '.windsurf', 'extensions'),
  ]

  const matches: string[] = []
  for (const root of roots) {
    if (!exists(root))
      continue
    try {
      for (const entry of readdirSync(root)) {
        const lower = entry.toLowerCase()
        if (lower.includes('openai') && lower.includes('codex'))
          matches.push(join(root, entry))
      }
    }
    catch {
      // ignore
    }
  }
  return matches
}

function readFeatureFlags(configFile: string): Record<string, boolean> {
  if (!exists(configFile))
    return {}

  try {
    const parsed = parseToml(readFile(configFile)) as { features?: Record<string, unknown> }
    const features = parsed.features
    if (!features || typeof features !== 'object')
      return {}

    const result: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === 'boolean')
        result[key] = value
    }
    return result
  }
  catch {
    return {}
  }
}

function readModelProvider(configFile: string): string | null {
  if (!exists(configFile))
    return null

  try {
    const content = readFile(configFile)
    const active = content.match(/^\s*model_provider\s*=\s*"([^"]+)"/m)
    if (active)
      return active[1]

    const commented = content.match(/^\s*#\s*model_provider\s*=\s*"([^"]+)"/m)
    return commented?.[1] ?? null
  }
  catch {
    return null
  }
}

function isThirdPartyModelProvider(providerId: string | null): boolean {
  if (!providerId)
    return false
  const normalized = providerId.trim().toLowerCase()
  return !OFFICIAL_PROVIDER_HINTS.has(normalized)
}

function isFeatureEnabled(features: Record<string, boolean>, key: string, defaultValue: boolean): boolean {
  if (key in features)
    return features[key]
  return defaultValue
}

export function scanCodexConfigDoctorFindings(configFile = join(resolveCodexHome(), 'config.toml')): CodexConfigDoctorFinding[] {
  const findings: CodexConfigDoctorFinding[] = []
  const features = readFeatureFlags(configFile)
  const modelProvider = readModelProvider(configFile)
  const thirdParty = isThirdPartyModelProvider(modelProvider)

  const goalsEnabled = isFeatureEnabled(features, 'goals', false)
  const multiAgentEnabled = isFeatureEnabled(features, 'multi_agent', true)

  if (thirdParty && goalsEnabled) {
    findings.push({
      id: 'feature-goals-third-party',
      severity: 'warn',
      messageKey: 'codex:runtime.finding.goalsThirdParty',
      messageParams: { provider: modelProvider ?? 'unknown' },
    })
  }

  if (thirdParty && multiAgentEnabled) {
    findings.push({
      id: 'feature-multi-agent-third-party',
      severity: 'warn',
      messageKey: 'codex:runtime.finding.multiAgentThirdParty',
      messageParams: { provider: modelProvider ?? 'unknown' },
    })
  }

  if (!exists(configFile)) {
    findings.push({
      id: 'config-missing',
      severity: 'info',
      messageKey: 'codex:runtime.finding.configMissing',
    })
  }

  return findings
}

/** 同步检测本机 Codex 运行时（CLI / 桌面 / IDE），配置根目录对三者相同 */
export function detectCodexRuntimes(): CodexRuntimeSummary {
  const configHome = resolveCodexHome()
  const configFile = join(configHome, 'config.toml')
  const desktopDataDir = codexDesktopDataDir()

  const cliPaths = detectCliPaths()
  const desktopPaths = detectDesktopAppPaths()
  const idePaths = detectIdeExtensionPaths()
  const desktopDataPresent = exists(desktopDataDir)

  const runtimes: CodexRuntimeStatus[] = [
    {
      kind: 'cli',
      detected: cliPaths.length > 0,
      path: cliPaths[0],
    },
    {
      kind: 'desktop',
      detected: desktopPaths.length > 0 || desktopDataPresent,
      path: desktopPaths[0] ?? (desktopDataPresent ? desktopDataDir : undefined),
      weakSignal: desktopPaths.length === 0 && desktopDataPresent,
    },
    {
      kind: 'ide',
      detected: idePaths.length > 0,
      path: idePaths[0],
    },
  ]

  return {
    configHome,
    configHomeFromEnv: Boolean(process.env?.CODEX_HOME?.trim()),
    configFile,
    desktopDataDir,
    runtimes,
    findings: scanCodexConfigDoctorFindings(configFile),
  }
}

export function printCodexReloadHint(): void {
  ensureI18nInitialized()

  const summary = detectCodexRuntimes()
  const desktop = summary.runtimes.find(runtime => runtime.kind === 'desktop')

  console.log(ansis.gray(`\n${i18n.t('codex:runtime.reloadHint.shared', { path: summary.configHome })}`))
  if (desktop?.detected)
    console.log(ansis.gray(i18n.t('codex:runtime.reloadHint.desktop')))
  console.log('')
}

export function formatCodexRuntimeLine(runtime: CodexRuntimeStatus, t: (key: string) => string): string {
  const label = t(`codex:runtime.kind.${runtime.kind}`)
  if (!runtime.detected)
    return `${label}: ${t('codex:runtime.notDetected')}`

  const pathSuffix = runtime.path ? ` (${runtime.path})` : ''
  const weakSuffix = runtime.weakSignal ? ` — ${t('codex:runtime.weakDesktopSignal')}` : ''
  return `${label}: ${t('codex:runtime.detected')}${pathSuffix}${weakSuffix}`
}