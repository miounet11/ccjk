import { confirm, editor, input, password, select } from '@inquirer/prompts';
import ansis from 'ansis';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { findProvider } from '../core/providers.js';
import type { ApiProvider } from '../core/providers.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { guessProviderId, parseQuickConfig } from '../core/quick-parse.js';
import type { QuickConfig } from '../core/quick-parse.js';
import { listProfiles, validateName, writeProfile, writeState } from '../core/profiles.js';
import { applyApiToSettings } from './init.js';
import type { ModelSlots } from './init.js';

export interface QuickOptions {
  /** 用户直接传一段配置文本 */
  text?: string;
  /** 目标工具（默认 clavue） */
  tool?: CodeTool;
  /** 跳过确认 + 跳过 profile 命名询问（用 provider id 当 profile 名） */
  yes?: boolean;
  /** 显式指定 profile 名 */
  profile?: string;
}

/**
 * `ccjk quick` —— 粘贴一段配置文本，一键完成。
 *
 * 适合的场景：
 *   - 中转服务商发来 `export ANTHROPIC_BASE_URL=...; export ANTHROPIC_AUTH_TOKEN=...`
 *   - 用户手里有一段 dotenv 或 JSON
 *   - 用户能口头说出 URL + Key（粘进 editor 也能解析）
 *
 * 解析后直接：
 *   1. 显示「我解析到了什么」让用户确认
 *   2. 自动猜 provider（GLM / Kimi / MiniMax / Anthropic / custom）
 *   3. 写 settings.json + 自动存为 profile
 *
 * 缺失字段会单独问，不会让解析失败拖垮整个流程。
 */
