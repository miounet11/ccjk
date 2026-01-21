import ansis from 'ansis';
import inquirer from 'inquirer';
import { CODEX_AUTH_FILE } from './constants.mjs';
import { ensureI18nInitialized, i18n } from './index.mjs';
import { readJsonConfig } from './json-config.mjs';
import { a as addNumbersToChoices } from '../shared/ccjk.BFQ7yr5S.mjs';
import { p as promptBoolean } from '../shared/ccjk.DHbrGcgg.mjs';
import { d as detectConfigManagementMode } from './codex.mjs';
import { deleteProviders, addProviderToExisting, editExistingProvider } from './codex-provider-manager.mjs';
import 'node:os';
import 'pathe';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'dayjs';
import './fs-operations.mjs';
import 'node:crypto';
import 'node:fs/promises';
import 'inquirer-toggle';
import 'ora';
import 'semver';
import 'smol-toml';
import 'tinyexec';
import './ccjk-config.mjs';
import './config2.mjs';
import './claude-config.mjs';
import './platform.mjs';
import './prompts.mjs';
import './package.mjs';
import 'node:child_process';

async function configureIncrementalManagement() {
  ensureI18nInitialized();
  const managementMode = detectConfigManagementMode();
  if (managementMode.mode !== "management" || !managementMode.hasProviders) {
    console.log(ansis.yellow(i18n.t("codex:noExistingProviders")));
    return;
  }
  console.log(ansis.green(i18n.t("codex:incrementalManagementTitle")));
  console.log(ansis.gray(i18n.t("codex:currentProviderCount", { count: managementMode.providerCount })));
  if (managementMode.currentProvider) {
    console.log(ansis.gray(i18n.t("codex:currentDefaultProvider", { provider: managementMode.currentProvider })));
  }
  const choices = [
    { name: i18n.t("codex:addProvider"), value: "add" },
    { name: i18n.t("codex:editProvider"), value: "edit" },
    { name: i18n.t("codex:copyProvider"), value: "copy" },
    { name: i18n.t("codex:deleteProvider"), value: "delete" },
    { name: i18n.t("common:skip"), value: "skip" }
  ];
  const { action } = await inquirer.prompt([{
    type: "list",
    name: "action",
    message: i18n.t("codex:selectAction"),
    choices: addNumbersToChoices(choices)
  }]);
  if (!action || action === "skip") {
    console.log(ansis.yellow(i18n.t("common:skip")));
    return;
  }
  switch (action) {
    case "add":
      await handleAddProvider();
      break;
    case "edit":
      await handleEditProvider(managementMode.providers);
      break;
    case "copy":
      await handleCopyProvider(managementMode.providers);
      break;
    case "delete":
      await handleDeleteProvider(managementMode.providers);
      break;
  }
}
async function handleAddProvider() {
  const { getApiProviders } = await import('./api-providers.mjs');
  const apiProviders = getApiProviders("codex");
  const providerChoices = [
    { name: i18n.t("api:customProvider"), value: "custom" },
    ...apiProviders.map((p) => ({ name: p.name, value: p.id }))
  ];
  const { selectedProvider } = await inquirer.prompt([{
    type: "list",
    name: "selectedProvider",
    message: i18n.t("api:selectApiProvider"),
    choices: addNumbersToChoices(providerChoices)
  }]);
  let prefilledBaseUrl;
  let prefilledWireApi;
  let prefilledModel;
  if (selectedProvider !== "custom") {
    const provider2 = apiProviders.find((p) => p.id === selectedProvider);
    if (provider2?.codex) {
      prefilledBaseUrl = provider2.codex.baseUrl;
      prefilledWireApi = provider2.codex.wireApi;
      prefilledModel = provider2.codex.defaultModel;
      console.log(ansis.gray(i18n.t("api:providerSelected", { name: provider2.name })));
    }
  }
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "providerName",
      message: i18n.t("codex:providerNamePrompt"),
      default: selectedProvider !== "custom" ? apiProviders.find((p) => p.id === selectedProvider)?.name : void 0,
      validate: (input) => {
        const trimmed = input.trim();
        if (!trimmed)
          return i18n.t("codex:providerNameRequired");
        if (!/^[\w\-\s.]+$/.test(trimmed))
          return i18n.t("codex:providerNameInvalid");
        return true;
      }
    },
    {
      type: "input",
      name: "baseUrl",
      message: i18n.t("codex:providerBaseUrlPrompt"),
      default: prefilledBaseUrl || "https://api.openai.com/v1",
      when: () => selectedProvider === "custom",
      validate: (input) => !!input.trim() || i18n.t("codex:providerBaseUrlRequired")
    },
    {
      type: "list",
      name: "wireApi",
      message: i18n.t("codex:providerProtocolPrompt"),
      choices: [
        { name: i18n.t("codex:protocolResponses"), value: "responses" },
        { name: i18n.t("codex:protocolChat"), value: "chat" }
      ],
      default: prefilledWireApi || "responses",
      when: () => selectedProvider === "custom"
    },
    {
      type: "input",
      name: "apiKey",
      message: selectedProvider !== "custom" ? i18n.t("api:enterProviderApiKey", { provider: apiProviders.find((p) => p.id === selectedProvider)?.name || selectedProvider }) : i18n.t("codex:providerApiKeyPrompt"),
      validate: (input) => !!input.trim() || i18n.t("codex:providerApiKeyRequired")
    }
  ]);
  const providerId = answers.providerName.trim().toLowerCase().replace(/\s+/g, "-").replace(/\./g, "-").replace(/[^a-z0-9\-]/g, "");
  const managementMode = detectConfigManagementMode();
  const existingProvider = managementMode.providers?.find((p) => p.id === providerId);
  if (existingProvider) {
    const shouldOverwrite = await promptBoolean({
      message: i18n.t("codex:providerDuplicatePrompt", {
        name: existingProvider.name,
        source: i18n.t("codex:existingConfig")
      }),
      defaultValue: false
    });
    if (!shouldOverwrite) {
      console.log(ansis.yellow(i18n.t("codex:providerDuplicateSkipped")));
      return;
    }
  }
  const provider = {
    id: providerId,
    name: answers.providerName.trim(),
    baseUrl: selectedProvider === "custom" ? answers.baseUrl.trim() : prefilledBaseUrl,
    wireApi: selectedProvider === "custom" ? answers.wireApi : prefilledWireApi,
    tempEnvKey: `${providerId.toUpperCase().replace(/-/g, "_")}_API_KEY`,
    requiresOpenaiAuth: true,
    model: prefilledModel || "gpt-5-codex"
    // Use provider's default model or fallback
  };
  const result = await addProviderToExisting(provider, answers.apiKey.trim(), true);
  if (result.success) {
    console.log(ansis.green(i18n.t("codex:providerAdded", { name: result.addedProvider?.name })));
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t("common:backupCreated", { path: result.backupPath })));
    }
    const setAsDefault = await promptBoolean({
      message: i18n.t("multi-config:setAsDefaultPrompt"),
      defaultValue: true
    });
    if (setAsDefault) {
      const { switchToProvider } = await import('./codex.mjs').then(function (n) { return n.q; });
      const switched = await switchToProvider(provider.id);
      if (switched) {
        console.log(ansis.green(i18n.t("multi-config:profileSetAsDefault", { name: provider.name })));
      }
    }
  } else {
    console.log(ansis.red(i18n.t("codex:providerAddFailed", { error: result.error })));
  }
}
async function handleEditProvider(providers) {
  const choices = providers.map((provider2) => ({
    name: `${provider2.name} (${provider2.baseUrl})`,
    value: provider2.id
  }));
  const { selectedProviderId } = await inquirer.prompt([{
    type: "list",
    name: "selectedProviderId",
    message: i18n.t("codex:selectProviderToEdit"),
    choices: addNumbersToChoices(choices)
  }]);
  if (!selectedProviderId) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  const provider = providers.find((p) => p.id === selectedProviderId);
  if (!provider) {
    console.log(ansis.red(i18n.t("codex:providerNotFound")));
    return;
  }
  const existingAuth = readJsonConfig(CODEX_AUTH_FILE, { defaultValue: {} }) || {};
  const existingApiKey = existingAuth[provider.tempEnvKey] || "";
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "providerName",
      message: i18n.t("codex:providerNamePrompt"),
      default: provider.name,
      validate: (input) => {
        const trimmed = input.trim();
        if (!trimmed)
          return i18n.t("codex:providerNameRequired");
        if (!/^[\w\-\s]+$/.test(trimmed))
          return i18n.t("codex:providerNameInvalid");
        return true;
      }
    },
    {
      type: "input",
      name: "baseUrl",
      message: i18n.t("codex:providerBaseUrlPrompt"),
      default: provider.baseUrl,
      validate: (input) => !!input.trim() || i18n.t("codex:providerBaseUrlRequired")
    },
    {
      type: "list",
      name: "wireApi",
      message: i18n.t("codex:providerProtocolPrompt"),
      choices: [
        { name: i18n.t("codex:protocolResponses"), value: "responses" },
        { name: i18n.t("codex:protocolChat"), value: "chat" }
      ],
      default: provider.wireApi
    },
    {
      type: "input",
      name: "apiKey",
      message: i18n.t("codex:providerApiKeyPrompt"),
      default: existingApiKey,
      // Show old API key from auth.json
      validate: (input) => !!input.trim() || i18n.t("codex:providerApiKeyRequired")
    }
  ]);
  const { model } = await inquirer.prompt([
    {
      type: "input",
      name: "model",
      message: i18n.t("codex:providerModelPrompt"),
      default: provider.model || "gpt-5-codex",
      validate: (input) => !!input.trim() || i18n.t("codex:providerModelRequired")
    }
  ]);
  const updates = {
    name: answers.providerName.trim(),
    baseUrl: answers.baseUrl.trim(),
    wireApi: answers.wireApi,
    apiKey: answers.apiKey.trim(),
    model: model.trim()
  };
  const result = await editExistingProvider(selectedProviderId, updates);
  if (result.success) {
    console.log(ansis.green(i18n.t("codex:providerUpdated", { name: result.updatedProvider?.name })));
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t("common:backupCreated", { path: result.backupPath })));
    }
  } else {
    console.log(ansis.red(i18n.t("codex:providerUpdateFailed", { error: result.error })));
  }
}
async function handleCopyProvider(providers) {
  const choices = providers.map((provider2) => ({
    name: `${provider2.name} (${provider2.baseUrl})`,
    value: provider2.id
  }));
  const { selectedProviderId } = await inquirer.prompt([{
    type: "list",
    name: "selectedProviderId",
    message: i18n.t("codex:selectProviderToCopy"),
    choices: addNumbersToChoices(choices)
  }]);
  if (!selectedProviderId) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  const provider = providers.find((p) => p.id === selectedProviderId);
  if (!provider) {
    console.log(ansis.red(i18n.t("codex:providerNotFound")));
    return;
  }
  console.log(ansis.green(`
${i18n.t("codex:copyingProvider", { name: provider.name })}`));
  const existingAuth = readJsonConfig(CODEX_AUTH_FILE, { defaultValue: {} }) || {};
  const existingApiKey = existingAuth[provider.tempEnvKey] || "";
  const copiedName = `${provider.name}-copy`;
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "providerName",
      message: i18n.t("codex:providerNamePrompt"),
      default: copiedName,
      validate: (input) => {
        const trimmed = input.trim();
        if (!trimmed)
          return i18n.t("codex:providerNameRequired");
        if (!/^[\w\-\s.]+$/.test(trimmed))
          return i18n.t("codex:providerNameInvalid");
        return true;
      }
    },
    {
      type: "input",
      name: "baseUrl",
      message: i18n.t("codex:providerBaseUrlPrompt"),
      default: provider.baseUrl,
      validate: (input) => !!input.trim() || i18n.t("codex:providerBaseUrlRequired")
    },
    {
      type: "list",
      name: "wireApi",
      message: i18n.t("codex:providerProtocolPrompt"),
      choices: [
        { name: i18n.t("codex:protocolResponses"), value: "responses" },
        { name: i18n.t("codex:protocolChat"), value: "chat" }
      ],
      default: provider.wireApi
    },
    {
      type: "input",
      name: "apiKey",
      message: i18n.t("codex:providerApiKeyPrompt"),
      default: existingApiKey,
      // Show old API key from auth.json
      validate: (input) => !!input.trim() || i18n.t("codex:providerApiKeyRequired")
    }
  ]);
  const { model } = await inquirer.prompt([
    {
      type: "input",
      name: "model",
      message: i18n.t("codex:providerModelPrompt"),
      default: provider.model || "gpt-5-codex",
      validate: (input) => !!input.trim() || i18n.t("codex:providerModelRequired")
    }
  ]);
  const providerId = answers.providerName.trim().toLowerCase().replace(/\s+/g, "-").replace(/\./g, "-").replace(/[^a-z0-9\-]/g, "");
  const copiedProvider = {
    id: providerId,
    name: answers.providerName.trim(),
    baseUrl: answers.baseUrl.trim(),
    wireApi: answers.wireApi,
    tempEnvKey: `${providerId.toUpperCase().replace(/-/g, "_")}_API_KEY`,
    requiresOpenaiAuth: provider.requiresOpenaiAuth ?? true,
    model: model.trim()
  };
  const result = await addProviderToExisting(copiedProvider, answers.apiKey.trim(), false);
  if (result.success) {
    console.log(ansis.green(i18n.t("codex:providerCopied", { name: result.addedProvider?.name })));
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t("common:backupCreated", { path: result.backupPath })));
    }
    const setAsDefault = await promptBoolean({
      message: i18n.t("multi-config:setAsDefaultPrompt"),
      defaultValue: false
    });
    if (setAsDefault) {
      const { switchToProvider } = await import('./codex.mjs').then(function (n) { return n.q; });
      const switched = await switchToProvider(copiedProvider.id);
      if (switched) {
        console.log(ansis.green(i18n.t("multi-config:profileSetAsDefault", { name: copiedProvider.name })));
      }
    }
  } else {
    console.log(ansis.red(i18n.t("codex:providerCopyFailed", { error: result.error })));
  }
}
async function handleDeleteProvider(providers) {
  const choices = providers.map((provider) => ({
    name: `${provider.name} (${provider.baseUrl})`,
    value: provider.id
  }));
  const { selectedProviderIds } = await inquirer.prompt({
    type: "checkbox",
    name: "selectedProviderIds",
    message: i18n.t("codex:selectProvidersToDelete"),
    choices,
    validate: (input) => {
      const selected = input;
      if (!selected || selected.length === 0) {
        return i18n.t("codex:selectAtLeastOne");
      }
      if (selected.length === providers.length) {
        return i18n.t("codex:cannotDeleteAll");
      }
      return true;
    }
  });
  if (!selectedProviderIds || selectedProviderIds.length === 0) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  const selectedNames = selectedProviderIds.map(
    (id) => providers.find((p) => p.id === id)?.name || id
  ).join(", ");
  const confirmDelete = await promptBoolean({
    message: i18n.t("codex:confirmDeleteProviders", { providers: selectedNames }),
    defaultValue: false
  });
  if (!confirmDelete) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  const result = await deleteProviders(selectedProviderIds);
  if (result.success) {
    console.log(ansis.green(i18n.t("codex:providersDeleted", { count: selectedProviderIds.length })));
    if (result.newDefaultProvider) {
      console.log(ansis.green(i18n.t("codex:newDefaultProvider", { provider: result.newDefaultProvider })));
    }
    if (result.backupPath) {
      console.log(ansis.gray(i18n.t("common:backupCreated", { path: result.backupPath })));
    }
  } else {
    console.log(ansis.red(i18n.t("codex:providersDeleteFailed", { error: result.error })));
  }
}
const codexConfigSwitch = { configureIncrementalManagement };

export { configureIncrementalManagement, codexConfigSwitch as default };
