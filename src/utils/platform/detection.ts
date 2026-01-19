/**
 * Platform Detection Utilities
 * Provides utilities for detecting and working with different platforms
 */

import * as os from 'os';

export type Platform = 'darwin' | 'linux' | 'win32' | 'unknown';
export type Architecture = 'x64' | 'arm64' | 'ia32' | 'unknown';

/**
 * Get current platform
 */
export function getPlatform(): Platform {
  const platform = os.platform();
  if (platform === 'darwin' || platform === 'linux' || platform === 'win32') {
    return platform;
  }
  return 'unknown';
}

/**
 * Get current architecture
 */
export function getArchitecture(): Architecture {
  const arch = os.arch();
  if (arch === 'x64' || arch === 'arm64' || arch === 'ia32') {
    return arch;
  }
  return 'unknown';
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  return getPlatform() === 'darwin';
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return getPlatform() === 'linux';
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return getPlatform() === 'win32';
}

/**
 * Check if running on Unix-like system (macOS or Linux)
 */
export function isUnix(): boolean {
  return isMacOS() || isLinux();
}

/**
 * Get platform-specific information
 */
export interface PlatformInfo {
  platform: Platform;
  architecture: Architecture;
  release: string;
  hostname: string;
  homedir: string;
  tmpdir: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
}

/**
 * Get comprehensive platform information
 */
export function getPlatformInfo(): PlatformInfo {
  return {
    platform: getPlatform(),
    architecture: getArchitecture(),
    release: os.release(),
    hostname: os.hostname(),
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
  };
}

/**
 * Get platform-specific line ending
 */
export function getLineEnding(): string {
  return isWindows() ? '\r\n' : '\n';
}

/**
 * Get platform-specific path separator
 */
export function getPathSeparator(): string {
  return isWindows() ? '\\' : '/';
}

/**
 * Get platform-specific executable extension
 */
export function getExecutableExtension(): string {
  return isWindows() ? '.exe' : '';
}

/**
 * Get platform-specific shell
 */
export function getDefaultShell(): string {
  if (isWindows()) {
    return process.env.COMSPEC || 'cmd.exe';
  }
  return process.env.SHELL || '/bin/sh';
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.BUILD_NUMBER ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS
  );
}

/**
 * Check if running in Docker container
 */
export function isDocker(): boolean {
  try {
    const fs = require('fs');
    return (
      fs.existsSync('/.dockerenv') ||
      fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker')
    );
  } catch {
    return false;
  }
}

/**
 * Get environment type
 */
export type EnvironmentType = 'development' | 'production' | 'test' | 'ci';

export function getEnvironmentType(): EnvironmentType {
  if (process.env.NODE_ENV === 'test') return 'test';
  if (isCI()) return 'ci';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}
