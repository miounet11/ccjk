/**
 * Version Compatibility - 版本兼容性检查
 * 检查 CCJK 与 Claude Code 版本的兼容性
 */

export interface CompatibilityResult {
  compatible: boolean;
  ccjkVersion: string;
  claudeCodeVersion: string;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

export interface VersionRange {
  min?: string;
  max?: string;
  exact?: string;
}

export interface CompatibilityRule {
  ccjkVersion: VersionRange;
  claudeCodeVersion: VersionRange;
  compatible: boolean;
  message: string;
}

/**
 * 版本兼容性检查器
 */
export class CompatibilityChecker {
  private rules: CompatibilityRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认兼容性规则
   */
  private initializeDefaultRules(): void {
    this.rules = [
      // CCJK 1.x 兼容 Claude Code 1.x
      {
        ccjkVersion: { min: '1.0.0', max: '2.0.0' },
        claudeCodeVersion: { min: '1.0.0', max: '3.0.0' },
        compatible: true,
        message: 'CCJK 1.x is compatible with Claude Code 1.x',
      },
      // 特定版本的已知问题
      {
        ccjkVersion: { exact: '1.0.0' },
        claudeCodeVersion: { min: '1.0.30' },
        compatible: false,
        message: 'CCJK 1.0.0 has known issues with Claude Code 1.0.30+, please upgrade CCJK',
      },
    ];
  }

  /**
   * 检查版本兼容性
   */
  check(ccjkVersion: string, claudeCodeVersion: string): CompatibilityResult {
    const result: CompatibilityResult = {
      compatible: true,
      ccjkVersion,
      claudeCodeVersion,
      warnings: [],
      errors: [],
      recommendations: [],
    };

    // 检查所有规则
    for (const rule of this.rules) {
      if (this.matchesRule(ccjkVersion, claudeCodeVersion, rule)) {
        if (!rule.compatible) {
          result.compatible = false;
          result.errors.push(rule.message);
        }
      }
    }

    // 版本差异检查
    const versionDiff = this.compareVersions(ccjkVersion, claudeCodeVersion);

    if (versionDiff.majorDiff > 0) {
      result.warnings.push(
        `CCJK version (${ccjkVersion}) is ahead of Claude Code (${claudeCodeVersion}). Some features may not work.`,
      );
    }
    else if (versionDiff.majorDiff < 0) {
      result.recommendations.push(
        `Consider upgrading CCJK to match Claude Code version ${claudeCodeVersion}`,
      );
    }

    // 检查是否是最新版本
    if (this.isOutdated(ccjkVersion)) {
      result.recommendations.push(
        'A newer version of CCJK is available. Run `ccjk upgrade` to update.',
      );
    }

    return result;
  }

  /**
   * 检查规则是否匹配
   */
  private matchesRule(
    ccjkVersion: string,
    claudeCodeVersion: string,
    rule: CompatibilityRule,
  ): boolean {
    return (
      this.matchesVersionRange(ccjkVersion, rule.ccjkVersion)
      && this.matchesVersionRange(claudeCodeVersion, rule.claudeCodeVersion)
    );
  }

