/**
 * Codex `~/.codex/config.toml` 写入封装。
 *
 * 设计核心：**永远走 `[profiles.<name>]` 段，不直接写顶层 model/model_provider**。
 * 顶层只设 `profile = "<name>"` 作为启动默认值——用户随时可用 `codex --profile foo`
 * 现场切换，多套 model 并存。这才是 codex 官方推荐姿势（developers.openai.com/codex/config-reference）。
 *
 * 字段映射：
 *   `[profiles.<name>]`
 *     model                    ← params.model（必填）
 *     model_provider           ← params.providerId（必填）
 *     model_reasoning_effort   ← params.reasoningEffort（可选）
 *
 *   `[model_providers.<providerId>]`（**仅在 params.baseUrl 提供时才写**——
 *    复用已存在 provider 时不要覆盖它的现有字段）
 *     name                     ← providerId（与段名一致）
 *     base_url                 ← params.baseUrl
 *     wire_api                 ← params.wireApi（默认且唯一支持值 'responses'）
 *     env_key                  ← params.envKey
 *     requires_openai_auth     ← params.requiresOpenaiAuth
 *
 * 注意：codex **不接受** API key 写进 toml；调用方负责提示用户 `export <envKey>`。
 * 历史脏字段 `model_providers.<X>.model` 不再写入；codex 官方也不读它。
 */

import type { TomlDoc, TomlValue } from './toml.js';
import { deleteTomlKey, setTomlValue } from './toml.js';

export type CodexWireApi = 'responses';
export type CodexReasoningEffort = 'low' | 'medium' | 'high';

export interface CodexProfileParams {
  /** profile 名，写入 `[profiles.<name>]` 与顶层 `profile = "<name>"` */
  profileName: string;
  /** 指向 `[model_providers.<id>]` 的 id */
  providerId: string;
  /** profile 段里要绑的 model（codex 的主模型字段） */
  model: string;
  /** 可选 reasoning effort，落到 profile 段 */
  reasoningEffort?: CodexReasoningEffort;
  /**
   * provider 字段——**任意一项给了就写整段**（复用已有 provider 时全部省略，
   * 我们就只在 profile 段引用它）。
   */
  baseUrl?: string;
  wireApi?: CodexWireApi;
  envKey?: string;
  requiresOpenaiAuth?: boolean;
}

/**
 * 把 codex profile 应用到 toml 文档（in-place 修改 doc.raw / doc.values）。
 *
 * 不会清掉用户原有的其它 profile / provider / MCP / projects 段——
 * 只增/改本次涉及的字段。复用现有 provider（不传 baseUrl 等）时也不会动 provider 段。
 */
export function applyCodexProfile(doc: TomlDoc, params: CodexProfileParams): void {
  const { profileName, providerId, model, reasoningEffort } = params;

  // 顶层 profile = 启动默认。若用户之前已经设过，会被替换——这是预期行为
  // （刚 init 完的 profile 自然成为下次启动的默认）。
  setTomlValue(doc, 'profile', profileName);

  // [profiles.<name>] 段
  setTomlValue(doc, `profiles.${profileName}.model`, model);
  setTomlValue(doc, `profiles.${profileName}.model_provider`, providerId);
  if (reasoningEffort) {
    setTomlValue(doc, `profiles.${profileName}.model_reasoning_effort`, reasoningEffort);
  }

  // [model_providers.<id>] 段——只在调用方传了 provider 字段时写
  // （复用已存在 provider 的场景：不传 baseUrl 等，保持原段不动）
  if (shouldWriteProviderSection(params)) {
    setTomlValue(doc, `model_providers.${providerId}.name`, providerId);
    if (params.baseUrl !== undefined) {
      setTomlValue(doc, `model_providers.${providerId}.base_url`, params.baseUrl);
    }
    // wire_api：codex 当前只支持 'responses'，未传也补上，避免落到已废 'chat'
    const wireApi: CodexWireApi = params.wireApi ?? 'responses';
    setTomlValue(doc, `model_providers.${providerId}.wire_api`, wireApi);
    if (params.envKey !== undefined) {
      setTomlValue(doc, `model_providers.${providerId}.env_key`, params.envKey);
    }
    if (params.requiresOpenaiAuth !== undefined) {
      setTomlValue(
        doc,
        `model_providers.${providerId}.requires_openai_auth`,
        params.requiresOpenaiAuth as TomlValue,
      );
    }
  }
}

/**
 * 列出现有 profile 段名（用于 init 时让用户选「新建 / 复用 / 改」），
 * 以及现有 model_providers 段名（让用户选「复用现有 provider」）。
 */
export function listCodexProfiles(doc: TomlDoc): string[] {
  return collectSectionNames(doc, 'profiles');
}

export function listCodexProviders(doc: TomlDoc): string[] {
  return collectSectionNames(doc, 'model_providers');
}

