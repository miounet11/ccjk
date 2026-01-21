import ansis from 'ansis';
import { i18n } from './index.mjs';
import 'node:child_process';
import 'node:process';
import { M as MCP_SERVICE_TIERS, i as isCoreService, g as getServicesByTier, c as checkMcpPerformance, f as formatPerformanceWarning, a as calculateResourceUsage, b as getOptimizationSuggestions, d as getMcpTierConfig } from './mcp-performance.mjs';
import { r as readMcpConfig, b as backupMcpConfig, w as writeMcpConfig } from './claude-config.mjs';
export { m as mcpInstall, a as mcpList, b as mcpSearch, c as mcpUninstall } from '../shared/ccjk.DzcJpOoy.mjs';
import { M as MCP_SERVICE_CONFIGS } from './codex.mjs';
import 'node:fs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';
import './constants.mjs';
import 'node:os';
import './json-config.mjs';
import 'dayjs';
import './fs-operations.mjs';
import 'node:crypto';
import 'node:fs/promises';
import './platform.mjs';
import 'tinyexec';
import 'inquirer';
import 'ora';
import 'semver';
import 'smol-toml';
import './ccjk-config.mjs';
import './config2.mjs';
import '../shared/ccjk.BFQ7yr5S.mjs';
import './prompts.mjs';
import './package.mjs';
import '../shared/ccjk.DHbrGcgg.mjs';
import 'inquirer-toggle';

function getReleasableServices(configuredServices, tier) {
  return configuredServices.filter((serviceId) => {
    if (isCoreService(serviceId)) {
      return false;
    }
    const serviceTier = MCP_SERVICE_TIERS[serviceId] || "ondemand";
    if (tier === "all") {
      return true;
    }
    if (tier) {
      return serviceTier === tier;
    }
    return serviceTier === "ondemand" || serviceTier === "scenario";
  });
}
async function releaseServices(servicesToRelease, options = {}) {
  const result = {
    success: true,
    releasedServices: [],
    skippedServices: [],
    errors: []
  };
  if (servicesToRelease.length === 0) {
    return result;
  }
  const config = readMcpConfig();
  if (!config?.mcpServers) {
    result.errors.push("No MCP configuration found");
    result.success = false;
    return result;
  }
  if (!options.dryRun) {
    backupMcpConfig();
  }
  const newServers = { ...config.mcpServers };
  for (const serviceId of servicesToRelease) {
    if (isCoreService(serviceId) && !options.force) {
      result.skippedServices.push(serviceId);
      continue;
    }
    if (!newServers[serviceId]) {
      result.skippedServices.push(serviceId);
      continue;
    }
    if (!options.dryRun) {
      delete newServers[serviceId];
    }
    result.releasedServices.push(serviceId);
  }
  if (!options.dryRun && result.releasedServices.length > 0) {
    try {
      writeMcpConfig({ ...config, mcpServers: newServers });
    } catch (error) {
      result.errors.push(`Failed to write config: ${error}`);
      result.success = false;
    }
  }
  return result;
}
async function mcpRelease(options = {}) {
  const lang = options.lang || i18n.language || "en";
  const isZh = lang === "zh-CN";
  console.log("");
  console.log(ansis.bold.cyan(isZh ? "\u{1F9F9} MCP \u670D\u52A1\u91CA\u653E" : "\u{1F9F9} MCP Service Release"));
  console.log(ansis.dim("\u2500".repeat(50)));
  console.log("");
  const config = readMcpConfig();
  const configuredServices = config?.mcpServers ? Object.keys(config.mcpServers) : [];
  if (configuredServices.length === 0) {
    console.log(ansis.yellow(isZh ? "\u6CA1\u6709\u914D\u7F6E\u4EFB\u4F55 MCP \u670D\u52A1" : "No MCP services configured"));
    return;
  }
  let servicesToRelease;
  if (options.service) {
    servicesToRelease = [options.service];
  } else if (options.tier) {
    servicesToRelease = getReleasableServices(configuredServices, options.tier);
  } else {
    servicesToRelease = getReleasableServices(configuredServices, "all");
  }
  if (servicesToRelease.length === 0) {
    console.log(ansis.green(isZh ? "\u2714 \u6CA1\u6709\u53EF\u91CA\u653E\u7684\u670D\u52A1" : "\u2714 No services to release"));
    return;
  }
  console.log(isZh ? "\u5C06\u91CA\u653E\u4EE5\u4E0B\u670D\u52A1:" : "Services to release:");
  for (const serviceId of servicesToRelease) {
    const tier = MCP_SERVICE_TIERS[serviceId] || "ondemand";
    console.log(`  ${ansis.yellow("\u2022")} ${serviceId} ${ansis.dim(`[${tier}]`)}`);
  }
  console.log("");
  if (options.dryRun) {
    console.log(ansis.green(isZh ? "(\u6A21\u62DF\u8FD0\u884C - \u4E0D\u4F1A\u5B9E\u9645\u4FEE\u6539\u914D\u7F6E)" : "(Dry run - no changes will be made)"));
    return;
  }
  const result = await releaseServices(servicesToRelease, options);
  if (result.success) {
    console.log(ansis.green(`\u2714 ${isZh ? "\u5DF2\u91CA\u653E" : "Released"} ${result.releasedServices.length} ${isZh ? "\u4E2A\u670D\u52A1" : "services"}`));
    if (result.skippedServices.length > 0) {
      console.log(ansis.yellow(`${isZh ? "\u8DF3\u8FC7" : "Skipped"}: ${result.skippedServices.join(", ")}`));
    }
    const remaining = configuredServices.filter((s) => !result.releasedServices.includes(s));
    console.log("");
    console.log(ansis.dim(`${isZh ? "\u5269\u4F59\u670D\u52A1" : "Remaining services"}: ${remaining.length}`));
    if (remaining.length > 0) {
      console.log(ansis.dim(`  ${remaining.join(", ")}`));
    }
    console.log("");
    console.log(ansis.yellow(isZh ? "\u26A0\uFE0F \u8BF7\u91CD\u542F Claude Code \u4EE5\u4F7F\u66F4\u6539\u751F\u6548" : "\u26A0\uFE0F Please restart Claude Code for changes to take effect"));
  } else {
    console.log(ansis.red(`\u2716 ${isZh ? "\u91CA\u653E\u5931\u8D25" : "Release failed"}`));
    for (const error of result.errors) {
      console.log(ansis.red(`  ${error}`));
    }
  }
}

