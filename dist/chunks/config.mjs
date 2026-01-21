import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import process__default from 'node:process';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { getApiProviderPresets } from './api-providers.mjs';
import { SETTINGS_FILE } from './constants.mjs';
import { i18n } from './index.mjs';
import { b as backupExistingConfig } from './config2.mjs';
import 'node:os';
import 'pathe';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'dayjs';
import './claude-config.mjs';
import './json-config.mjs';
import './fs-operations.mjs';
import 'node:crypto';
import 'node:fs/promises';
import './platform.mjs';
import 'tinyexec';

async function getConfig(key, options = {}) {
  const isZh = i18n.language === "zh-CN";
  try {
    const config = readClaudeConfig();
    if (!config) {
      console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  \u914D\u7F6E\u6587\u4EF6\u4E0D\u5B58\u5728" : "\u26A0\uFE0F  Configuration file not found"));
      console.log(ansis.dim(isZh ? '\u8FD0\u884C "ccjk init" \u521D\u59CB\u5316\u914D\u7F6E' : 'Run "ccjk init" to initialize configuration'));
      console.log("");
      return;
    }
    const value = getNestedValue(config, key);
    if (value === void 0) {
      console.log(ansis.yellow(isZh ? `\u26A0\uFE0F  \u914D\u7F6E\u9879 "${key}" \u4E0D\u5B58\u5728` : `\u26A0\uFE0F  Configuration key "${key}" not found`));
      console.log("");
      return;
    }
    if (options.json) {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log("");
      console.log(ansis.bold.cyan(isZh ? `\u{1F4CB} \u914D\u7F6E\u9879: ${key}` : `\u{1F4CB} Configuration: ${key}`));
      console.log(ansis.dim("\u2500".repeat(60)));
      console.log("");
      displayValue(value, 0);
      console.log("");
    }
  } catch (error) {
    console.error(ansis.red(isZh ? "\u274C \u8BFB\u53D6\u914D\u7F6E\u5931\u8D25" : "\u274C Failed to read configuration"));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
    console.log("");
  }
}
async function setConfig(key, value, _options = {}) {
  const isZh = i18n.language === "zh-CN";
  try {
    const config = readClaudeConfig();
    if (!config) {
      console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  \u914D\u7F6E\u6587\u4EF6\u4E0D\u5B58\u5728" : "\u26A0\uFE0F  Configuration file not found"));
      console.log(ansis.dim(isZh ? '\u8FD0\u884C "ccjk init" \u521D\u59CB\u5316\u914D\u7F6E' : 'Run "ccjk init" to initialize configuration'));
      console.log("");
      return;
    }
    const backupPath = backupExistingConfig();
    if (backupPath) {
      console.log(ansis.dim(isZh ? `\u{1F4E6} \u5DF2\u5907\u4EFD\u914D\u7F6E\u5230: ${backupPath}` : `\u{1F4E6} Configuration backed up to: ${backupPath}`));
    }
    let parsedValue = value;
    try {
      parsedValue = JSON.parse(value);
    } catch {
    }
    setNestedValue(config, key, parsedValue);
    writeClaudeConfig(config);
    console.log("");
    console.log(ansis.green(isZh ? `\u2705 \u914D\u7F6E\u9879 "${key}" \u5DF2\u66F4\u65B0` : `\u2705 Configuration "${key}" updated`));
    console.log("");
    console.log(ansis.bold(isZh ? "\u65B0\u503C:" : "New value:"));
    displayValue(parsedValue, 0);
    console.log("");
  } catch (error) {
    console.error(ansis.red(isZh ? "\u274C \u8BBE\u7F6E\u914D\u7F6E\u5931\u8D25" : "\u274C Failed to set configuration"));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
    console.log("");
  }
}
async function listConfig(options = {}) {
  const isZh = i18n.language === "zh-CN";
  try {
    const config = readClaudeConfig();
    if (!config) {
      console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  \u914D\u7F6E\u6587\u4EF6\u4E0D\u5B58\u5728" : "\u26A0\uFE0F  Configuration file not found"));
      console.log(ansis.dim(isZh ? '\u8FD0\u884C "ccjk init" \u521D\u59CB\u5316\u914D\u7F6E' : 'Run "ccjk init" to initialize configuration'));
      console.log("");
      return;
    }
    if (options.json) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }
    console.log("");
    console.log(ansis.bold.cyan(isZh ? "\u{1F4CB} Claude Code \u914D\u7F6E" : "\u{1F4CB} Claude Code Configuration"));
    console.log(ansis.dim("\u2500".repeat(60)));
    console.log("");
    displayConfigSection(isZh ? "API \u914D\u7F6E" : "API Configuration", {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey ? "***" : void 0,
      authToken: config.authToken ? "***" : void 0,
      model: config.model,
      fastModel: config.fastModel
    }, isZh);
    if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
      displayConfigSection(isZh ? "MCP \u670D\u52A1" : "MCP Services", {
        count: Object.keys(config.mcpServers).length,
        services: Object.keys(config.mcpServers)
      }, isZh);
    }
    if (config.customInstructions) {
      displayConfigSection(isZh ? "\u81EA\u5B9A\u4E49\u6307\u4EE4" : "Custom Instructions", {
        length: config.customInstructions.length,
        preview: `${config.customInstructions.substring(0, 100)}...`
      }, isZh);
    }
    console.log("");
    console.log(ansis.dim("\u2500".repeat(60)));
    console.log(ansis.dim(isZh ? `\u914D\u7F6E\u6587\u4EF6: ${SETTINGS_FILE}` : `Config file: ${SETTINGS_FILE}`));
    console.log("");
  } catch (error) {
    console.error(ansis.red(isZh ? "\u274C \u8BFB\u53D6\u914D\u7F6E\u5931\u8D25" : "\u274C Failed to read configuration"));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
    console.log("");
  }
}
async function resetConfig(_options = {}) {
  const isZh = i18n.language === "zh-CN";
  try {
    const config = readClaudeConfig();
    if (!config) {
      console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  \u914D\u7F6E\u6587\u4EF6\u4E0D\u5B58\u5728" : "\u26A0\uFE0F  Configuration file not found"));
      console.log("");
      return;
    }
    const { confirm } = await inquirer.prompt({
      type: "confirm",
      name: "confirm",
      message: isZh ? "\u786E\u5B9A\u8981\u91CD\u7F6E\u914D\u7F6E\u5417\uFF1F\u8FD9\u5C06\u5220\u9664\u6240\u6709\u81EA\u5B9A\u4E49\u8BBE\u7F6E\u3002" : "Are you sure you want to reset configuration? This will remove all custom settings.",
      default: false
    });
    if (!confirm) {
      console.log(ansis.yellow(isZh ? "\u5DF2\u53D6\u6D88" : "Cancelled"));
      console.log("");
      return;
    }
    const backupPath = backupExistingConfig();
    if (backupPath) {
      console.log(ansis.dim(isZh ? `\u{1F4E6} \u5DF2\u5907\u4EFD\u914D\u7F6E\u5230: ${backupPath}` : `\u{1F4E6} Configuration backed up to: ${backupPath}`));
    }
    const minimalConfig = {
      completedOnboarding: true
    };
    writeClaudeConfig(minimalConfig);
    console.log("");
    console.log(ansis.green(isZh ? "\u2705 \u914D\u7F6E\u5DF2\u91CD\u7F6E" : "\u2705 Configuration reset"));
    console.log(ansis.dim(isZh ? '\u8FD0\u884C "ccjk init" \u91CD\u65B0\u914D\u7F6E' : 'Run "ccjk init" to reconfigure'));
    console.log("");
  } catch (error) {
    console.error(ansis.red(isZh ? "\u274C \u91CD\u7F6E\u914D\u7F6E\u5931\u8D25" : "\u274C Failed to reset configuration"));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
    console.log("");
  }
}
async function setProvider(providerId, options = {}) {
  const isZh = i18n.language === "zh-CN";
  const codeType = options.codeType || "claude-code";
  try {
    const providers = await getApiProviderPresets(codeType);
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) {
      console.log(ansis.yellow(isZh ? `\u26A0\uFE0F  \u4F9B\u5E94\u5546 "${providerId}" \u4E0D\u5B58\u5728` : `\u26A0\uFE0F  Provider "${providerId}" not found`));
      console.log("");
      console.log(ansis.dim(isZh ? "\u53EF\u7528\u7684\u4F9B\u5E94\u5546:" : "Available providers:"));
      for (const p of providers) {
        console.log(`  - ${p.id} (${p.name})`);
      }
      console.log("");
      return;
    }
    const config = readClaudeConfig();
    if (!config) {
      console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  \u914D\u7F6E\u6587\u4EF6\u4E0D\u5B58\u5728" : "\u26A0\uFE0F  Configuration file not found"));
      console.log(ansis.dim(isZh ? '\u8FD0\u884C "ccjk init" \u521D\u59CB\u5316\u914D\u7F6E' : 'Run "ccjk init" to initialize configuration'));
      console.log("");
      return;
    }
    const backupPath = backupExistingConfig();
    if (backupPath) {
      console.log(ansis.dim(isZh ? `\u{1F4E6} \u5DF2\u5907\u4EFD\u914D\u7F6E\u5230: ${backupPath}` : `\u{1F4E6} Configuration backed up to: ${backupPath}`));
    }
    if (codeType === "claude-code" && provider.claudeCode) {
      config.baseUrl = provider.claudeCode.baseUrl;
      if (provider.claudeCode.defaultModels && provider.claudeCode.defaultModels.length > 0) {
        config.model = provider.claudeCode.defaultModels[0];
        if (provider.claudeCode.defaultModels.length > 1) {
          config.fastModel = provider.claudeCode.defaultModels[1];
        }
      }
    }
    writeClaudeConfig(config);
    console.log("");
    console.log(ansis.green(isZh ? `\u2705 \u5DF2\u5207\u6362\u5230\u4F9B\u5E94\u5546: ${provider.name}` : `\u2705 Switched to provider: ${provider.name}`));
    console.log("");
    console.log(ansis.bold(isZh ? "\u914D\u7F6E\u8BE6\u60C5:" : "Configuration details:"));
    console.log(`  ${ansis.green(isZh ? "\u4F9B\u5E94\u5546" : "Provider")}: ${provider.name}`);
    console.log(`  ${ansis.green(isZh ? "\u63A5\u53E3\u5730\u5740" : "Base URL")}: ${config.baseUrl}`);
    if (config.model) {
      console.log(`  ${ansis.green(isZh ? "\u4E3B\u6A21\u578B" : "Primary Model")}: ${config.model}`);
    }
    if (config.fastModel) {
      console.log(`  ${ansis.green(isZh ? "\u5FEB\u901F\u6A21\u578B" : "Fast Model")}: ${config.fastModel}`);
    }
    console.log("");
    console.log(ansis.dim(isZh ? "\u{1F4A1} \u63D0\u793A: \u8BF7\u786E\u4FDD\u5DF2\u8BBE\u7F6E\u6B63\u786E\u7684 API \u5BC6\u94A5\u6216\u8BA4\u8BC1\u4EE4\u724C" : "\u{1F4A1} Tip: Make sure to set the correct API key or auth token"));
    console.log("");
  } catch (error) {
    console.error(ansis.red(isZh ? "\u274C \u8BBE\u7F6E\u4F9B\u5E94\u5546\u5931\u8D25" : "\u274C Failed to set provider"));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
    console.log("");
  }
}
async function configCommand(action, args, options = {}) {
  switch (action) {
    case "get":
      if (args.length === 0) {
        const isZh = i18n.language === "zh-CN";
        console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  \u8BF7\u6307\u5B9A\u914D\u7F6E\u9879" : "\u26A0\uFE0F  Please specify a configuration key"));
        console.log(ansis.dim(isZh ? "\u7528\u6CD5: ccjk config get <key>" : "Usage: ccjk config get <key>"));
        console.log("");
        return;
      }
      await getConfig(args[0], options);
      break;
    case "set":
      if (args.length < 2) {
        const isZh = i18n.language === "zh-CN";
        console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  \u8BF7\u6307\u5B9A\u914D\u7F6E\u9879\u548C\u503C" : "\u26A0\uFE0F  Please specify key and value"));
        console.log(ansis.dim(isZh ? "\u7528\u6CD5: ccjk config set <key> <value>" : "Usage: ccjk config set <key> <value>"));
        console.log("");
        return;
      }
      await setConfig(args[0], args.slice(1).join(" "), options);
      break;
    case "list":
    case "ls":
      await listConfig(options);
      break;
    case "reset":
      await resetConfig(options);
      break;
    case "provider":
      if (args.length === 0) {
        const isZh = i18n.language === "zh-CN";
        console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  \u8BF7\u6307\u5B9A\u4F9B\u5E94\u5546 ID" : "\u26A0\uFE0F  Please specify provider ID"));
        console.log(ansis.dim(isZh ? "\u7528\u6CD5: ccjk config provider <id>" : "Usage: ccjk config provider <id>"));
        console.log("");
        return;
      }
      await setProvider(args[0], options);
      break;
    default: {
      const isZh = i18n.language === "zh-CN";
      console.log("");
      console.log(ansis.bold.cyan(isZh ? "\u2699\uFE0F  \u914D\u7F6E\u7BA1\u7406\u547D\u4EE4" : "\u2699\uFE0F  Configuration Management Commands"));
      console.log("");
      console.log(`  ${ansis.green("ccjk config get <key>")}           ${isZh ? "\u83B7\u53D6\u914D\u7F6E\u9879" : "Get configuration value"}`);
      console.log(`  ${ansis.green("ccjk config set <key> <value>")}  ${isZh ? "\u8BBE\u7F6E\u914D\u7F6E\u9879" : "Set configuration value"}`);
      console.log(`  ${ansis.green("ccjk config list")}                ${isZh ? "\u5217\u51FA\u6240\u6709\u914D\u7F6E" : "List all configuration"}`);
      console.log(`  ${ansis.green("ccjk config reset")}               ${isZh ? "\u91CD\u7F6E\u914D\u7F6E" : "Reset configuration"}`);
      console.log(`  ${ansis.green("ccjk config provider <id>")}      ${isZh ? "\u5207\u6362\u4F9B\u5E94\u5546" : "Switch provider"}`);
      console.log("");
      console.log(ansis.bold(isZh ? "\u9009\u9879" : "Options"));
      console.log(`  ${ansis.green("--code-type, -T")} <type>   ${isZh ? "\u4EE3\u7801\u5DE5\u5177\u7C7B\u578B (claude-code, codex)" : "Code tool type (claude-code, codex)"}`);
      console.log(`  ${ansis.green("--json, -j")}               ${isZh ? "JSON \u683C\u5F0F\u8F93\u51FA" : "JSON format output"}`);
      console.log("");
      console.log(ansis.bold(isZh ? "\u793A\u4F8B" : "Examples"));
      console.log(`  ${ansis.dim("ccjk config get baseUrl")}`);
      console.log(`  ${ansis.dim('ccjk config set model "claude-3-5-sonnet-20241022"')}`);
      console.log(`  ${ansis.dim("ccjk config provider glm")}`);
      console.log("");
    }
  }
}
function getClaudeConfigPath() {
  return SETTINGS_FILE;
}
function readClaudeConfig() {
  if (!existsSync(SETTINGS_FILE)) {
    return null;
  }
  try {
    const content = readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function writeClaudeConfig(config) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(config, null, 2), "utf-8");
}
function getNestedValue(obj, path) {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current === null || current === void 0) {
      return void 0;
    }
    current = current[key];
  }
  return current;
}
function setNestedValue(obj, path, value) {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}
function displayValue(value, indent) {
  const prefix = "  ".repeat(indent);
  if (value === null) {
    console.log(`${prefix}${ansis.dim("null")}`);
  } else if (typeof value === "boolean") {
    console.log(`${prefix}${ansis.green(value.toString())}`);
  } else if (typeof value === "number") {
    console.log(`${prefix}${ansis.yellow(value.toString())}`);
  } else if (typeof value === "string") {
    console.log(`${prefix}${ansis.green(value)}`);
  } else if (Array.isArray(value)) {
    console.log(`${prefix}${ansis.dim("[")}`);
    for (const item of value) {
      displayValue(item, indent + 1);
    }
    console.log(`${prefix}${ansis.dim("]")}`);
  } else if (typeof value === "object") {
    for (const [key, val] of Object.entries(value)) {
      console.log(`${prefix}${ansis.bold(key)}:`);
      displayValue(val, indent + 1);
    }
  } else {
    console.log(`${prefix}${value}`);
  }
}
function displayConfigSection(title, data, _isZh) {
  console.log(ansis.bold(title));
  console.log("");
  for (const [key, value] of Object.entries(data)) {
    if (value !== void 0) {
      if (Array.isArray(value)) {
        console.log(`  ${ansis.green(key)}: ${value.join(", ")}`);
      } else {
        console.log(`  ${ansis.green(key)}: ${value}`);
      }
    }
  }
  console.log("");
}
async function unsetConfig(key, _options = {}) {
  const isZh = i18n.language === "zh-CN";
  if (!key) {
    console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  \u8BF7\u6307\u5B9A\u914D\u7F6E\u9879" : "\u26A0\uFE0F  Please specify a configuration key"));
    return;
  }
  const config = readClaudeConfig();
  const keys = key.split(".");
  let current = config;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === void 0) {
      console.log(ansis.yellow(isZh ? `\u26A0\uFE0F  \u914D\u7F6E\u9879 "${key}" \u4E0D\u5B58\u5728` : `\u26A0\uFE0F  Configuration key "${key}" does not exist`));
      return;
    }
    current = current[keys[i]];
  }
  const lastKey = keys[keys.length - 1];
  if (current[lastKey] === void 0) {
    console.log(ansis.yellow(isZh ? `\u26A0\uFE0F  \u914D\u7F6E\u9879 "${key}" \u4E0D\u5B58\u5728` : `\u26A0\uFE0F  Configuration key "${key}" does not exist`));
    return;
  }
  delete current[lastKey];
  writeClaudeConfig(config);
  console.log(ansis.green(isZh ? `\u2705 \u5DF2\u5220\u9664\u914D\u7F6E\u9879: ${key}` : `\u2705 Removed configuration: ${key}`));
}
async function editConfig(_options = {}) {
  const isZh = i18n.language === "zh-CN";
  const configPath = getClaudeConfigPath();
  const editor = process__default.env.EDITOR || process__default.env.VISUAL || "vi";
  console.log(ansis.green(isZh ? `\u{1F4DD} \u6B63\u5728\u6253\u5F00\u914D\u7F6E\u6587\u4EF6: ${configPath}` : `\u{1F4DD} Opening config file: ${configPath}`));
  const { spawn } = await import('node:child_process');
  const child = spawn(editor, [configPath], { stdio: "inherit" });
  child.on("exit", (code) => {
    if (code === 0) {
      console.log(ansis.green(isZh ? "\u2705 \u914D\u7F6E\u6587\u4EF6\u5DF2\u4FDD\u5B58" : "\u2705 Config file saved"));
    }
  });
}
async function validateConfig(_options = {}) {
  const isZh = i18n.language === "zh-CN";
  console.log(ansis.green(isZh ? "\u{1F50D} \u6B63\u5728\u9A8C\u8BC1\u914D\u7F6E..." : "\u{1F50D} Validating configuration..."));
  console.log("");
  const config = readClaudeConfig();
  const errors = [];
  const warnings = [];
  if (!config.apiKey) {
    errors.push(isZh ? "apiKey \u672A\u8BBE\u7F6E" : "apiKey is not set");
  }
  if (!config.baseUrl) {
    warnings.push(isZh ? "baseUrl \u672A\u8BBE\u7F6E\uFF0C\u5C06\u4F7F\u7528\u9ED8\u8BA4\u503C" : "baseUrl is not set, will use default");
  }
  if (config.model && typeof config.model !== "string") {
    errors.push(isZh ? "model \u683C\u5F0F\u65E0\u6548" : "model format is invalid");
  }
  if (errors.length === 0 && warnings.length === 0) {
    console.log(ansis.green(isZh ? "\u2705 \u914D\u7F6E\u9A8C\u8BC1\u901A\u8FC7" : "\u2705 Configuration is valid"));
  } else {
    if (errors.length > 0) {
      console.log(ansis.red(isZh ? "\u274C \u9519\u8BEF:" : "\u274C Errors:"));
      for (const error of errors) {
        console.log(ansis.red(`  \u2022 ${error}`));
      }
      console.log("");
    }
    if (warnings.length > 0) {
      console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  \u8B66\u544A:" : "\u26A0\uFE0F  Warnings:"));
      for (const warning of warnings) {
        console.log(ansis.yellow(`  \u2022 ${warning}`));
      }
    }
  }
}

export { configCommand, editConfig, getConfig, listConfig, resetConfig, setConfig, setProvider, unsetConfig, validateConfig };
