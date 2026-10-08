/**
 * Claude Settings Guard — crash-prevention layer for ~/.claude/settings.json
 *
 * Super-set of ZCF-style config hygiene:
 * - Official-key whitelist aligned with Claude Code 2.1+ Zod schema
 * - Strip legacy / dirty keys that cause validation noise or runtime hangs
 * - Migrate deprecated shapes (thinking → alwaysThinkingEnabled)
 * - Validate statusLine / fileSuggestion command contracts
 * - Optional API endpoint health probe after writes
 * - Atomic write + timestamped backup
 *
 * Philosophy: never leave the user with a settings file that makes Claude
 * fail to start or hang after a successful "configure" action.
 */

import type { ClaudeSettings } from '../types/config'
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { hostname } from 'node:os'
import dayjs from 'dayjs'
import { dirname, join } from 'pathe'
import { CLAUDE_DIR, SETTINGS_FILE } from '../constants'
import { ensureDir, exists, writeFileAtomic } from './fs-operations'
import { validateStatusLineConfig, sanitizeStatusLineConfig } from './statusline-validator'

/** Local backup helper — avoids circular import with json-config */
function backupSettingsFile(path: string, backupDir?: string): string | null {
  if (!exists(path) && !existsSync(path))
    return null
  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const fileName = path.split('/').pop() || 'settings.json'
  const baseDir = backupDir || join(dirname(path), 'backup')
  const backupPath = join(baseDir, `${fileName}.backup_${timestamp}`)
  try {
    ensureDir(baseDir)
    copyFileSync(path, backupPath)
    return backupPath
  }
  catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Official top-level keys (Claude Code 2.1.x settings schema subset + known)
// Keys not in this set are stripped on normalize (passthrough was the crash vector).
// ---------------------------------------------------------------------------

export const OFFICIAL_SETTINGS_KEYS = new Set([
  '$schema',
  'model',
  'env',
  'permissions',
  'hooks',
  'statusLine',
  'outputStyle',
  'includeCoAuthoredBy',
  'includeGitInstructions',
  'attribution',
  'alwaysThinkingEnabled',
  'fileSuggestion',
  'respectGitignore',
  'showTurnDuration',
  'showMessageTimestamps',
  'skipDangerousModePermissionPrompt',
  'allowUnsandboxedCommands',
  'plansDirectory',
  'language',
  'agent',
  'enabledPlugins',
  'enabledMcpjsonServers',
  'disabledMcpjsonServers',
  'enableAllProjectMcpServers',
  'allowedMcpServers',
  'deniedMcpServers',
  'allowedTools',
  'disallowedTools',
  'cleanupPeriodDays',
  'autoCompactEnabled',
  'autoScrollEnabled',
  'fileCheckpointingEnabled',
  'terminalProgressBarEnabled',
  'todoFeatureEnabled',
  'spinnerTipsEnabled',
  'prefersReducedMotion',
  'theme',
  'verbose',
  'editorMode',
  'preferredNotifChannel',
  'effortLevel',
  'apiKeyHelper',
  'awsAuthRefresh',
  'awsCredentialExport',
  'forceLoginMethod',
  'forceLoginOrgUUID',
  'companyAnnouncements',
  'marketplaces',
  'extraKnownMarketplaces',
  'sandbox',
  'defaultShell',
  'disableAllHooks',
  'availableModels',
  'modelOverrides',
  'teammateMode',
  'remoteControlAtStartup',
  'autoUploadSessions',
  'mcpServers',
  // retained for managed / enterprise sources
  'policySettings',
])

/**
 * Known dirty / legacy keys written by older CCJK / forks / experiments.
 * Always removed on normalize.
 */
export const LEGACY_DIRTY_KEYS = new Set([
  'thinking', // use alwaysThinkingEnabled
  'auto', // plugin install flag is boolean elsewhere; {mcp:0} is invalid
  'allowBrowser',
  'chat',
  'index',
  'description',
  'experimental', // empty bag often left by migrations
])

/** Bare commands that are not valid fileSuggestion helpers */
const INVALID_FILE_SUGGESTION_COMMANDS = new Set([
  'git',
  'ls',
  'cat',
  'echo',
  'true',
  'false',
  'pwd',
])

export type SettingsIssueSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface SettingsIssue {
  severity: SettingsIssueSeverity
  key: string
  message: string
  fix: string
}

export interface NormalizeResult {
  settings: ClaudeSettings
  removedKeys: string[]
  migrated: string[]
  issues: SettingsIssue[]
}

export interface EndpointHealthResult {
  ok: boolean
  url: string
  latencyMs?: number
  error?: string
  isLocal: boolean
  listening?: boolean
}

export interface WriteSafeSettingsOptions {
  /** Create timestamped backup before write (default true) */
  backup?: boolean
  /** Path override (default SETTINGS_FILE) */
  path?: string
  /** Probe ANTHROPIC_BASE_URL after write (default true for local URLs) */
  healthCheck?: boolean | 'local-only' | 'always' | 'never'
  /** Health check timeout ms (default 2500) */
  healthTimeoutMs?: number
  /** Preserve unknown official-looking keys (default false — strict whitelist) */
  strict?: boolean
}

export interface WriteSafeSettingsResult {
  path: string
  backupPath: string | null
  removedKeys: string[]
  migrated: string[]
  issues: SettingsIssue[]
  health?: EndpointHealthResult
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export function analyzeClaudeSettings(raw: unknown): SettingsIssue[] {
  const issues: SettingsIssue[] = []

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    issues.push({
      severity: 'critical',
      key: '',
      message: 'settings.json is not a JSON object',
      fix: 'Restore from backup or run: ccjk config repair',
    })
    return issues
  }

  const settings = raw as Record<string, unknown>

  for (const key of Object.keys(settings)) {
    if (LEGACY_DIRTY_KEYS.has(key)) {
      issues.push({
        severity: key === 'thinking' || key === 'auto' ? 'high' : 'medium',
        key,
        message: `Legacy/dirty field "${key}" is not part of Claude Code official schema`,
        fix: `Remove "${key}" (auto-fixed by ccjk config repair)`,
      })
    }
    else if (!OFFICIAL_SETTINGS_KEYS.has(key) && !key.startsWith('$')) {
      issues.push({
        severity: 'low',
        key,
        message: `Unrecognized settings field "${key}"`,
        fix: `Remove "${key}" or upgrade Claude Code if this is a new official field`,
      })
    }
  }

  // thinking object vs alwaysThinkingEnabled
  if ('thinking' in settings) {
    issues.push({
      severity: 'high',
      key: 'thinking',
      message: 'Use alwaysThinkingEnabled (boolean), not thinking.enabled/budgetTokens',
      fix: 'Migrate to "alwaysThinkingEnabled": false|true',
    })
  }

  // empty strings
  for (const k of ['language', 'agent'] as const) {
    if (settings[k] === '') {
      issues.push({
        severity: 'low',
        key: k,
        message: `Empty string "${k}" should be omitted`,
        fix: `Delete "${k}"`,
      })
    }
  }

  // fileSuggestion
  const fsug = settings.fileSuggestion
  if (fsug !== undefined) {
    if (!isValidFileSuggestion(fsug)) {
      issues.push({
        severity: 'high',
        key: 'fileSuggestion',
        message: 'Invalid fileSuggestion; Claude expects {type:"command", command:"<helper that prints paths>"}',
        fix: 'Remove fileSuggestion or provide a real path-suggestion command',
      })
    }
    else if (
      typeof fsug === 'object'
      && fsug
      && INVALID_FILE_SUGGESTION_COMMANDS.has(String((fsug as any).command || '').trim())
    ) {
      issues.push({
        severity: 'high',
        key: 'fileSuggestion.command',
        message: `fileSuggestion.command="${(fsug as any).command}" is not a valid helper (will hang/fail on @ mentions)`,
        fix: 'Remove fileSuggestion or use a dedicated suggestion script',
      })
    }
  }

  // statusLine
  if (settings.statusLine !== undefined && !validateStatusLineConfig(settings.statusLine)) {
    issues.push({
      severity: 'medium',
      key: 'statusLine',
      message: 'Invalid statusLine config',
      fix: 'Use {type:"command", command:"..."} or remove statusLine',
    })
  }

  // env
  const env = settings.env
  if (env !== undefined) {
    if (typeof env !== 'object' || env === null || Array.isArray(env)) {
      issues.push({
        severity: 'critical',
        key: 'env',
        message: 'env must be an object of string values',
        fix: 'Fix env structure',
      })
    }
    else {
      const envObj = env as Record<string, unknown>
      for (const [k, v] of Object.entries(envObj)) {
        if (v !== undefined && typeof v !== 'string') {
          issues.push({
            severity: 'high',
            key: `env.${k}`,
            message: 'Environment values must be strings',
            fix: `Wrap env.${k} in quotes`,
          })
        }
      }
      const baseUrl = envObj.ANTHROPIC_BASE_URL
      if (typeof baseUrl === 'string' && isLocalUrl(baseUrl)) {
        issues.push({
          severity: 'critical',
          key: 'env.ANTHROPIC_BASE_URL',
          message: `Local API base URL ${baseUrl} — Claude will fail if the proxy is not running`,
          fix: 'Start local proxy (e.g. ccr start) or switch to a remote/official URL',
        })
      }
    }
  }

  // permissions
  const perms = settings.permissions
  if (perms !== undefined) {
    if (typeof perms !== 'object' || perms === null || Array.isArray(perms)) {
      issues.push({
        severity: 'high',
        key: 'permissions',
        message: 'permissions must be an object',
        fix: 'Fix permissions structure',
      })
    }
    else {
      const p = perms as Record<string, unknown>
      for (const arrKey of ['allow', 'deny', 'ask'] as const) {
        if (p[arrKey] !== undefined && !Array.isArray(p[arrKey])) {
          issues.push({
            severity: 'high',
            key: `permissions.${arrKey}`,
            message: `permissions.${arrKey} must be an array of strings`,
            fix: `Convert permissions.${arrKey} to string array`,
          })
        }
      }
    }
  }

  // alwaysThinkingEnabled type
  if (
    settings.alwaysThinkingEnabled !== undefined
    && typeof settings.alwaysThinkingEnabled !== 'boolean'
  ) {
    issues.push({
      severity: 'medium',
      key: 'alwaysThinkingEnabled',
      message: 'alwaysThinkingEnabled must be boolean',
      fix: 'Set true or false without quotes',
    })
  }

  return issues
}

// ---------------------------------------------------------------------------
// Normalize / repair
// ---------------------------------------------------------------------------

export function normalizeClaudeSettings(
  raw: unknown,
  options: { strict?: boolean } = {},
): NormalizeResult {
  const strict = options.strict !== false
  const issues = analyzeClaudeSettings(raw)
  const removedKeys: string[] = []
  const migrated: string[] = []

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { settings: {}, removedKeys, migrated, issues }
  }

  const input = raw as Record<string, any>
  const out: Record<string, any> = {}

  // Migrate thinking → alwaysThinkingEnabled
  if (input.thinking && typeof input.thinking === 'object') {
    if (typeof input.alwaysThinkingEnabled !== 'boolean') {
      out.alwaysThinkingEnabled = input.thinking.enabled === true
      migrated.push('thinking → alwaysThinkingEnabled')
    }
    removedKeys.push('thinking')
  }

  for (const [key, value] of Object.entries(input)) {
    if (key === 'thinking')
      continue

    if (LEGACY_DIRTY_KEYS.has(key)) {
      removedKeys.push(key)
      continue
    }

    if (strict && !OFFICIAL_SETTINGS_KEYS.has(key) && !key.startsWith('$')) {
      removedKeys.push(key)
      continue
    }

    // Drop empty optional strings
    if ((key === 'language' || key === 'agent') && value === '') {
      removedKeys.push(key)
      continue
    }

    if (key === 'env') {
      out.env = normalizeEnv(value)
      continue
    }

    if (key === 'permissions') {
      out.permissions = normalizePermissions(value)
      continue
    }

    if (key === 'statusLine') {
      const clean = sanitizeStatusLineConfig(value)
      if (clean)
        out.statusLine = clean
      else
        removedKeys.push('statusLine')
      continue
    }

    if (key === 'fileSuggestion') {
      if (isValidFileSuggestion(value) && !isInvalidFileSuggestionCommand(value)) {
        out.fileSuggestion = {
          type: 'command',
          command: String((value as any).command).trim(),
        }
      }
      else {
        removedKeys.push('fileSuggestion')
      }
      continue
    }

    if (key === 'alwaysThinkingEnabled') {
      if (typeof value === 'boolean')
        out.alwaysThinkingEnabled = value
      else
        removedKeys.push('alwaysThinkingEnabled')
      continue
    }

    if (key === 'attribution') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const attr: Record<string, string> = {}
        if (typeof (value as any).commit === 'string')
          attr.commit = (value as any).commit
        if (typeof (value as any).pr === 'string')
          attr.pr = (value as any).pr
        // empty object is valid (defaults)
        out.attribution = attr
      }
      else {
        removedKeys.push('attribution')
      }
      continue
    }

    if (key === 'disallowedTools' || key === 'allowedTools') {
      if (Array.isArray(value)) {
        out[key] = value.filter((item: unknown) => typeof item === 'string')
      }
      else {
        removedKeys.push(key)
      }
      continue
    }

    if (key === 'hooks') {
      if (value && typeof value === 'object' && !Array.isArray(value))
        out.hooks = value
      else if (value === undefined)
        continue
      else
        removedKeys.push('hooks')
      continue
    }

    // Booleans
    if (
      [
        'includeCoAuthoredBy',
        'includeGitInstructions',
        'respectGitignore',
        'showTurnDuration',
        'showMessageTimestamps',
        'skipDangerousModePermissionPrompt',
        'allowUnsandboxedCommands',
        'autoCompactEnabled',
        'autoScrollEnabled',
        'fileCheckpointingEnabled',
        'terminalProgressBarEnabled',
        'todoFeatureEnabled',
        'spinnerTipsEnabled',
        'prefersReducedMotion',
        'verbose',
        'enableAllProjectMcpServers',
        'disableAllHooks',
        'remoteControlAtStartup',
        'autoUploadSessions',
      ].includes(key)
    ) {
      if (typeof value === 'boolean')
        out[key] = value
      else
        removedKeys.push(key)
      continue
    }

    // model: official presets only (custom models use env ANTHROPIC_*_MODEL)
    if (key === 'model') {
      if (typeof value === 'string' && ['opus', 'sonnet', 'sonnet[1m]'].includes(value))
        out.model = value as ClaudeSettings['model']
      else
        removedKeys.push('model')
      continue
    }

    // strings
    if (['outputStyle', 'language', 'agent', 'plansDirectory', 'theme', 'editorMode', 'preferredNotifChannel', 'defaultShell', 'forceLoginMethod', 'forceLoginOrgUUID', 'apiKeyHelper', 'effortLevel'].includes(key)) {
      if (typeof value === 'string' && value.length > 0)
        out[key] = value
      else
        removedKeys.push(key)
      continue
    }

    // numbers
    if (key === 'cleanupPeriodDays') {
      if (typeof value === 'number' && Number.isInteger(value) && value >= 1)
        out[key] = value
      else
        removedKeys.push(key)
      continue
    }

    // generic pass-through for remaining official keys (objects/arrays)
    out[key] = value
  }

  // Ensure schema pointer for editor validation
  if (!out.$schema) {
    out.$schema = 'https://json.schemastore.org/claude-code-settings.json'
  }

  return {
    settings: out as ClaudeSettings,
    removedKeys: [...new Set(removedKeys)],
    migrated,
    issues,
  }
}