function checkServiceHealth(serviceId, configuredServices) {
  const tierConfig = getMcpTierConfig(serviceId);
  const tier = MCP_SERVICE_TIERS[serviceId] || "ondemand";
  const isConfigured = configuredServices.includes(serviceId);
  const issues = [];
  const suggestions = [];
  let status = "healthy";
  if (isConfigured && !MCP_SERVICE_TIERS[serviceId]) {
    issues.push("Service not in tier system (using default: ondemand)");
    status = "warning";
  }
  if (serviceId === "Playwright" && configuredServices.includes("puppeteer")) {
    issues.push("Both Playwright and Puppeteer are enabled");
    suggestions.push("Consider using only one browser automation service");
    status = "warning";
  }
  if (serviceId === "puppeteer" && configuredServices.includes("Playwright")) {
    issues.push("Both Puppeteer and Playwright are enabled");
    suggestions.push("Consider using only one browser automation service");
    status = "warning";
  }
  if (tier === "scenario" && isConfigured) {
    suggestions.push("Scenario service - consider disabling when not needed");
  }
  return {
    serviceId,
    status,
    tier,
    autoStart: tierConfig.autoStart,
    idleTimeout: tierConfig.idleTimeout,
    issues,
    suggestions
  };
}
async function mcpDoctor(options = {}) {
  const lang = options.lang || i18n.language || "en";
  const isZh = lang === "zh-CN";
  console.log("");
  console.log(ansis.bold.cyan(isZh ? "\u{1F50D} MCP \u5065\u5EB7\u68C0\u67E5" : "\u{1F50D} MCP Health Check"));
  console.log(ansis.dim("\u2550".repeat(60)));
  console.log("");
  const config = readMcpConfig();
  const configuredServices = config?.mcpServers ? Object.keys(config.mcpServers) : [];
  console.log(ansis.bold(isZh ? "\u{1F4CA} \u670D\u52A1\u7EDF\u8BA1" : "\u{1F4CA} Service Statistics"));
  console.log(ansis.dim("\u2500".repeat(40)));
  const coreServices = getServicesByTier("core");
  const ondemandServices = getServicesByTier("ondemand");
  const scenarioServices = getServicesByTier("scenario");
  const configuredCore = configuredServices.filter((s) => coreServices.includes(s));
  const configuredOndemand = configuredServices.filter((s) => ondemandServices.includes(s));
  const configuredScenario = configuredServices.filter((s) => scenarioServices.includes(s));
  console.log(`  ${isZh ? "\u603B\u8BA1" : "Total"}: ${ansis.bold(configuredServices.length.toString())} ${isZh ? "\u4E2A\u670D\u52A1" : "services"}`);
  console.log(`  ${ansis.green("Core")}: ${configuredCore.length}/${coreServices.length}`);
  console.log(`  ${ansis.yellow("OnDemand")}: ${configuredOndemand.length}/${ondemandServices.length}`);
  console.log(`  ${ansis.green("Scenario")}: ${configuredScenario.length}/${scenarioServices.length}`);
  console.log("");
  const perfWarning = checkMcpPerformance(configuredServices.length);
  if (perfWarning) {
    console.log(ansis.bold(isZh ? "\u26A0\uFE0F \u6027\u80FD\u8B66\u544A" : "\u26A0\uFE0F Performance Warning"));
    console.log(ansis.dim("\u2500".repeat(40)));
    console.log(formatPerformanceWarning(perfWarning, lang));
    console.log("");
  }
  const resourceUsage = calculateResourceUsage(configuredServices.length);
  console.log(ansis.bold(isZh ? "\u{1F4BB} \u8D44\u6E90\u4F7F\u7528\u4F30\u7B97" : "\u{1F4BB} Resource Usage Estimate"));
  console.log(ansis.dim("\u2500".repeat(40)));
  const ratingColors = {
    low: ansis.green,
    medium: ansis.yellow,
    high: ansis.red,
    critical: ansis.bgRed.white
  };
  const ratingLabels = {
    low: isZh ? "\u4F4E" : "Low",
    medium: isZh ? "\u4E2D" : "Medium",
    high: isZh ? "\u9AD8" : "High",
    critical: isZh ? "\u4E25\u91CD" : "Critical"
  };
  console.log(`  ${isZh ? "\u5185\u5B58" : "Memory"}: ~${resourceUsage.memory.value}${resourceUsage.memory.unit}`);
  console.log(`  ${isZh ? "CPU" : "CPU"}: ~${resourceUsage.cpu.value}${resourceUsage.cpu.unit}`);
  console.log(`  ${isZh ? "\u8BC4\u7EA7" : "Rating"}: ${ratingColors[resourceUsage.rating](ratingLabels[resourceUsage.rating])}`);
  console.log("");
  if (options.verbose || options.service) {
    console.log(ansis.bold(isZh ? "\u{1F527} \u670D\u52A1\u8BE6\u60C5" : "\u{1F527} Service Details"));
    console.log(ansis.dim("\u2500".repeat(40)));
    const servicesToCheck = options.service ? [options.service] : configuredServices;
    for (const serviceId of servicesToCheck) {
      const health = checkServiceHealth(serviceId, configuredServices);
      const statusIcon = {
        healthy: ansis.green("\u2714"),
        warning: ansis.yellow("\u26A0"),
        error: ansis.red("\u2716"),
        unknown: ansis.gray("?")
      };
      const tierColor = {
        core: ansis.green,
        ondemand: ansis.yellow,
        scenario: ansis.green
      };
      console.log(`  ${statusIcon[health.status]} ${ansis.bold(serviceId)}`);
      console.log(`    ${isZh ? "\u5C42\u7EA7" : "Tier"}: ${(tierColor[health.tier] || ansis.gray)(health.tier)}`);
      if (health.idleTimeout) {
        console.log(`    ${isZh ? "\u7A7A\u95F2\u8D85\u65F6" : "Idle Timeout"}: ${health.idleTimeout}s`);
      }
      if (health.issues.length > 0) {
        for (const issue of health.issues) {
          console.log(`    ${ansis.yellow("!")} ${issue}`);
        }
      }
      if (health.suggestions.length > 0) {
        for (const suggestion of health.suggestions) {
          console.log(`    ${ansis.dim("\u2192")} ${suggestion}`);
        }
      }
      console.log("");
    }
  }
  const suggestions = getOptimizationSuggestions(configuredServices);
  if (suggestions.length > 0) {
    console.log(ansis.bold(isZh ? "\u{1F4A1} \u4F18\u5316\u5EFA\u8BAE" : "\u{1F4A1} Optimization Suggestions"));
    console.log(ansis.dim("\u2500".repeat(40)));
    for (const suggestion of suggestions) {
      console.log(`  \u2022 ${suggestion}`);
    }
    console.log("");
  }
  console.log(ansis.bold(isZh ? "\u{1F680} \u5FEB\u901F\u64CD\u4F5C" : "\u{1F680} Quick Actions"));
  console.log(ansis.dim("\u2500".repeat(40)));
  console.log(`  ${ansis.green("ccjk mcp profile use minimal")} - ${isZh ? "\u5207\u6362\u5230\u6781\u7B80\u6A21\u5F0F" : "Switch to minimal mode"}`);
  console.log(`  ${ansis.green("ccjk mcp profile list")} - ${isZh ? "\u67E5\u770B\u6240\u6709\u9884\u8BBE" : "View all profiles"}`);
  console.log(`  ${ansis.green("ccjk mcp release")} - ${isZh ? "\u91CA\u653E\u7A7A\u95F2\u670D\u52A1" : "Release idle services"}`);
  console.log("");
  console.log(ansis.dim("\u2550".repeat(60)));
  const summaryStatus = perfWarning?.level === "critical" ? ansis.red(isZh ? "\u9700\u8981\u4F18\u5316" : "Needs Optimization") : perfWarning?.level === "warning" ? ansis.yellow(isZh ? "\u5EFA\u8BAE\u4F18\u5316" : "Optimization Recommended") : ansis.green(isZh ? "\u72B6\u6001\u826F\u597D" : "Healthy");
  console.log(`${isZh ? "\u603B\u4F53\u72B6\u6001" : "Overall Status"}: ${summaryStatus}`);
  console.log("");
}

