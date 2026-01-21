import ansis from 'ansis';
import inquirer from 'inquirer';
import { CLAUDE_DIR, SETTINGS_FILE } from '../chunks/constants.mjs';
import { ensureI18nInitialized, i18n } from '../chunks/index.mjs';
import { e as getExistingApiConfig, f as configureApi, s as switchToOfficialLogin, b as backupExistingConfig, a as applyAiLanguageDirective } from '../chunks/config2.mjs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'pathe';
import { updateZcfConfig } from '../chunks/ccjk-config.mjs';
import { exists, removeFile, ensureDir, copyFile } from '../chunks/fs-operations.mjs';
import { readJsonConfig, writeJsonConfig } from '../chunks/json-config.mjs';
import { a as addNumbersToChoices } from './ccjk.BFQ7yr5S.mjs';
import { p as promptBoolean } from './ccjk.DHbrGcgg.mjs';
import { existsSync } from 'node:fs';
import { rm, mkdir, copyFile as copyFile$1 } from 'node:fs/promises';
import { getOrderedWorkflows, getWorkflowConfig, getTagLabel } from '../chunks/workflows.mjs';

const OUTPUT_STYLES = [
  // Custom styles (have template files) - Efficiency-focused styles
  {
    id: "speed-coder",
    isCustom: true,
    filePath: "speed-coder.md"
  },
  {
    id: "senior-architect",
    isCustom: true,
    filePath: "senior-architect.md"
  },
  {
    id: "pair-programmer",
    isCustom: true,
    filePath: "pair-programmer.md"
  },
  // Built-in styles (no template files) - Claude Code native styles
  {
    id: "default",
    isCustom: false
  },
  {
    id: "explanatory",
    isCustom: false
  },
  {
    id: "learning",
    isCustom: false
  }
];
const LEGACY_FILES = ["personality.md", "rules.md", "technical-guides.md", "mcp.md", "language.md"];
function getAvailableOutputStyles() {
  return OUTPUT_STYLES;
}
async function copyOutputStyles(selectedStyles, lang) {
  const outputStylesDir = join(CLAUDE_DIR, "output-styles");
  ensureDir(outputStylesDir);
  const currentFilePath = fileURLToPath(import.meta.url);
  const distDir = dirname(dirname(currentFilePath));
  const rootDir = dirname(distDir);
  const templateDir = join(rootDir, "templates", "common", "output-styles", lang);
  for (const styleId of selectedStyles) {
    const style = OUTPUT_STYLES.find((s) => s.id === styleId);
    if (!style || !style.isCustom || !style.filePath) {
      continue;
    }
    const sourcePath = join(templateDir, style.filePath);
    const destPath = join(outputStylesDir, style.filePath);
    if (exists(sourcePath)) {
      copyFile(sourcePath, destPath);
    }
  }
}
function setGlobalDefaultOutputStyle(styleId) {
  const existingSettings = readJsonConfig(SETTINGS_FILE) || {};
  const updatedSettings = {
    ...existingSettings,
    outputStyle: styleId
  };
  writeJsonConfig(SETTINGS_FILE, updatedSettings);
}
function hasLegacyPersonalityFiles() {
  return LEGACY_FILES.some((filename) => exists(join(CLAUDE_DIR, filename)));
}
function cleanupLegacyPersonalityFiles() {
  LEGACY_FILES.forEach((filename) => {
    const filePath = join(CLAUDE_DIR, filename);
    if (exists(filePath)) {
      removeFile(filePath);
    }
  });
}
async function configureOutputStyle(preselectedStyles, preselectedDefault) {
  ensureI18nInitialized();
  const outputStyleList = [
    {
      id: "default",
      name: i18n.t("configuration:outputStyles.default.name"),
      description: i18n.t("configuration:outputStyles.default.description")
    },
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
    },
    {
      id: "explanatory",
      name: i18n.t("configuration:outputStyles.explanatory.name"),
      description: i18n.t("configuration:outputStyles.explanatory.description")
    },
    {
      id: "learning",
      name: i18n.t("configuration:outputStyles.learning.name"),
      description: i18n.t("configuration:outputStyles.learning.description")
    }
  ];
  const availableStyles = getAvailableOutputStyles();
  if (hasLegacyPersonalityFiles() && !preselectedStyles) {
    console.log(ansis.yellow(`\u26A0\uFE0F  ${i18n.t("configuration:legacyFilesDetected")}`));
    const cleanupLegacy = await promptBoolean({
      message: i18n.t("configuration:cleanupLegacyFiles"),
      defaultValue: true
    });
    if (cleanupLegacy) {
      cleanupLegacyPersonalityFiles();
      console.log(ansis.green(`\u2714 ${i18n.t("configuration:legacyFilesRemoved")}`));
    }
  } else if (hasLegacyPersonalityFiles() && preselectedStyles) {
    cleanupLegacyPersonalityFiles();
  }
  let selectedStyles;
  let defaultStyle;
  if (preselectedStyles && preselectedDefault) {
    selectedStyles = preselectedStyles;
    defaultStyle = preselectedDefault;
  } else {
    const customStyles = availableStyles.filter((style) => style.isCustom);
    const { selectedStyles: promptedStyles } = await inquirer.prompt({
      type: "checkbox",
      name: "selectedStyles",
      message: `${i18n.t("configuration:selectOutputStyles")}${i18n.t("common:multiSelectHint")}`,
      choices: addNumbersToChoices(customStyles.map((style) => {
        const styleInfo = outputStyleList.find((s) => s.id === style.id);
        return {
          name: `${styleInfo?.name || style.id} - ${ansis.gray(styleInfo?.description || "")}`,
          value: style.id,
          checked: false
          // Let user choose, not pre-selected
        };
      })),
      validate: async (input) => input.length > 0 || i18n.t("configuration:selectAtLeastOne")
    });
    if (!promptedStyles || promptedStyles.length === 0) {
      console.log(ansis.yellow(i18n.t("common:cancelled")));
      return;
    }
    selectedStyles = promptedStyles;
    const { defaultStyle: promptedDefault } = await inquirer.prompt({
      type: "list",
      name: "defaultStyle",
      message: i18n.t("configuration:selectDefaultOutputStyle"),
      choices: addNumbersToChoices([
        // Show selected custom styles first (only what user actually installed)
        ...selectedStyles.map((styleId) => {
          const styleInfo = outputStyleList.find((s) => s.id === styleId);
          return {
            name: `${styleInfo?.name || styleId} - ${ansis.gray(styleInfo?.description || "")}`,
            value: styleId,
            short: styleInfo?.name || styleId
          };
        }),
        // Then show all built-in styles (always available)
        ...availableStyles.filter((style) => !style.isCustom).map((style) => {
          const styleInfo = outputStyleList.find((s) => s.id === style.id);
          return {
            name: `${styleInfo?.name || style.id} - ${ansis.gray(styleInfo?.description || "")}`,
            value: style.id,
            short: styleInfo?.name || style.id
          };
        })
      ]),
      default: selectedStyles.includes("senior-architect") ? "senior-architect" : selectedStyles[0]
    });
    if (!promptedDefault) {
      console.log(ansis.yellow(i18n.t("common:cancelled")));
      return;
    }
    defaultStyle = promptedDefault;
  }
  await copyOutputStyles(selectedStyles, "zh-CN");
  setGlobalDefaultOutputStyle(defaultStyle);
  updateZcfConfig({
    outputStyles: selectedStyles,
    defaultOutputStyle: defaultStyle
  });
  console.log(ansis.green(`\u2714 ${i18n.t("configuration:outputStyleInstalled")}`));
  console.log(ansis.gray(`  ${i18n.t("configuration:selectedStyles")}: ${selectedStyles.join(", ")}`));
  console.log(ansis.gray(`  ${i18n.t("configuration:defaultStyle")}: ${defaultStyle}`));
}

