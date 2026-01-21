import process__default from 'node:process';
import { fileURLToPath } from 'node:url';
import ansis from 'ansis';
import dayjs from 'dayjs';
import inquirer from 'inquirer';
import ora from 'ora';
import { join, dirname } from 'pathe';
import semver from 'semver';
import { parse } from 'smol-toml';
import { x } from 'tinyexec';
import { SUPPORTED_LANGS, CODEX_DIR, CODEX_AGENTS_FILE, CODEX_CONFIG_FILE, CODEX_PROMPTS_DIR, CODEX_AUTH_FILE, AI_OUTPUT_LANGUAGES, ZCF_CONFIG_FILE } from './constants.mjs';
import { ensureI18nInitialized, i18n, format } from './index.mjs';
import { updateZcfConfig, readZcfConfig, readDefaultTomlConfig, updateTomlConfig } from './ccjk-config.mjs';
import { a as applyAiLanguageDirective } from './config2.mjs';
import { exists, readFile, ensureDir, writeFileAtomic, writeFile, copyFile, copyDir } from './fs-operations.mjs';
import { readJsonConfig, writeJsonConfig } from './json-config.mjs';
import { k as isWindows, l as getMcpCommand, m as getSystemRoot, w as wrapCommandWithSudo, n as normalizeTomlPath } from './platform.mjs';
import { a as addNumbersToChoices } from '../shared/ccjk.BFQ7yr5S.mjs';
import { resolveAiOutputLanguage } from './prompts.mjs';
import { p as promptBoolean } from '../shared/ccjk.DHbrGcgg.mjs';
import 'node:child_process';
import { homedir } from 'node:os';

function detectConfigManagementMode() {
  try {
    const config = readCodexConfig();
    if (!config || !config.providers || config.providers.length === 0) {
      return {
        mode: "initial",
        hasProviders: false,
        providerCount: 0
      };
    }
    return {
      mode: "management",
      hasProviders: true,
      providerCount: config.providers.length,
      currentProvider: config.modelProvider,
      providers: config.providers,
      isUnmanaged: config.managed === false ? true : void 0
    };
  } catch (error) {
    return {
      mode: "initial",
      hasProviders: false,
      providerCount: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

const PLAYWRIGHT_PROFILES_DIR = join(homedir(), ".ccjk", "playwright");
function createPlaywrightMcpConfig(options = {}) {
  const {
    profile = "default",
    headless = false,
    browser = "chromium",
    userDataDir
  } = options;
  const resolvedUserDataDir = userDataDir || join(PLAYWRIGHT_PROFILES_DIR, profile);
  const args = ["-y", "@playwright/mcp@latest"];
  args.push("--browser", browser);
  args.push("--user-data-dir", resolvedUserDataDir);
  if (headless) {
    args.push("--headless");
  }
  return {
    type: "stdio",
    command: "npx",
    args,
    env: {}
  };
}
const MCP_SERVICE_CONFIGS = [
  // Documentation and Search Services - Universal (no GUI required)
  {
    id: "context7",
    requiresApiKey: false,
    config: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
      env: {}
    }
    // Works on all platforms - no special requirements
  },
  {
    id: "open-websearch",
    requiresApiKey: false,
    config: {
      type: "stdio",
      command: "npx",
      args: ["-y", "open-websearch@latest"],
      env: {
        MODE: "stdio",
        DEFAULT_SEARCH_ENGINE: "duckduckgo",
        ALLOWED_SEARCH_ENGINES: "duckduckgo,bing,brave"
      }
    }
    // Works on all platforms - no special requirements
  },
  {
    id: "mcp-deepwiki",
    requiresApiKey: false,
    config: {
      type: "stdio",
      command: "npx",
      args: ["-y", "mcp-deepwiki@latest"],
      env: {}
    }
    // Works on all platforms - no special requirements
  },
  // Development Workflow Services
  {
    id: "spec-workflow",
    requiresApiKey: false,
    config: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@pimzino/spec-workflow-mcp@latest"],
      env: {}
    }
    // Works on all platforms - no special requirements
  },
  {
    id: "serena",
    requiresApiKey: false,
    config: {
      type: "stdio",
      command: "uvx",
      args: ["--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server", "--context", "ide-assistant", "--enable-web-dashboard", "false"],
      env: {}
    },
    platformRequirements: {
      requiredCommands: ["uvx"]
      // Requires uv/uvx to be installed
    }
  },
  // Browser and Automation Services - Require GUI environment
  {
    id: "Playwright",
    requiresApiKey: false,
    config: createPlaywrightMcpConfig(),
    // Uses default profile with chromium browser
    platformRequirements: {
      platforms: ["macos", "windows"],
      // GUI required - exclude headless Linux/WSL/Termux
      requiresGui: true
    }
  },
  // Anthropic Official MCP Services - Universal
  // Note: Removed low-value services: filesystem (buggy), puppeteer (duplicate of Playwright),
  //       memory (Claude has built-in memory), fetch (Claude has WebFetch), sequential-thinking (limited value)
  {
    id: "sqlite",
    requiresApiKey: false,
    config: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@anthropic-ai/mcp-server-sqlite@latest"],
      env: {}
    }
    // Works on all platforms - no special requirements
  }
];
async function getMcpServices() {
  ensureI18nInitialized();
  const mcpServiceList = [
    // Documentation and Search Services
    {
      id: "context7",
      name: i18n.t("mcp:services.context7.name"),
      description: i18n.t("mcp:services.context7.description")
    },
    {
      id: "open-websearch",
      name: i18n.t("mcp:services.open-websearch.name"),
      description: i18n.t("mcp:services.open-websearch.description")
    },
    {
      id: "mcp-deepwiki",
      name: i18n.t("mcp:services.mcp-deepwiki.name"),
      description: i18n.t("mcp:services.mcp-deepwiki.description")
    },
    // Development Workflow Services
    {
      id: "spec-workflow",
      name: i18n.t("mcp:services.spec-workflow.name"),
      description: i18n.t("mcp:services.spec-workflow.description")
    },
    {
      id: "serena",
      name: i18n.t("mcp:services.serena.name"),
      description: i18n.t("mcp:services.serena.description")
    },
    // Browser and Automation Services
    {
      id: "Playwright",
      name: i18n.t("mcp:services.playwright.name"),
      description: i18n.t("mcp:services.playwright.description")
    },
    // Anthropic Official MCP Services
    // Note: Removed low-value services: filesystem (buggy), puppeteer (duplicate),
    //       memory (Claude built-in), fetch (Claude WebFetch), sequential-thinking (limited value)
    {
      id: "sqlite",
      name: i18n.t("mcp:services.sqlite.name"),
      description: i18n.t("mcp:services.sqlite.description")
    }
  ];
  return MCP_SERVICE_CONFIGS.map((config) => {
    const serviceInfo = mcpServiceList.find((s) => s.id === config.id);
    const service = {
      id: config.id,
      name: serviceInfo?.name || config.id,
      description: serviceInfo?.description || "",
      requiresApiKey: config.requiresApiKey,
      config: config.config
    };
    if (config.apiKeyEnvVar) {
      service.apiKeyEnvVar = config.apiKeyEnvVar;
    }
    return service;
  });
}
async function getMcpService(id) {
  const services = await getMcpServices();
  return services.find((service) => service.id === id);
}

async function selectMcpServices() {
  ensureI18nInitialized();
  const mcpServices = await getMcpServices();
  const choices = mcpServices.map((service) => ({
    name: `${service.name} - ${ansis.gray(service.description)}`,
    value: service.id,
    selected: false
  }));
  const { services } = await inquirer.prompt({
    type: "checkbox",
    name: "services",
    message: `${i18n.t("mcp:selectMcpServices")}${i18n.t("common:multiSelectHint")}`,
    choices
  });
  if (services === void 0) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return void 0;
  }
  return services;
}

function applyCodexPlatformCommand(config) {
  if (isWindows() && config.command) {
    const mcpCmd = getMcpCommand(config.command);
    if (mcpCmd[0] === "cmd") {
      config.command = mcpCmd[0];
      config.args = [...mcpCmd.slice(1), ...config.args || []];
    }
  }
}