export async function quickCommand(opts: QuickOptions = {}): Promise<void> {
  const tool = opts.tool ?? 'clavue';
  if (tool === 'codex') {
    console.log(ansis.yellow('\nCodex 配置走 ~/.codex/config.toml，quick 命令暂不支持 codex。'));
    console.log(ansis.dim('请用 `ccjk init -t codex` 或直接编辑 config.toml。\n'));
    return;
  }
  const meta = TOOLS[tool];

  // 1) 拿到原始文本
  //    优先级：CLI 参数 > stdin（pipe）> 交互编辑器
  const raw = opts.text
    ?? await readStdinIfPiped()
    ?? await readPasteInput();
  if (!raw.trim()) {
    console.log(ansis.gray('未输入内容，已取消。\n'));
    return;
  }

  // 2) 解析
  const parsed = parseQuickConfig(raw);
  printParsed(parsed);

  // 3) 补缺
  const baseUrl = parsed.baseUrl ?? await askBaseUrl();
  const apiKey = parsed.apiKey ?? await askApiKey();
  const authType = parsed.authType ?? 'auth_token';

  // 4) 猜 provider；如果不是已知 provider，落到 custom
  const providerId = guessProviderId(baseUrl);
  const provider = findProvider(providerId) ?? findProvider('custom')!;
  const finalProvider: ApiProvider = { ...provider, authType, ...(baseUrl ? { baseUrl } : {}) };

  // 5) 槽位：解析到啥用啥，没解析到 fallback 到 provider 默认
  const slots: ModelSlots = {
    ...(parsed.model ? { main: parsed.model } : {}),
    ...(parsed.haikuModel ? { haiku: parsed.haikuModel } : {}),
    ...(parsed.sonnetModel ? { sonnet: parsed.sonnetModel } : {}),
    ...(parsed.opusModel ? { opus: parsed.opusModel } : {}),
  };

  // 6) 总结 + 确认
  console.log();
  console.log(ansis.dim(`→ 目标: ${meta.displayName}（${meta.settingsFile}）`));
  console.log(ansis.dim(`→ Provider: ${finalProvider.name}（猜测）`));
  console.log(ansis.dim(`→ Base URL: ${baseUrl}`));
  console.log(ansis.dim(`→ Auth: ${authType}`));
  if (slots.main) console.log(ansis.dim(`→ Main: ${slots.main}`));
  if (slots.haiku) console.log(ansis.dim(`→ Haiku: ${slots.haiku}`));
  if (slots.sonnet) console.log(ansis.dim(`→ Sonnet: ${slots.sonnet}`));
  if (slots.opus) console.log(ansis.dim(`→ Opus: ${slots.opus}`));
  console.log();

  if (!opts.yes) {
    const ok = await confirm({ message: '确认写入并保存为 profile？', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }

  // 7) 写 settings
  const settings = await readSettings(meta.settingsFile);
  applyApiToSettings(settings, baseUrl, apiKey, finalProvider, slots);
  const backup = await writeSettings(meta.settingsFile, settings);

  console.log(ansis.green('\n✔ 配置已写入'));
  if (backup) console.log(ansis.dim(`  备份: ${backup}`));
  console.log(ansis.dim(`  目标: ${meta.settingsFile}`));

  // 8) profile 名
  const profileName = opts.profile ?? await suggestAndAskProfileName(finalProvider.id, opts.yes ?? false);
  if (profileName) {
    validateName(profileName);
    // profile 里的槽位字段：解析到的 > provider 默认值。
    // 不存的话 edit 之后会把 settings 里的对应 env 清掉，下次 use 也丢。
    const mainForProfile = slots.main ?? finalProvider.defaultModel;
    const fastForProfile = slots.haiku ?? finalProvider.fastModel;
    const sonnetForProfile = slots.sonnet ?? finalProvider.sonnetModel;
    const opusForProfile = slots.opus ?? finalProvider.opusModel;
    await writeProfile({
      name: profileName,
      provider: finalProvider.id,
      baseUrl,
      authType,
      apiKey,
      ...(mainForProfile ? { model: mainForProfile } : {}),
      ...(fastForProfile ? { fastModel: fastForProfile } : {}),
      ...(sonnetForProfile ? { sonnetModel: sonnetForProfile } : {}),
      ...(opusForProfile ? { opusModel: opusForProfile } : {}),
      createdAt: new Date().toISOString(),
    });
    await writeState({ current: profileName });
    console.log(ansis.green(`  Profile: ${profileName} 已保存（当前激活）`));
  }
  console.log();
}

/**
 * 如果 stdin 是 pipe（不是 TTY），把全部内容读进来。
 * 这让 `pbpaste | ccjk quick` 这种链式调用变得自然。
 * stdin 是 TTY（用户没 pipe）时返回 null，让上层走交互。
 */
async function readStdinIfPiped(): Promise<string | null> {
  if (process.stdin.isTTY) return null;

  return new Promise<string>((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

/**
 * 用 inquirer editor 让用户粘贴一段文本。
 * 弹出 $EDITOR 不便携，先尝试 prompt 多行；editor 走 fallback。
 */
async function readPasteInput(): Promise<string> {
  console.log(ansis.bold('\n粘贴你的 API 配置文本，然后按 Enter 进入编辑器：'));
  console.log(ansis.dim('  支持：bash export / KEY=VALUE / JSON / 裸 URL+Key'));
  console.log(ansis.dim('  例如：'));
  console.log(ansis.dim('    export ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic'));
  console.log(ansis.dim('    export ANTHROPIC_AUTH_TOKEN=sk-xxx'));
  console.log();

  // editor 会打开 $EDITOR；用户没设的话 inquirer 会报错。先试 editor，再 fallback 到单行 input。
  try {
    const text = await editor({
      message: '编辑器打开后粘贴内容，保存退出',
      default: '',
      waitForUserInput: false,
    });
    return text;
  }
  catch {
    // editor 不可用：退化到单行（用户只贴 URL+Key 也够）
    const text = await input({
      message: '把整段配置粘进来（单行也行）',
      validate: (s: string) => s.trim().length > 0 || '不能为空',
    });
    return text;
  }
}

function printParsed(parsed: QuickConfig): void {
  console.log(ansis.bold('\n解析结果：'));
  if (parsed.baseUrl) console.log(`  ${ansis.green('✓')} Base URL: ${parsed.baseUrl}`);
  else console.log(`  ${ansis.yellow('?')} Base URL: ${ansis.dim('未识别，稍后会问')}`);

  if (parsed.apiKey) {
    const masked = parsed.apiKey.length > 10
      ? `${parsed.apiKey.slice(0, 4)}...${parsed.apiKey.slice(-4)}`
      : '***';
    console.log(`  ${ansis.green('✓')} ${parsed.authType === 'auth_token' ? 'Auth Token' : 'API Key'}: ${masked}`);
  }
  else {
    console.log(`  ${ansis.yellow('?')} Key/Token: ${ansis.dim('未识别，稍后会问')}`);
  }

  if (parsed.model) console.log(`  ${ansis.green('✓')} Main model: ${parsed.model}`);
  if (parsed.haikuModel) console.log(`  ${ansis.green('✓')} Haiku: ${parsed.haikuModel}`);
  if (parsed.sonnetModel) console.log(`  ${ansis.green('✓')} Sonnet: ${parsed.sonnetModel}`);
  if (parsed.opusModel) console.log(`  ${ansis.green('✓')} Opus: ${parsed.opusModel}`);
  console.log();
}

async function askBaseUrl(): Promise<string> {
  return input({
    message: 'Base URL',
    validate: (s: string) => {
      const t = s.trim();
      if (!t) return '不能为空';
      if (!/^https?:\/\//i.test(t)) return '必须以 http:// 或 https:// 开头';
      return true;
    },
  }).then(s => s.trim());
}

async function askApiKey(): Promise<string> {
  return password({
    message: 'API Key / Auth Token',
    mask: true,
    validate: (s: string) => s.trim().length > 0 || '不能为空',
  }).then(s => s.trim());
}

async function suggestAndAskProfileName(providerId: string, yes: boolean): Promise<string> {
  const existing = (await listProfiles()).map(p => p.name);
  let suggested = providerId;
  if (existing.includes(suggested)) {
    let i = 2;
    while (existing.includes(`${providerId}-${i}`)) i++;
    suggested = `${providerId}-${i}`;
  }
  if (yes) return suggested;

  const v = await input({
    message: 'Profile 名称（用于 `ccjk use` 切换）',
    default: suggested,
    validate: (s: string) => {
      try { validateName(s.trim()); return true; }
      catch (e) { return (e as Error).message; }
    },
  });
  return v.trim();
}

/**
 * 给菜单调用：先选目标工具，再走 quickCommand。
 * CLI 直接调 quickCommand，不经这里。
 */
export async function quickMenuCommand(): Promise<void> {
  const tool = await select<CodeTool>({
    message: '配置哪个工具？',
    default: 'clavue',
    choices: [
      { name: `${TOOLS.clavue.displayName} ${ansis.dim('(主推)')}`, value: 'clavue' },
      { name: TOOLS['claude-code'].displayName, value: 'claude-code' },
    ],
  });
  await quickCommand({ tool });
}

// 让 editor 警告自动消失（让 TS noUnused 不报错时偶尔需要）
void editor;