function validateApiKey(apiKey) {
  if (!apiKey || apiKey.trim() === "") {
    return {
      isValid: false,
      // Note: This should use i18next, but due to sync constraint in inquirer validate,
      // we temporarily use a generic message. This will be fixed when we refactor to async validation.
      error: "API key cannot be empty"
    };
  }
  return { isValid: true };
}
function formatApiKeyDisplay(apiKey) {
  if (!apiKey || apiKey.length < 12) {
    return apiKey;
  }
  return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
}

async function configureApiCompletely(preselectedAuthType) {
  ensureI18nInitialized();
  let authType = preselectedAuthType;
  if (!authType) {
    const { authType: selectedAuthType } = await inquirer.prompt({
      type: "list",
      name: "authType",
      message: i18n.t("api:configureApi"),
      choices: addNumbersToChoices([
        {
          name: i18n.t("api:useOfficialLogin"),
          value: "official",
          short: i18n.t("api:useOfficialLogin")
        },
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
      ])
    });
    if (!selectedAuthType) {
      console.log(ansis.yellow(i18n.t("common:cancelled")));
      return null;
    }
    authType = selectedAuthType;
  }
  if (authType === "official") {
    const success = switchToOfficialLogin();
    if (success) {
      return null;
    } else {
      console.log(ansis.red(i18n.t("api:officialLoginFailed")));
      return null;
    }
  }
  const { url } = await inquirer.prompt({
    type: "input",
    name: "url",
    message: i18n.t("api:enterApiUrl"),
    validate: async (value) => {
      if (!value)
        return i18n.t("api:urlRequired");
      try {
        void new URL(value);
        return true;
      } catch {
        return i18n.t("api:invalidUrl");
      }
    }
  });
  if (url === void 0) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return null;
  }
  const keyMessage = authType === "auth_token" ? i18n.t("api:enterAuthToken") : i18n.t("api:enterApiKey");
  const { key } = await inquirer.prompt({
    type: "input",
    name: "key",
    message: keyMessage,
    validate: async (value) => {
      if (!value) {
        return i18n.t("api:keyRequired");
      }
      const validation = validateApiKey(value);
      if (!validation.isValid) {
        return validation.error || i18n.t("api:invalidKeyFormat");
      }
      return true;
    }
  });
  if (key === void 0) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return null;
  }
  console.log(ansis.gray(`  API Key: ${formatApiKeyDisplay(key)}`));
  return { url, key, authType };
}
async function modifyApiConfigPartially(existingConfig) {
  ensureI18nInitialized();
  let currentConfig = { ...existingConfig };
  const latestConfig = getExistingApiConfig();
  if (latestConfig) {
    currentConfig = latestConfig;
  }
  const { item } = await inquirer.prompt({
    type: "list",
    name: "item",
    message: i18n.t("api:selectModifyItems"),
    choices: addNumbersToChoices([
      { name: i18n.t("api:modifyApiUrl"), value: "url" },
      { name: i18n.t("api:modifyApiKey"), value: "key" },
      { name: i18n.t("api:modifyAuthType"), value: "authType" }
    ])
  });
  if (!item) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  if (item === "url") {
    const { url } = await inquirer.prompt({
      type: "input",
      name: "url",
      message: i18n.t("api:enterNewApiUrl").replace("{url}", currentConfig.url || i18n.t("common:none")),
      default: currentConfig.url,
      validate: async (value) => {
        if (!value)
          return i18n.t("api:urlRequired");
        try {
          void new URL(value);
          return true;
        } catch {
          return i18n.t("api:invalidUrl");
        }
      }
    });
    if (url === void 0) {
      console.log(ansis.yellow(i18n.t("common:cancelled")));
      return;
    }
    currentConfig.url = url;
    const savedConfig = configureApi(currentConfig);
    if (savedConfig) {
      console.log(ansis.green(`\u2714 ${i18n.t("api:modificationSaved")}`));
      console.log(ansis.gray(`  ${i18n.t("api:apiConfigUrl")}: ${savedConfig.url}`));
    }
  } else if (item === "key") {
    const authType = currentConfig.authType || "auth_token";
    const keyMessage = authType === "auth_token" ? i18n.t("api:enterNewApiKey").replace("{key}", currentConfig.key ? formatApiKeyDisplay(currentConfig.key) : i18n.t("common:none")) : i18n.t("api:enterNewApiKey").replace("{key}", currentConfig.key ? formatApiKeyDisplay(currentConfig.key) : i18n.t("common:none"));
    const { key } = await inquirer.prompt({
      type: "input",
      name: "key",
      message: keyMessage,
      validate: async (value) => {
        if (!value) {
          return i18n.t("api:keyRequired");
        }
        const validation = validateApiKey(value);
        if (!validation.isValid) {
          return validation.error || i18n.t("api:invalidKeyFormat");
        }
        return true;
      }
    });
    if (key === void 0) {
      console.log(ansis.yellow(i18n.t("common:cancelled")));
      return;
    }
    currentConfig.key = key;
    const savedConfig = configureApi(currentConfig);
    if (savedConfig) {
      console.log(ansis.green(`\u2714 ${i18n.t("api:modificationSaved")}`));
      console.log(ansis.gray(`  ${i18n.t("api:apiConfigKey")}: ${formatApiKeyDisplay(savedConfig.key)}`));
    }
  } else if (item === "authType") {
    const { authType } = await inquirer.prompt({
      type: "list",
      name: "authType",
      message: i18n.t("api:selectNewAuthType").replace("{type}", currentConfig.authType || i18n.t("common:none")),
      choices: addNumbersToChoices([
        { name: "Auth Token (OAuth)", value: "auth_token" },
        { name: "API Key", value: "api_key" }
      ]),
      default: currentConfig.authType === "api_key" ? 1 : 0
    });
    if (authType === void 0) {
      console.log(ansis.yellow(i18n.t("common:cancelled")));
      return;
    }
    currentConfig.authType = authType;
    const savedConfig = configureApi(currentConfig);
    if (savedConfig) {
      console.log(ansis.green(`\u2714 ${i18n.t("api:modificationSaved")}`));
      console.log(ansis.gray(`  ${i18n.t("api:apiConfigAuthType")}: ${savedConfig.authType}`));
    }
  }
}
async function updatePromptOnly(aiOutputLang) {
  ensureI18nInitialized();
  const backupDir = backupExistingConfig();
  if (backupDir) {
    console.log(ansis.gray(`\u2714 ${i18n.t("configuration:backupSuccess")}: ${backupDir}`));
  }
  if (aiOutputLang) {
    applyAiLanguageDirective(aiOutputLang);
  }
  await configureOutputStyle();
  console.log(ansis.green(`\u2714 ${i18n.t("configuration:configSuccess")} ${CLAUDE_DIR}`));
  console.log(`
${ansis.green(i18n.t("common:complete"))}`);
}

