/**
 * Unified version checker
 * Handles version checking with smart caching and batch operations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import {
  VersionInfo,
  VersionCheckOptions,
  BatchCheckResult,
  IVersionSource,
  VersionComparison,
} from './types';
import { VersionCache } from './cache';

const execAsync = promisify(exec);

/**
 * Version checker with smart caching
 */
export class VersionChecker implements IVersionSource {
  private cache: VersionCache;
  private checkInProgress: Map<string, Promise<VersionInfo>>;
  private stats = {
    totalChecks: 0,
    networkRequests: 0,
    cacheHits: 0,
    failedChecks: 0,
    totalCheckTime: 0,
  };

  constructor(cache?: VersionCache) {
    this.cache = cache || new VersionCache();
    this.checkInProgress = new Map();
  }

  /**
   * Check version for a tool
   */
  async checkVersion(
    tool: string,
    options: VersionCheckOptions = {}
  ): Promise<VersionInfo> {
    const startTime = Date.now();
    this.stats.totalChecks++;

    try {
      // Check cache first unless force is true
      if (!options.force) {
        const cached = this.cache.get(tool);
        if (cached) {
          this.stats.cacheHits++;
          return cached;
        }
      }

      // Check if already checking this tool
      const inProgress = this.checkInProgress.get(tool);
      if (inProgress) {
        return await inProgress;
      }

      // Start new check
      const checkPromise = this.performCheck(tool, options);
      this.checkInProgress.set(tool, checkPromise);

      try {
        const result = await checkPromise;

        // Cache the result
        const ttl = options.cacheTtl || 3600000; // 1 hour default
        this.cache.set(tool, result, ttl);

        return result;
      } finally {
        this.checkInProgress.delete(tool);
        this.stats.totalCheckTime += Date.now() - startTime;
      }
    } catch (error) {
      this.stats.failedChecks++;
      throw error;
    }
  }

  /**
   * Perform actual version check
   */
  private async performCheck(
    tool: string,
    options: VersionCheckOptions
  ): Promise<VersionInfo> {
    this.stats.networkRequests++;

    const [installed, currentVersion, latestVersion] = await Promise.all([
      this.isInstalled(tool),
      this.getCurrentVersion(tool),
      this.getLatestVersion(tool, options),
    ]);

    const updateAvailable =
      installed &&
      currentVersion !== undefined &&
      this.compareVersions(latestVersion, currentVersion) === 'greater';

    const versionInfo: VersionInfo = {
      tool,
      currentVersion,
      latestVersion,
      updateAvailable,
      lastChecked: new Date(),
      installed,
      releaseNotesUrl: await this.getReleaseNotesUrl(tool, latestVersion),
      downloadUrl: await this.getDownloadUrl(tool, latestVersion),
    };

    return versionInfo;
  }

  /**
   * Batch check multiple tools
   */
  async batchCheck(
    tools: string[],
    options: VersionCheckOptions = {}
  ): Promise<BatchCheckResult> {
    const startTime = Date.now();
    const results = new Map<string, VersionInfo>();
    const errors = new Map<string, Error>();
    let cacheHits = 0;
    let networkRequests = 0;

    // Check cache first for all tools
    const uncachedTools: string[] = [];
    for (const tool of tools) {
      if (!options.force) {
        const cached = this.cache.get(tool);
        if (cached) {
          results.set(tool, cached);
          cacheHits++;
          continue;
        }
      }
      uncachedTools.push(tool);
    }

    // Check uncached tools in parallel
    const checkPromises = uncachedTools.map(async (tool) => {
      try {
        const result = await this.checkVersion(tool, options);
        results.set(tool, result);
        networkRequests++;
      } catch (error) {
        errors.set(tool, error as Error);
      }
    });

    await Promise.allSettled(checkPromises);

    const duration = Date.now() - startTime;

    return {
      tools,
      results,
      errors,
      duration,
      cacheHits,
      networkRequests,
    };
  }

