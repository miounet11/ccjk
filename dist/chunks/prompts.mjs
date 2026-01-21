import process__default from 'node:process';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { version } from './package.mjs';
import { LANG_LABELS, getAiOutputLanguageLabel, SUPPORTED_LANGS, AI_OUTPUT_LANGUAGES } from './constants.mjs';
import { ensureI18nInitialized, i18n } from './index.mjs';
import { readZcfConfig, updateZcfConfig } from './ccjk-config.mjs';
import { a as addNumbersToChoices } from '../shared/ccjk.BFQ7yr5S.mjs';
import { p as promptBoolean } from '../shared/ccjk.DHbrGcgg.mjs';
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
import 'inquirer-toggle';

async function selectAiOutputLanguage(defaultLang) {
  ensureI18nInitialized();
  console.log(ansis.dim(`
  ${i18n.t("language:aiOutputLangHint")}
`));
  const aiLangChoices = Object.entries(AI_OUTPUT_LANGUAGES).map(([key]) => ({
    title: getAiOutputLanguageLabel(key),
    value: key
  }));
  const defaultChoice = defaultLang || "en";
  const { lang } = await inquirer.prompt({
    type: "list",
    name: "lang",
    message: i18n.t("language:selectAiOutputLang"),
    choices: addNumbersToChoices(aiLangChoices.map((choice) => ({
      name: choice.title,
      value: choice.value
    }))),
    default: defaultChoice
  });
  if (!lang) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    process__default.exit(0);
  }
  const aiOutputLang = lang;
  if (aiOutputLang === "custom") {
    const { customLang } = await inquirer.prompt({
      type: "input",
      name: "customLang",
      message: i18n.t("language:enterCustomLanguage"),
      validate: async (value) => !!value || i18n.t("language:languageRequired") || "Language is required"
    });
    if (!customLang) {
      console.log(ansis.yellow(i18n.t("common:cancelled")));
      process__default.exit(0);
    }
    return customLang;
  }
  return aiOutputLang;
}
const LANGUAGE_SELECTION_MESSAGES = {
  selectLanguage: "Select CCJK display language / \u9009\u62E9CCJK\u663E\u793A\u8BED\u8A00",
  operationCancelled: "Operation cancelled / \u64CD\u4F5C\u5DF2\u53D6\u6D88"
};
async function selectScriptLanguage(currentLang) {
  const zcfConfig = readZcfConfig();
  if (zcfConfig?.preferredLang) {
    return zcfConfig.preferredLang;
  }
  if (currentLang) {
    return currentLang;
  }
  const { lang } = await inquirer.prompt({
    type: "list",
    name: "lang",
    message: LANGUAGE_SELECTION_MESSAGES.selectLanguage,
    choices: addNumbersToChoices(SUPPORTED_LANGS.map((l) => ({
      name: LANG_LABELS[l],
      value: l
    })))
  });
  if (!lang) {
    console.log(ansis.yellow(LANGUAGE_SELECTION_MESSAGES.operationCancelled));
    process__default.exit(0);
  }
  const scriptLang = lang;
  updateZcfConfig({
    version,
    preferredLang: scriptLang
  });
  return scriptLang;
}
async function resolveAiOutputLanguage(scriptLang, commandLineOption, savedConfig, skipPrompt) {
  ensureI18nInitialized();
  if (commandLineOption) {
    return commandLineOption;
  }
  if (savedConfig?.aiOutputLang) {
    if (skipPrompt) {
      return savedConfig.aiOutputLang;
    }
    const currentLanguageLabel = getAiOutputLanguageLabel(savedConfig.aiOutputLang) || savedConfig.aiOutputLang;
    console.log(ansis.green(`${i18n.t("language:currentConfigFound")}: ${currentLanguageLabel}`));
    const shouldModify = await promptBoolean({
      message: i18n.t("language:modifyConfigPrompt"),
      defaultValue: false
    });
    if (!shouldModify) {
      console.log(ansis.gray(`\u2714 ${i18n.t("language:aiOutputLangHint")}: ${currentLanguageLabel}`));
      return savedConfig.aiOutputLang;
    }
    return await selectAiOutputLanguage(scriptLang);
  }
  if (skipPrompt) {
    return scriptLang;
  }
  return await selectAiOutputLanguage(scriptLang);
}
async function selectTemplateLanguage() {
  ensureI18nInitialized();
  const LANG_HINT_KEYS = {
    "zh-CN": i18n.t("language:configLangHint.zh-CN"),
    "en": i18n.t("language:configLangHint.en")
  };
  const { lang } = await inquirer.prompt({
    type: "list",
    name: "lang",
    message: i18n.t("language:selectConfigLang"),
    choices: addNumbersToChoices(
      SUPPORTED_LANGS.map((l) => ({
        name: `${LANG_LABELS[l]} - ${LANG_HINT_KEYS[l]}`,
        value: l
      }))
    )
  });
  if (!lang) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    process__default.exit(0);
  }
  return lang;
}
async function resolveTemplateLanguage(commandLineOption, savedConfig, skipPrompt) {
  ensureI18nInitialized();
  if (commandLineOption) {
    return commandLineOption;
  }
  if (savedConfig?.templateLang) {
    if (skipPrompt) {
      return savedConfig.templateLang;
    }
    const currentLanguageLabel = LANG_LABELS[savedConfig.templateLang];
    console.log(ansis.green(`${i18n.t("language:currentTemplateLanguageFound")}: ${currentLanguageLabel}`));
    const shouldModify = await promptBoolean({
      message: i18n.t("language:modifyTemplateLanguagePrompt"),
      defaultValue: false
    });
    if (!shouldModify) {
      console.log(ansis.gray(`\u2714 ${i18n.t("language:selectConfigLang")}: ${currentLanguageLabel}`));
      return savedConfig.templateLang;
    }
    return await selectTemplateLanguage();
  }
  if (savedConfig?.preferredLang && !savedConfig?.templateLang) {
    if (skipPrompt) {
      return savedConfig.preferredLang;
    }
    console.log(ansis.yellow(`${i18n.t("language:usingFallbackTemplate")}: ${LANG_LABELS[savedConfig.preferredLang]}`));
    const shouldModify = await promptBoolean({
      message: i18n.t("language:modifyTemplateLanguagePrompt"),
      defaultValue: false
    });
    if (!shouldModify) {
      return savedConfig.preferredLang;
    }
    return await selectTemplateLanguage();
  }
  if (skipPrompt) {
    return "en";
  }
  return await selectTemplateLanguage();
}
async function resolveSystemPromptStyle(availablePrompts, commandLineOption, savedConfig, skipPrompt) {
  ensureI18nInitialized();
  if (commandLineOption && availablePrompts.some((p) => p.id === commandLineOption)) {
    return commandLineOption;
  }
  if (savedConfig?.codex?.systemPromptStyle) {
    const currentStyleId = savedConfig.codex.systemPromptStyle;
    const currentStyle = availablePrompts.find((p) => p.id === currentStyleId);
    if (currentStyle) {
      if (skipPrompt) {
        return currentStyleId;
      }
      console.log(ansis.green(`${i18n.t("language:currentSystemPromptFound")}: ${currentStyle.name}`));
      const shouldModify = await promptBoolean({
        message: i18n.t("language:modifySystemPromptPrompt"),
        defaultValue: false
      });
      if (!shouldModify) {
        console.log(ansis.gray(`\u2714 ${i18n.t("language:currentSystemPromptFound")}: ${currentStyle.name}`));
        return currentStyleId;
      }
    }
  }
  if (skipPrompt) {
    return "senior-architect";
  }
  const { systemPrompt } = await inquirer.prompt([{
    type: "list",
    name: "systemPrompt",
    message: i18n.t("codex:systemPromptPrompt"),
    choices: addNumbersToChoices(availablePrompts.map((style) => ({
      name: `${style.name} - ${ansis.gray(style.description)}`,
      value: style.id
    }))),
    default: "senior-architect"
    // Default to senior-architect
  }]);
  if (!systemPrompt) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    process__default.exit(0);
  }
  return systemPrompt;
}

export { resolveAiOutputLanguage, resolveSystemPromptStyle, resolveTemplateLanguage, selectAiOutputLanguage, selectScriptLanguage, selectTemplateLanguage };
