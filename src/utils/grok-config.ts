import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { ensureI18nInitialized, i18n } from '../i18n'
import { ensureDir } from './fs-operations'
import { addNumbersToChoices } from './prompt-helpers'
import { editToml, parseToml } from './toml-edit'
import { formatApiKeyDisplay, validateApiKey } from './validator'

export const GROK_DIR = join(homedir(), '.grok')
export const GROK_CONFIG_FILE = join(GROK_DIR, 'config.toml')
export const GROK_AUTH_FILE = join(GROK_DIR, 'auth.json')

/** Grok CLI custom model entry under [model.<id>] */
export interface GrokCustomModel {
  /** Config section id: [model.<id>] */
  id: string
  /** Model id sent to the API (field `model`) */
  model: string
  baseUrl?: string
  apiKey?: string
  name?: string
  description?: string
  /** chat_completions | responses | messages */
  apiBackend?: 'chat_completions' | 'responses' | 'messages'
}

export interface GrokConfigData {
  /** [models].default */
  defaultModel?: string
  /** All [model.*] entries */
  models: GrokCustomModel[]
}

export type GrokApiBackend = NonNullable<GrokCustomModel['apiBackend']>

export interface ApplyGrokThirdPartyApiOptions {
  /** API base URL, e.g. https://api.example.com/v1 */
  baseUrl: string
  /** Bearer API key */
  apiKey: string
  /** Model id sent to the provider */
  model: string
  /** Optional display name */
  name?: string
  /** Optional config section id; defaults to sanitized model */
  id?: string
  /** Optional API backend protocol */
  apiBackend?: GrokApiBackend
  /** Whether to set as [models].default (default true) */
  setAsDefault?: boolean
}

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
  if (!existsSync(GROK_AUTH_FILE))
    return false
  try {
    const data = JSON.parse(readFileSync(GROK_AUTH_FILE, 'utf-8')) as Record<string, unknown>
    return Object.keys(data).some(k => k.includes('auth.x.ai') || k.includes('accounts.x.ai') || k.includes('x.ai'))
  }
  catch {
    return false
  }
}

export function hasGrokThirdPartyConfig(): boolean {
  const config = readGrokConfig()
  if (!config)
    return false
  return config.models.some(m => Boolean(m.baseUrl || m.apiKey))
}

export function getGrokQuickStatus(): {
  installed: boolean
  loggedIn: boolean
  configured: boolean
  defaultModel?: string
  hint: string
} {
  if (!isGrokInstalled()) {
    return {
      installed: false,
      loggedIn: false,
      configured: false,
      hint: 'curl -fsSL https://x.ai/cli/install.sh | bash',
    }
  }
  const config = readGrokConfig()
  const loggedIn = isGrokLoggedIn()
  const configured = hasGrokThirdPartyConfig() || loggedIn
  return {
    installed: true,
    loggedIn,
    configured,
    defaultModel: config?.defaultModel,
    hint: configured ? 'grok' : 'ccjk 配置 API 或 grok login',
  }
}

export function buildGrokHints(): string[] {
  const s = getGrokQuickStatus()
  const lines: string[] = []
  if (!s.installed) {
    lines.push(ansis.dim('  Install: ') + ansis.cyan('curl -fsSL https://x.ai/cli/install.sh | bash'))
    return lines
  }

  const config = readGrokConfig()
  if (config?.defaultModel) {
    lines.push(ansis.dim('  Default model: ') + ansis.cyan(config.defaultModel))
  }
  const custom = config?.models.filter(m => m.baseUrl || m.apiKey) ?? []
  if (custom.length > 0) {
    for (const m of custom.slice(0, 5)) {
      const url = m.baseUrl ? ansis.gray(` (${m.baseUrl})`) : ''
      lines.push(ansis.dim('  Model: ') + ansis.cyan(m.id) + url)
    }
  }
  else if (!s.loggedIn) {
    lines.push(ansis.yellow('  Login: ') + ansis.cyan('grok login'))
    lines.push(ansis.dim('  Or configure third-party API via ccjk menu'))
  }

  lines.push(ansis.dim('  Start: ') + ansis.cyan('grok'))
  lines.push(ansis.dim('  Models: ') + ansis.cyan('grok models'))
  return lines
}

