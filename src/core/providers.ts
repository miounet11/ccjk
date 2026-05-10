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
    id: 'glm',
    name: 'GLM (智谱)',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    authType: 'auth_token',
    multiSlot: true,
    defaultModel: 'glm-4.6',
    supportedTools: ['clavue', 'claude-code'],
    description: '智谱 AI - GLM 4.6/4.5，国内可直连',
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/anthropic',
    authType: 'auth_token',
    multiSlot: true,
    defaultModel: 'kimi-k2-turbo-preview',
    supportedTools: ['clavue', 'claude-code'],
    description: 'Moonshot - Kimi K2，长上下文优秀',
  },
  {
    id: 'minimax',
    name: 'MiniMax (海螺)',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    authType: 'auth_token',
    multiSlot: true,
    defaultModel: 'MiniMax-M2',
    supportedTools: ['clavue', 'claude-code'],
    description: 'MiniMax - M2 模型',
  },
  {
    id: 'anthropic',
    name: 'Anthropic 官方',
    baseUrl: 'https://api.anthropic.com',
    authType: 'auth_token',
    multiSlot: true,
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
    id: 'custom',
    name: '自定义网关',
    baseUrl: '',
    authType: 'auth_token',
    multiSlot: true,
    supportedTools: ['clavue', 'claude-code', 'codex'],
    description: '手动输入 baseUrl + key，分别配 Main/Haiku/Sonnet/Opus 槽位',
  },
];

export function findProvider(id: string): ApiProvider | undefined {
  return PROVIDERS.find(p => p.id === id);
}

export function listProvidersFor(tool: CodeTool): ApiProvider[] {
  return PROVIDERS.filter(p => p.supportedTools.includes(tool));
}
