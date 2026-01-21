import dayjs from 'dayjs';
import { join } from 'pathe';
import { ZCF_CONFIG_FILE, ZCF_CONFIG_DIR, SETTINGS_FILE } from './constants.mjs';
import { readDefaultTomlConfig, createDefaultTomlConfig, writeTomlConfig } from './ccjk-config.mjs';
import { c as clearModelEnv } from './config2.mjs';
import { ensureDir, exists, copyFile } from './fs-operations.mjs';
import { readJsonConfig } from './json-config.mjs';
import 'node:os';
import './index.mjs';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'smol-toml';
import 'node:crypto';
import 'node:fs/promises';
import 'ansis';
import 'inquirer';
import './claude-config.mjs';
import './platform.mjs';
import 'tinyexec';

class ClaudeCodeConfigManager {
  static CONFIG_FILE = ZCF_CONFIG_FILE;
  static LEGACY_CONFIG_FILE = join(ZCF_CONFIG_DIR, "claude-code-configs.json");
  /**
   * Ensure configuration directory exists
   */
  static ensureConfigDir() {
    ensureDir(ZCF_CONFIG_DIR);
  }
  /**
   * Read TOML configuration
   */
  static readTomlConfig() {
    return readDefaultTomlConfig();
  }
  /**
   * Load TOML configuration, falling back to default when missing
   */
  static loadTomlConfig() {
    const existingConfig = this.readTomlConfig();
    if (existingConfig) {
      return existingConfig;
    }
    return createDefaultTomlConfig();
  }
  /**
   * Migrate legacy JSON-based configuration into TOML storage
   */
  static migrateFromLegacyConfig() {
    if (!exists(this.LEGACY_CONFIG_FILE)) {
      return null;
    }
    try {
      const legacyConfig = readJsonConfig(this.LEGACY_CONFIG_FILE);
      if (!legacyConfig) {
        return null;
      }
      const normalizedProfiles = {};
      const existingKeys = /* @__PURE__ */ new Set();
      let migratedCurrentKey = "";
      Object.entries(legacyConfig.profiles || {}).forEach(([legacyKey, profile]) => {
        const sourceProfile = profile;
        const name = sourceProfile.name?.trim() || legacyKey;
        const baseKey = this.generateProfileId(name);
        let uniqueKey = baseKey || legacyKey;
        let suffix = 2;
        while (existingKeys.has(uniqueKey)) {
          uniqueKey = `${baseKey || legacyKey}-${suffix++}`;
        }
        existingKeys.add(uniqueKey);
        const sanitizedProfile = this.sanitizeProfile({
          ...sourceProfile,
          name
        });
        normalizedProfiles[uniqueKey] = {
          ...sanitizedProfile,
          id: uniqueKey
        };
        if (legacyConfig.currentProfileId === legacyKey || legacyConfig.currentProfileId === sourceProfile.id) {
          migratedCurrentKey = uniqueKey;
        }
      });
      if (!migratedCurrentKey && legacyConfig.currentProfileId) {
        const fallbackKey = this.generateProfileId(legacyConfig.currentProfileId);
        if (existingKeys.has(fallbackKey)) {
          migratedCurrentKey = fallbackKey;
        }
      }
      if (!migratedCurrentKey && existingKeys.size > 0) {
        migratedCurrentKey = Array.from(existingKeys)[0];
      }
      const migratedConfig = {
        currentProfileId: migratedCurrentKey,
        profiles: normalizedProfiles
      };
      this.writeConfig(migratedConfig);
      return migratedConfig;
    } catch (error) {
      console.error("Failed to migrate legacy Claude Code config:", error);
      return null;
    }
  }
  /**
   * Read configuration
   */
  static readConfig() {
    try {
      const tomlConfig = readDefaultTomlConfig();
      if (!tomlConfig || !tomlConfig.claudeCode) {
        return this.migrateFromLegacyConfig();
      }
      const { claudeCode } = tomlConfig;
      const rawProfiles = claudeCode.profiles || {};
      const sanitizedProfiles = Object.fromEntries(
        Object.entries(rawProfiles).map(([key, profile]) => {
          const storedProfile = this.sanitizeProfile({
            ...profile,
            name: profile.name || key
          });
          return [key, { ...storedProfile, id: key }];
        })
      );
      const configData = {
        currentProfileId: claudeCode.currentProfile || "",
        profiles: sanitizedProfiles
      };
      if (Object.keys(configData.profiles).length === 0) {
        const migrated = this.migrateFromLegacyConfig();
        if (migrated) {
          return migrated;
        }
      }
      return configData;
    } catch (error) {
      console.error("Failed to read Claude Code config:", error);
      return null;
    }
  }
  /**
   * Write configuration
   */
  static writeConfig(config) {
    try {
      this.ensureConfigDir();
      const keyMap = /* @__PURE__ */ new Map();
      const sanitizedProfiles = Object.fromEntries(
        Object.entries(config.profiles).map(([key, profile]) => {
          const normalizedName = profile.name?.trim() || key;
          const profileKey = this.generateProfileId(normalizedName);
          keyMap.set(key, profileKey);
          const sanitizedProfile = this.sanitizeProfile({
            ...profile,
            name: normalizedName
          });
          return [profileKey, sanitizedProfile];
        })
      );
      const tomlConfig = this.loadTomlConfig();
      const nextTomlConfig = {
        ...tomlConfig,
        claudeCode: {
          ...tomlConfig.claudeCode,
          currentProfile: keyMap.get(config.currentProfileId) || config.currentProfileId,
          profiles: sanitizedProfiles
        }
      };
      writeTomlConfig(this.CONFIG_FILE, nextTomlConfig);
    } catch (error) {
      console.error("Failed to write Claude Code config:", error);
      throw new Error(`Failed to write config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Create empty configuration
   */
  static createEmptyConfig() {
    return {
      currentProfileId: "",
      profiles: {}
    };
  }
  /**
   * Apply profile settings to Claude Code runtime
   */
  static async applyProfileSettings(profile) {
    const { ensureI18nInitialized, i18n } = await import('./index.mjs');
    ensureI18nInitialized();
    try {
      if (!profile) {
        const { switchToOfficialLogin } = await import('./config2.mjs').then(function (n) { return n.j; });
        switchToOfficialLogin();
        return;
      }
      const { readJsonConfig: readJsonConfig2, writeJsonConfig } = await import('./json-config.mjs');
      const settings = readJsonConfig2(SETTINGS_FILE) || {};
      if (!settings.env)
        settings.env = {};
      clearModelEnv(settings.env);
      let shouldRestartCcr = false;
      if (profile.authType === "api_key") {
        settings.env.ANTHROPIC_API_KEY = profile.apiKey;
        delete settings.env.ANTHROPIC_AUTH_TOKEN;
      } else if (profile.authType === "auth_token") {
        settings.env.ANTHROPIC_AUTH_TOKEN = profile.apiKey;
        delete settings.env.ANTHROPIC_API_KEY;
      } else if (profile.authType === "ccr_proxy") {
        const { readCcrConfig } = await import('./config3.mjs');
        const ccrConfig = readCcrConfig();
        if (!ccrConfig) {
          throw new Error(i18n.t("ccr:ccrNotConfigured") || "CCR proxy configuration not found");
        }
        const host = ccrConfig.HOST || "127.0.0.1";
        const port = ccrConfig.PORT || 3456;
        const apiKey = ccrConfig.APIKEY || "sk-ccjk-x-ccr";
        settings.env.ANTHROPIC_BASE_URL = `http://${host}:${port}`;
        settings.env.ANTHROPIC_API_KEY = apiKey;
        delete settings.env.ANTHROPIC_AUTH_TOKEN;
        shouldRestartCcr = true;
      }
      if (profile.authType !== "ccr_proxy") {
        if (profile.baseUrl)
          settings.env.ANTHROPIC_BASE_URL = profile.baseUrl;
        else
          delete settings.env.ANTHROPIC_BASE_URL;
      }
      const hasModelConfig = Boolean(
        profile.primaryModel || profile.defaultHaikuModel || profile.defaultSonnetModel || profile.defaultOpusModel
      );
      if (hasModelConfig) {
        if (profile.primaryModel)
          settings.env.ANTHROPIC_MODEL = profile.primaryModel;
        if (profile.defaultHaikuModel)
          settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = profile.defaultHaikuModel;
        if (profile.defaultSonnetModel)
          settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL = profile.defaultSonnetModel;
        if (profile.defaultOpusModel)
          settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL = profile.defaultOpusModel;
      } else {
        clearModelEnv(settings.env);
      }
      writeJsonConfig(SETTINGS_FILE, settings);
      const { setPrimaryApiKey, addCompletedOnboarding } = await import('./claude-config.mjs').then(function (n) { return n.e; });
      setPrimaryApiKey();
      addCompletedOnboarding();
      if (shouldRestartCcr) {
        const { runCcrRestart } = await import('./commands.mjs');
        await runCcrRestart();
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`${i18n.t("multi-config:failedToApplySettings")}: ${reason}`);
    }
  }
  static async applyCurrentProfile() {
    const currentProfile = this.getCurrentProfile();
    await this.applyProfileSettings(currentProfile);
  }
  /**
   * Remove unsupported fields from profile payload
   */
  static sanitizeProfile(profile) {
    const sanitized = {
      name: profile.name,
      authType: profile.authType
    };
    if (profile.apiKey)
      sanitized.apiKey = profile.apiKey;
    if (profile.baseUrl)
      sanitized.baseUrl = profile.baseUrl;
    if (profile.primaryModel)
      sanitized.primaryModel = profile.primaryModel;
    if (profile.defaultHaikuModel)
      sanitized.defaultHaikuModel = profile.defaultHaikuModel;
    if (profile.defaultSonnetModel)
      sanitized.defaultSonnetModel = profile.defaultSonnetModel;
    if (profile.defaultOpusModel)
      sanitized.defaultOpusModel = profile.defaultOpusModel;
    return sanitized;
  }
  /**
   * Backup configuration
   */
  static backupConfig() {
    try {
      if (!exists(this.CONFIG_FILE)) {
        return null;
      }
      const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
      const backupPath = join(ZCF_CONFIG_DIR, `config.backup.${timestamp}.toml`);
      copyFile(this.CONFIG_FILE, backupPath);
      return backupPath;
    } catch (error) {
      console.error("Failed to backup Claude Code config:", error);
      return null;
    }
  }
  /**
   * Add configuration
   */
  static async addProfile(profile) {
    try {
      const validationErrors = this.validateProfile(profile);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Validation failed: ${validationErrors.join(", ")}`
        };
      }
      const backupPath = this.backupConfig();
      let config = this.readConfig();
      if (!config) {
        config = this.createEmptyConfig();
      }
      if (profile.id && config.profiles[profile.id]) {
        return {
          success: false,
          error: `Profile with ID "${profile.id}" already exists`,
          backupPath: backupPath || void 0
        };
      }
      const normalizedName = profile.name.trim();
      const profileKey = this.generateProfileId(normalizedName);
      const existingNames = Object.values(config.profiles).map((p) => p.name || "");
      if (config.profiles[profileKey] || existingNames.some((name) => name.toLowerCase() === normalizedName.toLowerCase())) {
        return {
          success: false,
          error: `Profile with name "${profile.name}" already exists`,
          backupPath: backupPath || void 0
        };
      }
      const sanitizedProfile = this.sanitizeProfile({
        ...profile,
        name: normalizedName
      });
      const runtimeProfile = {
        ...sanitizedProfile,
        id: profileKey
      };
      config.profiles[profileKey] = runtimeProfile;
      if (!config.currentProfileId) {
        config.currentProfileId = profileKey;
      }
      this.writeConfig(config);
      return {
        success: true,
        backupPath: backupPath || void 0,
        addedProfile: runtimeProfile
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Update configuration
   */
  static async updateProfile(id, data) {
    try {
      const validationErrors = this.validateProfile(data, true);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Validation failed: ${validationErrors.join(", ")}`
        };
      }
      const backupPath = this.backupConfig();
      const config = this.readConfig();
      if (!config || !config.profiles[id]) {
        return {
          success: false,
          error: `Profile with ID "${id}" not found`,
          backupPath: backupPath || void 0
        };
      }
      const existingProfile = config.profiles[id];
      const nextName = data.name !== void 0 ? data.name.trim() : existingProfile.name;
      const nextKey = this.generateProfileId(nextName);
      const nameChanged = nextKey !== id;
      if (nameChanged) {
        const duplicateName = Object.entries(config.profiles).some(([key, profile]) => key !== id && (profile.name || "").toLowerCase() === nextName.toLowerCase());
        if (duplicateName || config.profiles[nextKey]) {
          return {
            success: false,
            error: `Profile with name "${data.name}" already exists`,
            backupPath: backupPath || void 0
          };
        }
      }
      const mergedProfile = this.sanitizeProfile({
        ...existingProfile,
        ...data,
        name: nextName
      });
      if (nameChanged) {
        delete config.profiles[id];
        config.profiles[nextKey] = {
          ...mergedProfile,
          id: nextKey
        };
        if (config.currentProfileId === id) {
          config.currentProfileId = nextKey;
        }
      } else {
        config.profiles[id] = {
          ...mergedProfile,
          id
        };
      }
      this.writeConfig(config);
      return {
        success: true,
        backupPath: backupPath || void 0,
        updatedProfile: {
          ...mergedProfile,
          id: nameChanged ? nextKey : id
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Delete configuration
   */
  static async deleteProfile(id) {
    try {
      const backupPath = this.backupConfig();
      const config = this.readConfig();
      if (!config || !config.profiles[id]) {
        return {
          success: false,
          error: `Profile with ID "${id}" not found`,
          backupPath: backupPath || void 0
        };
      }
      const profileCount = Object.keys(config.profiles).length;
      if (profileCount === 1) {
        return {
          success: false,
          error: "Cannot delete the last profile. At least one profile must remain.",
          backupPath: backupPath || void 0
        };
      }
      delete config.profiles[id];
      if (config.currentProfileId === id) {
        const remainingIds = Object.keys(config.profiles);
        config.currentProfileId = remainingIds[0];
      }
      this.writeConfig(config);
      return {
        success: true,
        backupPath: backupPath || void 0,
        remainingProfiles: Object.entries(config.profiles).map(([key, profile]) => ({
          ...profile,
          id: key
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Delete multiple configurations
   */
  static async deleteProfiles(ids) {
    try {
      const backupPath = this.backupConfig();
      const config = this.readConfig();
      if (!config) {
        return {
          success: false,
          error: "No configuration found",
          backupPath: backupPath || void 0
        };
      }
      const missingIds = ids.filter((id) => !config.profiles[id]);
      if (missingIds.length > 0) {
        return {
          success: false,
          error: `Profiles not found: ${missingIds.join(", ")}`,
          backupPath: backupPath || void 0
        };
      }
      const remainingCount = Object.keys(config.profiles).length - ids.length;
      if (remainingCount === 0) {
        return {
          success: false,
          error: "Cannot delete all profiles. At least one profile must remain.",
          backupPath: backupPath || void 0
        };
      }
      let newCurrentProfileId;
      ids.forEach((id) => {
        delete config.profiles[id];
      });
      if (ids.includes(config.currentProfileId)) {
        const remainingIds = Object.keys(config.profiles);
        config.currentProfileId = remainingIds[0];
        newCurrentProfileId = config.currentProfileId;
      }
      this.writeConfig(config);
      return {
        success: true,
        backupPath: backupPath || void 0,
        newCurrentProfileId,
        deletedProfiles: ids,
        remainingProfiles: Object.entries(config.profiles).map(([key, profile]) => ({
          ...profile,
          id: key
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Generate profile ID from name
   */
  static generateProfileId(name) {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "profile";
  }
  /**
   * Switch configuration
   */
  static async switchProfile(id) {
    try {
      const config = this.readConfig();
      if (!config || !config.profiles[id]) {
        return {
          success: false,
          error: "Profile not found"
        };
      }
      if (config.currentProfileId === id) {
        return { success: true };
      }
      config.currentProfileId = id;
      this.writeConfig(config);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * List all configurations
   */
  static listProfiles() {
    const config = this.readConfig();
    if (!config) {
      return [];
    }
    return Object.values(config.profiles);
  }
  /**
   * Get current configuration
   */
  static getCurrentProfile() {
    const config = this.readConfig();
    if (!config || !config.currentProfileId) {
      return null;
    }
    return config.profiles[config.currentProfileId] || null;
  }
  /**
   * Get configuration by ID
   */
  static getProfileById(id) {
    const config = this.readConfig();
    if (!config) {
      return null;
    }
    return config.profiles[id] || null;
  }
  /**
   * Get configuration by name
   */
  static getProfileByName(name) {
    const config = this.readConfig();
    if (!config) {
      return null;
    }
    return Object.values(config.profiles).find((p) => p.name === name) || null;
  }
  /**
   * Sync CCR configuration
   */
  static async syncCcrProfile() {
    try {
      const { readCcrConfig } = await import('./config3.mjs');
      const ccrConfig = readCcrConfig();
      if (!ccrConfig) {
        await this.ensureCcrProfileExists(ccrConfig);
        return;
      }
      await this.ensureCcrProfileExists(ccrConfig);
    } catch (error) {
      console.error("Failed to sync CCR profile:", error);
    }
  }
  /**
   * 确保CCR配置文件存在
   */
  static async ensureCcrProfileExists(ccrConfig) {
    const config = this.readConfig() || this.createEmptyConfig();
    const ccrProfileId = "ccr-proxy";
    const existingCcrProfile = config.profiles[ccrProfileId];
    if (!ccrConfig) {
      if (existingCcrProfile) {
        delete config.profiles[ccrProfileId];
        if (config.currentProfileId === ccrProfileId) {
          const remainingIds = Object.keys(config.profiles);
          config.currentProfileId = remainingIds[0] || "";
        }
        this.writeConfig(config);
      }
      return;
    }
    const host = ccrConfig.HOST || "127.0.0.1";
    const port = ccrConfig.PORT || 3456;
    const apiKey = ccrConfig.APIKEY || "sk-ccjk-x-ccr";
    const baseUrl = `http://${host}:${port}`;
    const ccrProfile = {
      name: "CCR Proxy",
      authType: "ccr_proxy",
      baseUrl,
      apiKey
    };
    config.profiles[ccrProfileId] = {
      ...ccrProfile,
      id: ccrProfileId
    };
    if (!config.currentProfileId) {
      config.currentProfileId = ccrProfileId;
    }
    this.writeConfig(config);
  }
  /**
   * Switch to official login
   */
  static async switchToOfficial() {
    try {
      const config = this.readConfig();
      if (!config) {
        return { success: true };
      }
      config.currentProfileId = "";
      this.writeConfig(config);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Switch to CCR proxy
   */
  static async switchToCcr() {
    try {
      await this.syncCcrProfile();
      const config = this.readConfig();
      if (!config || !config.profiles["ccr-proxy"]) {
        return {
          success: false,
          error: "CCR proxy configuration not found. Please configure CCR first."
        };
      }
      return await this.switchProfile("ccr-proxy");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Validate configuration
   */
  static validateProfile(profile, isUpdate = false) {
    const errors = [];
    if (!isUpdate && (!profile.name || typeof profile.name !== "string" || profile.name.trim() === "")) {
      errors.push("Profile name is required");
    }
    if (profile.name && typeof profile.name !== "string") {
      errors.push("Profile name must be a string");
    }
    if (profile.authType && !["api_key", "auth_token", "ccr_proxy"].includes(profile.authType)) {
      errors.push("Invalid auth type. Must be one of: api_key, auth_token, ccr_proxy");
    }
    if (profile.authType === "api_key" || profile.authType === "auth_token") {
      if (!profile.apiKey || typeof profile.apiKey !== "string" || profile.apiKey.trim() === "") {
        errors.push("API key is required for api_key and auth_token types");
      }
    }
    if (profile.baseUrl) {
      try {
        new URL(profile.baseUrl);
      } catch {
        errors.push("Invalid base URL format");
      }
    }
    return errors;
  }
  /**
   * 检查是否为最后一个配置
   */
  static isLastProfile(id) {
    const config = this.readConfig();
    if (!config || !config.profiles[id]) {
      return false;
    }
    return Object.keys(config.profiles).length === 1;
  }
}

export { ClaudeCodeConfigManager };