const MCP_PROFILES = [
  {
    id: "minimal",
    name: "Minimal",
    nameZh: "\u6781\u7B80\u6A21\u5F0F",
    description: "Core services only, best performance",
    descriptionZh: "\u4EC5\u6838\u5FC3\u670D\u52A1\uFF0C\u6700\u4F73\u6027\u80FD",
    services: ["context7", "open-websearch"],
    maxServices: 3,
    tier: "core"
  },
  {
    id: "development",
    name: "Development",
    nameZh: "\u5F00\u53D1\u6A21\u5F0F",
    description: "Suitable for daily development",
    descriptionZh: "\u9002\u5408\u65E5\u5E38\u5F00\u53D1",
    services: ["context7", "open-websearch", "mcp-deepwiki", "filesystem"],
    maxServices: 5,
    tier: "ondemand",
    isDefault: true
  },
  {
    id: "testing",
    name: "Testing",
    nameZh: "\u6D4B\u8BD5\u6A21\u5F0F",
    description: "Includes browser automation",
    descriptionZh: "\u5305\u542B\u6D4F\u89C8\u5668\u81EA\u52A8\u5316",
    services: ["context7", "open-websearch", "Playwright"],
    maxServices: 4,
    tier: "ondemand"
  },
  {
    id: "research",
    name: "Research",
    nameZh: "\u7814\u7A76\u6A21\u5F0F",
    description: "Enhanced documentation and search",
    descriptionZh: "\u589E\u5F3A\u6587\u6863\u548C\u641C\u7D22\u529F\u80FD",
    services: ["context7", "open-websearch", "mcp-deepwiki", "memory", "sequential-thinking"],
    maxServices: 6,
    tier: "ondemand"
  },
  {
    id: "full",
    name: "Full",
    nameZh: "\u5168\u529F\u80FD\u6A21\u5F0F",
    description: "All services (high resource usage)",
    descriptionZh: "\u6240\u6709\u670D\u52A1\uFF08\u9AD8\u8D44\u6E90\u6D88\u8017\uFF09",
    services: [],
    // Empty means all services
    maxServices: void 0,
    tier: "scenario"
  }
];
function getProfileById(id) {
  return MCP_PROFILES.find((p) => p.id === id);
}
function getProfileIds() {
  return MCP_PROFILES.map((p) => p.id);
}
function getProfileName(profile, lang = "en") {
  return lang === "zh-CN" ? profile.nameZh : profile.name;
}
function getProfileDescription(profile, lang = "en") {
  return lang === "zh-CN" ? profile.descriptionZh : profile.description;
}

