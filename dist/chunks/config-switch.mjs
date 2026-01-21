import process__default from 'node:process';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { resolveCodeToolType, isCodeToolType, DEFAULT_CODE_TOOL_TYPE } from './constants.mjs';
import { ensureI18nInitialized, i18n } from './index.mjs';
import { readZcfConfig } from './ccjk-config.mjs';
import { ClaudeCodeConfigManager } from './claude-code-config-manager.mjs';
import { s as switchCodexProvider, l as listCodexProviders, a as readCodexConfig, b as switchToOfficialLogin, c as switchToProvider } from './codex.mjs';
import { a as handleGeneralError } from '../shared/ccjk.DvIrK0wz.mjs';
import { a as addNumbersToChoices } from '../shared/ccjk.BFQ7yr5S.mjs';
import 'node:os';
import 'pathe';
import 'node:fs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'smol-toml';
import './fs-operations.mjs';
import 'node:crypto';
import 'node:fs/promises';
import './json-config.mjs';
import 'dayjs';
import './config2.mjs';
import './claude-config.mjs';
import './platform.mjs';
import 'tinyexec';
import 'ora';
import 'semver';
import './prompts.mjs';
import './package.mjs';
import '../shared/ccjk.DHbrGcgg.mjs';
import 'inquirer-toggle';
import 'node:child_process';

