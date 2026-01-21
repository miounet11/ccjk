import process__default from 'node:process';
import ansis from 'ansis';
import ora from 'ora';
import semver from 'semver';
import { exec } from 'tinyexec';
import { version } from './package.mjs';
import { S as STATUS } from '../shared/ccjk.BpHTUkb8.mjs';
import './index.mjs';
import 'node:fs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';

async function checkClaudeCodeVersion() {
  try {
    const result = await exec("claude", ["--version"], { throwOnError: false });
    const currentMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
    const current = currentMatch ? currentMatch[1] : "unknown";
    const npmResult = await exec("npm", ["view", "@anthropic-ai/claude-code", "version"], { throwOnError: false });
    const latest = npmResult.stdout.trim() || current;
    return {
      current,
      latest,
      updateAvailable: current !== "unknown" && semver.lt(current, latest),
      releaseUrl: "https://github.com/anthropics/claude-code/releases"
    };
  } catch {
    return {
      current: "unknown",
      latest: "unknown",
      updateAvailable: false
    };
  }
}
async function checkCcjkVersion() {
  try {
    const npmResult = await exec("npm", ["view", "ccjk", "version"], { throwOnError: false });
    const latest = npmResult.stdout.trim() || version;
    return {
      current: version,
      latest,
      updateAvailable: semver.lt(version, latest),
      releaseUrl: "https://github.com/ccjk/ccjk/releases"
    };
  } catch {
    return {
      current: version,
      latest: version,
      updateAvailable: false
    };
  }
}
async function checkPluginVersions() {
  return [];
}
async function upgradeClaudeCode() {
  const spinner = ora("Checking Claude Code version...").start();
  try {
    const versionInfo = await checkClaudeCodeVersion();
    if (!versionInfo.updateAvailable) {
      spinner.succeed(`Claude Code is already up to date (v${versionInfo.current})`);
      return {
        success: true,
        previousVersion: versionInfo.current,
        newVersion: versionInfo.current
      };
    }
    spinner.text = `Upgrading Claude Code from v${versionInfo.current} to v${versionInfo.latest}...`;
    const result = await exec("npm", ["install", "-g", "@anthropic-ai/claude-code@latest"], { throwOnError: false });
    if (result.exitCode === 0) {
      spinner.succeed(`Claude Code upgraded to v${versionInfo.latest}`);
      return {
        success: true,
        previousVersion: versionInfo.current,
        newVersion: versionInfo.latest
      };
    }
    if (process__default.platform !== "win32") {
      spinner.text = "Retrying with elevated permissions...";
      const sudoResult = await exec("sudo", ["npm", "install", "-g", "@anthropic-ai/claude-code@latest"], { throwOnError: false });
      if (sudoResult.exitCode === 0) {
        spinner.succeed(`Claude Code upgraded to v${versionInfo.latest}`);
        return {
          success: true,
          previousVersion: versionInfo.current,
          newVersion: versionInfo.latest
        };
      }
    }
    spinner.fail("Failed to upgrade Claude Code");
    return {
      success: false,
      previousVersion: versionInfo.current,
      error: "npm install failed"
    };
  } catch (error) {
    spinner.fail("Failed to upgrade Claude Code");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function upgradeCcjk() {
  const spinner = ora("Checking CCJK version...").start();
  try {
    const versionInfo = await checkCcjkVersion();
    if (!versionInfo.updateAvailable) {
      spinner.succeed(`CCJK is already up to date (v${versionInfo.current})`);
      return {
        success: true,
        previousVersion: versionInfo.current,
        newVersion: versionInfo.current
      };
    }
    spinner.text = `Upgrading CCJK from v${versionInfo.current} to v${versionInfo.latest}...`;
    const result = await exec("npm", ["install", "-g", "ccjk@latest"], { throwOnError: false });
    if (result.exitCode === 0) {
      spinner.succeed(`CCJK upgraded to v${versionInfo.latest}`);
      return {
        success: true,
        previousVersion: versionInfo.current,
        newVersion: versionInfo.latest
      };
    }
    spinner.fail("Failed to upgrade CCJK");
    return {
      success: false,
      previousVersion: versionInfo.current,
      error: "npm install failed"
    };
  } catch (error) {
    spinner.fail("Failed to upgrade CCJK");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function upgradePlugin(_pluginId) {
  return {
    success: false,
    error: "Plugin upgrade not yet implemented"
  };
}
async function upgradeAllPlugins() {
  const plugins = await checkPluginVersions();
  const results = [];
  for (const plugin of plugins) {
    if (plugin.updateAvailable) {
      const result = await upgradePlugin(plugin.name);
      results.push(result);
    }
  }
  return results;
}
async function checkAllVersions() {
  console.log(ansis.green("\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 Version Check \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n"));
  const claudeCode = await checkClaudeCodeVersion();
  if (claudeCode.updateAvailable) {
    console.log(STATUS.warning(`Claude Code: v${claudeCode.current} \u2192 v${claudeCode.latest} (update available)`));
  } else {
    console.log(STATUS.success(`Claude Code: v${claudeCode.current} (up to date)`));
  }
  const ccjk = await checkCcjkVersion();
  if (ccjk.updateAvailable) {
    console.log(STATUS.warning(`CCJK: v${ccjk.current} \u2192 v${ccjk.latest} (update available)`));
  } else {
    console.log(STATUS.success(`CCJK: v${ccjk.current} (up to date)`));
  }
  const plugins = await checkPluginVersions();
  if (plugins.length > 0) {
    console.log("\nPlugins:");
    for (const plugin of plugins) {
      if (plugin.updateAvailable) {
        console.log(STATUS.warning(`  ${plugin.name}: v${plugin.current} \u2192 v${plugin.latest}`));
      } else {
        console.log(STATUS.success(`  ${plugin.name}: v${plugin.current}`));
      }
    }
  }
  console.log("");
}
async function upgradeAll() {
  console.log(ansis.green("\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 Upgrading All \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n"));
  await upgradeClaudeCode();
  await upgradeCcjk();
  const pluginResults = await upgradeAllPlugins();
  if (pluginResults.length > 0) {
    console.log(`
Upgraded ${pluginResults.filter((r) => r.success).length}/${pluginResults.length} plugins`);
  }
  console.log("");
}

export { checkAllVersions, checkCcjkVersion, checkClaudeCodeVersion, checkPluginVersions, upgradeAll, upgradeAllPlugins, upgradeCcjk, upgradeClaudeCode, upgradePlugin };
