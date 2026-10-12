/**
 * Clavue Provider Profile Manager
 *
 * 管理 Clavue 9.x provider profile（~/.clavue/.clavue.json + .credentials.json），
 * 支持组合模型路由（每个槽位独立选模型，由用户自主决定）。
 *
 * ccjk 作为客观工具：不预设 modelMode / apiDialectMode 默认值，
 * 不向用户推荐任何特定 provider 家族。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { ensureDir } from './fs-operations'

const CLAVUE_DIR = join(homedir(), '.clavue')
const CLAVUE_JSON = join(CLAVUE_DIR, '.clavue.json')
const CREDENTIALS_JSON = join(CLAVUE_DIR, '.credentials.json')

// ── Types ──────────────────────────────────────────────

export type ClavueModelMode = 'anthropic_native' | 'openai_native' | 'hybrid_compatible'

export type ClavueApiDialectMode = 'anthropic_messages' | 'openai_responses'

export interface ClavueModelRouting {
  presetId?: string
  primaryModel: string
  subagentModel?: string
  smallFastModel?: string
  planModel?: string
  exploreModel?: string
  generalModel?: string
  teamModel?: string
  guideModel?: string
  reviewModel?: string
}

export interface ClavueProviderProfile {
  id: string
  name: string
  providerId: string
  baseUrl: string
  authType: 'api_key' | 'auth_token'
  modelRouting: ClavueModelRouting
  /** 仅当用户显式指定时写入，不设默认值 */
  modelMode?: ClavueModelMode
  /** 仅当用户显式指定时写入，不自动推导 */
  apiDialectMode?: ClavueApiDialectMode
  provenance: { kind: string }
  createdAt: number
  updatedAt: number
}

export interface ClavueCredentials {
  providerProfiles: Record<string, {
    credential: string
    authType: 'api_key' | 'auth_token'
  }>
}

export interface ClavueJson {
  clavueProviderProfiles?: ClavueProviderProfile[]
  activeProviderProfileId?: string
  [key: string]: unknown
}

// ── Model routing builder ──────────────────────────────

/**
 * 从 ccjk CLI 的 4 个模型参数构建 Clavue 的 9 槽 modelRouting。
 *
 * 映射规则（ccjk 为独立工具，不做 provider 家族假设）：
 *   primary → primaryModel
 *   haiku   → smallFastModel
 *   sonnet  → subagentModel + generalModel
 *   opus    → planModel + guideModel
 *   未指定的槽位留空或继承 primary。
 */
export function createModelRouting(models: {
  primaryModel?: string
  haikuModel?: string
  sonnetModel?: string
  opusModel?: string
}): ClavueModelRouting {
  const primary = models.primaryModel || ''
  const haiku = models.haikuModel || primary
  const sonnet = models.sonnetModel || primary
  const opus = models.opusModel || primary

  return {
    primaryModel: primary,
    subagentModel: sonnet,
    smallFastModel: haiku,
    planModel: opus,
    exploreModel: sonnet,
    generalModel: sonnet,
    teamModel: sonnet,
    guideModel: opus,
    reviewModel: '',
  }
}

// ── File I/O ───────────────────────────────────────────

function readJsonFile<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch {
    return fallback
  }
}

function writeJsonFile(path: string, data: unknown): void {
  ensureDir(CLAVUE_DIR)
  writeFileSync(path, JSON.stringify(data, null, 2))
}

// ── Public API ─────────────────────────────────────────

export function readClavueJson(): ClavueJson {
  return readJsonFile<ClavueJson>(CLAVUE_JSON, {})
}

export function writeClavueJson(data: ClavueJson): void {
  writeJsonFile(CLAVUE_JSON, data)
}

export function readCredentials(): ClavueCredentials {
  return readJsonFile<ClavueCredentials>(CREDENTIALS_JSON, { providerProfiles: {} })
}

