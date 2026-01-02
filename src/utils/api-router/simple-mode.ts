/**
 * CCJK API Router - Simple Mode
 * Most common mode: Just API key + base URL configuration
 * No CCR required - directly modifies Claude Code settings.json
 */
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import type { ApiConfigResult, ClaudeEnvSettings, ProviderPreset, SimpleApiConfig } from './types'

// Claude Code settings file path
const CLAUDE_DIR = join(homedir(), '.claude')
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json')

/**
 * Read current Claude settings
 */
function readSettings(): Record<string, any> {
  if (!existsSync(SETTINGS_FILE)) {
    return {}
  }
  try {
    const { readFileSync } = require('node:fs')
    return JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

/**
 * Write Claude settings
 */
function writeSettings(settings: Record<string, any>): void {
  const { writeFileSync, mkdirSync } = require('node:fs')
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true })
  }
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

/**
 * Configure Simple API Mode
 * This is the most common configuration - just set API key and base URL
 */
export function configureSimpleMode(config: SimpleApiConfig): ApiConfigResult {
  try {
    const settings = readSettings()

    // Initialize env if not exists
    if (!settings.env) {
      settings.env = {}
    }

    // Remove any existing auth token (conflicts with API key mode)
    delete settings.env.ANTHROPIC_AUTH_TOKEN

    // Set API configuration
    settings.env.ANTHROPIC_API_KEY = config.apiKey
    settings.env.ANTHROPIC_BASE_URL = config.baseUrl

    // Write settings
    writeSettings(settings)

    return {
      success: true,
      mode: 'simple',
      provider: config.provider,
      message: `API configured successfully for ${config.provider}`,
    }
  } catch (error) {
    return {
      success: false,
      mode: 'simple',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Configure Official Anthropic API
 * Direct connection to Anthropic
 */
export function configureOfficialMode(apiKey: string): ApiConfigResult {
  try {
    const settings = readSettings()

    // Initialize env if not exists
    if (!settings.env) {
      settings.env = {}
    }

    // Remove any existing base URL and auth token
    delete settings.env.ANTHROPIC_BASE_URL
    delete settings.env.ANTHROPIC_AUTH_TOKEN

    // Set official API key
    settings.env.ANTHROPIC_API_KEY = apiKey

    // Write settings
    writeSettings(settings)

    return {
      success: true,
      mode: 'official',
      provider: 'anthropic',
      message: 'Official Anthropic API configured successfully',
    }
  } catch (error) {
    return {
      success: false,
      mode: 'official',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Configure API using preset
 */
export function configureWithPreset(preset: ProviderPreset, apiKey: string): ApiConfigResult {
  // For official Anthropic, use direct API
  if (preset.id === 'anthropic') {
    return configureOfficialMode(apiKey)
  }

  // For other providers, use simple mode
  return configureSimpleMode({
    mode: 'simple',
    provider: preset.id,
    apiKey,
    baseUrl: preset.baseUrl,
    model: preset.defaultModel,
  })
}

/**
 * Get current API configuration
 */
export function getCurrentConfig(): ClaudeEnvSettings | null {
  try {
    const settings = readSettings()
    if (!settings.env) {
      return null
    }
    return {
      ANTHROPIC_BASE_URL: settings.env.ANTHROPIC_BASE_URL,
      ANTHROPIC_API_KEY: settings.env.ANTHROPIC_API_KEY,
      ANTHROPIC_AUTH_TOKEN: settings.env.ANTHROPIC_AUTH_TOKEN,
    }
  } catch {
    return null
  }
}

/**
 * Detect current API mode
 */
export function detectCurrentMode(): { mode: 'official' | 'simple' | 'ccr' | 'none', provider?: string } {
  const config = getCurrentConfig()

  if (!config) {
    return { mode: 'none' }
  }

  // Check if using CCR proxy (localhost with CCR port)
  if (config.ANTHROPIC_BASE_URL?.includes('127.0.0.1:3456') ||
      config.ANTHROPIC_BASE_URL?.includes('localhost:3456')) {
    return { mode: 'ccr', provider: 'ccr' }
  }

  // Check if using official Anthropic (no base URL or api.anthropic.com)
  if (!config.ANTHROPIC_BASE_URL ||
      config.ANTHROPIC_BASE_URL.includes('api.anthropic.com')) {
    if (config.ANTHROPIC_AUTH_TOKEN) {
      return { mode: 'official', provider: 'anthropic-oauth' }
    }
    if (config.ANTHROPIC_API_KEY) {
      return { mode: 'official', provider: 'anthropic' }
    }
    return { mode: 'none' }
  }

  // Using custom base URL - simple mode
  // Try to detect provider from URL
  const baseUrl = config.ANTHROPIC_BASE_URL.toLowerCase()
  let provider = 'custom'

  if (baseUrl.includes('302.ai')) provider = '302ai'
  else if (baseUrl.includes('openrouter.ai')) provider = 'openrouter'
  else if (baseUrl.includes('deepseek.com')) provider = 'deepseek'
  else if (baseUrl.includes('dashscope.aliyuncs.com')) provider = 'qwen'
  else if (baseUrl.includes('siliconflow.cn')) provider = 'siliconflow'
  else if (baseUrl.includes('modelscope.cn')) provider = 'modelscope'
  else if (baseUrl.includes('volces.com')) provider = 'volcengine'
  else if (baseUrl.includes('moonshot.cn')) provider = 'kimi'
  else if (baseUrl.includes('bigmodel.cn')) provider = 'glm'
  else if (baseUrl.includes('generativelanguage.googleapis.com')) provider = 'gemini'
  else if (baseUrl.includes('groq.com')) provider = 'groq'
  else if (baseUrl.includes('localhost:11434')) provider = 'ollama'

  return { mode: 'simple', provider }
}

/**
 * Clear API configuration
 */
export function clearApiConfig(): ApiConfigResult {
  try {
    const settings = readSettings()

    if (settings.env) {
      delete settings.env.ANTHROPIC_BASE_URL
      delete settings.env.ANTHROPIC_API_KEY
      delete settings.env.ANTHROPIC_AUTH_TOKEN
    }

    writeSettings(settings)

    return {
      success: true,
      mode: 'simple',
      message: 'API configuration cleared',
    }
  } catch (error) {
    return {
      success: false,
      mode: 'simple',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string, provider: string): { valid: boolean, message?: string } {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, message: 'API key is required' }
  }

  // Provider-specific validation
  if (provider === 'anthropic') {
    if (!apiKey.startsWith('sk-ant-')) {
      return { valid: false, message: 'Anthropic API key should start with sk-ant-' }
    }
  }

  if (provider === 'openrouter') {
    if (!apiKey.startsWith('sk-or-')) {
      return { valid: false, message: 'OpenRouter API key should start with sk-or-' }
    }
  }

  return { valid: true }
}

/**
 * Quick setup for common providers
 * One-step configuration with minimal input
 */
export function quickSetup(
  providerId: string,
  apiKey: string,
): ApiConfigResult {
  const { getPresetById } = require('./presets')
  const preset = getPresetById(providerId)

  if (!preset) {
    return {
      success: false,
      mode: 'simple',
      error: `Unknown provider: ${providerId}`,
    }
  }

  // Validate API key if required
  if (preset.requiresApiKey) {
    const validation = validateApiKey(apiKey, providerId)
    if (!validation.valid) {
      return {
        success: false,
        mode: 'simple',
        error: validation.message,
      }
    }
  }

  return configureWithPreset(preset, apiKey)
}