function normalizeEnv(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined

  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    // Claude Code requires env values to be strings; drop null/objects/arrays
    if (typeof v === 'string')
      env[k] = v
    else if (typeof v === 'number' || typeof v === 'boolean')
      env[k] = String(v)
    // skip undefined / objects / arrays
  }
  return Object.keys(env).length > 0 ? env : undefined
}

function normalizePermissions(value: unknown): ClaudeSettings['permissions'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined

  const src = value as Record<string, unknown>
  const perms: Record<string, unknown> = {}

  for (const arrKey of ['allow', 'deny', 'ask', 'additionalDirectories'] as const) {
    if (Array.isArray(src[arrKey])) {
      perms[arrKey] = (src[arrKey] as unknown[]).filter(item => typeof item === 'string')
    }
  }

  if (typeof src.defaultMode === 'string')
    perms.defaultMode = src.defaultMode

  // preserve other known permission subfields that are strings/booleans
  for (const [k, v] of Object.entries(src)) {
    if (k in perms)
      continue
    if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number')
      perms[k] = v
  }

  return Object.keys(perms).length > 0
    ? (perms as ClaudeSettings['permissions'])
    : undefined
}

function isValidFileSuggestion(value: unknown): boolean {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && (value as any).type === 'command'
    && typeof (value as any).command === 'string'
    && (value as any).command.trim().length > 0,
  )
}

