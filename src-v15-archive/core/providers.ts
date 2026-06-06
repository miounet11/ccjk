import type { CodeTool } from './tools.js';

export type AuthType = 'api_key' | 'auth_token';

/**
 * ccjk 统一 preset 结构的合理 preset 结构。
 * 每个 provider 按目标工具声明独立接入参数，避免扁平化导致的设置交互混乱。
 */
export interface ApiProvider {
  id: string;
  name: string;
  supportedTools: CodeTool[];
  description?: string;
  /** 一句话提示（UI 列表副标题） */
  hint?: string;
  /** 区域元数据，帮助 UI 分组（cn=国内直连，global=海外） */
  region?: 'cn' | 'global';
  /** Provider 官方文档 URL */
  docsUrl?: string;
  /** Claude Code / Clavue 接入参数（ccjk 推荐的合理方式） */
  claudeCode?: {
    baseUrl: string;
    authType: AuthType;
    /** 已知可用 model id 列表，UI 用作候选；首项视为默认 */
    defaultModels?: string[];
  };
  /** Codex 接入参数 */
  codex?: {
    baseUrl: string;
    /** codex 当前只支持 responses；保留字段以备未来扩展 */
    wireApi: 'responses';
    /** 默认 model（写到 [profiles.<name>].model） */
    defaultModel?: string;
  };
}

export const PROVIDERS: ApiProvider[] = [
  {
    id: 'glm',
    name: 'GLM (智谱)',
    supportedTools: ['clavue', 'claude-code'],
    description: '智谱 AI - GLM 4.6/4.5，国内可直连',
    hint: '国内常用，glm-4.6 性价比高',
    region: 'cn',
    docsUrl: 'https://open.bigmodel.cn/dev/api',
    claudeCode: {
      baseUrl: 'https://open.bigmodel.cn/api/anthropic',
      authType: 'auth_token',
      defaultModels: ['glm-4.6', 'glm-4.5', 'glm-4.5-air', 'glm-4-flash'],
    },
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    supportedTools: ['clavue', 'claude-code'],
    description: 'Moonshot - Kimi K2，长上下文优秀',
    hint: 'Moonshot kimi-k2，128k 长上下文',
    region: 'cn',
    docsUrl: 'https://platform.moonshot.cn/docs',
    claudeCode: {
      baseUrl: 'https://api.moonshot.cn/anthropic',
      authType: 'auth_token',
      defaultModels: ['kimi-k2-turbo-preview', 'kimi-k2-0905-preview', 'moonshot-v1-128k', 'moonshot-v1-32k'],
    },
  },
  {
    id: 'minimax',
    name: 'MiniMax (海螺)',
    supportedTools: ['clavue', 'claude-code'],
    description: 'MiniMax - M2 模型',
    region: 'cn',
    claudeCode: {
      baseUrl: 'https://api.minimax.io/anthropic',
      authType: 'auth_token',
      defaultModels: ['MiniMax-M2', 'MiniMax-M1'],
    },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    supportedTools: ['clavue', 'claude-code'],
    description: 'DeepSeek - v3/r1，便宜',
    hint: 'deepseek-v3，便宜',
    region: 'cn',
    docsUrl: 'https://platform.deepseek.com/api-docs',
    claudeCode: {
      baseUrl: 'https://api.deepseek.com/anthropic',
      authType: 'auth_token',
      defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
    },
  },
  {
    id: 'anthropic',
    name: 'Anthropic 官方',
    supportedTools: ['clavue', 'claude-code'],
    description: '官方 API（需海外网络）',
    hint: '官方端点，需要 anthropic 账号',
    region: 'global',
    docsUrl: 'https://docs.anthropic.com',
    claudeCode: {
      baseUrl: 'https://api.anthropic.com',
      authType: 'auth_token',
      defaultModels: [
        'claude-opus-4-6',
        'claude-sonnet-4-6',
        'claude-haiku-4-5-20251001',
      ],
    },
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    supportedTools: ['clavue', 'claude-code'],
    description: 'OpenRouter - 聚合多家模型，按 token 计费',
    hint: '聚合多家 model，按 token 计费',
    region: 'global',
    docsUrl: 'https://openrouter.ai/docs',
    claudeCode: {
      baseUrl: 'https://openrouter.ai/api/v1',
      authType: 'auth_token',
    },
  },
  {
    id: 'gpt-gateway',
    name: 'GPT 网关 (OpenAI 兼容)',
    supportedTools: ['clavue', 'claude-code', 'grok'],
    description: 'GPT/Codex 类网关 — 分别配 Main/Haiku/Sonnet/Opus 槽位',
    region: 'global',
    claudeCode: {
      baseUrl: '',
      authType: 'auth_token',
      defaultModels: ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.3-codex', 'gpt-4o', 'gpt-4o-mini'],
    },
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    supportedTools: ['clavue', 'claude-code', 'grok'],
    description: 'xAI 官方 Grok 模型（OpenAI 兼容协议）',
    hint: 'Grok 官方，高质量推理',
    region: 'global',
    docsUrl: 'https://docs.x.ai/',
    claudeCode: {
      baseUrl: 'https://api.x.ai/v1',
      authType: 'api_key',
      defaultModels: ['grok-4', 'grok-3', 'grok-3-mini', 'grok-3-mini-fast'],
    },
  },
  {
    id: 'custom',
    name: '自定义网关',
    supportedTools: ['clavue', 'claude-code', 'codex', 'grok'],
    description: '手动输入 baseUrl + key（用于中转 / 自建网关）',
    hint: '手动填',
    region: 'global',
    // custom 没有 preset —— init 时强制询问
  },
];

export function findProvider(id: string): ApiProvider | undefined {
  return PROVIDERS.find(p => p.id === id);
}

export function listProvidersFor(tool: CodeTool): ApiProvider[] {
  return PROVIDERS.filter(p => p.supportedTools.includes(tool));
}

/** 复刻 ccjk 统一 helper：取 claudeCode preset 的第一个默认 model */
export function defaultClaudeModel(provider: ApiProvider): string | undefined {
  return provider.claudeCode?.defaultModels?.[0];
}
