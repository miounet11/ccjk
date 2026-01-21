import { exec } from 'node:child_process';
import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import process__default from 'node:process';
import { promisify } from 'node:util';
import ansis from 'ansis';
import dayjs from 'dayjs';
import inquirer from 'inquirer';
import { join } from 'pathe';
import { SETTINGS_FILE } from './constants.mjs';
import { ensureI18nInitialized, i18n } from './index.mjs';
import { s as setPrimaryApiKey, c as addCompletedOnboarding } from './claude-config.mjs';
import { b as backupExistingConfig } from './config2.mjs';
import { readJsonConfig, writeJsonConfig } from './json-config.mjs';
import { p as promptBoolean } from '../shared/ccjk.DHbrGcgg.mjs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import './platform.mjs';
import 'tinyexec';
import './fs-operations.mjs';
import 'node:crypto';
import 'node:fs/promises';
import 'inquirer-toggle';

const PROVIDER_PRESETS_URL = "https://pub-0dc3e1677e894f07bbea11b17a29e032.r2.dev/providers.json";
async function fetchProviderPresets() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5e3);
    const response = await fetch(PROVIDER_PRESETS_URL, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const presets = [];
    if (Array.isArray(data)) {
      for (const provider of data) {
        if (provider && typeof provider === "object") {
          presets.push({
            name: provider.name || "",
            provider: provider.name || "",
            baseURL: provider.api_base_url || provider.baseURL || provider.url,
            requiresApiKey: provider.api_key === "" || provider.requiresApiKey !== false,
            models: provider.models || [],
            description: provider.description || provider.name || "",
            transformer: provider.transformer
          });
        }
      }
    } else if (data && typeof data === "object") {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "object" && value !== null) {
          const provider = value;
          presets.push({
            name: provider.name || key,
            provider: key,
            baseURL: provider.api_base_url || provider.baseURL || provider.url,
            requiresApiKey: provider.api_key === "" || provider.requiresApiKey !== false,
            models: provider.models || [],
            description: provider.description || "",
            transformer: provider.transformer
          });
        }
      }
    }
    return presets;
  } catch {
    return getFallbackPresets();
  }
}
function getFallbackPresets() {
  return [
    {
      name: "dashscope",
      provider: "dashscope",
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      requiresApiKey: true,
      models: ["qwen3-coder-plus"],
      description: "Alibaba DashScope",
      transformer: {
        "use": [["maxtoken", { max_tokens: 65536 }]],
        "qwen3-coder-plus": {
          use: ["enhancetool"]
        }
      }
    },
    {
      name: "deepseek",
      provider: "deepseek",
      baseURL: "https://api.deepseek.com/chat/completions",
      requiresApiKey: true,
      models: ["deepseek-chat", "deepseek-reasoner"],
      description: "DeepSeek AI models",
      transformer: {
        "use": ["deepseek"],
        "deepseek-chat": {
          use: ["tooluse"]
        }
      }
    },
    {
      name: "gemini",
      provider: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/models/",
      requiresApiKey: true,
      models: ["gemini-2.5-flash", "gemini-2.5-pro"],
      description: "Google Gemini models",
      transformer: {
        use: ["gemini"]
      }
    },
    {
      name: "modelscope",
      provider: "modelscope",
      baseURL: "https://api-inference.modelscope.cn/v1/chat/completions",
      requiresApiKey: true,
      models: ["Qwen/Qwen3-Coder-480B-A35B-Instruct", "Qwen/Qwen3-235B-A22B-Thinking-2507", "ZhipuAI/GLM-4.5"],
      description: "ModelScope AI models",
      transformer: {
        "use": [["maxtoken", { max_tokens: 65536 }]],
        "Qwen/Qwen3-Coder-480B-A35B-Instruct": {
          use: ["enhancetool"]
        },
        "Qwen/Qwen3-235B-A22B-Thinking-2507": {
          use: ["reasoning"]
        }
      }
    },
    {
      name: "openrouter",
      provider: "openrouter",
      baseURL: "https://openrouter.ai/api/v1/chat/completions",
      requiresApiKey: true,
      models: [
        "google/gemini-2.5-pro-preview",
        "anthropic/claude-sonnet-4",
        "anthropic/claude-3.5-sonnet",
        "anthropic/claude-3.7-sonnet:thinking"
      ],
      description: "OpenRouter API",
      transformer: {
        use: ["openrouter"]
      }
    },
    {
      name: "siliconflow",
      provider: "siliconflow",
      baseURL: "https://api.siliconflow.cn/v1/chat/completions",
      requiresApiKey: true,
      models: ["moonshotai/Kimi-K2-Instruct"],
      description: "SiliconFlow AI",
      transformer: {
        use: [["maxtoken", { max_tokens: 16384 }]]
      }
    },
    {
      name: "volcengine",
      provider: "volcengine",
      baseURL: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      requiresApiKey: true,
      models: ["deepseek-v3-250324", "deepseek-r1-250528"],
      description: "Volcengine AI",
      transformer: {
        use: ["deepseek"]
      }
    }
  ];
}