function migrateSettingsForTokenRetrieval() {
  ensureI18nInitialized();
  const result = {
    success: false,
    changes: [],
    backupPath: null,
    errors: []
  };
  try {
    if (!exists(SETTINGS_FILE)) {
      result.errors.push(i18n.t("common:fileNotFound", { file: "settings.json" }));
      return result;
    }
    const settings = readJsonConfig(SETTINGS_FILE);
    if (!settings) {
      result.errors.push(i18n.t("common:failedToReadFile", { file: "settings.json" }));
      return result;
    }
    let modified = false;
    if (settings.env) {
      if ("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC" in settings.env) {
        delete settings.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC;
        result.changes.push("Removed CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC (was blocking token retrieval)");
        modified = true;
      }
      if (settings.env.MCP_TIMEOUT) {
        const timeout = Number.parseInt(settings.env.MCP_TIMEOUT, 10);
        if (!Number.isNaN(timeout) && timeout > 2e4) {
          const oldValue = settings.env.MCP_TIMEOUT;
          settings.env.MCP_TIMEOUT = "15000";
          result.changes.push(`Reduced MCP_TIMEOUT from ${oldValue}ms to 15000ms (was causing slow failures)`);
          modified = true;
        }
      }
    }
    if (!modified) {
      result.success = true;
      return result;
    }
    const backupPath = backupExistingConfig();
    if (backupPath) {
      result.backupPath = backupPath;
    } else {
      result.errors.push("Failed to create backup (continuing anyway)");
    }
    writeJsonConfig(SETTINGS_FILE, settings);
    result.success = true;
    return result;
  } catch (error) {
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}
function needsMigration() {
  try {
    if (!exists(SETTINGS_FILE)) {
      return false;
    }
    const settings = readJsonConfig(SETTINGS_FILE);
    if (!settings || !settings.env) {
      return false;
    }
    const hasProblematicVar = "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC" in settings.env;
    const hasExcessiveTimeout = settings.env.MCP_TIMEOUT && Number.parseInt(settings.env.MCP_TIMEOUT, 10) > 2e4;
    return Boolean(hasProblematicVar || hasExcessiveTimeout);
  } catch {
    return false;
  }
}
function displayMigrationResult(result) {
  ensureI18nInitialized();
  if (result.success) {
    if (result.changes.length > 0) {
      console.log(ansis.green(`
\u2705 ${i18n.t("common:configurationFixed")}
`));
      console.log(ansis.bold("Changes made:"));
      for (const change of result.changes) {
        console.log(ansis.gray(`  \u2022 ${change}`));
      }
      if (result.backupPath) {
        console.log(ansis.gray(`
\u{1F4E6} Backup created: ${result.backupPath}`));
      }
      console.log(ansis.yellow("\n\u26A0\uFE0F  Please restart Claude Code CLI for changes to take effect.\n"));
    } else {
      console.log(ansis.green(`
\u2705 ${i18n.t("common:noMigrationNeeded")}
`));
    }
  } else {
    console.log(ansis.red(`
\u274C ${i18n.t("common:migrationFailed")}
`));
    if (result.errors.length > 0) {
      console.log(ansis.bold("Errors:"));
      for (const error of result.errors) {
        console.log(ansis.red(`  \u2022 ${error}`));
      }
    }
    if (result.backupPath) {
      console.log(ansis.gray(`
\u{1F4E6} Backup available at: ${result.backupPath}`));
      console.log(ansis.gray("You can restore with: cp <backup-path>/settings.json ~/.claude/settings.json\n"));
    }
  }
}
async function promptMigration() {
  ensureI18nInitialized();
  const inquirer = await import('inquirer');
  console.log(ansis.yellow("\n\u26A0\uFE0F  Problematic configuration detected!\n"));
  console.log(ansis.gray("Your settings.json contains configurations that prevent Claude Code"));
  console.log(ansis.gray("from retrieving token counts, causing /compact failures.\n"));
  const { shouldMigrate } = await inquirer.default.prompt({
    type: "confirm",
    name: "shouldMigrate",
    message: "Would you like to fix these issues automatically? (backup will be created)",
    default: true
  });
  return shouldMigrate;
}

function getRootDir() {
  const currentFilePath = fileURLToPath(import.meta.url);
  const distDir = dirname(dirname(currentFilePath));
  return dirname(distDir);
}
const DEFAULT_CODE_TOOL_TEMPLATE = "claude-code";
const COMMON_TEMPLATE_CATEGORIES = ["git", "sixStep"];
function formatTags(tags) {
  const tagColors = {
    recommended: (text) => ansis.bgGreen.black(` ${text} `),
    popular: (text) => ansis.bgYellow.black(` ${text} `),
    new: (text) => ansis.bgCyan.black(` ${text} `),
    essential: (text) => ansis.bgBlue.white(` ${text} `),
    professional: (text) => ansis.bgMagenta.white(` ${text} `)
  };
  return tags.map((tag) => tagColors[tag](getTagLabel(tag))).join(" ");
}
function buildWorkflowChoice(workflow) {
  const tags = formatTags(workflow.metadata.tags);
  const stats = workflow.stats ? ansis.dim(workflow.stats) : "";
  const description = workflow.description ? ansis.gray(workflow.description) : "";
  const nameLine = `${workflow.name} ${tags}`;
  const detailLine = stats ? `     ${stats}` : "";
  const descLine = description ? `     ${description}` : "";
  const displayName = [nameLine, detailLine, descLine].filter(Boolean).join("\n");
  return {
    name: displayName,
    value: workflow.id,
    checked: workflow.defaultSelected
  };
}
async function selectAndInstallWorkflows(configLang, preselectedWorkflows) {
  ensureI18nInitialized();
  const workflows = getOrderedWorkflows();
  const choices = workflows.map((workflow) => buildWorkflowChoice(workflow));
  let selectedWorkflows;
  if (preselectedWorkflows) {
    selectedWorkflows = preselectedWorkflows;
  } else {
    console.log("");
    console.log(ansis.bold.cyan("\u2501".repeat(60)));
    console.log(ansis.bold.white(`  \u{1F680} ${i18n.t("workflow:selectWorkflowType")}`));
    console.log(ansis.bold.cyan("\u2501".repeat(60)));
    console.log("");
    const response = await inquirer.prompt({
      type: "checkbox",
      name: "selectedWorkflows",
      message: i18n.t("common:multiSelectHint"),
      choices,
      pageSize: 15
    });
    selectedWorkflows = response.selectedWorkflows;
  }
  if (!selectedWorkflows || selectedWorkflows.length === 0) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  await cleanupOldVersionFiles();
  for (const workflowId of selectedWorkflows) {
    const config = getWorkflowConfig(workflowId);
    if (config) {
      await installWorkflowWithDependencies(config, configLang);
    }
  }
}
async function installWorkflowWithDependencies(config, configLang) {
  const rootDir = getRootDir();
  ensureI18nInitialized();
  const result = {
    workflow: config.id,
    success: true,
    installedCommands: [],
    installedAgents: [],
    errors: []
  };
  const WORKFLOW_OPTION_KEYS = {
    essentialTools: i18n.t("workflow:workflowOption.essentialTools"),
    sixStepsWorkflow: i18n.t("workflow:workflowOption.sixStepsWorkflow"),
    gitWorkflow: i18n.t("workflow:workflowOption.gitWorkflow"),
    interviewWorkflow: i18n.t("workflow:workflowOption.interviewWorkflow")
  };
  const workflowName = WORKFLOW_OPTION_KEYS[config.id] || config.id;
  console.log(ansis.green(`
\u{1F4E6} ${i18n.t("workflow:installingWorkflow")}: ${workflowName}...`));
  const commandsDir = join(CLAUDE_DIR, "commands", "ccjk");
  if (!existsSync(commandsDir)) {
    await mkdir(commandsDir, { recursive: true });
  }
  for (const commandFile of config.commands) {
    const isCommonTemplate = COMMON_TEMPLATE_CATEGORIES.includes(config.category);
    const commandSource = isCommonTemplate ? join(
      rootDir,
      "templates",
      "common",
      "workflow",
      config.category,
      configLang,
      commandFile
    ) : join(
      rootDir,
      "templates",
      DEFAULT_CODE_TOOL_TEMPLATE,
      configLang,
      "workflow",
      config.category,
      "commands",
      commandFile
    );
    const destFileName = commandFile;
    const commandDest = join(commandsDir, destFileName);
    if (existsSync(commandSource)) {
      try {
        await copyFile$1(commandSource, commandDest);
        result.installedCommands.push(destFileName);
        console.log(ansis.gray(`  \u2714 ${i18n.t("workflow:installedCommand")}: ccjk/${destFileName}`));
      } catch (error) {
        const errorMsg = `${i18n.t("workflow:failedToInstallCommand")} ${commandFile}: ${error}`;
        result.errors?.push(errorMsg);
        console.error(ansis.red(`  \u2717 ${errorMsg}`));
        result.success = false;
      }
    }
  }
  if (config.autoInstallAgents && config.agents.length > 0) {
    const agentsCategoryDir = join(CLAUDE_DIR, "agents", "ccjk", config.category);
    if (!existsSync(agentsCategoryDir)) {
      await mkdir(agentsCategoryDir, { recursive: true });
    }
    for (const agent of config.agents) {
      const agentSource = join(
        rootDir,
        "templates",
        DEFAULT_CODE_TOOL_TEMPLATE,
        configLang,
        "workflow",
        config.category,
        "agents",
        agent.filename
      );
      const agentDest = join(agentsCategoryDir, agent.filename);
      if (existsSync(agentSource)) {
        try {
          await copyFile$1(agentSource, agentDest);
          result.installedAgents.push(agent.filename);
          console.log(ansis.gray(`  \u2714 ${i18n.t("workflow:installedAgent")}: ccjk/${config.category}/${agent.filename}`));
        } catch (error) {
          const errorMsg = `${i18n.t("workflow:failedToInstallAgent")} ${agent.filename}: ${error}`;
          result.errors?.push(errorMsg);
          console.error(ansis.red(`  \u2717 ${errorMsg}`));
          if (agent.required) {
            result.success = false;
          }
        }
      }
    }
  }
  if (result.success) {
    console.log(ansis.green(`\u2714 ${workflowName} ${i18n.t("workflow:workflowInstallSuccess")}`));
  } else {
    console.log(ansis.red(`\u2717 ${workflowName} ${i18n.t("workflow:workflowInstallError")}`));
  }
  return result;
}
async function cleanupOldVersionFiles() {
  ensureI18nInitialized();
  console.log(ansis.green(`
\u{1F9F9} ${i18n.t("workflow:cleaningOldFiles")}...`));
  const oldCommandFiles = [
    join(CLAUDE_DIR, "commands", "workflow.md"),
    join(CLAUDE_DIR, "commands", "feat.md")
  ];
  const oldAgentFiles = [
    join(CLAUDE_DIR, "agents", "planner.md"),
    join(CLAUDE_DIR, "agents", "ui-ux-designer.md")
  ];
  for (const file of oldCommandFiles) {
    if (existsSync(file)) {
      try {
        await rm(file, { force: true });
        console.log(ansis.gray(`  \u2714 ${i18n.t("workflow:removedOldFile")}: ${file.replace(CLAUDE_DIR, "~/.claude")}`));
      } catch {
        console.error(ansis.yellow(`  \u26A0 ${i18n.t("errors:failedToRemoveFile")}: ${file.replace(CLAUDE_DIR, "~/.claude")}`));
      }
    }
  }
  for (const file of oldAgentFiles) {
    if (existsSync(file)) {
      try {
        await rm(file, { force: true });
        console.log(ansis.gray(`  \u2714 ${i18n.t("workflow:removedOldFile")}: ${file.replace(CLAUDE_DIR, "~/.claude")}`));
      } catch {
        console.error(ansis.yellow(`  \u26A0 ${i18n.t("errors:failedToRemoveFile")}: ${file.replace(CLAUDE_DIR, "~/.claude")}`));
      }
    }
  }
}

export { modifyApiConfigPartially as a, configureApiCompletely as b, configureOutputStyle as c, displayMigrationResult as d, formatApiKeyDisplay as f, migrateSettingsForTokenRetrieval as m, needsMigration as n, promptMigration as p, selectAndInstallWorkflows as s, updatePromptOnly as u, validateApiKey as v };
