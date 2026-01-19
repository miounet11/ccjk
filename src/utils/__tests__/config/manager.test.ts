/**
 * Config Manager Tests
 */

import { ConfigManager, createConfigManager } from '../manager';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigManager', () => {
  let tempDir: string;
  let configManager: ConfigManager<any>;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `test-config-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    configManager = new ConfigManager('test', {
      configDir: tempDir,
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('save and load', () => {
    it('should save and load configuration', async () => {
      const config = { key: 'value', number: 42 };
      await configManager.save(config);

      const loaded = await configManager.load();
      expect(loaded).toEqual(config);
    });

    it('should return null when config does not exist', async () => {
      const loaded = await configManager.load();
      expect(loaded).toBeNull();
    });

    it('should cache loaded configuration', async () => {
      const config = { key: 'value' };
      await configManager.save(config);
      await configManager.load();

      const cached = configManager.getCached();
      expect(cached).toEqual(config);
    });
  });

  describe('update', () => {
    it('should update existing configuration', async () => {
      const initial = { key1: 'value1', key2: 'value2' };
      await configManager.save(initial);

      const updated = await configManager.update({ key2: 'updated' });
      expect(updated).toEqual({ key1: 'value1', key2: 'updated' });
    });

    it('should create new configuration if none exists', async () => {
      const updated = await configManager.update({ key: 'value' });
      expect(updated).toEqual({ key: 'value' });
    });
  });

  describe('delete', () => {
    it('should delete configuration file', async () => {
      await configManager.save({ key: 'value' });
      expect(await configManager.exists()).toBe(true);

      await configManager.delete();
      expect(await configManager.exists()).toBe(false);
    });

    it('should not throw when deleting non-existent config', async () => {
      await expect(configManager.delete()).resolves.not.toThrow();
    });
  });

  describe('validation', () => {
    it('should validate configuration on save', async () => {
      const validator = (config: any) => config.required !== undefined;
      const manager = new ConfigManager('test', {
        configDir: tempDir,
        validate: validator,
      });

      await expect(manager.save({ optional: 'value' })).rejects.toThrow(
        'Configuration validation failed'
      );

      await expect(
        manager.save({ required: 'value' })
      ).resolves.not.toThrow();
    });
  });

  describe('createConfigManager', () => {
    it('should create a config manager instance', () => {
      const manager = createConfigManager('test');
      expect(manager).toBeInstanceOf(ConfigManager);
    });
  });
});
