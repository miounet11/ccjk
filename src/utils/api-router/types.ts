/**
 * CCJK API Router Types
 * Unified type definitions for API routing modes
 */

/**
 * API Routing Mode
 */
export type ApiRoutingMode = 'official' | 'simple' | 'ccr'

/**
 * Simple API Configuration (NewAPI style)
 * Most common mode - just API key + base URL
 */
export interface SimpleApiConfig {
  mode: 'simple'
  provider: string
  apiKey: string
  baseUrl: string
  model?: string
  timeout?: number
}

/**
 * Official Anthropic API Configuration
 */
export interface OfficialApiConfig {
  mode: 'official'
  authToken?: string // OAuth token from Anthropic
  apiKey?: string // Direct API key
}

/**
 * CCR Advanced Configuration
 * Full claude-code-router with transformers
 */
export interface CcrApiConfig {
  mode: 'ccr'
  host: string
  port: number
  apiKey: string // CCR internal API key
  providers: CcrProvider[]
  router: CcrRouterConfig
}

/**
 * CCR Provider
 */
export interface CcrProvider {
  name: string
  apiBaseUrl: string
  apiKey: string
  models: string[]
  transformer?: CcrTransformer
}

/**
 * CCR Router Configuration
 */
export interface CcrRouterConfig {
  default: string // format: "provider,model"
  background?: string
  think?: string
  longContext?: string
  longContextThreshold?: number
  webSearch?: string
}

/**
 * CCR Transformer
 */
export interface CcrTransformer {
  use?: (string | [string, Record<string, any>])[]
  [model: string]: any
}

/**
 * Unified API Configuration
 */
export type ApiConfig = SimpleApiConfig | OfficialApiConfig | CcrApiConfig

/**
 * Provider Preset (built-in configurations)
 */
export interface ProviderPreset {
  id: string
  name: string
  nameZh: string
  description: string
  descriptionZh: string
  category: 'official' | 'openai-compatible' | 'chinese' | 'free' | 'local'
  website: string
  requiresApiKey: boolean
  baseUrl: string
  models: string[]
  defaultModel: string
  features: ProviderFeature[]
  transformer?: CcrTransformer
  instructions?: {
    en: string
    zh: string
  }
}

/**
 * Provider Features
 */
export type ProviderFeature =
  | 'chat'
  | 'vision'
  | 'tools'
  | 'streaming'
  | 'thinking'
  | 'web-search'
  | 'code'

/**
 * API Configuration Result
 */
export interface ApiConfigResult {
  success: boolean
  mode: ApiRoutingMode
  provider?: string
  message?: string
  error?: string
}

/**
 * Settings.json env configuration
 */
export interface ClaudeEnvSettings {
  ANTHROPIC_BASE_URL?: string
  ANTHROPIC_API_KEY?: string
  ANTHROPIC_AUTH_TOKEN?: string
}
