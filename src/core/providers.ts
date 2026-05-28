import type { CodeTool } from './tools.js';

export type AuthType = 'api_key' | 'auth_token';

/**
 * Provider 预设。
 *
 * 一个 provider 同时承载 claude-code 和 codex 两套接入参数（不少厂商两端 baseUrl
 * 不同：claude 走 `/anthropic` 兼容端点，codex 走 `/v1` responses 端点）。
 * 调用方按目标工具读对应子配置；缺失就说明该 provider 不支持那个工具。
 *
 * 参考：zcf（github.com/UfoMiao/zcf）的 ApiProviderPreset 结构，剔掉中转网关后保留
 * 官方直连列表。
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
  /** Claude Code / Clavue 接入参数 */
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

/**
 * 内置 provider 列表。
 *
 * 原则：只收录**官方直连**端点；中转/聚合网关（302.ai / Packy / Pateway / APIKEY.FUN /
 * AICodeMirror / Crazyrouter 等）不进表，要用走 `custom`。
 */
export const PROVIDERS: ApiProvider[] = [
  {
    id: 'glm',
    name: 'GLM (智谱)',
    supportedTools: ['clavue', 'claude-code'],
    description: '智谱 AI - GLM，国内直连',
    hint: '国内常用',
    region: 'cn',
    docsUrl: 'https://open.bigmodel.cn/dev/api',
    claudeCode: {
      baseUrl: 'https://open.bigmodel.cn/api/anthropic',
      authType: 'auth_token',
    },
  },
  {
    id: 'z-ai',
    name: 'Z.ai',
    supportedTools: ['clavue', 'claude-code'],
    description: 'Z.ai API（智谱海外线路）',
    region: 'global',
    claudeCode: {
      baseUrl: 'https://api.z.ai/api/anthropic',
      authType: 'auth_token',
    },
  },
  {
    id: 'bailian-coding',
    name: '阿里百炼 Coding',
    supportedTools: ['clavue', 'claude-code'],
    description: '阿里云百炼 - Coding 端点（Anthropic 兼容）',
    region: 'cn',
    docsUrl: 'https://help.aliyun.com/zh/dashscope/',
    claudeCode: {
      baseUrl: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
      authType: 'auth_token',
      defaultModels: ['glm-5'],
    },
  },
  {
    id: 'minimax',
    name: 'MiniMax (海螺)',
    supportedTools: ['clavue', 'claude-code'],
    description: 'MiniMax M2 系列',
    region: 'cn',
    claudeCode: {
      baseUrl: 'https://api.minimax.io/anthropic',
      authType: 'auth_token',
      defaultModels: ['MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-M2'],
    },
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    supportedTools: ['clavue', 'claude-code'],
    description: 'Moonshot Kimi - Coding 端点',
    hint: '长上下文',
    region: 'cn',
    docsUrl: 'https://platform.moonshot.cn/docs',
    claudeCode: {
      baseUrl: 'https://api.kimi.com/coding/',
      authType: 'auth_token',
    },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    supportedTools: ['clavue', 'claude-code'],
    description: 'DeepSeek 官方 API（Anthropic 兼容端点）',
    hint: '便宜',
    region: 'cn',
    docsUrl: 'https://platform.deepseek.com/api-docs',
    claudeCode: {
      baseUrl: 'https://api.deepseek.com/anthropic',
      authType: 'auth_token',
      defaultModels: ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'],
    },
  },
  {
    id: 'anthropic',
    name: 'Anthropic 官方',
    supportedTools: ['clavue', 'claude-code'],
    description: '官方 API（需海外网络）',
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
    id: 'custom',
    name: '自定义网关',
    supportedTools: ['clavue', 'claude-code', 'codex'],
    description: '手动输入 baseUrl + key（用于中转 / 自建网关）',
    hint: '手动填',
    region: 'global',
    // custom 没有 preset baseUrl —— init 时强制询问
  },
];

export function findProvider(id: string): ApiProvider | undefined {
  return PROVIDERS.find(p => p.id === id);
}

export function listProvidersFor(tool: CodeTool): ApiProvider[] {
  return PROVIDERS.filter(p => p.supportedTools.includes(tool));
}

/**
 * 老调用方拿 claudeCode 默认 model 的快捷方式。新代码请直接读
 * `provider.claudeCode?.defaultModels?.[0]`。
 */
export function defaultClaudeModel(provider: ApiProvider): string | undefined {
  return provider.claudeCode?.defaultModels?.[0];
}
