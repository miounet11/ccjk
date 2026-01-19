/**
 * Platform Path Utilities
 * Provides utilities for working with platform-specific paths
 */

import * as path from 'path';
import * as os from 'os';
import { isWindows, isMacOS, isLinux } from './detection';

/**
 * Get user's home directory
 */
export function getHomeDir(): string {
  return os.homedir();
}

/**
 * Get user's config directory
 */
export function getConfigDir(appName?: string): string {
  const home = getHomeDir();

  if (isWindows()) {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    return appName ? path.join(appData, appName) : appData;
  }

  if (isMacOS()) {
    const configDir = path.join(home, 'Library', 'Application Support');
    return appName ? path.join(configDir, appName) : configDir;
  }

  // Linux and others
  const configDir = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
  return appName ? path.join(configDir, appName) : configDir;
}

/**
 * Get user's data directory
 */
export function getDataDir(appName?: string): string {
  const home = getHomeDir();

  if (isWindows()) {
    const localAppData =
      process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    return appName ? path.join(localAppData, appName) : localAppData;
  }

  if (isMacOS()) {
    const dataDir = path.join(home, 'Library', 'Application Support');
    return appName ? path.join(dataDir, appName) : dataDir;
  }

  // Linux and others
  const dataDir = process.env.XDG_DATA_HOME || path.join(home, '.local', 'share');
  return appName ? path.join(dataDir, appName) : dataDir;
}

/**
 * Get user's cache directory
 */
export function getCacheDir(appName?: string): string {
  const home = getHomeDir();

  if (isWindows()) {
    const temp = os.tmpdir();
    return appName ? path.join(temp, appName) : temp;
  }

  if (isMacOS()) {
    const cacheDir = path.join(home, 'Library', 'Caches');
    return appName ? path.join(cacheDir, appName) : cacheDir;
  }

  // Linux and others
  const cacheDir = process.env.XDG_CACHE_HOME || path.join(home, '.cache');
  return appName ? path.join(cacheDir, appName) : cacheDir;
}

/**
 * Get user's temporary directory
 */
export function getTempDir(appName?: string): string {
  const temp = os.tmpdir();
  return appName ? path.join(temp, appName) : temp;
}

/**
 * Get user's log directory
 */
export function getLogDir(appName?: string): string {
  const home = getHomeDir();

  if (isWindows()) {
    const localAppData =
      process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const logDir = path.join(localAppData, 'Logs');
    return appName ? path.join(logDir, appName) : logDir;
  }

  if (isMacOS()) {
    const logDir = path.join(home, 'Library', 'Logs');
    return appName ? path.join(logDir, appName) : logDir;
  }

  // Linux and others
  const logDir = path.join(home, '.local', 'log');
  return appName ? path.join(logDir, appName) : logDir;
}

/**
 * Normalize path for current platform
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

/**
 * Convert path to platform-specific format
 */
export function toPlatformPath(filePath: string): string {
  if (isWindows()) {
    return filePath.replace(/\//g, '\\');
  }
  return filePath.replace(/\\/g, '/');
}

/**
 * Convert path to Unix format (forward slashes)
 */
export function toUnixPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Convert path to Windows format (backslashes)
 */
export function toWindowsPath(filePath: string): string {
  return filePath.replace(/\//g, '\\');
}

/**
 * Expand tilde (~) in path
 */
export function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(getHomeDir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Get relative path from one path to another
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

/**
 * Check if path is absolute
 */
export function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

/**
 * Resolve path to absolute path
 */
export function resolvePath(...paths: string[]): string {
  return path.resolve(...paths);
}

/**
 * Join path segments
 */
export function joinPath(...paths: string[]): string {
  return path.join(...paths);
}

/**
 * Get directory name from path
 */
export function getDirName(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Get base name from path
 */
export function getBaseName(filePath: string, ext?: string): string {
  return path.basename(filePath, ext);
}

/**
 * Get file extension from path
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * Parse path into components
 */
export function parsePath(filePath: string): path.ParsedPath {
  return path.parse(filePath);
}

/**
 * Format path from components
 */
export function formatPath(pathObject: path.FormatInputPathObject): string {
  return path.format(pathObject);
}
