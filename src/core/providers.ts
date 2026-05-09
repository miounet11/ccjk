import type { CodeTool } from './tools.js';

export type AuthType = 'api_key' | 'auth_token';

export interface ApiProvider {
  id: string;
  name: string;
  baseUrl: string;
  authType: AuthType;
  defaultModel?: string;
  fastModel?: string;
  supportedTools: CodeTool[];
  description: string;
}

export const PROVIDERS: ApiProvider[] = [
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
  {
    id: 'anthropic',
    name: 'Anthropic 官方',
    baseUrl: 'https://api.anthropic.com',
    authType: 'auth_token',
    supportedTools: ['clavue', 'claude-code'],
    description: '官方 API（需海外网络）',
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    authType: 'auth_token',
    supportedTools: ['clavue', 'claude-code', 'codex'],
    description: '手动输入 baseUrl 和 key',
  },
];

export function findProvider(id: string): ApiProvider | undefined {
  return PROVIDERS.find(p => p.id === id);
}

export function listProvidersFor(tool: CodeTool): ApiProvider[] {
  return PROVIDERS.filter(p => p.supportedTools.includes(tool));
}
