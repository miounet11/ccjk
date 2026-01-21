const MCP_TIER_DEFAULTS = {
  core: {
    tier: "core",
    autoStart: true,
    idleTimeout: void 0,
    // Never timeout
    description: "Essential services, always available"
  },
  ondemand: {
    tier: "ondemand",
    autoStart: false,
    idleTimeout: 300,
    // 5 minutes
    description: "Loaded when needed, auto-released after idle"
  },
  scenario: {
    tier: "scenario",
    autoStart: false,
    idleTimeout: 600,
    // 10 minutes
    description: "Loaded for specific scenarios"
  }
};
const MCP_SERVICE_TIERS = {
  // Core services - high frequency, essential
  "context7": "core",
  "open-websearch": "core",
  // On-demand services - medium frequency
  "mcp-deepwiki": "ondemand",
  "Playwright": "ondemand",
  // Removed: puppeteer (duplicate of Playwright), filesystem (buggy),
  //          memory (Claude built-in), sequential-thinking (limited value), fetch (Claude WebFetch)
  // Scenario services - low frequency, specific use cases
  "sqlite": "scenario",
  "spec-workflow": "scenario",
  "serena": "scenario"
};
function getMcpTierConfig(serviceId) {
  const tier = MCP_SERVICE_TIERS[serviceId] || "ondemand";
  return MCP_TIER_DEFAULTS[tier];
}
function getServicesByTier(tier) {
  return Object.entries(MCP_SERVICE_TIERS).filter(([_, t]) => t === tier).map(([id]) => id);
}
function isCoreService(serviceId) {
  return MCP_SERVICE_TIERS[serviceId] === "core";
}
const MCP_PERFORMANCE_THRESHOLDS = {
  /** Warning threshold for number of services */
  warningCount: 5,
  /** Critical threshold for number of services */
  criticalCount: 8,
  /** Maximum recommended services */
  maxRecommended: 6,
  /** Estimated memory per service (MB) */
  estimatedMemoryPerService: 50,
  /** Estimated CPU overhead per service (%) */
  estimatedCpuPerService: 5
};

const mcpTiers = {
  __proto__: null,
  MCP_PERFORMANCE_THRESHOLDS: MCP_PERFORMANCE_THRESHOLDS,
  MCP_SERVICE_TIERS: MCP_SERVICE_TIERS,
  MCP_TIER_DEFAULTS: MCP_TIER_DEFAULTS,
  getMcpTierConfig: getMcpTierConfig,
  getServicesByTier: getServicesByTier,
  isCoreService: isCoreService
};