  /**
   * 检查版本是否在范围内
   */
  private matchesVersionRange(version: string, range: VersionRange): boolean {
    if (range.exact) {
      return version === range.exact;
    }

    const v = this.parseVersion(version);

    if (range.min) {
      const min = this.parseVersion(range.min);
      if (this.compareVersionNumbers(v, min) < 0) {
        return false;
      }
    }

    if (range.max) {
      const max = this.parseVersion(range.max);
      if (this.compareVersionNumbers(v, max) >= 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * 解析版本号
   */
  private parseVersion(version: string): number[] {
    return version
      .replace(/^v/, '')
      .split('.')
      .map(n => Number.parseInt(n, 10) || 0);
  }

  /**
   * 比较版本号数组
   */
  private compareVersionNumbers(a: number[], b: number[]): number {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const av = a[i] || 0;
      const bv = b[i] || 0;
      if (av !== bv) {
        return av - bv;
      }
    }
    return 0;
  }

  /**
   * 比较两个版本
   */
  private compareVersions(
    ccjkVersion: string,
    claudeCodeVersion: string,
  ): { majorDiff: number; minorDiff: number; patchDiff: number } {
    const ccjk = this.parseVersion(ccjkVersion);
    const claude = this.parseVersion(claudeCodeVersion);

    return {
      majorDiff: (ccjk[0] || 0) - (claude[0] || 0),
      minorDiff: (ccjk[1] || 0) - (claude[1] || 0),
      patchDiff: (ccjk[2] || 0) - (claude[2] || 0),
    };
  }

  /**
   * 检查版本是否过时
   */
  private isOutdated(_version: string): boolean {
    // 这里可以连接到版本检查服务
    // 暂时返回 false
    return false;
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: CompatibilityRule): void {
    this.rules.push(rule);
  }

  /**
   * 获取兼容性报告
   */
  getReport(ccjkVersion: string, claudeCodeVersion: string): string {
    const result = this.check(ccjkVersion, claudeCodeVersion);
    const lines: string[] = [];

    lines.push('Version Compatibility Report');
    lines.push('============================');
    lines.push(`CCJK Version: ${result.ccjkVersion}`);
    lines.push(`Claude Code Version: ${result.claudeCodeVersion}`);
    lines.push(`Compatible: ${result.compatible ? '✓ Yes' : '✗ No'}`);
    lines.push('');

    if (result.errors.length > 0) {
      lines.push('Errors:');
      for (const error of result.errors) {
        lines.push(`  ✗ ${error}`);
      }
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('Warnings:');
      for (const warning of result.warnings) {
        lines.push(`  ⚠ ${warning}`);
      }
      lines.push('');
    }

    if (result.recommendations.length > 0) {
      lines.push('Recommendations:');
      for (const rec of result.recommendations) {
        lines.push(`  → ${rec}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

export default CompatibilityChecker;

// ============================================
// Convenience functions for index.ts exports
// ============================================

export interface CompatibilityReport {
  compatible: boolean;
  ccjkVersion: string;
  claudeCodeVersion: string;
  issues: string[];
  suggestions: string[];
}

export interface UpgradeRecommendation {
  shouldUpgrade: boolean;
  currentVersion: string;
  recommendedVersion: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

const defaultChecker = new CompatibilityChecker();

/**
 * Check if a version is stable (not pre-release)
 */
export function isStableVersion(version: string): boolean {
  return !version.includes('-') && !version.includes('alpha') && !version.includes('beta') && !version.includes('rc');
}

/**
 * Check if a version is supported
 */
export function isSupportedVersion(version: string): boolean {
  // Support versions 1.0.0 and above
  const parts = version.replace(/^v/, '').split('.');
  const major = Number.parseInt(parts[0] || '0', 10);
  return major >= 1;
}

/**
 * Generate a compatibility report
 */
export function generateCompatibilityReport(ccjkVersion: string, claudeCodeVersion: string): CompatibilityReport {
  const result = defaultChecker.check(ccjkVersion, claudeCodeVersion);
  return {
    compatible: result.compatible,
    ccjkVersion: result.ccjkVersion,
    claudeCodeVersion: result.claudeCodeVersion,
    issues: [...result.errors, ...result.warnings],
    suggestions: result.recommendations,
  };
}

/**
 * Format a compatibility report as string
 */
export function formatCompatibilityReport(report: CompatibilityReport): string {
  const lines: string[] = [];
  lines.push(`Compatibility: ${report.compatible ? '✓ Compatible' : '✗ Incompatible'}`);
  lines.push(`CCJK: ${report.ccjkVersion} | Claude Code: ${report.claudeCodeVersion}`);

  if (report.issues.length > 0) {
    lines.push('\nIssues:');
    for (const issue of report.issues) {
      lines.push(`  • ${issue}`);
    }
  }

  if (report.suggestions.length > 0) {
    lines.push('\nSuggestions:');
    for (const suggestion of report.suggestions) {
      lines.push(`  → ${suggestion}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate upgrade recommendation
 */
export function generateUpgradeRecommendation(
  currentVersion: string,
  latestVersion: string,
): UpgradeRecommendation {
  const current = currentVersion.replace(/^v/, '').split('.').map(n => Number.parseInt(n, 10) || 0);
  const latest = latestVersion.replace(/^v/, '').split('.').map(n => Number.parseInt(n, 10) || 0);

  const majorDiff = (latest[0] || 0) - (current[0] || 0);
  const minorDiff = (latest[1] || 0) - (current[1] || 0);
  const patchDiff = (latest[2] || 0) - (current[2] || 0);

  let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let reason = 'You are using the latest version';
  let shouldUpgrade = false;

  if (majorDiff > 0) {
    urgency = 'critical';
    reason = `Major version upgrade available (${currentVersion} → ${latestVersion}). May include breaking changes.`;
    shouldUpgrade = true;
  }
  else if (minorDiff > 0) {
    urgency = 'medium';
    reason = `Minor version upgrade available with new features (${currentVersion} → ${latestVersion})`;
    shouldUpgrade = true;
  }
  else if (patchDiff > 0) {
    urgency = 'low';
    reason = `Patch update available with bug fixes (${currentVersion} → ${latestVersion})`;
    shouldUpgrade = true;
  }

  return {
    shouldUpgrade,
    currentVersion,
    recommendedVersion: latestVersion,
    reason,
    urgency,
  };
}

/**
 * Format upgrade recommendation as string
 */
export function formatUpgradeRecommendation(rec: UpgradeRecommendation): string {
  if (!rec.shouldUpgrade) {
    return '✓ You are using the latest version';
  }

  const urgencyIcon = {
    low: 'ℹ️',
    medium: '⚠️',
    high: '🔶',
    critical: '🔴',
  }[rec.urgency];

  return `${urgencyIcon} ${rec.reason}\n  Run: ccjk upgrade`;
}

/**
 * Auto-adapt config based on version compatibility
 */
export function autoAdaptConfig(
  config: Record<string, unknown>,
  ccjkVersion: string,
  claudeCodeVersion: string,
): Record<string, unknown> {
  const report = generateCompatibilityReport(ccjkVersion, claudeCodeVersion);

  if (report.compatible) {
    return config;
  }

  // Apply automatic fixes for known incompatibilities
  const adaptedConfig = { ...config };

  // Example: disable features not supported in older versions
  if (!isSupportedVersion(claudeCodeVersion)) {
    adaptedConfig.experimentalFeatures = false;
  }

  return adaptedConfig;
}
