import { execSync } from 'node:child_process';
import { TOOLS } from './tools.js';
import type { CodeTool, CodeToolMeta } from './tools.js';

export interface VersionInfo {
  tool: CodeTool;
  meta: CodeToolMeta;
  installed: boolean;
  /** 本地版本（从 `<bin> --version` 解析），未装则 undefined */
  local?: string;
  /** 上游最新版本（仅在显式查询时填充），无网或未查则 undefined */
  latest?: string;
  /** 是否需要升级（local < latest）；只有在 latest 已知时才有意义 */
  outdated?: boolean;
}

/** 探测某个工具本地是否安装、版本号多少。不发网络。 */
export function getInstalledVersion(tool: CodeTool): { installed: boolean; version?: string } {
  const meta = TOOLS[tool];
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
 * 查上游最新版本：
 * - npm 工具走 `npm view <pkg> version`
 * - script 工具（Claude Code）目前没有简单的 stable URL 拉版本号，先返回 undefined。
 *   Native 安装器会自动后台升级，所以"该不该升级"这事它自己会处理。
 */
export function getLatestVersion(tool: CodeTool): string | undefined {
  const meta = TOOLS[tool];
  if (meta.installer.kind === 'npm') {
    try {
      const raw = execSync(`npm view ${meta.installer.package} version`, {
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
  // script 类工具：暂不支持远程版本查询
  return undefined;
}

/**
 * 同时查所有工具状态。checkUpdates=true 会发网络（仅对 npm 工具有效）。
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
 * 根据 installer 类型生成"安装"命令字符串。
 * 字符串形式方便给用户预览，再用 spawn 拆 shell 执行。
 */
export function buildInstallCommand(meta: CodeToolMeta, version?: string): string {
  if (meta.installer.kind === 'script') {
    // 暂不支持指定版本（官方脚本支持 `bash -s 2.1.89`，未来可加）
    return meta.installer.install;
  }
  const pkg = meta.installer.package;
  return version ? `npm install -g ${pkg}@${version}` : `npm install -g ${pkg}`;
}

/**
 * 根据 installer 类型生成"升级"命令。
 */
export function buildUpdateCommand(meta: CodeToolMeta, latestVersion?: string): string {
  if (meta.installer.kind === 'script') {
    return meta.installer.update;
  }
  const pkg = meta.installer.package;
  return `npm install -g ${pkg}@${latestVersion ?? 'latest'}`;
}

/**
 * 比较两个 semver 字符串。-1/0/1。不支持 prerelease（被忽略）。
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
