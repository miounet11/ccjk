import { randomUUID, createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { release, platform, type, homedir, hostname } from 'node:os';
import { join } from 'pathe';
import { CCJK_CONFIG_DIR } from './constants.mjs';
import './index.mjs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';

const CLOUD_CONFIG_DIR = join(CCJK_CONFIG_DIR, "cloud");
const DEVICE_CONFIG_FILE = join(CLOUD_CONFIG_DIR, "device.json");
const CLOUD_STATE_FILE = join(CLOUD_CONFIG_DIR, "state.json");
const CLOUD_API_ENDPOINT = "https://api.api.claudehome.cn/v1";
const AUTO_SYNC_INTERVAL = 30 * 60 * 1e3;
const AUTO_UPGRADE_CHECK_INTERVAL = 6 * 60 * 60 * 1e3;
function generateDeviceFingerprint() {
  const data = [
    platform(),
    type(),
    homedir().split("/").length.toString(),
    // 只用路径深度，不用实际路径
    hostname().length.toString()
    // 只用主机名长度，不用实际名称
  ].join("|");
  return createHash("sha256").update(data).digest("hex").substring(0, 32);
}
function getOrCreateDeviceInfo() {
  ensureCloudConfigDir();
  if (existsSync(DEVICE_CONFIG_FILE)) {
    try {
      const data = readFileSync(DEVICE_CONFIG_FILE, "utf-8");
      const device2 = JSON.parse(data);
      device2.lastActiveAt = (/* @__PURE__ */ new Date()).toISOString();
      writeFileSync(DEVICE_CONFIG_FILE, JSON.stringify(device2, null, 2));
      return device2;
    } catch {
    }
  }
  const device = {
    deviceId: randomUUID(),
    fingerprint: generateDeviceFingerprint(),
    registeredAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
    osType: platform(),
    osVersion: release(),
    ccjkVersion: getCcjkVersion()
  };
  writeFileSync(DEVICE_CONFIG_FILE, JSON.stringify(device, null, 2));
  return device;
}
function getCcjkVersion() {
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
function ensureCloudConfigDir() {
  if (!existsSync(CLOUD_CONFIG_DIR)) {
    mkdirSync(CLOUD_CONFIG_DIR, { recursive: true });
  }
}
function getCloudState() {
  ensureCloudConfigDir();
  if (existsSync(CLOUD_STATE_FILE)) {
    try {
      const data = readFileSync(CLOUD_STATE_FILE, "utf-8");
      return JSON.parse(data);
    } catch {
    }
  }
  return {
    initialized: false,
    autoSyncEnabled: true,
    silentUpgradeEnabled: true,
    lastSyncAt: null,
    lastUpgradeCheckAt: null,
    lastUpgradedAt: null,
    syncStats: {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0
    },
    upgradeStats: {
      totalChecks: 0,
      upgradesApplied: 0,
      upgradesFailed: 0
    }
  };
}
function saveCloudState(state) {
  ensureCloudConfigDir();
  writeFileSync(CLOUD_STATE_FILE, JSON.stringify(state, null, 2));
}
function updateCloudState(updates) {
  const state = getCloudState();
  const newState = { ...state, ...updates };
  saveCloudState(newState);
  return newState;
}
async function autoBootstrap() {
  try {
    const state = getCloudState();
    if (!state.initialized) {
      await initializeCloudServices();
    }
    await performHandshake();
    if (state.silentUpgradeEnabled) {
      await checkAndPerformSilentUpgrade();
    }
    if (state.autoSyncEnabled) {
      await performAutoSync();
    }
  } catch {
  }
}
async function initializeCloudServices() {
  const device = getOrCreateDeviceInfo();
  updateCloudState({
    initialized: true,
    autoSyncEnabled: true,
    silentUpgradeEnabled: true
  });
  try {
    await registerDevice(device);
  } catch {
  }
}
async function registerDevice(device) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5e3);
  try {
    await fetch(`${CLOUD_API_ENDPOINT}/devices/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `CCJK/${device.ccjkVersion}`
      },
      body: JSON.stringify({
        deviceId: device.deviceId,
        fingerprint: device.fingerprint,
        osType: device.osType,
        osVersion: device.osVersion,
        ccjkVersion: device.ccjkVersion
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
async function performHandshake() {
  const device = getOrCreateDeviceInfo();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5e3);
  try {
    const response = await fetch(`${CLOUD_API_ENDPOINT}/handshake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `CCJK/${device.ccjkVersion}`,
        "X-Device-ID": device.deviceId
      },
      body: JSON.stringify({
        deviceId: device.deviceId,
        ccjkVersion: device.ccjkVersion
      }),
      signal: controller.signal
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
}
async function checkAndPerformSilentUpgrade() {
  const state = getCloudState();
  const now = Date.now();
  if (state.lastUpgradeCheckAt) {
    const lastCheck = new Date(state.lastUpgradeCheckAt).getTime();
    if (now - lastCheck < AUTO_UPGRADE_CHECK_INTERVAL) {
      return { success: true, upgraded: false };
    }
  }
  updateCloudState({
    lastUpgradeCheckAt: (/* @__PURE__ */ new Date()).toISOString(),
    upgradeStats: {
      ...state.upgradeStats,
      totalChecks: state.upgradeStats.totalChecks + 1
    }
  });
  try {
    const updateInfo = await checkForUpdates();
    if (updateInfo.hasUpdate) {
      const result = await performSilentUpgrade(updateInfo.latestVersion);
      if (result.success && result.upgraded) {
        updateCloudState({
          lastUpgradedAt: (/* @__PURE__ */ new Date()).toISOString(),
          upgradeStats: {
            ...getCloudState().upgradeStats,
            upgradesApplied: getCloudState().upgradeStats.upgradesApplied + 1
          }
        });
      }
      return result;
    }
    return { success: true, upgraded: false };
  } catch (error) {
    updateCloudState({
      upgradeStats: {
        ...getCloudState().upgradeStats,
        upgradesFailed: getCloudState().upgradeStats.upgradesFailed + 1
      }
    });
    return {
      success: false,
      upgraded: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function checkForUpdates() {
  const currentVersion = getCcjkVersion();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1e4);
  try {
    const response = await fetch("https://registry.npmjs.org/ccjk/latest", {
      signal: controller.signal
    });
    if (response.ok) {
      const data = await response.json();
      const latestVersion = data.version;
      return {
        hasUpdate: isNewerVersion(latestVersion, currentVersion),
        latestVersion,
        currentVersion
      };
    }
  } catch {
  } finally {
    clearTimeout(timeoutId);
  }
  return { hasUpdate: false, latestVersion: currentVersion, currentVersion };
}
function isNewerVersion(latest, current) {
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
async function performSilentUpgrade(targetVersion) {
  const currentVersion = getCcjkVersion();
  try {
    const { exec } = await import('tinyexec');
    const result = await exec("npm", ["update", "-g", "ccjk"], {
      timeout: 6e4
      // 60 秒超时
    });
    if (result.exitCode === 0) {
      return {
        success: true,
        upgraded: true,
        fromVersion: currentVersion,
        toVersion: targetVersion
      };
    }
    return {
      success: false,
      upgraded: false,
      error: result.stderr || "Upgrade failed"
    };
  } catch (error) {
    return {
      success: false,
      upgraded: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function performAutoSync() {
  const state = getCloudState();
  const now = Date.now();
  if (state.lastSyncAt) {
    const lastSync = new Date(state.lastSyncAt).getTime();
    if (now - lastSync < AUTO_SYNC_INTERVAL) {
      return;
    }
  }
  try {
    await syncToCloud();
    updateCloudState({
      lastSyncAt: (/* @__PURE__ */ new Date()).toISOString(),
      syncStats: {
        ...state.syncStats,
        totalSyncs: state.syncStats.totalSyncs + 1,
        successfulSyncs: state.syncStats.successfulSyncs + 1
      }
    });
  } catch {
    updateCloudState({
      syncStats: {
        ...state.syncStats,
        totalSyncs: state.syncStats.totalSyncs + 1,
        failedSyncs: state.syncStats.failedSyncs + 1
      }
    });
  }
}
async function syncToCloud() {
  const device = getOrCreateDeviceInfo();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3e4);
  try {
    const syncData = await collectSyncData();
    await fetch(`${CLOUD_API_ENDPOINT}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `CCJK/${device.ccjkVersion}`,
        "X-Device-ID": device.deviceId
      },
      body: JSON.stringify(syncData),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
async function collectSyncData() {
  const device = getOrCreateDeviceInfo();
  return {
    deviceId: device.deviceId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    // 只同步匿名化的使用统计
    stats: {
      osType: device.osType,
      ccjkVersion: device.ccjkVersion
    }
  };
}

export { AUTO_SYNC_INTERVAL, AUTO_UPGRADE_CHECK_INTERVAL, CLOUD_API_ENDPOINT, CLOUD_CONFIG_DIR, CLOUD_STATE_FILE, DEVICE_CONFIG_FILE, autoBootstrap, autoBootstrap as bootstrap, checkAndPerformSilentUpgrade as checkUpgrade, getCloudState, getOrCreateDeviceInfo, saveCloudState, performAutoSync as sync, updateCloudState };