function isInvalidFileSuggestionCommand(value: unknown): boolean {
  if (!isValidFileSuggestion(value))
    return true
  const cmd = String((value as any).command).trim()
  // bare command without args and in denylist
  const first = cmd.split(/\s+/)[0]
  return INVALID_FILE_SUGGESTION_COMMANDS.has(first) && cmd.split(/\s+/).length === 1
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export function isLocalUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    return host === 'localhost'
      || host === '127.0.0.1'
      || host === '::1'
      || host === '0.0.0.0'
      || host === hostname().toLowerCase()
  }
  catch {
    return /localhost|127\.0\.0\.1|\[::1\]/.test(url)
  }
}

export function parseHostPort(url: string): { host: string, port: number } | null {
  try {
    const u = new URL(url)
    const port = u.port
      ? Number(u.port)
      : (u.protocol === 'https:' ? 443 : 80)
    return { host: u.hostname, port }
  }
  catch {
    return null
  }
}

/**
 * Probe whether ANTHROPIC_BASE_URL is reachable.
 * For local URLs we also try TCP connect via fetch.
 */
export async function checkApiEndpointHealth(
  url: string,
  timeoutMs: number = 2500,
): Promise<EndpointHealthResult> {
  const isLocal = isLocalUrl(url)
  const started = Date.now()

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      // Most proxies return 404/401 on / — any TCP response means listening
      await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'manual',
      }).catch((err) => {
        // Connection refused etc.
        throw err
      })
      return {
        ok: true,
        url,
        latencyMs: Date.now() - started,
        isLocal,
        listening: true,
      }
    }
    finally {
      clearTimeout(timer)
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Some proxies close without HTTP — treat ECONNREFUSED as hard fail
    const refused = /ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|abort|Fetch failed/i.test(message)
    return {
      ok: false,
      url,
      latencyMs: Date.now() - started,
      error: message,
      isLocal,
      listening: refused ? false : undefined,
    }
  }
}

