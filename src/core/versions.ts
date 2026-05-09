import { execSync } from 'node:child_process';
import { TOOLS } from './tools.js';
import type { CodeTool, CodeToolMeta } from './tools.js';

export interface VersionInfo {
  tool: CodeTool;
  meta: CodeToolMeta;
  installed: boolean;
  /** 本地版本（从 `<bin> --version` 解析），未装则 undefined */
  local?: string;
  /** npm 上的最新版本（仅在显式查询时填充），无网或未查则 undefined */
  latest?: string;
  /** 是否需要升级（local < latest）；只有在 latest 已知时才有意义 */
  outdated?: boolean;
}

/** 探测某个工具本地是否安装、版本号多少。不发网络。 */
export function getInstalledVersion(tool: CodeTool): { installed: boolean; version?: string } {
  const meta = TOOLS[tool];
  // 先 which 一下，没装就不调 --version 避免冗长报错
  if (!isOnPath(meta.binName)) return { installed: false };
  try {
    const raw = execSync(`${meta.binName} --version`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
      encoding: 'utf-8',
    });
    const v = extractVersion(raw);
    return v ? { installed: true, version: v } : { installed: true };
  }
  catch {
    return { installed: true };
  }
}

/**
 * 从 npm registry 查 latest 版本。会发网络请求（`npm view <pkg> version`）。
 * 失败返回 undefined（不抛错），让上层决定是否提示用户。
 */
export function getLatestVersion(tool: CodeTool): string | undefined {
  const meta = TOOLS[tool];
  try {
    const raw = execSync(`npm view ${meta.npmPackage} version`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10_000,
      encoding: 'utf-8',
    });
    const v = raw.trim();
    return /^\d+\.\d+\.\d+/.test(v) ? v : undefined;
  }
  catch {
    return undefined;
  }
}

/**
 * 同时查所有工具状态。checkUpdates=true 会发网络。
 * 串行查 npm 而不是并发，因为 npm view 各自启子进程，并发反而更慢且占资源。
 */
export function getAllVersions(checkUpdates = false): VersionInfo[] {
  const out: VersionInfo[] = [];
  for (const tool of Object.keys(TOOLS) as CodeTool[]) {
    const meta = TOOLS[tool];
    const local = getInstalledVersion(tool);
    const info: VersionInfo = { tool, meta, installed: local.installed };
    if (local.version) info.local = local.version;
    if (checkUpdates) {
      const latest = getLatestVersion(tool);
      if (latest) {
        info.latest = latest;
        if (info.local) info.outdated = compareVersion(info.local, latest) < 0;
      }
    }
    out.push(info);
  }
  return out;
}

/**
 * 比较两个 semver 字符串。
 *  -1 = a < b
 *   0 = a == b
 *   1 = a > b
 * 不支持 prerelease（1.2.3-beta），prerelease 部分会被忽略。
 * 这里足够用——三个工具发布的都是稳定版。
 */
export function compareVersion(a: string, b: string): -1 | 0 | 1 {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

function parseVersion(v: string): [number, number, number] {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * 从 `<bin> --version` 输出里抠版本号。
 * 不同工具输出格式不一：
 *   "1.2.3"
 *   "clavue 1.2.3"
 *   "Claude Code v2.1.90 (...)"
 */
export function extractVersion(raw: string): string | undefined {
  const m = /(\d+\.\d+\.\d+)/.exec(raw);
  return m ? m[1] : undefined;
}

function isOnPath(bin: string): boolean {
  try {
    execSync(`command -v ${bin}`, { stdio: 'ignore' });
    return true;
  }
  catch {
    return false;
  }
}
