import { existsSync } from 'node:fs';
import ansis from 'ansis';
import { version } from './package.mjs';
import { SETTINGS_FILE, DEFAULT_CODE_TOOL_TYPE, resolveCodeToolType as resolveCodeToolType$1, isCodeToolType } from './constants.mjs';
import { i18n } from './index.mjs';
import { a as displayBanner } from '../shared/ccjk.BpHTUkb8.mjs';
import { readZcfConfig, updateZcfConfig } from './ccjk-config.mjs';
import { r as runCodexUpdate } from './codex.mjs';
import { n as needsMigration, m as migrateSettingsForTokenRetrieval, d as displayMigrationResult, p as promptMigration, u as updatePromptOnly, s as selectAndInstallWorkflows } from '../shared/ccjk.BF-4_Yho.mjs';
import { h as handleExitPromptError, a as handleGeneralError } from '../shared/ccjk.DvIrK0wz.mjs';
import { resolveAiOutputLanguage } from './prompts.mjs';
import { checkClaudeCodeVersionAndPrompt } from './version-checker.mjs';
import 'node:os';
import 'pathe';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'smol-toml';
import './fs-operations.mjs';
import 'node:crypto';
import 'node:fs/promises';
import './json-config.mjs';
import 'dayjs';
import 'inquirer';
import 'ora';
import 'semver';
import 'tinyexec';
import './config2.mjs';
import './claude-config.mjs';
import './platform.mjs';
import '../shared/ccjk.BFQ7yr5S.mjs';
import '../shared/ccjk.DHbrGcgg.mjs';
import 'inquirer-toggle';
import 'node:child_process';
import './workflows.mjs';
import 'node:path';
import 'node:util';

function resolveCodeToolType(optionValue, savedValue) {
  if (optionValue !== void 0) {
    const resolved = resolveCodeToolType$1(optionValue);
    if (resolved !== DEFAULT_CODE_TOOL_TYPE || optionValue === DEFAULT_CODE_TOOL_TYPE) {
      return resolved;
    }
  }
  if (savedValue && isCodeToolType(savedValue)) {
    return savedValue;
  }
  return DEFAULT_CODE_TOOL_TYPE;
}
async function update(options = {}) {
  try {
    if (!options.skipBanner) {
      displayBanner(i18n.t("cli:banner.updateSubtitle"));
    }
    const zcfConfig = readZcfConfig();
    const codeToolType = resolveCodeToolType(options.codeType, zcfConfig?.codeToolType);
    options.codeType = codeToolType;
    if (codeToolType === "codex") {
      await runCodexUpdate();
      const newPreferredLang = options.configLang || zcfConfig?.preferredLang;
      if (newPreferredLang) {
        updateZcfConfig({
          version,
          preferredLang: newPreferredLang,
          codeToolType
        });
      } else {
        updateZcfConfig({
          version,
          codeToolType
        });
      }
      return;
    }
    const { resolveTemplateLanguage } = await import('./prompts.mjs');
    const configLang = await resolveTemplateLanguage(
      options.configLang,
      // Command line option
      zcfConfig,
      options.skipPrompt
      // Non-interactive mode flag
    );
    const aiOutputLang = await resolveAiOutputLanguage(i18n.language, options.aiOutputLang, zcfConfig, options.skipPrompt);
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
    console.log(ansis.green(`
${i18n.t("configuration:updatingPrompts")}
`));
    await updatePromptOnly(aiOutputLang);
    await selectAndInstallWorkflows(configLang);
    await checkClaudeCodeVersionAndPrompt(false);
    updateZcfConfig({
      version,
      templateLang: configLang,
      // 保存模板语言选择
      aiOutputLang,
      codeToolType
    });
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}

export { update };
