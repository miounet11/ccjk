import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/detect.js', () => ({
  detectAll: vi.fn(),
}));

vi.mock('../../src/core/settings.js', () => ({
  readSettings: vi.fn(),
  writeSettings: vi.fn(),
}));

vi.mock('../../src/core/toml.js', () => ({
  readTomlFile: vi.fn(),
  writeTomlFile: vi.fn(),
}));

import { detectAll } from '../../src/core/detect.js';
import { readSettings } from '../../src/core/settings.js';
import { doctorCommand } from '../../src/commands/doctor.js';

const mockedDetectAll = vi.mocked(detectAll);
const mockedReadSettings = vi.mocked(readSettings);

describe('doctorCommand --json', () => {
  // 用类型断言 — process.stdout.write 重载让 vi.spyOn 的精确类型很难写
  let stdoutSpy: ReturnType<typeof vi.spyOn> & { mock: { calls: unknown[][] } };
  let stderrSpy: ReturnType<typeof vi.spyOn> & { mock: { calls: unknown[][] } };

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((() => true) as never) as never;
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((() => true) as never) as never;
    // 清干净 process.env 里可能 leak 的相关键，否则 runtime-env 扫描会
    // 受宿主机 ~/.zshrc 影响产出非确定性 findings。
    for (const k of [
      'ANTHROPIC_BASE_URL',
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_AUTH_TOKEN',
      'ANTHROPIC_MODEL',
      'ANTHROPIC_DEFAULT_HAIKU_MODEL',
      'ANTHROPIC_DEFAULT_SONNET_MODEL',
      'ANTHROPIC_DEFAULT_OPUS_MODEL',
      'ANTHROPIC_SMALL_FAST_MODEL',
      'ANTHROPIC_CUSTOM_MODEL_OPTION',
      'CLAUDE_CODE_SUBAGENT_MODEL',
    ]) {
      vi.stubEnv(k, '');
    }
    // 默认只装 clavue，避免触碰 codex 路径
    mockedDetectAll.mockReturnValue([
      { tool: 'clavue', cliInstalled: true, configExists: true },
      { tool: 'claude-code', cliInstalled: false, configExists: false },
      { tool: 'codex', cliInstalled: false, configExists: false },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('输出 schemaVersion=1 的合法 JSON，字段齐全（clean case，exit code 0）', async () => {
    mockedReadSettings.mockResolvedValue({
      env: { ANTHROPIC_BASE_URL: 'https://api.x.com', ANTHROPIC_AUTH_TOKEN: 't' },
    });

    await doctorCommand({ json: true });

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as Record<string, unknown>;

    expect(parsed.schemaVersion).toBe(1);
    expect(Array.isArray(parsed.targets)).toBe(true);
    const targets = parsed.targets as Array<Record<string, unknown>>;
    expect(targets).toHaveLength(1);
    expect(targets[0]!.tool).toBe('clavue');
    expect(targets[0]!.path).toBe('~/.clavue/settings.json');
    expect(targets[0]!.ok).toBe(true);
    expect(targets[0]!.findings).toEqual([]);

    expect(parsed.summary).toEqual({ errors: 0, warnings: 0, infos: 0, fixable: 0 });
    expect(process.exitCode).toBe(0);
  });

  it('有 warn 时 exit code = 1，findings 序列化含 fixable 字段', async () => {
    // duplicate-auth 是 warn 且不带 fix → fixable: false
    mockedReadSettings.mockResolvedValue({
      env: { ANTHROPIC_API_KEY: 'a', ANTHROPIC_AUTH_TOKEN: 'b', ANTHROPIC_BASE_URL: 'https://x.com' },
    });

    await doctorCommand({ json: true });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as { targets: Array<{ ok: boolean; findings: Array<{ rule: string; severity: string; fixable: boolean }> }>; summary: { warnings: number; errors: number } };

    const dup = parsed.targets[0]!.findings.find(f => f.rule === 'duplicate-auth');
    expect(dup).toBeDefined();
    expect(dup!.severity).toBe('warn');
    expect(typeof dup!.fixable).toBe('boolean');
    expect(parsed.targets[0]!.ok).toBe(false);
    expect(parsed.summary.warnings).toBeGreaterThanOrEqual(1);
    expect(parsed.summary.errors).toBe(0);
    expect(process.exitCode).toBe(1);
  });

  it('有 error 时 exit code = 2', async () => {
    // model-overrides-env：error，且有 fix
    mockedReadSettings.mockResolvedValue({
      model: 'sonnet',
      env: { ANTHROPIC_BASE_URL: 'https://x.com', ANTHROPIC_AUTH_TOKEN: 't', ANTHROPIC_MODEL: 'glm-4.6' },
    });

    await doctorCommand({ json: true });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as {
      targets: Array<{ ok: boolean; findings: Array<{ rule: string; severity: string; fixable: boolean }> }>;
      summary: { errors: number; fixable: number };
    };

    const err = parsed.targets[0]!.findings.find(f => f.rule === 'model-overrides-env');
    expect(err).toBeDefined();
    expect(err!.severity).toBe('error');
    expect(err!.fixable).toBe(true);
    expect(parsed.summary.errors).toBeGreaterThanOrEqual(1);
    expect(parsed.summary.fixable).toBeGreaterThanOrEqual(1);
    expect(process.exitCode).toBe(2);
  });

  it('--json --fix 互斥：报错退出 1', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((_code?: number) => {
      throw new Error(`__EXIT__${_code ?? 0}`);
    }) as never);

    await expect(doctorCommand({ json: true, fix: true })).rejects.toThrow('__EXIT__1');
    expect(stderrSpy).toHaveBeenCalled();
    // stdout 不应被污染
    expect(stdoutSpy).not.toHaveBeenCalled();

    exitSpy.mockRestore();
  });

  it('runtime: shell shadow 把 settings env 覆盖时 → 进 summary.warnings + 返回 exitCode 1', async () => {
    mockedReadSettings.mockResolvedValue({
      env: { ANTHROPIC_BASE_URL: 'https://file.com', ANTHROPIC_AUTH_TOKEN: 't' },
    });
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://shell-shadow.com');

    await doctorCommand({ json: true });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as {
      runtime: { findings: Array<{ rule: string; severity: string; message: string }> };
      summary: { warnings: number; errors: number };
    };
    expect(parsed.runtime).toBeDefined();
    expect(parsed.runtime.findings).toHaveLength(1);
    expect(parsed.runtime.findings[0]!.rule).toBe('shell-env-shadow');
    expect(parsed.runtime.findings[0]!.message).toContain('shell-shadow.com');
    expect(parsed.summary.warnings).toBeGreaterThanOrEqual(1);
    expect(process.exitCode).toBe(1);
  });

  it('runtime: 干净 shell + 干净 settings → runtime.findings 为空，exit 0', async () => {
    mockedReadSettings.mockResolvedValue({
      env: { ANTHROPIC_BASE_URL: 'https://api.x.com', ANTHROPIC_AUTH_TOKEN: 't' },
    });

    await doctorCommand({ json: true });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as {
      runtime: { findings: unknown[] };
      summary: { warnings: number; errors: number };
    };
    expect(parsed.runtime.findings).toEqual([]);
    expect(parsed.summary.warnings).toBe(0);
    expect(process.exitCode).toBe(0);
  });
});