async function configureCodexMcp(options) {
  ensureI18nInitialized();
  const { skipPrompt = false } = options ?? {};
  const existingConfig = readCodexConfig();
  const backupPath = backupCodexComplete();
  if (backupPath)
    console.log(ansis.gray(getBackupMessage(backupPath)));
  if (skipPrompt) {
    const { runCodexWorkflowSelection } = await Promise.resolve().then(function () { return codex; });
    await runCodexWorkflowSelection({ skipPrompt: true, workflows: options?.workflows ?? [] });
    if (options?.mcpServices === false) {
      updateZcfConfig({ codeToolType: "codex" });
      console.log(ansis.green(i18n.t("codex:mcpConfigured")));
      return;
    }
    const defaultServiceIds = Array.isArray(options?.mcpServices) ? options.mcpServices : MCP_SERVICE_CONFIGS.filter((service) => !service.requiresApiKey).map((service) => service.id);
    const baseProviders2 = existingConfig?.providers || [];
    const existingServices2 = existingConfig?.mcpServices || [];
    const selection2 = [];
    for (const id of defaultServiceIds) {
      const configInfo = MCP_SERVICE_CONFIGS.find((service) => service.id === id);
      if (!configInfo)
        continue;
      let command = configInfo.config.command || id;
      let args = (configInfo.config.args || []).map((arg) => String(arg));
      if (id === "serena") {
        const idx = args.indexOf("--context");
        if (idx >= 0 && idx + 1 < args.length)
          args[idx + 1] = "codex";
        else
          args.push("--context", "codex");
      }
      const serviceConfig = { id: id.toLowerCase(), command, args };
      applyCodexPlatformCommand(serviceConfig);
      command = serviceConfig.command;
      args = serviceConfig.args || [];
      const env = { ...configInfo.config.env || {} };
      if (isWindows()) {
        const systemRoot = getSystemRoot();
        if (systemRoot)
          env.SYSTEMROOT = systemRoot;
      }
      selection2.push({
        id: id.toLowerCase(),
        command,
        args,
        env: Object.keys(env).length > 0 ? env : void 0,
        startup_timeout_sec: 30
      });
    }
    const mergedMap2 = /* @__PURE__ */ new Map();
    for (const svc of existingServices2)
      mergedMap2.set(svc.id.toLowerCase(), { ...svc });
    for (const svc of selection2)
      mergedMap2.set(svc.id.toLowerCase(), { ...svc });
    const finalServices2 = Array.from(mergedMap2.values()).map((svc) => {
      if (isWindows()) {
        const systemRoot = getSystemRoot();
        if (systemRoot) {
          return {
            ...svc,
            env: {
              ...svc.env || {},
              SYSTEMROOT: systemRoot
            }
          };
        }
      }
      return svc;
    });
    writeCodexConfig({
      model: existingConfig?.model || null,
      modelProvider: existingConfig?.modelProvider || null,
      providers: baseProviders2,
      mcpServices: finalServices2,
      otherConfig: existingConfig?.otherConfig || []
    });
    updateZcfConfig({ codeToolType: "codex" });
    console.log(ansis.green(i18n.t("codex:mcpConfigured")));
    return;
  }
  const selectedIds = await selectMcpServices();
  if (!selectedIds)
    return;
  const servicesMeta = await getMcpServices();
  const baseProviders = existingConfig?.providers || [];
  const selection = [];
  const existingServices = existingConfig?.mcpServices || [];
  if (selectedIds.length === 0) {
    console.log(ansis.yellow(i18n.t("codex:noMcpConfigured")));
    const preserved = (existingServices || []).map((svc) => {
      if (isWindows()) {
        const systemRoot = getSystemRoot();
        if (systemRoot) {
          return {
            ...svc,
            env: {
              ...svc.env || {},
              SYSTEMROOT: systemRoot
            }
          };
        }
      }
      return svc;
    });
    writeCodexConfig({
      model: existingConfig?.model || null,
      modelProvider: existingConfig?.modelProvider || null,
      providers: baseProviders,
      mcpServices: preserved,
      otherConfig: existingConfig?.otherConfig || []
    });
    updateZcfConfig({ codeToolType: "codex" });
    return;
  }
  for (const id of selectedIds) {
    const configInfo = MCP_SERVICE_CONFIGS.find((service) => service.id === id);
    if (!configInfo)
      continue;
    const serviceMeta = servicesMeta.find((service) => service.id === id);
    let command = configInfo.config.command || id;
    let args = (configInfo.config.args || []).map((arg) => String(arg));
    if (id === "serena") {
      const idx = args.indexOf("--context");
      if (idx >= 0 && idx + 1 < args.length) {
        args[idx + 1] = "codex";
      } else {
        args.push("--context", "codex");
      }
    }
    const serviceConfig = { id: id.toLowerCase(), command, args };
    applyCodexPlatformCommand(serviceConfig);
    command = serviceConfig.command;
    args = serviceConfig.args || [];
    const env = { ...configInfo.config.env || {} };
    if (isWindows()) {
      const systemRoot = getSystemRoot();
      if (systemRoot)
        env.SYSTEMROOT = systemRoot;
    }
    if (configInfo.requiresApiKey && configInfo.apiKeyEnvVar) {
      const promptMessage = serviceMeta?.apiKeyPrompt || i18n.t("mcp:apiKeyPrompt");
      const { apiKey } = await inquirer.prompt([{
        type: "input",
        name: "apiKey",
        message: promptMessage,
        validate: (input) => !!input || i18n.t("api:keyRequired")
      }]);
      if (!apiKey)
        continue;
      env[configInfo.apiKeyEnvVar] = apiKey;
    }
    selection.push({
      id: id.toLowerCase(),
      command: serviceConfig.command,
      args: serviceConfig.args,
      env: Object.keys(env).length > 0 ? env : void 0,
      startup_timeout_sec: 30
    });
  }
  const mergedMap = /* @__PURE__ */ new Map();
  for (const svc of existingServices)
    mergedMap.set(svc.id.toLowerCase(), { ...svc });
  for (const svc of selection)
    mergedMap.set(svc.id.toLowerCase(), { ...svc });
  const finalServices = Array.from(mergedMap.values()).map((svc) => {
    if (isWindows()) {
      const systemRoot = getSystemRoot();
      if (systemRoot) {
        return {
          ...svc,
          env: {
            ...svc.env || {},
            SYSTEMROOT: systemRoot
          }
        };
      }
    }
    return svc;
  });
  writeCodexConfig({
    model: existingConfig?.model || null,
    modelProvider: existingConfig?.modelProvider || null,
    providers: baseProviders,
    mcpServices: finalServices,
    otherConfig: existingConfig?.otherConfig || []
  });
  updateZcfConfig({ codeToolType: "codex" });
  console.log(ansis.green(i18n.t("codex:mcpConfigured")));
}

