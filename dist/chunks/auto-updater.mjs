import ansis from 'ansis';
import ora from 'ora';
import { exec } from 'tinyexec';
import { ensureI18nInitialized, i18n, format } from './index.mjs';
import { s as shouldUseSudoForGlobalInstall } from './platform.mjs';
import { p as promptBoolean } from '../shared/ccjk.DHbrGcgg.mjs';
import { checkClaudeCodeVersion, fixBrokenNpmSymlink, checkCcrVersion, handleDuplicateInstallations, checkCometixLineVersion } from './version-checker.mjs';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';
import 'node:os';
import 'inquirer-toggle';
import 'node:child_process';
import 'node:path';
import 'node:util';
import 'semver';

async function execWithSudoIfNeeded(command, args) {
  const needsSudo = shouldUseSudoForGlobalInstall();
  if (needsSudo) {
    console.log(ansis.yellow(`
${i18n.t("updater:usingSudo")}`));
    const result = await exec("sudo", [command, ...args]);
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}`);
    }
    return { usedSudo: true };
  } else {
    const result = await exec(command, args);
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}`);
    }
    return { usedSudo: false };
  }
}
async function updateCcr(force = false, skipPrompt = false) {
  ensureI18nInitialized();
  const spinner = ora(i18n.t("updater:checkingVersion")).start();
  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCcrVersion();
    spinner.stop();
    if (!installed) {
      console.log(ansis.yellow(i18n.t("updater:ccrNotInstalled")));
      return false;
    }
    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t("updater:ccrUpToDate"), { version: currentVersion || "" })));
      return true;
    }
    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t("updater:cannotCheckVersion")));
      return false;
    }
    console.log(ansis.green(format(i18n.t("updater:currentVersion"), { version: currentVersion || "" })));
    console.log(ansis.green(format(i18n.t("updater:latestVersion"), { version: latestVersion })));
    if (!skipPrompt) {
      const confirm = await promptBoolean({
        message: format(i18n.t("updater:confirmUpdate"), { tool: "CCR" }),
        defaultValue: true
      });
      if (!confirm) {
        console.log(ansis.gray(i18n.t("updater:updateSkipped")));
        return true;
      }
    } else {
      console.log(ansis.green(format(i18n.t("updater:autoUpdating"), { tool: "CCR" })));
    }
    const updateSpinner = ora(format(i18n.t("updater:updating"), { tool: "CCR" })).start();
    try {
      await execWithSudoIfNeeded("npm", ["update", "-g", "@musistudio/claude-code-router"]);
      updateSpinner.succeed(format(i18n.t("updater:updateSuccess"), { tool: "CCR" }));
      return true;
    } catch (error) {
      updateSpinner.fail(format(i18n.t("updater:updateFailed"), { tool: "CCR" }));
      console.error(ansis.red(error instanceof Error ? error.message : String(error)));
      return false;
    }
  } catch (error) {
    spinner.fail(i18n.t("updater:checkFailed"));
    console.error(ansis.red(error instanceof Error ? error.message : String(error)));
    return false;
  }
}
async function updateClaudeCode(force = false, skipPrompt = false) {
  ensureI18nInitialized();
  const spinner = ora(i18n.t("updater:checkingVersion")).start();
  try {
    const { installed, currentVersion, latestVersion, needsUpdate, isHomebrew, installationSource, isBroken } = await checkClaudeCodeVersion();
    spinner.stop();
    if (!installed) {
      console.log(ansis.yellow(i18n.t("updater:claudeCodeNotInstalled")));
      return false;
    }
    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t("updater:claudeCodeUpToDate"), { version: currentVersion || "" })));
      return true;
    }
    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t("updater:cannotCheckVersion")));
      return false;
    }
    console.log(ansis.green(format(i18n.t("updater:currentVersion"), { version: currentVersion || "" })));
    console.log(ansis.green(format(i18n.t("updater:latestVersion"), { version: latestVersion })));
    if (isBroken) {
      console.log(ansis.yellow(i18n.t("updater:installationBroken")));
      const fixResult = await fixBrokenNpmSymlink();
      if (fixResult.fixed) {
        console.log(ansis.green(`\u2714 ${i18n.t("updater:symlinkFixed")}: ${fixResult.message}`));
        const recheckResult = await checkClaudeCodeVersion();
        if (!recheckResult.isBroken) {
          console.log(ansis.green(i18n.t("updater:installationRepaired")));
          if (!recheckResult.needsUpdate && !force) {
            console.log(ansis.green(format(i18n.t("updater:claudeCodeUpToDate"), { version: recheckResult.currentVersion || "" })));
            return true;
          }
        }
      } else {
        console.log(ansis.gray(`\u2139 ${fixResult.message}`));
      }
    }
    if (!skipPrompt) {
      const confirm = await promptBoolean({
        message: format(i18n.t("updater:confirmUpdate"), { tool: "Claude Code" }),
        defaultValue: true
      });
      if (!confirm) {
        console.log(ansis.gray(i18n.t("updater:updateSkipped")));
        return true;
      }
    } else {
      console.log(ansis.green(format(i18n.t("updater:autoUpdating"), { tool: "Claude Code" })));
    }
    const toolName = isHomebrew ? "Claude Code (Homebrew)" : "Claude Code";
    const updateSpinner = ora(format(i18n.t("updater:updating"), { tool: toolName })).start();
    try {
      if (isHomebrew) {
        const result = await exec("brew", ["upgrade", "--cask", "claude-code"]);
        if (result.exitCode !== 0) {
          throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}`);
        }
      } else {
        if (isBroken) {
          if (installationSource === "npm") {
            await execWithSudoIfNeeded("npm", ["install", "-g", "@anthropic-ai/claude-code"]);
          } else if (installationSource === "curl") {
            const { detectAllClaudeCodeInstallations } = await import('./version-checker.mjs');
            const installations = await detectAllClaudeCodeInstallations();
            const curlInstall = installations.find((i) => i.source === "curl" && i.version);
            if (curlInstall?.path) {
              await execWithSudoIfNeeded(curlInstall.path, ["update"]);
            } else {
              throw new Error(i18n.t("updater:curlReinstallRequired"));
            }
          } else {
            const { detectAllClaudeCodeInstallations } = await import('./version-checker.mjs');
            const installations = await detectAllClaudeCodeInstallations();
            const activeInstall = installations.find((i) => i.version);
            if (activeInstall?.path) {
              await execWithSudoIfNeeded(activeInstall.path, ["update"]);
            } else {
              throw new Error(i18n.t("updater:curlReinstallRequired"));
            }
          }
        } else {
          await execWithSudoIfNeeded("claude", ["update"]);
        }
      }
      updateSpinner.succeed(format(i18n.t("updater:updateSuccess"), { tool: "Claude Code" }));
      return true;
    } catch (error) {
      updateSpinner.fail(format(i18n.t("updater:updateFailed"), { tool: "Claude Code" }));
      console.error(ansis.red(error instanceof Error ? error.message : String(error)));
      return false;
    }
  } catch (error) {
    spinner.fail(i18n.t("updater:checkFailed"));
    console.error(ansis.red(error instanceof Error ? error.message : String(error)));
    return false;
  }
}
async function updateCometixLine(force = false, skipPrompt = false) {
  ensureI18nInitialized();
  const spinner = ora(i18n.t("updater:checkingVersion")).start();
  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCometixLineVersion();
    spinner.stop();
    if (!installed) {
      console.log(ansis.yellow(i18n.t("updater:cometixLineNotInstalled")));
      return false;
    }
    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t("updater:cometixLineUpToDate"), { version: currentVersion || "" })));
      return true;
    }
    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t("updater:cannotCheckVersion")));
      return false;
    }
    console.log(ansis.green(format(i18n.t("updater:currentVersion"), { version: currentVersion || "" })));
    console.log(ansis.green(format(i18n.t("updater:latestVersion"), { version: latestVersion })));
    if (!skipPrompt) {
      const confirm = await promptBoolean({
        message: format(i18n.t("updater:confirmUpdate"), { tool: "CCometixLine" }),
        defaultValue: true
      });
      if (!confirm) {
        console.log(ansis.gray(i18n.t("updater:updateSkipped")));
        return true;
      }
    } else {
      console.log(ansis.green(format(i18n.t("updater:autoUpdating"), { tool: "CCometixLine" })));
    }
    const updateSpinner = ora(format(i18n.t("updater:updating"), { tool: "CCometixLine" })).start();
    try {
      await execWithSudoIfNeeded("npm", ["update", "-g", "@cometix/ccline"]);
      updateSpinner.succeed(format(i18n.t("updater:updateSuccess"), { tool: "CCometixLine" }));
      return true;
    } catch (error) {
      updateSpinner.fail(format(i18n.t("updater:updateFailed"), { tool: "CCometixLine" }));
      console.error(ansis.red(error instanceof Error ? error.message : String(error)));
      return false;
    }
  } catch (error) {
    spinner.fail(i18n.t("updater:checkFailed"));
    console.error(ansis.red(error instanceof Error ? error.message : String(error)));
    return false;
  }
}
async function checkAndUpdateTools(skipPrompt = false) {
  ensureI18nInitialized();
  console.log(ansis.bold.cyan(`
\u{1F50D} ${i18n.t("updater:checkingTools")}
`));
  try {
    const duplicateResult = await handleDuplicateInstallations(skipPrompt);
    if (duplicateResult.hadDuplicates) {
      console.log();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(ansis.yellow(`\u26A0 Duplicate installation check failed: ${errorMessage}`));
  }
  const results = [];
  try {
    const success = await updateCcr(false, skipPrompt);
    results.push({ tool: "CCR", success });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(ansis.red(`\u274C ${format(i18n.t("updater:updateFailed"), { tool: "CCR" })}: ${errorMessage}`));
    results.push({ tool: "CCR", success: false, error: errorMessage });
  }
  console.log();
  try {
    const success = await updateClaudeCode(false, skipPrompt);
    results.push({ tool: "Claude Code", success });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(ansis.red(`\u274C ${format(i18n.t("updater:updateFailed"), { tool: "Claude Code" })}: ${errorMessage}`));
    results.push({ tool: "Claude Code", success: false, error: errorMessage });
  }
  console.log();
  try {
    const success = await updateCometixLine(false, skipPrompt);
    results.push({ tool: "CCometixLine", success });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(ansis.red(`\u274C ${format(i18n.t("updater:updateFailed"), { tool: "CCometixLine" })}: ${errorMessage}`));
    results.push({ tool: "CCometixLine", success: false, error: errorMessage });
  }
  if (skipPrompt) {
    console.log(ansis.bold.cyan(`
\u{1F4CB} ${i18n.t("updater:updateSummary")}`));
    for (const result of results) {
      if (result.success) {
        console.log(ansis.green(`\u2714 ${result.tool}: ${i18n.t("updater:success")}`));
      } else {
        console.log(ansis.red(`\u274C ${result.tool}: ${i18n.t("updater:failed")} ${result.error ? `(${result.error})` : ""}`));
      }
    }
  }
}

export { checkAndUpdateTools, execWithSudoIfNeeded, updateCcr, updateClaudeCode, updateCometixLine };
