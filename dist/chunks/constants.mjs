import { homedir } from 'node:os';
import { join } from 'pathe';
import { i18n } from './index.mjs';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';

const CLAUDE_DIR = join(homedir(), ".claude");
const SETTINGS_FILE = join(CLAUDE_DIR, "settings.json");
join(CLAUDE_DIR, "CLAUDE.md");
const ClAUDE_CONFIG_FILE = join(homedir(), ".claude.json");
const CLAUDE_VSC_CONFIG_FILE = join(CLAUDE_DIR, "config.json");
const CODEX_DIR = join(homedir(), ".codex");
const CODEX_CONFIG_FILE = join(CODEX_DIR, "config.toml");
const CODEX_AUTH_FILE = join(CODEX_DIR, "auth.json");
const CODEX_AGENTS_FILE = join(CODEX_DIR, "AGENTS.md");
const CODEX_PROMPTS_DIR = join(CODEX_DIR, "prompts");
const AIDER_DIR = join(homedir(), ".aider");
join(AIDER_DIR, ".aider.conf.yml");
join(AIDER_DIR, ".env");
const CONTINUE_DIR = join(homedir(), ".continue");
join(CONTINUE_DIR, "config.json");
const CLINE_DIR = join(homedir(), ".cline");
join(CLINE_DIR, "config.json");
const CURSOR_DIR = join(homedir(), ".cursor");
join(CURSOR_DIR, "config.json");
const CCJK_CONFIG_DIR = join(homedir(), ".ccjk");
const CCJK_CONFIG_FILE = join(CCJK_CONFIG_DIR, "config.toml");
join(CCJK_CONFIG_DIR, "state.json");
join(CCJK_CONFIG_DIR, "plugins");
const CCJK_SKILLS_DIR = join(CCJK_CONFIG_DIR, "skills");
join(CCJK_CONFIG_DIR, "groups");
const CCJK_CLOUD_PLUGINS_DIR = join(CCJK_CONFIG_DIR, "cloud-plugins");
const CCJK_CLOUD_PLUGINS_CACHE_DIR = join(CCJK_CLOUD_PLUGINS_DIR, "cache");
join(CCJK_CLOUD_PLUGINS_CACHE_DIR, "plugins.json");
const CCJK_CLOUD_PLUGINS_INSTALLED_DIR = join(CCJK_CLOUD_PLUGINS_DIR, "installed");
const CCJK_CLOUD_API_URL = "https://api.api.claudehome.cn/v1";
const LEGACY_ZCF_CONFIG_DIR = join(homedir(), ".ufomiao", "zcf");
const LEGACY_ZCF_CONFIG_FILE = join(LEGACY_ZCF_CONFIG_DIR, "config.toml");
const LEGACY_ZCF_CONFIG_FILES = [
  join(CLAUDE_DIR, ".zcf-config.json"),
  join(homedir(), ".zcf.json"),
  LEGACY_ZCF_CONFIG_FILE
];
const ZCF_CONFIG_DIR = CCJK_CONFIG_DIR;
const ZCF_CONFIG_FILE = CCJK_CONFIG_FILE;
const CODE_TOOL_TYPES = ["claude-code", "codex", "aider", "continue", "cline", "cursor"];
const DEFAULT_CODE_TOOL_TYPE = "claude-code";
const CODE_TOOL_BANNERS = {
  "claude-code": "for Claude Code",
  "codex": "for Codex",
  "aider": "for Aider",
  "continue": "for Continue",
  "cline": "for Cline",
  "cursor": "for Cursor CLI"
};
const CODE_TOOL_ALIASES = {
  cc: "claude-code",
  cx: "codex",
  ad: "aider",
  ct: "continue",
  cl: "cline",
  cu: "cursor"
};
function isCodeToolType(value) {
  return CODE_TOOL_TYPES.includes(value);
}
const API_DEFAULT_URL = "https://api.anthropic.com";
function resolveCodeToolType(value) {
  if (isCodeToolType(value)) {
    return value;
  }
  if (typeof value === "string" && value in CODE_TOOL_ALIASES) {
    return CODE_TOOL_ALIASES[value];
  }
  return DEFAULT_CODE_TOOL_TYPE;
}
const SUPPORTED_LANGS = ["zh-CN", "en"];
const LANG_LABELS = {
  "zh-CN": "\u7B80\u4F53\u4E2D\u6587",
  "en": "English"
};
const AI_OUTPUT_LANGUAGES = {
  "zh-CN": { directive: "Always respond in Chinese-simplified" },
  "en": { directive: "Always respond in English" },
  "custom": { directive: "" }
};
function getAiOutputLanguageLabel(lang) {
  if (lang in LANG_LABELS) {
    return LANG_LABELS[lang];
  }
  if (lang === "custom" && i18n?.isInitialized) {
    try {
      return i18n.t("language:labels.custom");
    } catch {
    }
  }
  return lang;
}

export { AIDER_DIR, AI_OUTPUT_LANGUAGES, API_DEFAULT_URL, CCJK_CLOUD_API_URL, CCJK_CLOUD_PLUGINS_CACHE_DIR, CCJK_CLOUD_PLUGINS_DIR, CCJK_CLOUD_PLUGINS_INSTALLED_DIR, CCJK_CONFIG_DIR, CCJK_CONFIG_FILE, CCJK_SKILLS_DIR, CLAUDE_DIR, CLAUDE_VSC_CONFIG_FILE, CLINE_DIR, CODEX_AGENTS_FILE, CODEX_AUTH_FILE, CODEX_CONFIG_FILE, CODEX_DIR, CODEX_PROMPTS_DIR, CODE_TOOL_ALIASES, CODE_TOOL_BANNERS, CODE_TOOL_TYPES, CONTINUE_DIR, CURSOR_DIR, ClAUDE_CONFIG_FILE, DEFAULT_CODE_TOOL_TYPE, LANG_LABELS, LEGACY_ZCF_CONFIG_DIR, LEGACY_ZCF_CONFIG_FILE, LEGACY_ZCF_CONFIG_FILES, SETTINGS_FILE, SUPPORTED_LANGS, ZCF_CONFIG_DIR, ZCF_CONFIG_FILE, getAiOutputLanguageLabel, isCodeToolType, resolveCodeToolType };
