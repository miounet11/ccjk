/**
 * 把用户粘贴的一段「配置文本」解析成结构化字段。
 *
 * 设计意图：
 *   大多数中转服务商发给用户的配置长这样：
 *     export ANTHROPIC_BASE_URL=https://xxx.com
 *     export ANTHROPIC_AUTH_TOKEN=sk-xxx
 *   或者直接 KEY=VALUE，或一行 URL + Key，或一段 JSON。
 *   让用户直接粘贴，省掉「选 provider → 填 URL → 填 Key」三步。
 *
 * 只解析，不做副作用；副作用留给 quick.ts 完成。
 */

export interface QuickConfig {
  baseUrl?: string;
  /** 凭证值。authType 用来决定写 AUTH_TOKEN 还是 API_KEY */
  apiKey?: string;
  authType?: 'auth_token' | 'api_key';
  /** ANTHROPIC_MODEL */
  model?: string;
  /** ANTHROPIC_DEFAULT_HAIKU_MODEL */
  haikuModel?: string;
  sonnetModel?: string;
  opusModel?: string;
}

/**
 * 解析任意粘贴文本。
 *
 * 支持的格式：
 *   1. `export KEY=VALUE`（bash export）
 *   2. `KEY=VALUE`（dotenv 风格，无 quote / 单引号 / 双引号都吃）
 *   3. `KEY: VALUE` 或 `KEY VALUE`（容错粘贴）
 *   4. 一段 JSON 含 `env` 字段（直接拷别人的 settings.json）
 *   5. 裸 URL + 裸 Key（按行扫描，看到 https:// 当 baseUrl，sk- 开头当 key）
 *
 * 解析永不抛错；不认识的就当没看到，返回部分字段。
 */
export function parseQuickConfig(raw: string): QuickConfig {
  const text = raw.trim();
  if (!text) return {};

  // 先试 JSON
  const fromJson = tryParseJson(text);
  if (fromJson) return fromJson;

  // 行扫描
  const out: QuickConfig = {};
  for (const line of text.split(/\r?\n/)) {
    parseLine(line, out);
  }

  // 兜底：没拿到 baseUrl / apiKey 时，尝试用「裸值」匹配
  if (!out.baseUrl || !out.apiKey) {
    fillFromBareValues(text, out);
  }

  return out;
}

function tryParseJson(text: string): QuickConfig | null {
  if (!text.startsWith('{') && !text.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    // 支持两种结构：{ env: {...} } 或直接 { ANTHROPIC_BASE_URL: ... }
    const env = (parsed.env && typeof parsed.env === 'object')
      ? parsed.env as Record<string, unknown>
      : parsed;
    return extractFromEnvMap(env);
  }
  catch {
    return null;
  }
}

function extractFromEnvMap(env: Record<string, unknown>): QuickConfig {
  const out: QuickConfig = {};
  const get = (k: string): string | undefined => {
    const v = env[k];
    return typeof v === 'string' ? v.trim() : undefined;
  };
  const baseUrl = get('ANTHROPIC_BASE_URL') ?? get('BASE_URL') ?? get('ANTHROPIC_API_BASE');
  if (baseUrl) out.baseUrl = baseUrl;

  const token = get('ANTHROPIC_AUTH_TOKEN') ?? get('AUTH_TOKEN');
  const key = get('ANTHROPIC_API_KEY') ?? get('API_KEY');
  if (token) {
    out.apiKey = token;
    out.authType = 'auth_token';
  }
  else if (key) {
    out.apiKey = key;
    out.authType = 'api_key';
  }

  const main = get('ANTHROPIC_MODEL');
  if (main) out.model = main;
  const haiku = get('ANTHROPIC_DEFAULT_HAIKU_MODEL');
  if (haiku) out.haikuModel = haiku;
  const sonnet = get('ANTHROPIC_DEFAULT_SONNET_MODEL');
  if (sonnet) out.sonnetModel = sonnet;
  const opus = get('ANTHROPIC_DEFAULT_OPUS_MODEL');
  if (opus) out.opusModel = opus;

  return out;
}

/**
 * 解析单行。
 * 形如：`[export] KEY[:=]?[ ]?VALUE`
 * 注释行（# 开头）、空行直接跳过。
 */
function parseLine(rawLine: string, out: QuickConfig): void {
  const line = rawLine.trim();
  if (!line || line.startsWith('#') || line.startsWith('//')) return;

  // 去 export 前缀
  const stripped = line.replace(/^export\s+/i, '');

  // 匹配 KEY=VALUE / KEY: VALUE
  const m = /^([A-Z_][A-Z0-9_]*)\s*[:=]\s*(.+)$/i.exec(stripped);
  if (!m) return;
  const key = m[1]!.toUpperCase();
  let value = m[2]!.trim();
  // 去 quote + 行尾分号
  value = value.replace(/;$/, '').trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (!value) return;

  switch (key) {
    case 'ANTHROPIC_BASE_URL':
    case 'BASE_URL':
    case 'ANTHROPIC_API_BASE':
      out.baseUrl = value;
      break;
    case 'ANTHROPIC_AUTH_TOKEN':
    case 'AUTH_TOKEN':
      out.apiKey = value;
      out.authType = 'auth_token';
      break;
    case 'ANTHROPIC_API_KEY':
    case 'API_KEY':
      // 只在还没拿到 token 的时候用 key（token 优先）
      if (!out.apiKey || out.authType !== 'auth_token') {
        out.apiKey = value;
        out.authType = 'api_key';
      }
      break;
    case 'ANTHROPIC_MODEL':
      out.model = value;
      break;
    case 'ANTHROPIC_DEFAULT_HAIKU_MODEL':
      out.haikuModel = value;
      break;
    case 'ANTHROPIC_DEFAULT_SONNET_MODEL':
      out.sonnetModel = value;
      break;
    case 'ANTHROPIC_DEFAULT_OPUS_MODEL':
      out.opusModel = value;
      break;
  }
}

/**
 * 没解析到关键字段时的兜底：扫描裸值。
 * - URL：第一个 https?:// 开头的连续字符
 * - Key：sk- / cr_ / ak- 等常见前缀 + 至少 20 个非空白字符
 */
function fillFromBareValues(text: string, out: QuickConfig): void {
  if (!out.baseUrl) {
    const m = /(https?:\/\/[\w.\-:/]+)/i.exec(text);
    if (m) out.baseUrl = m[1]!.replace(/[.,;]+$/, '');
  }
  if (!out.apiKey) {
    // 常见 token 前缀
    const m = /\b((?:sk-|cr_|ak-|gsk_|csk-)[A-Za-z0-9_\-]{16,})/.exec(text);
    if (m) {
      out.apiKey = m[1]!;
      out.authType = 'auth_token';
    }
  }
}

/**
 * 根据 baseUrl 自动猜测 provider id。
 * 拿不准就返回 'custom'。
 */
export function guessProviderId(baseUrl: string | undefined): string {
  if (!baseUrl) return 'custom';
  const u = baseUrl.toLowerCase();
  if (u.includes('bigmodel.cn') || u.includes('glm')) return 'glm';
  if (u.includes('moonshot.cn') || u.includes('kimi')) return 'kimi';
  if (u.includes('minimaxi.com') || u.includes('minimax')) return 'minimax';
  if (u.includes('api.anthropic.com')) return 'anthropic';
  return 'custom';
}