export function writeCredentials(data: ClavueCredentials): void {
  writeJsonFile(CREDENTIALS_JSON, data)
}

export function listProviderProfiles(): ClavueProviderProfile[] {
  return readClavueJson().clavueProviderProfiles || []
}

export function getActiveProviderProfileId(): string | undefined {
  return readClavueJson().activeProviderProfileId
}

export function getProviderProfile(id: string): ClavueProviderProfile | undefined {
  return listProviderProfiles().find(p => p.id === id)
}

/**
 * 写入或更新一个 provider profile 及其凭证。
 * modelMode / apiDialectMode 仅在显式传入时写入，不设默认值。
 */
export function saveProviderProfile(profile: {
  id: string
  name?: string
  providerId?: string
  baseUrl: string
  authType: 'api_key' | 'auth_token'
  apiKey: string
  modelRouting?: ClavueModelRouting
  /** 仅当用户明确指定时传入 */
  modelMode?: ClavueModelMode
  /** 仅当用户明确指定时传入 */
  apiDialectMode?: ClavueApiDialectMode
  setAsActive?: boolean
}): ClavueProviderProfile {
  const clavueJson = readClavueJson()
  const profiles = clavueJson.clavueProviderProfiles || []
  const now = Date.now()

  const existingIdx = profiles.findIndex(p => p.id === profile.id)
  const existing = existingIdx >= 0 ? profiles[existingIdx] : undefined

  const fullProfile: ClavueProviderProfile = {
    id: profile.id,
    name: profile.name || profile.id,
    providerId: profile.providerId || 'custom',
    baseUrl: profile.baseUrl,
    authType: profile.authType,
    modelRouting: profile.modelRouting || createModelRouting({}),
    provenance: existing?.provenance || { kind: 'manual' },
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  // 仅在显式传入时写入 modelMode / apiDialectMode
  if (profile.modelMode !== undefined) {
    fullProfile.modelMode = profile.modelMode
  } else if (existing?.modelMode) {
    fullProfile.modelMode = existing.modelMode
  }
  if (profile.apiDialectMode !== undefined) {
    fullProfile.apiDialectMode = profile.apiDialectMode
  } else if (existing?.apiDialectMode) {
    fullProfile.apiDialectMode = existing.apiDialectMode
  }

  if (existingIdx >= 0) {
    profiles[existingIdx] = fullProfile
  } else {
    profiles.push(fullProfile)
  }

  clavueJson.clavueProviderProfiles = profiles

  if (profile.setAsActive !== false) {
    clavueJson.activeProviderProfileId = profile.id
  }

  writeClavueJson(clavueJson)

  // 仅在 apiKey 非空时写入凭证（仅更新 modelRouting 时跳过）
  if (profile.apiKey) {
    const credentials = readCredentials()
    credentials.providerProfiles[profile.id] = {
      credential: profile.apiKey,
      authType: profile.authType,
    }
    writeCredentials(credentials)
  }

  return fullProfile
}

export function deleteProviderProfile(id: string): boolean {
  const clavueJson = readClavueJson()
  const profiles = clavueJson.clavueProviderProfiles || []
  const idx = profiles.findIndex(p => p.id === id)
  if (idx < 0) return false

  profiles.splice(idx, 1)
  clavueJson.clavueProviderProfiles = profiles

  if (clavueJson.activeProviderProfileId === id) {
    clavueJson.activeProviderProfileId = profiles.length > 0 ? profiles[0].id : undefined
  }

  writeClavueJson(clavueJson)

  const credentials = readCredentials()
  delete credentials.providerProfiles[id]
  writeCredentials(credentials)

  return true
}

export function setActiveProviderProfile(id: string): boolean {
  const profiles = listProviderProfiles()
  if (!profiles.find(p => p.id === id)) return false

  const clavueJson = readClavueJson()
  clavueJson.activeProviderProfileId = id
  writeClavueJson(clavueJson)
  return true
}

export function generateProfileId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}
