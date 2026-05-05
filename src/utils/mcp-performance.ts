/**
 * MCP Performance Utilities
 * Tools for checking and warning about MCP service performance impact
 */

import type { McpTier } from '../config/mcp-tiers';
import { getMcpTierConfig, MCP_PERFORMANCE_THRESHOLDS, MCP_SERVICE_TIERS } from '../config/mcp-tiers';

/**
 * Performance warning levels
 */
export type PerformanceWarningLevel = 'info' | 'warning' | 'critical';

/**
 * Performance warning result
 */
export interface PerformanceWarning {
  level: PerformanceWarningLevel;
  message: string;
  messageZh: string;
  suggestion: string;
  suggestionZh: string;
  serviceCount: number;
  estimatedMemory: number;
  estimatedCpu: number;
}

/**
 * Service analysis result
 */
export interface ServiceAnalysis {
  serviceId: string;
  tier: McpTier;
  autoStart: boolean;
  idleTimeout?: number;
  recommendation?: string;
  recommendationZh?: string;
}

/**
 * Check MCP performance based on service count
 */
export function checkMcpPerformance(serviceCount: number): PerformanceWarning | null {
  const { warningCount, criticalCount, estimatedMemoryPerService, estimatedCpuPerService } = MCP_PERFORMANCE_THRESHOLDS;

  const estimatedMemory = serviceCount * estimatedMemoryPerService;
  const estimatedCpu = serviceCount * estimatedCpuPerService;

  if (serviceCount >= criticalCount) {
    return {
      level: 'critical',
      message: `⚠️ ${serviceCount} MCP services configured - may cause severe performance issues`,
      messageZh: `⚠️ 已配置 ${serviceCount} 个 MCP 服务，可能导致严重性能问题`,
      suggestion: 'Use `ccjk mcp profile use minimal` to switch to minimal mode',
      suggestionZh: '建议使用 `ccjk mcp profile use minimal` 切换到极简模式',
      serviceCount,
      estimatedMemory,
      estimatedCpu,
    };
  }

  if (serviceCount >= warningCount) {
    return {
      level: 'warning',
      message: `⚡ ${serviceCount} MCP services configured - may affect response speed`,
      messageZh: `⚡ 已配置 ${serviceCount} 个 MCP 服务，可能影响响应速度`,
      suggestion: 'Consider disabling unused services or use `ccjk mcp profile` to manage',
      suggestionZh: '建议禁用不常用的服务，或使用 `ccjk mcp profile` 管理',
      serviceCount,
      estimatedMemory,
      estimatedCpu,
    };
  }

  return null;
}

/**
 * Analyze services and provide recommendations
 */
export function analyzeServices(serviceIds: string[]): ServiceAnalysis[] {
  return serviceIds.map((serviceId) => {
    const tierConfig = getMcpTierConfig(serviceId);
    const tier = MCP_SERVICE_TIERS[serviceId] || 'ondemand';

    const analysis: ServiceAnalysis = {
      serviceId,
      tier,
      autoStart: tierConfig.autoStart,
      idleTimeout: tierConfig.idleTimeout,
    };

    // Add recommendations for non-core services
    if (tier !== 'core') {
      analysis.recommendation = `Consider using on-demand loading for ${serviceId}`;
      analysis.recommendationZh = `建议对 ${serviceId} 使用按需加载`;
    }

    return analysis;
  });
}

/**
 * Get optimization suggestions based on current services
 */
export function getOptimizationSuggestions(serviceIds: string[]): string[] {
  const suggestions: string[] = [];
  const analysis = analyzeServices(serviceIds);

  // Count services by tier
  const tierCounts = {
    core: 0,
    ondemand: 0,
    scenario: 0,
  };

  for (const a of analysis) {
    tierCounts[a.tier]++;
  }

  // Suggestion: Too many scenario services
  if (tierCounts.scenario > 2) {
    suggestions.push('Consider disabling some scenario-specific services when not needed');
  }

  // Suggestion: Browser automation services
  const hasBothBrowserServices = serviceIds.includes('Playwright') && serviceIds.includes('puppeteer');
  if (hasBothBrowserServices) {
    suggestions.push('Both Playwright and Puppeteer are enabled - consider using only one');
  }

  // Suggestion: High total count
  if (serviceIds.length > MCP_PERFORMANCE_THRESHOLDS.maxRecommended) {
    suggestions.push(`You have ${serviceIds.length} services. Recommended maximum is ${MCP_PERFORMANCE_THRESHOLDS.maxRecommended}`);
  }

  // Suggestion: No core services
  if (tierCounts.core === 0) {
    suggestions.push('Consider enabling core services (context7, open-websearch) for better experience');
  }

  return suggestions;
}

/**
 * Calculate estimated resource usage
 */
export function calculateResourceUsage(serviceCount: number): {
  memory: { value: number; unit: string };
  cpu: { value: number; unit: string };
  rating: 'low' | 'medium' | 'high' | 'critical';
} {
  const { estimatedMemoryPerService, estimatedCpuPerService, warningCount, criticalCount } = MCP_PERFORMANCE_THRESHOLDS;

  const memory = serviceCount * estimatedMemoryPerService;
  const cpu = serviceCount * estimatedCpuPerService;

  let rating: 'low' | 'medium' | 'high' | 'critical';
  if (serviceCount >= criticalCount) {
    rating = 'critical';
  }
  else if (serviceCount >= warningCount) {
    rating = 'high';
  }
  else if (serviceCount >= 3) {
    rating = 'medium';
  }
  else {
    rating = 'low';
  }

  return {
    memory: { value: memory, unit: 'MB' },
    cpu: { value: cpu, unit: '%' },
    rating,
  };
}

/**
 * Format performance warning for display
 */
export function formatPerformanceWarning(warning: PerformanceWarning, lang: 'en' | 'zh-CN' = 'en'): string {
  const message = lang === 'zh-CN' ? warning.messageZh : warning.message;
  const suggestion = lang === 'zh-CN' ? warning.suggestionZh : warning.suggestion;

  const lines = [
    message,
    '',
    `  ${lang === 'zh-CN' ? '预估内存' : 'Est. Memory'}: ~${warning.estimatedMemory}MB`,
    `  ${lang === 'zh-CN' ? '预估CPU' : 'Est. CPU'}: ~${warning.estimatedCpu}%`,
    '',
    `💡 ${suggestion}`,
  ];

  return lines.join('\n');
}

/**
 * Check if adding a service would exceed thresholds
 */
export function wouldExceedThreshold(currentCount: number, addCount: number = 1): {
  wouldExceed: boolean;
  newLevel: PerformanceWarningLevel | null;
  currentLevel: PerformanceWarningLevel | null;
} {
  const { warningCount, criticalCount } = MCP_PERFORMANCE_THRESHOLDS;

  const currentLevel = currentCount >= criticalCount
    ? 'critical'
    : currentCount >= warningCount
      ? 'warning'
      : null;

  const newCount = currentCount + addCount;
  const newLevel = newCount >= criticalCount
    ? 'critical'
    : newCount >= warningCount
      ? 'warning'
      : null;

  return {
    wouldExceed: newLevel !== null && (currentLevel === null || newLevel !== currentLevel),
    newLevel,
    currentLevel,
  };
}