let cachedSkipPromptBackup = null;
function getRootDir() {
  const currentFilePath = fileURLToPath(import.meta.url);
  let dir = dirname(currentFilePath);
  while (dir !== dirname(dir)) {
    if (exists(join(dir, "templates"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return dirname(currentFilePath);
}
async function detectCodexInstallMethod() {
  try {
    const brewResult = await x("brew", ["list", "--cask", "codex"], { throwOnError: false });
    if (brewResult.exitCode === 0) {
      return "homebrew";
    }
  } catch {
  }
  try {
    const npmResult = await x("npm", ["list", "-g", "@openai/codex"], { throwOnError: false });
    if (npmResult.exitCode === 0 && npmResult.stdout.includes("@openai/codex")) {
      return "npm";
    }
  } catch {
  }
  return "unknown";
}
async function executeCodexInstallation(isUpdate, skipMethodSelection = false) {
  if (isUpdate) {
    console.log(ansis.green(i18n.t("codex:updatingCli")));
    const installMethod = await detectCodexInstallMethod();
    if (installMethod === "homebrew") {
      console.log(ansis.gray(i18n.t("codex:detectedHomebrew")));
      const result = await x("brew", ["upgrade", "--cask", "codex"]);
      if (result.exitCode !== 0) {
        throw new Error(`Failed to update codex via Homebrew: exit code ${result.exitCode}`);
      }
    } else if (installMethod === "npm") {
      console.log(ansis.gray(i18n.t("codex:detectedNpm")));
      const { command, args, usedSudo } = wrapCommandWithSudo("npm", ["install", "-g", "@openai/codex@latest"]);
      if (usedSudo)
        console.log(ansis.yellow(i18n.t("codex:usingSudo")));
      const result = await x(command, args);
      if (result.exitCode !== 0) {
        throw new Error(`Failed to update codex CLI: exit code ${result.exitCode}`);
      }
    } else {
      console.log(ansis.yellow(i18n.t("codex:unknownInstallMethod")));
      console.log(ansis.gray(i18n.t("codex:fallingBackToNpm")));
      const { command, args, usedSudo } = wrapCommandWithSudo("npm", ["install", "-g", "@openai/codex@latest"]);
      if (usedSudo)
        console.log(ansis.yellow(i18n.t("codex:usingSudo")));
      const result = await x(command, args);
      if (result.exitCode !== 0) {
        throw new Error(`Failed to update codex CLI: exit code ${result.exitCode}`);
      }
    }
    console.log(ansis.green(i18n.t("codex:updateSuccess")));
  } else {
    const { installCodex } = await import('./installer2.mjs');
    await installCodex(skipMethodSelection);
  }
}
function getUninstallOptions() {
  return [
    { name: i18n.t("codex:uninstallItemConfig"), value: "config" },
    { name: i18n.t("codex:uninstallItemAuth"), value: "auth" },
    { name: i18n.t("codex:uninstallItemApiConfig"), value: "api-config" },
    { name: i18n.t("codex:uninstallItemMcpConfig"), value: "mcp-config" },
    { name: i18n.t("codex:uninstallItemSystemPrompt"), value: "system-prompt" },
    { name: i18n.t("codex:uninstallItemWorkflow"), value: "workflow" },
    { name: i18n.t("codex:uninstallItemCliPackage"), value: "cli-package" },
    { name: i18n.t("codex:uninstallItemBackups"), value: "backups" }
  ];
}
function handleUninstallCancellation() {
  console.log(ansis.yellow(i18n.t("codex:uninstallCancelled")));
}
function createBackupDirectory(timestamp) {
  const backupBaseDir = join(CODEX_DIR, "backup");
  const backupDir = join(backupBaseDir, `backup_${timestamp}`);
  ensureDir(backupDir);
  return backupDir;
}
function backupCodexFiles() {
  if (!exists(CODEX_DIR))
    return null;
  if (process__default.env.CCJK_CODEX_SKIP_PROMPT_SINGLE_BACKUP === "true" && cachedSkipPromptBackup)
    return cachedSkipPromptBackup;
  const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
  const backupDir = createBackupDirectory(timestamp);
  const filter = (path) => {
    return !path.includes("/backup");
  };
  copyDir(CODEX_DIR, backupDir, { filter });
  if (process__default.env.CCJK_CODEX_SKIP_PROMPT_SINGLE_BACKUP === "true")
    cachedSkipPromptBackup = backupDir;
  return backupDir;
}
function backupCodexComplete() {
  return backupCodexFiles();
}
function backupCodexConfig() {
  if (!exists(CODEX_CONFIG_FILE))
    return null;
  try {
    const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    const backupDir = createBackupDirectory(timestamp);
    const backupPath = join(backupDir, "config.toml");
    copyFile(CODEX_CONFIG_FILE, backupPath);
    return backupPath;
  } catch {
    return null;
  }
}
function backupCodexAgents() {
  if (process__default.env.CCJK_CODEX_SKIP_PROMPT_SINGLE_BACKUP === "true" && cachedSkipPromptBackup)
    return cachedSkipPromptBackup;
  if (!exists(CODEX_AGENTS_FILE))
    return null;
  try {
    const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    const backupDir = createBackupDirectory(timestamp);
    const backupPath = join(backupDir, "AGENTS.md");
    copyFile(CODEX_AGENTS_FILE, backupPath);
    return backupPath;
  } catch {
    return null;
  }
}
function backupCodexPrompts() {
  if (process__default.env.CCJK_CODEX_SKIP_PROMPT_SINGLE_BACKUP === "true" && cachedSkipPromptBackup)
    return cachedSkipPromptBackup;
  if (!exists(CODEX_PROMPTS_DIR))
    return null;
  try {
    const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    const backupDir = createBackupDirectory(timestamp);
    const backupPath = join(backupDir, "prompts");
    copyDir(CODEX_PROMPTS_DIR, backupPath);
    return backupPath;
  } catch {
    return null;
  }
}
function getBackupMessage(path) {
  if (!path)
    return "";
  if (!i18n.isInitialized) {
    return `Backup created: ${path}`;
  }
  return i18n.t("codex:backupSuccess", { path });
}
function needsEnvKeyMigration() {
  if (!exists(CODEX_CONFIG_FILE))
    return false;
  try {
    const content = readFile(CODEX_CONFIG_FILE);
    const hasOldEnvKey = /^\s*env_key\s*=/m.test(content);
    return hasOldEnvKey;
  } catch {
    return false;
  }
}
function migrateEnvKeyToTempEnvKey() {
  if (!exists(CODEX_CONFIG_FILE))
    return false;
  try {
    const content = readFile(CODEX_CONFIG_FILE);
    if (!needsEnvKeyMigration())
      return false;
    const backupPath = backupCodexConfig();
    if (backupPath) {
      console.log(ansis.gray(getBackupMessage(backupPath)));
    }
    const migratedContent = migrateEnvKeyInContent(content);
    writeFileAtomic(CODEX_CONFIG_FILE, migratedContent);
    updateTomlConfig(ZCF_CONFIG_FILE, {
      codex: {
        envKeyMigrated: true
      }
    });
    const message = i18n.isInitialized ? i18n.t("codex:envKeyMigrationComplete") : "\u2714 env_key to temp_env_key migration completed";
    console.log(ansis.green(message));
    return true;
  } catch (error) {
    console.error(ansis.yellow(`env_key migration warning: ${error.message}`));
    return false;
  }
}
function migrateEnvKeyInContent(content) {
  const lines = content.split("\n");
  const result = [];
  let currentSectionHasTempEnvKey = false;
  let currentSection = "";
  const sectionHasTempEnvKey = /* @__PURE__ */ new Map();
  let tempSection = "";
  for (const line of lines) {
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]/);
    if (sectionMatch) {
      tempSection = sectionMatch[1];
    }
    if (tempSection && /^\s*temp_env_key\s*=/.test(line)) {
      sectionHasTempEnvKey.set(tempSection, true);
    }
  }
  for (const line of lines) {
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      currentSectionHasTempEnvKey = sectionHasTempEnvKey.get(currentSection) || false;
    }
    const envKeyMatch = line.match(/^(\s*)env_key(\s*=.*)$/);
    if (envKeyMatch) {
      if (currentSectionHasTempEnvKey) {
        continue;
      } else {
        result.push(`${envKeyMatch[1]}temp_env_key${envKeyMatch[2]}`);
        continue;
      }
    }
    result.push(line);
  }
  return result.join("\n");
}
function ensureEnvKeyMigration() {
  const tomlConfig = readDefaultTomlConfig();
  if (tomlConfig?.codex?.envKeyMigrated)
    return;
  if (needsEnvKeyMigration()) {
    migrateEnvKeyToTempEnvKey();
  }
}
function sanitizeProviderName(input) {
  const cleaned = input.trim();
  if (!cleaned)
    return "";
  return cleaned.toLowerCase().replace(/\./g, "-").replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}
function parseCodexConfig(content) {
  if (!content.trim()) {
    return {
      model: null,
      modelProvider: null,
      providers: [],
      mcpServices: [],
      managed: false,
      otherConfig: [],
      modelProviderCommented: void 0
    };
  }
  try {
    const normalizedContent = content.replace(/(SYSTEMROOT\s*=\s*")[^"\n]+("?)/g, (match) => {
      return match.replace(/\\\\/g, "/").replace(/\\/g, "/").replace('C:/Windows"?', 'C:/Windows"');
    });
    const tomlData = parse(normalizedContent);
    const providers = [];
    if (tomlData.model_providers) {
      for (const [id, providerData] of Object.entries(tomlData.model_providers)) {
        const provider = providerData;
        providers.push({
          id,
          name: provider.name || id,
          baseUrl: provider.base_url || "",
          wireApi: provider.wire_api || "responses",
          tempEnvKey: provider.temp_env_key || "OPENAI_API_KEY",
          requiresOpenaiAuth: provider.requires_openai_auth !== false,
          model: provider.model || void 0
          // Parse model field from provider
        });
      }
    }
    const mcpServices = [];
    if (tomlData.mcp_servers) {
      const KNOWN_MCP_FIELDS = /* @__PURE__ */ new Set(["command", "args", "env", "startup_timeout_sec"]);
      for (const [id, mcpData] of Object.entries(tomlData.mcp_servers)) {
        const mcp = mcpData;
        const extraFields = {};
        for (const [key, value] of Object.entries(mcp)) {
          if (!KNOWN_MCP_FIELDS.has(key)) {
            extraFields[key] = value;
          }
        }
        mcpServices.push({
          id,
          command: mcp.command || id,
          args: mcp.args || [],
          env: Object.keys(mcp.env || {}).length > 0 ? mcp.env : void 0,
          startup_timeout_sec: mcp.startup_timeout_sec,
          // Only add extraFields if there are any extra fields
          extraFields: Object.keys(extraFields).length > 0 ? extraFields : void 0
        });
      }
    }
    const model = tomlData.model || null;
    let modelProvider = null;
    let modelProviderCommented;
    const commentedMatch = content.match(/^(\s*)#\s*model_provider\s*=\s*"([^"]+)"/m);
    if (commentedMatch) {
      modelProvider = commentedMatch[2];
      modelProviderCommented = true;
    } else {
      const lines2 = content.split("\n");
      let inSection = false;
      for (const line of lines2) {
        const trimmedLine = line.trim();
        if (!trimmedLine)
          continue;
        if (trimmedLine.startsWith("[")) {
          inSection = true;
          continue;
        }
        if (trimmedLine.startsWith("#")) {
          if (trimmedLine.includes("--- model provider added by CCJK ---")) {
            inSection = false;
          }
          continue;
        }
        if (!inSection && trimmedLine.startsWith("model_provider")) {
          const match = trimmedLine.match(/model_provider\s*=\s*"([^"]+)"/);
          if (match) {
            modelProvider = match[1];
            modelProviderCommented = false;
            break;
          }
        }
      }
      if (!modelProvider) {
        modelProvider = tomlData.model_provider || null;
        modelProviderCommented = false;
      }
    }
    const otherConfig = [];
    const lines = content.split("\n");
    let skipCurrentSection = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed)
        continue;
      if (/^#\s*---\s*model provider added by CCJK\s*---\s*$/i.test(trimmed))
        continue;
      if (/^#\s*---\s*MCP servers added by CCJK\s*---\s*$/i.test(trimmed))
        continue;
      if (/Managed by CCJK/i.test(trimmed))
        continue;
      const sec = trimmed.match(/^\[([^\]]+)\]/);
      if (sec) {
        const name = sec[1];
        skipCurrentSection = name.startsWith("model_providers.") || name.startsWith("mcp_servers.");
        if (skipCurrentSection)
          continue;
        otherConfig.push(line);
        continue;
      }
      if (/^#?\s*model_provider\s*=/.test(trimmed))
        continue;
      if (/^model\s*=/.test(trimmed))
        continue;
      if (!skipCurrentSection) {
        otherConfig.push(line);
      }
    }
    const managed = providers.length > 0 || mcpServices.length > 0 || modelProvider !== null || model !== null;
    return {
      model,
      modelProvider,
      providers,
      mcpServices,
      managed,
      otherConfig,
      modelProviderCommented
    };
  } catch (error) {
    if (process__default.env.NODE_ENV === "development" || process__default.env.DEBUG) {
      console.warn("TOML parsing failed, falling back to basic parsing:", error);
    }
    const cleaned = content.replace(/^\s*#\s*---\s*model provider added by CCJK\s*---\s*$/gim, "").replace(/^\s*#\s*---\s*MCP servers added by CCJK\s*---\s*$/gim, "").replace(/^\[model_providers\.[^\]]+\][\s\S]*?(?=^\[|$)/gim, "").replace(/^\[mcp_servers\.[^\]]+\][\s\S]*?(?=^\[|$)/gim, "").replace(/^\s*(?:#\s*)?model_provider\s*=.*$/gim, "").replace(/^\s*model\s*=.*$/gim, "").replace(/\n{3,}/g, "\n\n");
    const otherConfig = cleaned.split("\n").map((l) => l.replace(/\s+$/g, "")).filter((l) => l.trim().length > 0);
    return {
      model: null,
      modelProvider: null,
      providers: [],
      mcpServices: [],
      managed: false,
      otherConfig,
      modelProviderCommented: void 0
    };
  }
}
function formatInlineTableValue(value) {
  if (value === null || value === void 0) {
    return "";
  }
  if (typeof value === "string") {
    const normalized = normalizeTomlPath(value);
    return `'${normalized}'`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (typeof item === "string") {
        const normalized = normalizeTomlPath(item);
        return `'${normalized}'`;
      }
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        return formatInlineTable(item);
      }
      return String(item);
    }).join(", ");
    return `[${items}]`;
  }
  if (typeof value === "object") {
    return formatInlineTable(value);
  }
  return String(value);
}
function formatInlineTable(obj) {
  const entries = Object.entries(obj).filter(([_, v]) => v !== null && v !== void 0).map(([k, v]) => `${k} = ${formatInlineTableValue(v)}`).join(", ");
  return `{${entries}}`;
}
function formatTomlField(key, value) {
  if (value === null || value === void 0) {
    return "";
  }
  if (typeof value === "string") {
    const normalized = normalizeTomlPath(value);
    const escaped = normalized.replace(/"/g, '\\"');
    return `${key} = "${escaped}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return `${key} = ${value}`;
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (typeof item === "string") {
        const normalized = normalizeTomlPath(item);
        const escaped = normalized.replace(/"/g, '\\"');
        return `"${escaped}"`;
      }
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        return formatInlineTable(item);
      }
      return String(item);
    }).join(", ");
    return `${key} = [${items}]`;
  }
  if (typeof value === "object") {
    return `${key} = ${formatInlineTable(value)}`;
  }
  return "";
}
function readCodexConfig() {
  if (!exists(CODEX_CONFIG_FILE))
    return null;
  ensureEnvKeyMigration();
  try {
    const content = readFile(CODEX_CONFIG_FILE);
    return parseCodexConfig(content);
  } catch {
    return null;
  }
}
function renderCodexConfig(data) {
  const lines = [];
  if (data.model || data.modelProvider || data.providers.length > 0 || data.modelProviderCommented) {
    lines.push("# --- model provider added by CCJK ---");
    if (data.model) {
      lines.push(`model = "${data.model}"`);
    }
    if (data.modelProvider) {
      const commentPrefix = data.modelProviderCommented ? "# " : "";
      lines.push(`${commentPrefix}model_provider = "${data.modelProvider}"`);
    }
    lines.push("");
  }
  if (data.otherConfig && data.otherConfig.length > 0) {
    const preserved = data.otherConfig.filter((raw) => {
      const l = String(raw).trim();
      if (!l)
        return false;
      if (/^#\s*---\s*model provider added by CCJK\s*---\s*$/i.test(l))
        return false;
      if (/^#\s*---\s*MCP servers added by CCJK\s*---\s*$/i.test(l))
        return false;
      if (/^\[\s*mcp_servers\./i.test(l))
        return false;
      if (/^\[\s*model_providers\./i.test(l))
        return false;
      if (/^#?\s*model_provider\s*=/.test(l))
        return false;
      if (/^\s*model\s*=/.test(l) && !l.includes("["))
        return false;
      return true;
    });
    if (preserved.length > 0) {
      lines.push(...preserved);
      if (data.providers.length > 0 || data.mcpServices.length > 0) {
        lines.push("");
      }
    }
  }
  if (data.providers.length > 0) {
    for (const provider of data.providers) {
      lines.push("");
      lines.push(`[model_providers.${provider.id}]`);
      lines.push(`name = "${provider.name}"`);
      lines.push(`base_url = "${provider.baseUrl}"`);
      lines.push(`wire_api = "${provider.wireApi}"`);
      lines.push(`temp_env_key = "${provider.tempEnvKey}"`);
      lines.push(`requires_openai_auth = ${provider.requiresOpenaiAuth}`);
      if (provider.model) {
        lines.push(`model = "${provider.model}"`);
      }
    }
  }
  if (data.mcpServices.length > 0) {
    lines.push("");
    lines.push("# --- MCP servers added by CCJK ---");
    for (const service of data.mcpServices) {
      lines.push(`[mcp_servers.${service.id}]`);
      const normalizedCommand = normalizeTomlPath(service.command);
      lines.push(`command = "${normalizedCommand}"`);
      const argsString = service.args.length > 0 ? service.args.map((arg) => `"${arg}"`).join(", ") : "";
      lines.push(`args = [${argsString}]`);
      if (service.env && Object.keys(service.env).length > 0) {
        const envEntries = Object.entries(service.env).map(([key, value]) => `${key} = '${value}'`).join(", ");
        lines.push(`env = {${envEntries}}`);
      }
      if (service.startup_timeout_sec) {
        lines.push(`startup_timeout_sec = ${service.startup_timeout_sec}`);
      }
      if (service.extraFields) {
        for (const [key, value] of Object.entries(service.extraFields)) {
          const formatted = formatTomlField(key, value);
          if (formatted) {
            lines.push(formatted);
          }
        }
      }
      lines.push("");
    }
    if (lines[lines.length - 1] === "") {
      lines.pop();
    }
  }
  let result = lines.join("\n");
  if (result && !result.endsWith("\n")) {
    result += "\n";
  }
  return result;
}
function writeCodexConfig(data) {
  ensureEnvKeyMigration();
  ensureDir(CODEX_DIR);
  writeFileAtomic(CODEX_CONFIG_FILE, renderCodexConfig(data));
}
function writeAuthFile(newEntries) {
  ensureDir(CODEX_DIR);
  const existing = readJsonConfig(CODEX_AUTH_FILE, { defaultValue: {} }) || {};
  const merged = { ...existing, ...newEntries };
  writeJsonConfig(CODEX_AUTH_FILE, merged, { pretty: true });
}
async function isCodexInstalled() {
  try {
    const npmResult = await x("npm", ["list", "-g", "--depth=0"]);
    if (npmResult.exitCode === 0 && npmResult.stdout.includes("@openai/codex@")) {
      return true;
    }
  } catch {
  }
  try {
    const brewResult = await x("brew", ["list", "--cask", "codex"], { throwOnError: false });
    if (brewResult.exitCode === 0) {
      return true;
    }
  } catch {
  }
  return false;
}
async function getCodexVersion() {
  try {
    const npmResult = await x("npm", ["list", "-g", "--depth=0"]);
    if (npmResult.exitCode === 0) {
      const match = npmResult.stdout.match(/@openai\/codex@(\S+)/);
      if (match) {
        return match[1];
      }
    }
  } catch {
  }
  try {
    const brewResult = await x("brew", ["info", "--cask", "codex", "--json=v2"], { throwOnError: false });
    if (brewResult.exitCode === 0) {
      const info = JSON.parse(brewResult.stdout);
      if (info.casks && Array.isArray(info.casks) && info.casks.length > 0) {
        const cask = info.casks[0];
        if (cask.installed && typeof cask.installed === "string") {
          return cask.installed;
        }
      }
    }
  } catch {
  }
  return null;
}
async function checkCodexUpdate() {
  try {
    const currentVersion = await getCodexVersion();
    if (!currentVersion) {
      return {
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false
      };
    }
    const result = await x("npm", ["view", "@openai/codex", "--json"]);
    if (result.exitCode !== 0) {
      return {
        installed: true,
        currentVersion,
        latestVersion: null,
        needsUpdate: false
      };
    }
    const packageInfo = JSON.parse(result.stdout);
    const latestVersion = packageInfo["dist-tags"]?.latest;
    if (!latestVersion) {
      return {
        installed: true,
        currentVersion,
        latestVersion: null,
        needsUpdate: false
      };
    }
    const needsUpdate = semver.gt(latestVersion, currentVersion);
    return {
      installed: true,
      currentVersion,
      latestVersion,
      needsUpdate
    };
  } catch {
    return {
      installed: false,
      currentVersion: null,
      latestVersion: null,
      needsUpdate: false
    };
  }
}
async function installCodexCli(skipMethodSelection = false) {
  ensureI18nInitialized();
  if (await isCodexInstalled()) {
    const { needsUpdate } = await checkCodexUpdate();
    if (needsUpdate) {
      await executeCodexInstallation(true, skipMethodSelection);
      return;
    } else {
      console.log(ansis.yellow(i18n.t("codex:alreadyInstalled")));
      return;
    }
  }
  await executeCodexInstallation(false, skipMethodSelection);
}
async function runCodexWorkflowImportWithLanguageSelection(options) {
  ensureI18nInitialized();
  const zcfConfig = readZcfConfig();
  const { aiOutputLang: commandLineOption, skipPrompt = false } = options ?? {};
  const aiOutputLang = await resolveAiOutputLanguage(
    i18n.language,
    commandLineOption,
    zcfConfig,
    skipPrompt
  );
  updateZcfConfig({ aiOutputLang });
  applyAiLanguageDirective(aiOutputLang);
  await runCodexSystemPromptSelection(skipPrompt);
  ensureCodexAgentsLanguageDirective(aiOutputLang);
  await runCodexWorkflowSelection(options);
  console.log(ansis.green(i18n.t("codex:workflowInstall")));
  return aiOutputLang;
}
async function runCodexSystemPromptSelection(skipPrompt = false) {
  ensureI18nInitialized();
  const rootDir = getRootDir();
  const zcfConfig = readZcfConfig();
  const { readDefaultTomlConfig: readDefaultTomlConfig2 } = await import('./ccjk-config.mjs');
  const tomlConfig = readDefaultTomlConfig2();
  const { resolveTemplateLanguage } = await import('./prompts.mjs');
  const preferredLang = await resolveTemplateLanguage(
    void 0,
    // No command line option for this function
    zcfConfig,
    skipPrompt
    // Pass skipPrompt flag
  );
  updateZcfConfig({ templateLang: preferredLang });
  let systemPromptSrc = join(rootDir, "templates", "common", "output-styles", preferredLang);
  if (!exists(systemPromptSrc))
    systemPromptSrc = join(rootDir, "templates", "common", "output-styles", "zh-CN");
  if (!exists(systemPromptSrc))
    return;
  const availablePrompts = [
    {
      id: "speed-coder",
      name: i18n.t("configuration:outputStyles.speed-coder.name"),
      description: i18n.t("configuration:outputStyles.speed-coder.description")
    },
    {
      id: "senior-architect",
      name: i18n.t("configuration:outputStyles.senior-architect.name"),
      description: i18n.t("configuration:outputStyles.senior-architect.description")
    },
    {
      id: "pair-programmer",
      name: i18n.t("configuration:outputStyles.pair-programmer.name"),
      description: i18n.t("configuration:outputStyles.pair-programmer.description")
    }
  ].filter((style) => exists(join(systemPromptSrc, `${style.id}.md`)));
  if (availablePrompts.length === 0)
    return;
  const { resolveSystemPromptStyle } = await import('./prompts.mjs');
  const systemPrompt = await resolveSystemPromptStyle(
    availablePrompts,
    void 0,
    // No command line option for this function
    tomlConfig,
    skipPrompt
    // Pass skipPrompt flag
  );
  if (!systemPrompt)
    return;
  const promptFile = join(systemPromptSrc, `${systemPrompt}.md`);
  const content = readFile(promptFile);
  ensureDir(CODEX_DIR);
  const backupPath = backupCodexAgents();
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)));
  }
  writeFileAtomic(CODEX_AGENTS_FILE, content);
  try {
    const { updateTomlConfig: updateTomlConfig2 } = await import('./ccjk-config.mjs');
    const { ZCF_CONFIG_FILE: ZCF_CONFIG_FILE2 } = await import('./constants.mjs');
    updateTomlConfig2(ZCF_CONFIG_FILE2, {
      codex: {
        systemPromptStyle: systemPrompt
      }
    });
  } catch (error) {
    console.error("Failed to update CCJK config:", error);
  }
}
async function runCodexWorkflowSelection(options) {
  ensureI18nInitialized();
  const { skipPrompt = false, workflows: presetWorkflows = [] } = options ?? {};
  const rootDir = getRootDir();
  const zcfConfig = readZcfConfig();
  const templateLang = zcfConfig?.templateLang || zcfConfig?.preferredLang || "en";
  let preferredLang = templateLang === "en" ? "en" : "zh-CN";
  const workflowSrc = join(rootDir, "templates", "common", "workflow");
  if (!exists(workflowSrc))
    return;
  let allWorkflows = getAllWorkflowFiles(workflowSrc, preferredLang);
  if (allWorkflows.length === 0 && preferredLang === "en") {
    preferredLang = "zh-CN";
    allWorkflows = getAllWorkflowFiles(workflowSrc, preferredLang);
  }
  if (allWorkflows.length === 0)
    return;
  if (skipPrompt) {
    ensureDir(CODEX_PROMPTS_DIR);
    const backupPath2 = backupCodexPrompts();
    if (backupPath2) {
      console.log(ansis.gray(getBackupMessage(backupPath2)));
    }
    let workflowsToInstall;
    if (presetWorkflows.length > 0) {
      const selectedWorkflows = allWorkflows.filter(
        (workflow) => presetWorkflows.includes(workflow.name)
      );
      workflowsToInstall = expandSelectedWorkflowPaths(selectedWorkflows.map((w) => w.path), workflowSrc, preferredLang);
    } else {
      workflowsToInstall = expandSelectedWorkflowPaths(allWorkflows.map((w) => w.path), workflowSrc, preferredLang);
    }
    for (const workflowPath of workflowsToInstall) {
      const content = readFile(workflowPath);
      const filename = workflowPath.split("/").pop() || "workflow.md";
      const targetPath = join(CODEX_PROMPTS_DIR, filename);
      writeFile(targetPath, content);
    }
    return;
  }
  const { workflows } = await inquirer.prompt([{
    type: "checkbox",
    name: "workflows",
    message: i18n.t("codex:workflowSelectionPrompt"),
    choices: addNumbersToChoices(allWorkflows.map((workflow) => ({
      name: workflow.name,
      value: workflow.path,
      checked: true
      // Default all selected
    })))
  }]);
  if (!workflows || workflows.length === 0)
    return;
  ensureDir(CODEX_PROMPTS_DIR);
  const backupPath = backupCodexPrompts();
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)));
  }
  const finalWorkflowPaths = expandSelectedWorkflowPaths(workflows, workflowSrc, preferredLang);
  for (const workflowPath of finalWorkflowPaths) {
    const content = readFile(workflowPath);
    const filename = workflowPath.split("/").pop() || "workflow.md";
    const targetPath = join(CODEX_PROMPTS_DIR, filename);
    writeFile(targetPath, content);
  }
}
const GIT_GROUP_SENTINEL = "::gitGroup";
function getAllWorkflowFiles(workflowSrc, preferredLang) {
  const workflows = [];
  const sixStepFile = join(workflowSrc, "sixStep", preferredLang, "workflow.md");
  if (exists(sixStepFile)) {
    workflows.push({
      name: i18n.t("workflow:workflowOption.sixStepsWorkflow"),
      path: sixStepFile
    });
  }
  const gitPromptsDir = join(workflowSrc, "git", preferredLang);
  if (exists(gitPromptsDir)) {
    workflows.push({
      name: i18n.t("workflow:workflowOption.gitWorkflow"),
      // Use sentinel path for grouped selection; expanded later
      path: GIT_GROUP_SENTINEL
    });
  }
  return workflows;
}
function expandSelectedWorkflowPaths(paths, workflowSrc, preferredLang) {
  const expanded = [];
  for (const p of paths) {
    if (p === GIT_GROUP_SENTINEL) {
      expanded.push(...getGitPromptFiles(workflowSrc, preferredLang));
    } else {
      expanded.push(p);
    }
  }
  return expanded;
}
function getGitPromptFiles(workflowSrc, preferredLang) {
  const gitPromptsDir = join(workflowSrc, "git", preferredLang);
  const files = [
    "git-commit.md",
    "git-rollback.md",
    "git-cleanBranches.md",
    "git-worktree.md"
  ];
  const resolved = [];
  for (const f of files) {
    const full = join(gitPromptsDir, f);
    if (exists(full))
      resolved.push(full);
  }
  return resolved;
}
function toProvidersList(providers) {
  return providers.map((provider) => ({ name: provider.name || provider.id, value: provider.id }));
}
function createApiConfigChoices(providers, currentProvider, isCommented) {
  const choices = [];
  const isOfficialMode = !currentProvider || isCommented;
  choices.push({
    name: isOfficialMode ? `${ansis.green("\u25CF ")}${i18n.t("codex:useOfficialLogin")} ${ansis.yellow("(\u5F53\u524D)")}` : `  ${i18n.t("codex:useOfficialLogin")}`,
    value: "official"
  });
  providers.forEach((provider) => {
    const isCurrent = currentProvider === provider.id && !isCommented;
    choices.push({
      name: isCurrent ? `${ansis.green("\u25CF ")}${provider.name} - ${ansis.gray(provider.id)} ${ansis.yellow("(\u5F53\u524D)")}` : `  ${provider.name} - ${ansis.gray(provider.id)}`,
      value: provider.id
    });
  });
  return choices;
}
async function applyCustomApiConfig(customApiConfig) {
  const { type, token, baseUrl, model } = customApiConfig;
  const backupPath = backupCodexComplete();
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)));
  }
  const existingConfig = readCodexConfig();
  const existingAuth = readJsonConfig(CODEX_AUTH_FILE, { defaultValue: {} }) || {};
  const providers = [];
  const authEntries = { ...existingAuth };
  const providerId = type === "auth_token" ? "official-auth-token" : "custom-api-key";
  const providerName = type === "auth_token" ? "Official Auth Token" : "Custom API Key";
  const existingProvider = existingConfig?.providers.find((p) => p.id === providerId);
  providers.push({
    id: providerId,
    name: providerName,
    baseUrl: baseUrl || existingProvider?.baseUrl || "https://api.anthropic.com",
    wireApi: existingProvider?.wireApi || "responses",
    tempEnvKey: existingProvider?.tempEnvKey || `${providerId.toUpperCase()}_API_KEY`,
    requiresOpenaiAuth: existingProvider?.requiresOpenaiAuth ?? false,
    model: model || existingProvider?.model
  });
  if (existingConfig?.providers) {
    providers.push(...existingConfig.providers.filter((p) => p.id !== providerId));
  }
  if (token) {
    authEntries[providerId] = token;
    authEntries.OPENAI_API_KEY = token;
  }
  const configData = {
    model: model || existingConfig?.model || "claude-3-5-sonnet-20241022",
    // Prefer provided model, then existing, fallback default
    modelProvider: providerId,
    modelProviderCommented: false,
    providers,
    mcpServices: existingConfig?.mcpServices || [],
    otherConfig: existingConfig?.otherConfig || []
  };
  writeCodexConfig(configData);
  writeJsonConfig(CODEX_AUTH_FILE, authEntries);
  updateZcfConfig({ codeToolType: "codex" });
  console.log(ansis.green(`\u2714 ${i18n.t("codex:apiConfigured")}`));
}
async function configureCodexApi(options) {
  ensureI18nInitialized();
  const { skipPrompt = false, apiMode, customApiConfig } = options ?? {};
  const existingConfig = readCodexConfig();
  const existingAuth = readJsonConfig(CODEX_AUTH_FILE, { defaultValue: {} }) || {};
  if (skipPrompt) {
    if (apiMode === "skip") {
      return;
    }
    if (apiMode === "custom" && customApiConfig) {
      await applyCustomApiConfig(customApiConfig);
      return;
    }
    if (apiMode === "official") {
      const success = await switchToOfficialLogin();
      if (success) {
        updateZcfConfig({ codeToolType: "codex" });
      }
      return;
    }
  }
  const hasProviders = existingConfig?.providers && existingConfig.providers.length > 0;
  const modeChoices = [
    { name: i18n.t("codex:apiModeOfficial"), value: "official" },
    { name: i18n.t("codex:apiModeCustom"), value: "custom" }
  ];
  if (hasProviders) {
    modeChoices.push({ name: i18n.t("codex:configSwitchMode"), value: "switch" });
  }
  const { mode } = await inquirer.prompt([{
    type: "list",
    name: "mode",
    message: i18n.t("codex:apiModePrompt"),
    choices: addNumbersToChoices(modeChoices),
    default: "custom"
  }]);
  if (!mode) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  if (mode === "official") {
    const success = await switchToOfficialLogin();
    if (success) {
      updateZcfConfig({ codeToolType: "codex" });
    }
    return;
  }
  if (mode === "switch") {
    if (!hasProviders) {
      console.log(ansis.yellow(i18n.t("codex:noProvidersAvailable")));
      return;
    }
    const currentProvider = existingConfig?.modelProvider;
    const isCommented = existingConfig?.modelProviderCommented;
    const choices = createApiConfigChoices(existingConfig.providers, currentProvider, isCommented);
    const { selectedConfig } = await inquirer.prompt([{
      type: "list",
      name: "selectedConfig",
      message: i18n.t("codex:apiConfigSwitchPrompt"),
      choices: addNumbersToChoices(choices)
    }]);
    if (!selectedConfig) {
      console.log(ansis.yellow(i18n.t("common:cancelled")));
      return;
    }
    let success = false;
    if (selectedConfig === "official") {
      success = await switchToOfficialLogin();
    } else {
      success = await switchToProvider(selectedConfig);
    }
    if (success) {
      updateZcfConfig({ codeToolType: "codex" });
    }
    return;
  }
  const managementMode = detectConfigManagementMode();
  if (managementMode.mode === "management" && managementMode.hasProviders) {
    const { default: { configureIncrementalManagement } } = await import('./codex-config-switch.mjs');
    await configureIncrementalManagement();
    return;
  }
  const backupPath = backupCodexComplete();
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)));
  }
  const providers = [];
  const authEntries = {};
  const existingMap = new Map(existingConfig?.providers.map((provider) => [provider.id, provider]));
  const currentSessionProviders = /* @__PURE__ */ new Map();
  let addMore = true;
  const existingValues = existingMap.size ? Array.from(existingMap.values()) : [];
  const firstExisting = existingValues.length === 1 ? existingValues[0] : void 0;
  while (addMore) {
    const { getApiProviders } = await import('./api-providers.mjs');
    const apiProviders = getApiProviders("codex");
    const providerChoices = [
      { name: i18n.t("api:customProvider"), value: "custom" },
      ...apiProviders.map((p) => ({ name: p.name, value: p.id }))
    ];
    const { selectedProvider: selectedProvider2 } = await inquirer.prompt([{
      type: "list",
      name: "selectedProvider",
      message: i18n.t("api:selectApiProvider"),
      choices: addNumbersToChoices(providerChoices)
    }]);
    let prefilledBaseUrl;
    let prefilledWireApi;
    let prefilledModel;
    if (selectedProvider2 !== "custom") {
      const provider = apiProviders.find((p) => p.id === selectedProvider2);
      if (provider?.codex) {
        prefilledBaseUrl = provider.codex.baseUrl;
        prefilledWireApi = provider.codex.wireApi;
        prefilledModel = provider.codex.defaultModel;
        console.log(ansis.gray(i18n.t("api:providerSelected", { name: provider.name })));
      }
    }
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "providerName",
        message: i18n.t("codex:providerNamePrompt"),
        default: selectedProvider2 !== "custom" ? apiProviders.find((p) => p.id === selectedProvider2)?.name : firstExisting?.name,
        validate: (input) => {
          const sanitized = sanitizeProviderName(input);
          if (!sanitized)
            return i18n.t("codex:providerNameRequired");
          if (sanitized !== input.trim())
            return i18n.t("codex:providerNameInvalid");
          return true;
        }
      },
      {
        type: "input",
        name: "baseUrl",
        message: i18n.t("codex:providerBaseUrlPrompt"),
        default: prefilledBaseUrl || ((answers2) => existingMap.get(answers2.providerId)?.baseUrl || "https://api.openai.com/v1"),
        when: () => selectedProvider2 === "custom",
        validate: (input) => !!input || i18n.t("codex:providerBaseUrlRequired")
      },
      {
        type: "list",
        name: "wireApi",
        message: i18n.t("codex:providerProtocolPrompt"),
        choices: [
          { name: i18n.t("codex:protocolResponses"), value: "responses" },
          { name: i18n.t("codex:protocolChat"), value: "chat" }
        ],
        default: prefilledWireApi || ((answers2) => existingMap.get(sanitizeProviderName(answers2.providerName))?.wireApi || "responses"),
        when: () => selectedProvider2 === "custom"
        // Only ask if custom
      },
      {
        type: "input",
        name: "apiKey",
        message: selectedProvider2 !== "custom" ? i18n.t("api:enterProviderApiKey", { provider: apiProviders.find((p) => p.id === selectedProvider2)?.name || selectedProvider2 }) : i18n.t("codex:providerApiKeyPrompt"),
        validate: (input) => !!input || i18n.t("codex:providerApiKeyRequired")
      }
    ]);
    let customModel;
    if (selectedProvider2 === "custom") {
      const { model } = await inquirer.prompt([{
        type: "input",
        name: "model",
        message: `${i18n.t("configuration:enterCustomModel")}${i18n.t("common:emptyToSkip")}`,
        default: "gpt-5-codex"
      }]);
      if (model.trim()) {
        customModel = model.trim();
      }
    }
    const providerId = sanitizeProviderName(answers.providerName);
    const tempEnvKey = `${providerId.toUpperCase().replace(/-/g, "_")}_API_KEY`;
    const existingProvider = existingMap.get(providerId);
    const sessionProvider = currentSessionProviders.get(providerId);
    if (existingProvider || sessionProvider) {
      const sourceType = existingProvider ? "existing" : "session";
      const sourceProvider = existingProvider || sessionProvider;
      const shouldOverwrite = await promptBoolean({
        message: i18n.t("codex:providerDuplicatePrompt", {
          name: sourceProvider.name,
          source: sourceType === "existing" ? i18n.t("codex:existingConfig") : i18n.t("codex:currentSession")
        }),
        defaultValue: false
      });
      if (!shouldOverwrite) {
        console.log(ansis.yellow(i18n.t("codex:providerDuplicateSkipped")));
        continue;
      }
      if (sessionProvider) {
        currentSessionProviders.delete(providerId);
        const sessionIndex = providers.findIndex((p) => p.id === providerId);
        if (sessionIndex !== -1) {
          providers.splice(sessionIndex, 1);
        }
      }
    }
    const newProvider = {
      id: providerId,
      name: answers.providerName,
      baseUrl: selectedProvider2 === "custom" ? answers.baseUrl : prefilledBaseUrl,
      wireApi: selectedProvider2 === "custom" ? answers.wireApi || "responses" : prefilledWireApi,
      tempEnvKey,
      requiresOpenaiAuth: true,
      model: customModel || prefilledModel || "gpt-5-codex"
      // Use custom model, provider's default model, or fallback
    };
    providers.push(newProvider);
    currentSessionProviders.set(providerId, newProvider);
    authEntries[tempEnvKey] = answers.apiKey;
    const addAnother = await promptBoolean({
      message: i18n.t("codex:addProviderPrompt"),
      defaultValue: false
    });
    addMore = addAnother;
  }
  if (providers.length === 0) {
    console.log(ansis.yellow(i18n.t("codex:noProvidersConfigured")));
    return;
  }
  const { defaultProvider } = await inquirer.prompt([{
    type: "list",
    name: "defaultProvider",
    message: i18n.t("codex:selectDefaultProviderPrompt"),
    choices: addNumbersToChoices(toProvidersList(providers)),
    default: existingConfig?.modelProvider || providers[0].id
  }]);
  const selectedProvider = providers.find((provider) => provider.id === defaultProvider);
  if (selectedProvider) {
    const tempEnvKey = selectedProvider.tempEnvKey;
    const defaultApiKey = authEntries[tempEnvKey] ?? existingAuth[tempEnvKey] ?? null;
    if (defaultApiKey)
      authEntries.OPENAI_API_KEY = defaultApiKey;
  }
  writeCodexConfig({
    model: existingConfig?.model || null,
    modelProvider: defaultProvider,
    providers,
    mcpServices: existingConfig?.mcpServices || [],
    otherConfig: existingConfig?.otherConfig || []
  });
  writeAuthFile(authEntries);
  updateZcfConfig({ codeToolType: "codex" });
  console.log(ansis.green(i18n.t("codex:apiConfigured")));
}
async function runCodexFullInit(options) {
  ensureI18nInitialized();
  await installCodexCli(options?.skipPrompt || false);
  const aiOutputLang = await runCodexWorkflowImportWithLanguageSelection(options);
  await configureCodexApi(options);
  await configureCodexMcp(options);
  return aiOutputLang;
}
function ensureCodexAgentsLanguageDirective(aiOutputLang) {
  if (!exists(CODEX_AGENTS_FILE))
    return;
  const content = readFile(CODEX_AGENTS_FILE);
  const targetLabel = resolveCodexLanguageLabel(aiOutputLang);
  const directiveRegex = /\*\*Most Important:\s*Always respond in ([^*]+)\*\*/i;
  const existingMatch = directiveRegex.exec(content);
  if (existingMatch && normalizeLanguageLabel(existingMatch[1]) === normalizeLanguageLabel(targetLabel))
    return;
  let updatedContent = content.replace(/\*\*Most Important:\s*Always respond in [^*]+\*\*\s*/gi, "").trimEnd();
  if (updatedContent.length > 0 && !updatedContent.endsWith("\n"))
    updatedContent += "\n";
  updatedContent += `
**Most Important:Always respond in ${targetLabel}**
`;
  const backupPath = backupCodexAgents();
  if (backupPath)
    console.log(ansis.gray(getBackupMessage(backupPath)));
  writeFileAtomic(CODEX_AGENTS_FILE, updatedContent);
  console.log(ansis.gray(`  ${i18n.t("configuration:addedLanguageDirective")}: ${targetLabel}`));
}
function resolveCodexLanguageLabel(aiOutputLang) {
  const directive = AI_OUTPUT_LANGUAGES[aiOutputLang]?.directive;
  if (directive) {
    const match = directive.match(/Always respond in\s+(.+)/i);
    if (match)
      return match[1].trim();
  }
  if (typeof aiOutputLang === "string")
    return aiOutputLang;
  return "English";
}
function normalizeLanguageLabel(label) {
  return label.trim().toLowerCase();
}
async function runCodexUpdate(force = false, skipPrompt = false) {
  ensureI18nInitialized();
  console.log(ansis.bold.cyan(`
\u{1F50D} ${i18n.t("updater:checkingTools")}
`));
  const spinner = ora(i18n.t("updater:checkingVersion")).start();
  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCodexUpdate();
    spinner.stop();
    if (!installed) {
      console.log(ansis.yellow(i18n.t("codex:notInstalled")));
      return false;
    }
    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t("codex:upToDate"), { version: currentVersion || "" })));
      return true;
    }
    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t("codex:cannotCheckVersion")));
      return false;
    }
    console.log(ansis.green(format(i18n.t("codex:currentVersion"), { version: currentVersion || "" })));
    console.log(ansis.green(format(i18n.t("codex:latestVersion"), { version: latestVersion })));
    if (!skipPrompt) {
      const confirm = await promptBoolean({
        message: i18n.t("codex:confirmUpdate"),
        defaultValue: true
      });
      if (!confirm) {
        console.log(ansis.gray(i18n.t("codex:updateSkipped")));
        return true;
      }
    } else {
      console.log(ansis.green(i18n.t("codex:autoUpdating")));
    }
    const updateSpinner = ora(i18n.t("codex:updating")).start();
    try {
      await executeCodexInstallation(true);
      updateSpinner.succeed(i18n.t("codex:updateSuccess"));
      return true;
    } catch (error) {
      updateSpinner.fail(i18n.t("codex:updateFailed"));
      console.error(ansis.red(error instanceof Error ? error.message : String(error)));
      return false;
    }
  } catch (error) {
    spinner.fail(i18n.t("codex:checkFailed"));
    console.error(ansis.red(error instanceof Error ? error.message : String(error)));
    return false;
  }
}
async function runCodexUninstall() {
  ensureI18nInitialized();
  const { CodexUninstaller } = await import('./codex-uninstaller.mjs');
  const zcfConfig = readZcfConfig();
  const preferredLang = zcfConfig?.preferredLang;
  const uninstallLang = preferredLang && SUPPORTED_LANGS.includes(preferredLang) ? preferredLang : "en";
  const uninstaller = new CodexUninstaller(uninstallLang);
  const { mode } = await inquirer.prompt([{
    type: "list",
    name: "mode",
    message: i18n.t("codex:uninstallModePrompt"),
    choices: addNumbersToChoices([
      { name: i18n.t("codex:uninstallModeComplete"), value: "complete" },
      { name: i18n.t("codex:uninstallModeCustom"), value: "custom" }
    ]),
    default: "complete"
  }]);
  if (!mode) {
    handleUninstallCancellation();
    return;
  }
  try {
    if (mode === "complete") {
      const confirm = await promptBoolean({
        message: i18n.t("codex:uninstallPrompt"),
        defaultValue: false
      });
      if (!confirm) {
        handleUninstallCancellation();
        return;
      }
      const result = await uninstaller.completeUninstall();
      displayUninstallResults([result]);
    } else if (mode === "custom") {
      const { items } = await inquirer.prompt([{
        type: "checkbox",
        name: "items",
        message: i18n.t("codex:customUninstallPrompt"),
        choices: addNumbersToChoices(getUninstallOptions())
      }]);
      if (!items || items.length === 0) {
        handleUninstallCancellation();
        return;
      }
      const results = await uninstaller.customUninstall(items);
      displayUninstallResults(results);
    }
    console.log(ansis.green(i18n.t("codex:uninstallSuccess")));
  } catch (error) {
    console.error(ansis.red(i18n.t("codex:errorDuringUninstall", { error: error.message })));
    throw error;
  }
}
function displayUninstallResults(results) {
  for (const result of results) {
    for (const item of result.removed) {
      console.log(ansis.green(`\u2714 ${i18n.t("codex:removedItem", { item })}`));
    }
    for (const config of result.removedConfigs) {
      console.log(ansis.green(`\u2714 ${i18n.t("codex:removedConfig", { config })}`));
    }
    for (const warning of result.warnings) {
      console.log(ansis.yellow(`\u26A0\uFE0F ${warning}`));
    }
    for (const error of result.errors) {
      console.log(ansis.red(`\u274C ${error}`));
    }
  }
}
async function listCodexProviders() {
  const config = readCodexConfig();
  return config?.providers || [];
}
async function switchCodexProvider(providerId) {
  ensureI18nInitialized();
  const existingConfig = readCodexConfig();
  if (!existingConfig) {
    console.log(ansis.red(i18n.t("codex:configNotFound")));
    return false;
  }
  const providerExists = existingConfig.providers.some((provider) => provider.id === providerId);
  if (!providerExists) {
    console.log(ansis.red(i18n.t("codex:providerNotFound", { provider: providerId })));
    return false;
  }
  const backupPath = backupCodexComplete();
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)));
  }
  const updatedConfig = {
    ...existingConfig,
    modelProvider: providerId
  };
  try {
    writeCodexConfig(updatedConfig);
    console.log(ansis.green(i18n.t("codex:providerSwitchSuccess", { provider: providerId })));
    return true;
  } catch (error) {
    console.error(ansis.red(i18n.t("codex:errorSwitchingProvider", { error: error.message })));
    return false;
  }
}
async function switchToOfficialLogin() {
  ensureI18nInitialized();
  const existingConfig = readCodexConfig();
  if (!existingConfig) {
    console.log(ansis.red(i18n.t("codex:configNotFound")));
    return false;
  }
  const backupPath = backupCodexComplete();
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)));
  }
  try {
    let preservedModelProvider = existingConfig.modelProvider;
    if (!preservedModelProvider) {
      try {
        const rawContent = readFile(CODEX_CONFIG_FILE);
        const parsedToml = parse(rawContent);
        if (typeof parsedToml.model_provider === "string" && parsedToml.model_provider.trim().length > 0)
          preservedModelProvider = parsedToml.model_provider.trim();
      } catch {
      }
    }
    const shouldCommentModelProvider = typeof preservedModelProvider === "string" && preservedModelProvider.length > 0;
    const updatedConfig = {
      ...existingConfig,
      modelProvider: shouldCommentModelProvider ? preservedModelProvider : existingConfig.modelProvider,
      modelProviderCommented: shouldCommentModelProvider ? true : existingConfig.modelProviderCommented
    };
    writeCodexConfig(updatedConfig);
    const auth = readJsonConfig(CODEX_AUTH_FILE, { defaultValue: {} }) || {};
    auth.OPENAI_API_KEY = null;
    writeJsonConfig(CODEX_AUTH_FILE, auth, { pretty: true });
    console.log(ansis.green(i18n.t("codex:officialConfigured")));
    return true;
  } catch (error) {
    console.error(ansis.red(i18n.t("codex:errorSwitchingToOfficialLogin", { error: error.message })));
    return false;
  }
}
async function switchToProvider(providerId) {
  ensureI18nInitialized();
  const existingConfig = readCodexConfig();
  if (!existingConfig) {
    console.log(ansis.red(i18n.t("codex:configNotFound")));
    return false;
  }
  const provider = existingConfig.providers.find((p) => p.id === providerId);
  if (!provider) {
    console.log(ansis.red(i18n.t("codex:providerNotFound", { provider: providerId })));
    return false;
  }
  const backupPath = backupCodexComplete();
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)));
  }
  try {
    let targetModel = existingConfig.model;
    if (provider.model) {
      targetModel = provider.model;
    } else {
      const currentModel = existingConfig.model;
      if (currentModel !== "gpt-5" && currentModel !== "gpt-5-codex") {
        targetModel = "gpt-5-codex";
      }
    }
    const updatedConfig = {
      ...existingConfig,
      model: targetModel,
      modelProvider: providerId,
      modelProviderCommented: false
      // Ensure it's not commented
    };
    writeCodexConfig(updatedConfig);
    const auth = readJsonConfig(CODEX_AUTH_FILE, { defaultValue: {} }) || {};
    const envValue = auth[provider.tempEnvKey] || null;
    auth.OPENAI_API_KEY = envValue;
    writeJsonConfig(CODEX_AUTH_FILE, auth, { pretty: true });
    console.log(ansis.green(i18n.t("codex:providerSwitchSuccess", { provider: providerId })));
    return true;
  } catch (error) {
    console.error(ansis.red(i18n.t("codex:errorSwitchingProvider", { error: error.message })));
    return false;
  }
}

const codex = {
  __proto__: null,
  CODEX_DIR: CODEX_DIR,
  applyCodexPlatformCommand: applyCodexPlatformCommand,
  backupCodexAgents: backupCodexAgents,
  backupCodexComplete: backupCodexComplete,
  backupCodexConfig: backupCodexConfig,
  backupCodexFiles: backupCodexFiles,
  backupCodexPrompts: backupCodexPrompts,
  checkCodexUpdate: checkCodexUpdate,
  configureCodexApi: configureCodexApi,
  configureCodexMcp: configureCodexMcp,
  createBackupDirectory: createBackupDirectory,
  ensureEnvKeyMigration: ensureEnvKeyMigration,
  getBackupMessage: getBackupMessage,
  getCodexVersion: getCodexVersion,
  installCodexCli: installCodexCli,
  isCodexInstalled: isCodexInstalled,
  listCodexProviders: listCodexProviders,
  migrateEnvKeyInContent: migrateEnvKeyInContent,
  migrateEnvKeyToTempEnvKey: migrateEnvKeyToTempEnvKey,
  needsEnvKeyMigration: needsEnvKeyMigration,
  parseCodexConfig: parseCodexConfig,
  readCodexConfig: readCodexConfig,
  renderCodexConfig: renderCodexConfig,
  runCodexFullInit: runCodexFullInit,
  runCodexSystemPromptSelection: runCodexSystemPromptSelection,
  runCodexUninstall: runCodexUninstall,
  runCodexUpdate: runCodexUpdate,
  runCodexWorkflowImportWithLanguageSelection: runCodexWorkflowImportWithLanguageSelection,
  runCodexWorkflowSelection: runCodexWorkflowSelection,
  switchCodexProvider: switchCodexProvider,
  switchToOfficialLogin: switchToOfficialLogin,
  switchToProvider: switchToProvider,
  writeAuthFile: writeAuthFile,
  writeCodexConfig: writeCodexConfig
};

export { MCP_SERVICE_CONFIGS as M, readCodexConfig as a, switchToOfficialLogin as b, switchToProvider as c, detectConfigManagementMode as d, backupCodexComplete as e, writeAuthFile as f, selectMcpServices as g, getMcpServices as h, getMcpService as i, applyCodexPlatformCommand as j, runCodexFullInit as k, listCodexProviders as l, runCodexUninstall as m, configureCodexMcp as n, configureCodexApi as o, runCodexWorkflowImportWithLanguageSelection as p, codex as q, runCodexUpdate as r, switchCodexProvider as s, writeCodexConfig as w };
