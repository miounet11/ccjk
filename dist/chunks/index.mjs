import { existsSync } from 'node:fs';
import process__default from 'node:process';
import { fileURLToPath } from 'node:url';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { dirname, join } from 'pathe';

const i18n = i18next.createInstance();
const NAMESPACES = [
  "common",
  "api",
  "ccr",
  "ccjk",
  // CCJK-specific translations
  "cli",
  "cloudPlugins",
  // Cloud-based plugin system
  "cometix",
  "codex",
  "configuration",
  "context",
  // Context compression system
  "errors",
  "installation",
  "interview",
  // Interview-Driven Development
  "language",
  "lsp",
  // Language Server Protocol (v3.8+)
  "marketplace",
  // Marketplace system for plugins, skills, and workflows
  "mcp",
  "menu",
  "multi-config",
  "notification",
  // Task completion notifications
  "permissions",
  // Permission system for API providers, models, and tools
  "plugins",
  // Cloud plugins management
  "registry",
  // Version checking, China detection, and multiple installations
  "sandbox",
  // Sandbox mode for secure request/response handling
  "shencha",
  "skills",
  // Skills management system
  "skillsSync",
  // Skills cloud synchronization
  "smartGuide",
  // Smart Guide for quick actions
  "stats",
  // Usage statistics
  "superpowers",
  // Superpowers plugin integration
  "team",
  "thinking",
  // Thinking mode for Claude Code CLI 2.0.67+
  "tools",
  "uninstall",
  "updater",
  "vim",
  // Vim mode enhancement for Claude Code CLI 2.1.0+
  "workflow",
  "cloud-sync",
  "workspace"
  // Workspace diagnostics and guide
];
function ensureI18nInitialized() {
  if (!i18n.isInitialized) {
    throw new Error(
      "i18n is not initialized. Please call initI18n() in CLI command before using utility functions."
    );
  }
}
async function initI18n(language = "zh-CN") {
  if (i18n.isInitialized) {
    if (i18n.language !== language) {
      await i18n.changeLanguage(language);
    }
    return;
  }
  await i18n.use(Backend).init({
    lng: language,
    fallbackLng: "en",
    // Load all translations as a single flat structure
    ns: NAMESPACES,
    defaultNS: "common",
    preload: [language],
    // Preload the selected language
    // Backend configuration for loading JSON files
    backend: {
      loadPath: (() => {
        const currentDir = dirname(fileURLToPath(import.meta.url));
        const packageRoot = (() => {
          let dir = currentDir;
          while (dir !== dirname(dir)) {
            if (existsSync(join(dir, "package.json"))) {
              return dir;
            }
            dir = dirname(dir);
          }
          return currentDir;
        })();
        const possibleBasePaths = [
          join(currentDir, "locales"),
          // Development: src/i18n/locales
          join(packageRoot, "dist/i18n/locales"),
          // NPM package: /node_modules/ccjk/dist/i18n/locales
          join(process__default.cwd(), "dist/i18n/locales"),
          // Production build: ./dist/i18n/locales
          join(currentDir, "../../../dist/i18n/locales"),
          // Fallback for deep chunk paths
          join(currentDir, "../../i18n/locales")
          // Alternative chunk structure
        ];
        for (const basePath of possibleBasePaths) {
          const testFile = join(basePath, "zh-CN/common.json");
          if (existsSync(testFile)) {
            return join(basePath, "{{lng}}/{{ns}}.json");
          }
        }
        return join(process__default.cwd(), "dist/i18n/locales/{{lng}}/{{ns}}.json");
      })()
    },
    // Interpolation settings
    interpolation: {
      escapeValue: false
      // Not needed for server-side usage
    },
    // Enable key separator for nested keys, enable namespace separator
    keySeparator: ".",
    nsSeparator: ":",
    // Debugging (disable for clean output)
    debug: false
  });
  for (const ns of NAMESPACES) {
    if (ns !== "common") {
      await i18n.loadNamespaces(ns);
    }
  }
}
function format(template, values) {
  if (!values)
    return template;
  return Object.keys(values).reduce((result, key) => {
    return result.replace(new RegExp(`{${key}}`, "g"), values[key]);
  }, template);
}
async function changeLanguage(lng) {
  await i18n.changeLanguage(lng);
}
function getTranslation(_lang) {
  return (key, options) => {
    if (key.includes(":")) {
      return i18n.t(key, options);
    }
    return i18n.t(`common:${key}`, options);
  };
}

export { changeLanguage, ensureI18nInitialized, format, getTranslation, i18n, initI18n };