function collectSectionNames(doc: TomlDoc, prefix: string): string[] {
  const names = new Set<string>();
  for (const key of doc.values.keys()) {
    // 我们的 toml 解析把 `[profiles.foo]` 下的 `key = val` 存成 'profiles.foo.key'
    if (!key.startsWith(`${prefix}.`)) continue;
    const rest = key.slice(prefix.length + 1);
    const dot = rest.indexOf('.');
    if (dot < 0) continue;
    names.add(rest.slice(0, dot));
  }
  return [...names].sort();
}

function shouldWriteProviderSection(p: CodexProfileParams): boolean {
  return (
    p.baseUrl !== undefined
    || p.wireApi !== undefined
    || p.envKey !== undefined
    || p.requiresOpenaiAuth !== undefined
  );
}

/**
 * Codex toml lint。返回 finding 列表（severity / rule / message / fix?）。
 *
 * 当前规则：
 *  - codex-provider-model-field：`[model_providers.<X>].model` 是无效字段，
 *    codex 不读它，会让用户以为"切了 model"但其实没切。可自动修（删字段）。
 *  - codex-stale-wire-api：`wire_api = "chat"` 是旧字段，codex 当前只支持
 *    `"responses"`，会被忽略 / 报错。可自动修（改成 responses）。
 *  - codex-toplevel-model-without-profile：顶层有 `model = "..."` 但没设
 *    `profile = "..."`，单 model 锁定模式（反人性，建议改用 profiles）。
 *    info 级别——不强制改，提示用户。
 */
export interface CodexFinding {
  severity: 'error' | 'warn' | 'info';
  rule: string;
  message: string;
  fixHint?: string;
  /** 自动修函数；返回 true 表示已修。in-place 改 doc.raw / values */
  fix?: (doc: TomlDoc) => boolean;
}

export function lintCodexConfig(doc: TomlDoc): CodexFinding[] {
  const findings: CodexFinding[] = [];

  // 规则 1：model_providers.X.model 是脏数据
  const providerModelKeys: string[] = [];
  for (const k of doc.values.keys()) {
    const m = /^model_providers\.([^.]+)\.model$/.exec(k);
    if (m) providerModelKeys.push(k);
  }
  if (providerModelKeys.length > 0) {
    findings.push({
      severity: 'warn',
      rule: 'codex-provider-model-field',
      message:
        `[model_providers.X].model 不是 codex 支持的字段（codex 启动时静默忽略），`
        + `命中 ${providerModelKeys.length} 处：${providerModelKeys
          .map(k => k.split('.')[1])
          .join(', ')}`,
      fixHint: '删除这些无效字段；要切 model 请用 [profiles.X].model',
      fix: (d) => {
        let changed = false;
        for (const k of [...d.values.keys()]) {
          if (/^model_providers\.[^.]+\.model$/.test(k)) {
            if (deleteTomlKey(d, k)) changed = true;
          }
        }
        return changed;
      },
    });
  }

  // 规则 2：wire_api = "chat" 是旧字段
  const staleWireApi: string[] = [];
  for (const [k, v] of doc.values.entries()) {
    if (/^model_providers\.[^.]+\.wire_api$/.test(k) && v === 'chat') {
      staleWireApi.push(k.split('.')[1] ?? '');
    }
  }
  if (staleWireApi.length > 0) {
    findings.push({
      severity: 'warn',
      rule: 'codex-stale-wire-api',
      message:
        `wire_api = "chat" 是旧字段，codex 当前只支持 "responses"。命中：${staleWireApi.join(', ')}`,
      fixHint: '把 wire_api 改为 "responses"',
      fix: (d) => {
        let changed = false;
        for (const [k, v] of [...d.values.entries()]) {
          if (/^model_providers\.[^.]+\.wire_api$/.test(k) && v === 'chat') {
            setTomlValue(d, k, 'responses');
            changed = true;
          }
        }
        return changed;
      },
    });
  }

  // 规则 3：顶层 model 但没 profile（单 model 锁定）
  if (doc.values.has('model') && !doc.values.has('profile')) {
    findings.push({
      severity: 'info',
      rule: 'codex-toplevel-model-without-profile',
      message:
        '顶层只设了 model 没设 profile —— 这是单 model 锁定模式。'
        + '建议把它搬到 [profiles.<name>] 段，方便用 `codex --profile <other>` 切换其它 model。',
      fixHint: '运行 `ccjk init`，选 codex，新建一个 profile',
    });
  }

  return findings;
}

/** 跑可自动修的 codex 规则，返回已修规则名。 */
export function autoFixCodex(doc: TomlDoc): { fixed: string[]; unfixable: string[] } {
  const fixed: string[] = [];
  const unfixable: string[] = [];
  for (let i = 0; i < 5; i++) {
    const findings = lintCodexConfig(doc);
    if (findings.length === 0) break;
    let changed = false;
    for (const f of findings) {
      if (f.fix && f.fix(doc)) {
        if (!fixed.includes(f.rule)) fixed.push(f.rule);
        changed = true;
      }
      else if (!f.fix) {
        if (!unfixable.includes(f.rule)) unfixable.push(f.rule);
      }
    }
    if (!changed) break;
  }
  return { fixed, unfixable };
}
