import process from 'node:process'
import { exec } from 'tinyexec'

/**
 * China detection mode configuration
 * - 'auto': Automatic detection based on system settings
 * - 'force': Force China mode regardless of detection
 * - 'disabled': Disable China mode regardless of detection
 */
export type ChinaMode = 'auto' | 'force' | 'disabled'

/**
 * Known China-based npm registry mirrors
 */
const CHINA_REGISTRIES = [
  'npmmirror.com',
  'registry.npmmirror.com',
  'registry.npm.taobao.org',
  'registry.cnpmjs.org',
  'mirrors.huaweicloud.com',
  'mirrors.tencent.com',
]

/**
 * China timezone identifiers
 */
const CHINA_TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Chongqing',
  'Asia/Harbin',
  'Asia/Urumqi',
  'Asia/Hong_Kong',
  'Asia/Macau',
]

/**
 * China locale identifiers
 */
const CHINA_LOCALES = [
  'zh_CN',
  'zh_TW',
  'zh_HK',
  'zh_SG',
  'zh-CN',
  'zh-TW',
  'zh-HK',
  'zh-SG',
]

/**
 * Get the current China detection mode from environment variable
 * @returns The current China mode setting
 */
export function getChinaMode(): ChinaMode {
  const envMode = process.env.CCJK_CHINA_MODE?.toLowerCase()

  if (envMode === 'true' || envMode === 'force' || envMode === '1') {
    return 'force'
  }

  if (envMode === 'false' || envMode === 'disabled' || envMode === '0') {
    return 'disabled'
  }

  return 'auto'
}

/**
 * Get the current npm registry configuration
 * @returns The npm registry URL or null if not configured
 */
export async function getNpmRegistry(): Promise<string | null> {
  try {
    const result = await exec('npm', ['config', 'get', 'registry'])

    if (result.exitCode === 0 && result.stdout) {
      const registry = result.stdout.trim()
      // Filter out default/undefined responses
      if (registry && registry !== 'undefined' && !registry.startsWith('npm config')) {
        return registry
      }
    }

    return null
  }
  catch {
    // Silently fail if npm is not available or command fails
    return null
  }
}

/**
 * Check if the npm registry is a China-based mirror
 * @param registry The npm registry URL to check
 * @returns True if the registry is a known China mirror
 */
function isChinaRegistry(registry: string): boolean {
  const normalizedRegistry = registry.toLowerCase()
  return CHINA_REGISTRIES.some(mirror => normalizedRegistry.includes(mirror))
}

/**
 * Get the system timezone
 * @returns The system timezone identifier or null if unavailable
 */
function getSystemTimezone(): string | null {
  try {
    // Try Intl.DateTimeFormat API first (most reliable)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timezone) {
      return timezone
    }
  }
  catch {
    // Intl API not available or failed
  }

  // Fallback to TZ environment variable
  if (process.env.TZ) {
    return process.env.TZ
  }

  return null
}

/**
 * Check if the system timezone is China-based
 * @returns True if the timezone indicates China location
 */
function isChinaTimezone(): boolean {
  const timezone = getSystemTimezone()
  if (!timezone) {
    return false
  }

  return CHINA_TIMEZONES.some(tz => timezone.includes(tz))
}

/**
 * Get the system locale/language settings
 * @returns Array of locale identifiers
 */
function getSystemLocales(): string[] {
  const locales: string[] = []

  // Check various environment variables
  const envVars = ['LANG', 'LANGUAGE', 'LC_ALL', 'LC_MESSAGES']

  for (const envVar of envVars) {
    const value = process.env[envVar]
    if (value) {
      locales.push(value)
    }
  }

  return locales
}

/**
 * Check if the system locale indicates China
 * @returns True if any locale setting indicates China
 */
function isChinaLocale(): boolean {
  const locales = getSystemLocales()

  return locales.some((locale) => {
    const normalizedLocale = locale.toLowerCase()
    return CHINA_LOCALES.some(chinaLocale =>
      normalizedLocale.includes(chinaLocale.toLowerCase()),
    )
  })
}

/**
 * Detect if the user is in China based on multiple indicators
 * Detection strategy (in priority order):
 * 1. Environment variable CCJK_CHINA_MODE (force/disabled)
 * 2. npm registry configuration (China mirrors)
 * 3. System timezone (Asia/Shanghai, etc.)
 * 4. System locale/language (zh_CN, etc.)
 *
 * @returns Promise resolving to true if user is detected to be in China
 */
export async function isChinaUser(): Promise<boolean> {
  // Check explicit mode setting first
  const mode = getChinaMode()

  if (mode === 'force') {
    return true
  }

  if (mode === 'disabled') {
    return false
  }

  // Auto detection mode - check multiple indicators
  try {
    // Priority 1: Check npm registry configuration
    const registry = await getNpmRegistry()
    if (registry && isChinaRegistry(registry)) {
      return true
    }

    // Priority 2: Check system timezone
    if (isChinaTimezone()) {
      return true
    }

    // Priority 3: Check system locale
    if (isChinaLocale()) {
      return true
    }

    // No China indicators found
    return false
  }
  catch {
    // On any error, default to false (international mode)
    return false
  }
}

/**
 * Get a human-readable description of the detection result
 * Useful for debugging and logging
 *
 * @returns Promise resolving to detection details
 */
export async function getChinaDetectionInfo(): Promise<{
  isChina: boolean
  mode: ChinaMode
  registry: string | null
  timezone: string | null
  locales: string[]
  indicators: string[]
}> {
  const mode = getChinaMode()
  const registry = await getNpmRegistry()
  const timezone = getSystemTimezone()
  const locales = getSystemLocales()
  const indicators: string[] = []

  if (mode === 'force') {
    indicators.push('CCJK_CHINA_MODE=force')
  }
  else if (mode === 'disabled') {
    indicators.push('CCJK_CHINA_MODE=disabled')
  }

  if (registry && isChinaRegistry(registry)) {
    indicators.push(`China npm registry: ${registry}`)
  }

  if (isChinaTimezone()) {
    indicators.push(`China timezone: ${timezone}`)
  }

  if (isChinaLocale()) {
    indicators.push(`China locale: ${locales.join(', ')}`)
  }

  const isChina = await isChinaUser()

  return {
    isChina,
    mode,
    registry,
    timezone,
    locales,
    indicators,
  }
}
