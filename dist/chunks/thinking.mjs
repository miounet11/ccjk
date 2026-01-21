import ansis from 'ansis';
import inquirer from 'inquirer';
import { SETTINGS_FILE } from './constants.mjs';
import { i18n } from './index.mjs';
import { readJsonConfig, writeJsonConfig } from './json-config.mjs';
import { h as handleExitPromptError, a as handleGeneralError } from '../shared/ccjk.DvIrK0wz.mjs';
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

const DEFAULT_BUDGET_TOKENS = 2e4;
const MIN_BUDGET_TOKENS = 1e3;
const MAX_BUDGET_TOKENS = 2e5;
const THINKING_SUPPORTED_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-5-sonnet-20250114",
  "claude-3-7-opus-20250219",
  // Opus 4.5 - default enabled
  "claude-opus-4",
  "opus-4"
];
const DEFAULT_THINKING_CONFIG = {
  enabled: true,
  budgetTokens: DEFAULT_BUDGET_TOKENS,
  inheritForSubAgents: true,
  subAgentReduction: 0.5,
  // Sub-agents get 50% of parent budget
  alwaysUseThinking: false
  // Only for complex tasks
};
class ThinkingModeManager {
  config;
  configPath;
  constructor(configPath = SETTINGS_FILE) {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }
  /**
   * Load thinking mode configuration from settings.json
   */
  loadConfig() {
    const settings = readJsonConfig(this.configPath);
    const thinkingConfig = settings?.thinking || {};
    return {
      enabled: thinkingConfig.enabled ?? DEFAULT_THINKING_CONFIG.enabled,
      budgetTokens: thinkingConfig.budgetTokens ?? DEFAULT_THINKING_CONFIG.budgetTokens,
      inheritForSubAgents: thinkingConfig.inheritForSubAgents ?? DEFAULT_THINKING_CONFIG.inheritForSubAgents,
      subAgentReduction: thinkingConfig.subAgentReduction ?? DEFAULT_THINKING_CONFIG.subAgentReduction,
      alwaysUseThinking: thinkingConfig.alwaysUseThinking ?? DEFAULT_THINKING_CONFIG.alwaysUseThinking
    };
  }
  /**
   * Save thinking mode configuration to settings.json
   */
  saveConfig() {
    const settings = readJsonConfig(this.configPath) || {};
    settings.thinking = this.config;
    writeJsonConfig(this.configPath, settings);
  }
  /**
   * Get current thinking mode configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Check if thinking mode is enabled
   */
  isEnabled() {
    return this.config.enabled;
  }
  /**
   * Enable or disable thinking mode
   */
  setEnabled(enabled) {
    this.config.enabled = enabled;
    this.saveConfig();
  }
  /**
   * Get budget tokens
   */
  getBudgetTokens() {
    return this.config.budgetTokens;
  }
  /**
   * Set budget tokens with validation
   */
  setBudgetTokens(tokens) {
    if (tokens < MIN_BUDGET_TOKENS) {
      return {
        success: false,
        error: `Budget tokens must be at least ${MIN_BUDGET_TOKENS}`
      };
    }
    if (tokens > MAX_BUDGET_TOKENS) {
      return {
        success: false,
        error: `Budget tokens cannot exceed ${MAX_BUDGET_TOKENS}`
      };
    }
    this.config.budgetTokens = tokens;
    this.saveConfig();
    return { success: true };
  }
  /**
   * Check if sub-agents should inherit thinking mode
   */
  isInheritForSubAgents() {
    return this.config.inheritForSubAgents;
  }
  /**
   * Enable or disable sub-agent inheritance
   */
  setInheritForSubAgents(inherit) {
    this.config.inheritForSubAgents = inherit;
    this.saveConfig();
  }
  /**
   * Get sub-agent budget reduction factor
   */
  getSubAgentReduction() {
    return this.config.subAgentReduction;
  }
  /**
   * Set sub-agent budget reduction factor (0.1 - 1.0)
   */
  setSubAgentReduction(reduction) {
    if (reduction < 0.1 || reduction > 1) {
      return {
        success: false,
        error: "Reduction factor must be between 0.1 and 1.0"
      };
    }
    this.config.subAgentReduction = reduction;
    this.saveConfig();
    return { success: true };
  }
  /**
   * Calculate budget for sub-agent based on reduction factor
   */
  calculateSubAgentBudget() {
    return Math.floor(this.config.budgetTokens * this.config.subAgentReduction);
  }
  /**
   * Check if always using thinking mode (even for simple tasks)
   */
  isAlwaysUseThinking() {
    return this.config.alwaysUseThinking;
  }
  /**
   * Set always use thinking mode
   */
  setAlwaysUseThinking(always) {
    this.config.alwaysUseThinking = always;
    this.saveConfig();
  }
  /**
   * Check if thinking mode is supported for the given model
   */
  isModelSupported(model) {
    return THINKING_SUPPORTED_MODELS.some((m) => model.includes(m));
  }
  /**
   * Generate thinking mode flags for Claude Code CLI
   */
  generateCliFlags() {
    if (!this.config.enabled) {
      return [];
    }
    const flags = [];
    flags.push(`--thinking-budget-tokens=${this.config.budgetTokens}`);
    flags.push("--thinking=true");
    return flags;
  }
  /**
   * Get thinking mode status for display
   */
  getStatus(enabledOnly = false) {
    const isZh = i18n.language === "zh-CN";
    return {
      enabled: this.config.enabled,
      budgetTokens: this.config.budgetTokens,
      inheritForSubAgents: this.config.inheritForSubAgents,
      subAgentBudget: this.calculateSubAgentBudget(),
      alwaysUseThinking: this.config.alwaysUseThinking,
      supportedModels: THINKING_SUPPORTED_MODELS,
      summary: this.config.enabled ? isZh ? `Thinking Mode \u5DF2\u542F\u7528 (${this.config.budgetTokens} tokens)` : `Thinking Mode enabled (${this.config.budgetTokens} tokens)` : isZh ? "Thinking Mode \u5DF2\u7981\u7528" : "Thinking Mode disabled"
    };
  }
  /**
   * Reset to default configuration
   */
  resetToDefaults() {
    this.config = { ...DEFAULT_THINKING_CONFIG };
    this.saveConfig();
  }
  /**
   * Merge configuration with existing settings
   */
  mergeConfig(partial) {
    this.config = {
      ...this.config,
      ...partial
    };
    this.saveConfig();
  }
}
let globalThinkingManager = null;
function getThinkingManager(configPath) {
  if (!globalThinkingManager) {
    globalThinkingManager = new ThinkingModeManager(configPath);
  }
  return globalThinkingManager;
}
function shouldUseThinkingMode(taskComplexity, model) {
  const manager = getThinkingManager();
  if (!manager.isEnabled()) {
    return false;
  }
  if (manager.isAlwaysUseThinking()) {
    return true;
  }
  return taskComplexity === "medium" || taskComplexity === "complex";
}

