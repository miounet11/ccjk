import { existsSync, mkdirSync, renameSync, copyFileSync, rmSync } from 'node:fs';
import { dirname } from 'pathe';
import { parse, stringify } from 'smol-toml';
import { DEFAULT_CODE_TOOL_TYPE, ZCF_CONFIG_FILE, LEGACY_ZCF_CONFIG_FILES, ZCF_CONFIG_DIR, isCodeToolType, SUPPORTED_LANGS } from './constants.mjs';
import { exists, readFile, ensureDir, writeFileAtomic } from './fs-operations.mjs';
import { readJsonConfig } from './json-config.mjs';
import 'node:os';
import './index.mjs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'node:crypto';
import 'node:fs/promises';
import 'dayjs';

function isSupportedLang(value) {
  return SUPPORTED_LANGS.includes(value);
}
function sanitizePreferredLang(lang) {
  return isSupportedLang(lang) ? lang : "en";
}
function sanitizeCodeToolType(codeTool) {
  return isCodeToolType(codeTool) ? codeTool : DEFAULT_CODE_TOOL_TYPE;
}
function readTomlConfig(configPath) {
  try {
    if (!exists(configPath)) {
      return null;
    }
    const content = readFile(configPath);
    const parsed = parse(content);
    return parsed;
  } catch {
    return null;
  }
}
function writeTomlConfig(configPath, config) {
  try {
    const configDir = dirname(configPath);
    ensureDir(configDir);
    const tomlContent = stringify(config);
    writeFileAtomic(configPath, tomlContent);
  } catch {
  }
}
function createDefaultTomlConfig(preferredLang = "en", claudeCodeInstallType = "global") {
  return {
    version: "1.0.0",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    general: {
      preferredLang,
      templateLang: preferredLang,
      // Default templateLang to preferredLang for new installations
      aiOutputLang: preferredLang === "zh-CN" ? "zh-CN" : void 0,
      currentTool: DEFAULT_CODE_TOOL_TYPE
    },
    claudeCode: {
      enabled: true,
      outputStyles: ["speed-coder", "senior-architect", "pair-programmer"],
      defaultOutputStyle: "senior-architect",
      installType: claudeCodeInstallType,
      currentProfile: "",
      profiles: {}
    },
    codex: {
      enabled: false,
      systemPromptStyle: "senior-architect"
    }
  };
}
function migrateFromJsonConfig(jsonConfig) {
  const claudeCodeInstallType = jsonConfig.claudeCodeInstallation?.type || "global";
  const defaultConfig = createDefaultTomlConfig("en", claudeCodeInstallType);
  const tomlConfig = {
    version: jsonConfig.version || defaultConfig.version,
    lastUpdated: jsonConfig.lastUpdated || (/* @__PURE__ */ new Date()).toISOString(),
    general: {
      preferredLang: jsonConfig.preferredLang || defaultConfig.general.preferredLang,
      templateLang: jsonConfig.templateLang || jsonConfig.preferredLang || defaultConfig.general.preferredLang,
      // Backward compatibility: use preferredLang as default
      aiOutputLang: jsonConfig.aiOutputLang || defaultConfig.general.aiOutputLang,
      currentTool: jsonConfig.codeToolType || defaultConfig.general.currentTool
    },
    claudeCode: {
      enabled: jsonConfig.codeToolType === "claude-code",
      outputStyles: jsonConfig.outputStyles || defaultConfig.claudeCode.outputStyles,
      defaultOutputStyle: jsonConfig.defaultOutputStyle || defaultConfig.claudeCode.defaultOutputStyle,
      installType: claudeCodeInstallType,
      currentProfile: jsonConfig.currentProfileId || defaultConfig.claudeCode.currentProfile,
      profiles: jsonConfig.claudeCode?.profiles || {}
    },
    codex: {
      enabled: jsonConfig.codeToolType === "codex",
      systemPromptStyle: jsonConfig.systemPromptStyle || defaultConfig.codex.systemPromptStyle
    }
  };
  return tomlConfig;
}
function updateTomlConfig(configPath, updates) {
  const existingConfig = readTomlConfig(configPath) || createDefaultTomlConfig();
  const updatedConfig = {
    version: updates.version || existingConfig.version,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    general: {
      ...existingConfig.general,
      ...updates.general
    },
    claudeCode: {
      ...existingConfig.claudeCode,
      ...updates.claudeCode
    },
    codex: {
      ...existingConfig.codex,
      ...updates.codex
    }
  };
  writeTomlConfig(configPath, updatedConfig);
  return updatedConfig;
}
function convertTomlToLegacyConfig(tomlConfig) {
  return {
    version: tomlConfig.version,
    preferredLang: tomlConfig.general.preferredLang,
    templateLang: tomlConfig.general.templateLang,
    aiOutputLang: tomlConfig.general.aiOutputLang,
    outputStyles: tomlConfig.claudeCode.outputStyles,
    defaultOutputStyle: tomlConfig.claudeCode.defaultOutputStyle,
    codeToolType: tomlConfig.general.currentTool,
    lastUpdated: tomlConfig.lastUpdated
  };
}
function convertLegacyToTomlConfig(legacyConfig) {
  return migrateFromJsonConfig(legacyConfig);
}
function normalizeZcfConfig(config) {
  if (!config) {
    return null;
  }
  return {
    version: typeof config.version === "string" ? config.version : "1.0.0",
    preferredLang: sanitizePreferredLang(config.preferredLang),
    templateLang: config.templateLang ? sanitizePreferredLang(config.templateLang) : void 0,
    aiOutputLang: config.aiOutputLang,
    outputStyles: Array.isArray(config.outputStyles) ? config.outputStyles : void 0,
    defaultOutputStyle: typeof config.defaultOutputStyle === "string" ? config.defaultOutputStyle : void 0,
    codeToolType: sanitizeCodeToolType(config.codeToolType),
    lastUpdated: typeof config.lastUpdated === "string" ? config.lastUpdated : (/* @__PURE__ */ new Date()).toISOString()
  };
}
function migrateZcfConfigIfNeeded() {
  const target = ZCF_CONFIG_FILE;
  const removed = [];
  const targetExists = existsSync(target);
  const legacySources = LEGACY_ZCF_CONFIG_FILES.filter((path) => existsSync(path));
  if (!targetExists && legacySources.length > 0) {
    const source = legacySources[0];
    if (!existsSync(ZCF_CONFIG_DIR)) {
      mkdirSync(ZCF_CONFIG_DIR, { recursive: true });
    }
    try {
      renameSync(source, target);
    } catch (error) {
      if (error?.code !== "EXDEV") {
        throw error;
      }
      copyFileSync(source, target);
      rmSync(source, { force: true });
    }
    for (const leftover of legacySources.slice(1)) {
      try {
        rmSync(leftover, { force: true });
        removed.push(leftover);
      } catch {
      }
    }
    return { migrated: true, source, target, removed };
  }
  if (targetExists && legacySources.length > 0) {
    for (const source of legacySources) {
      try {
        rmSync(source, { force: true });
        removed.push(source);
      } catch {
      }
    }
    return { migrated: false, target, removed };
  }
  return { migrated: false, target, removed };
}
function readZcfConfig() {
  migrateZcfConfigIfNeeded();
  const tomlConfig = readTomlConfig(ZCF_CONFIG_FILE);
  if (tomlConfig) {
    return convertTomlToLegacyConfig(tomlConfig);
  }
  const raw = readJsonConfig(ZCF_CONFIG_FILE.replace(".toml", ".json"));
  const normalized = normalizeZcfConfig(raw || null);
  if (normalized) {
    return normalized;
  }
  for (const legacyPath of LEGACY_ZCF_CONFIG_FILES) {
    if (existsSync(legacyPath)) {
      const legacyRaw = readJsonConfig(legacyPath);
      const legacyNormalized = normalizeZcfConfig(legacyRaw || null);
      if (legacyNormalized) {
        return legacyNormalized;
      }
    }
  }
  return null;
}
async function readZcfConfigAsync() {
  return readZcfConfig();
}
function writeZcfConfig(config) {
  try {
    const sanitizedConfig = {
      ...config,
      codeToolType: sanitizeCodeToolType(config.codeToolType)
    };
    const existingTomlConfig = readTomlConfig(ZCF_CONFIG_FILE);
    const tomlConfig = convertLegacyToTomlConfig(sanitizedConfig);
    const nextSystemPromptStyle = sanitizedConfig.systemPromptStyle || existingTomlConfig?.codex?.systemPromptStyle;
    if (nextSystemPromptStyle) {
      tomlConfig.codex.systemPromptStyle = nextSystemPromptStyle;
    }
    if (existingTomlConfig?.claudeCode) {
      if (existingTomlConfig.claudeCode.profiles) {
        tomlConfig.claudeCode.profiles = existingTomlConfig.claudeCode.profiles;
      }
      if (existingTomlConfig.claudeCode.currentProfile !== void 0) {
        tomlConfig.claudeCode.currentProfile = existingTomlConfig.claudeCode.currentProfile;
      }
      if (existingTomlConfig.claudeCode.version) {
        tomlConfig.claudeCode.version = existingTomlConfig.claudeCode.version;
      }
    }
    writeTomlConfig(ZCF_CONFIG_FILE, tomlConfig);
  } catch {
  }
}
function updateZcfConfig(updates) {
  const existingConfig = readZcfConfig();
  const newConfig = {
    version: updates.version || existingConfig?.version || "1.0.0",
    preferredLang: updates.preferredLang || existingConfig?.preferredLang || "en",
    templateLang: updates.templateLang !== void 0 ? updates.templateLang : existingConfig?.templateLang,
    aiOutputLang: updates.aiOutputLang || existingConfig?.aiOutputLang,
    outputStyles: updates.outputStyles !== void 0 ? updates.outputStyles : existingConfig?.outputStyles,
    defaultOutputStyle: updates.defaultOutputStyle !== void 0 ? updates.defaultOutputStyle : existingConfig?.defaultOutputStyle,
    codeToolType: updates.codeToolType || existingConfig?.codeToolType || DEFAULT_CODE_TOOL_TYPE,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeZcfConfig(newConfig);
}
function readDefaultTomlConfig() {
  return readTomlConfig(ZCF_CONFIG_FILE);
}

export { createDefaultTomlConfig, migrateFromJsonConfig, migrateZcfConfigIfNeeded, readDefaultTomlConfig, readTomlConfig, readZcfConfig, readZcfConfigAsync, updateTomlConfig, updateZcfConfig, writeTomlConfig, writeZcfConfig };