export async function checkSettingsEndpointHealth(
  settings: ClaudeSettings,
  timeoutMs: number = 2500,
): Promise<EndpointHealthResult | null> {
  const base = settings.env?.ANTHROPIC_BASE_URL
  if (!base)
    return null
  return checkApiEndpointHealth(base, timeoutMs)
}

// ---------------------------------------------------------------------------
// Safe read / write / repair
// ---------------------------------------------------------------------------

export function readClaudeSettingsFile(path: string = SETTINGS_FILE): ClaudeSettings | null {
  if (!exists(path) && !existsSync(path))
    return null
  try {
    const content = readFileSync(path, 'utf-8')
    const data = JSON.parse(content)
    if (!data || typeof data !== 'object')
      return null
    return data as ClaudeSettings
  }
  catch {
    return null
  }
}

/**
 * Normalize settings and write atomically with backup.
 * This is the single recommended write entry for Claude settings.json.
 */
export async function writeSafeClaudeSettings(
  settings: ClaudeSettings | Record<string, unknown>,
  options: WriteSafeSettingsOptions = {},
): Promise<WriteSafeSettingsResult> {
  const path = options.path || SETTINGS_FILE
  const doBackup = options.backup !== false
  const healthMode = options.healthCheck === true
    ? 'always'
    : options.healthCheck === false || options.healthCheck === 'never'
      ? 'never'
      : options.healthCheck === 'always'
        ? 'always'
        : 'local-only'

  const { settings: cleaned, removedKeys, migrated, issues } = normalizeClaudeSettings(settings, {
    strict: options.strict !== false,
  })

  let backupPath: string | null = null
  if (doBackup && exists(path)) {
    backupPath = backupSettingsFile(path, join(dirname(path), 'backup'))
  }

  ensureDir(dirname(path) || CLAUDE_DIR)
  writeFileAtomic(path, `${JSON.stringify(cleaned, null, 2)}\n`)

  let health: EndpointHealthResult | undefined
  const base = cleaned.env?.ANTHROPIC_BASE_URL
  if (base && healthMode !== 'never') {
    if (healthMode === 'always' || (healthMode === 'local-only' && isLocalUrl(base))) {
      health = await checkApiEndpointHealth(base, options.healthTimeoutMs ?? 2500)
      if (!health.ok) {
        issues.push({
          severity: 'critical',
          key: 'env.ANTHROPIC_BASE_URL',
          message: `API endpoint unreachable after write: ${health.error || 'unknown'}`,
          fix: 'Start the local proxy or change ANTHROPIC_BASE_URL',
        })
      }
    }
  }

  return {
    path,
    backupPath,
    removedKeys,
    migrated,
    issues,
    health,
  }
}

