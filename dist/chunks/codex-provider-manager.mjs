import { ensureI18nInitialized, i18n } from './index.mjs';
import { a as readCodexConfig, e as backupCodexComplete, w as writeCodexConfig, f as writeAuthFile } from './codex.mjs';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';
import 'ansis';
import 'dayjs';
import 'inquirer';
import 'ora';
import 'semver';
import 'smol-toml';
import 'tinyexec';
import './constants.mjs';
import 'node:os';
import './ccjk-config.mjs';
import './fs-operations.mjs';
import 'node:crypto';
import 'node:fs/promises';
import './json-config.mjs';
import './config2.mjs';
import './claude-config.mjs';
import './platform.mjs';
import '../shared/ccjk.BFQ7yr5S.mjs';
import './prompts.mjs';
import './package.mjs';
import '../shared/ccjk.DHbrGcgg.mjs';
import 'inquirer-toggle';
import 'node:child_process';

async function addProviderToExisting(provider, apiKey, allowOverwrite = false) {
  ensureI18nInitialized();
  try {
    const existingConfig = readCodexConfig();
    const existingProviderIndex = existingConfig?.providers.findIndex((p) => p.id === provider.id) ?? -1;
    if (existingProviderIndex !== -1 && !allowOverwrite) {
      return {
        success: false,
        error: i18n.t("codex:providerManager.providerExists", { id: provider.id })
      };
    }
    let updatedConfig;
    if (!existingConfig) {
      updatedConfig = {
        model: provider.model || null,
        modelProvider: provider.id,
        providers: [provider],
        mcpServices: [],
        managed: true,
        otherConfig: []
      };
    } else if (existingProviderIndex !== -1) {
      const updatedProviders = [...existingConfig.providers];
      updatedProviders[existingProviderIndex] = provider;
      updatedConfig = {
        ...existingConfig,
        providers: updatedProviders,
        modelProvider: existingConfig.modelProvider || provider.id
      };
    } else {
      updatedConfig = {
        ...existingConfig,
        providers: [...existingConfig.providers, provider],
        modelProvider: existingConfig.modelProvider || provider.id
      };
    }
    let backupPath;
    if (existingConfig) {
      const backup = backupCodexComplete();
      if (!backup) {
        return {
          success: false,
          error: i18n.t("codex:providerManager.backupFailed")
        };
      }
      backupPath = backup || void 0;
    }
    writeCodexConfig(updatedConfig);
    const authEntries = {};
    authEntries[provider.tempEnvKey] = apiKey;
    writeAuthFile(authEntries);
    return {
      success: true,
      backupPath,
      addedProvider: provider
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : i18n.t("codex:providerManager.unknownError")
    };
  }
}
async function editExistingProvider(providerId, updates) {
  ensureI18nInitialized();
  try {
    const existingConfig = readCodexConfig();
    if (!existingConfig) {
      return {
        success: false,
        error: i18n.t("codex:providerManager.noConfig")
      };
    }
    const providerIndex = existingConfig.providers.findIndex((p) => p.id === providerId);
    if (providerIndex === -1) {
      return {
        success: false,
        error: i18n.t("codex:providerManager.providerNotFound", { id: providerId })
      };
    }
    const backupPath = backupCodexComplete();
    if (!backupPath) {
      return {
        success: false,
        error: i18n.t("codex:providerManager.backupFailed")
      };
    }
    const updatedProvider = {
      ...existingConfig.providers[providerIndex],
      ...updates.name && { name: updates.name },
      ...updates.baseUrl && { baseUrl: updates.baseUrl },
      ...updates.wireApi && { wireApi: updates.wireApi },
      ...updates.model && { model: updates.model }
    };
    const updatedProviders = [...existingConfig.providers];
    updatedProviders[providerIndex] = updatedProvider;
    const updatedConfig = {
      ...existingConfig,
      providers: updatedProviders
    };
    writeCodexConfig(updatedConfig);
    if (updates.apiKey) {
      const authEntries = {};
      authEntries[updatedProvider.tempEnvKey] = updates.apiKey;
      writeAuthFile(authEntries);
    }
    return {
      success: true,
      backupPath,
      updatedProvider
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : i18n.t("codex:providerManager.unknownError")
    };
  }
}
async function deleteProviders(providerIds) {
  ensureI18nInitialized();
  try {
    const existingConfig = readCodexConfig();
    if (!existingConfig) {
      return {
        success: false,
        error: i18n.t("codex:providerManager.noConfig")
      };
    }
    if (!providerIds || providerIds.length === 0) {
      return {
        success: false,
        error: i18n.t("codex:providerManager.noProvidersSpecified")
      };
    }
    const notFoundProviders = providerIds.filter(
      (id) => !existingConfig.providers.some((p) => p.id === id)
    );
    if (notFoundProviders.length > 0) {
      return {
        success: false,
        error: i18n.t("codex:providerManager.providersNotFound", {
          providers: notFoundProviders.join(", ")
        })
      };
    }
    const remainingProviders = existingConfig.providers.filter(
      (p) => !providerIds.includes(p.id)
    );
    if (remainingProviders.length === 0) {
      return {
        success: false,
        error: i18n.t("codex:providerManager.cannotDeleteAll")
      };
    }
    const backupPath = backupCodexComplete();
    if (!backupPath) {
      return {
        success: false,
        error: i18n.t("codex:providerManager.backupFailed")
      };
    }
    let newDefaultProvider = existingConfig.modelProvider;
    if (providerIds.includes(existingConfig.modelProvider || "")) {
      newDefaultProvider = remainingProviders[0].id;
    }
    const updatedConfig = {
      ...existingConfig,
      modelProvider: newDefaultProvider,
      providers: remainingProviders
    };
    writeCodexConfig(updatedConfig);
    const result = {
      success: true,
      backupPath,
      deletedProviders: providerIds,
      remainingProviders
    };
    if (newDefaultProvider !== existingConfig.modelProvider) {
      result.newDefaultProvider = newDefaultProvider || void 0;
    }
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : i18n.t("codex:providerManager.unknownError")
    };
  }
}

export { addProviderToExisting, deleteProviders, editExistingProvider };
