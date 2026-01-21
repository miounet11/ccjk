import ansis from 'ansis';
import inquirer from 'inquirer';
import { g as selectMcpServices, h as getMcpServices } from './codex.mjs';
import { CLAUDE_DIR, SETTINGS_FILE, SUPPORTED_LANGS, LANG_LABELS } from './constants.mjs';
import { ensureI18nInitialized, i18n, changeLanguage } from './index.mjs';
import { updateZcfConfig, readZcfConfig } from './ccjk-config.mjs';
import { setupCcrConfiguration } from './config3.mjs';
import { i as isCcrInstalled, a as installCcr } from './init.mjs';
import { r as readMcpConfig, f as fixWindowsMcpConfig, w as writeMcpConfig, b as backupMcpConfig, a as buildMcpServerConfig, m as mergeMcpServers } from './claude-config.mjs';
import { m as mergeAndCleanPermissions, a as applyAiLanguageDirective, g as getExistingModelConfig, u as updateCustomModel, d as updateDefaultModel, e as getExistingApiConfig, p as promptApiConfigurationAction, f as configureApi, s as switchToOfficialLogin } from './config2.mjs';
import { c as configureOutputStyle, a as modifyApiConfigPartially, v as validateApiKey, f as formatApiKeyDisplay } from '../shared/ccjk.BF-4_Yho.mjs';
import { g as getPlatform, k as isWindows } from './platform.mjs';
import { a as addNumbersToChoices } from '../shared/ccjk.BFQ7yr5S.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'pathe';
import { exec } from 'tinyexec';
import { ensureDir, writeFileAtomic } from './fs-operations.mjs';
import { p as promptBoolean } from '../shared/ccjk.DHbrGcgg.mjs';
import 'node:process';
import 'dayjs';
import 'ora';
import 'semver';
import 'smol-toml';
import './json-config.mjs';
import 'node:crypto';
import 'node:fs/promises';
import './prompts.mjs';
import './package.mjs';
import 'node:os';
import 'i18next';
import 'i18next-fs-backend';
import 'inquirer-toggle';
import 'node:child_process';
import 'node:util';
import './workflows.mjs';
import '../shared/ccjk.BpHTUkb8.mjs';
import './auto-updater.mjs';
import './version-checker.mjs';
import 'node:path';
import '../shared/ccjk.SIo9I8q3.mjs';
import '../shared/ccjk.DvIrK0wz.mjs';
import './installer2.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
function getTemplateSettings() {
  const templatePath = join(__dirname, "../../templates/claude-code/common/settings.json");
  const content = readFileSync(templatePath, "utf-8");
  return JSON.parse(content);
}
function loadCurrentSettings() {
  if (!existsSync(SETTINGS_FILE)) {
    return {};
  }
  try {
    const content = readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
function saveSettings(settings) {
  ensureDir(CLAUDE_DIR);
  writeFileAtomic(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
async function importRecommendedEnv() {
  const templateSettings = getTemplateSettings();
  const currentSettings = loadCurrentSettings();
  currentSettings.env = {
    ...currentSettings.env,
    ...templateSettings.env
  };
  saveSettings(currentSettings);
}
async function importRecommendedPermissions() {
  const templateSettings = getTemplateSettings();
  const currentSettings = loadCurrentSettings();
  if (templateSettings.permissions && templateSettings.permissions.allow) {
    currentSettings.permissions = {
      ...templateSettings.permissions,
      allow: mergeAndCleanPermissions(
        templateSettings.permissions.allow,
        currentSettings.permissions?.allow
      )
    };
  } else {
    currentSettings.permissions = templateSettings.permissions;
  }
  saveSettings(currentSettings);
}
async function openSettingsJson() {
  ensureDir(CLAUDE_DIR);
  if (!existsSync(SETTINGS_FILE)) {
    saveSettings({});
  }
  const platform = getPlatform();
  let command;
  switch (platform) {
    case "macos":
      command = "open";
      break;
    case "windows":
      command = "start";
      break;
    default:
      command = "xdg-open";
  }
  try {
    await exec(command, [SETTINGS_FILE]);
  } catch {
    try {
      await exec("code", [SETTINGS_FILE]);
    } catch {
      try {
        await exec("vim", [SETTINGS_FILE]);
      } catch {
        await exec("nano", [SETTINGS_FILE]);
      }
    }
  }
}

async function handleCancellation() {
  ensureI18nInitialized();
  console.log(ansis.yellow(i18n.t("common:cancelled")));
}
async function handleOfficialLoginMode() {
  ensureI18nInitialized();
  const success = switchToOfficialLogin();
  if (success) {
    console.log(ansis.green(`\u2714 ${i18n.t("api:officialLoginConfigured")}`));
  } else {
    console.log(ansis.red(i18n.t("api:officialLoginFailed")));
  }
}
async function handleCustomApiMode() {
  ensureI18nInitialized();
  const zcfConfig = readZcfConfig();
  const codeToolType = zcfConfig?.codeToolType || "claude-code";
  if (codeToolType === "claude-code") {
    const { configureIncrementalManagement } = await import('./claude-code-incremental-manager.mjs');
    await configureIncrementalManagement();
    return;
  }
  const existingConfig = getExistingApiConfig();
  if (existingConfig) {
    const configAction = await promptApiConfigurationAction();
    if (configAction === "keep-existing") {
      console.log(ansis.green(`\u2714 ${i18n.t("api:keepExistingConfig")}`));
      return;
    } else if (configAction === "modify-partial") {
      await modifyApiConfigPartially(existingConfig);
      return;
    }
  }
  const { apiChoice } = await inquirer.prompt({
    type: "list",
    name: "apiChoice",
    message: i18n.t("api:configureApi"),
    choices: addNumbersToChoices([
      {
        name: `${i18n.t("api:useAuthToken")} - ${ansis.gray(i18n.t("api:authTokenDesc"))}`,
        value: "auth_token",
        short: i18n.t("api:useAuthToken")
      },
      {
        name: `${i18n.t("api:useApiKey")} - ${ansis.gray(i18n.t("api:apiKeyDesc"))}`,
        value: "api_key",
        short: i18n.t("api:useApiKey")
      },
      { name: i18n.t("api:skipApi"), value: "skip" }
    ])
  });
  if (!apiChoice || apiChoice === "skip") {
    await handleCancellation();
    return;
  }
  const { url } = await inquirer.prompt({
    type: "input",
    name: "url",
    message: `${i18n.t("api:enterApiUrl")}${i18n.t("common:emptyToSkip")}`,
    validate: (value) => {
      if (!value) {
        return true;
      }
      try {
        void new URL(value);
        return true;
      } catch {
        return i18n.t("api:invalidUrl");
      }
    }
  });
  if (url === void 0 || !url) {
    await handleCancellation();
    return;
  }
  const keyMessage = apiChoice === "auth_token" ? `${i18n.t("api:enterAuthToken")}${i18n.t("common:emptyToSkip")}` : `${i18n.t("api:enterApiKey")}${i18n.t("common:emptyToSkip")}`;
  const { key } = await inquirer.prompt({
    type: "input",
    name: "key",
    message: keyMessage,
    validate: (value) => {
      if (!value) {
        return true;
      }
      const validation = validateApiKey(value);
      if (!validation.isValid) {
        return validation.error || i18n.t("api:invalidKeyFormat");
      }
      return true;
    }
  });
  if (key === void 0 || !key) {
    await handleCancellation();
    return;
  }
  const apiConfig = { url, key, authType: apiChoice };
  const configuredApi = configureApi(apiConfig);
  if (configuredApi) {
    console.log(ansis.green(`\u2714 ${i18n.t("api:apiConfigSuccess")}`));
    console.log(ansis.gray(`  URL: ${configuredApi.url}`));
    console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`));
  }
}
async function handleCcrProxyMode() {
  ensureI18nInitialized();
  const ccrStatus = await isCcrInstalled();
  if (!ccrStatus.hasCorrectPackage) {
    await installCcr();
  } else {
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrAlreadyInstalled")}`));
  }
  const ccrConfigured = await setupCcrConfiguration();
  if (ccrConfigured) {
    console.log(ansis.green(`\u2714 ${i18n.t("ccr:ccrSetupComplete")}`));
  }
}
async function handleSwitchConfigMode() {
  ensureI18nInitialized();
  const { configSwitchCommand } = await import('./config-switch.mjs');
  await configSwitchCommand({ codeType: "claude-code" });
}
async function configureApiFeature() {
  ensureI18nInitialized();
  const { mode } = await inquirer.prompt({
    type: "list",
    name: "mode",
    message: i18n.t("api:apiModePrompt"),
    choices: addNumbersToChoices([
      { name: i18n.t("api:apiModeOfficial"), value: "official" },
      { name: i18n.t("api:apiModeCustom"), value: "custom" },
      { name: i18n.t("api:apiModeCcr"), value: "ccr" },
      { name: i18n.t("api:apiModeSwitch"), value: "switch" },
      { name: i18n.t("api:apiModeSkip"), value: "skip" }
    ])
  });
  if (!mode || mode === "skip") {
    await handleCancellation();
    return;
  }
  switch (mode) {
    case "official":
      await handleOfficialLoginMode();
      break;
    case "custom":
      await handleCustomApiMode();
      break;
    case "ccr":
      await handleCcrProxyMode();
      break;
    case "switch":
      await handleSwitchConfigMode();
      break;
    default:
      await handleCancellation();
      break;
  }
}
async function configureMcpFeature() {
  ensureI18nInitialized();
  if (isWindows()) {
    const fixWindows = await promptBoolean({
      message: i18n.t("configuration:fixWindowsMcp") || "Fix Windows MCP configuration?",
      defaultValue: true
    });
    if (fixWindows) {
      const existingConfig = readMcpConfig() || { mcpServers: {} };
      const fixedConfig = fixWindowsMcpConfig(existingConfig);
      writeMcpConfig(fixedConfig);
      console.log(ansis.green(`\u2714 ${i18n.t("configuration:windowsMcpConfigFixed")}`));
    }
  }
  const selectedServices = await selectMcpServices();
  if (!selectedServices) {
    return;
  }
  if (selectedServices.length > 0) {
    const mcpBackupPath = backupMcpConfig();
    if (mcpBackupPath) {
      console.log(ansis.gray(`\u2714 ${i18n.t("mcp:mcpBackupSuccess")}: ${mcpBackupPath}`));
    }
    const newServers = {};
    for (const serviceId of selectedServices) {
      const service = (await getMcpServices()).find((s) => s.id === serviceId);
      if (!service)
        continue;
      let config = service.config;
      if (service.requiresApiKey) {
        const { apiKey } = await inquirer.prompt({
          type: "input",
          name: "apiKey",
          message: service.apiKeyPrompt,
          validate: async (value) => !!value || i18n.t("api:keyRequired")
        });
        if (apiKey) {
          config = buildMcpServerConfig(service.config, apiKey, service.apiKeyPlaceholder, service.apiKeyEnvVar);
        } else {
          continue;
        }
      }
      newServers[service.id] = config;
    }
    const existingConfig = readMcpConfig();
    let mergedConfig = mergeMcpServers(existingConfig, newServers);
    mergedConfig = fixWindowsMcpConfig(mergedConfig);
    writeMcpConfig(mergedConfig);
    console.log(ansis.green(`\u2714 ${i18n.t("mcp:mcpConfigSuccess")}`));
  }
}
async function configureDefaultModelFeature() {
  ensureI18nInitialized();
  const existingModel = getExistingModelConfig();
  if (existingModel) {
    console.log(`
${ansis.green(`\u2139 ${i18n.t("configuration:existingModelConfig") || "Existing model configuration"}`)}`);
    const modelDisplay = existingModel === "default" ? i18n.t("configuration:defaultModelOption") || "Default (Let Claude Code choose)" : existingModel.charAt(0).toUpperCase() + existingModel.slice(1);
    console.log(ansis.gray(`  ${i18n.t("configuration:currentModel") || "Current model"}: ${modelDisplay}
`));
    const modify = await promptBoolean({
      message: i18n.t("configuration:modifyModel") || "Modify model configuration?",
      defaultValue: false
    });
    if (!modify) {
      console.log(ansis.green(`\u2714 ${i18n.t("configuration:keepModel") || "Keeping existing model configuration"}`));
      return;
    }
  }
  const { model } = await inquirer.prompt({
    type: "list",
    name: "model",
    message: i18n.t("configuration:selectDefaultModel") || "Select default model",
    choices: addNumbersToChoices([
      {
        name: i18n.t("configuration:defaultModelOption") || "Default - Let Claude Code choose",
        value: "default"
      },
      {
        name: i18n.t("configuration:opusModelOption") || "Opus - Only use opus, high token consumption, use with caution",
        value: "opus"
      },
      {
        name: i18n.t("configuration:sonnet1mModelOption") || "Sonnet 1M - 1M context version",
        value: "sonnet[1m]"
      },
      {
        name: i18n.t("configuration:customModelOption") || "Custom - Specify custom model names",
        value: "custom"
      }
    ]),
    default: existingModel ? ["default", "opus", "sonnet[1m]", "custom"].indexOf(existingModel) : 0
  });
  if (!model) {
    await handleCancellation();
    return;
  }
  if (model === "custom") {
    const { primaryModel, haikuModel, sonnetModel, opusModel } = await promptCustomModels();
    if (!primaryModel.trim() && !haikuModel.trim() && !sonnetModel.trim() && !opusModel.trim()) {
      console.log(ansis.yellow(`\u26A0 ${i18n.t("configuration:customModelSkipped") || "Custom model configuration skipped"}`));
      return;
    }
    updateCustomModel(primaryModel, haikuModel, sonnetModel, opusModel);
    console.log(ansis.green(`\u2714 ${i18n.t("configuration:customModelConfigured") || "Custom model configuration completed"}`));
    return;
  }
  updateDefaultModel(model);
  console.log(ansis.green(`\u2714 ${i18n.t("configuration:modelConfigured") || "Default model configured"}`));
}
async function promptCustomModels(defaultPrimaryModel, defaultHaikuModel, defaultSonnetModel, defaultOpusModel) {
  const { primaryModel } = await inquirer.prompt({
    type: "input",
    name: "primaryModel",
    message: `${i18n.t("configuration:enterPrimaryModel")}${i18n.t("common:emptyToSkip")}`,
    default: defaultPrimaryModel || ""
  });
  const { haikuModel } = await inquirer.prompt({
    type: "input",
    name: "haikuModel",
    message: `${i18n.t("configuration:enterHaikuModel")}${i18n.t("common:emptyToSkip")}`,
    default: defaultHaikuModel || ""
  });
  const { sonnetModel } = await inquirer.prompt({
    type: "input",
    name: "sonnetModel",
    message: `${i18n.t("configuration:enterSonnetModel")}${i18n.t("common:emptyToSkip")}`,
    default: defaultSonnetModel || ""
  });
  const { opusModel } = await inquirer.prompt({
    type: "input",
    name: "opusModel",
    message: `${i18n.t("configuration:enterOpusModel")}${i18n.t("common:emptyToSkip")}`,
    default: defaultOpusModel || ""
  });
  return { primaryModel, haikuModel, sonnetModel, opusModel };
}
async function configureAiMemoryFeature() {
  ensureI18nInitialized();
  const isZh = i18n.language === "zh-CN";
  const { option } = await inquirer.prompt({
    type: "list",
    name: "option",
    message: isZh ? "\u9009\u62E9 AI \u8BB0\u5FC6\u7BA1\u7406\u9009\u9879" : "Select AI memory management option",
    choices: addNumbersToChoices([
      {
        name: isZh ? "\u{1F4C4} \u67E5\u770B\u5168\u5C40 CLAUDE.md\uFF08\u7CFB\u7EDF\u63D0\u793A\uFF09" : "\u{1F4C4} View global CLAUDE.md (system prompt)",
        value: "viewGlobalClaudeMd"
      },
      {
        name: isZh ? "\u{1F4C1} \u67E5\u770B\u9879\u76EE CLAUDE.md" : "\u{1F4C1} View project CLAUDE.md",
        value: "viewProjectClaudeMd"
      },
      {
        name: isZh ? "\u{1F52C} \u67E5\u770B Postmortem\uFF08\u5386\u53F2 Bug \u7ECF\u9A8C\uFF09" : "\u{1F52C} View Postmortem (bug lessons learned)",
        value: "viewPostmortem"
      },
      {
        name: isZh ? "\u270F\uFE0F \u7F16\u8F91\u5168\u5C40 CLAUDE.md" : "\u270F\uFE0F Edit global CLAUDE.md",
        value: "editGlobalClaudeMd"
      },
      {
        name: isZh ? "\u{1F310} \u914D\u7F6E AI \u8F93\u51FA\u8BED\u8A00" : "\u{1F310} Configure AI output language",
        value: "language"
      },
      {
        name: isZh ? "\u{1F3A8} \u914D\u7F6E\u8F93\u51FA\u98CE\u683C" : "\u{1F3A8} Configure output style",
        value: "outputStyle"
      }
    ])
  });
  if (!option) {
    return;
  }
  const { readFileSync, existsSync, writeFileSync } = await import('node:fs');
  const { homedir } = await import('node:os');
  const { join } = await import('pathe');
  const { execSync } = await import('node:child_process');
  const nodeProcess = await import('node:process');
  const cwd = nodeProcess.default.cwd();
  const globalClaudeMdPath = join(homedir(), ".claude", "CLAUDE.md");
  const projectClaudeMdPath = join(cwd, "CLAUDE.md");
  const localClaudeMdPath = join(cwd, ".claude", "CLAUDE.md");
  switch (option) {
    case "viewGlobalClaudeMd": {
      if (existsSync(globalClaudeMdPath)) {
        console.log(ansis.green.bold(`
\u{1F4C4} ${isZh ? "\u5168\u5C40 CLAUDE.md \u5185\u5BB9" : "Global CLAUDE.md Content"}:`));
        console.log(ansis.dim("\u2500".repeat(60)));
        const content = readFileSync(globalClaudeMdPath, "utf-8");
        console.log(content);
        console.log(ansis.dim("\u2500".repeat(60)));
        console.log(ansis.gray(`${isZh ? "\u8DEF\u5F84" : "Path"}: ${globalClaudeMdPath}`));
      } else {
        console.log(ansis.yellow(`
\u26A0\uFE0F ${isZh ? "\u5168\u5C40 CLAUDE.md \u4E0D\u5B58\u5728" : "Global CLAUDE.md does not exist"}`));
        console.log(ansis.gray(`${isZh ? "\u9884\u671F\u8DEF\u5F84" : "Expected path"}: ${globalClaudeMdPath}`));
      }
      break;
    }
    case "viewProjectClaudeMd": {
      let foundPath = null;
      if (existsSync(projectClaudeMdPath)) {
        foundPath = projectClaudeMdPath;
      } else if (existsSync(localClaudeMdPath)) {
        foundPath = localClaudeMdPath;
      }
      if (foundPath) {
        console.log(ansis.green.bold(`
\u{1F4C1} ${isZh ? "\u9879\u76EE CLAUDE.md \u5185\u5BB9" : "Project CLAUDE.md Content"}:`));
        console.log(ansis.dim("\u2500".repeat(60)));
        const content = readFileSync(foundPath, "utf-8");
        console.log(content);
        console.log(ansis.dim("\u2500".repeat(60)));
        console.log(ansis.gray(`${isZh ? "\u8DEF\u5F84" : "Path"}: ${foundPath}`));
      } else {
        console.log(ansis.yellow(`
\u26A0\uFE0F ${isZh ? "\u9879\u76EE CLAUDE.md \u4E0D\u5B58\u5728" : "Project CLAUDE.md does not exist"}`));
        console.log(ansis.gray(`${isZh ? "\u5DF2\u68C0\u67E5\u8DEF\u5F84" : "Checked paths"}:`));
        console.log(ansis.gray(`  - ${projectClaudeMdPath}`));
        console.log(ansis.gray(`  - ${localClaudeMdPath}`));
      }
      break;
    }
    case "viewPostmortem": {
      const postmortemDir = join(cwd, ".postmortem");
      if (existsSync(postmortemDir)) {
        console.log(ansis.green.bold(`
\u{1F52C} ${isZh ? "Postmortem \u62A5\u544A" : "Postmortem Reports"}:`));
        console.log(ansis.dim("\u2500".repeat(60)));
        const { readdirSync } = await import('node:fs');
        const files = readdirSync(postmortemDir).filter((f) => f.endsWith(".md"));
        if (files.length === 0) {
          console.log(ansis.yellow(isZh ? "\u6682\u65E0 Postmortem \u62A5\u544A" : "No postmortem reports yet"));
        } else {
          console.log(ansis.green(`${isZh ? "\u627E\u5230" : "Found"} ${files.length} ${isZh ? "\u4E2A\u62A5\u544A" : "reports"}:
`));
          const { selectedFile } = await inquirer.prompt({
            type: "list",
            name: "selectedFile",
            message: isZh ? "\u9009\u62E9\u8981\u67E5\u770B\u7684\u62A5\u544A" : "Select a report to view",
            choices: [
              ...files.map((f) => ({ name: f, value: f })),
              { name: isZh ? "\u8FD4\u56DE" : "Back", value: "back" }
            ]
          });
          if (selectedFile !== "back") {
            const reportPath = join(postmortemDir, selectedFile);
            const content = readFileSync(reportPath, "utf-8");
            console.log(ansis.dim("\u2500".repeat(60)));
            console.log(content);
            console.log(ansis.dim("\u2500".repeat(60)));
          }
        }
        console.log(ansis.gray(`
${isZh ? "\u76EE\u5F55" : "Directory"}: ${postmortemDir}`));
        console.log(ansis.gray(`\u{1F4A1} ${isZh ? "\u8FD0\u884C `ccjk postmortem init` \u4ECE\u5386\u53F2 fix commits \u751F\u6210\u62A5\u544A" : "Run `ccjk postmortem init` to generate reports from fix commits"}`));
      } else {
        console.log(ansis.yellow(`
\u26A0\uFE0F ${isZh ? "Postmortem \u76EE\u5F55\u4E0D\u5B58\u5728" : "Postmortem directory does not exist"}`));
        console.log(ansis.gray(`\u{1F4A1} ${isZh ? "\u8FD0\u884C `ccjk postmortem init` \u521D\u59CB\u5316 Postmortem \u7CFB\u7EDF" : "Run `ccjk postmortem init` to initialize the Postmortem system"}`));
      }
      break;
    }
    case "editGlobalClaudeMd": {
      const editor = nodeProcess.default.env.EDITOR || nodeProcess.default.env.VISUAL || "vi";
      if (!existsSync(globalClaudeMdPath)) {
        const claudeDir = join(homedir(), ".claude");
        const { mkdirSync } = await import('node:fs');
        if (!existsSync(claudeDir)) {
          mkdirSync(claudeDir, { recursive: true });
        }
        writeFileSync(globalClaudeMdPath, `# Claude Global Memory

<!-- Add your global instructions here -->
`);
        console.log(ansis.green(`\u2705 ${isZh ? "\u5DF2\u521B\u5EFA\u5168\u5C40 CLAUDE.md" : "Created global CLAUDE.md"}`));
      }
      console.log(ansis.green(`
\u{1F4DD} ${isZh ? "\u6B63\u5728\u6253\u5F00\u7F16\u8F91\u5668..." : "Opening editor..."}`));
      console.log(ansis.gray(`${isZh ? "\u7F16\u8F91\u5668" : "Editor"}: ${editor}`));
      console.log(ansis.gray(`${isZh ? "\u6587\u4EF6" : "File"}: ${globalClaudeMdPath}`));
      try {
        execSync(`${editor} "${globalClaudeMdPath}"`, { stdio: "inherit" });
        console.log(ansis.green(`
\u2705 ${isZh ? "\u7F16\u8F91\u5B8C\u6210" : "Edit complete"}`));
      } catch {
        console.log(ansis.yellow(`
\u26A0\uFE0F ${isZh ? "\u7F16\u8F91\u5668\u9000\u51FA" : "Editor exited"}`));
      }
      break;
    }
    case "language": {
      const zcfConfig = readZcfConfig();
      const existingLang = zcfConfig?.aiOutputLang;
      if (existingLang) {
        console.log(
          `
${ansis.green(`\u2139 ${i18n.t("configuration:existingLanguageConfig") || "Existing AI output language configuration"}`)}`
        );
        console.log(ansis.gray(`  ${i18n.t("configuration:currentLanguage") || "Current language"}: ${existingLang}
`));
        const modify = await promptBoolean({
          message: i18n.t("configuration:modifyLanguage") || "Modify AI output language?",
          defaultValue: false
        });
        if (!modify) {
          console.log(ansis.green(`\u2714 ${i18n.t("configuration:keepLanguage") || "Keeping existing language configuration"}`));
          return;
        }
      }
      const { selectAiOutputLanguage } = await import('./prompts.mjs');
      const aiOutputLang = await selectAiOutputLanguage();
      applyAiLanguageDirective(aiOutputLang);
      updateZcfConfig({ aiOutputLang });
      console.log(ansis.green(`\u2714 ${i18n.t("configuration:aiLanguageConfigured") || "AI output language configured"}`));
      break;
    }
    case "outputStyle": {
      await configureOutputStyle();
      break;
    }
  }
}
async function changeScriptLanguageFeature(currentLang) {
  ensureI18nInitialized();
  const { lang } = await inquirer.prompt({
    type: "list",
    name: "lang",
    message: i18n.t("language:selectScriptLang"),
    choices: addNumbersToChoices(
      SUPPORTED_LANGS.map((l) => ({
        name: LANG_LABELS[l],
        value: l
      }))
    ),
    default: SUPPORTED_LANGS.indexOf(currentLang)
  });
  if (!lang) {
    return currentLang;
  }
  updateZcfConfig({ preferredLang: lang });
  await changeLanguage(lang);
  console.log(ansis.green(`\u2714 ${i18n.t("language:languageChanged") || "Language changed"}`));
  return lang;
}
async function configureCodexDefaultModelFeature() {
  ensureI18nInitialized();
  const { readCodexConfig } = await import('./codex.mjs').then(function (n) { return n.q; });
  const existingConfig = readCodexConfig();
  const currentModel = existingConfig?.model;
  if (currentModel) {
    console.log(`
${ansis.green(`\u2139 ${i18n.t("configuration:existingModelConfig") || "Existing model configuration"}`)}`);
    const modelDisplay = currentModel === "gpt-5-codex" ? "GPT-5-Codex" : currentModel === "gpt-5" ? "GPT-5" : currentModel.charAt(0).toUpperCase() + currentModel.slice(1);
    console.log(ansis.gray(`  ${i18n.t("configuration:currentModel") || "Current model"}: ${modelDisplay}
`));
    const modify = await promptBoolean({
      message: i18n.t("configuration:modifyModel") || "Modify model configuration?",
      defaultValue: false
    });
    if (!modify) {
      console.log(ansis.green(`\u2714 ${i18n.t("configuration:keepModel") || "Keeping existing model configuration"}`));
      return;
    }
  }
  const { model } = await inquirer.prompt({
    type: "list",
    name: "model",
    message: i18n.t("configuration:selectDefaultModel") || "Select default model",
    choices: addNumbersToChoices([
      {
        name: i18n.t("configuration:codexModelOptions.gpt5"),
        value: "gpt-5"
      },
      {
        name: i18n.t("configuration:codexModelOptions.gpt5Codex"),
        value: "gpt-5-codex"
      },
      {
        name: i18n.t("configuration:codexModelOptions.custom"),
        value: "custom"
      }
    ]),
    default: currentModel ? ["gpt-5", "gpt-5-codex", "custom"].indexOf(currentModel) : 1
    // Default to gpt-5-codex
  });
  if (!model) {
    await handleCancellation();
    return;
  }
  if (model === "custom") {
    const { customModel } = await inquirer.prompt({
      type: "input",
      name: "customModel",
      message: `${i18n.t("configuration:enterCustomModel")}${i18n.t("common:emptyToSkip")}`,
      default: ""
    });
    if (!customModel.trim()) {
      console.log(ansis.yellow(`\u26A0 ${i18n.t("configuration:customModelSkipped") || "Custom model configuration skipped"}`));
      return;
    }
    await updateCodexModelProvider(customModel.trim());
    console.log(ansis.green(`\u2714 ${i18n.t("configuration:customModelConfigured") || "Custom model configuration completed"}`));
    return;
  }
  await updateCodexModelProvider(model);
  console.log(ansis.green(`\u2714 ${i18n.t("configuration:modelConfigured") || "Default model configured"}`));
}
async function configureCodexAiMemoryFeature() {
  ensureI18nInitialized();
  const { option } = await inquirer.prompt({
    type: "list",
    name: "option",
    message: i18n.t("configuration:selectMemoryOption") || "Select configuration option",
    choices: addNumbersToChoices([
      {
        name: i18n.t("configuration:configureAiLanguage") || "Configure AI output language",
        value: "language"
      },
      {
        name: i18n.t("configuration:configureSystemPromptStyle") || "Configure global AI system prompt style",
        value: "systemPrompt"
      }
    ])
  });
  if (!option) {
    return;
  }
  if (option === "language") {
    const zcfConfig = readZcfConfig();
    const existingLang = zcfConfig?.aiOutputLang;
    if (existingLang) {
      console.log(
        `
${ansis.green(`\u2139 ${i18n.t("configuration:existingLanguageConfig") || "Existing AI output language configuration"}`)}`
      );
      console.log(ansis.gray(`  ${i18n.t("configuration:currentLanguage") || "Current language"}: ${existingLang}
`));
      const modify = await promptBoolean({
        message: i18n.t("configuration:modifyLanguage") || "Modify AI output language?",
        defaultValue: false
      });
      if (!modify) {
        console.log(ansis.green(`\u2714 ${i18n.t("configuration:keepLanguage") || "Keeping existing language configuration"}`));
        await ensureLanguageDirectiveInAgents(existingLang);
        return;
      }
    }
    const { selectAiOutputLanguage } = await import('./prompts.mjs');
    const aiOutputLang = await selectAiOutputLanguage();
    await updateCodexLanguageDirective(aiOutputLang);
    updateZcfConfig({ aiOutputLang });
    console.log(ansis.green(`\u2714 ${i18n.t("configuration:aiLanguageConfigured") || "AI output language configured"}`));
  } else if (option === "systemPrompt") {
    const zcfConfig = readZcfConfig();
    const currentLang = zcfConfig?.aiOutputLang || "English";
    const { runCodexSystemPromptSelection } = await import('./codex.mjs').then(function (n) { return n.q; });
    await runCodexSystemPromptSelection();
    await ensureLanguageDirectiveInAgents(currentLang);
    console.log(ansis.green(`\u2714 ${i18n.t("configuration:systemPromptConfigured")}`));
  }
}
async function updateCodexModelProvider(modelProvider) {
  const { readCodexConfig, writeCodexConfig, backupCodexConfig, getBackupMessage } = await import('./codex.mjs').then(function (n) { return n.q; });
  const backupPath = backupCodexConfig();
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)));
  }
  const existingConfig = readCodexConfig();
  const updatedConfig = {
    ...existingConfig,
    model: modelProvider,
    // Set the model field
    modelProvider: existingConfig?.modelProvider || null,
    // Preserve existing API provider
    providers: existingConfig?.providers || [],
    mcpServices: existingConfig?.mcpServices || [],
    managed: true,
    otherConfig: existingConfig?.otherConfig || [],
    modelProviderCommented: existingConfig?.modelProviderCommented
  };
  writeCodexConfig(updatedConfig);
}
async function ensureLanguageDirectiveInAgents(aiOutputLang) {
  const { readFile, writeFileAtomic, exists } = await import('./fs-operations.mjs');
  const { homedir } = await import('node:os');
  const { join } = await import('pathe');
  const CODEX_AGENTS_FILE = join(homedir(), ".codex", "AGENTS.md");
  if (!exists(CODEX_AGENTS_FILE)) {
    console.log(ansis.yellow(i18n.t("codex:agentsFileNotFound")));
    return;
  }
  const content = readFile(CODEX_AGENTS_FILE);
  const languageLabels = {
    "Chinese": "Chinese-simplified",
    "English": "English",
    "zh-CN": "Chinese-simplified",
    "en": "English"
  };
  const langLabel = languageLabels[aiOutputLang] || aiOutputLang;
  const hasLanguageDirective = /\*\*Most Important:\s*Always respond in [^*]+\*\*/i.test(content);
  if (!hasLanguageDirective) {
    const { backupCodexAgents, getBackupMessage } = await import('./codex.mjs').then(function (n) { return n.q; });
    const backupPath = backupCodexAgents();
    if (backupPath) {
      console.log(ansis.gray(getBackupMessage(backupPath)));
    }
    let updatedContent = content;
    if (!updatedContent.endsWith("\n")) {
      updatedContent += "\n";
    }
    updatedContent += `
**Most Important:Always respond in ${langLabel}**
`;
    writeFileAtomic(CODEX_AGENTS_FILE, updatedContent);
    console.log(ansis.gray(`  ${i18n.t("configuration:addedLanguageDirective")}: ${langLabel}`));
  }
}
async function updateCodexLanguageDirective(aiOutputLang) {
  const { readFile, writeFileAtomic, exists } = await import('./fs-operations.mjs');
  const { backupCodexAgents, getBackupMessage } = await import('./codex.mjs').then(function (n) { return n.q; });
  const { homedir } = await import('node:os');
  const { join } = await import('pathe');
  const CODEX_AGENTS_FILE = join(homedir(), ".codex", "AGENTS.md");
  if (!exists(CODEX_AGENTS_FILE)) {
    console.log(ansis.yellow(i18n.t("codex:agentsFileNotFound")));
    return;
  }
  const backupPath = backupCodexAgents();
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)));
  }
  let content = readFile(CODEX_AGENTS_FILE);
  const languageLabels = {
    "Chinese": "Chinese-simplified",
    "English": "English",
    "zh-CN": "Chinese-simplified",
    "en": "English"
  };
  const langLabel = languageLabels[aiOutputLang] || aiOutputLang;
  content = content.replace(/\*\*Most Important:\s*Always respond in [^*]+\*\*\s*/g, "");
  if (!content.endsWith("\n")) {
    content += "\n";
  }
  content += `
**Most Important:Always respond in ${langLabel}**
`;
  writeFileAtomic(CODEX_AGENTS_FILE, content);
}
async function configureEnvPermissionFeature() {
  ensureI18nInitialized();
  const { choice } = await inquirer.prompt({
    type: "list",
    name: "choice",
    message: i18n.t("configuration:selectEnvPermissionOption") || "Select option",
    choices: addNumbersToChoices([
      {
        name: `${i18n.t("configuration:importRecommendedEnv") || "Import environment"} ${ansis.gray(
          `- ${i18n.t("configuration:importRecommendedEnvDesc") || "Import env settings"}`
        )}`,
        value: "env"
      },
      {
        name: `${i18n.t("configuration:importRecommendedPermissions") || "Import permissions"} ${ansis.gray(
          `- ${i18n.t("configuration:importRecommendedPermissionsDesc") || "Import permission settings"}`
        )}`,
        value: "permissions"
      },
      {
        name: `${i18n.t("configuration:openSettingsJson") || "Open settings"} ${ansis.gray(
          `- ${i18n.t("configuration:openSettingsJsonDesc") || "View settings file"}`
        )}`,
        value: "open"
      }
    ])
  });
  if (!choice) {
    await handleCancellation();
    return;
  }
  try {
    switch (choice) {
      case "env":
        await importRecommendedEnv();
        console.log(ansis.green(`\u2705 ${i18n.t("configuration:envImportSuccess")}`));
        break;
      case "permissions":
        await importRecommendedPermissions();
        console.log(ansis.green(`\u2705 ${i18n.t("configuration:permissionsImportSuccess") || "Permissions imported"}`));
        break;
      case "open":
        console.log(ansis.green(i18n.t("configuration:openingSettingsJson") || "Opening settings.json..."));
        await openSettingsJson();
        break;
    }
  } catch (error) {
    console.error(ansis.red(`${i18n.t("common:error")}: ${error.message}`));
  }
}

export { changeScriptLanguageFeature, configureAiMemoryFeature, configureApiFeature, configureCodexAiMemoryFeature, configureCodexDefaultModelFeature, configureDefaultModelFeature, configureEnvPermissionFeature, configureMcpFeature, promptCustomModels };