/** Sanitize a free-form name into a valid [model.<id>] identifier */
export function sanitizeGrokModelId(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
  return cleaned || 'custom'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asApiBackend(value: unknown): GrokApiBackend | undefined {
  if (value === 'chat_completions' || value === 'responses' || value === 'messages')
    return value
  return undefined
}

/** Read and parse ~/.grok/config.toml into structured custom-model data */
export function readGrokConfig(): GrokConfigData | null {
  if (!existsSync(GROK_CONFIG_FILE))
    return null
  try {
    const content = readFileSync(GROK_CONFIG_FILE, 'utf-8')
    return parseGrokConfig(content)
  }
  catch {
    return null
  }
}

/**
 * Parse Grok CLI config.toml.
 * Real format (not Codex-style model_providers):
 *
 *   [models]
 *   default = "my-model"
 *
 *   [model.my-model]
 *   model = "model-id"
 *   base_url = "https://api.example.com/v1"
 *   api_key = "sk-..."
 *   name = "Display Name"
 *   api_backend = "chat_completions"
 */
export function parseGrokConfig(content: string): GrokConfigData {
  if (!content.trim())
    return { models: [] }

  let parsed: Record<string, unknown>
  try {
    parsed = parseToml<Record<string, unknown>>(content)
  }
  catch {
    // Fallback for partially invalid files: keep empty structured view
    return { models: [] }
  }

  const modelsSection = isRecord(parsed.models) ? parsed.models : undefined
  const defaultModel = asString(modelsSection?.default)

  const models: GrokCustomModel[] = []
  const modelTable = parsed.model
  if (isRecord(modelTable)) {
    for (const [id, raw] of Object.entries(modelTable)) {
      if (!isRecord(raw))
        continue
      models.push({
        id,
        model: asString(raw.model) || id,
        baseUrl: asString(raw.base_url),
        apiKey: asString(raw.api_key),
        name: asString(raw.name),
        description: asString(raw.description),
        apiBackend: asApiBackend(raw.api_backend),
      })
    }
  }

  return { defaultModel, models }
}

/** Ensure config file exists; return current content */
function ensureGrokConfigContent(): string {
  ensureDir(GROK_DIR)
  if (!existsSync(GROK_CONFIG_FILE)) {
    writeFileSync(GROK_CONFIG_FILE, '', 'utf-8')
    return ''
  }
  return readFileSync(GROK_CONFIG_FILE, 'utf-8')
}

/** Set [models].default without touching other sections */
export function setGrokDefaultModel(modelId: string): void {
  let content = ensureGrokConfigContent()
  content = editToml(content, 'models.default', modelId)
  writeFileSync(GROK_CONFIG_FILE, content, 'utf-8')
}

/**
 * Upsert a [model.<id>] section. Preserves unrelated config
 * (ui, memory, marketplace, mcp, etc.).
 */
export function upsertGrokCustomModel(model: GrokCustomModel): void {
  let content = ensureGrokConfigContent()
  const base = `model.${model.id}`

  content = editToml(content, `${base}.model`, model.model)
  if (model.baseUrl !== undefined)
    content = editToml(content, `${base}.base_url`, model.baseUrl)
  if (model.apiKey !== undefined)
    content = editToml(content, `${base}.api_key`, model.apiKey)
  if (model.name !== undefined)
    content = editToml(content, `${base}.name`, model.name)
  if (model.description !== undefined)
    content = editToml(content, `${base}.description`, model.description)
  if (model.apiBackend !== undefined)
    content = editToml(content, `${base}.api_backend`, model.apiBackend)

  writeFileSync(GROK_CONFIG_FILE, content, 'utf-8')
}

/**
 * Write third-party (or OpenAI-compatible) API settings into ~/.grok/config.toml
 * and optionally set it as the default model.
 */
export function applyGrokThirdPartyApi(options: ApplyGrokThirdPartyApiOptions): GrokCustomModel {
  const id = sanitizeGrokModelId(options.id || options.name || options.model)
  const entry: GrokCustomModel = {
    id,
    model: options.model.trim(),
    baseUrl: options.baseUrl.trim().replace(/\/+$/, ''),
    apiKey: options.apiKey.trim(),
    name: (options.name || options.model).trim(),
    apiBackend: options.apiBackend ?? 'chat_completions',
  }

  backupGrokConfig()
  upsertGrokCustomModel(entry)
  if (options.setAsDefault !== false)
    setGrokDefaultModel(entry.id)

  return entry
}

/**
 * Apply official xAI API key by attaching it to a built-in (or chosen) model id.
 * Does not require base_url — Grok uses its default xAI endpoint.
 */
export function applyGrokOfficialApiKey(apiKey: string, modelId = 'grok-build'): void {
  backupGrokConfig()
  let content = ensureGrokConfigContent()
  content = editToml(content, `model.${modelId}.api_key`, apiKey.trim())
  content = editToml(content, 'models.default', modelId)
  writeFileSync(GROK_CONFIG_FILE, content, 'utf-8')
}

/** Backup Grok config.toml before modification */
export function backupGrokConfig(): string | null {
  if (!existsSync(GROK_CONFIG_FILE))
    return null
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(GROK_DIR, `config.toml.bak-${ts}`)
    const content = readFileSync(GROK_CONFIG_FILE, 'utf-8')
    writeFileSync(backupPath, content, 'utf-8')
    return backupPath
  }
  catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Interactive configuration (operator / init)
// ---------------------------------------------------------------------------

async function promptGrokThirdPartyApi(): Promise<GrokCustomModel | null> {
  const existing = readGrokConfig()
  const existingCustom = existing?.models.find(m => m.baseUrl) || existing?.models[0]

  const answers = await inquirer.prompt<{
    baseUrl: string
    apiKey: string
    model: string
    name: string
    apiBackend: GrokApiBackend
  }>([
    {
      type: 'input',
      name: 'baseUrl',
      message: i18n.t('api:enterApiUrl'),
      default: existingCustom?.baseUrl || 'https://api.example.com/v1',
      validate: (value: string) => {
        if (!value.trim())
          return i18n.t('api:urlRequired')
        try {
          void new URL(value.trim())
          return true
        }
        catch {
          return i18n.t('api:invalidUrl')
        }
      },
    },
    {
      type: 'input',
      name: 'apiKey',
      message: i18n.t('api:enterApiKey'),
      default: existingCustom?.apiKey ? formatApiKeyDisplay(existingCustom.apiKey) : undefined,
      validate: (value: string) => {
        if (!value.trim())
          return i18n.t('api:keyRequired')
        // Allow keeping the masked display of an existing key
        if (existingCustom?.apiKey && value === formatApiKeyDisplay(existingCustom.apiKey))
          return true
        const validation = validateApiKey(value)
        if (!validation.isValid)
          return validation.error || i18n.t('api:invalidKeyFormat')
        return true
      },
    },
    {
      type: 'input',
      name: 'model',
      message: i18n.t('configuration:enterCustomModel'),
      default: existingCustom?.model || 'grok-4',
      validate: (value: string) => value.trim().length > 0 || i18n.t('api:keyRequired'),
    },
    {
      type: 'input',
      name: 'name',
      message: 'Display name / config id',
      default: existingCustom?.name || existingCustom?.id || 'custom',
    },
    {
      type: 'list',
      name: 'apiBackend',
      message: 'API Backend',
      choices: addNumbersToChoices([
        { name: 'OpenAI Chat Completions (default)', value: 'chat_completions' },
        { name: 'OpenAI Responses', value: 'responses' },
        { name: 'Anthropic Messages', value: 'messages' },
      ]),
      default: existingCustom?.apiBackend || 'chat_completions',
    },
  ])

  if (!answers.baseUrl || !answers.apiKey || !answers.model) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return null
  }

  const apiKey = existingCustom?.apiKey
    && answers.apiKey === formatApiKeyDisplay(existingCustom.apiKey)
    ? existingCustom.apiKey
    : answers.apiKey

  const entry = applyGrokThirdPartyApi({
    baseUrl: answers.baseUrl,
    apiKey,
    model: answers.model,
    name: answers.name || answers.model,
    apiBackend: answers.apiBackend,
    setAsDefault: true,
  })

  return entry
}

