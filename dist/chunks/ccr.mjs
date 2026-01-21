import { d as displayBannerWithInfo } from '../shared/ccjk.BpHTUkb8.mjs';
import { h as handleExitPromptError, a as handleGeneralError } from '../shared/ccjk.DvIrK0wz.mjs';
import { s as showCcrMenu, a as showMainMenu } from './menu.mjs';
import 'ansis';
import './package.mjs';
import './index.mjs';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';
import 'inquirer';
import './constants.mjs';
import 'node:os';
import './ccjk-config.mjs';
import 'smol-toml';
import './fs-operations.mjs';
import 'node:crypto';
import 'node:fs/promises';
import './json-config.mjs';
import 'dayjs';
import './codex.mjs';
import 'ora';
import 'semver';
import 'tinyexec';
import './config2.mjs';
import './claude-config.mjs';
import './platform.mjs';
import '../shared/ccjk.BFQ7yr5S.mjs';
import './prompts.mjs';
import '../shared/ccjk.DHbrGcgg.mjs';
import 'inquirer-toggle';
import 'node:child_process';
import '../shared/ccjk.SIo9I8q3.mjs';
import './features.mjs';
import './config3.mjs';
import 'node:util';
import './init.mjs';
import './workflows.mjs';
import './auto-updater.mjs';
import './version-checker.mjs';
import 'node:path';
import '../shared/ccjk.BF-4_Yho.mjs';
import './installer2.mjs';
import '../shared/ccjk.DcXM9drZ.mjs';
import 'node:stream';
import 'node:stream/promises';
import 'tar';
import './smart-guide.mjs';
import './ccu.mjs';
import './commands.mjs';
import './check-updates.mjs';
import './config-switch.mjs';
import './claude-code-config-manager.mjs';
import './doctor.mjs';
import './api-providers.mjs';
import '../shared/ccjk.pi0nsyn3.mjs';
import '../shared/ccjk.J8YiPsOw.mjs';
import '../shared/ccjk.DzcJpOoy.mjs';
import './notification.mjs';
import 'node:buffer';
import '../shared/ccjk.BAGoDD49.mjs';
import 'stream';
import './uninstall.mjs';
import 'fs-extra';
import '../shared/ccjk.DGjQxTq_.mjs';
import 'trash';
import './update.mjs';

async function ccr(options = {}) {
  try {
    if (!options.skipBanner) {
      displayBannerWithInfo();
    }
    const continueInCcr = await showCcrMenu();
    if (!continueInCcr && !options.skipBanner) {
      await showMainMenu();
    }
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}

export { ccr };
