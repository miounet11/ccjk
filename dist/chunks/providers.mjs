import ansis from 'ansis';
import { getApiProviderPresets } from './api-providers.mjs';
import { i18n } from './index.mjs';
import { P as ProviderHealthMonitor } from '../shared/ccjk.J8YiPsOw.mjs';
import './constants.mjs';
import 'node:os';
import 'pathe';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';

async function listProviders(options = {}) {
  const isZh = i18n.language === "zh-CN";
  const codeType = options.codeType || "claude-code";
  console.log("");
  console.log(ansis.bold.cyan(isZh ? "\u{1F4CB} \u53EF\u7528\u7684 API \u4F9B\u5E94\u5546" : "\u{1F4CB} Available API Providers"));
  console.log(ansis.dim("\u2500".repeat(60)));
  console.log("");
  try {
    const providers = await getApiProviderPresets(codeType);
    if (providers.length === 0) {
      console.log(ansis.yellow(isZh ? "\u672A\u627E\u5230\u4F9B\u5E94\u5546" : "No providers found"));
      console.log("");
      return;
    }
    const cloudProviders = providers.filter((p) => p.isCloud);
    const localProviders = providers.filter((p) => !p.isCloud);
    if (cloudProviders.length > 0) {
      console.log(ansis.bold.green(isZh ? "\u2601\uFE0F  \u4E91\u7AEF\u4F9B\u5E94\u5546" : "\u2601\uFE0F  Cloud Providers"));
      console.log("");
      for (const provider of cloudProviders) {
        displayProvider(provider, codeType, options.verbose || false, isZh);
      }
    }
    if (localProviders.length > 0) {
      if (cloudProviders.length > 0) {
        console.log("");
      }
      console.log(ansis.bold.blue(isZh ? "\u{1F4BE} \u672C\u5730\u4F9B\u5E94\u5546" : "\u{1F4BE} Local Providers"));
      console.log("");
      for (const provider of localProviders) {
        displayProvider(provider, codeType, options.verbose || false, isZh);
      }
    }
    console.log("");
    console.log(ansis.dim("\u2500".repeat(60)));
    console.log(ansis.dim(isZh ? `\u603B\u8BA1: ${providers.length} \u4E2A\u4F9B\u5E94\u5546 (${cloudProviders.length} \u4E91\u7AEF, ${localProviders.length} \u672C\u5730)` : `Total: ${providers.length} providers (${cloudProviders.length} cloud, ${localProviders.length} local)`));
    console.log("");
  } catch (error) {
    console.error(ansis.red(isZh ? "\u274C \u83B7\u53D6\u4F9B\u5E94\u5546\u5217\u8868\u5931\u8D25" : "\u274C Failed to fetch providers"));
    if (options.verbose && error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
    console.log("");
  }
}
function displayProvider(provider, codeType, verbose, isZh) {
  const config = codeType === "codex" ? provider.codex : provider.claudeCode;
  console.log(`  ${ansis.bold(provider.name)} ${ansis.dim(`(${provider.id})`)}`);
  if (provider.description) {
    console.log(`    ${ansis.dim(provider.description)}`);
  }
  if (config) {
    console.log(`    ${ansis.green(isZh ? "\u63A5\u53E3\u5730\u5740" : "Base URL")}: ${config.baseUrl}`);
    if (codeType === "claude-code" && config.authType) {
      console.log(`    ${ansis.green(isZh ? "\u8BA4\u8BC1\u65B9\u5F0F" : "Auth Type")}: ${config.authType}`);
    }
    if (codeType === "codex" && config.wireApi) {
      console.log(`    ${ansis.green(isZh ? "\u534F\u8BAE\u7C7B\u578B" : "Wire API")}: ${config.wireApi}`);
    }
    if (verbose) {
      if (config.defaultModels && config.defaultModels.length > 0) {
        console.log(`    ${ansis.green(isZh ? "\u9ED8\u8BA4\u6A21\u578B" : "Default Models")}: ${config.defaultModels.join(", ")}`);
      }
      if (config.defaultModel) {
        console.log(`    ${ansis.green(isZh ? "\u9ED8\u8BA4\u6A21\u578B" : "Default Model")}: ${config.defaultModel}`);
      }
      if (provider.website) {
        console.log(`    ${ansis.green(isZh ? "\u5B98\u7F51" : "Website")}: ${provider.website}`);
      }
    }
  }
  console.log("");
}
async function checkProvidersHealth(options = {}) {
  const isZh = i18n.language === "zh-CN";
  const codeType = options.codeType || "claude-code";
  console.log("");
  console.log(ansis.bold.cyan(isZh ? "\u{1F3E5} \u4F9B\u5E94\u5546\u5065\u5EB7\u68C0\u67E5" : "\u{1F3E5} Provider Health Check"));
  console.log(ansis.dim("\u2500".repeat(60)));
  console.log("");
  try {
    const providers = await getApiProviderPresets(codeType);
    if (providers.length === 0) {
      console.log(ansis.yellow(isZh ? "\u672A\u627E\u5230\u4F9B\u5E94\u5546" : "No providers found"));
      console.log("");
      return;
    }
    const monitor = new ProviderHealthMonitor({
      timeout: 5e3,
      degradedLatencyThreshold: 1e3,
      unhealthyLatencyThreshold: 3e3
    });
    monitor.setProviders(providers);
    console.log(ansis.dim(isZh ? "\u6B63\u5728\u68C0\u67E5\u4F9B\u5E94\u5546\u5065\u5EB7\u72B6\u6001..." : "Checking provider health..."));
    console.log("");
    const results = await Promise.all(
      providers.map(async (provider) => {
        const result = await monitor.checkHealth(provider);
        return { provider, result };
      })
    );
    for (const { provider, result } of results) {
      const statusIcon = result.success ? ansis.green("\u2705") : ansis.red("\u274C");
      const latencyColor = result.latency < 1e3 ? ansis.green : result.latency < 3e3 ? ansis.yellow : ansis.red;
      console.log(`${statusIcon} ${ansis.bold(provider.name)}`);
      if (result.success) {
        console.log(`    ${ansis.green(isZh ? "\u5EF6\u8FDF" : "Latency")}: ${latencyColor(`${result.latency}ms`)}`);
        console.log(`    ${ansis.green(isZh ? "\u72B6\u6001: \u6B63\u5E38" : "Status: Healthy")}`);
      } else {
        console.log(`    ${ansis.red(isZh ? "\u72B6\u6001: \u4E0D\u53EF\u7528" : "Status: Unavailable")}`);
        if (result.error) {
          console.log(`    ${ansis.dim(isZh ? "\u9519\u8BEF" : "Error")}: ${result.error}`);
        }
      }
      console.log("");
    }
    const healthyCount = results.filter((r) => r.result.success).length;
    const unhealthyCount = results.length - healthyCount;
    console.log(ansis.dim("\u2500".repeat(60)));
    console.log(ansis.bold(isZh ? "\u6458\u8981" : "Summary"));
    console.log(`  ${ansis.green("\u2705")} ${isZh ? "\u5065\u5EB7" : "Healthy"}: ${healthyCount}`);
    console.log(`  ${ansis.red("\u274C")} ${isZh ? "\u4E0D\u53EF\u7528" : "Unavailable"}: ${unhealthyCount}`);
    console.log("");
  } catch (error) {
    console.error(ansis.red(isZh ? "\u274C \u5065\u5EB7\u68C0\u67E5\u5931\u8D25" : "\u274C Health check failed"));
    if (options.verbose && error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
    console.log("");
  }
}
async function recommendProvider(options = {}) {
  const isZh = i18n.language === "zh-CN";
  const codeType = options.codeType || "claude-code";
  console.log("");
  console.log(ansis.bold.cyan(isZh ? "\u{1F3AF} \u4F9B\u5E94\u5546\u63A8\u8350" : "\u{1F3AF} Provider Recommendation"));
  console.log(ansis.dim("\u2500".repeat(60)));
  console.log("");
  try {
    const providers = await getApiProviderPresets(codeType);
    if (providers.length === 0) {
      console.log(ansis.yellow(isZh ? "\u672A\u627E\u5230\u4F9B\u5E94\u5546" : "No providers found"));
      console.log("");
      return;
    }
    const monitor = new ProviderHealthMonitor({
      timeout: 5e3,
      degradedLatencyThreshold: 1e3,
      unhealthyLatencyThreshold: 3e3
    });
    monitor.setProviders(providers);
    console.log(ansis.dim(isZh ? "\u6B63\u5728\u5206\u6790\u4F9B\u5E94\u5546\u6027\u80FD..." : "Analyzing provider performance..."));
    console.log("");
    await Promise.all(
      providers.map(async (provider) => {
        const result = await monitor.checkHealth(provider);
        return result;
      })
    );
    const sortedProviders = monitor.getProvidersByHealth();
    const bestProvider = sortedProviders[0];
    if (!bestProvider) {
      console.log(ansis.yellow(isZh ? "\u65E0\u6CD5\u786E\u5B9A\u6700\u4F73\u4F9B\u5E94\u5546" : "Unable to determine best provider"));
      console.log("");
      return;
    }
    console.log(ansis.bold.green(isZh ? "\u{1F3C6} \u63A8\u8350\u4F9B\u5E94\u5546" : "\u{1F3C6} Recommended Provider"));
    console.log("");
    console.log(`  ${ansis.bold.cyan(bestProvider.name)} ${ansis.dim(`(${bestProvider.id})`)}`);
    if (bestProvider.description) {
      console.log(`  ${ansis.dim(bestProvider.description)}`);
    }
    const health = monitor.getProviderHealth(bestProvider.id);
    if (health) {
      console.log("");
      console.log(ansis.bold(isZh ? "\u6027\u80FD\u6307\u6807" : "Performance Metrics"));
      console.log(`  ${ansis.green(isZh ? "\u5EF6\u8FDF" : "Latency")}: ${health.latency.toFixed(0)}ms`);
      console.log(`  ${ansis.green(isZh ? "\u6210\u529F\u7387" : "Success Rate")}: ${(health.successRate * 100).toFixed(1)}%`);
      console.log(`  ${ansis.green(isZh ? "\u72B6\u6001" : "Status")}: ${getStatusDisplay(health.status, isZh)}`);
    }
    if (sortedProviders.length > 1) {
      console.log("");
      console.log(ansis.bold(isZh ? "\u5907\u9009\u4F9B\u5E94\u5546" : "Alternative Providers"));
      console.log("");
      for (let i = 1; i < Math.min(4, sortedProviders.length); i++) {
        const provider = sortedProviders[i];
        const health2 = monitor.getProviderHealth(provider.id);
        console.log(`  ${i}. ${ansis.bold(provider.name)} ${ansis.dim(`(${provider.id})`)}`);
        if (health2) {
          console.log(`     ${ansis.dim(`${health2.latency.toFixed(0)}ms | ${(health2.successRate * 100).toFixed(1)}% | ${health2.status}`)}`);
        }
      }
    }
    console.log("");
    console.log(ansis.dim("\u2500".repeat(60)));
    console.log(ansis.dim(isZh ? '\u{1F4A1} \u63D0\u793A: \u4F7F\u7528 "ccjk config set provider <id>" \u5207\u6362\u4F9B\u5E94\u5546' : '\u{1F4A1} Tip: Use "ccjk config set provider <id>" to switch provider'));
    console.log("");
  } catch (error) {
    console.error(ansis.red(isZh ? "\u274C \u63A8\u8350\u5931\u8D25" : "\u274C Recommendation failed"));
    if (options.verbose && error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
    console.log("");
  }
}
function getStatusDisplay(status, isZh) {
  const statusMap = {
    healthy: { en: "Healthy", zh: "\u5065\u5EB7", color: ansis.green },
    degraded: { en: "Degraded", zh: "\u964D\u7EA7", color: ansis.yellow },
    unhealthy: { en: "Unhealthy", zh: "\u4E0D\u5065\u5EB7", color: ansis.red },
    unknown: { en: "Unknown", zh: "\u672A\u77E5", color: ansis.dim }
  };
  const info = statusMap[status] || statusMap.unknown;
  const text = isZh ? info.zh : info.en;
  return info.color(text);
}
async function providersCommand(action, options = {}) {
  switch (action) {
    case "list":
    case "ls":
      await listProviders(options);
      break;
    case "health":
    case "check":
      await checkProvidersHealth(options);
      break;
    case "recommend":
    case "rec":
      await recommendProvider(options);
      break;
    default: {
      const isZh = i18n.language === "zh-CN";
      console.log("");
      console.log(ansis.bold.cyan(isZh ? "\u{1F4E6} \u4F9B\u5E94\u5546\u7BA1\u7406\u547D\u4EE4" : "\u{1F4E6} Provider Management Commands"));
      console.log("");
      console.log(`  ${ansis.green("ccjk providers list")}        ${isZh ? "\u5217\u51FA\u6240\u6709\u4F9B\u5E94\u5546" : "List all providers"}`);
      console.log(`  ${ansis.green("ccjk providers health")}      ${isZh ? "\u68C0\u67E5\u4F9B\u5E94\u5546\u5065\u5EB7\u72B6\u6001" : "Check provider health"}`);
      console.log(`  ${ansis.green("ccjk providers recommend")}   ${isZh ? "\u63A8\u8350\u6700\u4F73\u4F9B\u5E94\u5546" : "Recommend best provider"}`);
      console.log("");
      console.log(ansis.bold(isZh ? "\u9009\u9879" : "Options"));
      console.log(`  ${ansis.green("--code-type, -T")} <type>   ${isZh ? "\u4EE3\u7801\u5DE5\u5177\u7C7B\u578B (claude-code, codex)" : "Code tool type (claude-code, codex)"}`);
      console.log(`  ${ansis.green("--verbose, -v")}            ${isZh ? "\u8BE6\u7EC6\u8F93\u51FA" : "Verbose output"}`);
      console.log("");
    }
  }
}

export { checkProvidersHealth, listProviders, providersCommand, recommendProvider };