async function thinkingStatus(options = {}) {
  const isZh = i18n.language === "zh-CN";
  console.log("");
  console.log(ansis.bold.cyan(isZh ? "\u{1F9E0} Thinking Mode Status" : "\u{1F9E0} Thinking Mode Status"));
  console.log(ansis.dim("\u2500".repeat(60)));
  const manager = getThinkingManager();
  const status = manager.getStatus();
  console.log("");
  const statusIcon = status.enabled ? ansis.green("\u25CF") : ansis.gray("\u25CB");
  const statusText = status.enabled ? isZh ? "Enabled" : "Enabled" : isZh ? "Disabled" : "Disabled";
  console.log(`  ${statusIcon} ${ansis.bold(isZh ? "Status:" : "Status:")} ${statusText}`);
  console.log("");
  console.log(`  ${ansis.green("\u{1F4B0}")} ${ansis.bold(isZh ? "Budget Tokens:" : "Budget Tokens:")} ${ansis.yellow(status.budgetTokens.toLocaleString())}`);
  const inheritIcon = status.inheritForSubAgents ? ansis.green("\u2713") : ansis.gray("\u25CB");
  console.log(`  ${inheritIcon} ${ansis.bold(isZh ? "Sub-agent Inheritance:" : "Sub-agent Inheritance:")} ${status.inheritForSubAgents ? isZh ? "Enabled" : "Enabled" : isZh ? "Disabled" : "Disabled"}`);
  if (status.inheritForSubAgents) {
    console.log(`     ${ansis.dim(isZh ? `\u2192 Sub-agents get ${status.subAgentBudget.toLocaleString()} tokens` : `\u2192 Sub-agents get ${status.subAgentBudget.toLocaleString()} tokens`)}`);
  }
  const alwaysIcon = status.alwaysUseThinking ? ansis.green("\u2713") : ansis.gray("\u25CB");
  console.log(`  ${alwaysIcon} ${ansis.bold(isZh ? "Always Use Thinking:" : "Always Use Thinking:")} ${status.alwaysUseThinking ? isZh ? "Yes" : "Yes" : isZh ? "No (medium/complex only)" : "No (medium/complex only)"}`);
  console.log("");
  console.log(ansis.green(isZh ? "\u{1F4CB} Supported Models:" : "\u{1F4CB} Supported Models:"));
  for (const model of status.supportedModels) {
    console.log(`  ${ansis.dim("\u2022")} ${model}`);
  }
  console.log("");
  console.log(ansis.dim(isZh ? '\u{1F4A1} Tip: Use "ccjk thinking enable/disable" to toggle thinking mode' : '\u{1F4A1} Tip: Use "ccjk thinking enable/disable" to toggle thinking mode'));
  console.log("");
}
async function thinkingEnable(options = {}) {
  const isZh = i18n.language === "zh-CN";
  const manager = getThinkingManager();
  if (manager.isEnabled()) {
    console.log("");
    console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  Thinking Mode is already enabled" : "\u26A0\uFE0F  Thinking Mode is already enabled"));
    console.log("");
    return;
  }
  manager.setEnabled(true);
  console.log("");
  console.log(ansis.green(isZh ? "\u2705 Thinking Mode enabled" : "\u2705 Thinking Mode enabled"));
  console.log(ansis.dim(isZh ? `Budget: ${manager.getBudgetTokens().toLocaleString()} tokens` : `Budget: ${manager.getBudgetTokens().toLocaleString()} tokens`));
  console.log("");
}
async function thinkingDisable(options = {}) {
  const isZh = i18n.language === "zh-CN";
  const manager = getThinkingManager();
  if (!manager.isEnabled()) {
    console.log("");
    console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  Thinking Mode is already disabled" : "\u26A0\uFE0F  Thinking Mode is already disabled"));
    console.log("");
    return;
  }
  manager.setEnabled(false);
  console.log("");
  console.log(ansis.green(isZh ? "\u2705 Thinking Mode disabled" : "\u2705 Thinking Mode disabled"));
  console.log("");
}
async function thinkingToggle(options = {}) {
  const isZh = i18n.language === "zh-CN";
  const manager = getThinkingManager();
  const newState = !manager.isEnabled();
  manager.setEnabled(newState);
  console.log("");
  console.log(ansis.green(newState ? isZh ? "\u2705 Thinking Mode enabled" : "\u2705 Thinking Mode enabled" : isZh ? "\u2705 Thinking Mode disabled" : "\u2705 Thinking Mode disabled"));
  console.log("");
}
async function thinkingBudget(tokens, options = {}) {
  const isZh = i18n.language === "zh-CN";
  const tokenValue = Number.parseInt(tokens, 10);
  if (Number.isNaN(tokenValue)) {
    console.log("");
    console.log(ansis.red(isZh ? "\u274C Invalid token value" : "\u274C Invalid token value"));
    console.log(ansis.dim(isZh ? `Budget must be a number between ${MIN_BUDGET_TOKENS} and ${MAX_BUDGET_TOKENS}` : `Budget must be a number between ${MIN_BUDGET_TOKENS} and ${MAX_BUDGET_TOKENS}`));
    console.log("");
    return;
  }
  const manager = getThinkingManager();
  const result = manager.setBudgetTokens(tokenValue);
  if (!result.success) {
    console.log("");
    console.log(ansis.red(isZh ? "\u274C Failed to set budget" : "\u274C Failed to set budget"));
    console.log(ansis.dim(result.error));
    console.log("");
    return;
  }
  console.log("");
  console.log(ansis.green(isZh ? "\u2705 Budget tokens updated" : "\u2705 Budget tokens updated"));
  console.log(ansis.dim(isZh ? `New budget: ${tokenValue.toLocaleString()} tokens` : `New budget: ${tokenValue.toLocaleString()} tokens`));
  if (manager.isInheritForSubAgents()) {
    console.log(ansis.dim(isZh ? `Sub-agent budget: ${manager.calculateSubAgentBudget().toLocaleString()} tokens` : `Sub-agent budget: ${manager.calculateSubAgentBudget().toLocaleString()} tokens`));
  }
  console.log("");
}
async function thinkingInheritance(enabled, options = {}) {
  const isZh = i18n.language === "zh-CN";
  const manager = getThinkingManager();
  manager.setInheritForSubAgents(enabled);
  console.log("");
  console.log(ansis.green(enabled ? isZh ? "\u2705 Sub-agent inheritance enabled" : "\u2705 Sub-agent inheritance enabled" : isZh ? "\u2705 Sub-agent inheritance disabled" : "\u2705 Sub-agent inheritance disabled"));
  if (enabled) {
    console.log(ansis.dim(isZh ? `Sub-agents will receive ${manager.calculateSubAgentBudget().toLocaleString()} tokens` : `Sub-agents will receive ${manager.calculateSubAgentBudget().toLocaleString()} tokens`));
  }
  console.log("");
}
async function thinkingReset(options = {}) {
  const isZh = i18n.language === "zh-CN";
  const { confirm } = await inquirer.prompt({
    type: "confirm",
    name: "confirm",
    message: isZh ? "Reset thinking mode to default settings?" : "Reset thinking mode to default settings?",
    default: false
  });
  if (!confirm) {
    console.log("");
    console.log(ansis.yellow(isZh ? "Cancelled" : "Cancelled"));
    console.log("");
    return;
  }
  const manager = getThinkingManager();
  manager.resetToDefaults();
  console.log("");
  console.log(ansis.green(isZh ? "\u2705 Thinking mode reset to defaults" : "\u2705 Thinking mode reset to defaults"));
  console.log(ansis.dim(isZh ? `Enabled: ${manager.isEnabled()}` : `Enabled: ${manager.isEnabled()}`));
  console.log(ansis.dim(isZh ? `Budget: ${manager.getBudgetTokens().toLocaleString()} tokens` : `Budget: ${manager.getBudgetTokens().toLocaleString()} tokens`));
  console.log("");
}
async function thinkingConfig(options = {}) {
  const isZh = i18n.language === "zh-CN";
  const manager = getThinkingManager();
  const currentConfig = manager.getConfig();
  console.log("");
  console.log(ansis.bold.cyan(isZh ? "\u{1F9E0} Thinking Mode Configuration" : "\u{1F9E0} Thinking Mode Configuration"));
  console.log(ansis.dim("\u2500".repeat(60)));
  console.log("");
  const { action } = await inquirer.prompt({
    type: "list",
    name: "action",
    message: isZh ? "Select configuration option:" : "Select configuration option:",
    choices: [
      {
        name: `${currentConfig.enabled ? ansis.red("[Disable]") : ansis.green("[Enable]")} ${isZh ? "Toggle thinking mode" : "Toggle thinking mode"}`,
        value: "toggle",
        short: isZh ? "Toggle" : "Toggle"
      },
      {
        name: `${isZh ? "Set budget tokens" : "Set budget tokens"} (${currentConfig.budgetTokens.toLocaleString()})`,
        value: "budget",
        short: isZh ? "Budget" : "Budget"
      },
      {
        name: `${currentConfig.inheritForSubAgents ? ansis.red("[Disable]") : ansis.green("[Enable]")} ${isZh ? "Sub-agent inheritance" : "Sub-agent inheritance"}`,
        value: "inheritance",
        short: isZh ? "Inheritance" : "Inheritance"
      },
      {
        name: `${isZh ? "Sub-agent reduction factor" : "Sub-agent reduction factor"} (${(currentConfig.subAgentReduction * 100).toFixed(0)}%)`,
        value: "reduction",
        short: isZh ? "Reduction" : "Reduction"
      },
      {
        name: `${currentConfig.alwaysUseThinking ? ansis.red("[Disable]") : ansis.green("[Enable]")} ${isZh ? "Always use thinking" : "Always use thinking"}`,
        value: "always",
        short: isZh ? "Always" : "Always"
      },
      {
        name: isZh ? "Reset to defaults" : "Reset to defaults",
        value: "reset",
        short: isZh ? "Reset" : "Reset"
      },
      new inquirer.Separator(),
      {
        name: isZh ? "Done" : "Done",
        value: "done",
        short: isZh ? "Done" : "Done"
      }
    ]
  });
  if (action === "done") {
    await thinkingStatus(options);
    return;
  }
  if (action === "toggle") {
    await thinkingToggle(options);
  } else if (action === "budget") {
    const { tokens } = await inquirer.prompt({
      type: "input",
      name: "tokens",
      message: isZh ? `Enter budget tokens (${MIN_BUDGET_TOKENS} - ${MAX_BUDGET_TOKENS}):` : `Enter budget tokens (${MIN_BUDGET_TOKENS} - ${MAX_BUDGET_TOKENS}):`,
      default: currentConfig.budgetTokens.toString(),
      validate: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num)) {
          return isZh ? "Please enter a valid number" : "Please enter a valid number";
        }
        if (num < MIN_BUDGET_TOKENS || num > MAX_BUDGET_TOKENS) {
          return isZh ? `Must be between ${MIN_BUDGET_TOKENS} and ${MAX_BUDGET_TOKENS}` : `Must be between ${MIN_BUDGET_TOKENS} and ${MAX_BUDGET_TOKENS}`;
        }
        return true;
      }
    });
    await thinkingBudget(tokens, options);
  } else if (action === "inheritance") {
    const { enabled } = await inquirer.prompt({
      type: "confirm",
      name: "enabled",
      message: isZh ? "Enable sub-agent inheritance?" : "Enable sub-agent inheritance?",
      default: currentConfig.inheritForSubAgents
    });
    await thinkingInheritance(enabled, options);
  } else if (action === "reduction") {
    const { reduction } = await inquirer.prompt({
      type: "input",
      name: "reduction",
      message: isZh ? "Enter reduction factor (0.1 - 1.0):" : "Enter reduction factor (0.1 - 1.0):",
      default: currentConfig.subAgentReduction.toString(),
      validate: (value) => {
        const num = Number.parseFloat(value);
        if (Number.isNaN(num)) {
          return isZh ? "Please enter a valid number" : "Please enter a valid number";
        }
        if (num < 0.1 || num > 1) {
          return isZh ? "Must be between 0.1 and 1.0" : "Must be between 0.1 and 1.0";
        }
        return true;
      }
    });
    const manager2 = getThinkingManager();
    const result = manager2.setSubAgentReduction(Number.parseFloat(reduction));
    if (!result.success) {
      console.log("");
      console.log(ansis.red(result.error));
      console.log("");
      return;
    }
    console.log("");
    console.log(ansis.green(isZh ? "\u2705 Reduction factor updated" : "\u2705 Reduction factor updated"));
    console.log(ansis.dim(isZh ? `New reduction: ${(Number.parseFloat(reduction) * 100).toFixed(0)}%` : `New reduction: ${(Number.parseFloat(reduction) * 100).toFixed(0)}%`));
    console.log(ansis.dim(isZh ? `Sub-agent budget: ${manager2.calculateSubAgentBudget().toLocaleString()} tokens` : `Sub-agent budget: ${manager2.calculateSubAgentBudget().toLocaleString()} tokens`));
    console.log("");
  } else if (action === "always") {
    const { always } = await inquirer.prompt({
      type: "confirm",
      name: "always",
      message: isZh ? "Always use thinking mode (even for simple tasks)?" : "Always use thinking mode (even for simple tasks)?",
      default: currentConfig.alwaysUseThinking
    });
    const manager2 = getThinkingManager();
    manager2.setAlwaysUseThinking(always);
    console.log("");
    console.log(ansis.green(always ? isZh ? "\u2705 Always use thinking enabled" : "\u2705 Always use thinking enabled" : isZh ? "\u2705 Always use thinking disabled" : "\u2705 Always use thinking disabled"));
    console.log("");
  } else if (action === "reset") {
    await thinkingReset(options);
  }
  await thinkingConfig(options);
}
function thinkingCheck(complexity, model) {
  const isZh = i18n.language === "zh-CN";
  const useThinking = shouldUseThinkingMode(complexity);
  const complexityText = {
    simple: isZh ? "\u7B80\u5355" : "simple",
    medium: isZh ? "\u4E2D\u7B49" : "medium",
    complex: isZh ? "\u590D\u6742" : "complex"
  }[complexity];
  console.log("");
  console.log(ansis.bold(isZh ? "\u{1F9E0} Thinking Mode Check" : "\u{1F9E0} Thinking Mode Check"));
  console.log(ansis.dim("\u2500".repeat(60)));
  console.log("");
  console.log(`  ${isZh ? "\u4EFB\u52A1\u590D\u6742\u5EA6" : "Task Complexity"}: ${complexityText}`);
  console.log(`  ${isZh ? "\u4F7F\u7528 Thinking Mode" : "Use Thinking Mode"}: ${useThinking ? ansis.green("Yes") : ansis.yellow("No")}`);
  console.log("");
}
function thinkingHelp(options = {}) {
  const isZh = i18n.language === "zh-CN";
  console.log("");
  console.log(ansis.bold.cyan(isZh ? "\u{1F9E0} Thinking Mode Commands" : "\u{1F9E0} Thinking Mode Commands"));
  console.log(ansis.dim("\u2500".repeat(60)));
  console.log("");
  const commands = [
    {
      cmd: "ccjk thinking",
      desc: isZh ? "Display thinking mode status" : "Display thinking mode status"
    },
    {
      cmd: "ccjk thinking enable",
      desc: isZh ? "Enable thinking mode" : "Enable thinking mode"
    },
    {
      cmd: "ccjk thinking disable",
      desc: isZh ? "Disable thinking mode" : "Disable thinking mode"
    },
    {
      cmd: "ccjk thinking toggle",
      desc: isZh ? "Toggle thinking mode on/off" : "Toggle thinking mode on/off"
    },
    {
      cmd: "ccjk thinking budget <tokens>",
      desc: isZh ? "Set budget tokens (1000-200000)" : "Set budget tokens (1000-200000)"
    },
    {
      cmd: "ccjk thinking config",
      desc: isZh ? "Interactive configuration menu" : "Interactive configuration menu"
    },
    {
      cmd: "ccjk thinking check <complexity>",
      desc: isZh ? "Check if thinking will be used" : "Check if thinking will be used"
    },
    {
      cmd: "ccjk thinking reset",
      desc: isZh ? "Reset to default settings" : "Reset to default settings"
    }
  ];
  for (const { cmd, desc } of commands) {
    console.log(`  ${ansis.green(cmd)}`);
    console.log(`    ${ansis.dim(desc)}`);
    console.log("");
  }
  console.log(ansis.dim(isZh ? "\u{1F4A1} Thinking Mode is enabled by default for Opus 4.5" : "\u{1F4A1} Thinking Mode is enabled by default for Opus 4.5"));
  console.log(ansis.dim(isZh ? "   It provides extended reasoning for complex tasks." : "   It provides extended reasoning for complex tasks."));
  console.log("");
}
async function thinking(action, args = [], options = {}) {
  try {
    switch (action) {
      case "enable":
        await thinkingEnable(options);
        break;
      case "disable":
        await thinkingDisable(options);
        break;
      case "toggle":
        await thinkingToggle(options);
        break;
      case "budget":
        if (args.length === 0) {
          const isZh = i18n.language === "zh-CN";
          console.log("");
          console.log(ansis.yellow(isZh ? "\u26A0\uFE0F  Please specify token amount" : "\u26A0\uFE0F  Please specify token amount"));
          console.log(ansis.dim(isZh ? "Usage: ccjk thinking budget <tokens>" : "Usage: ccjk thinking budget <tokens>"));
          console.log("");
          return;
        }
        await thinkingBudget(args[0], options);
        break;
      case "inherit":
        await thinkingInheritance(true, options);
        break;
      case "no-inherit":
        await thinkingInheritance(false, options);
        break;
      case "config":
        await thinkingConfig(options);
        break;
      case "check":
        if (args.length === 0) {
          thinkingCheck("complex");
        } else {
          const complexity = ["simple", "medium", "complex"].includes(args[0]) ? args[0] : "complex";
          thinkingCheck(complexity);
        }
        break;
      case "reset":
        await thinkingReset(options);
        break;
      case "help":
        thinkingHelp(options);
        break;
      case "status":
      default:
        await thinkingStatus(options);
        break;
    }
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}

export { thinking, thinkingBudget, thinkingCheck, thinkingConfig, thinkingDisable, thinkingEnable, thinkingHelp, thinkingInheritance, thinkingReset, thinkingStatus, thinkingToggle };
