import ansis from 'ansis';
import { i18n, format } from './index.mjs';
import { S as STATUS, t as theme } from '../shared/ccjk.BpHTUkb8.mjs';
import inquirer from 'inquirer';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'pathe';
import { writeFileAtomic } from './fs-operations.mjs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import './package.mjs';
import 'node:crypto';
import 'node:fs/promises';

const PROVIDER_PRESETS = [
  // === Official Anthropic ===
  {
    id: "anthropic",
    name: "Anthropic (Official)",
    nameZh: "Anthropic (\u5B98\u65B9)",
    description: "Official Anthropic API - Best quality and reliability",
    descriptionZh: "\u5B98\u65B9 Anthropic API - \u6700\u4F73\u8D28\u91CF\u548C\u7A33\u5B9A\u6027",
    category: "official",
    website: "https://console.anthropic.com",
    requiresApiKey: true,
    baseUrl: "https://api.anthropic.com",
    models: [
      "claude-sonnet-4-20250514",
      "claude-opus-4-20250514",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022"
    ],
    defaultModel: "claude-sonnet-4-20250514",
    features: ["chat", "vision", "tools", "streaming", "thinking", "code"],
    instructions: {
      en: "Get your API key from https://console.anthropic.com/settings/keys",
      zh: "\u4ECE https://console.anthropic.com/settings/keys \u83B7\u53D6 API \u5BC6\u94A5"
    }
  },
  // === OpenAI-Compatible Providers ===
  {
    id: "302ai",
    name: "302.AI",
    nameZh: "302.AI",
    description: "Multi-model API platform with Claude support",
    descriptionZh: "\u591A\u6A21\u578B API \u5E73\u53F0\uFF0C\u652F\u6301 Claude",
    category: "openai-compatible",
    website: "https://302.ai",
    requiresApiKey: true,
    baseUrl: "https://api.302.ai/v1",
    models: [
      "claude-sonnet-4-20250514",
      "claude-3-5-sonnet-20241022",
      "gpt-4o",
      "gpt-4-turbo"
    ],
    defaultModel: "claude-sonnet-4-20250514",
    features: ["chat", "vision", "tools", "streaming", "code"],
    instructions: {
      en: "Register at 302.ai and get your API key from dashboard",
      zh: "\u5728 302.ai \u6CE8\u518C\u5E76\u4ECE\u63A7\u5236\u53F0\u83B7\u53D6 API \u5BC6\u94A5"
    }
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    nameZh: "OpenRouter",
    description: "Unified API for multiple AI models",
    descriptionZh: "\u7EDF\u4E00\u591A\u6A21\u578B API \u63A5\u53E3",
    category: "openai-compatible",
    website: "https://openrouter.ai",
    requiresApiKey: true,
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "anthropic/claude-sonnet-4",
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3.7-sonnet:thinking",
      "google/gemini-2.5-pro-preview"
    ],
    defaultModel: "anthropic/claude-sonnet-4",
    features: ["chat", "vision", "tools", "streaming", "thinking", "code"],
    transformer: {
      use: ["openrouter"]
    },
    instructions: {
      en: "Get your API key from https://openrouter.ai/keys",
      zh: "\u4ECE https://openrouter.ai/keys \u83B7\u53D6 API \u5BC6\u94A5"
    }
  },
  // === Chinese Providers ===
  {
    id: "deepseek",
    name: "DeepSeek",
    nameZh: "DeepSeek \u6DF1\u5EA6\u6C42\u7D22",
    description: "High-performance Chinese AI with reasoning capabilities",
    descriptionZh: "\u9AD8\u6027\u80FD\u56FD\u4EA7 AI\uFF0C\u652F\u6301\u6DF1\u5EA6\u63A8\u7406",
    category: "chinese",
    website: "https://platform.deepseek.com",
    requiresApiKey: true,
    baseUrl: "https://api.deepseek.com",
    models: ["deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
    features: ["chat", "tools", "streaming", "thinking", "code"],
    transformer: {
      "use": ["deepseek"],
      "deepseek-chat": { use: ["tooluse"] }
    },
    instructions: {
      en: "Get your API key from https://platform.deepseek.com/api_keys",
      zh: "\u4ECE https://platform.deepseek.com/api_keys \u83B7\u53D6 API \u5BC6\u94A5"
    }
  },
  {
    id: "qwen",
    name: "Qwen (Alibaba)",
    nameZh: "\u901A\u4E49\u5343\u95EE (\u963F\u91CC\u5DF4\u5DF4)",
    description: "Alibaba Cloud Qwen models via DashScope",
    descriptionZh: "\u963F\u91CC\u4E91\u901A\u4E49\u5343\u95EE\u5927\u6A21\u578B",
    category: "chinese",
    website: "https://dashscope.console.aliyun.com",
    requiresApiKey: true,
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen3-coder-plus", "qwen-max", "qwen-turbo"],
    defaultModel: "qwen3-coder-plus",
    features: ["chat", "vision", "tools", "streaming", "code"],
    transformer: {
      "use": [["maxtoken", { max_tokens: 65536 }]],
      "qwen3-coder-plus": { use: ["enhancetool"] }
    },
    instructions: {
      en: "Get your API key from Alibaba Cloud DashScope console",
      zh: "\u4ECE\u963F\u91CC\u4E91 DashScope \u63A7\u5236\u53F0\u83B7\u53D6 API \u5BC6\u94A5"
    }
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    nameZh: "SiliconFlow \u7845\u57FA\u6D41\u52A8",
    description: "High-speed inference for multiple models",
    descriptionZh: "\u9AD8\u901F\u591A\u6A21\u578B\u63A8\u7406\u5E73\u53F0",
    category: "chinese",
    website: "https://siliconflow.cn",
    requiresApiKey: true,
    baseUrl: "https://api.siliconflow.cn/v1",
    models: ["moonshotai/Kimi-K2-Instruct", "deepseek-ai/DeepSeek-V3"],
    defaultModel: "moonshotai/Kimi-K2-Instruct",
    features: ["chat", "tools", "streaming", "code"],
    transformer: {
      use: [["maxtoken", { max_tokens: 16384 }]]
    },
    instructions: {
      en: "Get your API key from https://cloud.siliconflow.cn",
      zh: "\u4ECE https://cloud.siliconflow.cn \u83B7\u53D6 API \u5BC6\u94A5"
    }
  },
  {
    id: "modelscope",
    name: "ModelScope",
    nameZh: "ModelScope \u9B54\u642D",
    description: "Alibaba ModelScope inference platform",
    descriptionZh: "\u963F\u91CC\u5DF4\u5DF4\u9B54\u642D\u63A8\u7406\u5E73\u53F0",
    category: "chinese",
    website: "https://modelscope.cn",
    requiresApiKey: true,
    baseUrl: "https://api-inference.modelscope.cn/v1",
    models: [
      "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "ZhipuAI/GLM-4.5"
    ],
    defaultModel: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    features: ["chat", "tools", "streaming", "thinking", "code"],
    transformer: {
      "use": [["maxtoken", { max_tokens: 65536 }]],
      "Qwen/Qwen3-Coder-480B-A35B-Instruct": { use: ["enhancetool"] },
      "Qwen/Qwen3-235B-A22B-Thinking-2507": { use: ["reasoning"] }
    },
    instructions: {
      en: "Get your API key from ModelScope console",
      zh: "\u4ECE\u9B54\u642D\u63A7\u5236\u53F0\u83B7\u53D6 API \u5BC6\u94A5"
    }
  },
  {
    id: "volcengine",
    name: "Volcengine (ByteDance)",
    nameZh: "\u706B\u5C71\u5F15\u64CE (\u5B57\u8282\u8DF3\u52A8)",
    description: "ByteDance AI platform with DeepSeek models",
    descriptionZh: "\u5B57\u8282\u8DF3\u52A8 AI \u5E73\u53F0\uFF0C\u652F\u6301 DeepSeek",
    category: "chinese",
    website: "https://console.volcengine.com",
    requiresApiKey: true,
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    models: ["deepseek-v3-250324", "deepseek-r1-250528"],
    defaultModel: "deepseek-v3-250324",
    features: ["chat", "tools", "streaming", "thinking", "code"],
    transformer: {
      use: ["deepseek"]
    },
    instructions: {
      en: "Get your API key from Volcengine console",
      zh: "\u4ECE\u706B\u5C71\u5F15\u64CE\u63A7\u5236\u53F0\u83B7\u53D6 API \u5BC6\u94A5"
    }
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    nameZh: "Kimi (\u6708\u4E4B\u6697\u9762)",
    description: "Moonshot AI with long context support",
    descriptionZh: "\u6708\u4E4B\u6697\u9762 AI\uFF0C\u652F\u6301\u8D85\u957F\u4E0A\u4E0B\u6587",
    category: "chinese",
    website: "https://platform.moonshot.cn",
    requiresApiKey: true,
    baseUrl: "https://api.moonshot.cn/v1",
    models: ["moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"],
    defaultModel: "moonshot-v1-128k",
    features: ["chat", "tools", "streaming", "code"],
    instructions: {
      en: "Get your API key from https://platform.moonshot.cn/console/api-keys",
      zh: "\u4ECE https://platform.moonshot.cn/console/api-keys \u83B7\u53D6 API \u5BC6\u94A5"
    }
  },
  {
    id: "glm",
    name: "GLM (Zhipu AI)",
    nameZh: "GLM (\u667A\u8C31 AI)",
    description: "Zhipu AI ChatGLM models",
    descriptionZh: "\u667A\u8C31 AI ChatGLM \u5927\u6A21\u578B",
    category: "chinese",
    website: "https://open.bigmodel.cn",
    requiresApiKey: true,
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4-plus", "glm-4", "glm-4-flash"],
    defaultModel: "glm-4-plus",
    features: ["chat", "vision", "tools", "streaming", "code"],
    instructions: {
      en: "Get your API key from https://open.bigmodel.cn/usercenter/apikeys",
      zh: "\u4ECE https://open.bigmodel.cn/usercenter/apikeys \u83B7\u53D6 API \u5BC6\u94A5"
    }
  },
  // === Google Gemini ===
  {
    id: "gemini",
    name: "Google Gemini",
    nameZh: "Google Gemini",
    description: "Google AI models with multimodal capabilities",
    descriptionZh: "Google AI \u591A\u6A21\u6001\u6A21\u578B",
    category: "openai-compatible",
    website: "https://aistudio.google.com",
    requiresApiKey: true,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models/",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-pro"],
    defaultModel: "gemini-2.5-flash",
    features: ["chat", "vision", "tools", "streaming", "thinking", "code"],
    transformer: {
      use: ["gemini"]
    },
    instructions: {
      en: "Get your API key from https://aistudio.google.com/app/apikey",
      zh: "\u4ECE https://aistudio.google.com/app/apikey \u83B7\u53D6 API \u5BC6\u94A5"
    }
  },
  // === Free Tier Providers ===
  {
    id: "groq",
    name: "Groq",
    nameZh: "Groq",
    description: "Ultra-fast inference with free tier",
    descriptionZh: "\u8D85\u5FEB\u63A8\u7406\uFF0C\u6709\u514D\u8D39\u989D\u5EA6",
    category: "free",
    website: "https://console.groq.com",
    requiresApiKey: true,
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
    defaultModel: "llama-3.3-70b-versatile",
    features: ["chat", "tools", "streaming", "code"],
    instructions: {
      en: "Get your free API key from https://console.groq.com/keys",
      zh: "\u4ECE https://console.groq.com/keys \u83B7\u53D6\u514D\u8D39 API \u5BC6\u94A5"
    }
  },
  // === Local Providers ===
  {
    id: "ollama",
    name: "Ollama (Local)",
    nameZh: "Ollama (\u672C\u5730)",
    description: "Run AI models locally with Ollama",
    descriptionZh: "\u4F7F\u7528 Ollama \u672C\u5730\u8FD0\u884C AI \u6A21\u578B",
    category: "local",
    website: "https://ollama.ai",
    requiresApiKey: false,
    baseUrl: "http://localhost:11434/v1",
    models: ["llama3.2", "codellama", "qwen2.5-coder"],
    defaultModel: "llama3.2",
    features: ["chat", "streaming", "code"],
    instructions: {
      en: "Install Ollama from https://ollama.ai and run: ollama pull llama3.2",
      zh: "\u4ECE https://ollama.ai \u5B89\u88C5 Ollama \u5E76\u8FD0\u884C: ollama pull llama3.2"
    }
  }
];
function getAllPresets() {
  return PROVIDER_PRESETS;
}
function getPresetById(id) {
  return PROVIDER_PRESETS.find((p) => p.id === id);
}
function getRecommendedPresets() {
  const recommendedIds = ["anthropic", "302ai", "deepseek", "openrouter", "qwen"];
  return recommendedIds.map((id) => getPresetById(id)).filter((p) => p !== void 0);
}
function getChinesePresets() {
  return PROVIDER_PRESETS.filter(
    (p) => p.category === "chinese" || p.id === "302ai"
  );
}