async function listProfiles(options = {}) {
  const lang = options.lang || i18n.language || "en";
  const isZh = lang === "zh-CN";
  console.log("");
  console.log(ansis.bold.cyan(isZh ? "\u{1F4CB} \u53EF\u7528\u7684 MCP \u914D\u7F6E\u9884\u8BBE" : "\u{1F4CB} Available MCP Profiles"));
  console.log(ansis.dim("\u2500".repeat(50)));
  console.log("");
  for (const profile of MCP_PROFILES) {
    const name = getProfileName(profile, lang);
    const desc = getProfileDescription(profile, lang);
    const serviceCount = profile.services.length === 0 ? isZh ? "\u5168\u90E8" : "All" : profile.services.length.toString();
    const defaultBadge = profile.isDefault ? ansis.green(isZh ? " [\u9ED8\u8BA4]" : " [default]") : "";
    console.log(`${ansis.bold.green(profile.id)}${defaultBadge}`);
    console.log(`  ${ansis.white(name)} - ${ansis.dim(desc)}`);
    console.log(`  ${ansis.dim(isZh ? "\u670D\u52A1\u6570\u91CF" : "Services")}: ${serviceCount}`);
    if (profile.services.length > 0 && profile.services.length <= 6) {
      console.log(`  ${ansis.dim(profile.services.join(", "))}`);
    }
    console.log("");
  }
  console.log(ansis.dim("\u2500".repeat(50)));
  console.log(ansis.dim(isZh ? "\u4F7F\u7528 `ccjk mcp profile use <id>` \u5207\u6362\u914D\u7F6E" : "Use `ccjk mcp profile use <id>` to switch profile"));
  console.log("");
}
async function useProfile(profileId, options = {}) {
  const lang = options.lang || i18n.language || "en";
  const isZh = lang === "zh-CN";
  const profile = getProfileById(profileId);
  if (!profile) {
    console.log(ansis.red(isZh ? `\u274C \u672A\u627E\u5230\u914D\u7F6E\u9884\u8BBE: ${profileId}` : `\u274C Profile not found: ${profileId}`));
    console.log(ansis.dim(isZh ? `\u53EF\u7528\u9884\u8BBE: ${getProfileIds().join(", ")}` : `Available profiles: ${getProfileIds().join(", ")}`));
    return;
  }
  const backupPath = backupMcpConfig();
  if (backupPath) {
    console.log(ansis.gray(`\u2714 ${isZh ? "\u5DF2\u5907\u4EFD\u5F53\u524D\u914D\u7F6E" : "Backed up current config"}: ${backupPath}`));
  }
  let servicesToEnable;
  if (profile.services.length === 0) {
    servicesToEnable = MCP_SERVICE_CONFIGS.filter((s) => !s.requiresApiKey).map((s) => s.id);
  } else {
    servicesToEnable = profile.services;
  }
  const newServers = {};
  for (const serviceId of servicesToEnable) {
    const serviceConfig = MCP_SERVICE_CONFIGS.find((s) => s.id === serviceId);
    if (serviceConfig) {
      newServers[serviceId] = serviceConfig.config;
    }
  }
  const existingConfig = readMcpConfig() || {};
  const newConfig = {
    ...existingConfig,
    mcpServers: newServers
  };
  writeMcpConfig(newConfig);
  const profileName = getProfileName(profile, lang);
  console.log(ansis.green(`\u2714 ${isZh ? "\u5DF2\u5207\u6362\u5230\u914D\u7F6E\u9884\u8BBE" : "Switched to profile"}: ${profileName}`));
  console.log(ansis.dim(`  ${isZh ? "\u5DF2\u542F\u7528\u670D\u52A1" : "Enabled services"}: ${servicesToEnable.length}`));
  const warning = checkMcpPerformance(servicesToEnable.length);
  if (warning) {
    console.log("");
    console.log(formatPerformanceWarning(warning, lang));
  }
  console.log("");
  console.log(ansis.yellow(isZh ? "\u26A0\uFE0F \u8BF7\u91CD\u542F Claude Code \u4EE5\u4F7F\u66F4\u6539\u751F\u6548" : "\u26A0\uFE0F Please restart Claude Code for changes to take effect"));
}