  /**
   * Get latest version from registry/source
   */
  async getLatestVersion(
    tool: string,
    options: VersionCheckOptions = {}
  ): Promise<string> {
    const timeout = options.timeout || 10000;

    try {
      // Try npm registry first
      const command = `npm view ${tool} version`;
      const { stdout } = await this.execWithTimeout(command, timeout);
      return stdout.trim();
    } catch (error) {
      // Fallback to tool-specific version command
      return await this.getToolSpecificVersion(tool);
    }
  }

  /**
   * Get current installed version
   */
  async getCurrentVersion(tool: string): Promise<string | undefined> {
    try {
      const command = this.getVersionCommand(tool);
      const { stdout, stderr } = await execAsync(command);
      const output = stdout || stderr;
      return this.parseVersion(output);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Check if tool is installed
   */
  async isInstalled(tool: string): Promise<boolean> {
    try {
      const command = `which ${tool}`;
      await execAsync(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get release notes URL
   */
  async getReleaseNotesUrl(
    tool: string,
    version: string
  ): Promise<string | undefined> {
    // Common patterns for release notes
    const patterns = [
      `https://github.com/${tool}/${tool}/releases/tag/v${version}`,
      `https://github.com/${tool}/${tool}/releases/tag/${version}`,
      `https://www.npmjs.com/package/${tool}/v/${version}`,
    ];

    // Return first pattern (could be enhanced to check availability)
    return patterns[0];
  }

  /**
   * Get download URL
   */
  async getDownloadUrl(
    tool: string,
    version: string
  ): Promise<string | undefined> {
    return `https://registry.npmjs.org/${tool}/-/${tool}-${version}.tgz`;
  }

  /**
   * Compare two version strings
   */
  compareVersions(v1: string, v2: string): VersionComparison {
    try {
      const parts1 = v1.split('.').map(Number);
      const parts2 = v2.split('.').map(Number);

      for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 'greater';
        if (num1 < num2) return 'less';
      }

      return 'equal';
    } catch (error) {
      return 'invalid';
    }
  }

  /**
   * Get version command for specific tool
   */
  private getVersionCommand(tool: string): string {
    // Common version command patterns
    const commands: Record<string, string> = {
      'claude-code': 'claude --version',
      aider: 'aider --version',
      cursor: 'cursor --version',
      cline: 'cline --version',
      continue: 'continue --version',
      codex: 'codex --version',
      node: 'node --version',
      npm: 'npm --version',
      git: 'git --version',
    };

    return commands[tool] || `${tool} --version`;
  }

  /**
   * Get tool-specific version from alternative sources
   */
  private async getToolSpecificVersion(tool: string): Promise<string> {
    // Tool-specific version retrieval logic
    // This could be enhanced with GitHub API, etc.
    throw new Error(`Unable to get latest version for ${tool}`);
  }

  /**
   * Parse version from command output
   */
  private parseVersion(output: string): string | undefined {
    const patterns = [
      /version\s+(\d+\.\d+\.\d+)/i,
      /v?(\d+\.\d+\.\d+)/,
      /(\d+\.\d+\.\d+)/,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Execute command with timeout
   */
  private async execWithTimeout(
    command: string,
    timeout: number
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timeout: ${command}`));
      }, timeout);

      execAsync(command)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Get checker statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageCheckTime:
        this.stats.totalChecks > 0
          ? this.stats.totalCheckTime / this.stats.totalChecks
          : 0,
      cacheStats: this.cache.getStats(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalChecks: 0,
      networkRequests: 0,
      cacheHits: 0,
      failedChecks: 0,
      totalCheckTime: 0,
    };
  }

  /**
   * Get cache instance
   */
  getCache(): VersionCache {
    return this.cache;
  }

  /**
   * Invalidate cache for a tool
   */
  invalidateCache(tool: string): void {
    this.cache.invalidate(tool);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }
}
