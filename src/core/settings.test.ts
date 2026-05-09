import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSettings, writeSettings } from './settings.js';

describe('settings', () => {
  it('readSettings 不存在返回 {}', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      expect(await readSettings(join(dir, 'nope.json'))).toEqual({});
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('readSettings 解析有效 JSON', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const f = join(dir, 's.json');
      writeFileSync(f, '{"env":{"X":"1"}}');
      expect(await readSettings(f)).toEqual({ env: { X: '1' } });
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writeSettings 备份原文件', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const f = join(dir, 's.json');
      writeFileSync(f, '{"old":1}');
      const backup = await writeSettings(f, { env: { Y: '2' } });
      expect(backup).toMatch(/\.bak-/);
      expect((await readSettings(f)).env?.Y).toBe('2');
      expect((await readSettings(backup)).old).toBe(1);
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writeSettings 损坏 JSON 抛错', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const f = join(dir, 's.json');
      writeFileSync(f, '{not json');
      await expect(readSettings(f)).rejects.toThrow(/JSON 损坏/);
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