function checkMcpPerformance(serviceCount) {
  const { warningCount, criticalCount, estimatedMemoryPerService, estimatedCpuPerService } = MCP_PERFORMANCE_THRESHOLDS;
  const estimatedMemory = serviceCount * estimatedMemoryPerService;
  const estimatedCpu = serviceCount * estimatedCpuPerService;
  if (serviceCount >= criticalCount) {
    return {
      level: "critical",
      message: `\u26A0\uFE0F ${serviceCount} MCP services configured - may cause severe performance issues`,
      messageZh: `\u26A0\uFE0F \u5DF2\u914D\u7F6E ${serviceCount} \u4E2A MCP \u670D\u52A1\uFF0C\u53EF\u80FD\u5BFC\u81F4\u4E25\u91CD\u6027\u80FD\u95EE\u9898`,
      suggestion: "Use `ccjk mcp profile use minimal` to switch to minimal mode",
      suggestionZh: "\u5EFA\u8BAE\u4F7F\u7528 `ccjk mcp profile use minimal` \u5207\u6362\u5230\u6781\u7B80\u6A21\u5F0F",
      serviceCount,
      estimatedMemory,
      estimatedCpu
    };
  }
  if (serviceCount >= warningCount) {
    return {
      level: "warning",
      message: `\u26A1 ${serviceCount} MCP services configured - may affect response speed`,
      messageZh: `\u26A1 \u5DF2\u914D\u7F6E ${serviceCount} \u4E2A MCP \u670D\u52A1\uFF0C\u53EF\u80FD\u5F71\u54CD\u54CD\u5E94\u901F\u5EA6`,
      suggestion: "Consider disabling unused services or use `ccjk mcp profile` to manage",
      suggestionZh: "\u5EFA\u8BAE\u7981\u7528\u4E0D\u5E38\u7528\u7684\u670D\u52A1\uFF0C\u6216\u4F7F\u7528 `ccjk mcp profile` \u7BA1\u7406",
      serviceCount,
      estimatedMemory,
      estimatedCpu
    };
  }
  return null;
}
function analyzeServices(serviceIds) {
  return serviceIds.map((serviceId) => {
    const tierConfig = getMcpTierConfig(serviceId);
    const tier = MCP_SERVICE_TIERS[serviceId] || "ondemand";
    const analysis = {
      serviceId,
      tier,
      autoStart: tierConfig.autoStart,
      idleTimeout: tierConfig.idleTimeout
    };
    if (tier !== "core") {
      analysis.recommendation = `Consider using on-demand loading for ${serviceId}`;
      analysis.recommendationZh = `\u5EFA\u8BAE\u5BF9 ${serviceId} \u4F7F\u7528\u6309\u9700\u52A0\u8F7D`;
    }
    return analysis;
  });
}
function getOptimizationSuggestions(serviceIds) {
  const suggestions = [];
  const analysis = analyzeServices(serviceIds);
  const tierCounts = {
    core: 0,
    ondemand: 0,
    scenario: 0
  };
  for (const a of analysis) {
    tierCounts[a.tier]++;
  }
  if (tierCounts.scenario > 2) {
    suggestions.push("Consider disabling some scenario-specific services when not needed");
  }
  const hasBothBrowserServices = serviceIds.includes("Playwright") && serviceIds.includes("puppeteer");
  if (hasBothBrowserServices) {
    suggestions.push("Both Playwright and Puppeteer are enabled - consider using only one");
  }
  if (serviceIds.length > MCP_PERFORMANCE_THRESHOLDS.maxRecommended) {
    suggestions.push(`You have ${serviceIds.length} services. Recommended maximum is ${MCP_PERFORMANCE_THRESHOLDS.maxRecommended}`);
  }
  if (tierCounts.core === 0) {
    suggestions.push("Consider enabling core services (context7, open-websearch) for better experience");
  }
  return suggestions;
}
function calculateResourceUsage(serviceCount) {
  const { estimatedMemoryPerService, estimatedCpuPerService, warningCount, criticalCount } = MCP_PERFORMANCE_THRESHOLDS;
  const memory = serviceCount * estimatedMemoryPerService;
  const cpu = serviceCount * estimatedCpuPerService;
  let rating;
  if (serviceCount >= criticalCount) {
    rating = "critical";
  } else if (serviceCount >= warningCount) {
    rating = "high";
  } else if (serviceCount >= 3) {
    rating = "medium";
  } else {
    rating = "low";
  }
  return {
    memory: { value: memory, unit: "MB" },
    cpu: { value: cpu, unit: "%" },
    rating
  };
}
function formatPerformanceWarning(warning, lang = "en") {
  const message = lang === "zh-CN" ? warning.messageZh : warning.message;
  const suggestion = lang === "zh-CN" ? warning.suggestionZh : warning.suggestion;
  const lines = [
    message,
    "",
    `  ${lang === "zh-CN" ? "\u9884\u4F30\u5185\u5B58" : "Est. Memory"}: ~${warning.estimatedMemory}MB`,
    `  ${lang === "zh-CN" ? "\u9884\u4F30CPU" : "Est. CPU"}: ~${warning.estimatedCpu}%`,
    "",
    `\u{1F4A1} ${suggestion}`
  ];
  return lines.join("\n");
}

const mcpPerformance = {
  __proto__: null,
  analyzeServices: analyzeServices,
  calculateResourceUsage: calculateResourceUsage,
  checkMcpPerformance: checkMcpPerformance,
  formatPerformanceWarning: formatPerformanceWarning,
  getOptimizationSuggestions: getOptimizationSuggestions
};

export { MCP_SERVICE_TIERS as M, calculateResourceUsage as a, getOptimizationSuggestions as b, checkMcpPerformance as c, getMcpTierConfig as d, mcpPerformance as e, formatPerformanceWarning as f, getServicesByTier as g, isCoreService as i, mcpTiers as m };