async function promptGrokOfficialApiKey(): Promise<boolean> {
  const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
    type: 'input',
    name: 'apiKey',
    message: i18n.t('api:enterApiKey') + ' (xAI / XAI_API_KEY)',
    validate: (value: string) => {
      if (!value.trim())
        return i18n.t('api:keyRequired')
      return true
    },
  })

  if (!apiKey?.trim()) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return false
  }

  const { modelId } = await inquirer.prompt<{ modelId: string }>({
    type: 'list',
    name: 'modelId',
    message: i18n.t('menu:menuDescriptions.grokConfigureModel'),
    choices: addNumbersToChoices([
      { name: 'grok-build', value: 'grok-build' },
      { name: 'grok-4', value: 'grok-4' },
      { name: 'grok-code-fast-1', value: 'grok-code-fast-1' },
      { name: i18n.t('configuration:customModelOption'), value: 'custom' },
    ]),
  })

  let selected = modelId
  if (modelId === 'custom') {
    const answer = await inquirer.prompt<{ customModel: string }>({
      type: 'input',
      name: 'customModel',
      message: i18n.t('configuration:enterCustomModel'),
      validate: value => value.trim().length > 0 || i18n.t('api:keyRequired'),
    })
    selected = answer.customModel.trim()
  }

  applyGrokOfficialApiKey(apiKey, selected)
  return true
}

