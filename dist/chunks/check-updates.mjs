import process__default from 'node:process';
import ansis from 'ansis';
import { ensureI18nInitialized, i18n } from './index.mjs';
import { r as resolveCodeType } from '../shared/ccjk.SIo9I8q3.mjs';
import { checkAndUpdateTools } from './auto-updater.mjs';
import { r as runCodexUpdate } from './codex.mjs';
import 'node:fs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';
import './constants.mjs';
import 'node:os';
import './ccjk-config.mjs';
import 'smol-toml';
import './fs-operations.mjs';
import 'node:crypto';
import 'node:fs/promises';
import './json-config.mjs';
import 'dayjs';
import 'ora';
import 'tinyexec';
import './platform.mjs';
import '../shared/ccjk.DHbrGcgg.mjs';
import 'inquirer-toggle';
import './version-checker.mjs';
import 'node:child_process';
import 'node:path';
import 'node:util';
import 'semver';
import 'inquirer';
import './config2.mjs';
import './claude-config.mjs';
import '../shared/ccjk.BFQ7yr5S.mjs';
import './prompts.mjs';
import './package.mjs';

class ToolUpdateScheduler {
  /**
   * Update tools based on code type
   * @param codeType - The code tool type to update
   * @param skipPrompt - Whether to skip interactive prompts
   */
  async updateByCodeType(codeType, skipPrompt = false) {
    await ensureI18nInitialized();
    switch (codeType) {
      case "claude-code":
        await this.updateClaudeCodeTools(skipPrompt);
        break;
      case "codex":
        await this.updateCodexTools(skipPrompt);
        break;
      default:
        throw new Error(`Unsupported code type: ${codeType}`);
    }
  }
  /**
   * Update Claude Code related tools
   * @param skipPrompt - Whether to skip interactive prompts
   */
  async updateClaudeCodeTools(skipPrompt) {
    await checkAndUpdateTools(skipPrompt);
  }
  /**
   * Update Codex tools
   * @param skipPrompt - Whether to skip interactive prompts
   */
  async updateCodexTools(skipPrompt) {
    await runCodexUpdate(false, skipPrompt);
  }
}

async function checkUpdates(options = {}) {
  try {
    const skipPrompt = options.skipPrompt || false;
    let codeType;
    try {
      codeType = await resolveCodeType(options.codeType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(ansis.red(`${errorMessage}
Defaulting to "claude-code".`));
      codeType = "claude-code";
    }
    const scheduler = new ToolUpdateScheduler();
    await scheduler.updateByCodeType(codeType, skipPrompt);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(ansis.red(`${i18n.t("updater:errorCheckingUpdates")} ${errorMessage}`));
    process__default.exit(1);
  }
}

export { checkUpdates };