const CLAUDE_DIR = join(homedir(), ".claude");
const SETTINGS_FILE = join(CLAUDE_DIR, "settings.json");
function readSettings() {
  if (!existsSync(SETTINGS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
  } catch {
    return {};
  }
}
function writeSettings(settings) {
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
  }
  writeFileAtomic(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
function configureSimpleMode(config) {
  try {
    const settings = readSettings();
    if (!settings.env) {
      settings.env = {};
    }
    delete settings.env.ANTHROPIC_AUTH_TOKEN;
    settings.env.ANTHROPIC_API_KEY = config.apiKey;
    settings.env.ANTHROPIC_BASE_URL = config.baseUrl;
    writeSettings(settings);
    return {
      success: true,
      mode: "simple",
      provider: config.provider,
      message: `API configured successfully for ${config.provider}`
    };
  } catch (error) {
    return {
      success: false,
      mode: "simple",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function configureOfficialMode(apiKey) {
  try {
    const settings = readSettings();
    if (!settings.env) {
      settings.env = {};
    }
    delete settings.env.ANTHROPIC_BASE_URL;
    delete settings.env.ANTHROPIC_AUTH_TOKEN;
    settings.env.ANTHROPIC_API_KEY = apiKey;
    writeSettings(settings);
    return {
      success: true,
      mode: "official",
      provider: "anthropic",
      message: "Official Anthropic API configured successfully"
    };
  } catch (error) {
    return {
      success: false,
      mode: "official",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function configureWithPreset(preset, apiKey) {
  if (preset.id === "anthropic") {
    return configureOfficialMode(apiKey);
  }
  return configureSimpleMode({
    mode: "simple",
    provider: preset.id,
    apiKey,
    baseUrl: preset.baseUrl,
    model: preset.defaultModel
  });
}
function getCurrentConfig() {
  try {
    const settings = readSettings();
    if (!settings.env) {
      return null;
    }
    return {
      ANTHROPIC_BASE_URL: settings.env.ANTHROPIC_BASE_URL,
      ANTHROPIC_API_KEY: settings.env.ANTHROPIC_API_KEY,
      ANTHROPIC_AUTH_TOKEN: settings.env.ANTHROPIC_AUTH_TOKEN
    };
  } catch {
    return null;
  }
}
function detectCurrentMode() {
  const config = getCurrentConfig();
  if (!config) {
    return { mode: "none" };
  }
  if (config.ANTHROPIC_BASE_URL?.includes("127.0.0.1:3456") || config.ANTHROPIC_BASE_URL?.includes("localhost:3456")) {
    return { mode: "ccr", provider: "ccr" };
  }
  if (!config.ANTHROPIC_BASE_URL || config.ANTHROPIC_BASE_URL.includes("api.anthropic.com")) {
    if (config.ANTHROPIC_AUTH_TOKEN) {
      return { mode: "official", provider: "anthropic-oauth" };
    }
    if (config.ANTHROPIC_API_KEY) {
      return { mode: "official", provider: "anthropic" };
    }
    return { mode: "none" };
  }
  const baseUrl = config.ANTHROPIC_BASE_URL.toLowerCase();
  let provider = "custom";
  if (baseUrl.includes("302.ai"))
    provider = "302ai";
  else if (baseUrl.includes("openrouter.ai"))
    provider = "openrouter";
  else if (baseUrl.includes("deepseek.com"))
    provider = "deepseek";
  else if (baseUrl.includes("dashscope.aliyuncs.com"))
    provider = "qwen";
  else if (baseUrl.includes("siliconflow.cn"))
    provider = "siliconflow";
  else if (baseUrl.includes("modelscope.cn"))
    provider = "modelscope";
  else if (baseUrl.includes("volces.com"))
    provider = "volcengine";
  else if (baseUrl.includes("moonshot.cn"))
    provider = "kimi";
  else if (baseUrl.includes("bigmodel.cn"))
    provider = "glm";
  else if (baseUrl.includes("generativelanguage.googleapis.com"))
    provider = "gemini";
  else if (baseUrl.includes("groq.com"))
    provider = "groq";
  else if (baseUrl.includes("localhost:11434"))
    provider = "ollama";
  return { mode: "simple", provider };
}
function validateApiKey(apiKey, provider) {
  if (!apiKey || apiKey.trim() === "") {
    return { valid: false, message: "API key is required" };
  }
  if (provider === "anthropic") {
    if (!apiKey.startsWith("sk-ant-")) {
      return { valid: false, message: "Anthropic API key should start with sk-ant-" };
    }
  }
  if (provider === "openrouter") {
    if (!apiKey.startsWith("sk-or-")) {
      return { valid: false, message: "OpenRouter API key should start with sk-or-" };
    }
  }
  return { valid: true };
}
function quickSetup(providerId, apiKey) {
  const preset = getPresetById(providerId);
  if (!preset) {
    return {
      success: false,
      mode: "simple",
      error: `Unknown provider: ${providerId}`
    };
  }
  if (preset.requiresApiKey) {
    const validation = validateApiKey(apiKey, providerId);
    if (!validation.valid) {
      return {
        success: false,
        mode: "simple",
        error: validation.message
      };
    }
  }
  return configureWithPreset(preset, apiKey);
}

function displayCurrentStatus(lang = "en") {
  const { mode, provider } = detectCurrentMode();
  const config = getCurrentConfig();
  console.log("");
  console.log(ansis.green("\u2550".repeat(50)));
  console.log(ansis.bold.cyan(lang === "zh-CN" ? "  \u5F53\u524D API \u914D\u7F6E" : "  Current API Configuration"));
  console.log(ansis.green("\u2550".repeat(50)));
  console.log("");
  if (mode === "none") {
    console.log(ansis.yellow(lang === "zh-CN" ? "  \u26A0 \u672A\u914D\u7F6E API" : "  \u26A0 No API configured"));
    console.log("");
    return;
  }
  const modeLabels = {
    official: lang === "zh-CN" ? "\u5B98\u65B9 Anthropic" : "Official Anthropic",
    simple: lang === "zh-CN" ? "\u7B80\u5355\u6A21\u5F0F (API \u4E2D\u8F6C)" : "Simple Mode (API Proxy)",
    ccr: lang === "zh-CN" ? "CCR \u9AD8\u7EA7\u8DEF\u7531" : "CCR Advanced Router"
  };
  console.log(`  ${ansis.bold(lang === "zh-CN" ? "\u6A21\u5F0F:" : "Mode:")} ${ansis.green(modeLabels[mode])}`);
  if (provider) {
    const preset = getPresetById(provider);
    const providerName = preset ? lang === "zh-CN" ? preset.nameZh : preset.name : provider;
    console.log(`  ${ansis.bold(lang === "zh-CN" ? "\u63D0\u4F9B\u5546:" : "Provider:")} ${ansis.green(providerName)}`);
  }
  if (config?.ANTHROPIC_BASE_URL) {
    console.log(`  ${ansis.bold("Base URL:")} ${ansis.gray(config.ANTHROPIC_BASE_URL)}`);
  }
  if (config?.ANTHROPIC_API_KEY) {
    const masked = `${config.ANTHROPIC_API_KEY.substring(0, 10)}...`;
    console.log(`  ${ansis.bold("API Key:")} ${ansis.gray(masked)}`);
  }
  console.log("");
}
async function runConfigWizard(lang = "en") {
  console.log("");
  console.log(ansis.green("\u2550".repeat(50)));
  console.log(ansis.bold.cyan(lang === "zh-CN" ? "  API \u914D\u7F6E\u5411\u5BFC" : "  API Configuration Wizard"));
  console.log(ansis.green("\u2550".repeat(50)));
  console.log("");
  const modeChoices = [
    {
      name: lang === "zh-CN" ? "1. \u5FEB\u901F\u914D\u7F6E (\u63A8\u8350) - \u9009\u62E9\u9884\u8BBE\u63D0\u4F9B\u5546" : "1. Quick Setup (Recommended) - Choose preset provider",
      value: "quick"
    },
    {
      name: lang === "zh-CN" ? "2. \u5B98\u65B9 Anthropic API - \u76F4\u63A5\u8FDE\u63A5 Anthropic" : "2. Official Anthropic API - Direct connection",
      value: "official"
    },
    {
      name: lang === "zh-CN" ? "3. \u81EA\u5B9A\u4E49\u914D\u7F6E - \u624B\u52A8\u8F93\u5165 API \u5730\u5740\u548C\u5BC6\u94A5" : "3. Custom Configuration - Manual API URL and key",
      value: "custom"
    },
    {
      name: lang === "zh-CN" ? "4. CCR \u9AD8\u7EA7\u8DEF\u7531 - \u5B8C\u6574 Claude Code Router \u914D\u7F6E" : "4. CCR Advanced Router - Full Claude Code Router setup",
      value: "ccr"
    }
  ];
  const { mode } = await inquirer.prompt({
    type: "list",
    name: "mode",
    message: lang === "zh-CN" ? "\u9009\u62E9\u914D\u7F6E\u6A21\u5F0F:" : "Select configuration mode:",
    choices: modeChoices
  });
  switch (mode) {
    case "quick":
      return await runQuickSetup(lang);
    case "official":
      return await runOfficialSetup(lang);
    case "custom":
      return await runCustomSetup(lang);
    case "ccr":
      return await runCcrSetup(lang);
    default:
      return { success: false, mode: "simple", error: "Unknown mode" };
  }
}
async function runQuickSetup(lang) {
  const recommended = getRecommendedPresets();
  const chinese = getChinesePresets().filter((p) => !recommended.find((r) => r.id === p.id));
  const all = getAllPresets();
  const choices = [
    new inquirer.Separator(lang === "zh-CN" ? "\u2500\u2500\u2500 \u63A8\u8350 \u2500\u2500\u2500" : "\u2500\u2500\u2500 Recommended \u2500\u2500\u2500"),
    ...recommended.map((p, i) => ({
      name: `${i + 1}. ${lang === "zh-CN" ? p.nameZh : p.name} - ${lang === "zh-CN" ? p.descriptionZh : p.description}`,
      value: p.id
    })),
    new inquirer.Separator(lang === "zh-CN" ? "\u2500\u2500\u2500 \u56FD\u5185\u670D\u52A1 \u2500\u2500\u2500" : "\u2500\u2500\u2500 Chinese Providers \u2500\u2500\u2500"),
    ...chinese.map((p, i) => ({
      name: `${recommended.length + i + 1}. ${lang === "zh-CN" ? p.nameZh : p.name} - ${lang === "zh-CN" ? p.descriptionZh : p.description}`,
      value: p.id
    })),
    new inquirer.Separator(lang === "zh-CN" ? "\u2500\u2500\u2500 \u66F4\u591A \u2500\u2500\u2500" : "\u2500\u2500\u2500 More \u2500\u2500\u2500"),
    {
      name: lang === "zh-CN" ? "\u67E5\u770B\u6240\u6709\u63D0\u4F9B\u5546..." : "View all providers...",
      value: "__all__"
    }
  ];
  const { providerId } = await inquirer.prompt({
    type: "list",
    name: "providerId",
    message: lang === "zh-CN" ? "\u9009\u62E9 API \u63D0\u4F9B\u5546:" : "Select API provider:",
    choices,
    pageSize: 15
  });
  let finalProviderId = providerId;
  if (providerId === "__all__") {
    const allChoices = all.map((p, i) => ({
      name: `${i + 1}. [${p.category}] ${lang === "zh-CN" ? p.nameZh : p.name}`,
      value: p.id
    }));
    const result2 = await inquirer.prompt({
      type: "list",
      name: "providerId",
      message: lang === "zh-CN" ? "\u9009\u62E9\u63D0\u4F9B\u5546:" : "Select provider:",
      choices: allChoices,
      pageSize: 20
    });
    finalProviderId = result2.providerId;
  }
  const preset = getPresetById(finalProviderId);
  if (!preset) {
    return { success: false, mode: "simple", error: "Provider not found" };
  }
  console.log("");
  console.log(ansis.green(`\u{1F4CB} ${lang === "zh-CN" ? preset.nameZh : preset.name}`));
  if (preset.instructions) {
    console.log(ansis.gray(`   ${lang === "zh-CN" ? preset.instructions.zh : preset.instructions.en}`));
  }
  console.log("");
  let apiKey = "";
  if (preset.requiresApiKey) {
    const { key } = await inquirer.prompt({
      type: "password",
      name: "key",
      message: lang === "zh-CN" ? "\u8F93\u5165 API \u5BC6\u94A5:" : "Enter API key:",
      mask: "*",
      validate: (value) => {
        if (!value)
          return lang === "zh-CN" ? "API \u5BC6\u94A5\u4E0D\u80FD\u4E3A\u7A7A" : "API key is required";
        return true;
      }
    });
    apiKey = key;
  }
  const result = configureWithPreset(preset, apiKey);
  if (result.success) {
    console.log("");
    console.log(ansis.green(`\u2714 ${lang === "zh-CN" ? "API \u914D\u7F6E\u6210\u529F!" : "API configured successfully!"}`));
    console.log(ansis.gray(`  ${lang === "zh-CN" ? "\u63D0\u4F9B\u5546:" : "Provider:"} ${lang === "zh-CN" ? preset.nameZh : preset.name}`));
    console.log(ansis.gray(`  ${lang === "zh-CN" ? "\u9ED8\u8BA4\u6A21\u578B:" : "Default model:"} ${preset.defaultModel}`));
    console.log("");
  }
  return result;
}
async function runOfficialSetup(lang) {
  console.log("");
  console.log(ansis.green(lang === "zh-CN" ? "\u{1F4CB} \u5B98\u65B9 Anthropic API" : "\u{1F4CB} Official Anthropic API"));
  console.log(ansis.gray(lang === "zh-CN" ? "   \u4ECE https://console.anthropic.com/settings/keys \u83B7\u53D6 API \u5BC6\u94A5" : "   Get your API key from https://console.anthropic.com/settings/keys"));
  console.log("");
  const { apiKey } = await inquirer.prompt({
    type: "password",
    name: "apiKey",
    message: lang === "zh-CN" ? "\u8F93\u5165 Anthropic API \u5BC6\u94A5:" : "Enter Anthropic API key:",
    mask: "*",
    validate: (value) => {
      if (!value)
        return lang === "zh-CN" ? "API \u5BC6\u94A5\u4E0D\u80FD\u4E3A\u7A7A" : "API key is required";
      if (!value.startsWith("sk-ant-")) {
        return lang === "zh-CN" ? "Anthropic API \u5BC6\u94A5\u5E94\u4EE5 sk-ant- \u5F00\u5934" : "Anthropic API key should start with sk-ant-";
      }
      return true;
    }
  });
  const result = configureOfficialMode(apiKey);
  if (result.success) {
    console.log("");
    console.log(ansis.green(`\u2714 ${lang === "zh-CN" ? "\u5B98\u65B9 API \u914D\u7F6E\u6210\u529F!" : "Official API configured successfully!"}`));
    console.log("");
  }
  return result;
}
async function runCustomSetup(lang) {
  console.log("");
  console.log(ansis.green(lang === "zh-CN" ? "\u{1F4CB} \u81EA\u5B9A\u4E49 API \u914D\u7F6E" : "\u{1F4CB} Custom API Configuration"));
  console.log("");
  const { baseUrl } = await inquirer.prompt({
    type: "input",
    name: "baseUrl",
    message: lang === "zh-CN" ? "\u8F93\u5165 API Base URL:" : "Enter API Base URL:",
    validate: (value) => {
      if (!value)
        return lang === "zh-CN" ? "URL \u4E0D\u80FD\u4E3A\u7A7A" : "URL is required";
      if (!value.startsWith("http")) {
        return lang === "zh-CN" ? "URL \u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934" : "URL must start with http:// or https://";
      }
      return true;
    }
  });
  const { apiKey } = await inquirer.prompt({
    type: "password",
    name: "apiKey",
    message: lang === "zh-CN" ? "\u8F93\u5165 API \u5BC6\u94A5:" : "Enter API key:",
    mask: "*",
    validate: (value) => {
      if (!value)
        return lang === "zh-CN" ? "API \u5BC6\u94A5\u4E0D\u80FD\u4E3A\u7A7A" : "API key is required";
      return true;
    }
  });
  const result = configureSimpleMode({
    mode: "simple",
    provider: "custom",
    apiKey,
    baseUrl
  });
  if (result.success) {
    console.log("");
    console.log(ansis.green(`\u2714 ${lang === "zh-CN" ? "\u81EA\u5B9A\u4E49 API \u914D\u7F6E\u6210\u529F!" : "Custom API configured successfully!"}`));
    console.log("");
  }
  return result;
}
async function runCcrSetup(lang) {
  console.log("");
  console.log(ansis.green(lang === "zh-CN" ? "\u{1F4CB} CCR \u9AD8\u7EA7\u8DEF\u7531\u914D\u7F6E" : "\u{1F4CB} CCR Advanced Router Configuration"));
  console.log(ansis.gray(lang === "zh-CN" ? "   CCR \u63D0\u4F9B\u5B8C\u6574\u7684\u6A21\u578B\u8DEF\u7531\u3001\u8F6C\u6362\u548C\u591A\u63D0\u4F9B\u5546\u652F\u6301" : "   CCR provides full model routing, transformation, and multi-provider support"));
  console.log("");
  try {
    const { setupCcrConfiguration } = await import('./config3.mjs');
    const success = await setupCcrConfiguration();
    return {
      success,
      mode: "ccr",
      provider: "ccr",
      message: success ? lang === "zh-CN" ? "CCR \u914D\u7F6E\u6210\u529F" : "CCR configured successfully" : lang === "zh-CN" ? "CCR \u914D\u7F6E\u5931\u8D25" : "CCR configuration failed"
    };
  } catch (error) {
    return {
      success: false,
      mode: "ccr",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function testApiConnection(lang = "en") {
  const config = getCurrentConfig();
  if (!config || !config.ANTHROPIC_API_KEY && !config.ANTHROPIC_AUTH_TOKEN) {
    console.log(ansis.yellow(lang === "zh-CN" ? "\u26A0 \u672A\u914D\u7F6E API" : "\u26A0 No API configured"));
    return false;
  }
  console.log(ansis.green(lang === "zh-CN" ? "\u{1F50D} \u6D4B\u8BD5 API \u8FDE\u63A5..." : "\u{1F50D} Testing API connection..."));
  try {
    const baseUrl = config.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
    const testUrl = baseUrl.includes("v1") ? baseUrl : `${baseUrl}/v1/models`;
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "x-api-key": config.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      }
    });
    if (response.ok || response.status === 401) {
      console.log(ansis.green(lang === "zh-CN" ? "\u2714 API \u8FDE\u63A5\u6210\u529F" : "\u2714 API connection successful"));
      return true;
    } else {
      console.log(ansis.yellow(`\u26A0 API returned status: ${response.status}`));
      return false;
    }
  } catch (error) {
    console.log(ansis.red(lang === "zh-CN" ? "\u2716 API \u8FDE\u63A5\u5931\u8D25" : "\u2716 API connection failed"));
    console.log(ansis.gray(`  ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

function listProviders(lang = "en") {
  const presets = getAllPresets();
  console.log("");
  console.log(theme.primary("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"));
  console.log(theme.primary("\u2551") + theme.accent(`                    ${i18n.t("api:providersTitle")}                    `.slice(0, 60)) + theme.primary("\u2551"));
  console.log(theme.primary("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D"));
  console.log("");
  const categories = {
    "official": i18n.t("api:categoryOfficial"),
    "openai-compatible": i18n.t("api:categoryOpenaiCompatible"),
    "chinese": i18n.t("api:categoryChinese"),
    "free": i18n.t("api:categoryFree"),
    "local": i18n.t("api:categoryLocal")
  };
  for (const [category, label] of Object.entries(categories)) {
    const categoryPresets = presets.filter((p) => p.category === category);
    if (categoryPresets.length === 0)
      continue;
    console.log(theme.secondary(`  ${label}:`));
    for (const preset of categoryPresets) {
      const name = lang === "zh-CN" ? preset.nameZh : preset.name;
      const desc = lang === "zh-CN" ? preset.descriptionZh : preset.description;
      const keyIcon = preset.requiresApiKey ? "\u{1F511}" : "\u{1F193}";
      console.log(`    ${keyIcon} ${ansis.green(preset.id.padEnd(15))} ${name}`);
      console.log(ansis.gray(`       ${desc}`));
    }
    console.log("");
  }
}
function setupApi(providerId, apiKey, _lang = "en") {
  const result = quickSetup(providerId, apiKey);
  if (result.success) {
    console.log(STATUS.success(format(i18n.t("api:configSuccess"), { provider: result.provider || providerId })));
  } else {
    console.log(STATUS.error(format(i18n.t("api:configFailed"), { error: result.error || "Unknown error" })));
  }
}
function showStatus(lang = "en") {
  displayCurrentStatus(lang);
}
async function testApi(lang = "en") {
  await testApiConnection(lang);
}
async function runWizard(lang = "en") {
  await runConfigWizard(lang);
}
async function apiCommand(action = "wizard", args = [], options = {}) {
  const lang = options.lang || "en";
  switch (action) {
    case "list":
    case "ls":
    case "providers":
      listProviders(lang);
      break;
    case "setup":
    case "set":
      if (options.provider && options.key) {
        setupApi(options.provider, options.key, lang);
      } else if (args.length >= 2) {
        setupApi(args[0], args[1], lang);
      } else {
        console.log(STATUS.error(i18n.t("api:setupUsage")));
        console.log(ansis.gray(`  ${i18n.t("api:setupExample")}`));
      }
      break;
    case "status":
    case "s":
      showStatus(lang);
      break;
    case "test":
    case "t":
      await testApi(lang);
      break;
    case "wizard":
    case "w":
    case "config":
    default:
      await runWizard(lang);
      break;
  }
}

export { apiCommand, apiCommand as default, listProviders, runWizard, setupApi, showStatus, testApi };
