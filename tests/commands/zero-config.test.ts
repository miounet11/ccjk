import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { parse } from 'smol-toml';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { zeroConfig } from '../../src/commands/zero-config';

// Mock dependencies
vi.mock('node:fs');
vi.mock('../../src/utils/fs-operations');
vi.mock('inquirer');
vi.mock('../../src/utils/ccjk-config', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils/ccjk-config')>('../../src/utils/ccjk-config');
  return {
    ...actual,
    readZcfConfig: vi.fn(() => ({ codeToolType: 'claude-code' })),
  };
});
vi.mock('../../src/utils/claude-family-core-features', () => ({
  ensureClaudeFamilyCoreFeatures: vi.fn(() => Promise.resolve([
    { feature: 'workflows', status: 'already-present', message: '1 workflow command(s) installed' },
    { feature: 'mcp', status: 'already-present', message: '1 MCP service(s) configured' },
    { feature: 'permissions', status: 'repaired', message: '10 permission rule(s) configured' },
    { feature: 'output-styles', status: 'already-present', message: '6 output style(s) installed' },
    { feature: 'native-goals', status: 'already-present', message: 'Clavue native /goal available' },
    { feature: 'ccr', status: 'already-present', message: 'CCR proxy package installed' },
  ])),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

describe('zero-config command', () => {
  const tempRoots: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    const tempRoot = mkdtempSync(join(tmpdir(), 'ccjk-zero-config-test-'));
    tempRoots.push(tempRoot);
    process.env.CCJK_SNAPSHOTS_DIR = join(tempRoot, 'snapshots');
    const { readZcfConfig } = await import('../../src/utils/ccjk-config');
    vi.mocked(readZcfConfig).mockReturnValue({ codeToolType: 'claude-code' } as any);
  });

  afterEach(() => {
    delete process.env.CCJK_SNAPSHOTS_DIR;
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('list presets', () => {
    it('should list all available presets', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await zeroConfig({ list: true });

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('max');
      expect(output).toContain('dev');
      expect(output).toContain('safe');

      consoleSpy.mockRestore();
    });
  });

  describe('apply preset', () => {
    it('should handle non-existent preset', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await zeroConfig({ preset: 'invalid' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorOutput = consoleErrorSpy.mock.calls[0][0];
      expect(errorOutput).toContain('not found');

      consoleErrorSpy.mockRestore();
    });

    it('should apply max preset', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        statusLine: {},
        permissions: { allow: [] },
      }));

      const { writeFileAtomic } = await import('../../src/utils/fs-operations');
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {});

      await zeroConfig({ preset: 'max', skipBackup: true });

      expect(writeFileSpy).toHaveBeenCalled();
      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string);
      expect(writtenContent.permissions.allow).toContain('Bash(npm *)');
      expect(writtenContent.permissions.allow).toContain('Bash(git *)');
      expect(writtenContent.permissions.allow).toContain('Read(*)');
    });

    it('should apply dev preset', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }));

      const { writeFileAtomic } = await import('../../src/utils/fs-operations');
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {});

      await zeroConfig({ preset: 'dev', skipBackup: true });

      expect(writeFileSpy).toHaveBeenCalled();
      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string);
      expect(writtenContent.permissions.allow).toContain('Bash(npm *)');
      expect(writtenContent.permissions.allow).toContain('Bash(git *)');
      expect(writtenContent.permissions.allow).not.toContain('Bash(docker *)');
    });

    it('writes Clavue presets to ~/.clavue/settings.json when Clavue is active', async () => {
      const { readZcfConfig } = await import('../../src/utils/ccjk-config');
      vi.mocked(readZcfConfig).mockReturnValue({ codeToolType: 'clavue' } as any);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }));

      const { writeFileAtomic } = await import('../../src/utils/fs-operations');
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {});

      await zeroConfig({ preset: 'dev', skipBackup: true });

      expect(writeFileSpy).toHaveBeenCalled();
      expect(String(writeFileSpy.mock.calls[0][0])).toContain('.clavue/settings.json');
      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string);
      expect(writtenContent.statusLine).toBeUndefined();
    });

    it('should apply safe preset', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }));

      const { writeFileAtomic } = await import('../../src/utils/fs-operations');
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {});

      await zeroConfig({ preset: 'safe', skipBackup: true });

      expect(writeFileSpy).toHaveBeenCalled();
      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string);
      expect(writtenContent.permissions.allow).toContain('Read(*)');
      expect(writtenContent.permissions.allow).not.toContain('Write(*)');
      expect(writtenContent.permissions.allow).not.toContain('Edit(*)');
    });

    it('should merge with existing permissions', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: {
          allow: ['mcp__custom-server__tool', 'Bash(git status:*)'],
        },
      }));

      const { writeFileAtomic } = await import('../../src/utils/fs-operations');
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {});

      await zeroConfig({ preset: 'dev', skipBackup: true });

      expect(writeFileSpy).toHaveBeenCalled();
      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string);
      expect(writtenContent.permissions.allow).toContain('mcp__custom-server__tool');
      expect(writtenContent.permissions.allow).toContain('Bash(git status:*)');
      expect(writtenContent.permissions.allow).toContain('Bash(npm *)');
    });

    it('should not overwrite existing model env values with preset placeholders', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        env: {
          ANTHROPIC_MODEL: 'gpt-5.5',
        },
        permissions: { allow: [] },
      }));

      const { writeFileAtomic } = await import('../../src/utils/fs-operations');
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {});

      await zeroConfig({ preset: 'dev', skipBackup: true });

      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string);
      expect(writtenContent.env.ANTHROPIC_MODEL).toBe('gpt-5.5');
    });

    it('should create backup by default', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }));

      const { writeFileAtomic, ensureDir } = await import('../../src/utils/fs-operations');
      const ensureDirSpy = vi.mocked(ensureDir).mockImplementation(() => {});
      vi.mocked(writeFileAtomic).mockImplementation(() => {});

      await zeroConfig({ preset: 'dev' });

      // Should create backup directory
      expect(ensureDirSpy).toHaveBeenCalled();
    });

    it('should preview the full plan in dry-run mode without writing files', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }));

      const { writeFileAtomic } = await import('../../src/utils/fs-operations');
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await zeroConfig({ preset: 'dev', dryRun: true });

      expect(writeFileSpy).not.toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(output).toContain('Configuration Plan');
      expect(output).toContain('Apply zero-config preset: Developer Preset');
      expect(output).toContain('merge-json');

      consoleSpy.mockRestore();
    });

    it('repairs core Claude-family features after applying a preset', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }));

      const { writeFileAtomic } = await import('../../src/utils/fs-operations');
      vi.mocked(writeFileAtomic).mockImplementation(() => {});
      const { ensureClaudeFamilyCoreFeatures } = await import('../../src/utils/claude-family-core-features');

      await zeroConfig({ preset: 'dev', skipBackup: true, codeTool: 'clavue', installCcr: false });

      expect(ensureClaudeFamilyCoreFeatures).toHaveBeenCalledWith({
        codeTool: 'clavue',
        configLang: 'en',
        installCcr: false,
      });
    });

    it('enables Codex native goals in the Codex TOML config when Codex is targeted', async () => {
      const { readZcfConfig } = await import('../../src/utils/ccjk-config');
      vi.mocked(readZcfConfig).mockReturnValue({ codeToolType: 'codex' } as any);
      mockExistsSync.mockImplementation((path: any) => String(path).includes('.codex/config.toml'));
      mockReadFileSync.mockImplementation((path: any) => {
        if (String(path).includes('.codex/config.toml')) {
          return 'model = "gpt-5.5"\n\n[features]\n# existing user comment\ngoals = false\n';
        }
        return '';
      });

      const { writeFileAtomic } = await import('../../src/utils/fs-operations');
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {});
      const { ensureClaudeFamilyCoreFeatures } = await import('../../src/utils/claude-family-core-features');

      await zeroConfig({ preset: 'dev', skipBackup: true, codeTool: 'codex' });

      const codexWrite = writeFileSpy.mock.calls.find(call => String(call[0]).includes('.codex/config.toml'));
      expect(codexWrite).toBeTruthy();
      const parsed = parse(String(codexWrite?.[1])) as any;
      expect(parsed.features.goals).toBe(true);
      expect(String(codexWrite?.[1])).toContain('# existing user comment');
      expect(ensureClaudeFamilyCoreFeatures).not.toHaveBeenCalled();
    });
  });

  describe('permission validation', () => {
    it('should not include dangerous bash patterns', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }));

      const { writeFileAtomic } = await import('../../src/utils/fs-operations');
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {});

      await zeroConfig({ preset: 'max', skipBackup: true });

      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string);
      expect(writtenContent.permissions.allow).not.toContain('Bash(rm *)');
      expect(writtenContent.permissions.allow).not.toContain('Bash(sudo *)');
      expect(writtenContent.permissions.allow).not.toContain('Bash(passwd *)');
    });

    it('should include all file operation permissions in max preset', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }));

      const { writeFileAtomic } = await import('../../src/utils/fs-operations');
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {});

      await zeroConfig({ preset: 'max', skipBackup: true });

      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string);
      expect(writtenContent.permissions.allow).toContain('Read(*)');
      expect(writtenContent.permissions.allow).toContain('Edit(*)');
      expect(writtenContent.permissions.allow).toContain('Write(*)');
      expect(writtenContent.permissions.allow).toContain('NotebookEdit(*)');
    });
  });
});
