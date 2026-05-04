import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import type { ClaudeCodeProfile } from './claude-code-config'

export type RuntimeCompatMode = 'native' | 'compatible' | 'degraded'
export type ProviderStrategy = 'profile-based' | 'env-based' | 'tool-specific'
export type OperatingArchetypeId = 'pc-dev' | 'app-dev' | 'text-studio' | 'service-ops' | 'research' | 'automation' | 'custom'
export type SafetyLevel = 'safe' | 'dev' | 'max'
export type VerificationMode = 'required' | 'recommended' | 'manual'
export type DestructiveActionPolicy = 'confirm' | 'block' | 'allow'
export type WorkflowFallbackMode = 'graceful' | 'strict' | 'off'
export type MemoryMode = 'project-aware' | 'session-only' | 'off'
export type CompressionMode = 'runtime-native' | 'ccjk-managed' | 'off'
export type InstructionLayering = 'runtime-first' | 'ccjk-first' | 'merged'
export type OperatorMode = 'execution-first' | 'planning-first' | 'conversational'

export interface RuntimeProfile {
  target: CodeToolType
  distribution?: 'clavue' | 'claude-code' | 'codex' | 'generic'
  compatMode: RuntimeCompatMode
  providerStrategy: ProviderStrategy
}

export interface ArchetypeProfile {
  id: OperatingArchetypeId
  name: string
  goal: string
}

export interface CapabilityProfile {
  coding: boolean
  planning: boolean
  taskTracking: boolean
  memory: boolean
  browserAutomation: boolean
  research: boolean
  documentAuthoring: boolean
  serviceOps: boolean
  multiAgent: boolean
}

export interface PolicyProfile {
  permissionPreset: SafetyLevel
  verificationMode: VerificationMode
  destructiveActionPolicy: DestructiveActionPolicy
  workflowFallbackMode: WorkflowFallbackMode
}

export interface ContextProfile {
  memoryMode: MemoryMode
  compressionMode: CompressionMode
  instructionLayering: InstructionLayering
}

export interface ProfileSelection {
  providerProfile?: string
  workflowPack?: string
  toolPack?: string
}

export interface UiProfile {
  language: SupportedLang
  outputStyle: string
  operatorMode: OperatorMode
}

/**
 * Claude Code specific configuration
 * Features: Multiple output styles selection
 */
export interface ClaudeCodeConfig {
  enabled: boolean
  outputStyles: string[]
  defaultOutputStyle?: string
  installType: 'global' | 'local'
  installMethod?: 'npm' | 'homebrew' | 'curl' | 'powershell' | 'cmd' | 'native'
  currentProfile?: string
  profiles?: Record<string, ClaudeCodeProfile>
  version?: string
}

/**
 * Codex specific configuration
 * Features: Single system prompt style selection
 * Note: Codex only supports global installation
 */
export interface CodexConfig {
  enabled: boolean
  systemPromptStyle: string
  installMethod?: 'npm' | 'homebrew' | 'native'
  envKeyMigrated?: boolean // Whether env_key to temp_env_key migration has been completed
  goalsFeatureEnabled?: boolean // Whether Codex native /goal support is enabled in ~/.codex/config.toml
}

/**
 * General CCJK configuration
 */
export interface GeneralConfig {
  preferredLang: SupportedLang
  templateLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  currentTool: CodeToolType
}

export interface MemoryStorageConfig {
  claudeDir?: string
  ccjkDir?: string
}

export interface StorageConfig {
  memory?: MemoryStorageConfig
}

export interface AdaptationConfig {
  runtimeProfile?: RuntimeProfile
  archetypeProfile?: ArchetypeProfile
  capabilityProfile?: CapabilityProfile
  policyProfile?: PolicyProfile
  contextProfile?: ContextProfile
  profileSelection?: ProfileSelection
  uiProfile?: UiProfile
}

/**
 * Complete CCJK TOML configuration structure
 */
export interface ZcfTomlConfig {
  version: string
  lastUpdated: string
  general: GeneralConfig
  claudeCode: ClaudeCodeConfig
  codex: CodexConfig
  storage?: StorageConfig
  adaptation?: AdaptationConfig
}

/**
 * Partial configuration for updates
 */
export type PartialZcfTomlConfig = Omit<
  Partial<ZcfTomlConfig>,
  'general' | 'claudeCode' | 'codex' | 'storage' | 'adaptation'
> & {
  general?: Partial<GeneralConfig>
  claudeCode?: Partial<ClaudeCodeConfig>
  codex?: Partial<CodexConfig>
  storage?: Partial<StorageConfig> & {
    memory?: Partial<MemoryStorageConfig>
  }
  adaptation?: Partial<AdaptationConfig>
}

/**
 * Migration result from JSON to TOML
 */
export interface TomlConfigMigrationResult {
  migrated: boolean
  source?: string
  target: string
  removed: string[]
  backupPath?: string
}
