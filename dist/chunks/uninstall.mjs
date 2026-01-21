import ansis from 'ansis';
import inquirer from 'inquirer';
import { ZCF_CONFIG_FILE, DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from './constants.mjs';
import { i18n, ensureI18nInitialized } from './index.mjs';
import { readZcfConfig } from './ccjk-config.mjs';
import { r as resolveCodeType } from '../shared/ccjk.SIo9I8q3.mjs';
import { h as handleExitPromptError, a as handleGeneralError } from '../shared/ccjk.DvIrK0wz.mjs';
import { a as addNumbersToChoices } from '../shared/ccjk.BFQ7yr5S.mjs';
import { p as promptBoolean } from '../shared/ccjk.DHbrGcgg.mjs';
import { homedir } from 'node:os';
import { pathExists } from 'fs-extra';
import { join } from 'pathe';
import { exec } from 'tinyexec';
import { readJsonConfig, writeJsonConfig } from './json-config.mjs';
import { m as moveToTrash } from '../shared/ccjk.DGjQxTq_.mjs';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'smol-toml';
import './fs-operations.mjs';
import 'node:crypto';
import 'node:fs/promises';
import 'dayjs';
import 'inquirer-toggle';
import 'trash';

class ZcfUninstaller {
  _lang;
  // Reserved for future i18n support
  conflictResolution = /* @__PURE__ */ new Map();
  constructor(lang = "en") {
    this._lang = lang;
    this.conflictResolution.set("claude-code", ["mcps"]);
    void this._lang;
  }
  /**
   * 1. Remove outputStyle field from settings.json and output-styles directory
   */
  async removeOutputStyles() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const settingsPath = join(homedir(), ".claude", "settings.json");
      const outputStylesPath = join(homedir(), ".claude", "output-styles");
      if (await pathExists(settingsPath)) {
        const settings = readJsonConfig(settingsPath) || {};
        if (settings.outputStyle) {
          delete settings.outputStyle;
          writeJsonConfig(settingsPath, settings);
          result.removedConfigs.push("outputStyle field from settings.json");
        }
      } else {
        result.warnings.push(i18n.t("uninstall:settingsJsonNotFound"));
      }
      if (await pathExists(outputStylesPath)) {
        const trashResult = await moveToTrash(outputStylesPath);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push("~/.claude/output-styles/");
      } else {
        result.warnings.push(i18n.t("uninstall:outputStylesDirectoryNotFound"));
      }
      result.success = true;
    } catch (error) {
      result.errors.push(`Failed to remove output styles: ${error.message}`);
    }
    return result;
  }
  /**
   * 2. Remove custom commands directory (commands/ccjk/)
   */
  async removeCustomCommands() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const commandsPath = join(homedir(), ".claude", "commands", "ccjk");
      if (await pathExists(commandsPath)) {
        const trashResult = await moveToTrash(commandsPath);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push("commands/ccjk/");
        result.success = true;
      } else {
        result.warnings.push(i18n.t("uninstall:commandsNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove custom commands: ${error.message}`);
    }
    return result;
  }
  /**
   * 3. Remove custom agents directory (agents/ccjk/)
   */
  async removeCustomAgents() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const agentsPath = join(homedir(), ".claude", "agents", "ccjk");
      if (await pathExists(agentsPath)) {
        const trashResult = await moveToTrash(agentsPath);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push("agents/ccjk/");
        result.success = true;
      } else {
        result.warnings.push(i18n.t("uninstall:agentsNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove custom agents: ${error.message}`);
    }
    return result;
  }
  /**
   * 4. Remove global memory file (CLAUDE.md)
   */
  async removeClaudeMd() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const claudeMdPath = join(homedir(), ".claude", "CLAUDE.md");
      if (await pathExists(claudeMdPath)) {
        const trashResult = await moveToTrash(claudeMdPath);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push("CLAUDE.md");
        result.success = true;
      } else {
        result.warnings.push(i18n.t("uninstall:claudeMdNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove CLAUDE.md: ${error.message}`);
    }
    return result;
  }
  /**
   * 5. Remove permissions and environment variables
   */
  async removePermissionsAndEnvs() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const settingsPath = join(homedir(), ".claude", "settings.json");
      if (await pathExists(settingsPath)) {
        const settings = readJsonConfig(settingsPath) || {};
        let modified = false;
        if (settings.permissions) {
          delete settings.permissions;
          result.removedConfigs.push("permissions configuration");
          modified = true;
        }
        if (settings.env) {
          delete settings.env;
          result.removedConfigs.push("environment variables");
          modified = true;
        }
        if (modified) {
          writeJsonConfig(settingsPath, settings);
        }
        result.success = true;
      } else {
        result.warnings.push(i18n.t("uninstall:settingsJsonNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove permissions and envs: ${error.message}`);
    }
    return result;
  }
  /**
   * 6. Remove MCP servers from .claude.json (mcpServers field only)
   */
  async removeMcps() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const claudeJsonPath = join(homedir(), ".claude.json");
      if (await pathExists(claudeJsonPath)) {
        const config = readJsonConfig(claudeJsonPath) || {};
        if (config.mcpServers) {
          delete config.mcpServers;
          writeJsonConfig(claudeJsonPath, config);
          result.removedConfigs.push("mcpServers from .claude.json");
        }
        result.success = true;
      } else {
        result.warnings.push(i18n.t("uninstall:claudeJsonNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove MCP servers: ${error.message}`);
    }
    return result;
  }
  /**
   * 7. Uninstall Claude Code Router and remove configuration
   */
  async uninstallCcr() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const ccrPath = join(homedir(), ".claude-code-router");
      if (await pathExists(ccrPath)) {
        const trashResult = await moveToTrash(ccrPath);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push(".claude-code-router/");
      }
      try {
        await exec("npm", ["uninstall", "-g", "@musistudio/claude-code-router"]);
        result.removed.push("@musistudio/claude-code-router package");
        result.success = true;
      } catch (npmError) {
        if (npmError.message.includes("not found") || npmError.message.includes("not installed")) {
          result.warnings.push(i18n.t("uninstall:ccrPackageNotFound"));
          result.success = true;
        } else {
          result.errors.push(`Failed to uninstall CCR package: ${npmError.message}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to uninstall CCR: ${error.message}`);
    }
    return result;
  }
  /**
   * 8. Uninstall CCometixLine
   */
  async uninstallCcline() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      await exec("npm", ["uninstall", "-g", "@cometix/ccline"]);
      result.removed.push("@cometix/ccline package");
      result.success = true;
    } catch (error) {
      if (error.message.includes("not found") || error.message.includes("not installed")) {
        result.warnings.push(i18n.t("uninstall:cclinePackageNotFound"));
        result.success = true;
      } else {
        result.errors.push(`Failed to uninstall CCometixLine: ${error.message}`);
      }
    }
    return result;
  }
  /**
   * 9. Uninstall Claude Code and remove entire .claude.json
   */
  async uninstallClaudeCode() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const claudeJsonPath = join(homedir(), ".claude.json");
      if (await pathExists(claudeJsonPath)) {
        const trashResult = await moveToTrash(claudeJsonPath);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push(".claude.json (includes MCP configuration)");
      }
      try {
        const { uninstallCodeTool } = await import('./installer2.mjs');
        const success = await uninstallCodeTool("claude-code");
        if (success) {
          result.removed.push("@anthropic-ai/claude-code");
          result.success = true;
        } else {
          result.errors.push(i18n.t("uninstall:uninstallFailed", { codeType: i18n.t("common:claudeCode"), message: "" }));
        }
      } catch (npmError) {
        if (npmError.message.includes("not found") || npmError.message.includes("not installed")) {
          result.warnings.push(i18n.t("uninstall:claudeCodePackageNotFound"));
          result.success = true;
        } else {
          result.errors.push(i18n.t("uninstall:uninstallFailed", { codeType: i18n.t("common:claudeCode"), message: `: ${npmError.message}` }));
        }
      }
    } catch (error) {
      result.errors.push(i18n.t("uninstall:uninstallFailed", { codeType: i18n.t("common:claudeCode"), message: `: ${error.message}` }));
    }
    return result;
  }
  /**
   * 10. Remove backup files
   */
  async removeBackups() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const backupPath = join(homedir(), ".claude", "backup");
      if (await pathExists(backupPath)) {
        const trashResult = await moveToTrash(backupPath);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push("backup/");
        result.success = true;
      } else {
        result.warnings.push(i18n.t("uninstall:backupsNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove backups: ${error.message}`);
    }
    return result;
  }
  /**
   * 11. Remove CCJK preference configuration
   */
  async removeZcfConfig() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const zcfConfigPath = ZCF_CONFIG_FILE;
      const relativeName = zcfConfigPath.replace(homedir(), "~");
      if (await pathExists(zcfConfigPath)) {
        const trashResult = await moveToTrash(zcfConfigPath);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push(relativeName);
        result.success = true;
      } else {
        result.warnings.push(i18n.t("uninstall:ccjkConfigNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove CCJK config: ${error.message}`);
    }
    return result;
  }
  /**
   * Complete uninstall - remove all directories and packages
   */
  async completeUninstall() {
    const result = {
      success: true,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const directoriesToRemove = [
        { path: join(homedir(), ".claude"), name: "~/.claude/" },
        { path: join(homedir(), ".claude.json"), name: "~/.claude.json" },
        { path: join(homedir(), ".claude-code-router"), name: "~/.claude-code-router/" }
      ];
      for (const dir of directoriesToRemove) {
        try {
          if (await pathExists(dir.path)) {
            const trashResult = await moveToTrash(dir.path);
            if (!trashResult[0]?.success) {
              result.warnings.push(`Failed to move ${dir.name} to trash: ${trashResult[0]?.error || "Unknown error"}`);
            }
            result.removed.push(dir.name);
          }
        } catch (error) {
          result.warnings.push(`Failed to remove ${dir.name}: ${error.message}`);
        }
      }
      const packagesToUninstall = [
        "@musistudio/claude-code-router",
        "@cometix/ccline",
        "@anthropic-ai/claude-code"
      ];
      for (const pkg of packagesToUninstall) {
        try {
          await exec("npm", ["uninstall", "-g", pkg]);
          result.removed.push(`${pkg} package`);
        } catch (error) {
          if (error.message.includes("not found") || error.message.includes("not installed")) {
            if (pkg.includes("claude-code-router")) {
              result.warnings.push(i18n.t("uninstall:ccrPackageNotFound"));
            } else if (pkg.includes("ccline")) {
              result.warnings.push(i18n.t("uninstall:cclinePackageNotFound"));
            } else {
              result.warnings.push(i18n.t("uninstall:claudeCodePackageNotFound"));
            }
          } else {
            result.warnings.push(`Failed to uninstall ${pkg}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      result.errors.push(`Complete uninstall failed: ${error.message}`);
      result.success = false;
    }
    return result;
  }
  /**
   * Custom uninstall with conflict resolution
   */
  async customUninstall(selectedItems) {
    const resolvedItems = this.resolveConflicts(selectedItems);
    const results = [];
    for (const item of resolvedItems) {
      try {
        const result = await this.executeUninstallItem(item);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          removed: [],
          removedConfigs: [],
          errors: [`Failed to execute ${item}: ${error.message}`],
          warnings: []
        });
      }
    }
    return results;
  }
  /**
   * Resolve conflicts between uninstall items
   */
  resolveConflicts(items) {
    const resolved = [...items];
    for (const [primary, conflicts] of this.conflictResolution) {
      if (resolved.includes(primary)) {
        conflicts.forEach((conflict) => {
          const index = resolved.indexOf(conflict);
          if (index > -1) {
            resolved.splice(index, 1);
          }
        });
      }
    }
    return resolved;
  }
  /**
   * Execute uninstall for a specific item
   */
  async executeUninstallItem(item) {
    switch (item) {
      case "output-styles":
        return await this.removeOutputStyles();
      case "commands":
        return await this.removeCustomCommands();
      case "agents":
        return await this.removeCustomAgents();
      case "claude-md":
        return await this.removeClaudeMd();
      case "permissions-envs":
        return await this.removePermissionsAndEnvs();
      case "mcps":
        return await this.removeMcps();
      case "ccr":
        return await this.uninstallCcr();
      case "ccline":
        return await this.uninstallCcline();
      case "claude-code":
        return await this.uninstallClaudeCode();
      case "backups":
        return await this.removeBackups();
      case "ccjk-config":
        return await this.removeZcfConfig();
      default:
        return {
          success: false,
          removed: [],
          removedConfigs: [],
          errors: [`Unknown uninstall item: ${item}`],
          warnings: []
        };
    }
  }
}

async function uninstall(options = {}) {
  try {
    ensureI18nInitialized();
    let codeType;
    if (options.codeType) {
      try {
        codeType = await resolveCodeType(options.codeType);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(ansis.red(`${i18n.t("errors:generalError")} ${errorMessage}`));
        const config = readZcfConfig();
        codeType = config?.codeToolType && isCodeToolType(config.codeToolType) ? config.codeToolType : DEFAULT_CODE_TOOL_TYPE;
      }
    } else {
      const config = readZcfConfig();
      codeType = config?.codeToolType && isCodeToolType(config.codeToolType) ? config.codeToolType : DEFAULT_CODE_TOOL_TYPE;
    }
    const uninstaller = new ZcfUninstaller(options.lang || "en");
    if (codeType === "codex") {
      const { runCodexUninstall } = await import('./codex.mjs').then(function (n) { return n.q; });
      await runCodexUninstall();
      return;
    }
    if (options.mode && options.mode !== "interactive") {
      if (options.mode === "complete") {
        await executeCompleteUninstall(uninstaller);
        return;
      } else if (options.mode === "custom" && options.items) {
        let items;
        if (typeof options.items === "string") {
          items = options.items.split(",").map((item) => item.trim());
        } else {
          items = options.items;
        }
        await executeCustomUninstall(uninstaller, items);
        return;
      }
    }
    await showInteractiveUninstall(uninstaller);
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}
async function showInteractiveUninstall(uninstaller) {
  console.log(ansis.green.bold(i18n.t("uninstall:title")));
  console.log("");
  const { mainChoice } = await inquirer.prompt({
    type: "list",
    name: "mainChoice",
    message: i18n.t("uninstall:selectMainOption"),
    choices: addNumbersToChoices([
      {
        name: `${i18n.t("uninstall:completeUninstall")} - ${ansis.gray(i18n.t("uninstall:completeUninstallDesc"))}`,
        value: "complete",
        short: i18n.t("uninstall:completeUninstall")
      },
      {
        name: `${i18n.t("uninstall:customUninstall")} - ${ansis.gray(i18n.t("uninstall:customUninstallDesc"))}`,
        value: "custom",
        short: i18n.t("uninstall:customUninstall")
      }
    ])
  });
  if (!mainChoice) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  if (mainChoice === "complete") {
    await executeCompleteUninstall(uninstaller);
  } else {
    await showCustomUninstallMenu(uninstaller);
  }
}
async function showCustomUninstallMenu(uninstaller) {
  console.log("");
  console.log(ansis.green(i18n.t("uninstall:selectCustomItems")));
  const { customItems } = await inquirer.prompt({
    type: "checkbox",
    name: "customItems",
    message: `${i18n.t("uninstall:selectItemsToRemove")} ${i18n.t("common:multiSelectHint")}`,
    choices: [
      {
        name: i18n.t("uninstall:outputStyles"),
        value: "output-styles"
      },
      {
        name: i18n.t("uninstall:commands"),
        value: "commands"
      },
      {
        name: i18n.t("uninstall:agents"),
        value: "agents"
      },
      {
        name: i18n.t("uninstall:claudeMd"),
        value: "claude-md"
      },
      {
        name: i18n.t("uninstall:permissionsEnvs"),
        value: "permissions-envs"
      },
      {
        name: i18n.t("uninstall:mcps"),
        value: "mcps"
      },
      {
        name: i18n.t("uninstall:ccr"),
        value: "ccr"
      },
      {
        name: i18n.t("uninstall:ccline"),
        value: "ccline"
      },
      {
        name: i18n.t("uninstall:claudeCode"),
        value: "claude-code"
      },
      {
        name: i18n.t("uninstall:backups"),
        value: "backups"
      },
      {
        name: i18n.t("uninstall:ccjkConfig"),
        value: "ccjk-config"
      }
    ],
    validate: (answers) => {
      if (answers.length === 0) {
        return i18n.t("uninstall:selectAtLeastOne");
      }
      return true;
    }
  });
  if (!customItems || customItems.length === 0) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  await executeCustomUninstall(uninstaller, customItems);
}
async function executeCompleteUninstall(uninstaller) {
  console.log("");
  console.log(ansis.red.bold(i18n.t("uninstall:executingComplete")));
  console.log(ansis.yellow(i18n.t("uninstall:completeWarning")));
  const confirm = await promptBoolean({
    message: i18n.t("uninstall:confirmComplete"),
    defaultValue: false
  });
  if (!confirm) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  console.log("");
  console.log(ansis.green(i18n.t("uninstall:processingComplete")));
  const result = await uninstaller.completeUninstall();
  displayUninstallResult("complete", [result]);
}
async function executeCustomUninstall(uninstaller, items) {
  console.log("");
  console.log(ansis.green(i18n.t("uninstall:executingCustom")));
  console.log(ansis.gray(i18n.t("uninstall:selectedItems")));
  items.forEach((item) => {
    console.log(`  \u2022 ${i18n.t(`uninstall:${item}`)}`);
  });
  const confirm = await promptBoolean({
    message: i18n.t("uninstall:confirmCustom"),
    defaultValue: false
  });
  if (!confirm) {
    console.log(ansis.yellow(i18n.t("common:cancelled")));
    return;
  }
  console.log("");
  console.log(ansis.green(i18n.t("uninstall:processingCustom")));
  const results = await uninstaller.customUninstall(items);
  displayUninstallResult("custom", results);
}
function displayUninstallResult(mode, results) {
  console.log("");
  console.log(ansis.green("\u2500".repeat(50)));
  let totalSuccess = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  results.forEach((result) => {
    if (result.success) {
      totalSuccess++;
    }
    if (result.removed && result.removed.length > 0) {
      console.log(ansis.green(`\u{1F5D1}\uFE0F ${i18n.t("uninstall:movedToTrash")}:`));
      result.removed.forEach((item) => {
        console.log(ansis.gray(`  \u2022 ${item}`));
      });
    }
    if (result.removedConfigs && result.removedConfigs.length > 0) {
      console.log(ansis.green(`\u2714 ${i18n.t("uninstall:removedConfigs")}:`));
      result.removedConfigs.forEach((item) => {
        console.log(ansis.gray(`  \u2022 ${item}`));
      });
    }
    if (result.errors && result.errors.length > 0) {
      totalErrors += result.errors.length;
      console.log(ansis.red(`\u2716 ${i18n.t("uninstall:errors")}:`));
      result.errors.forEach((error) => {
        console.log(ansis.red(`  \u2022 ${error}`));
      });
    }
    if (result.warnings && result.warnings.length > 0) {
      totalWarnings += result.warnings.length;
      console.log(ansis.yellow(`\u26A0 ${i18n.t("uninstall:warnings")}:`));
      result.warnings.forEach((warning) => {
        console.log(ansis.yellow(`  \u2022 ${warning}`));
      });
    }
  });
  const totalRemovedFiles = results.reduce((count, result) => count + (result.removed?.length || 0), 0);
  const totalRemovedConfigs = results.reduce((count, result) => count + (result.removedConfigs?.length || 0), 0);
  console.log("");
  console.log(ansis.green("\u2500".repeat(50)));
  if (mode === "complete") {
    if (totalErrors === 0) {
      console.log(ansis.green.bold(`\u2714 ${i18n.t("uninstall:completeSuccess")}`));
    } else {
      console.log(ansis.yellow.bold(`\u26A0 ${i18n.t("uninstall:completePartialSuccess")}`));
    }
  } else {
    if (totalRemovedFiles > 0 && totalRemovedConfigs > 0) {
      console.log(ansis.green.bold(`\u2714 ${i18n.t("uninstall:customSuccessBoth", {
        fileCount: totalRemovedFiles,
        configCount: totalRemovedConfigs
      })}`));
    } else if (totalRemovedFiles > 0) {
      console.log(ansis.green.bold(`\u2714 ${i18n.t("uninstall:customSuccessFiles", {
        count: totalRemovedFiles
      })}`));
    } else if (totalRemovedConfigs > 0) {
      console.log(ansis.green.bold(`\u2714 ${i18n.t("uninstall:customSuccessConfigs", {
        count: totalRemovedConfigs
      })}`));
    } else {
      console.log(ansis.green.bold(`\u2714 ${i18n.t("uninstall:customSuccess", { count: totalSuccess })}`));
    }
    if (totalErrors > 0) {
      console.log(ansis.red(`\u2716 ${i18n.t("uninstall:errorsCount", { count: totalErrors })}`));
    }
    if (totalWarnings > 0) {
      console.log(ansis.yellow(`\u26A0 ${i18n.t("uninstall:warningsCount", { count: totalWarnings })}`));
    }
  }
  console.log("");
}

export { uninstall };
