import type { ClaudeSettings } from './settings.js';

/**
 * 推荐的隐私保护 / 性能调优环境变量。
 *
 * 写到 settings.env，对 Claude Code / Clavue 都生效。
 *
 * 这些是**社区共识的"装机就该开"**：
 * - DISABLE_TELEMETRY=1 — 关闭遥测（隐私）
 * - DISABLE_ERROR_REPORTING=1 — 关闭错误上报到 Anthropic（隐私）
 * - MCP_TIMEOUT=15000 — MCP 超时延长（默认 5s 容易在慢网络下假阳性失败）
 *
 * 故意没有：
 * - DISABLE_AUTOUPDATER — Native 安装器自动升级是好事，不该默认关
 * - DISABLE_NON_ESSENTIAL_MODEL_CALLS — 影响某些功能（自动命名等），用户可能不喜欢
 */
export interface RecommendedEnvVar {
  key: string;
  value: string;
  description: string;
}

export const RECOMMENDED_ENV_VARS: RecommendedEnvVar[] = [
  {
    key: 'DISABLE_TELEMETRY',
    value: '1',
    description: '关闭遥测上报',
  },
  {
    key: 'DISABLE_ERROR_REPORTING',
    value: '1',
    description: '关闭错误上报到 Anthropic',
  },
  {
    key: 'MCP_TIMEOUT',
    value: '15000',
    description: 'MCP 启动超时延长到 15s（默认 5s 在慢网络下容易失败）',
  },
];

/**
 * 把推荐 env 应用到 settings（in-place）。
 * - 已存在的 key 不覆盖（用户可能有意改成别的值）
 * - 返回新增的 key 列表
 */
export function applyRecommendedEnv(settings: ClaudeSettings): string[] {
  settings.env = settings.env ?? {};
  const added: string[] = [];
  for (const v of RECOMMENDED_ENV_VARS) {
    if (settings.env[v.key] === undefined || settings.env[v.key] === '') {
      settings.env[v.key] = v.value;
      added.push(v.key);
    }
  }
  return added;
}
