import { fileURLToPath } from 'node:url';
import ansis from 'ansis';
import dayjs from 'dayjs';
import inquirer from 'inquirer';
import { join, dirname } from 'pathe';
import { SETTINGS_FILE, CLAUDE_VSC_CONFIG_FILE, CLAUDE_DIR, AI_OUTPUT_LANGUAGES } from './constants.mjs';
import { ensureI18nInitialized, i18n } from './index.mjs';
import { d as deepMerge, s as setPrimaryApiKey, c as addCompletedOnboarding } from './claude-config.mjs';
import { ensureDir, exists, copyDir, writeFileAtomic, copyFile } from './fs-operations.mjs';
import { readJsonConfig, writeJsonConfig } from './json-config.mjs';

const MODEL_ENV_KEYS = [
  "ANTHROPIC_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  // Deprecated but still cleaned to avoid stale values
  "ANTHROPIC_SMALL_FAST_MODEL"
];
function clearModelEnv(env) {
  for (const key of MODEL_ENV_KEYS) {
    delete env[key];
  }
}

function cleanupPermissions(templatePermissions, userPermissions) {
  const templateSet = new Set(templatePermissions);
  const cleanedPermissions = userPermissions.filter((permission) => {
    if (["mcp__.*", "mcp__*", "mcp__(*)"].includes(permission)) {
      return false;
    }
    for (const templatePerm of templatePermissions) {
      if (permission === templatePerm) {
        continue;
      }
      if (permission.startsWith(templatePerm)) {
        return false;
      }
    }
    return true;
  });
  const merged = [...templateSet];
  for (const permission of cleanedPermissions) {
    if (!templateSet.has(permission)) {
      merged.push(permission);
    }
  }
  return merged;
}
function mergeAndCleanPermissions(templatePermissions, userPermissions) {
  const template = templatePermissions || [];
  const user = userPermissions || [];
  return cleanupPermissions(template, user);
}

