import type { CodeTool } from './tools.js';

export type AuthType = 'api_key' | 'auth_token';

export interface ApiProvider {
  id: string;
  name: string;
  baseUrl: string;
  authType: AuthType;
  /** Anthropic 默认模型（写到 ANTHROPIC_MODEL） */
  defaultModel?: string;
  /** Haiku 槽位模型（写到 ANTHROPIC_DEFAULT_HAIKU_MODEL） */
  fastModel?: string;
  /** 给 multiSlot 类 provider 用的 Sonnet 槽位默认值 */
  sonnetModel?: string;
  /** 给 multiSlot 类 provider 用的 Opus 槽位默认值 */
  opusModel?: string;
  /** 是否走"多槽位"配置流程（GPT/混合类网关）。
   *  true → init 会让用户分别填 main/haiku/sonnet/opus
   *  false/undefined → 只问一个 model */
  multiSlot?: boolean;
  supportedTools: CodeTool[];
  description: string;
}

export const PROVIDERS: ApiProvider[] = [
  {
    id: 'custom',
    name: '自定义（单 model）',
    baseUrl: '',
    authType: 'auth_token',
    supportedTools: ['clavue', 'claude-code', 'codex'],
    description: '手动输入 baseUrl 和 key（一个 model 走天下）',
  },
  {
    id: 'local',
    name: '本地化部署',
    baseUrl: 'http://localhost:8080',
    authType: 'auth_token',
    supportedTools: ['clavue', 'claude-code'],
    description: '本地 LiteLLM / Ollama / one-api 代理（默认 :8080，可改）',
  },
  {
    id: 'anthropic',
    name: 'Anthropic 官方',
    baseUrl: 'https://api.anthropic.com',
    authType: 'auth_token',
    supportedTools: ['clavue', 'claude-code'],
    description: '官方 API（需海外网络）',
  },
  {
    id: 'gpt-gateway',
    name: 'GPT 网关 (OpenAI 兼容)',
    baseUrl: '',
    authType: 'auth_token',
    multiSlot: true,
    defaultModel: 'gpt-5.5',
    fastModel: 'gpt-5.3-codex',
    sonnetModel: 'gpt-5.5',
    opusModel: 'gpt-5.5',
    supportedTools: ['clavue', 'claude-code'],
    description: 'GPT/Codex 类网关 — 分别配 Main/Haiku/Sonnet/Opus 槽位',
  },
  {
    id: 'qwen',
    name: 'Qwen (通义千问)',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v2/apps/claude-code-proxy',
    authType: 'auth_token',
    defaultModel: 'qwen3-coder-plus',
    supportedTools: ['clavue', 'claude-code'],
    description: '阿里百炼 - Qwen 3 Coder，国内可直连',
  },
  {
    id: 'glm',
    name: 'GLM (智谱)',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    authType: 'auth_token',
    defaultModel: 'glm-4.6',
    fastModel: 'glm-4.5-air',
    supportedTools: ['clavue', 'claude-code'],
    description: '智谱 AI - GLM 4.6/4.5，国内可直连',
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/anthropic',
    authType: 'auth_token',
    defaultModel: 'kimi-k2-turbo-preview',
    supportedTools: ['clavue', 'claude-code'],
    description: 'Moonshot - Kimi K2，长上下文优秀',
  },
  {
    id: 'minimax',
    name: 'MiniMax (海螺)',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    authType: 'auth_token',
    defaultModel: 'MiniMax-M2',
    supportedTools: ['clavue', 'claude-code'],
    description: 'MiniMax - M2 模型',
  },
];

export function findProvider(id: string): ApiProvider | undefined {
  return PROVIDERS.find(p => p.id === id);
}

export function listProvidersFor(tool: CodeTool): ApiProvider[] {
  return PROVIDERS.filter(p => p.supportedTools.includes(tool));
}