/**
 * Synchronous write (normalize + atomic). Prefer async writeSafeClaudeSettings
 * when health checks are needed.
 */
export function writeSafeClaudeSettingsSync(
  settings: ClaudeSettings | Record<string, unknown>,
  options: Omit<WriteSafeSettingsOptions, 'healthCheck' | 'healthTimeoutMs'> = {},
): Omit<WriteSafeSettingsResult, 'health'> {
  const path = options.path || SETTINGS_FILE
  const doBackup = options.backup !== false

  const { settings: cleaned, removedKeys, migrated, issues } = normalizeClaudeSettings(settings, {
    strict: options.strict !== false,
  })

  let backupPath: string | null = null
  if (doBackup && exists(path)) {
    backupPath = backupSettingsFile(path, join(dirname(path), 'backup'))
  }

  ensureDir(dirname(path) || CLAUDE_DIR)
  writeFileAtomic(path, `${JSON.stringify(cleaned, null, 2)}\n`)

  return { path, backupPath, removedKeys, migrated, issues }
}

/**
 * Repair existing settings file in place.
 */
export async function repairClaudeSettingsFile(
  path: string = SETTINGS_FILE,
  options: WriteSafeSettingsOptions = {},
): Promise<WriteSafeSettingsResult & { changed: boolean }> {
  const current = readClaudeSettingsFile(path) || {}
  const before = JSON.stringify(current)
  const result = await writeSafeClaudeSettings(current, { ...options, path, backup: options.backup !== false })
  // re-read cleaned
  const cleaned = readClaudeSettingsFile(path)
  const changed = before !== JSON.stringify(cleaned)
  return { ...result, changed }
}

