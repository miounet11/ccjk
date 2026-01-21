import { existsSync } from 'node:fs';
import process__default from 'node:process';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { version } from './package.mjs';
import { k as runCodexFullInit, g as selectMcpServices, h as getMcpServices, M as MCP_SERVICE_CONFIGS } from './codex.mjs';
import { WORKFLOW_CONFIG_BASE } from './workflows.mjs';
import { SETTINGS_FILE, DEFAULT_CODE_TOOL_TYPE, CODE_TOOL_BANNERS, API_DEFAULT_URL } from './constants.mjs';
import { ensureI18nInitialized, i18n } from './index.mjs';
import { d as displayBannerWithInfo, p as padToDisplayWidth } from '../shared/ccjk.BpHTUkb8.mjs';
import { readZcfConfig, updateZcfConfig } from './ccjk-config.mjs';
import { readCcrConfig, backupCcrConfig, createDefaultCcrConfig, writeCcrConfig, configureCcrProxy, setupCcrConfiguration } from './config3.mjs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { updateCcr } from './auto-updater.mjs';
import { w as wrapCommandWithSudo, k as isWindows, i as isTermux } from './platform.mjs';
import { c as addCompletedOnboarding, s as setPrimaryApiKey, b as backupMcpConfig, a as buildMcpServerConfig, r as readMcpConfig, m as mergeMcpServers, f as fixWindowsMcpConfig, w as writeMcpConfig } from './claude-config.mjs';
import { r as resolveCodeType } from '../shared/ccjk.SIo9I8q3.mjs';
import { exists } from './fs-operations.mjs';
import { readJsonConfig, writeJsonConfig } from './json-config.mjs';
import { p as promptApiConfigurationAction, h as ensureClaudeDir, e as getExistingApiConfig, s as switchToOfficialLogin, b as backupExistingConfig, i as copyConfigFiles, a as applyAiLanguageDirective, f as configureApi } from './config2.mjs';
import { a as modifyApiConfigPartially, b as configureApiCompletely, n as needsMigration, m as migrateSettingsForTokenRetrieval, d as displayMigrationResult, p as promptMigration, s as selectAndInstallWorkflows, c as configureOutputStyle, f as formatApiKeyDisplay } from '../shared/ccjk.BF-4_Yho.mjs';
import { h as handleExitPromptError, a as handleGeneralError } from '../shared/ccjk.DvIrK0wz.mjs';
import { getInstallationStatus, installClaudeCode } from './installer2.mjs';
import { a as addNumbersToChoices } from '../shared/ccjk.BFQ7yr5S.mjs';
import { resolveAiOutputLanguage } from './prompts.mjs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'pathe';
import { p as promptBoolean } from '../shared/ccjk.DHbrGcgg.mjs';
import { checkClaudeCodeVersionAndPrompt } from './version-checker.mjs';

const execAsync$2 = promisify(exec);
async function isCcrInstalled() {
  let commandExists = false;
  try {
    await execAsync$2("ccr version");
    commandExists = true;
  } catch {
    try {
      await execAsync$2("which ccr");
      commandExists = true;
    } catch {
      commandExists = false;
    }
  }
  let hasCorrectPackage = false;
  try {
    await execAsync$2("npm list -g @musistudio/claude-code-router");
    hasCorrectPackage = true;
  } catch {
    hasCorrectPackage = false;
  }
  return {
    isInstalled: commandExists,
    hasCorrectPackage
  };
}
async function installCcr() {
  ensureI18nInitialized();
  const { isInstalled, hasCorrectPackage } = await isCcrInstalled();
  if (hasCorrectPackage) {
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrAlreadyInstalled")}`));
    await updateCcr();
    return;
  }
  if (isInstalled && !hasCorrectPackage) {
    try {
      await execAsync$2("npm list -g claude-code-router");
      console.log(ansis.yellow(`\u26A0 ${i18n.t("ccr:detectedIncorrectPackage")}`));
      try {
        await execAsync$2("npm uninstall -g claude-code-router");
        console.log(ansis.green(`\u2714 ${i18n.t("ccr:uninstalledIncorrectPackage")}`));
      } catch {
        console.log(ansis.yellow(`\u26A0 ${i18n.t("ccr:failedToUninstallIncorrectPackage")}`));
      }
    } catch {
    }
  }
  console.log(ansis.green(`\u{1F4E6} ${i18n.t("ccr:installingCcr")}`));
  try {
    const installArgs = ["install", "-g", "@musistudio/claude-code-router", "--force"];
    const { command, args, usedSudo } = wrapCommandWithSudo("npm", installArgs);
    if (usedSudo) {
      console.log(ansis.yellow(`\u2139 ${i18n.t("installation:usingSudo")}`));
    }
    await execAsync$2([command, ...args].join(" "));
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrInstallSuccess")}`));
  } catch (error) {
    if (error.message?.includes("EEXIST")) {
      console.log(ansis.yellow(`\u26A0 ${i18n.t("ccr:ccrAlreadyInstalled")}`));
      await updateCcr();
      return;
    }
    console.error(ansis.red(`\u2716 ${i18n.t("ccr:ccrInstallFailed")}`));
    throw error;
  }
}