/**
 * Interactive Grok API configuration.
 * Writes to ~/.grok/config.toml in the real Grok CLI format so `grok` works
 * with third-party OpenAI-compatible endpoints without env hacks.
 */
export async function configureGrokApi(): Promise<void> {
  ensureI18nInitialized()

  console.log(ansis.cyan(`\n${i18n.t('menu:menuOptions.grokConfigureApi')}`))
  console.log(ansis.gray(`  ${i18n.t('menu:menuDescriptions.grokConfigureApi')}`))
  console.log(ansis.dim(`  Config: ${GROK_CONFIG_FILE}\n`))

  const existing = readGrokConfig()
  if (existing?.models.length) {
    console.log(ansis.dim('  Existing models:'))
    for (const m of existing.models) {
      const mark = existing.defaultModel === m.id ? ansis.green('*') : ' '
      const url = m.baseUrl ? ansis.gray(` ${m.baseUrl}`) : ''
      console.log(`  ${mark} ${m.id} → ${m.model}${url}`)
    }
    console.log('')
  }

  const { mode } = await inquirer.prompt<{ mode: 'third_party' | 'xai_key' | 'login' | 'skip' }>({
    type: 'list',
    name: 'mode',
    message: i18n.t('api:apiModePrompt'),
    choices: addNumbersToChoices([
      {
        name: `${i18n.t('api:customApiConfig')} — base URL + API Key + model`,
        value: 'third_party',
      },
      {
        name: `xAI API Key — ${ansis.gray('official endpoint, no base URL')}`,
        value: 'xai_key',
      },
      {
        name: `${i18n.t('api:useOfficialLogin')} — ${ansis.gray('grok login')}`,
        value: 'login',
      },
      { name: i18n.t('api:skipApi'), value: 'skip' },
    ]),
    default: 'third_party',
  })

  if (!mode || mode === 'skip') {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  if (mode === 'login') {
    console.log(ansis.cyan('\n  Run: ') + ansis.bold('grok login'))
    console.log(ansis.dim('  Then start with: grok\n'))
    return
  }

  if (mode === 'xai_key') {
    const ok = await promptGrokOfficialApiKey()
    if (ok) {
      console.log(ansis.green(`✔ ${i18n.t('api:apiConfigSuccess')}`))
      console.log(ansis.gray(`  File: ${GROK_CONFIG_FILE}`))
      console.log(ansis.dim('  Start: grok\n'))
    }
    return
  }

  const entry = await promptGrokThirdPartyApi()
  if (!entry)
    return

  console.log(ansis.green(`✔ ${i18n.t('api:apiConfigSuccess')}`))
  console.log(ansis.gray(`  File: ${GROK_CONFIG_FILE}`))
  console.log(ansis.gray(`  Section: [model.${entry.id}]`))
  console.log(ansis.gray(`  URL: ${entry.baseUrl}`))
  console.log(ansis.gray(`  Model: ${entry.model}`))
  console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(entry.apiKey || '')}`))
  console.log(ansis.gray(`  Default: ${entry.id}`))
  console.log(ansis.dim('\n  Start: grok'))
  console.log(ansis.dim('  List:  grok models'))
  console.log(ansis.dim(`  Switch: /model ${entry.id}\n`))
}

/**
 * Interactive default model picker for Grok CLI.
 * Sets [models].default in ~/.grok/config.toml.
 */
export async function configureGrokDefaultModel(): Promise<void> {
  ensureI18nInitialized()

  const config = readGrokConfig()
  const customChoices = (config?.models || []).map(m => ({
    name: m.name ? `${m.id} (${m.name})` : m.id,
    value: m.id,
  }))

  const { model } = await inquirer.prompt<{ model: string }>({
    type: 'list',
    name: 'model',
    message: i18n.t('menu:menuDescriptions.grokConfigureModel'),
    choices: addNumbersToChoices([
      ...customChoices,
      { name: 'grok-build', value: 'grok-build' },
      { name: 'grok-4', value: 'grok-4' },
      { name: 'grok-code-fast-1', value: 'grok-code-fast-1' },
      { name: i18n.t('configuration:customModelOption'), value: 'custom' },
    ]),
    default: config?.defaultModel,
  })

  let selectedModel = model
  if (model === 'custom') {
    const answer = await inquirer.prompt<{ customModel: string }>({
      type: 'input',
      name: 'customModel',
      message: i18n.t('configuration:enterCustomModel'),
      validate: value => value.trim().length > 0 || i18n.t('api:keyRequired'),
    })
    selectedModel = answer.customModel.trim()
  }

  backupGrokConfig()
  setGrokDefaultModel(selectedModel)
  console.log(ansis.green(`✔ Grok default model: ${selectedModel}`))
  console.log(ansis.dim(`  [models] default = "${selectedModel}" → ${GROK_CONFIG_FILE}\n`))
}

// ---------------------------------------------------------------------------
// Legacy helpers kept for tests / gradual migration
// ---------------------------------------------------------------------------

/**
 * @deprecated Use parseGrokConfig / readGrokConfig. Kept for unit tests that
 * still exercise round-trip of a simplified view.
 */
export function renderGrokConfig(data: GrokConfigData): string {
  const lines: string[] = []
  if (data.defaultModel) {
    lines.push('[models]')
    lines.push(`default = "${data.defaultModel}"`)
  }
  for (const m of data.models) {
    if (lines.length > 0)
      lines.push('')
    lines.push(`[model.${m.id}]`)
    lines.push(`model = "${m.model}"`)
    if (m.baseUrl)
      lines.push(`base_url = "${m.baseUrl}"`)
    if (m.apiKey)
      lines.push(`api_key = "${m.apiKey}"`)
    if (m.name)
      lines.push(`name = "${m.name}"`)
    if (m.description)
      lines.push(`description = "${m.description}"`)
    if (m.apiBackend)
      lines.push(`api_backend = "${m.apiBackend}"`)
  }
  return `${lines.join('\n')}\n`
}

/** @deprecated Prefer upsertGrokCustomModel / setGrokDefaultModel */
export function writeGrokConfig(data: GrokConfigData): void {
  ensureDir(GROK_DIR)
  writeFileSync(GROK_CONFIG_FILE, renderGrokConfig(data), 'utf-8')
}
