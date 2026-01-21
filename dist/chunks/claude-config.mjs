import { join } from 'pathe';
import { CLAUDE_VSC_CONFIG_FILE, CLAUDE_DIR, ClAUDE_CONFIG_FILE } from './constants.mjs';
import { ensureI18nInitialized, i18n } from './index.mjs';
import { readJsonConfig, writeJsonConfig, backupJsonConfig } from './json-config.mjs';
import { k as isWindows, l as getMcpCommand } from './platform.mjs';

function mergeArraysUnique(arr1, arr2) {
  const combined = [...arr1 || [], ...arr2 || []];
  return [...new Set(combined)];
}
function isPlainObject(value) {
  return value !== null && typeof value === "object" && value.constructor === Object && Object.prototype.toString.call(value) === "[object Object]";
}
function deepMerge(target, source, options = {}) {
  const { mergeArrays = false, arrayMergeStrategy = "replace" } = options;
  const result = { ...target };
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    if (sourceValue === void 0) {
      continue;
    }
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue, options);
    } else if (Array.isArray(sourceValue)) {
      if (!mergeArrays || !Array.isArray(targetValue)) {
        result[key] = sourceValue;
      } else {
        switch (arrayMergeStrategy) {
          case "concat":
            result[key] = [...targetValue, ...sourceValue];
            break;
          case "unique":
            result[key] = mergeArraysUnique(targetValue, sourceValue);
            break;
          case "replace":
          default:
            result[key] = sourceValue;
            break;
        }
      }
    } else {
      result[key] = sourceValue;
    }
  }
  return result;
}
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item));
  }
  if (isPlainObject(obj)) {
    const cloned = {};
    for (const key in obj) {
      cloned[key] = deepClone(obj[key]);
    }
    return cloned;
  }
  return obj;
}

function readMcpConfig() {
  return readJsonConfig(ClAUDE_CONFIG_FILE);
}
function writeMcpConfig(config) {
  writeJsonConfig(ClAUDE_CONFIG_FILE, config);
}
function backupMcpConfig() {
  const backupBaseDir = join(CLAUDE_DIR, "backup");
  return backupJsonConfig(ClAUDE_CONFIG_FILE, backupBaseDir);
}
function mergeMcpServers(existing, newServers) {
  const config = existing || { mcpServers: {} };
  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  Object.assign(config.mcpServers, newServers);
  return config;
}
function applyPlatformCommand(config) {
  if (isWindows() && config.command) {
    const mcpCmd = getMcpCommand(config.command);
    if (mcpCmd[0] === "cmd") {
      config.command = mcpCmd[0];
      config.args = [...mcpCmd.slice(1), ...config.args || []];
    }
  }
}
function buildMcpServerConfig(baseConfig, apiKey, placeholder = "YOUR_EXA_API_KEY", envVarName) {
  const config = deepClone(baseConfig);
  applyPlatformCommand(config);
  if (!apiKey) {
    return config;
  }
  if (envVarName && config.env) {
    config.env[envVarName] = apiKey;
    return config;
  }
  if (config.args) {
    config.args = config.args.map((arg) => arg.replace(placeholder, apiKey));
  }
  if (config.url) {
    config.url = config.url.replace(placeholder, apiKey);
  }
  return config;
}
function fixWindowsMcpConfig(config) {
  if (!isWindows() || !config.mcpServers) {
    return config;
  }
  const fixed = { ...config };
  for (const [, serverConfig] of Object.entries(fixed.mcpServers)) {
    if (serverConfig && typeof serverConfig === "object" && "command" in serverConfig) {
      applyPlatformCommand(serverConfig);
    }
  }
  return fixed;
}
function addCompletedOnboarding() {
  try {
    let config = readMcpConfig();
    if (!config) {
      config = { mcpServers: {} };
    }
    if (config.hasCompletedOnboarding === true) {
      return;
    }
    config.hasCompletedOnboarding = true;
    writeMcpConfig(config);
  } catch (error) {
    console.error("Failed to add onboarding flag", error);
    throw error;
  }
}
function ensureApiKeyApproved(config, apiKey) {
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
    return config;
  }
  const truncatedApiKey = apiKey.substring(0, 20);
  const updatedConfig = { ...config };
  if (!updatedConfig.customApiKeyResponses) {
    updatedConfig.customApiKeyResponses = {
      approved: [],
      rejected: []
    };
  }
  if (!Array.isArray(updatedConfig.customApiKeyResponses.approved)) {
    updatedConfig.customApiKeyResponses.approved = [];
  }
  if (!Array.isArray(updatedConfig.customApiKeyResponses.rejected)) {
    updatedConfig.customApiKeyResponses.rejected = [];
  }
  const rejectedIndex = updatedConfig.customApiKeyResponses.rejected.indexOf(truncatedApiKey);
  if (rejectedIndex > -1) {
    updatedConfig.customApiKeyResponses.rejected.splice(rejectedIndex, 1);
  }
  if (!updatedConfig.customApiKeyResponses.approved.includes(truncatedApiKey)) {
    updatedConfig.customApiKeyResponses.approved.push(truncatedApiKey);
  }
  return updatedConfig;
}
function manageApiKeyApproval(apiKey) {
  try {
    let config = readMcpConfig();
    if (!config) {
      config = { mcpServers: {} };
    }
    const updatedConfig = ensureApiKeyApproved(config, apiKey);
    writeMcpConfig(updatedConfig);
  } catch (error) {
    ensureI18nInitialized();
    console.error(i18n.t("mcp:apiKeyApprovalFailed"), error);
  }
}
function setPrimaryApiKey() {
  try {
    let config = readJsonConfig(CLAUDE_VSC_CONFIG_FILE);
    if (!config) {
      config = {};
    }
    config.primaryApiKey = "ccjk";
    writeJsonConfig(CLAUDE_VSC_CONFIG_FILE, config);
  } catch (error) {
    ensureI18nInitialized();
    console.error(i18n.t("mcp:primaryApiKeySetFailed"), error);
  }
}

const claudeConfig = {
  __proto__: null,
  addCompletedOnboarding: addCompletedOnboarding,
  backupMcpConfig: backupMcpConfig,
  buildMcpServerConfig: buildMcpServerConfig,
  ensureApiKeyApproved: ensureApiKeyApproved,
  fixWindowsMcpConfig: fixWindowsMcpConfig,
  manageApiKeyApproval: manageApiKeyApproval,
  mergeMcpServers: mergeMcpServers,
  readMcpConfig: readMcpConfig,
  setPrimaryApiKey: setPrimaryApiKey,
  writeMcpConfig: writeMcpConfig
};

export { buildMcpServerConfig as a, backupMcpConfig as b, addCompletedOnboarding as c, deepMerge as d, claudeConfig as e, fixWindowsMcpConfig as f, mergeMcpServers as m, readMcpConfig as r, setPrimaryApiKey as s, writeMcpConfig as w };
