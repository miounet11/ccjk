import { existsSync, readFileSync, writeFileSync, appendFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { platform } from 'node:os';
import process__default from 'node:process';
import { join } from 'pathe';
import { CCJK_CONFIG_DIR } from './constants.mjs';
import { getCloudState, updateCloudState } from './auto-bootstrap.mjs';
import './index.mjs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'node:crypto';

const UPGRADE_LOG_DIR = join(CCJK_CONFIG_DIR, "cloud", "logs");
const UPGRADE_LOG_FILE = join(UPGRADE_LOG_DIR, "upgrades.log");
const UPGRADE_LOCK_FILE = join(CCJK_CONFIG_DIR, "cloud", ".upgrade.lock");
const UPGRADE_CHECK_INTERVAL = 6 * 60 * 60 * 1e3;
const UPGRADE_TIMEOUT = 5 * 60 * 1e3;
async function checkAllToolVersions() {
  const results = [];
  const [ccjk, claudeCode, ccr] = await Promise.all([
    checkCcjkVersion(),
    checkClaudeCodeVersion(),
    checkCcrVersion()
  ]);
  results.push(ccjk, claudeCode, ccr);
  return results;
}
async function checkCcjkVersion() {
  try {
    const currentVersion = getCurrentCcjkVersion();
    const latestVersion = await fetchLatestNpmVersion("ccjk");
    return {
      tool: "ccjk",
      installed: true,
      currentVersion,
      latestVersion,
      needsUpdate: latestVersion ? isNewerVersion(latestVersion, currentVersion) : false,
      installMethod: "npm"
    };
  } catch {
    return {
      tool: "ccjk",
      installed: true,
      currentVersion: getCurrentCcjkVersion(),
      latestVersion: null,
      needsUpdate: false,
      installMethod: "npm"
    };
  }
}
async function checkClaudeCodeVersion() {
  try {
    const { exec } = await import('tinyexec');
    const result = await exec("claude", ["--version"], { timeout: 5e3 });
    if (result.exitCode !== 0) {
      return {
        tool: "claude-code",
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false,
        installMethod: "unknown"
      };
    }
    const currentVersion = result.stdout.trim().replace(/^v/, "");
    const latestVersion = await fetchLatestNpmVersion("@anthropic-ai/claude-code");
    const installMethod = await detectClaudeCodeInstallMethod();
    return {
      tool: "claude-code",
      installed: true,
      currentVersion,
      latestVersion,
      needsUpdate: latestVersion ? isNewerVersion(latestVersion, currentVersion) : false,
      installMethod
    };
  } catch {
    return {
      tool: "claude-code",
      installed: false,
      currentVersion: null,
      latestVersion: null,
      needsUpdate: false,
      installMethod: "unknown"
    };
  }
}
async function checkCcrVersion() {
  try {
    const { exec } = await import('tinyexec');
    const result = await exec("ccr", ["--version"], { timeout: 5e3 });
    if (result.exitCode !== 0) {
      return {
        tool: "ccr",
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false,
        installMethod: "unknown"
      };
    }
    const currentVersion = result.stdout.trim().replace(/^v/, "");
    const latestVersion = await fetchLatestNpmVersion("@musistudio/claude-code-router");
    return {
      tool: "ccr",
      installed: true,
      currentVersion,
      latestVersion,
      needsUpdate: latestVersion ? isNewerVersion(latestVersion, currentVersion) : false,
      installMethod: "npm"
    };
  } catch {
    return {
      tool: "ccr",
      installed: false,
      currentVersion: null,
      latestVersion: null,
      needsUpdate: false,
      installMethod: "unknown"
    };
  }
}
function getCurrentCcjkVersion() {
  try {
    const packagePath = join(__dirname, "../../../package.json");
    if (existsSync(packagePath)) {
      const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
      return pkg.version || "unknown";
    }
  } catch {
  }
  return "unknown";
}
async function fetchLatestNpmVersion(packageName) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1e4);
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
      signal: controller.signal
    });
    if (response.ok) {
      const data = await response.json();
      return data.version;
    }
  } catch {
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
}
async function detectClaudeCodeInstallMethod() {
  try {
    const { exec } = await import('tinyexec');
    if (platform() === "darwin") {
      const brewResult = await exec("brew", ["list", "--cask", "claude-code"], { timeout: 5e3 });
      if (brewResult.exitCode === 0) {
        return "homebrew";
      }
    }
    const npmResult = await exec("npm", ["list", "-g", "@anthropic-ai/claude-code"], { timeout: 5e3 });
    if (npmResult.exitCode === 0 && npmResult.stdout.includes("@anthropic-ai/claude-code")) {
      return "npm";
    }
    return "curl";
  } catch {
    return "unknown";
  }
}
function isNewerVersion(latest, current) {
  if (!latest || !current || current === "unknown")
    return false;
  const latestParts = latest.split(".").map(Number);
  const currentParts = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c)
      return true;
    if (l < c)
      return false;
  }
  return false;
}
async function performSilentUpgradeAll() {
  const startTime = Date.now();
  const results = [];
  if (isUpgradeLocked()) {
    return {
      success: false,
      results: [],
      totalDuration: 0,
      upgradedCount: 0,
      failedCount: 0
    };
  }
  try {
    createUpgradeLock();
    const versions = await checkAllToolVersions();
    const toolsToUpgrade = versions.filter((v) => v.needsUpdate && v.installed);
    for (const tool of toolsToUpgrade) {
      const result = await upgradeTool(tool);
      results.push(result);
      logUpgrade({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        tool: tool.tool,
        fromVersion: tool.currentVersion || "unknown",
        toVersion: tool.latestVersion || "unknown",
        success: result.success,
        error: result.error,
        duration: result.duration
      });
    }
    const totalDuration = Date.now() - startTime;
    const upgradedCount = results.filter((r) => r.upgraded).length;
    const failedCount = results.filter((r) => !r.success).length;
    const state = getCloudState();
    updateCloudState({
      lastUpgradeCheckAt: (/* @__PURE__ */ new Date()).toISOString(),
      upgradeStats: {
        totalChecks: state.upgradeStats.totalChecks + 1,
        upgradesApplied: state.upgradeStats.upgradesApplied + upgradedCount,
        upgradesFailed: state.upgradeStats.upgradesFailed + failedCount
      }
    });
    return {
      success: failedCount === 0,
      results,
      totalDuration,
      upgradedCount,
      failedCount
    };
  } finally {
    releaseUpgradeLock();
  }
}
async function upgradeTool(info) {
  const startTime = Date.now();
  try {
    switch (info.tool) {
      case "ccjk":
        return await upgradeCcjk(info, startTime);
      case "claude-code":
        return await upgradeClaudeCode(info, startTime);
      case "ccr":
        return await upgradeCcr(info, startTime);
      default:
        return {
          tool: info.tool,
          success: false,
          upgraded: false,
          error: "Unknown tool",
          duration: Date.now() - startTime
        };
    }
  } catch (error) {
    return {
      tool: info.tool,
      success: false,
      upgraded: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime
    };
  }
}
async function upgradeCcjk(info, startTime) {
  const { exec } = await import('tinyexec');
  const result = await exec("npm", ["update", "-g", "ccjk"], {
    timeout: UPGRADE_TIMEOUT
  });
  return {
    tool: "ccjk",
    success: result.exitCode === 0,
    upgraded: result.exitCode === 0,
    fromVersion: info.currentVersion || void 0,
    toVersion: info.latestVersion || void 0,
    error: result.exitCode !== 0 ? result.stderr : void 0,
    duration: Date.now() - startTime
  };
}
async function upgradeClaudeCode(info, startTime) {
  const { exec } = await import('tinyexec');
  let result;
  switch (info.installMethod) {
    case "homebrew":
      result = await exec("brew", ["upgrade", "--cask", "claude-code"], {
        timeout: UPGRADE_TIMEOUT
      });
      break;
    case "npm":
      result = await exec("npm", ["update", "-g", "@anthropic-ai/claude-code"], {
        timeout: UPGRADE_TIMEOUT
      });
      break;
    case "curl":
    default:
      result = await exec("claude", ["update"], {
        timeout: UPGRADE_TIMEOUT
      });
      break;
  }
  return {
    tool: "claude-code",
    success: result.exitCode === 0,
    upgraded: result.exitCode === 0,
    fromVersion: info.currentVersion || void 0,
    toVersion: info.latestVersion || void 0,
    error: result.exitCode !== 0 ? result.stderr : void 0,
    duration: Date.now() - startTime
  };
}
async function upgradeCcr(info, startTime) {
  const { exec } = await import('tinyexec');
  const result = await exec("npm", ["update", "-g", "@musistudio/claude-code-router"], {
    timeout: UPGRADE_TIMEOUT
  });
  return {
    tool: "ccr",
    success: result.exitCode === 0,
    upgraded: result.exitCode === 0,
    fromVersion: info.currentVersion || void 0,
    toVersion: info.latestVersion || void 0,
    error: result.exitCode !== 0 ? result.stderr : void 0,
    duration: Date.now() - startTime
  };
}
function isUpgradeLocked() {
  if (!existsSync(UPGRADE_LOCK_FILE)) {
    return false;
  }
  try {
    const lockData = JSON.parse(readFileSync(UPGRADE_LOCK_FILE, "utf-8"));
    const lockTime = new Date(lockData.timestamp).getTime();
    const now = Date.now();
    if (now - lockTime > 10 * 60 * 1e3) {
      releaseUpgradeLock();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
function createUpgradeLock() {
  ensureLogDir();
  writeFileSync(UPGRADE_LOCK_FILE, JSON.stringify({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    pid: process__default.pid
  }));
}
function releaseUpgradeLock() {
  try {
    if (existsSync(UPGRADE_LOCK_FILE)) {
      unlinkSync(UPGRADE_LOCK_FILE);
    }
  } catch {
  }
}
function ensureLogDir() {
  if (!existsSync(UPGRADE_LOG_DIR)) {
    mkdirSync(UPGRADE_LOG_DIR, { recursive: true });
  }
}
function logUpgrade(entry) {
  ensureLogDir();
  const logLine = [
    entry.timestamp,
    entry.tool,
    entry.fromVersion,
    "->",
    entry.toVersion,
    entry.success ? "SUCCESS" : "FAILED",
    entry.error || "",
    `${entry.duration}ms`
  ].join(" | ");
  appendFileSync(UPGRADE_LOG_FILE, `${logLine}
`);
}
function shouldCheckForUpgrades() {
  const state = getCloudState();
  if (!state.silentUpgradeEnabled) {
    return false;
  }
  if (!state.lastUpgradeCheckAt) {
    return true;
  }
  const lastCheck = new Date(state.lastUpgradeCheckAt).getTime();
  const now = Date.now();
  return now - lastCheck >= UPGRADE_CHECK_INTERVAL;
}
async function checkAndUpgradeIfNeeded() {
  if (!shouldCheckForUpgrades()) {
    return null;
  }
  return performSilentUpgradeAll();
}

export { UPGRADE_CHECK_INTERVAL, UPGRADE_LOCK_FILE, UPGRADE_LOG_DIR, UPGRADE_LOG_FILE, UPGRADE_TIMEOUT, checkAndUpgradeIfNeeded as autoUpgrade, checkAllToolVersions, checkAndUpgradeIfNeeded, checkAllToolVersions as checkVersions, performSilentUpgradeAll, shouldCheckForUpgrades, performSilentUpgradeAll as upgradeAll };
