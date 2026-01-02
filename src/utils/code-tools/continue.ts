import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { CONTINUE_CONFIG_FILE, CONTINUE_DIR } from '../../constants'

/**
 * Continue model configuration
 */
export interface ContinueModel {
  title: string
  provider: string
  model: string
  apiBase?: string
  apiKey?: string
}

/**
 * Continue MCP server configuration
 */
export interface ContinueMcpServer {
  command: string
  args?: string[]
  env?: Record<string, string>
}

/**
 * Continue configuration
 */
export interface ContinueConfig {
  models?: ContinueModel[]
  tabAutocompleteModel?: ContinueModel
  embeddingsProvider?: {
    provider: string
    model?: string
    apiBase?: string
  }
  reranker?: {
    name: string
    params?: Record<string, any>
  }
  contextProviders?: Array<{
    name: string
    params?: Record<string, any>
  }>
  slashCommands?: Array<{
    name: string
    description: string
  }>
  customCommands?: Array<{
    name: string
    description: string
    prompt: string
  }>
  experimental?: {
    modelContextProtocolServers?: ContinueMcpServer[]
    promptPath?: string
  }
  allowAnonymousTelemetry?: boolean
}

/**
 * Default Continue configuration
 */
const DEFAULT_CONTINUE_CONFIG: ContinueConfig = {
  models: [
    {
      title: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
    },
  ],
  tabAutocompleteModel: {
    title: 'Starcoder2 3B',
    provider: 'ollama',
    model: 'starcoder2:3b',
  },
  contextProviders: [
    { name: 'code', params: {} },
    { name: 'docs', params: {} },
    { name: 'diff', params: {} },
    { name: 'terminal', params: {} },
    { name: 'problems', params: {} },
    { name: 'folder', params: {} },
    { name: 'codebase', params: {} },
  ],
  slashCommands: [
    { name: 'edit', description: 'Edit selected code' },
    { name: 'comment', description: 'Add comments to code' },
    { name: 'share', description: 'Share conversation' },
    { name: 'cmd', description: 'Run terminal command' },
    { name: 'commit', description: 'Generate commit message' },
  ],
  allowAnonymousTelemetry: false,
}

/**
 * Ensure Continue directory exists
 */
export function ensureContinueDir(): void {
  if (!existsSync(CONTINUE_DIR)) {
    mkdirSync(CONTINUE_DIR, { recursive: true })
  }
}

/**
 * Check if Continue is configured
 */
export function isContinueConfigured(): boolean {
  return existsSync(CONTINUE_CONFIG_FILE)
}

/**
 * Read Continue configuration
 */
export function readContinueConfig(): ContinueConfig {
  if (!existsSync(CONTINUE_CONFIG_FILE)) {
    return DEFAULT_CONTINUE_CONFIG
  }

  try {
    const content = readFileSync(CONTINUE_CONFIG_FILE, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return DEFAULT_CONTINUE_CONFIG
  }
}

/**
 * Write Continue configuration
 */
export function writeContinueConfig(config: ContinueConfig): void {
  ensureContinueDir()
  writeFileSync(CONTINUE_CONFIG_FILE, JSON.stringify(config, null, 2))
}

/**
 * Add a model to Continue
 */
export function addContinueModel(model: ContinueModel): void {
  const config = readContinueConfig()

  if (!config.models) {
    config.models = []
  }

  // Remove existing model with same title
  config.models = config.models.filter(m => m.title !== model.title)
  config.models.push(model)

  writeContinueConfig(config)
}

/**
 * Remove a model from Continue
 */
export function removeContinueModel(title: string): boolean {
  const config = readContinueConfig()

  if (!config.models)
    return false

  const initialLength = config.models.length
  config.models = config.models.filter(m => m.title !== title)

  if (config.models.length < initialLength) {
    writeContinueConfig(config)
    return true
  }

  return false
}

/**
 * Get Continue provider presets
 */
export function getContinueProviderPresets(): Record<string, ContinueModel> {
  return {
    'anthropic-sonnet': {
      title: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
    },
    'anthropic-opus': {
      title: 'Claude 3 Opus',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
    },
    'openai-gpt4o': {
      title: 'GPT-4o',
      provider: 'openai',
      model: 'gpt-4o',
    },
    'openai-gpt4': {
      title: 'GPT-4 Turbo',
      provider: 'openai',
      model: 'gpt-4-turbo',
    },
    'ollama-llama': {
      title: 'Llama 3.1 (Local)',
      provider: 'ollama',
      model: 'llama3.1:8b',
    },
    'ollama-codellama': {
      title: 'Code Llama (Local)',
      provider: 'ollama',
      model: 'codellama:7b',
    },
    'gemini-pro': {
      title: 'Gemini Pro',
      provider: 'gemini',
      model: 'gemini-1.5-pro',
    },
    'deepseek-chat': {
      title: 'DeepSeek Chat',
      provider: 'deepseek',
      model: 'deepseek-chat',
    },
  }
}

/**
 * Configure Continue API key
 */
export function configureContinueApi(provider: string, apiKey: string, apiBase?: string): void {
  const config = readContinueConfig()

  // Update all models of this provider with the API key
  if (config.models) {
    config.models = config.models.map((model) => {
      if (model.provider === provider) {
        return {
          ...model,
          apiKey,
          ...(apiBase ? { apiBase } : {}),
        }
      }
      return model
    })
  }

  writeContinueConfig(config)
}

/**
 * Add MCP server to Continue
 */
export function addContinueMcpServer(name: string, server: ContinueMcpServer): void {
  const config = readContinueConfig()

  if (!config.experimental) {
    config.experimental = {}
  }

  if (!config.experimental.modelContextProtocolServers) {
    config.experimental.modelContextProtocolServers = []
  }

  // Add server (Continue MCP format)
  config.experimental.modelContextProtocolServers.push(server)

  writeContinueConfig(config)
}

/**
 * Add custom command to Continue
 */
export function addContinueCustomCommand(name: string, description: string, prompt: string): void {
  const config = readContinueConfig()

  if (!config.customCommands) {
    config.customCommands = []
  }

  // Remove existing command with same name
  config.customCommands = config.customCommands.filter(c => c.name !== name)
  config.customCommands.push({ name, description, prompt })

  writeContinueConfig(config)
}

/**
 * Enable context provider
 */
export function enableContinueContextProvider(name: string, params?: Record<string, any>): void {
  const config = readContinueConfig()

  if (!config.contextProviders) {
    config.contextProviders = []
  }

  // Check if already exists
  if (!config.contextProviders.find(p => p.name === name)) {
    config.contextProviders.push({ name, params })
    writeContinueConfig(config)
  }
}

/**
 * Sync CCJK skills to Continue custom commands
 */
export function syncSkillsToContinue(skills: Array<{ id: string, name: string, description: string, template: string }>): void {
  const config = readContinueConfig()

  if (!config.customCommands) {
    config.customCommands = []
  }

  // Add CCJK skills as custom commands
  for (const skill of skills) {
    const existingIndex = config.customCommands.findIndex(c => c.name === skill.id)

    if (existingIndex >= 0) {
      config.customCommands[existingIndex] = {
        name: skill.id,
        description: skill.description,
        prompt: skill.template,
      }
    }
    else {
      config.customCommands.push({
        name: skill.id,
        description: skill.description,
        prompt: skill.template,
      })
    }
  }

  writeContinueConfig(config)
}