async function mcpStatus(options = {}) {
  const { readMcpConfig } = await import('./claude-config.mjs').then(function (n) { return n.e; });
  const { checkMcpPerformance, formatPerformanceWarning } = await import('./mcp-performance.mjs').then(function (n) { return n.e; });
  const { MCP_SERVICE_TIERS } = await import('./mcp-performance.mjs').then(function (n) { return n.m; });
  const lang = options.lang || i18n.language || "en";
  const isZh = lang === "zh-CN";
  console.log("");
  console.log(ansis.bold.cyan(isZh ? "\u26A1 MCP \u5FEB\u901F\u72B6\u6001" : "\u26A1 MCP Quick Status"));
  console.log(ansis.dim("\u2500".repeat(40)));
  const config = await readMcpConfig();
  const services = Object.keys(config?.mcpServers || {});
  let coreCount = 0;
  let ondemandCount = 0;
  let scenarioCount = 0;
  for (const svc of services) {
    const tier = MCP_SERVICE_TIERS[svc] || "ondemand";
    if (tier === "core")
      coreCount++;
    else if (tier === "ondemand")
      ondemandCount++;
    else scenarioCount++;
  }
  console.log("");
  console.log(`${ansis.green("\u25CF")} ${isZh ? "\u6838\u5FC3\u670D\u52A1" : "Core"}: ${coreCount}`);
  console.log(`${ansis.yellow("\u25CF")} ${isZh ? "\u6309\u9700\u670D\u52A1" : "On-demand"}: ${ondemandCount}`);
  console.log(`${ansis.green("\u25CF")} ${isZh ? "\u573A\u666F\u670D\u52A1" : "Scenario"}: ${scenarioCount}`);
  console.log(`${ansis.dim("\u2500")} ${isZh ? "\u603B\u8BA1" : "Total"}: ${services.length}`);
  const perfResult = checkMcpPerformance(services.length);
  if (perfResult) {
    console.log("");
    console.log(formatPerformanceWarning(perfResult, lang));
  } else {
    console.log("");
    console.log(ansis.green(isZh ? "\u2713 \u6027\u80FD\u72B6\u6001\u826F\u597D" : "\u2713 Performance OK"));
  }
  console.log("");
  console.log(ansis.dim(isZh ? "\u63D0\u793A: \u4F7F\u7528 ccjk mcp doctor \u67E5\u770B\u8BE6\u7EC6\u8BCA\u65AD" : "Tip: Use ccjk mcp doctor for detailed diagnostics"));
}
function mcpHelp(options = {}) {
  const lang = options.lang || i18n.language || "en";
  const isZh = lang === "zh-CN";
  console.log("");
  console.log(ansis.bold.cyan(isZh ? "\u{1F527} MCP \u7BA1\u7406\u547D\u4EE4" : "\u{1F527} MCP Management Commands"));
  console.log(ansis.dim("\u2500".repeat(50)));
  console.log("");
  const commands = [
    {
      cmd: "ccjk mcp status",
      desc: isZh ? "\u5FEB\u901F\u67E5\u770B MCP \u72B6\u6001" : "Quick MCP status overview"
    },
    {
      cmd: "ccjk mcp doctor",
      desc: isZh ? "\u5065\u5EB7\u68C0\u67E5\u4E0E\u6027\u80FD\u8BCA\u65AD" : "Health check and diagnostics"
    },
    {
      cmd: "ccjk mcp profile [name]",
      desc: isZh ? "\u5207\u6362\u914D\u7F6E\u9884\u8BBE (minimal/dev/full)" : "Switch profile (minimal/dev/full)"
    },
    {
      cmd: "ccjk mcp release",
      desc: isZh ? "\u91CA\u653E\u95F2\u7F6E\u670D\u52A1" : "Release idle services"
    },
    {
      cmd: "ccjk mcp market",
      desc: isZh ? "MCP \u670D\u52A1\u5E02\u573A" : "MCP service marketplace"
    },
    {
      cmd: "ccjk mcp list",
      desc: isZh ? "\u5217\u51FA\u5DF2\u5B89\u88C5\u670D\u52A1" : "List installed services"
    }
  ];
  for (const { cmd, desc } of commands) {
    console.log(`  ${ansis.green(cmd)}`);
    console.log(`    ${ansis.dim(desc)}`);
    console.log("");
  }
  console.log(ansis.dim("\u2500".repeat(50)));
  console.log(ansis.dim(isZh ? "\u{1F4A1} \u63A8\u8350: \u4F7F\u7528 minimal \u9884\u8BBE\u53EF\u663E\u8457\u63D0\u5347\u6027\u80FD" : "\u{1F4A1} Tip: Use minimal profile for best performance"));
}

export { listProfiles, mcpDoctor, mcpHelp, mcpRelease, mcpStatus, useProfile };
