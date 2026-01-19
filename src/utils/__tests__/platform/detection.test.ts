/**
 * Platform Detection Tests
 */

import {
  getPlatform,
  getArchitecture,
  isMacOS,
  isLinux,
  isWindows,
  isUnix,
  getPlatformInfo,
  getLineEnding,
  getPathSeparator,
  getExecutableExtension,
  isCI,
} from '../detection';

describe('Platform Detection', () => {
  describe('getPlatform', () => {
    it('should return current platform', () => {
      const platform = getPlatform();
      expect(['darwin', 'linux', 'win32', 'unknown']).toContain(platform);
    });
  });

  describe('getArchitecture', () => {
    it('should return current architecture', () => {
      const arch = getArchitecture();
      expect(['x64', 'arm64', 'ia32', 'unknown']).toContain(arch);
    });
  });

  describe('platform checks', () => {
    it('should check platform correctly', () => {
      const platform = getPlatform();

      if (platform === 'darwin') {
        expect(isMacOS()).toBe(true);
        expect(isLinux()).toBe(false);
        expect(isWindows()).toBe(false);
        expect(isUnix()).toBe(true);
      } else if (platform === 'linux') {
        expect(isMacOS()).toBe(false);
        expect(isLinux()).toBe(true);
        expect(isWindows()).toBe(false);
        expect(isUnix()).toBe(true);
      } else if (platform === 'win32') {
        expect(isMacOS()).toBe(false);
        expect(isLinux()).toBe(false);
        expect(isWindows()).toBe(true);
        expect(isUnix()).toBe(false);
      }
    });
  });

  describe('getPlatformInfo', () => {
    it('should return comprehensive platform info', () => {
      const info = getPlatformInfo();

      expect(info).toHaveProperty('platform');
      expect(info).toHaveProperty('architecture');
      expect(info).toHaveProperty('release');
      expect(info).toHaveProperty('hostname');
      expect(info).toHaveProperty('homedir');
      expect(info).toHaveProperty('tmpdir');
      expect(info).toHaveProperty('cpus');
      expect(info).toHaveProperty('totalMemory');
      expect(info).toHaveProperty('freeMemory');

      expect(typeof info.cpus).toBe('number');
      expect(info.cpus).toBeGreaterThan(0);
      expect(typeof info.totalMemory).toBe('number');
      expect(info.totalMemory).toBeGreaterThan(0);
    });
  });

  describe('platform-specific values', () => {
    it('should return correct line ending', () => {
      const lineEnding = getLineEnding();
      expect(['\n', '\r\n']).toContain(lineEnding);
    });

    it('should return correct path separator', () => {
      const separator = getPathSeparator();
      expect(['/', '\\']).toContain(separator);
    });

    it('should return correct executable extension', () => {
      const ext = getExecutableExtension();
      expect(['', '.exe']).toContain(ext);
    });
  });

  describe('isCI', () => {
    it('should detect CI environment', () => {
      const originalCI = process.env.CI;

      process.env.CI = 'true';
      expect(isCI()).toBe(true);

      delete process.env.CI;
      expect(isCI()).toBe(false);

      if (originalCI !== undefined) {
        process.env.CI = originalCI;
      }
    });
  });
});