function ensureClaudeDir() {
  ensureDir(CLAUDE_DIR);
}
function backupExistingConfig() {
  if (!exists(CLAUDE_DIR)) {
    return null;
  }
  const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
  const backupBaseDir = join(CLAUDE_DIR, "backup");
  const backupDir = join(backupBaseDir, `backup_${timestamp}`);
  ensureDir(backupDir);
  const filter = (path) => {
    return !path.includes("/backup");
  };
  copyDir(CLAUDE_DIR, backupDir, { filter });
  return backupDir;
}
function copyConfigFiles(onlyMd = false) {
  const currentFilePath = fileURLToPath(import.meta.url);
  const distDir = dirname(dirname(currentFilePath));
  const rootDir = dirname(distDir);
  const baseTemplateDir = join(rootDir, "templates", "claude-code");
  if (!onlyMd) {
    const baseSettingsPath = join(baseTemplateDir, "common", "settings.json");
    const destSettingsPath = join(CLAUDE_DIR, "settings.json");
    if (exists(baseSettingsPath)) {
      mergeSettingsFile(baseSettingsPath, destSettingsPath);
    }
  }
}
function getDefaultSettings() {
  try {
    const currentFilePath = fileURLToPath(import.meta.url);
    const distDir = dirname(dirname(currentFilePath));
    const rootDir = dirname(distDir);
    const templateSettingsPath = join(rootDir, "templates", "claude-code", "common", "settings.json");
    return readJsonConfig(templateSettingsPath) || {};
  } catch (error) {
    console.error("Failed to read template settings", error);
    return {};
  }
}
function configureApi(apiConfig) {
  if (!apiConfig)
    return null;
  let settings = getDefaultSettings();
  const existingSettings = readJsonConfig(SETTINGS_FILE);
  if (existingSettings) {
    settings = deepMerge(settings, existingSettings);
  }
  if (!settings.env) {
    settings.env = {};
  }
  if (apiConfig.authType === "api_key") {
    settings.env.ANTHROPIC_API_KEY = apiConfig.key;
    delete settings.env.ANTHROPIC_AUTH_TOKEN;
  } else if (apiConfig.authType === "auth_token") {
    settings.env.ANTHROPIC_AUTH_TOKEN = apiConfig.key;
    delete settings.env.ANTHROPIC_API_KEY;
  }
  if (apiConfig.url) {
    settings.env.ANTHROPIC_BASE_URL = apiConfig.url;
  }
  writeJsonConfig(SETTINGS_FILE, settings);
  if (apiConfig.authType) {
    try {
      setPrimaryApiKey();
    } catch (error) {
      ensureI18nInitialized();
      console.error(i18n.t("mcp:primaryApiKeySetFailed"), error);
    }
  }
  try {
    addCompletedOnboarding();
  } catch (error) {
    console.error("Failed to set onboarding flag", error);
  }
  return apiConfig;
}
function mergeConfigs(sourceFile, targetFile) {
  if (!exists(sourceFile))
    return;
  const target = readJsonConfig(targetFile) || {};
  const source = readJsonConfig(sourceFile) || {};
  const merged = deepMerge(target, source);
  writeJsonConfig(targetFile, merged);
}
function updateCustomModel(primaryModel, haikuModel, sonnetModel, opusModel) {
  if (!primaryModel?.trim() && !haikuModel?.trim() && !sonnetModel?.trim() && !opusModel?.trim()) {
    return;
  }
  let settings = getDefaultSettings();
  const existingSettings = readJsonConfig(SETTINGS_FILE);
  if (existingSettings) {
    settings = existingSettings;
  }
  delete settings.model;
  settings.env = settings.env || {};
  clearModelEnv(settings.env);
  if (primaryModel?.trim()) {
    settings.env.ANTHROPIC_MODEL = primaryModel.trim();
  }
  if (haikuModel?.trim())
    settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = haikuModel.trim();
  if (sonnetModel?.trim())
    settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL = sonnetModel.trim();
  if (opusModel?.trim())
    settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL = opusModel.trim();
  writeJsonConfig(SETTINGS_FILE, settings);
}
function updateDefaultModel(model) {
  let settings = getDefaultSettings();
  const existingSettings = readJsonConfig(SETTINGS_FILE);
  if (existingSettings) {
    settings = existingSettings;
  }
  if (!settings.env) {
    settings.env = {};
  }
  if (model !== "custom") {
    clearModelEnv(settings.env);
  }
  if (model === "default" || model === "custom") {
    delete settings.model;
  } else {
    settings.model = model;
  }
  writeJsonConfig(SETTINGS_FILE, settings);
}
function mergeSettingsFile(templatePath, targetPath) {
  try {
    const templateSettings = readJsonConfig(templatePath);
    if (!templateSettings) {
      console.error("Failed to read template settings");
      return;
    }
    if (!exists(targetPath)) {
      writeJsonConfig(targetPath, templateSettings);
      return;
    }
    const existingSettings = readJsonConfig(targetPath) || {};
    const mergedEnv = {
      ...templateSettings.env || {},
      // Template env vars first
      ...existingSettings.env || {}
      // User's env vars override (preserving API keys, etc.)
    };
    const mergedSettings = deepMerge(templateSettings, existingSettings, {
      mergeArrays: true,
      arrayMergeStrategy: "unique"
    });
    mergedSettings.env = mergedEnv;
    if (mergedSettings.permissions && mergedSettings.permissions.allow) {
      mergedSettings.permissions.allow = mergeAndCleanPermissions(
        templateSettings.permissions?.allow,
        existingSettings.permissions?.allow
      );
    }
    writeJsonConfig(targetPath, mergedSettings);
  } catch (error) {
    console.error("Failed to merge settings", error);
    if (exists(targetPath)) {
      console.log("Preserving existing settings");
    } else {
      copyFile(templatePath, targetPath);
    }
  }
}
function getExistingModelConfig() {
  const settings = readJsonConfig(SETTINGS_FILE);
  if (!settings) {
    return null;
  }
  const hasModelEnv = MODEL_ENV_KEYS.some((key) => settings.env?.[key]);
  if (hasModelEnv) {
    return "custom";
  }
  if (!settings.model) {
    return "default";
  }
  const validModels = ["opus", "sonnet", "sonnet[1m]"];
  if (validModels.includes(settings.model)) {
    return settings.model;
  }
  return "default";
}
function getExistingApiConfig() {
  const settings = readJsonConfig(SETTINGS_FILE);
  if (!settings || !settings.env) {
    return null;
  }
  const { ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL } = settings.env;
  if (!ANTHROPIC_BASE_URL && !ANTHROPIC_API_KEY && !ANTHROPIC_AUTH_TOKEN) {
    return null;
  }
  let authType;
  let key;
  if (ANTHROPIC_AUTH_TOKEN) {
    authType = "auth_token";
    key = ANTHROPIC_AUTH_TOKEN;
  } else if (ANTHROPIC_API_KEY) {
    authType = "api_key";
    key = ANTHROPIC_API_KEY;
  }
  return {
    url: ANTHROPIC_BASE_URL || "",
    key: key || "",
    authType
  };
}
function applyAiLanguageDirective(aiOutputLang) {
  const claudeFile = join(CLAUDE_DIR, "CLAUDE.md");
  let directive = "";
  if (aiOutputLang === "custom") {
    return;
  } else if (AI_OUTPUT_LANGUAGES[aiOutputLang]) {
    directive = AI_OUTPUT_LANGUAGES[aiOutputLang].directive;
  } else {
    directive = `Always respond in ${aiOutputLang}`;
  }
  writeFileAtomic(claudeFile, directive);
}
function switchToOfficialLogin() {
  try {
    ensureI18nInitialized();
    const settings = readJsonConfig(SETTINGS_FILE) || {};
    if (settings.env) {
      delete settings.env.ANTHROPIC_BASE_URL;
      delete settings.env.ANTHROPIC_AUTH_TOKEN;
      delete settings.env.ANTHROPIC_API_KEY;
    }
    writeJsonConfig(SETTINGS_FILE, settings);
    const vscConfig = readJsonConfig(CLAUDE_VSC_CONFIG_FILE);
    if (vscConfig) {
      delete vscConfig.primaryApiKey;
      writeJsonConfig(CLAUDE_VSC_CONFIG_FILE, vscConfig);
    }
    console.log(i18n.t("api:officialLoginConfigured"));
    return true;
  } catch (error) {
    ensureI18nInitialized();
    console.error(i18n.t("api:officialLoginFailed"), error);
    return false;
  }
}
async function promptApiConfigurationAction() {
  ensureI18nInitialized();
  const existingConfig = getExistingApiConfig();
  if (!existingConfig) {
    return null;
  }
  console.log(`
${ansis.green(`\u2139 ${i18n.t("api:existingApiConfig")}`)}`);
  console.log(ansis.gray(`  ${i18n.t("api:apiConfigUrl")}: ${existingConfig.url || "N/A"}`));
  console.log(ansis.gray(`  ${i18n.t("api:apiConfigKey")}: ${existingConfig.key ? `***${existingConfig.key.slice(-4)}` : "N/A"}`));
  console.log(ansis.gray(`  ${i18n.t("api:apiConfigAuthType")}: ${existingConfig.authType || "N/A"}
`));
  const { choice } = await inquirer.prompt({
    type: "list",
    name: "choice",
    message: i18n.t("api:selectCustomConfigAction"),
    choices: [
      {
        name: i18n.t("api:modifyPartialConfig"),
        value: "modify-partial"
      },
      {
        name: i18n.t("api:modifyAllConfig"),
        value: "modify-all"
      },
      {
        name: i18n.t("api:keepExistingConfig"),
        value: "keep-existing"
      }
    ]
  });
  return choice || null;
}

const config = {
  __proto__: null,
  applyAiLanguageDirective: applyAiLanguageDirective,
  backupExistingConfig: backupExistingConfig,
  configureApi: configureApi,
  copyConfigFiles: copyConfigFiles,
  ensureClaudeDir: ensureClaudeDir,
  getExistingApiConfig: getExistingApiConfig,
  getExistingModelConfig: getExistingModelConfig,
  mergeConfigs: mergeConfigs,
  mergeSettingsFile: mergeSettingsFile,
  promptApiConfigurationAction: promptApiConfigurationAction,
  switchToOfficialLogin: switchToOfficialLogin,
  updateCustomModel: updateCustomModel,
  updateDefaultModel: updateDefaultModel
};

export { applyAiLanguageDirective as a, backupExistingConfig as b, clearModelEnv as c, updateDefaultModel as d, getExistingApiConfig as e, configureApi as f, getExistingModelConfig as g, ensureClaudeDir as h, copyConfigFiles as i, config as j, mergeAndCleanPermissions as m, promptApiConfigurationAction as p, switchToOfficialLogin as s, updateCustomModel as u };
