import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { afterEach, describe, expect, it } from 'vitest';
import { applyConfigPlan, createConfigPlan, createFileChange } from '../../src/config/change-plan';
import { restoreConfigSnapshot } from '../../src/config/snapshot-manager';

describe('config snapshot manager', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    delete process.env.CCJK_SNAPSHOTS_DIR;
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('restores changed files from a generated snapshot', () => {
    const root = mkdtempSync(join(tmpdir(), 'ccjk-snapshot-'));
    tempRoots.push(root);
    process.env.CCJK_SNAPSHOTS_DIR = join(root, 'snapshots');
    const settingsPath = join(root, 'settings.json');
    writeFileSync(settingsPath, '{"permissions":{"allow":[]}}');

    const plan = createConfigPlan({
      title: 'test plan',
      changes: [
        createFileChange({
          target: 'claude-code',
          file: settingsPath,
          operation: 'merge-json',
          risk: 'safe',
          reason: 'test restore',
          afterContent: '{"permissions":{"allow":["Read(*)"]}}',
        }),
      ],
    });

    const result = applyConfigPlan(plan);
    expect(readFileSync(settingsPath, 'utf-8')).toContain('Read(*)');

    const rollback = restoreConfigSnapshot(result.snapshotId!);
    expect(rollback.restored).toHaveLength(1);
    expect(readFileSync(settingsPath, 'utf-8')).toBe('{"permissions":{"allow":[]}}');
  });
});
