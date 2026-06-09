import type { ClaudeCodeProfile } from '../types/claude-code-config'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { ClaudeCodeConfigManager } from './claude-code-config-manager'

/** Profile fields needed to launch Grok / Reasonix with injected env. */
export interface CcjkLaunchProfile {
  name: string
  baseUrl?: string
  apiKey?: string
  model?: string
  provider?: string
}

const LEGACY_PROFILES_DIR = join(homedir(), '.ccjk', 'profiles')

function fromClaudeProfile(profile: ClaudeCodeProfile): CcjkLaunchProfile {
  return {
    name: profile.name,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model: profile.primaryModel,
  }
}

function readLegacyJsonProfile(name: string): CcjkLaunchProfile | null {
  const profilePath = join(LEGACY_PROFILES_DIR, `${name}.json`)
  if (!existsSync(profilePath)) {
    return null
  }

  try {
    const data = JSON.parse(readFileSync(profilePath, 'utf-8')) as CcjkLaunchProfile
    return data.name ? data : { ...data, name }
  }
  catch {
    return null
  }
}

/**
 * Resolve a ccjk profile by display name or TOML profile id.
 * Primary source: ~/.ccjk/config.toml (claudeCode.profiles).
 * Fallback: legacy ~/.ccjk/profiles/<name>.json for migrated installs.
 */
export function readCcjkProfileByName(name: string): CcjkLaunchProfile | null {
  const byName = ClaudeCodeConfigManager.getProfileByName(name)
  if (byName) {
    return fromClaudeProfile(byName)
  }

  const byId = ClaudeCodeConfigManager.getProfileById(name)
  if (byId) {
    return fromClaudeProfile(byId)
  }

  return readLegacyJsonProfile(name)
}

/** List profile display names from TOML storage. */
export function listCcjkProfileNames(): string[] {
  return ClaudeCodeConfigManager.listProfiles().map(profile => profile.name)
}