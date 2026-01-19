/**
 * CCJK API Router - Built-in Provider Presets
 * Pre-configured settings for popular API providers
 */
import type { ProviderPreset } from './types'

/**
 * Built-in provider presets
 */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  // === Official Anthropic ===
  {
    id: 'anthropic',
    name: 'Anthropic (Official)',
    nameZh: 'Anthropic (官方)',
    description: 'Official Anthropic API - Best quality and reliability',
    descriptionZh: '官方 Anthropic API - 最佳质量和稳定性',
    category: 'official',
    website: 'https://console.anthropic.com',
    requiresApiKey: true,
    baseUrl: 'https://api.anthropic.com',
    models: [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ],
    defaultModel: 'claude-sonnet-4-20250514',
    features: ['chat', 'vision', 'tools', 'streaming', 'thinking', 'code'],
    instructions: {
      en: 'Get your API key from https://console.anthropic.com/settings/keys',
      zh: '从 https://console.anthropic.com/settings/keys 获取 API 密钥',
    },
  },

  // === OpenAI-Compatible Providers ===
  {
    id: '302ai',
    name: '302.AI',
    nameZh: '302.AI',
    description: 'Multi-model API platform with Claude support',
    descriptionZh: '多模型 API 平台，支持 Claude',
    category: 'openai-compatible',
    website: 'https://302.ai',
    requiresApiKey: true,
    baseUrl: 'https://api.302.ai/v1',
    models: [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'gpt-4o',
      'gpt-4-turbo',
    ],
    defaultModel: 'claude-sonnet-4-20250514',
    features: ['chat', 'vision', 'tools', 'streaming', 'code'],
    instructions: {
      en: 'Register at 302.ai and get your API key from dashboard',
      zh: '在 302.ai 注册并从控制台获取 API 密钥',
    },
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    nameZh: 'OpenRouter',
    description: 'Unified API for multiple AI models',
    descriptionZh: '统一多模型 API 接口',
    category: 'openai-compatible',
    website: 'https://openrouter.ai',
    requiresApiKey: true,
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      'anthropic/claude-sonnet-4',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3.7-sonnet:thinking',
      'google/gemini-2.5-pro-preview',
    ],
    defaultModel: 'anthropic/claude-sonnet-4',
    features: ['chat', 'vision', 'tools', 'streaming', 'thinking', 'code'],
    transformer: {
      use: ['openrouter'],
    },
    instructions: {
      en: 'Get your API key from https://openrouter.ai/keys',
      zh: '从 https://openrouter.ai/keys 获取 API 密钥',
    },
  },

  // === Chinese Providers ===
  {
    id: 'deepseek',
    name: 'DeepSeek',
    nameZh: 'DeepSeek 深度求索',
    description: 'High-performance Chinese AI with reasoning capabilities',
    descriptionZh: '高性能国产 AI，支持深度推理',
    category: 'chinese',
    website: 'https://platform.deepseek.com',
    requiresApiKey: true,
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    features: ['chat', 'tools', 'streaming', 'thinking', 'code'],
    transformer: {
      'use': ['deepseek'],
      'deepseek-chat': { use: ['tooluse'] },
    },
    instructions: {
      en: 'Get your API key from https://platform.deepseek.com/api_keys',
      zh: '从 https://platform.deepseek.com/api_keys 获取 API 密钥',
    },
  },
  {
    id: 'qwen',
    name: 'Qwen (Alibaba)',
    nameZh: '通义千问 (阿里巴巴)',
    description: 'Alibaba Cloud Qwen models via DashScope',
    descriptionZh: '阿里云通义千问大模型',
    category: 'chinese',
    website: 'https://dashscope.console.aliyun.com',
    requiresApiKey: true,
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen3-coder-plus', 'qwen-max', 'qwen-turbo'],
    defaultModel: 'qwen3-coder-plus',
    features: ['chat', 'vision', 'tools', 'streaming', 'code'],
    transformer: {
      'use': [['maxtoken', { max_tokens: 65536 }]],
      'qwen3-coder-plus': { use: ['enhancetool'] },
    },
    instructions: {
      en: 'Get your API key from Alibaba Cloud DashScope console',
      zh: '从阿里云 DashScope 控制台获取 API 密钥',
    },
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    nameZh: 'SiliconFlow 硅基流动',
    description: 'High-speed inference for multiple models',
    descriptionZh: '高速多模型推理平台',
    category: 'chinese',
    website: 'https://siliconflow.cn',
    requiresApiKey: true,
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['moonshotai/Kimi-K2-Instruct', 'deepseek-ai/DeepSeek-V3'],
    defaultModel: 'moonshotai/Kimi-K2-Instruct',
    features: ['chat', 'tools', 'streaming', 'code'],
    transformer: {
      use: [['maxtoken', { max_tokens: 16384 }]],
    },
    instructions: {
      en: 'Get your API key from https://cloud.siliconflow.cn',
      zh: '从 https://cloud.siliconflow.cn 获取 API 密钥',
    },
  },
  {
    id: 'modelscope',
    name: 'ModelScope',
    nameZh: 'ModelScope 魔搭',
    description: 'Alibaba ModelScope inference platform',
    descriptionZh: '阿里巴巴魔搭推理平台',
    category: 'chinese',
    website: 'https://modelscope.cn',
    requiresApiKey: true,
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    models: [
      'Qwen/Qwen3-Coder-480B-A35B-Instruct',
      'Qwen/Qwen3-235B-A22B-Thinking-2507',
      'ZhipuAI/GLM-4.5',
    ],
    defaultModel: 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
    features: ['chat', 'tools', 'streaming', 'thinking', 'code'],
    transformer: {
      'use': [['maxtoken', { max_tokens: 65536 }]],
      'Qwen/Qwen3-Coder-480B-A35B-Instruct': { use: ['enhancetool'] },
      'Qwen/Qwen3-235B-A22B-Thinking-2507': { use: ['reasoning'] },
    },
    instructions: {
      en: 'Get your API key from ModelScope console',
      zh: '从魔搭控制台获取 API 密钥',
    },
  },
  {
    id: 'volcengine',
    name: 'Volcengine (ByteDance)',
    nameZh: '火山引擎 (字节跳动)',
    description: 'ByteDance AI platform with DeepSeek models',
    descriptionZh: '字节跳动 AI 平台，支持 DeepSeek',
    category: 'chinese',
    website: 'https://console.volcengine.com',
    requiresApiKey: true,
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: ['deepseek-v3-250324', 'deepseek-r1-250528'],
    defaultModel: 'deepseek-v3-250324',
    features: ['chat', 'tools', 'streaming', 'thinking', 'code'],
    transformer: {
      use: ['deepseek'],
    },
    instructions: {
      en: 'Get your API key from Volcengine console',
      zh: '从火山引擎控制台获取 API 密钥',
    },
  },
  {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    nameZh: 'Kimi (月之暗面)',
    description: 'Moonshot AI with long context support',
    descriptionZh: '月之暗面 AI，支持超长上下文',
    category: 'chinese',
    website: 'https://platform.moonshot.cn',
    requiresApiKey: true,
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
    defaultModel: 'moonshot-v1-128k',
    features: ['chat', 'tools', 'streaming', 'code'],
    instructions: {
      en: 'Get your API key from https://platform.moonshot.cn/console/api-keys',
      zh: '从 https://platform.moonshot.cn/console/api-keys 获取 API 密钥',
    },
  },
  {
    id: 'glm',
    name: 'GLM (Zhipu AI)',
    nameZh: 'GLM (智谱 AI)',
    description: 'Zhipu AI ChatGLM models',
    descriptionZh: '智谱 AI ChatGLM 大模型',
    category: 'chinese',
    website: 'https://open.bigmodel.cn',
    requiresApiKey: true,
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-plus', 'glm-4', 'glm-4-flash'],
    defaultModel: 'glm-4-plus',
    features: ['chat', 'vision', 'tools', 'streaming', 'code'],
    instructions: {
      en: 'Get your API key from https://open.bigmodel.cn/usercenter/apikeys',
      zh: '从 https://open.bigmodel.cn/usercenter/apikeys 获取 API 密钥',
    },
  },

  // === Google Gemini ===
  {
    id: 'gemini',
    name: 'Google Gemini',
    nameZh: 'Google Gemini',
    description: 'Google AI models with multimodal capabilities',
    descriptionZh: 'Google AI 多模态模型',
    category: 'openai-compatible',
    website: 'https://aistudio.google.com',
    requiresApiKey: true,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-pro'],
    defaultModel: 'gemini-2.5-flash',
    features: ['chat', 'vision', 'tools', 'streaming', 'thinking', 'code'],
    transformer: {
      use: ['gemini'],
    },
    instructions: {
      en: 'Get your API key from https://aistudio.google.com/app/apikey',
      zh: '从 https://aistudio.google.com/app/apikey 获取 API 密钥',
    },
  },

  // === Free Tier Providers ===
  {
    id: 'groq',
    name: 'Groq',
    nameZh: 'Groq',
    description: 'Ultra-fast inference with free tier',
    descriptionZh: '超快推理，有免费额度',
    category: 'free',
    website: 'https://console.groq.com',
    requiresApiKey: true,
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    defaultModel: 'llama-3.3-70b-versatile',
    features: ['chat', 'tools', 'streaming', 'code'],
    instructions: {
      en: 'Get your free API key from https://console.groq.com/keys',
      zh: '从 https://console.groq.com/keys 获取免费 API 密钥',
    },
  },

  // === Local Providers ===
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    nameZh: 'Ollama (本地)',
    description: 'Run AI models locally with Ollama',
    descriptionZh: '使用 Ollama 本地运行 AI 模型',
    category: 'local',
    website: 'https://ollama.ai',
    requiresApiKey: false,
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.2', 'codellama', 'qwen2.5-coder'],
    defaultModel: 'llama3.2',
    features: ['chat', 'streaming', 'code'],
    instructions: {
      en: 'Install Ollama from https://ollama.ai and run: ollama pull llama3.2',
      zh: '从 https://ollama.ai 安装 Ollama 并运行: ollama pull llama3.2',
    },
  },
]

/**
 * Get all provider presets
 */
export function getAllPresets(): ProviderPreset[] {
  return PROVIDER_PRESETS
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(
  category: ProviderPreset['category'],
): ProviderPreset[] {
  return PROVIDER_PRESETS.filter(p => p.category === category)
}

/**
 * Get preset by ID
 */
export function getPresetById(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find(p => p.id === id)
}

/**
 * Get recommended presets (sorted by popularity/reliability)
 */
export function getRecommendedPresets(): ProviderPreset[] {
  const recommendedIds = ['anthropic', '302ai', 'deepseek', 'openrouter', 'qwen']
  return recommendedIds
    .map(id => getPresetById(id))
    .filter((p): p is ProviderPreset => p !== undefined)
}

/**
 * Get Chinese-friendly presets
 */
export function getChinesePresets(): ProviderPreset[] {
  return PROVIDER_PRESETS.filter(
    p => p.category === 'chinese' || p.id === '302ai',
  )
}

/**
 * Get free tier presets
 */
export function getFreePresets(): ProviderPreset[] {
  return PROVIDER_PRESETS.filter(
    p => p.category === 'free' || p.category === 'local',
  )
}
