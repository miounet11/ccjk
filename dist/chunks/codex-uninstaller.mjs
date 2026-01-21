import { pathExists } from 'fs-extra';
import { join } from 'pathe';
import { CODEX_DIR, CODEX_CONFIG_FILE, CODEX_AUTH_FILE, CODEX_AGENTS_FILE, CODEX_PROMPTS_DIR } from './constants.mjs';
import { i18n } from './index.mjs';
import { writeFileAtomic } from './fs-operations.mjs';
import { m as moveToTrash } from '../shared/ccjk.DGjQxTq_.mjs';
import 'node:os';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'node:crypto';
import 'node:fs/promises';
import 'trash';

class CodexUninstaller {
  _lang;
  conflictResolution = /* @__PURE__ */ new Map();
  CODEX_BACKUP_DIR = join(CODEX_DIR, "backup");
  constructor(lang = "en") {
    this._lang = lang;
    this.conflictResolution.set("cli-package", ["config", "auth"]);
    this.conflictResolution.set("config", ["api-config", "mcp-config"]);
    void this._lang;
  }
  /**
   * Remove config file (config.toml)
   */
  async removeConfig() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      if (await pathExists(CODEX_CONFIG_FILE)) {
        const trashResult = await moveToTrash(CODEX_CONFIG_FILE);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push("config.toml");
        result.success = true;
      } else {
        result.warnings.push(i18n.t("codex:configNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove config: ${error.message}`);
    }
    return result;
  }
  /**
   * Remove auth file (auth.json)
   */
  async removeAuth() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      if (await pathExists(CODEX_AUTH_FILE)) {
        const trashResult = await moveToTrash(CODEX_AUTH_FILE);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push("auth.json");
        result.success = true;
      } else {
        result.warnings.push(i18n.t("codex:authNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove auth: ${error.message}`);
    }
    return result;
  }
  /**
   * Remove system prompt file (AGENTS.md)
   */
  async removeSystemPrompt() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      if (await pathExists(CODEX_AGENTS_FILE)) {
        const trashResult = await moveToTrash(CODEX_AGENTS_FILE);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push("AGENTS.md");
        result.success = true;
      } else {
        result.warnings.push(i18n.t("codex:systemPromptNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove system prompt: ${error.message}`);
    }
    return result;
  }
  /**
   * Remove workflow directory (prompts/)
   */
  async removeWorkflow() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      if (await pathExists(CODEX_PROMPTS_DIR)) {
        const trashResult = await moveToTrash(CODEX_PROMPTS_DIR);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move to trash");
        }
        result.removed.push("prompts/");
        result.success = true;
      } else {
        result.warnings.push(i18n.t("codex:workflowNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove workflow: ${error.message}`);
    }
    return result;
  }
  /**
   * Uninstall Codex CLI package
   */
  async uninstallCliPackage() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      const { uninstallCodeTool } = await import('./installer2.mjs');
      const success = await uninstallCodeTool("codex");
      if (success) {
        result.removed.push("@openai/codex");
        result.success = true;
      } else {
        result.errors.push(i18n.t("uninstall:uninstallFailed", { codeType: i18n.t("common:codex"), message: "" }));
      }
    } catch (error) {
      if (error.message.includes("not found") || error.message.includes("not installed")) {
        result.warnings.push(i18n.t("codex:packageNotFound"));
        result.success = true;
      } else {
        result.errors.push(i18n.t("uninstall:uninstallFailed", { codeType: i18n.t("common:codex"), message: `: ${error.message}` }));
      }
    }
    return result;
  }
  /**
   * Remove API configuration from config.toml
   */
  async removeApiConfig() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      if (await pathExists(CODEX_CONFIG_FILE)) {
        const { readFileSync } = await import('node:fs');
        const content = readFileSync(CODEX_CONFIG_FILE, "utf-8");
        const lines = content.split("\n");
        const newLines = [];
        let inProviderSection = false;
        let configModified = false;
        for (const line of lines) {
          if (line.trim().match(/^\[model_providers\./)) {
            inProviderSection = true;
            configModified = true;
            continue;
          }
          if (inProviderSection && line.trim().startsWith("[") && !line.trim().match(/^\[model_providers\./)) {
            inProviderSection = false;
          }
          if (inProviderSection) {
            continue;
          }
          if (line.trim().startsWith("model_provider")) {
            configModified = true;
            continue;
          }
          newLines.push(line);
        }
        if (configModified) {
          writeFileAtomic(CODEX_CONFIG_FILE, newLines.join("\n"));
          result.removedConfigs.push(i18n.t("codex:apiConfigRemoved"));
        }
        result.success = true;
      } else {
        result.warnings.push(i18n.t("codex:configNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove API config: ${error.message}`);
    }
    return result;
  }
  /**
   * Remove backup directory (~/.codex/backup/)
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
      if (await pathExists(this.CODEX_BACKUP_DIR)) {
        const trashResult = await moveToTrash(this.CODEX_BACKUP_DIR);
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || "Failed to move backup directory to trash");
        }
        result.removed.push("backup/");
        result.success = true;
      } else {
        result.warnings.push(i18n.t("codex:backupNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove backups: ${error.message}`);
    }
    return result;
  }
  /**
   * Remove MCP configuration from config.toml
   */
  async removeMcpConfig() {
    const result = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: []
    };
    try {
      if (await pathExists(CODEX_CONFIG_FILE)) {
        const { readFileSync } = await import('node:fs');
        const content = readFileSync(CODEX_CONFIG_FILE, "utf-8");
        const lines = content.split("\n");
        const newLines = [];
        let inMcpSection = false;
        let configModified = false;
        for (const line of lines) {
          if (line.trim().match(/^\[mcp_servers\./)) {
            inMcpSection = true;
            configModified = true;
            continue;
          }
          if (inMcpSection && line.trim().startsWith("[") && !line.trim().match(/^\[mcp_servers\./)) {
            inMcpSection = false;
          }
          if (inMcpSection) {
            continue;
          }
          newLines.push(line);
        }
        if (configModified) {
          writeFileAtomic(CODEX_CONFIG_FILE, newLines.join("\n"));
          result.removedConfigs.push(i18n.t("codex:mcpConfigRemoved"));
        }
        result.success = true;
      } else {
        result.warnings.push(i18n.t("codex:configNotFound"));
        result.success = true;
      }
    } catch (error) {
      result.errors.push(`Failed to remove MCP config: ${error.message}`);
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
      if (await pathExists(CODEX_DIR)) {
        const trashResult = await moveToTrash(CODEX_DIR);
        if (!trashResult[0]?.success) {
          result.warnings.push(`Failed to move ~/.codex/ to trash: ${trashResult[0]?.error || "Unknown error"}`);
        }
        result.removed.push("~/.codex/");
      }
      const cliUninstallResult = await this.uninstallCliPackage();
      result.removed.push(...cliUninstallResult.removed);
      result.removedConfigs.push(...cliUninstallResult.removedConfigs);
      result.errors.push(...cliUninstallResult.errors);
      result.warnings.push(...cliUninstallResult.warnings);
      result.success = result.success && cliUninstallResult.success;
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
      case "config":
        return await this.removeConfig();
      case "auth":
        return await this.removeAuth();
      case "system-prompt":
        return await this.removeSystemPrompt();
      case "workflow":
        return await this.removeWorkflow();
      case "cli-package":
        return await this.uninstallCliPackage();
      case "api-config":
        return await this.removeApiConfig();
      case "mcp-config":
        return await this.removeMcpConfig();
      case "backups":
        return await this.removeBackups();
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

export { CodexUninstaller };