const execAsync$1 = promisify(exec);
function getClaudePluginDir() {
  return join(homedir(), ".claude", "plugins");
}
function getSuperpowersPath() {
  return join(getClaudePluginDir(), "superpowers");
}
async function checkSuperpowersInstalled() {
  const superpowersPath = getSuperpowersPath();
  if (!existsSync(superpowersPath)) {
    return { installed: false };
  }
  try {
    const packageJsonPath = join(superpowersPath, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
      const skillsDir = join(superpowersPath, "skills");
      let skillCount = 0;
      if (existsSync(skillsDir)) {
        const { readdir } = await import('node:fs/promises');
        const entries = await readdir(skillsDir, { withFileTypes: true });
        skillCount = entries.filter((e) => e.isDirectory()).length;
      }
      return {
        installed: true,
        version: packageJson.version,
        skillCount,
        path: superpowersPath
      };
    }
    return { installed: true, path: superpowersPath };
  } catch {
    return { installed: true, path: superpowersPath };
  }
}
async function installSuperpowers(options) {
  try {
    const status = await checkSuperpowersInstalled();
    if (status.installed) {
      return {
        success: true,
        message: i18n.t("superpowers:alreadyInstalled")
      };
    }
    const result = await installSuperpowersViaGit();
    if (result.success && options.enableCloudSync && options.cloudProvider && options.cloudCredentials) {
      try {
        const { configureCloudSync } = await import('./cloud-sync.mjs');
        await configureCloudSync(options.cloudProvider, options.cloudCredentials);
        console.log(i18n.t("superpowers:cloudSync.configured"));
      } catch (error) {
        console.warn(i18n.t("superpowers:cloudSync.configFailed"), error);
      }
    }
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: i18n.t("superpowers:installFailed"),
      error: errorMessage
    };
  }
}
async function installSuperpowersViaGit() {
  try {
    const pluginDir = getClaudePluginDir();
    const superpowersPath = getSuperpowersPath();
    const { mkdir } = await import('node:fs/promises');
    await mkdir(pluginDir, { recursive: true });
    console.log(i18n.t("superpowers:cloning"));
    await execAsync$1(
      `git clone https://github.com/obra/superpowers.git "${superpowersPath}"`,
      { timeout: 12e4 }
    );
    const status = await checkSuperpowersInstalled();
    if (status.installed) {
      return {
        success: true,
        message: i18n.t("superpowers:installSuccess")
      };
    }
    return {
      success: false,
      message: i18n.t("superpowers:installFailed")
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: i18n.t("superpowers:installFailed"),
      error: errorMessage
    };
  }
}
async function uninstallSuperpowers() {
  try {
    const status = await checkSuperpowersInstalled();
    if (!status.installed) {
      return {
        success: true,
        message: i18n.t("superpowers:notInstalled")
      };
    }
    const superpowersPath = getSuperpowersPath();
    if (existsSync(superpowersPath)) {
      const { rm } = await import('node:fs/promises');
      await rm(superpowersPath, { recursive: true, force: true });
    }
    const newStatus = await checkSuperpowersInstalled();
    if (!newStatus.installed) {
      return {
        success: true,
        message: i18n.t("superpowers:uninstallSuccess")
      };
    }
    return {
      success: false,
      message: i18n.t("superpowers:uninstallFailed")
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: i18n.t("superpowers:uninstallFailed"),
      error: errorMessage
    };
  }
}
async function updateSuperpowers() {
  try {
    const status = await checkSuperpowersInstalled();
    if (!status.installed) {
      return {
        success: false,
        message: i18n.t("superpowers:notInstalled")
      };
    }
    const superpowersPath = getSuperpowersPath();
    await execAsync$1("git pull", {
      cwd: superpowersPath,
      timeout: 6e4
    });
    return {
      success: true,
      message: i18n.t("superpowers:updateSuccess")
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: i18n.t("superpowers:updateFailed"),
      error: errorMessage
    };
  }
}
async function getSuperpowersSkills() {
  try {
    const status = await checkSuperpowersInstalled();
    if (!status.installed || !status.path) {
      return [];
    }
    const skillsDir = join(status.path, "skills");
    if (!existsSync(skillsDir)) {
      return [];
    }
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(skillsDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

const COMETIX_PACKAGE_NAME = "@cometix/ccline";
const COMETIX_COMMAND_NAME = "ccline";
const COMETIX_COMMANDS = {
  CHECK_INSTALL: `npm list -g ${COMETIX_PACKAGE_NAME}`,
  INSTALL: `npm install -g ${COMETIX_PACKAGE_NAME}`,
  UPDATE: `npm update -g ${COMETIX_PACKAGE_NAME}`,
  PRINT_CONFIG: `${COMETIX_COMMAND_NAME} --print`,
  TUI_CONFIG: `${COMETIX_COMMAND_NAME} -c`
};

function getPlatformStatusLineConfig() {
  return {
    type: "command",
    command: isWindows() ? "%USERPROFILE%\\.claude\\ccline\\ccline.exe" : "~/.claude/ccline/ccline",
    padding: 0
  };
}

function addCCometixLineConfig() {
  try {
    const statusLineConfig = getPlatformStatusLineConfig();
    let settings = {};
    if (exists(SETTINGS_FILE)) {
      settings = readJsonConfig(SETTINGS_FILE) || {};
    }
    settings.statusLine = statusLineConfig;
    writeJsonConfig(SETTINGS_FILE, settings);
    return true;
  } catch (error) {
    console.error("Failed to add CCometixLine configuration:", error);
    return false;
  }
}
function hasCCometixLineConfig() {
  try {
    if (!exists(SETTINGS_FILE)) {
      return false;
    }
    const settings = readJsonConfig(SETTINGS_FILE);
    return !!settings?.statusLine?.command?.includes("ccline");
  } catch {
    return false;
  }
}

const execAsync = promisify(exec);
async function isCometixLineInstalled() {
  try {
    await execAsync(COMETIX_COMMANDS.CHECK_INSTALL);
    return true;
  } catch {
    return false;
  }
}
async function installCometixLine() {
  ensureI18nInitialized();
  const runInstallCommand = async () => {
    const installArgs = ["install", "-g", COMETIX_PACKAGE_NAME];
    const { command, args, usedSudo } = wrapCommandWithSudo("npm", installArgs);
    if (usedSudo) {
      console.log(ansis.yellow(`\u2139 ${i18n.t("installation:usingSudo")}`));
    }
    await execAsync([command, ...args].join(" "));
  };
  const isInstalled = await isCometixLineInstalled();
  if (isInstalled) {
    console.log(ansis.green(`\u2714 ${i18n.t("cometix:cometixAlreadyInstalled")}`));
    try {
      console.log(ansis.green(`${i18n.t("cometix:installingOrUpdating")}`));
      await runInstallCommand();
      console.log(ansis.green(`\u2714 ${i18n.t("cometix:installUpdateSuccess")}`));
    } catch (error) {
      console.log(ansis.yellow(`\u26A0 ${i18n.t("cometix:installUpdateFailed")}: ${error}`));
    }
    if (!hasCCometixLineConfig()) {
      try {
        addCCometixLineConfig();
        console.log(ansis.green(`\u2714 ${i18n.t("cometix:statusLineConfigured") || "Claude Code statusLine configured"}`));
      } catch (error) {
        console.log(ansis.yellow(`\u26A0 ${i18n.t("cometix:statusLineConfigFailed") || "Failed to configure statusLine"}: ${error}`));
      }
    } else {
      console.log(ansis.green(`\u2139 ${i18n.t("cometix:statusLineAlreadyConfigured") || "Claude Code statusLine already configured"}`));
    }
    return;
  }
  try {
    console.log(ansis.green(`${i18n.t("cometix:installingCometix")}`));
    await runInstallCommand();
    console.log(ansis.green(`\u2714 ${i18n.t("cometix:cometixInstallSuccess")}`));
    try {
      addCCometixLineConfig();
      console.log(ansis.green(`\u2714 ${i18n.t("cometix:statusLineConfigured") || "Claude Code statusLine configured"}`));
    } catch (configError) {
      console.log(ansis.yellow(`\u26A0 ${i18n.t("cometix:statusLineConfigFailed") || "Failed to configure statusLine"}: ${configError}`));
      console.log(ansis.green(`\u{1F4A1} ${i18n.t("cometix:statusLineManualConfig") || "Please manually add statusLine configuration to Claude Code settings"}`));
    }
  } catch (error) {
    console.error(ansis.red(`\u2717 ${i18n.t("cometix:cometixInstallFailed")}: ${error}`));
    throw error;
  }
}

async function validateSkipPromptOptions(options) {
  if (options.allLang) {
    if (options.allLang === "zh-CN" || options.allLang === "en") {
      options.configLang = options.allLang;
      options.aiOutputLang = options.allLang;
    } else {
      options.configLang = "en";
      options.aiOutputLang = options.allLang;
    }
  }
  if (options.provider) {
    const { getValidProviderIds, getProviderPreset } = await import('./api-providers.mjs');
    const validProviders = [...getValidProviderIds(), "custom"];
    if (!validProviders.includes(options.provider)) {
      throw new Error(
        i18n.t("errors:invalidProvider", {
          provider: options.provider,
          validProviders: validProviders.join(", ")
        })
      );
    }
    if (!options.apiType) {
      const preset = options.provider !== "custom" ? getProviderPreset(options.provider) : null;
      options.apiType = preset?.claudeCode?.authType || "api_key";
    }
  }
  if (!options.configAction) {
    options.configAction = "backup";
  }
  if (typeof options.outputStyles === "string") {
    if (options.outputStyles === "skip") {
      options.outputStyles = false;
    } else if (options.outputStyles === "all") {
      options.outputStyles = ["speed-coder", "senior-architect", "pair-programmer"];
    } else {
      options.outputStyles = options.outputStyles.split(",").map((s) => s.trim());
    }
  }
  if (options.outputStyles === void 0) {
    options.outputStyles = ["speed-coder", "senior-architect", "pair-programmer"];
  }
  if (!options.defaultOutputStyle) {
    options.defaultOutputStyle = "senior-architect";
  }
  if (typeof options.installCometixLine === "string") {
    options.installCometixLine = options.installCometixLine.toLowerCase() === "true";
  }
  if (options.installCometixLine === void 0) {
    options.installCometixLine = true;
  }
  if (typeof options.installSuperpowers === "string") {
    options.installSuperpowers = options.installSuperpowers.toLowerCase() === "true";
  }
  if (options.installSuperpowers === void 0) {
    options.installSuperpowers = false;
  }
  if (options.configAction && !["new", "backup", "merge", "docs-only", "skip"].includes(options.configAction)) {
    throw new Error(
      i18n.t("errors:invalidConfigAction", { value: options.configAction })
    );
  }
  if (options.apiType && !["auth_token", "api_key", "ccr_proxy", "skip"].includes(options.apiType)) {
    throw new Error(
      i18n.t("errors:invalidApiType", { value: options.apiType })
    );
  }
  if (options.apiConfigs && options.apiConfigsFile) {
    throw new Error(i18n.t("multi-config:conflictingParams"));
  }
  const modelParams = [
    ["apiModel", options.apiModel],
    ["apiHaikuModel", options.apiHaikuModel],
    ["apiSonnetModel", options.apiSonnetModel],
    ["apiOpusModel", options.apiOpusModel]
  ];
  for (const [key, value] of modelParams) {
    if (value !== void 0 && typeof value !== "string") {
      if (key === "apiModel")
        throw new Error(i18n.t("errors:invalidApiModel", { value }));
      throw new Error(i18n.t("errors:invalidModelParam", { key, value }));
    }
  }
  if (options.apiType === "api_key" && !options.apiKey) {
    throw new Error(i18n.t("errors:apiKeyRequiredForApiKey"));
  }
  if (options.apiType === "auth_token" && !options.apiKey) {
    throw new Error(i18n.t("errors:apiKeyRequiredForAuthToken"));
  }
  if (typeof options.mcpServices === "string") {
    if (options.mcpServices === "skip") {
      options.mcpServices = false;
    } else if (options.mcpServices === "all") {
      options.mcpServices = MCP_SERVICE_CONFIGS.filter((s) => !s.requiresApiKey).map((s) => s.id);
    } else {
      options.mcpServices = options.mcpServices.split(",").map((s) => s.trim());
    }
  }
  if (Array.isArray(options.mcpServices)) {
    const validServices = MCP_SERVICE_CONFIGS.map((s) => s.id);
    for (const service of options.mcpServices) {
      if (!validServices.includes(service)) {
        throw new Error(i18n.t("errors:invalidMcpService", { service, validServices: validServices.join(", ") }));
      }
    }
  }
  if (Array.isArray(options.outputStyles)) {
    const validStyles = ["speed-coder", "senior-architect", "pair-programmer", "default", "explanatory", "learning"];
    for (const style of options.outputStyles) {
      if (!validStyles.includes(style)) {
        throw new Error(i18n.t("errors:invalidOutputStyle", { style, validStyles: validStyles.join(", ") }));
      }
    }
  }
  if (options.defaultOutputStyle) {
    const validStyles = ["speed-coder", "senior-architect", "pair-programmer", "default", "explanatory", "learning"];
    if (!validStyles.includes(options.defaultOutputStyle)) {
      throw new Error(i18n.t("errors:invalidDefaultOutputStyle", { style: options.defaultOutputStyle, validStyles: validStyles.join(", ") }));
    }
  }
  if (typeof options.workflows === "string") {
    if (options.workflows === "skip") {
      options.workflows = false;
    } else if (options.workflows === "all") {
      options.workflows = WORKFLOW_CONFIG_BASE.map((w) => w.id);
    } else {
      options.workflows = options.workflows.split(",").map((s) => s.trim());
    }
  }
  if (Array.isArray(options.workflows)) {
    const validWorkflows = WORKFLOW_CONFIG_BASE.map((w) => w.id);
    for (const workflow of options.workflows) {
      if (!validWorkflows.includes(workflow)) {
        throw new Error(i18n.t("errors:invalidWorkflow", { workflow, validWorkflows: validWorkflows.join(", ") }));
      }
    }
  }
  if (options.mcpServices === void 0) {
    options.mcpServices = "all";
    options.mcpServices = MCP_SERVICE_CONFIGS.filter((s) => !s.requiresApiKey).map((s) => s.id);
  }
  if (options.workflows === void 0) {
    options.workflows = "all";
    options.workflows = WORKFLOW_CONFIG_BASE.map((w) => w.id);
  }
}
async function handleSuperpowersInstallation(options) {
  try {
    const status = await checkSuperpowersInstalled();
    if (status.installed) {
      console.log(ansis.green(`\u2714 ${i18n.t("superpowers:alreadyInstalled")}`));
      if (status.version) {
        console.log(ansis.gray(`  ${i18n.t("superpowers:status.version", { version: status.version })}`));
      }
      if (status.skillCount) {
        console.log(ansis.gray(`  ${i18n.t("superpowers:status.skillCount", { count: status.skillCount })}`));
      }
      return;
    }
    let shouldInstall = false;
    if (options.skipPrompt) {
      shouldInstall = options.installSuperpowers === true;
    } else {
      console.log(ansis.green(`
${i18n.t("superpowers:title")}`));
      console.log(ansis.gray(i18n.t("superpowers:description")));
      console.log(ansis.gray(i18n.t("superpowers:installPromptDescription")));
      shouldInstall = await promptBoolean({
        message: i18n.t("superpowers:installPrompt"),
        defaultValue: false
      });
    }
    if (!shouldInstall) {
      console.log(ansis.yellow(i18n.t("common:skip")));
      return;
    }
    const result = await installSuperpowers({
      lang: i18n.language,
      skipPrompt: options.skipPrompt
    });
    if (result.success) {
      console.log(ansis.green(`\u2714 ${result.message}`));
    } else {
      console.error(ansis.red(`\u2716 ${result.message}`));
      if (result.error) {
        console.error(ansis.gray(`  ${result.error}`));
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(ansis.red(`${i18n.t("superpowers:installFailed")}: ${errorMessage}`));
  }
}
async function init(options = {}) {
  if (options.skipPrompt) {
    await validateSkipPromptOptions(options);
  }
  try {
    const zcfConfig = readZcfConfig();
    let codeToolType;
    try {
      codeToolType = await resolveCodeType(options.codeType);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(ansis.red(`${i18n.t("errors:generalError")} ${errorMessage}`));
      codeToolType = DEFAULT_CODE_TOOL_TYPE;
    }
    options.codeType = codeToolType;
    async function selectApiConfigurationMode() {
      const { apiMode } = await inquirer.prompt({
        type: "list",
        name: "apiMode",
        message: i18n.t("api:selectApiMode"),
        choices: [
          {
            name: i18n.t("api:useOfficialLogin"),
            value: "official"
          },
          {
            name: i18n.t("api:customApiConfig"),
            value: "custom"
          },
          {
            name: i18n.t("api:useCcrProxy"),
            value: "ccr"
          },
          {
            name: i18n.t("api:skipApi"),
            value: "skip"
          }
        ]
      });
      return apiMode;
    }
    async function handleCustomApiConfiguration(existingConfig) {
      if (codeToolType === "claude-code") {
        const { configureIncrementalManagement } = await import('./claude-code-incremental-manager.mjs');
        await configureIncrementalManagement();
        return null;
      }
      if (existingConfig) {
        const customConfigAction = await promptApiConfigurationAction();
        if (customConfigAction === "modify-partial") {
          await modifyApiConfigPartially(existingConfig);
          return null;
        } else if (customConfigAction === "modify-all") {
          return await configureApiCompletely();
        } else if (customConfigAction === "keep-existing") {
          try {
            addCompletedOnboarding();
          } catch (error) {
            console.error(ansis.red(i18n.t("errors:failedToSetOnboarding")), error);
          }
          try {
            setPrimaryApiKey();
          } catch (error) {
            const { ensureI18nInitialized, i18n: i18nModule } = await import('./index.mjs');
            ensureI18nInitialized();
            console.error(i18nModule.t("mcp:primaryApiKeySetFailed"), error);
          }
          return null;
        }
      } else {
        const { apiChoice } = await inquirer.prompt({
          type: "list",
          name: "apiChoice",
          message: i18n.t("api:configureApi"),
          choices: [
            {
              name: `${i18n.t("api:useAuthToken")} - ${ansis.gray(i18n.t("api:authTokenDesc"))}`,
              value: "auth_token",
              short: i18n.t("api:useAuthToken")
            },
            {
              name: `${i18n.t("api:useApiKey")} - ${ansis.gray(i18n.t("api:apiKeyDesc"))}`,
              value: "api_key",
              short: i18n.t("api:useApiKey")
            }
          ]
        });
        if (!apiChoice) {
          console.log(ansis.yellow(i18n.t("common:cancelled")));
          process__default.exit(0);
        }
        return await configureApiCompletely(apiChoice);
      }
    }
    if (!options.skipBanner) {
      displayBannerWithInfo(CODE_TOOL_BANNERS[codeToolType] || "CCJK");
    }
    if (isTermux()) {
      console.log(ansis.yellow(`
\u2139 ${i18n.t("installation:termuxDetected")}`));
      console.log(ansis.gray(i18n.t("installation:termuxEnvironmentInfo")));
    }
    let configLang = options.configLang;
    if (codeToolType === "codex") {
      if (!configLang) {
        if (options.skipPrompt) {
          configLang = zcfConfig?.templateLang || "en";
        } else {
          configLang = zcfConfig?.templateLang || i18n.language || "en";
        }
      }
    } else {
      if (!configLang) {
        const { resolveTemplateLanguage } = await import('./prompts.mjs');
        configLang = await resolveTemplateLanguage(
          options.configLang,
          zcfConfig,
          options.skipPrompt
        );
      }
    }
    if (!configLang) {
      configLang = "en";
    }
    if (codeToolType === "codex") {
      if (options.skipPrompt)
        process__default.env.CCJK_CODEX_SKIP_PROMPT_SINGLE_BACKUP = "true";
      const hasApiConfigs = Boolean(options.apiConfigs || options.apiConfigsFile);
      const apiMode = hasApiConfigs ? "skip" : options.apiType === "auth_token" ? "official" : options.apiType === "api_key" ? "custom" : options.apiType === "skip" ? "skip" : options.skipPrompt ? "skip" : void 0;
      const customApiConfig = !hasApiConfigs && options.apiType === "api_key" && options.apiKey ? {
        type: "api_key",
        token: options.apiKey,
        baseUrl: options.apiUrl,
        model: options.apiModel
        // Add model parameter for Codex
      } : void 0;
      let selectedWorkflows;
      if (Array.isArray(options.workflows)) {
        selectedWorkflows = options.workflows;
      } else if (typeof options.workflows === "string") {
        selectedWorkflows = [options.workflows];
      } else if (options.workflows === true) {
        selectedWorkflows = [];
      }
      if (hasApiConfigs) {
        await handleMultiConfigurations(options, "codex");
      }
      const resolvedAiOutputLang = await runCodexFullInit({
        aiOutputLang: options.aiOutputLang,
        skipPrompt: options.skipPrompt,
        apiMode,
        customApiConfig,
        workflows: selectedWorkflows
      });
      updateZcfConfig({
        version,
        preferredLang: i18n.language,
        // CCJK界面语言
        templateLang: configLang,
        // 模板语言
        aiOutputLang: resolvedAiOutputLang ?? options.aiOutputLang ?? zcfConfig?.aiOutputLang ?? "en",
        codeToolType
      });
      console.log(ansis.green(i18n.t("codex:setupComplete")));
      return;
    }
    const aiOutputLang = await resolveAiOutputLanguage(i18n.language, options.aiOutputLang, zcfConfig, options.skipPrompt);
    const installationStatus = await getInstallationStatus();
    if (installationStatus.hasGlobal) {
      const { verifyInstallation, displayVerificationResult } = await import('./installer2.mjs');
      const verification = await verifyInstallation("claude-code");
      if (verification.symlinkCreated) {
        console.log(ansis.green(`\u2714 ${i18n.t("installation:alreadyInstalled")}`));
        displayVerificationResult(verification, "claude-code");
      } else if (!verification.success) {
        console.log(ansis.yellow(`\u26A0 ${i18n.t("installation:verificationFailed")}`));
        if (verification.error) {
          console.log(ansis.gray(`  ${verification.error}`));
        }
      }
    } else {
      if (options.skipPrompt) {
        await installClaudeCode(true);
      } else {
        const shouldInstall = await promptBoolean({
          message: i18n.t("installation:installPrompt"),
          defaultValue: true
        });
        if (shouldInstall) {
          await installClaudeCode(false);
        } else {
          console.log(ansis.yellow(i18n.t("common:skip")));
        }
      }
    }
    if (installationStatus.hasGlobal) {
      await checkClaudeCodeVersionAndPrompt(options.skipPrompt);
    }
    ensureClaudeDir();
    if (existsSync(SETTINGS_FILE) && needsMigration()) {
      if (options.skipPrompt) {
        console.log(ansis.yellow("\n\u26A0\uFE0F  Problematic configuration detected. Auto-fixing...\n"));
        const result = migrateSettingsForTokenRetrieval();
        displayMigrationResult(result);
      } else {
        const shouldMigrate = await promptMigration();
        if (shouldMigrate) {
          const result = migrateSettingsForTokenRetrieval();
          displayMigrationResult(result);
        }
      }
    }
    let action = "new";
    if (existsSync(SETTINGS_FILE) && !options.force) {
      if (options.skipPrompt) {
        action = options.configAction || "backup";
        if (action === "skip") {
          console.log(ansis.yellow(i18n.t("common:skip")));
          return;
        }
      } else {
        const { action: userAction } = await inquirer.prompt({
          type: "list",
          name: "action",
          message: i18n.t("configuration:existingConfig"),
          choices: addNumbersToChoices([
            { name: i18n.t("configuration:backupAndOverwrite"), value: "backup" },
            { name: i18n.t("configuration:updateDocsOnly"), value: "docs-only" },
            { name: i18n.t("configuration:mergeConfig"), value: "merge" },
            { name: i18n.t("common:skip"), value: "skip" }
          ])
        });
        if (!userAction) {
          console.log(ansis.yellow(i18n.t("common:cancelled")));
          process__default.exit(0);
        }
        action = userAction;
        if (action === "skip") {
          console.log(ansis.yellow(i18n.t("common:skip")));
          return;
        }
      }
    } else if (options.skipPrompt && options.configAction) {
      action = options.configAction;
    }
    let apiConfig = null;
    const isNewInstall = !existsSync(SETTINGS_FILE);
    if (action !== "docs-only" && (isNewInstall || ["backup", "merge", "new"].includes(action))) {
      if (options.skipPrompt) {
        if (options.apiConfigs || options.apiConfigsFile) {
          await handleMultiConfigurations(options, codeToolType);
          apiConfig = null;
        } else if (options.provider && options.apiKey) {
          const { getProviderPreset } = await import('./api-providers.mjs');
          const preset = options.provider !== "custom" ? getProviderPreset(options.provider) : null;
          apiConfig = {
            authType: preset?.claudeCode?.authType || "api_key",
            key: options.apiKey,
            url: preset?.claudeCode?.baseUrl || options.apiUrl || API_DEFAULT_URL
          };
          if (preset?.claudeCode?.defaultModels && preset.claudeCode.defaultModels.length > 0) {
            const [primary, haiku, sonnet, opus] = preset.claudeCode.defaultModels;
            options.apiModel = options.apiModel || primary;
            options.apiHaikuModel = options.apiHaikuModel || haiku;
            options.apiSonnetModel = options.apiSonnetModel || sonnet;
            options.apiOpusModel = options.apiOpusModel || opus;
          }
          await saveSingleConfigToToml(apiConfig, options.provider, options);
        } else if (options.apiType === "auth_token" && options.apiKey) {
          apiConfig = {
            authType: "auth_token",
            key: options.apiKey,
            url: options.apiUrl || API_DEFAULT_URL
          };
          await saveSingleConfigToToml(apiConfig, void 0, options);
        } else if (options.apiType === "api_key" && options.apiKey) {
          apiConfig = {
            authType: "api_key",
            key: options.apiKey,
            url: options.apiUrl || API_DEFAULT_URL
          };
          await saveSingleConfigToToml(apiConfig, void 0, options);
        } else if (options.apiType === "ccr_proxy") {
          const ccrStatus = await isCcrInstalled();
          if (!ccrStatus.hasCorrectPackage) {
            await installCcr();
          } else {
            console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrAlreadyInstalled")}`));
          }
          const existingCcrConfig = readCcrConfig();
          if (existingCcrConfig) {
            const backupPath = await backupCcrConfig();
            if (backupPath) {
              console.log(ansis.gray(`\u2714 ${i18n.t("ccr:ccrBackupSuccess")}: ${backupPath}`));
            }
          }
          const defaultCcrConfig = createDefaultCcrConfig();
          writeCcrConfig(defaultCcrConfig);
          console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrConfigSuccess")}`));
          await configureCcrProxy(defaultCcrConfig);
          console.log(ansis.green(`\u2714 ${i18n.t("ccr:proxyConfigSuccess")}`));
          try {
            addCompletedOnboarding();
          } catch (error) {
            console.error(ansis.red(i18n.t("errors:failedToSetOnboarding")), error);
          }
          apiConfig = null;
        }
      } else {
        const existingApiConfig = getExistingApiConfig();
        const apiMode = await selectApiConfigurationMode();
        switch (apiMode) {
          case "official": {
            const success = switchToOfficialLogin();
            if (success) {
              console.log(ansis.green(`\u2714 ${i18n.t("api:officialLoginConfigured")}`));
              apiConfig = null;
            } else {
              console.log(ansis.red(i18n.t("api:officialLoginFailed")));
            }
            break;
          }
          case "custom":
            apiConfig = await handleCustomApiConfiguration(existingApiConfig);
            break;
          case "ccr": {
            const ccrStatus = await isCcrInstalled();
            if (!ccrStatus.hasCorrectPackage) {
              await installCcr();
            } else {
              console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrAlreadyInstalled")}`));
            }
            const ccrConfigured = await setupCcrConfiguration();
            if (ccrConfigured) {
              console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrSetupComplete")}`));
              apiConfig = null;
            }
            break;
          }
          case "skip":
            apiConfig = null;
            break;
          default:
            console.log(ansis.yellow(i18n.t("common:cancelled")));
            process__default.exit(0);
        }
      }
    }
    if (["backup", "docs-only", "merge"].includes(action)) {
      const backupDir = backupExistingConfig();
      if (backupDir) {
        console.log(ansis.gray(`\u2714 ${i18n.t("configuration:backupSuccess")}: ${backupDir}`));
      }
    }
    if (action === "docs-only") {
      copyConfigFiles(true);
      if (options.skipPrompt) {
        if (options.workflows !== false) {
          await selectAndInstallWorkflows(configLang, options.workflows);
        }
      } else {
        await selectAndInstallWorkflows(configLang);
      }
    } else if (["backup", "merge", "new"].includes(action)) {
      copyConfigFiles(false);
      if (options.skipPrompt) {
        if (options.workflows !== false) {
          await selectAndInstallWorkflows(configLang, options.workflows);
        }
      } else {
        await selectAndInstallWorkflows(configLang);
      }
    }
    applyAiLanguageDirective(aiOutputLang);
    if (options.skipPrompt) {
      if (options.outputStyles !== false) {
        await configureOutputStyle(
          options.outputStyles,
          options.defaultOutputStyle
        );
      }
    } else {
      await configureOutputStyle();
    }
    if (apiConfig && action !== "docs-only") {
      const configuredApi = configureApi(apiConfig);
      if (configuredApi) {
        console.log(ansis.green(`\u2714 ${i18n.t("api:apiConfigSuccess")}`));
        console.log(ansis.gray(`  URL: ${configuredApi.url}`));
        console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`));
      }
    }
    const hasModelParams = options.apiModel || options.apiHaikuModel || options.apiSonnetModel || options.apiOpusModel;
    if (hasModelParams && action !== "docs-only" && codeToolType === "claude-code") {
      if (options.skipPrompt) {
        const { updateCustomModel } = await import('./config2.mjs').then(function (n) { return n.j; });
        updateCustomModel(
          options.apiModel || void 0,
          options.apiHaikuModel || void 0,
          options.apiSonnetModel || void 0,
          options.apiOpusModel || void 0
        );
        console.log(ansis.green(`\u2714 ${i18n.t("api:modelConfigSuccess")}`));
        if (options.apiModel) {
          console.log(ansis.gray(`  ${i18n.t("api:primaryModel")}: ${options.apiModel}`));
        }
        if (options.apiHaikuModel)
          console.log(ansis.gray(`  Haiku: ${options.apiHaikuModel}`));
        if (options.apiSonnetModel)
          console.log(ansis.gray(`  Sonnet: ${options.apiSonnetModel}`));
        if (options.apiOpusModel)
          console.log(ansis.gray(`  Opus: ${options.apiOpusModel}`));
      }
    }
    if (action !== "docs-only") {
      let shouldConfigureMcp = false;
      if (options.skipPrompt) {
        shouldConfigureMcp = options.mcpServices !== false;
      } else {
        const userChoice = await promptBoolean({
          message: i18n.t("mcp:configureMcp"),
          defaultValue: true
        });
        shouldConfigureMcp = userChoice;
      }
      if (shouldConfigureMcp) {
        if (isWindows()) {
          console.log(ansis.green(`\u2139 ${i18n.t("installation:windowsDetected")}`));
        }
        let selectedServices;
        if (options.skipPrompt) {
          selectedServices = options.mcpServices;
        } else {
          selectedServices = await selectMcpServices();
          if (selectedServices === void 0) {
            process__default.exit(0);
          }
        }
        if (selectedServices.length > 0) {
          const mcpBackupPath = backupMcpConfig();
          if (mcpBackupPath) {
            console.log(ansis.gray(`\u2714 ${i18n.t("mcp:mcpBackupSuccess")}: ${mcpBackupPath}`));
          }
          const newServers = {};
          for (const serviceId of selectedServices) {
            const services = await getMcpServices();
            const service = services.find((s) => s.id === serviceId);
            if (!service)
              continue;
            let config = service.config;
            if (service.id === "serena" && Array.isArray(config.args)) {
              const adjusted = { ...config, args: [...config.args || []] };
              const idx = adjusted.args.indexOf("--context");
              if (idx >= 0 && idx + 1 < adjusted.args.length) {
                adjusted.args[idx + 1] = codeToolType === "codex" ? "codex" : "ide-assistant";
              } else {
                adjusted.args.push("--context", codeToolType === "codex" ? "codex" : "ide-assistant");
              }
              config = adjusted;
            }
            if (service.requiresApiKey) {
              if (options.skipPrompt) {
                console.log(ansis.yellow(`${i18n.t("common:skip")}: ${service.name} (requires API key)`));
                continue;
              } else {
                const response = await inquirer.prompt({
                  type: "input",
                  name: "apiKey",
                  message: service.apiKeyPrompt,
                  validate: (value) => !!value || i18n.t("api:keyRequired")
                });
                if (!response.apiKey) {
                  console.log(ansis.yellow(`${i18n.t("common:skip")}: ${service.name}`));
                  continue;
                }
                config = buildMcpServerConfig(service.config, response.apiKey, service.apiKeyPlaceholder, service.apiKeyEnvVar);
              }
            }
            newServers[service.id] = config;
          }
          const existingConfig = readMcpConfig();
          let mergedConfig = mergeMcpServers(existingConfig, newServers);
          mergedConfig = fixWindowsMcpConfig(mergedConfig);
          try {
            writeMcpConfig(mergedConfig);
            console.log(ansis.green(`\u2714 ${i18n.t("mcp:mcpConfigSuccess")}`));
            const { checkMcpPerformance, formatPerformanceWarning } = await import('./mcp-performance.mjs').then(function (n) { return n.e; });
            const serviceCount = Object.keys(newServers).length;
            const perfWarning = checkMcpPerformance(serviceCount);
            if (perfWarning) {
              console.log("");
              console.log(formatPerformanceWarning(perfWarning, i18n.language));
            }
          } catch (error) {
            console.error(ansis.red(`${i18n.t("errors:failedToWriteMcpConfig")} ${error}`));
          }
        }
      }
    }
    const cometixInstalled = await isCometixLineInstalled();
    if (!cometixInstalled) {
      let shouldInstallCometix = false;
      if (options.skipPrompt) {
        shouldInstallCometix = options.installCometixLine !== false;
      } else {
        const userChoice = await promptBoolean({
          message: i18n.t("cometix:installCometixPrompt"),
          defaultValue: true
        });
        shouldInstallCometix = userChoice;
      }
      if (shouldInstallCometix) {
        await installCometixLine();
      } else {
        console.log(ansis.yellow(i18n.t("cometix:cometixSkipped")));
      }
    } else {
      console.log(ansis.green(`\u2714 ${i18n.t("cometix:cometixAlreadyInstalled")}`));
    }
    if (!options.skipPrompt || options.installSuperpowers) {
      await handleSuperpowersInstallation(options);
    }
    try {
      const { injectSmartGuide } = await import('./smart-guide.mjs');
      const smartGuideSuccess = await injectSmartGuide(configLang);
      if (smartGuideSuccess) {
        console.log(ansis.green(`\u2714 ${i18n.t("smartGuide:enabled")}`));
      }
    } catch {
      console.log(ansis.gray(`\u2139 ${i18n.t("smartGuide:skipped")}`));
    }
    updateZcfConfig({
      version,
      preferredLang: i18n.language,
      // CCJK界面语言
      templateLang: configLang,
      // 模板语言
      aiOutputLang,
      codeToolType
    });
    console.log("");
    console.log(ansis.bold.green("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"));
    console.log(ansis.bold.green("\u2551") + ansis.bold.white(padToDisplayWidth(`  ${i18n.t("configuration:setupCompleteTitle")}`, 62)) + ansis.bold.green("\u2551"));
    console.log(ansis.bold.green("\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563"));
    console.log(`${ansis.bold.green("\u2551")}                                                              ${ansis.bold.green("\u2551")}`);
    console.log(ansis.bold.green("\u2551") + ansis.green(padToDisplayWidth(`  ${i18n.t("configuration:nextSteps")}`, 62)) + ansis.bold.green("\u2551"));
    console.log(`${ansis.bold.green("\u2551")}                                                              ${ansis.bold.green("\u2551")}`);
    console.log(ansis.bold.green("\u2551") + padToDisplayWidth(`  ${i18n.t("configuration:guidanceStep1")}`, 62) + ansis.bold.green("\u2551"));
    console.log(ansis.bold.green("\u2551") + ansis.dim(padToDisplayWidth(`     ${i18n.t("configuration:guidanceStep1Detail")}`, 62)) + ansis.bold.green("\u2551"));
    console.log(ansis.bold.green("\u2551") + ansis.dim(padToDisplayWidth(`     ${i18n.t("configuration:guidanceStep1Detail2")}`, 62)) + ansis.bold.green("\u2551"));
    console.log(`${ansis.bold.green("\u2551")}                                                              ${ansis.bold.green("\u2551")}`);
    console.log(ansis.bold.green("\u2551") + padToDisplayWidth(`  ${i18n.t("configuration:guidanceStep2")}`, 62) + ansis.bold.green("\u2551"));
    console.log(ansis.bold.green("\u2551") + ansis.green(padToDisplayWidth(`     ${i18n.t("configuration:guidanceStep2Example")}`, 62)) + ansis.bold.green("\u2551"));
    console.log(`${ansis.bold.green("\u2551")}                                                              ${ansis.bold.green("\u2551")}`);
    console.log(ansis.bold.green("\u2551") + padToDisplayWidth(`  ${i18n.t("configuration:guidanceStep3")} `, 44) + ansis.yellow(padToDisplayWidth(i18n.t("configuration:guidanceStep3Command"), 18)) + ansis.bold.green("\u2551"));
    console.log(ansis.bold.green("\u2551") + padToDisplayWidth(`  ${i18n.t("configuration:guidanceStep4")} `, 44) + ansis.yellow(padToDisplayWidth(i18n.t("configuration:guidanceStep4Command"), 18)) + ansis.bold.green("\u2551"));
    console.log(`${ansis.bold.green("\u2551")}                                                              ${ansis.bold.green("\u2551")}`);
    console.log(ansis.bold.green("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D"));
    console.log("");
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}
async function handleMultiConfigurations(options, codeToolType) {
  const { ensureI18nInitialized } = await import('./index.mjs');
  ensureI18nInitialized();
  try {
    let configs = [];
    if (options.apiConfigs) {
      try {
        configs = JSON.parse(options.apiConfigs);
      } catch (error) {
        throw new Error(i18n.t("multi-config:invalidJson", { error: error instanceof Error ? error.message : String(error) }));
      }
    }
    if (options.apiConfigsFile) {
      try {
        const { readFile } = await import('./fs-operations.mjs');
        const fileContent = readFile(options.apiConfigsFile);
        configs = JSON.parse(fileContent);
      } catch (error) {
        throw new Error(i18n.t("multi-config:fileReadFailed", { error: error instanceof Error ? error.message : String(error) }));
      }
    }
    await validateApiConfigs(configs);
    if (codeToolType === "claude-code") {
      await handleClaudeCodeConfigs(configs);
    } else if (codeToolType === "codex") {
      await handleCodexConfigs(configs);
    }
    console.log(ansis.green(`\u2714 ${i18n.t("multi-config:configsAddedSuccessfully")}`));
  } catch (error) {
    console.error(ansis.red(`${i18n.t("multi-config:configsFailed")}: ${error instanceof Error ? error.message : String(error)}`));
    throw error;
  }
}
async function validateApiConfigs(configs) {
  if (!Array.isArray(configs)) {
    throw new TypeError(i18n.t("multi-config:mustBeArray"));
  }
  const { getValidProviderIds } = await import('./api-providers.mjs');
  const validProviders = [...getValidProviderIds(), "custom"];
  const names = /* @__PURE__ */ new Set();
  for (const config of configs) {
    if (config.provider && !config.type) {
      config.type = "api_key";
    }
    if (config.provider && !config.name) {
      config.name = config.provider.toUpperCase();
    }
    if (!config.provider && !config.type) {
      throw new Error(i18n.t("multi-config:providerOrTypeRequired"));
    }
    if (config.provider && !validProviders.includes(config.provider)) {
      throw new Error(i18n.t("errors:invalidProvider", {
        provider: config.provider,
        validProviders: validProviders.join(", ")
      }));
    }
    if (!config.name || typeof config.name !== "string" || config.name.trim() === "") {
      throw new Error(i18n.t("multi-config:mustHaveValidName"));
    }
    if (!["api_key", "auth_token", "ccr_proxy"].includes(config.type)) {
      throw new Error(i18n.t("multi-config:invalidAuthType", { type: config.type }));
    }
    if (names.has(config.name)) {
      throw new Error(i18n.t("multi-config:duplicateName", { name: config.name }));
    }
    names.add(config.name);
    if (config.type !== "ccr_proxy" && !config.key) {
      throw new Error(i18n.t("multi-config:configApiKeyRequired", { name: config.name }));
    }
  }
}
async function handleClaudeCodeConfigs(configs) {
  const { ClaudeCodeConfigManager } = await import('./claude-code-config-manager.mjs');
  const addedProfiles = [];
  for (const config of configs) {
    if (config.type === "ccr_proxy") {
      throw new Error(i18n.t("multi-config:ccrProxyReserved", { name: config.name }));
    }
    const profile = await convertToClaudeCodeProfile(config);
    const result = await ClaudeCodeConfigManager.addProfile(profile);
    if (!result.success) {
      throw new Error(i18n.t("multi-config:configProfileAddFailed", { name: config.name, error: result.error }));
    }
    const storedProfile = result.addedProfile || ClaudeCodeConfigManager.getProfileByName(config.name) || profile;
    addedProfiles.push(storedProfile);
    console.log(ansis.green(`\u2714 ${i18n.t("multi-config:profileAdded", { name: config.name })}`));
  }
  if (addedProfiles.length > 0) {
    const summary = addedProfiles.map((profile) => `${profile.name} [${profile.authType}]`).join(", ");
    console.log(ansis.gray(`  \u2022 ${ClaudeCodeConfigManager.CONFIG_FILE}: ${summary}`));
  }
  const defaultConfig = configs.find((c) => c.default);
  if (defaultConfig) {
    const profile = addedProfiles.find((p) => p.name === defaultConfig.name) || ClaudeCodeConfigManager.getProfileByName(defaultConfig.name);
    if (profile && profile.id) {
      await ClaudeCodeConfigManager.switchProfile(profile.id);
      await ClaudeCodeConfigManager.applyProfileSettings(profile);
      console.log(ansis.green(`\u2714 ${i18n.t("multi-config:defaultProfileSet", { name: defaultConfig.name })}`));
    }
  }
  await ClaudeCodeConfigManager.syncCcrProfile();
}
async function handleCodexConfigs(configs) {
  const { addProviderToExisting } = await import('./codex-provider-manager.mjs');
  const addedProviderIds = [];
  for (const config of configs) {
    try {
      const provider = await convertToCodexProvider(config);
      const result = await addProviderToExisting(provider, config.key || "");
      if (!result.success) {
        throw new Error(i18n.t("multi-config:providerAddFailed", { name: config.name, error: result.error }));
      }
      addedProviderIds.push(provider.id);
      console.log(ansis.green(`\u2714 ${i18n.t("multi-config:providerAdded", { name: config.name })}`));
    } catch (error) {
      console.error(ansis.red(i18n.t("multi-config:providerAddFailed", {
        name: config.name,
        error: error instanceof Error ? error.message : String(error)
      })));
      throw error;
    }
  }
  const defaultConfig = configs.find((c) => c.default);
  if (defaultConfig) {
    const { switchCodexProvider } = await import('./codex.mjs').then(function (n) { return n.q; });
    const displayName = defaultConfig.name || defaultConfig.provider || "custom";
    const providerId = displayName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    if (addedProviderIds.includes(providerId)) {
      await switchCodexProvider(providerId);
      console.log(ansis.green(`\u2714 ${i18n.t("multi-config:defaultProviderSet", { name: displayName })}`));
    } else {
      console.log(ansis.red(i18n.t("multi-config:providerAddFailed", { name: displayName, error: "provider not added" })));
    }
  }
}
async function saveSingleConfigToToml(apiConfig, provider, options) {
  try {
    const { ClaudeCodeConfigManager } = await import('./claude-code-config-manager.mjs');
    const profile = await convertSingleConfigToProfile(apiConfig, provider, options);
    const result = await ClaudeCodeConfigManager.addProfile(profile);
    if (result.success) {
      const savedProfile = result.addedProfile || ClaudeCodeConfigManager.getProfileByName(profile.name) || profile;
      if (savedProfile.id) {
        await ClaudeCodeConfigManager.switchProfile(savedProfile.id);
        await ClaudeCodeConfigManager.applyProfileSettings(savedProfile);
      }
      console.log(ansis.green(`\u2714 ${i18n.t("configuration:singleConfigSaved", { name: profile.name })}`));
    } else {
      console.warn(ansis.yellow(`${i18n.t("configuration:singleConfigSaveFailed")}: ${result.error}`));
    }
  } catch (error) {
    console.warn(ansis.yellow(`${i18n.t("configuration:singleConfigSaveFailed")}: ${error instanceof Error ? error.message : String(error)}`));
  }
}
async function convertSingleConfigToProfile(apiConfig, provider, options) {
  const { ClaudeCodeConfigManager } = await import('./claude-code-config-manager.mjs');
  const configName = provider && provider !== "custom" ? provider : "custom-config";
  let baseUrl = apiConfig.url || API_DEFAULT_URL;
  let primaryModel = options?.apiModel;
  let defaultHaikuModel = options?.apiHaikuModel;
  let defaultSonnetModel = options?.apiSonnetModel;
  let defaultOpusModel = options?.apiOpusModel;
  let authType = apiConfig.authType;
  if (provider && provider !== "custom") {
    const { getProviderPreset } = await import('./api-providers.mjs');
    const preset = getProviderPreset(provider);
    if (preset?.claudeCode) {
      baseUrl = apiConfig.url || preset.claudeCode.baseUrl;
      authType = preset.claudeCode.authType;
      if (preset.claudeCode.defaultModels && preset.claudeCode.defaultModels.length > 0) {
        const [p, h, s, o] = preset.claudeCode.defaultModels;
        primaryModel = primaryModel || p;
        defaultHaikuModel = defaultHaikuModel || h;
        defaultSonnetModel = defaultSonnetModel || s;
        defaultOpusModel = defaultOpusModel || o;
      }
    }
  }
  const profile = {
    name: configName,
    authType,
    apiKey: apiConfig.key,
    baseUrl,
    primaryModel,
    defaultHaikuModel,
    defaultSonnetModel,
    defaultOpusModel,
    id: ClaudeCodeConfigManager.generateProfileId(configName)
  };
  return profile;
}
async function convertToClaudeCodeProfile(config) {
  const { ClaudeCodeConfigManager } = await import('./claude-code-config-manager.mjs');
  let baseUrl = config.url;
  let primaryModel = config.primaryModel;
  let defaultHaikuModel = config.defaultHaikuModel;
  let defaultSonnetModel = config.defaultSonnetModel;
  let defaultOpusModel = config.defaultOpusModel;
  let authType = config.type || "api_key";
  if (config.provider && config.provider !== "custom") {
    const { getProviderPreset } = await import('./api-providers.mjs');
    const preset = getProviderPreset(config.provider);
    if (preset?.claudeCode) {
      baseUrl = baseUrl || preset.claudeCode.baseUrl;
      authType = preset.claudeCode.authType;
      if (preset.claudeCode.defaultModels && preset.claudeCode.defaultModels.length > 0) {
        const [p, h, s, o] = preset.claudeCode.defaultModels;
        primaryModel = primaryModel || p;
        defaultHaikuModel = defaultHaikuModel || h;
        defaultSonnetModel = defaultSonnetModel || s;
        defaultOpusModel = defaultOpusModel || o;
      }
    }
  }
  const profile = {
    name: config.name,
    authType,
    apiKey: config.key,
    baseUrl,
    primaryModel,
    defaultHaikuModel,
    defaultSonnetModel,
    defaultOpusModel,
    id: ClaudeCodeConfigManager.generateProfileId(config.name)
  };
  return profile;
}
async function convertToCodexProvider(config) {
  const displayName = config.name || config.provider || "custom";
  const providerId = displayName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  let baseUrl = config.url || API_DEFAULT_URL;
  let model = config.primaryModel || "gpt-5-codex";
  let wireApi = "responses";
  if (config.provider && config.provider !== "custom") {
    const { getProviderPreset } = await import('./api-providers.mjs');
    const preset = getProviderPreset(config.provider);
    if (preset?.codex) {
      baseUrl = config.url || preset.codex.baseUrl;
      model = config.primaryModel || preset.codex.defaultModel || model;
      wireApi = preset.codex.wireApi;
    }
  }
  return {
    id: providerId,
    name: displayName,
    baseUrl,
    wireApi,
    tempEnvKey: `${displayName}_API_KEY`.replace(/\W/g, "_").toUpperCase(),
    requiresOpenaiAuth: false,
    model
  };
}

const init$1 = {
  __proto__: null,
  handleMultiConfigurations: handleMultiConfigurations,
  init: init,
  validateApiConfigs: validateApiConfigs,
  validateSkipPromptOptions: validateSkipPromptOptions
};

export { COMETIX_COMMAND_NAME as C, installCcr as a, COMETIX_COMMANDS as b, installCometixLine as c, init as d, checkSuperpowersInstalled as e, uninstallSuperpowers as f, getSuperpowersSkills as g, installSuperpowers as h, isCcrInstalled as i, installSuperpowersViaGit as j, init$1 as k, updateSuperpowers as u };