async function configSwitchCommand(options) {
  try {
    ensureI18nInitialized();
    if (options.list) {
      await handleList(options.codeType);
      return;
    }
    if (options.target) {
      const resolvedCodeType = resolveCodeType(options.codeType);
      await handleDirectSwitch(resolvedCodeType, options.target);
      return;
    }
    await handleInteractiveSwitch(options.codeType);
  } catch (error) {
    if (process__default.env.NODE_ENV === "test" || process__default.env.VITEST) {
      throw error;
    }
    handleGeneralError(error);
  }
}
function resolveCodeType(codeType) {
  if (codeType !== void 0) {
    const resolved = resolveCodeToolType(codeType);
    return resolved;
  }
  const zcfConfig = readZcfConfig();
  if (zcfConfig?.codeToolType && isCodeToolType(zcfConfig.codeToolType)) {
    return zcfConfig.codeToolType;
  }
  return DEFAULT_CODE_TOOL_TYPE;
}
async function handleList(codeType) {
  const targetCodeType = resolveCodeType(codeType);
  if (targetCodeType === "claude-code") {
    await listClaudeCodeProfiles();
  } else if (targetCodeType === "codex") {
    await listCodexProvidersWithDisplay();
  }
}
async function listCodexProvidersWithDisplay() {
  const providers = await listCodexProviders();
  const existingConfig = readCodexConfig();
  const currentProvider = existingConfig?.modelProvider;
  const isCommented = existingConfig?.modelProviderCommented;
  if (!providers || providers.length === 0) {
    console.log(ansis.yellow(i18n.t("codex:noProvidersAvailable")));
    return;
  }
  console.log(ansis.bold(i18n.t("codex:listProvidersTitle")));
  console.log();
  if (currentProvider && !isCommented) {
    console.log(ansis.green(i18n.t("codex:currentProvider", { provider: currentProvider })));
    console.log();
  }
  providers.forEach((provider) => {
    const isCurrent = currentProvider === provider.id && !isCommented;
    const status = isCurrent ? ansis.green("\u25CF ") : "  ";
    const current = isCurrent ? ansis.yellow(` (${i18n.t("common:current")})`) : "";
    console.log(`${status}${ansis.white(provider.name)}${current}`);
    console.log(`    ${ansis.green(`ID: ${provider.id}`)} ${ansis.gray(`(${provider.baseUrl})`)}`);
    if (provider.tempEnvKey) {
      console.log(`    ${ansis.gray(`Env: ${provider.tempEnvKey}`)}`);
    }
    console.log();
  });
}
async function listClaudeCodeProfiles() {
  const config = ClaudeCodeConfigManager.readConfig();
  if (!config || !config.profiles || Object.keys(config.profiles).length === 0) {
    console.log(ansis.yellow(i18n.t("multi-config:noClaudeCodeProfilesAvailable")));
    return;
  }
  console.log(ansis.bold(i18n.t("multi-config:availableClaudeCodeProfiles")));
  console.log();
  const currentProfileId = config.currentProfileId;
  Object.values(config.profiles).forEach((profile) => {
    const isCurrent = profile.id === currentProfileId;
    const status = isCurrent ? ansis.green("\u25CF ") : "  ";
    const current = isCurrent ? ansis.yellow(i18n.t("common:current")) : "";
    console.log(`${status}${ansis.white(profile.name)}${current}`);
    console.log(`    ${ansis.green(`ID: ${profile.id}`)} ${ansis.gray(`(${profile.authType})`)}`);
    console.log();
  });
}
async function handleDirectSwitch(codeType, target) {
  const resolvedCodeType = resolveCodeType(codeType);
  if (resolvedCodeType === "claude-code") {
    await handleClaudeCodeDirectSwitch(target);
  } else if (resolvedCodeType === "codex") {
    await switchCodexProvider(target);
  }
}
async function handleClaudeCodeDirectSwitch(target) {
  if (target === "official") {
    const result = await ClaudeCodeConfigManager.switchToOfficial();
    if (result.success) {
      try {
        await ClaudeCodeConfigManager.applyProfileSettings(null);
        console.log(ansis.green(i18n.t("multi-config:successfullySwitchedToOfficial")));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.log(ansis.red(reason));
      }
    } else {
      console.log(ansis.red(i18n.t("multi-config:failedToSwitchToOfficial", { error: result.error })));
    }
  } else if (target === "ccr") {
    const result = await ClaudeCodeConfigManager.switchToCcr();
    if (result.success) {
      try {
        const profile = ClaudeCodeConfigManager.getProfileById("ccr-proxy");
        await ClaudeCodeConfigManager.applyProfileSettings(profile);
        console.log(ansis.green(i18n.t("multi-config:successfullySwitchedToCcr")));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.log(ansis.red(reason));
      }
    } else {
      console.log(ansis.red(i18n.t("multi-config:failedToSwitchToCcr", { error: result.error })));
    }
  } else {
    const config = ClaudeCodeConfigManager.readConfig();
    if (!config || !config.profiles || Object.keys(config.profiles).length === 0) {
      console.log(ansis.yellow(i18n.t("multi-config:noClaudeCodeProfilesAvailable")));
      return;
    }
    const normalizedTarget = target.trim();
    let resolvedId = normalizedTarget;
    let resolvedProfile = config.profiles[normalizedTarget];
    if (!resolvedProfile) {
      const match = Object.entries(config.profiles).find(([, profile]) => profile.name === normalizedTarget);
      if (match) {
        resolvedId = match[0];
        resolvedProfile = match[1];
      }
    }
    if (!resolvedProfile) {
      console.log(ansis.red(i18n.t("multi-config:profileNameNotFound", { name: target })));
      return;
    }
    const result = await ClaudeCodeConfigManager.switchProfile(resolvedId);
    if (result.success) {
      try {
        await ClaudeCodeConfigManager.applyProfileSettings({ ...resolvedProfile, id: resolvedId });
        console.log(ansis.green(i18n.t("multi-config:successfullySwitchedToProfile", { name: resolvedProfile.name })));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.log(ansis.red(reason));
      }
    } else {
      console.log(ansis.red(i18n.t("multi-config:failedToSwitchToProfile", { error: result.error })));
    }
  }
}
async function handleInteractiveSwitch(codeType) {
  const resolvedCodeType = resolveCodeType(codeType);
  if (resolvedCodeType === "claude-code") {
    await handleClaudeCodeInteractiveSwitch();
  } else if (resolvedCodeType === "codex") {
    await handleCodexInteractiveSwitch();
  }
}
async function handleClaudeCodeInteractiveSwitch() {
  const config = ClaudeCodeConfigManager.readConfig();
  if (!config || !config.profiles || Object.keys(config.profiles).length === 0) {
    console.log(ansis.yellow(i18n.t("multi-config:noClaudeCodeProfilesAvailable")));
    return;
  }
  const currentProfileId = config.currentProfileId;
  const createClaudeCodeChoices = (profiles, currentProfileId2) => {
    const choices2 = [];
    const isOfficialMode = !currentProfileId2 || currentProfileId2 === "official";
    choices2.push({
      name: isOfficialMode ? `${ansis.green("\u25CF ")}${i18n.t("codex:useOfficialLogin")} ${ansis.yellow(`(${i18n.t("common:current")})`)}` : `  ${i18n.t("codex:useOfficialLogin")}`,
      value: "official"
    });
    const isCcrMode = currentProfileId2 === "ccr-proxy";
    choices2.push({
      name: isCcrMode ? `${ansis.green("\u25CF ")}${i18n.t("multi-config:ccrProxyOption")} ${ansis.yellow(`(${i18n.t("common:current")})`)}` : `  ${i18n.t("multi-config:ccrProxyOption")}`,
      value: "ccr"
    });
    Object.values(profiles).filter((profile) => profile.id !== "ccr-proxy").forEach((profile) => {
      const isCurrent = profile.id === currentProfileId2;
      choices2.push({
        name: isCurrent ? `${ansis.green("\u25CF ")}${profile.name} ${ansis.yellow("(current)")}` : `  ${profile.name}`,
        value: profile.id
      });
    });
    return choices2;
  };
  const choices = createClaudeCodeChoices(config.profiles, currentProfileId);
  try {
    const { selectedConfig } = await inquirer.prompt([{
      type: "list",
      name: "selectedConfig",
      message: i18n.t("multi-config:selectClaudeCodeConfiguration"),
      choices: addNumbersToChoices(choices)
    }]);
    if (!selectedConfig) {
      console.log(ansis.yellow(i18n.t("multi-config:cancelled")));
      return;
    }
    await handleClaudeCodeDirectSwitch(selectedConfig);
  } catch (error) {
    if (error.name === "ExitPromptError") {
      console.log(ansis.green(`
${i18n.t("common:goodbye")}`));
      return;
    }
    throw error;
  }
}
async function handleCodexInteractiveSwitch() {
  const providers = await listCodexProviders();
  if (!providers || providers.length === 0) {
    console.log(ansis.yellow(i18n.t("codex:noProvidersAvailable")));
    return;
  }
  const existingConfig = readCodexConfig();
  const currentProvider = existingConfig?.modelProvider;
  const isCommented = existingConfig?.modelProviderCommented;
  const createApiConfigChoices = (providers2, currentProvider2, isCommented2) => {
    const choices2 = [];
    const isOfficialMode = !currentProvider2 || isCommented2;
    choices2.push({
      name: isOfficialMode ? `${ansis.green("\u25CF ")}${i18n.t("codex:useOfficialLogin")} ${ansis.yellow("(\u5F53\u524D)")}` : `  ${i18n.t("codex:useOfficialLogin")}`,
      value: "official"
    });
    providers2.forEach((provider) => {
      const isCurrent = currentProvider2 === provider.id && !isCommented2;
      choices2.push({
        name: isCurrent ? `${ansis.green("\u25CF ")}${provider.name} - ${ansis.gray(provider.id)} ${ansis.yellow("(\u5F53\u524D)")}` : `  ${provider.name} - ${ansis.gray(provider.id)}`,
        value: provider.id
      });
    });
    return choices2;
  };
  const choices = createApiConfigChoices(providers, currentProvider, isCommented);
  try {
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
    if (!success) {
      console.log(ansis.red(i18n.t("common:operationFailed")));
    }
  } catch (error) {
    if (error.name === "ExitPromptError") {
      console.log(ansis.green(`
${i18n.t("common:goodbye")}`));
      return;
    }
    throw error;
  }
}

export { configSwitchCommand };