const execAsync = promisify(exec);
const CCR_CONFIG_DIR = join(homedir(), ".claude-code-router");
const CCR_CONFIG_FILE = join(CCR_CONFIG_DIR, "config.json");
const CCR_BACKUP_DIR = CCR_CONFIG_DIR;
function ensureCcrConfigDir() {
  if (!existsSync(CCR_CONFIG_DIR)) {
    mkdirSync(CCR_CONFIG_DIR, { recursive: true });
  }
}
async function backupCcrConfig() {
  ensureI18nInitialized();
  try {
    if (!existsSync(CCR_CONFIG_FILE)) {
      return null;
    }
    const timestamp = `${dayjs().format("YYYY-MM-DDTHH-mm-ss-SSS")}Z`;
    const backupFileName = `config.json.${timestamp}.bak`;
    const backupPath = join(CCR_BACKUP_DIR, backupFileName);
    console.log(ansis.green(`${i18n.t("ccr:backupCcrConfig")}`));
    copyFileSync(CCR_CONFIG_FILE, backupPath);
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrBackupSuccess").replace("{path}", backupPath)}`));
    return backupPath;
  } catch (error) {
    console.error(ansis.red(`${i18n.t("ccr:ccrBackupFailed")}:`), error.message);
    return null;
  }
}
function readCcrConfig() {
  if (!existsSync(CCR_CONFIG_FILE)) {
    return null;
  }
  return readJsonConfig(CCR_CONFIG_FILE);
}
function writeCcrConfig(config) {
  ensureCcrConfigDir();
  writeJsonConfig(CCR_CONFIG_FILE, config);
}
async function configureCcrProxy(ccrConfig) {
  const settings = readJsonConfig(SETTINGS_FILE) || {};
  const host = ccrConfig.HOST || "127.0.0.1";
  const port = ccrConfig.PORT || 3456;
  const apiKey = ccrConfig.APIKEY || "sk-ccjk-x-ccr";
  if (!settings.env) {
    settings.env = {};
  }
  delete settings.env.ANTHROPIC_AUTH_TOKEN;
  settings.env.ANTHROPIC_BASE_URL = `http://${host}:${port}`;
  settings.env.ANTHROPIC_API_KEY = apiKey;
  writeJsonConfig(SETTINGS_FILE, settings);
  try {
    setPrimaryApiKey();
  } catch (error) {
    ensureI18nInitialized();
    console.error(i18n.t("mcp:primaryApiKeySetFailed"), error);
  }
}
async function selectCcrPreset() {
  ensureI18nInitialized();
  console.log(ansis.green(`${i18n.t("ccr:fetchingPresets")}`));
  const presets = await fetchProviderPresets();
  if (!presets || presets.length === 0) {
    console.log(ansis.yellow(`${i18n.t("ccr:noPresetsAvailable")}`));
    return null;
  }
  try {
    const choices = [
      {
        name: `1. ${i18n.t("ccr:skipOption")}`,
        value: "skip"
      },
      ...presets.map((p, index) => ({
        name: `${index + 2}. ${p.name}`,
        value: p
      }))
    ];
    const { preset } = await inquirer.prompt({
      type: "list",
      name: "preset",
      message: i18n.t("ccr:selectCcrPreset"),
      choices
    });
    return preset;
  } catch (error) {
    if (error.name === "ExitPromptError") {
      console.log(ansis.yellow(i18n.t("common:cancelled")));
      return null;
    }
    throw error;
  }
}
async function configureCcrWithPreset(preset) {
  ensureI18nInitialized();
  const provider = {
    name: preset.name,
    // Use the original name from JSON
    api_base_url: preset.baseURL || "",
    api_key: "",
    models: preset.models
  };
  if (preset.transformer) {
    provider.transformer = preset.transformer;
  }
  if (preset.requiresApiKey) {
    try {
      const { apiKey } = await inquirer.prompt({
        type: "input",
        name: "apiKey",
        message: i18n.t("ccr:enterApiKeyForProvider").replace("{provider}", preset.name),
        validate: async (value) => !!value || i18n.t("api:keyRequired")
      });
      provider.api_key = apiKey;
    } catch (error) {
      if (error.name === "ExitPromptError") {
        throw error;
      }
      throw error;
    }
  } else {
    provider.api_key = "sk-free";
  }
  let defaultModel = preset.models[0];
  if (preset.models.length > 1) {
    try {
      const { model } = await inquirer.prompt({
        type: "list",
        name: "model",
        message: i18n.t("ccr:selectDefaultModelForProvider").replace("{provider}", preset.name),
        choices: preset.models.map((m, index) => ({
          name: `${index + 1}. ${m}`,
          value: m
        }))
      });
      defaultModel = model;
    } catch (error) {
      if (error.name === "ExitPromptError") {
        throw error;
      }
      throw error;
    }
  }
  const router = {
    default: `${preset.name},${defaultModel}`,
    // Use the original name
    background: `${preset.name},${defaultModel}`,
    think: `${preset.name},${defaultModel}`,
    longContext: `${preset.name},${defaultModel}`,
    longContextThreshold: 6e4,
    webSearch: `${preset.name},${defaultModel}`
  };
  const config = {
    LOG: true,
    CLAUDE_PATH: "",
    HOST: "127.0.0.1",
    PORT: 3456,
    APIKEY: "sk-ccjk-x-ccr",
    API_TIMEOUT_MS: "600000",
    PROXY_URL: "",
    transformers: [],
    Providers: [provider],
    Router: router
  };
  return config;
}
async function restartAndCheckCcrStatus() {
  ensureI18nInitialized();
  try {
    console.log(ansis.green(`${i18n.t("ccr:restartingCcr")}`));
    await execAsync("ccr restart");
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrRestartSuccess")}`));
    console.log(ansis.green(`${i18n.t("ccr:checkingCcrStatus")}`));
    const { stdout } = await execAsync("ccr status");
    console.log(ansis.gray(stdout));
  } catch (error) {
    console.error(ansis.red(`${i18n.t("ccr:ccrRestartFailed")}:`), error.message || error);
    if (process__default.env.DEBUG) {
      console.error("Full error:", error);
    }
  }
}
async function showConfigurationTips(apiKey) {
  ensureI18nInitialized();
  console.log(ansis.bold.cyan(`
\u{1F4CC} ${i18n.t("ccr:configTips")}:`));
  console.log(ansis.green(`  \u2022 ${i18n.t("ccr:advancedConfigTip")}`));
  console.log(ansis.green(`  \u2022 ${i18n.t("ccr:manualConfigTip")}`));
  console.log(ansis.bold.yellow(`  \u2022 ${i18n.t("ccr:useClaudeCommand")}`));
  if (apiKey) {
    console.log(ansis.bold.green(`  \u2022 ${i18n.t("ccr:ccrUiApiKey") || "CCR UI API Key"}: ${apiKey}`));
    console.log(ansis.gray(`    ${i18n.t("ccr:ccrUiApiKeyHint") || "Use this API key to login to CCR UI"}`));
  }
  console.log("");
}
function createDefaultCcrConfig() {
  return {
    LOG: false,
    CLAUDE_PATH: "",
    HOST: "127.0.0.1",
    PORT: 3456,
    APIKEY: "sk-ccjk-x-ccr",
    API_TIMEOUT_MS: "600000",
    PROXY_URL: "",
    transformers: [],
    Providers: [],
    // Empty providers array - user configures in UI
    Router: {}
    // Empty router configuration - user configures in UI
  };
}
async function setupCcrConfiguration() {
  ensureI18nInitialized();
  try {
    const existingConfig = readCcrConfig();
    if (existingConfig) {
      console.log(ansis.green(`\u2139 ${i18n.t("ccr:existingCcrConfig")}`));
      let shouldBackupAndReconfigure = false;
      try {
        shouldBackupAndReconfigure = await promptBoolean({
          message: i18n.t("ccr:overwriteCcrConfig"),
          defaultValue: false
        });
      } catch (error) {
        if (error.name === "ExitPromptError") {
          console.log(ansis.yellow(i18n.t("common:cancelled")));
          return false;
        }
        throw error;
      }
      if (!shouldBackupAndReconfigure) {
        console.log(ansis.yellow(`${i18n.t("ccr:keepingExistingConfig")}`));
        await configureCcrProxy(existingConfig);
        try {
          const { manageApiKeyApproval } = await import('./claude-config.mjs').then(function (n) { return n.e; });
          const apiKey = existingConfig.APIKEY || "sk-ccjk-x-ccr";
          manageApiKeyApproval(apiKey);
          console.log(ansis.green(`\u2714 ${i18n.t("ccr:apiKeyApprovalSuccess")}`));
        } catch (error) {
          console.error(ansis.red(`${i18n.t("ccr:apiKeyApprovalFailed")}:`), error);
        }
        return true;
      }
      backupCcrConfig();
    }
    const preset = await selectCcrPreset();
    if (!preset) {
      return false;
    }
    let config;
    if (preset === "skip") {
      console.log(ansis.yellow(`${i18n.t("ccr:skipConfiguring")}`));
      config = createDefaultCcrConfig();
    } else {
      config = await configureCcrWithPreset(preset);
    }
    writeCcrConfig(config);
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrConfigSuccess")}`));
    await configureCcrProxy(config);
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:proxyConfigSuccess")}`));
    await restartAndCheckCcrStatus();
    await showConfigurationTips(config.APIKEY);
    try {
      addCompletedOnboarding();
    } catch (error) {
      console.error(ansis.red(i18n.t("errors:failedToSetOnboarding")), error);
    }
    try {
      const { manageApiKeyApproval } = await import('./claude-config.mjs').then(function (n) { return n.e; });
      const apiKey = config.APIKEY || "sk-ccjk-x-ccr";
      manageApiKeyApproval(apiKey);
      console.log(ansis.green(`\u2714 ${i18n.t("ccr:apiKeyApprovalSuccess")}`));
    } catch (error) {
      console.error(ansis.red(`${i18n.t("ccr:apiKeyApprovalFailed")}:`), error);
    }
    return true;
  } catch (error) {
    if (error.name === "ExitPromptError") {
      console.log(ansis.yellow(i18n.t("common:cancelled")));
      return false;
    }
    console.error(ansis.red(`${i18n.t("ccr:ccrConfigFailed")}:`), error);
    return false;
  }
}
async function configureCcrFeature() {
  ensureI18nInitialized();
  const backupDir = backupExistingConfig();
  if (backupDir) {
    console.log(ansis.gray(`\u2714 ${i18n.t("configuration:backupSuccess")}: ${backupDir}`));
  }
  await setupCcrConfiguration();
}

export { backupCcrConfig, configureCcrFeature, configureCcrProxy, configureCcrWithPreset, createDefaultCcrConfig, ensureCcrConfigDir, readCcrConfig, restartAndCheckCcrStatus, selectCcrPreset, setupCcrConfiguration, showConfigurationTips, writeCcrConfig };
