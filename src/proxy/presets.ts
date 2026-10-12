import type { UpstreamProtocol } from './types'

export interface ProviderPreset {
  id: string
  name: string
  protocol: UpstreamProtocol
  baseUrl: string
  docsUrl: string
  models: string[]
}

/**
 * 公开文档里能对上的端点。自定义供应商同样是一等入口。
 * 这里不收录需要冒充官方客户端才能用的订阅通道。
 */
export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  { id: 'anthropic', name: 'Anthropic', protocol: 'anthropic-messages', baseUrl: 'https://api.anthropic.com', docsUrl: 'https://docs.anthropic.com', models: ['claude-sonnet-4-5', 'claude-haiku-4-5'] },
  { id: 'openai', name: 'OpenAI', protocol: 'openai-responses', baseUrl: 'https://api.openai.com/v1', docsUrl: 'https://platform.openai.com/docs', models: ['gpt-5.4', 'gpt-5.4-mini'] },
  { id: 'xai', name: 'xAI', protocol: 'xai', baseUrl: 'https://api.x.ai/v1', docsUrl: 'https://docs.x.ai', models: ['grok-4', 'grok-3'] },
  { id: 'gemini', name: 'Gemini', protocol: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', docsUrl: 'https://ai.google.dev/gemini-api/docs', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  { id: 'openrouter', name: 'OpenRouter', protocol: 'openai-chat', baseUrl: 'https://openrouter.ai/api/v1', docsUrl: 'https://openrouter.ai/docs', models: ['openai/gpt-5.4', 'anthropic/claude-sonnet-4.5'] },
  { id: 'deepseek', name: 'DeepSeek', protocol: 'openai-chat', baseUrl: 'https://api.deepseek.com', docsUrl: 'https://api-docs.deepseek.com', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'moonshot', name: 'Kimi / Moonshot', protocol: 'openai-chat', baseUrl: 'https://api.moonshot.cn/v1', docsUrl: 'https://platform.moonshot.cn/docs', models: ['kimi-k2-turbo-preview', 'moonshot-v1-128k'] },
  { id: 'zhipu', name: '智谱 GLM', protocol: 'openai-chat', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', docsUrl: 'https://docs.bigmodel.cn', models: ['glm-4.6', 'glm-4.5-air'] },
  { id: 'minimax', name: 'MiniMax', protocol: 'openai-chat', baseUrl: 'https://api.minimax.chat/v1', docsUrl: 'https://platform.minimaxi.com/document', models: ['MiniMax-M2', 'abab6.5s-chat'] },
  { id: 'dashscope', name: '阿里云百炼', protocol: 'openai-chat', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', docsUrl: 'https://help.aliyun.com/zh/model-studio', models: ['qwen-max', 'qwen-plus'] },
  { id: 'volcengine', name: '火山方舟', protocol: 'openai-chat', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', docsUrl: 'https://www.volcengine.com/docs/82379', models: ['doubao-seed-1-6-250615'] },
  { id: 'siliconflow', name: 'SiliconFlow', protocol: 'openai-chat', baseUrl: 'https://api.siliconflow.cn/v1', docsUrl: 'https://docs.siliconflow.cn', models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct'] },
  { id: 'groq', name: 'Groq', protocol: 'openai-chat', baseUrl: 'https://api.groq.com/openai/v1', docsUrl: 'https://console.groq.com/docs', models: ['llama-3.3-70b-versatile'] },
  { id: 'together', name: 'Together', protocol: 'openai-chat', baseUrl: 'https://api.together.xyz/v1', docsUrl: 'https://docs.together.ai', models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo'] },
  { id: 'fireworks', name: 'Fireworks', protocol: 'openai-chat', baseUrl: 'https://api.fireworks.ai/inference/v1', docsUrl: 'https://docs.fireworks.ai', models: ['accounts/fireworks/models/llama-v3p3-70b-instruct'] },
  { id: 'mistral', name: 'Mistral', protocol: 'openai-chat', baseUrl: 'https://api.mistral.ai/v1', docsUrl: 'https://docs.mistral.ai', models: ['mistral-large-latest'] },
  { id: 'deepinfra', name: 'DeepInfra', protocol: 'openai-chat', baseUrl: 'https://api.deepinfra.com/v1/openai', docsUrl: 'https://deepinfra.com/docs', models: ['meta-llama/Llama-3.3-70B-Instruct'] },
  { id: 'cerebras', name: 'Cerebras', protocol: 'openai-chat', baseUrl: 'https://api.cerebras.ai/v1', docsUrl: 'https://inference-docs.cerebras.ai', models: ['llama-3.3-70b'] },
  { id: 'sambanova', name: 'SambaNova', protocol: 'openai-chat', baseUrl: 'https://api.sambanova.ai/v1', docsUrl: 'https://docs.sambanova.ai', models: ['Meta-Llama-3.3-70B-Instruct'] },
  { id: 'nvidia', name: 'NVIDIA NIM', protocol: 'openai-chat', baseUrl: 'https://integrate.api.nvidia.com/v1', docsUrl: 'https://docs.api.nvidia.com', models: ['meta/llama-3.3-70b-instruct'] },
  { id: 'perplexity', name: 'Perplexity', protocol: 'openai-chat', baseUrl: 'https://api.perplexity.ai', docsUrl: 'https://docs.perplexity.ai', models: ['sonar-pro', 'sonar'] },
  { id: 'stepfun', name: '阶跃星辰', protocol: 'openai-chat', baseUrl: 'https://api.stepfun.com/v1', docsUrl: 'https://platform.stepfun.com/docs', models: ['step-2-16k'] },
  { id: 'yi', name: '零一万物', protocol: 'openai-chat', baseUrl: 'https://api.lingyiwanwu.com/v1', docsUrl: 'https://platform.lingyiwanwu.com/docs', models: ['yi-lightning'] },
  { id: 'baichuan', name: '百川', protocol: 'openai-chat', baseUrl: 'https://api.baichuan-ai.com/v1', docsUrl: 'https://platform.baichuan-ai.com/docs', models: ['Baichuan4-Turbo'] },
  { id: 'hunyuan', name: '腾讯混元', protocol: 'openai-chat', baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1', docsUrl: 'https://cloud.tencent.com/document/product/1729', models: ['hunyuan-turbos-latest'] },
  { id: 'github-models', name: 'GitHub Models', protocol: 'openai-chat', baseUrl: 'https://models.inference.ai.azure.com', docsUrl: 'https://docs.github.com/github-models', models: ['gpt-4o'] },
  { id: 'ollama', name: 'Ollama', protocol: 'openai-chat', baseUrl: 'http://127.0.0.1:11434/v1', docsUrl: 'https://github.com/ollama/ollama/blob/main/docs/openai.md', models: ['llama3.2'] },
  { id: 'lmstudio', name: 'LM Studio', protocol: 'openai-chat', baseUrl: 'http://127.0.0.1:1234/v1', docsUrl: 'https://lmstudio.ai/docs/app/api', models: ['local-model'] },
]

export function findPreset(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find(preset => preset.id === id)
}