/**
 * Whether a path is Claude settings.json (user or project).
 */
export function isClaudeSettingsPath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/')
  return normalized.endsWith('/settings.json')
    || normalized.endsWith('/.claude/settings.json')
    || normalized.endsWith('/.clavue/settings.json')
    || normalized.includes('/.claude/settings.json')
    || normalized.includes('/.clavue/settings.json')
    || normalized === 'settings.json'
}

/**
 * Guard hook for writeJsonConfig — returns cleaned data for settings paths.
 */
export function guardSettingsPayload<T>(path: string, data: T): T {
  if (!isClaudeSettingsPath(path))
    return data
  if (!data || typeof data !== 'object')
    return data
  const { settings } = normalizeClaudeSettings(data)
  return settings as T
}

/**
 * Build a minimal safe settings template (ZCF-compatible + CCJK hardening).
 */
export function createSafeSettingsTemplate(): ClaudeSettings {
  return {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    env: {
      DISABLE_TELEMETRY: '1',
      DISABLE_ERROR_REPORTING: '1',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      MCP_TIMEOUT: '60000',
    },
    includeCoAuthoredBy: false,
    permissions: {
      allow: [
        'Bash',
        'Edit',
        'Glob',
        'Grep',
        'KillShell',
        'Read',
        'Skill',
        'Task',
        'TodoWrite',
        'WebFetch',
        'WebSearch',
        'Write',
      ],
      deny: [
        'Bash(rm -rf /)',
        'Bash(rm -rf /*)',
        'Bash(rm -rf ~)',
        'Bash(rm -rf ~/*)',
        'Bash(sudo *)',
        'Bash(curl * | sh)',
        'Bash(curl * | bash)',
        'Bash(wget * | sh)',
        'Bash(wget * | bash)',
      ],
    } as any,
    hooks: {},
    alwaysThinkingEnabled: false,
  }
}

/**
 * Summarize repair for CLI display.
 */
export function formatRepairSummary(result: WriteSafeSettingsResult & { changed?: boolean }): string {
  const lines: string[] = []
  lines.push(`Settings: ${result.path}`)
  if (result.backupPath)
    lines.push(`Backup: ${result.backupPath}`)
  if (result.removedKeys.length)
    lines.push(`Removed keys: ${result.removedKeys.join(', ')}`)
  if (result.migrated.length)
    lines.push(`Migrated: ${result.migrated.join('; ')}`)
  if (result.health) {
    lines.push(
      result.health.ok
        ? `API endpoint OK (${result.health.latencyMs}ms): ${result.health.url}`
        : `API endpoint FAIL: ${result.health.url} — ${result.health.error}`,
    )
  }
  const critical = result.issues.filter(i => i.severity === 'critical')
  if (critical.length)
    lines.push(`Critical issues remaining: ${critical.length}`)
  if (result.changed === false)
    lines.push('No changes needed')
  else if (result.changed)
    lines.push('Settings repaired successfully')
  return lines.join('\n')
}

/** @internal test helper */
export function _dayjsStamp(): string {
  return dayjs().format('YYYY-MM-DD_HH-mm-ss')
}
