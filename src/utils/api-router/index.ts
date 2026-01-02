/**
 * CCJK API Router
 * Unified API routing for Claude Code with multiple modes:
 *
 * 1. Simple Mode (most common) - Just API key + base URL
 * 2. Official Mode - Direct Anthropic API
 * 3. CCR Mode - Full claude-code-router with transformers
 *
 * @example Quick Setup
 * ```typescript
 * import { quickSetup } from './api-router'
 *
 * // One-step configuration
 * quickSetup('deepseek', 'sk-xxx')
 * quickSetup('302ai', 'sk-xxx')
 * quickSetup('anthropic', 'sk-ant-xxx')
 * ```
 *
 * @example Interactive Wizard
 * ```typescript
 * import { runConfigWizard } from './api-router'
 *
 * // Run interactive configuration wizard
 * await runConfigWizard('zh-CN')
 * ```
 *
 * @example Direct Configuration
 * ```typescript
 * import { configureSimpleMode, configureOfficialMode } from './api-router'
 *
 * // Simple mode with custom provider
 * configureSimpleMode({
 *   mode: 'simple',
 *   provider: 'custom',
 *   apiKey: 'sk-xxx',
 *   baseUrl: 'https://api.example.com/v1',
 * })
 *
 * // Official Anthropic
 * configureOfficialMode('sk-ant-xxx')
 * ```
 */

// Types
export type {
  ApiConfig,
  ApiConfigResult,
  ApiRoutingMode,
  CcrApiConfig,
  CcrProvider,
  CcrRouterConfig,
  CcrTransformer,
  ClaudeEnvSettings,
  OfficialApiConfig,
  ProviderFeature,
  ProviderPreset,
  SimpleApiConfig,
} from './types'

// Presets
export {
  getAllPresets,
  getChinesePresets,
  getFreePresets,
  getPresetById,
  getPresetsByCategory,
  getRecommendedPresets,
  PROVIDER_PRESETS,
} from './presets'

// Simple Mode
export {
  clearApiConfig,
  configureOfficialMode,
  configureSimpleMode,
  configureWithPreset,
  detectCurrentMode,
  getCurrentConfig,
  quickSetup,
  validateApiKey,
} from './simple-mode'

// Manager
export {
  displayCurrentStatus,
  runConfigWizard,
  testApiConnection,
} from './manager'
