import ansis from 'ansis';
import inquirer from 'inquirer';
import { i18n } from './index.mjs';
import * as fs from 'node:fs';
import fs__default, { existsSync, readFileSync, mkdirSync, unlinkSync } from 'node:fs';
import * as os from 'node:os';
import os__default, { homedir } from 'node:os';
import { join } from 'pathe';
import { writeFileAtomic } from './fs-operations.mjs';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import * as path from 'node:path';
import path__default from 'node:path';
import process__default from 'node:process';
import { promisify } from 'node:util';
import { c as commonjsGlobal } from '../shared/ccjk.BAGoDD49.mjs';
import require$$0 from 'stream';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'node:fs/promises';

const TOKEN_PREFIX = "ccjk_";
const TOKEN_LENGTH = 64;
const TOKEN_VERSION = 1;
function generateDeviceToken() {
  const randomBytes = crypto.randomBytes(TOKEN_LENGTH / 2);
  const randomHex = randomBytes.toString("hex");
  return `${TOKEN_PREFIX}${TOKEN_VERSION}${randomHex}`;
}
function isValidTokenFormat(token) {
  if (!token || typeof token !== "string") {
    return false;
  }
  if (!token.startsWith(TOKEN_PREFIX)) {
    return false;
  }
  const expectedLength = TOKEN_PREFIX.length + 1 + TOKEN_LENGTH;
  if (token.length !== expectedLength) {
    return false;
  }
  const version = token[TOKEN_PREFIX.length];
  if (!/^\d$/.test(version)) {
    return false;
  }
  const hexPart = token.slice(TOKEN_PREFIX.length + 1);
  if (!/^[a-f0-9]+$/i.test(hexPart)) {
    return false;
  }
  return true;
}
function getDeviceInfo() {
  return {
    name: os__default.hostname(),
    platform: os__default.platform(),
    osVersion: os__default.release(),
    arch: os__default.arch(),
    username: os__default.userInfo().username,
    machineId: generateMachineId()
  };
}
function generateMachineId() {
  const components = [
    os__default.hostname(),
    os__default.platform(),
    os__default.arch(),
    os__default.cpus()[0]?.model || "unknown",
    os__default.userInfo().username,
    // Add network interface MAC addresses for uniqueness
    ...Object.values(os__default.networkInterfaces()).flat().filter((iface) => iface && !iface.internal && iface.mac !== "00:00:00:00:00:00").map((iface) => iface?.mac).filter(Boolean).slice(0, 3)
    // Limit to first 3 MACs
  ];
  const combined = components.join("|");
  return crypto.createHash("sha256").update(combined).digest("hex").slice(0, 32);
}
function deriveEncryptionKey() {
  const machineId = generateMachineId();
  const salt = "ccjk-notification-token-v1";
  return crypto.pbkdf2Sync(machineId, salt, 1e5, 32, "sha256");
}
function encryptToken(token) {
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}
function decryptToken(encryptedToken) {
  try {
    const parts = encryptedToken.split(":");
    if (parts.length !== 3) {
      return null;
    }
    const [ivHex, authTagHex, encrypted] = parts;
    const key = deriveEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}
function maskToken(token) {
  if (!token || token.length < 12) {
    return "***";
  }
  const prefix = token.slice(0, TOKEN_PREFIX.length + 1);
  const suffix = token.slice(-4);
  return `${prefix}***...***${suffix}`;
}

const CLOUD_API_BASE_URL = "https://api.claudehome.cn";
const DEFAULT_TIMEOUT = 3e4;
const POLL_TIMEOUT$1 = 6e4;
const TOKEN_FILE_PATH = join(homedir(), ".ccjk", "cloud-token.json");
class CCJKCloudClient {
  baseUrl;
  deviceToken = null;
  deviceId = null;
  /**
   * Create a new CCJKCloudClient instance
   *
   * @param baseUrl - Cloud API base URL (default: https://api.claudehome.cn)
   */
  constructor(baseUrl = CLOUD_API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }
  // ==========================================================================
  // Token Management
  // ==========================================================================
  /**
   * Load token from storage file
   */
  loadToken() {
    try {
      if (existsSync(TOKEN_FILE_PATH)) {
        const data = readFileSync(TOKEN_FILE_PATH, "utf-8");
        const storage = JSON.parse(data);
        this.deviceToken = storage.deviceToken;
        this.deviceId = storage.deviceId || null;
      }
    } catch {
      this.deviceToken = null;
      this.deviceId = null;
    }
  }
  /**
   * Save token to storage file
   */
  saveToken(storage) {
    try {
      const dir = join(homedir(), ".ccjk");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileAtomic(TOKEN_FILE_PATH, JSON.stringify(storage, null, 2));
    } catch (error) {
      throw new Error(`Failed to save token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Check if device is bound
   */
  isBound() {
    return this.deviceToken !== null && this.deviceToken.length > 0;
  }
  /**
   * Get current device token
   */
  getDeviceToken() {
    return this.deviceToken;
  }
  /**
   * Get current device ID
   */
  getDeviceId() {
    return this.deviceId;
  }
  /**
   * Clear stored token (unbind device)
   */
  clearToken() {
    this.deviceToken = null;
    this.deviceId = null;
    try {
      if (existsSync(TOKEN_FILE_PATH)) {
        unlinkSync(TOKEN_FILE_PATH);
      }
    } catch {
    }
  }
  // ==========================================================================
  // Device Binding
  // ==========================================================================
  /**
   * Bind device using a binding code
   *
   * The binding code is obtained from the CCJK mobile app or web dashboard.
   * Once bound, the device can send and receive notifications.
   *
   * @param code - Binding code from mobile app
   * @param deviceInfo - Optional device information (auto-detected if not provided)
   * @returns Bind response with device token
   *
   * @example
   * ```typescript
   * const client = new CCJKCloudClient()
   * const result = await client.bind('ABC123')
   * if (result.success) {
   *   console.log('Device bound successfully!')
   * }
   * ```
   */
  async bind(code, deviceInfo) {
    const info = deviceInfo ? { ...getDeviceInfo(), ...deviceInfo } : getDeviceInfo();
    const response = await this.request("/bind/use", {
      method: "POST",
      body: JSON.stringify({
        code,
        deviceInfo: info
      })
    });
    if (response.success && response.data) {
      this.deviceToken = response.data.deviceToken;
      this.deviceId = response.data.deviceId;
      this.saveToken({
        deviceToken: response.data.deviceToken,
        deviceId: response.data.deviceId,
        bindingCode: code,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        deviceInfo: info
      });
      return {
        success: true,
        deviceToken: response.data.deviceToken,
        deviceId: response.data.deviceId
      };
    }
    return {
      success: false,
      error: response.error || "Failed to bind device",
      code: response.code
    };
  }
  // ==========================================================================
  // Notification Sending
  // ==========================================================================
  /**
   * Send a notification to the user
   *
   * @param options - Notification options
   * @returns Notification response
   *
   * @example
   * ```typescript
   * const client = new CCJKCloudClient()
   * await client.notify({
   *   title: 'Build Complete',
   *   body: 'Your project has been built successfully!',
   *   type: 'success'
   * })
   * ```
   */
  async notify(options) {
    if (!this.deviceToken) {
      return {
        success: false,
        error: 'Device not bound. Please run "ccjk notification bind <code>" first.',
        code: "NOT_BOUND"
      };
    }
    const response = await this.request("/notify", {
      method: "POST",
      body: JSON.stringify({
        title: options.title,
        body: options.body,
        type: options.type || "info",
        taskId: options.taskId,
        metadata: options.metadata,
        actions: options.actions
      })
    });
    if (response.success && response.data) {
      return {
        success: true,
        notificationId: response.data.notificationId
      };
    }
    return {
      success: false,
      error: response.error || "Failed to send notification",
      code: response.code
    };
  }
  // ==========================================================================
  // Reply Polling
  // ==========================================================================
  /**
   * Wait for a reply from the user
   *
   * Uses long-polling to wait for a user reply. The timeout parameter
   * controls how long to wait before returning null.
   *
   * @param timeout - Timeout in milliseconds (default: 30000)
   * @returns User reply or null if timeout
   *
   * @example
   * ```typescript
   * const client = new CCJKCloudClient()
   * const reply = await client.waitForReply(60000) // Wait up to 60 seconds
   * if (reply) {
   *   console.log('User replied:', reply.content)
   * }
   * ```
   */
  async waitForReply(timeout = POLL_TIMEOUT$1) {
    if (!this.deviceToken) {
      throw new Error('Device not bound. Please run "ccjk notification bind <code>" first.');
    }
    const response = await this.request(`/reply/poll?timeout=${timeout}`, {
      method: "GET",
      timeout
    });
    if (response.success && response.data?.reply) {
      return {
        content: response.data.reply.content,
        timestamp: new Date(response.data.reply.timestamp),
        notificationId: response.data.reply.notificationId,
        actionId: response.data.reply.actionId
      };
    }
    return null;
  }
  // ==========================================================================
  // Ask and Wait
  // ==========================================================================
  /**
   * Ask the user a question and wait for their reply
   *
   * This is a convenience method that combines notify() and waitForReply().
   * It sends a notification with the question and waits for the user to respond.
   *
   * @param question - Question to ask the user
   * @param options - Additional notification options
   * @param timeout - Timeout in milliseconds (default: 60000)
   * @returns User reply
   *
   * @example
   * ```typescript
   * const client = new CCJKCloudClient()
   * const reply = await client.ask('Deploy to production?', {
   *   actions: [
   *     { id: 'yes', label: 'Yes', value: 'yes' },
   *     { id: 'no', label: 'No', value: 'no' }
   *   ]
   * })
   * if (reply.actionId === 'yes') {
   *   // Proceed with deployment
   * }
   * ```
   */
  async ask(question, options, timeout = POLL_TIMEOUT$1) {
    const notifyResult = await this.notify({
      title: options?.title || "CCJK Question",
      body: question,
      type: "info",
      ...options
    });
    if (!notifyResult.success) {
      throw new Error(notifyResult.error || "Failed to send question");
    }
    const reply = await this.waitForReply(timeout);
    if (!reply) {
      throw new Error("No reply received within timeout");
    }
    return reply;
  }
  // ==========================================================================
  // Status Check
  // ==========================================================================
  /**
   * Get binding status and device information
   *
   * @returns Binding status information
   */
  async getStatus() {
    if (!this.deviceToken) {
      return { bound: false };
    }
    try {
      if (existsSync(TOKEN_FILE_PATH)) {
        const data = readFileSync(TOKEN_FILE_PATH, "utf-8");
        const storage = JSON.parse(data);
        return {
          bound: true,
          deviceId: storage.deviceId,
          deviceInfo: storage.deviceInfo,
          lastUsed: storage.lastUsedAt
        };
      }
    } catch {
    }
    return {
      bound: true,
      deviceId: this.deviceId || void 0
    };
  }
  // ==========================================================================
  // HTTP Request Helper
  // ==========================================================================
  /**
   * Make an HTTP request to the cloud service
   */
  async request(path, options) {
    const url = `${this.baseUrl}${path}`;
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const headers = {
        "Content-Type": "application/json"
      };
      if (this.deviceToken) {
        headers["X-Device-Token"] = this.deviceToken;
      }
      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          code: data.code || `HTTP_${response.status}`
        };
      }
      if (this.deviceToken && existsSync(TOKEN_FILE_PATH)) {
        try {
          const storageData = readFileSync(TOKEN_FILE_PATH, "utf-8");
          const storage = JSON.parse(storageData);
          storage.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
          writeFileAtomic(TOKEN_FILE_PATH, JSON.stringify(storage, null, 2));
        } catch {
        }
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            error: "Request timeout",
            code: "TIMEOUT"
          };
        }
        return {
          success: false,
          error: error.message,
          code: "NETWORK_ERROR"
        };
      }
      return {
        success: false,
        error: String(error),
        code: "UNKNOWN_ERROR"
      };
    }
  }
}
let cloudClientInstance = null;
function getCloudNotificationClient() {
  if (!cloudClientInstance) {
    cloudClientInstance = new CCJKCloudClient();
  }
  return cloudClientInstance;
}
async function bindDevice(code, deviceInfo) {
  const client = getCloudNotificationClient();
  return client.bind(code, deviceInfo);
}
async function sendNotification(options) {
  const client = getCloudNotificationClient();
  return client.notify(options);
}
function isDeviceBound() {
  const client = getCloudNotificationClient();
  return client.isBound();
}
async function getBindingStatus() {
  const client = getCloudNotificationClient();
  return client.getStatus();
}
function unbindDevice() {
  const client = getCloudNotificationClient();
  client.clearToken();
}

const execAsync = promisify(exec);
const DEFAULT_CONFIG = {
  shortcutName: "ClaudeNotify",
  barkUrl: "",
  preferLocal: true,
  smartNotify: true,
  fallbackToBark: true
};
const CONFIG_DIR = path.join(os.homedir(), ".ccjk");
const CONFIG_FILE = path.join(CONFIG_DIR, "notification-config.json");
const TEMP_NOTIFICATION_FILE = "/tmp/ccjk-notification.json";
class LocalNotificationService {
  config;
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  // ==========================================================================
  // Screen Lock Detection
  // ==========================================================================
  /**
   * Check if the macOS screen is locked
   *
   * Uses Python with Quartz framework to detect screen lock status.
   *
   * @returns true if screen is locked, false otherwise
   */
  async isScreenLocked() {
    if (process__default.platform !== "darwin") {
      return false;
    }
    try {
      const pythonScript = `
import Quartz
session_dict = Quartz.CGSessionCopyCurrentDictionary()
if session_dict:
    locked = session_dict.get('CGSSessionScreenIsLocked', False)
    print('true' if locked else 'false')
else:
    print('false')
`;
      const { stdout } = await execAsync(`python3 -c "${pythonScript}"`, {
        timeout: 5e3
      });
      return stdout.trim().toLowerCase() === "true";
    } catch (error) {
      console.error("Failed to detect screen lock status:", error);
      return false;
    }
  }
  // ==========================================================================
  // macOS Shortcut Notification
  // ==========================================================================
  /**
   * Send notification via macOS Shortcuts
   *
   * Creates a JSON file with notification data and runs the specified shortcut.
   * The shortcut should be configured to read the JSON and display a notification.
   *
   * @param shortcutName - Name of the macOS Shortcut to run
   * @param options - Notification options
   */
  async sendShortcutNotification(shortcutName, options) {
    if (process__default.platform !== "darwin") {
      throw new Error("macOS Shortcuts are only available on macOS");
    }
    const notificationData = {
      title: options.title,
      body: options.body,
      sound: options.sound !== false,
      url: options.url || "",
      group: options.group || "ccjk",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeFileAtomic(TEMP_NOTIFICATION_FILE, JSON.stringify(notificationData, null, 2), "utf-8");
    try {
      await execAsync(`shortcuts run "${shortcutName}" --input-path "${TEMP_NOTIFICATION_FILE}"`, {
        timeout: 3e4
        // 30 second timeout
      });
    } finally {
      try {
        if (fs.existsSync(TEMP_NOTIFICATION_FILE)) {
          fs.unlinkSync(TEMP_NOTIFICATION_FILE);
        }
      } catch {
      }
    }
  }
  // ==========================================================================
  // Bark Push Notification
  // ==========================================================================
  /**
   * Send notification via Bark push service
   *
   * Bark is an iOS app that allows sending push notifications via HTTP API.
   * API format: https://api.day.app/YOUR_KEY/title/body
   *
   * @param barkUrl - Bark API URL (e.g., https://api.day.app/YOUR_KEY)
   * @param options - Notification options
   */
  async sendBarkNotification(barkUrl, options) {
    if (!barkUrl) {
      throw new Error("Bark URL is not configured");
    }
    const encodedTitle = encodeURIComponent(options.title);
    const encodedBody = encodeURIComponent(options.body);
    const params = new URLSearchParams();
    if (options.sound !== false) {
      params.append("sound", "default");
    }
    if (options.url) {
      params.append("url", options.url);
    }
    if (options.group) {
      params.append("group", options.group);
    }
    if (options.icon) {
      params.append("icon", options.icon);
    }
    const baseUrl = barkUrl.endsWith("/") ? barkUrl.slice(0, -1) : barkUrl;
    let fullUrl = `${baseUrl}/${encodedTitle}/${encodedBody}`;
    const queryString = params.toString();
    if (queryString) {
      fullUrl += `?${queryString}`;
    }
    try {
      await execAsync(`curl -s -o /dev/null -w "%{http_code}" "${fullUrl}"`, {
        timeout: 1e4
      });
    } catch (error) {
      throw new Error(`Failed to send Bark notification: ${error}`);
    }
  }
  // ==========================================================================
  // Smart Notification
  // ==========================================================================
  /**
   * Smart notification - automatically choose notification method
   *
   * Logic:
   * 1. If screen is unlocked and preferLocal is true, use macOS Shortcut
   * 2. If screen is locked or shortcut fails, use Bark
   * 3. If both fail, throw error
   *
   * @param options - Notification options
   * @returns Notification result
   */
  async smartNotify(options) {
    const isLocked = await this.isScreenLocked();
    if (!isLocked && this.config.preferLocal && this.config.shortcutName) {
      try {
        await this.sendShortcutNotification(this.config.shortcutName, options);
        return {
          success: true,
          method: "shortcut"
        };
      } catch (error) {
        if (this.config.fallbackToBark && this.config.barkUrl) {
          try {
            await this.sendBarkNotification(this.config.barkUrl, options);
            return {
              success: true,
              method: "bark"
            };
          } catch (barkError) {
            return {
              success: false,
              method: "none",
              error: `Shortcut failed: ${error}. Bark also failed: ${barkError}`
            };
          }
        }
        return {
          success: false,
          method: "none",
          error: `Shortcut notification failed: ${error}`
        };
      }
    }
    if (this.config.barkUrl) {
      try {
        await this.sendBarkNotification(this.config.barkUrl, options);
        return {
          success: true,
          method: "bark"
        };
      } catch (error) {
        return {
          success: false,
          method: "none",
          error: `Bark notification failed: ${error}`
        };
      }
    }
    if (this.config.shortcutName) {
      try {
        await this.sendShortcutNotification(this.config.shortcutName, options);
        return {
          success: true,
          method: "shortcut"
        };
      } catch (error) {
        return {
          success: false,
          method: "none",
          error: `Shortcut notification failed: ${error}`
        };
      }
    }
    return {
      success: false,
      method: "none",
      error: "No notification method configured"
    };
  }
  // ==========================================================================
  // Configuration Management
  // ==========================================================================
  /**
   * Update service configuration
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }
  /**
   * Get current configuration
   *
   * @returns Current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}
async function loadLocalNotificationConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG };
    }
    const content = fs.readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(content);
    return {
      ...DEFAULT_CONFIG,
      ...config
    };
  } catch (error) {
    console.error("Failed to load local notification config:", error);
    return { ...DEFAULT_CONFIG };
  }
}
async function saveLocalNotificationConfig(config) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const existingConfig = await loadLocalNotificationConfig();
    const newConfig = { ...existingConfig, ...config };
    writeFileAtomic(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
  } catch (error) {
    throw new Error(`Failed to save local notification config: ${error}`);
  }
}
let serviceInstance = null;
async function getLocalNotificationService() {
  if (!serviceInstance) {
    const config = await loadLocalNotificationConfig();
    serviceInstance = new LocalNotificationService(config);
  }
  return serviceInstance;
}
async function isShortcutsAvailable() {
  if (process__default.platform !== "darwin") {
    return false;
  }
  try {
    await execAsync("which shortcuts", { timeout: 5e3 });
    return true;
  } catch {
    return false;
  }
}
async function listShortcuts() {
  if (process__default.platform !== "darwin") {
    return [];
  }
  try {
    const { stdout } = await execAsync("shortcuts list", { timeout: 1e4 });
    return stdout.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  } catch {
    return [];
  }
}
function isValidBarkUrl(url) {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

var toml = {};

var parse = {exports: {}};

var tomlParser = {exports: {}};

var parser;
var hasRequiredParser;

function requireParser () {
	if (hasRequiredParser) return parser;
	hasRequiredParser = 1;
	const ParserEND = 0x110000;
	class ParserError extends Error {
	  /* istanbul ignore next */
	  constructor (msg, filename, linenumber) {
	    super('[ParserError] ' + msg, filename, linenumber);
	    this.name = 'ParserError';
	    this.code = 'ParserError';
	    if (Error.captureStackTrace) Error.captureStackTrace(this, ParserError);
	  }
	}
	class State {
	  constructor (parser) {
	    this.parser = parser;
	    this.buf = '';
	    this.returned = null;
	    this.result = null;
	    this.resultTable = null;
	    this.resultArr = null;
	  }
	}
	class Parser {
	  constructor () {
	    this.pos = 0;
	    this.col = 0;
	    this.line = 0;
	    this.obj = {};
	    this.ctx = this.obj;
	    this.stack = [];
	    this._buf = '';
	    this.char = null;
	    this.ii = 0;
	    this.state = new State(this.parseStart);
	  }

	  parse (str) {
	    /* istanbul ignore next */
	    if (str.length === 0 || str.length == null) return

	    this._buf = String(str);
	    this.ii = -1;
	    this.char = -1;
	    let getNext;
	    while (getNext === false || this.nextChar()) {
	      getNext = this.runOne();
	    }
	    this._buf = null;
	  }
	  nextChar () {
	    if (this.char === 0x0A) {
	      ++this.line;
	      this.col = -1;
	    }
	    ++this.ii;
	    this.char = this._buf.codePointAt(this.ii);
	    ++this.pos;
	    ++this.col;
	    return this.haveBuffer()
	  }
	  haveBuffer () {
	    return this.ii < this._buf.length
	  }
	  runOne () {
	    return this.state.parser.call(this, this.state.returned)
	  }
	  finish () {
	    this.char = ParserEND;
	    let last;
	    do {
	      last = this.state.parser;
	      this.runOne();
	    } while (this.state.parser !== last)

	    this.ctx = null;
	    this.state = null;
	    this._buf = null;

	    return this.obj
	  }
	  next (fn) {
	    /* istanbul ignore next */
	    if (typeof fn !== 'function') throw new ParserError('Tried to set state to non-existent state: ' + JSON.stringify(fn))
	    this.state.parser = fn;
	  }
	  goto (fn) {
	    this.next(fn);
	    return this.runOne()
	  }
	  call (fn, returnWith) {
	    if (returnWith) this.next(returnWith);
	    this.stack.push(this.state);
	    this.state = new State(fn);
	  }
	  callNow (fn, returnWith) {
	    this.call(fn, returnWith);
	    return this.runOne()
	  }
	  return (value) {
	    /* istanbul ignore next */
	    if (this.stack.length === 0) throw this.error(new ParserError('Stack underflow'))
	    if (value === undefined) value = this.state.buf;
	    this.state = this.stack.pop();
	    this.state.returned = value;
	  }
	  returnNow (value) {
	    this.return(value);
	    return this.runOne()
	  }
	  consume () {
	    /* istanbul ignore next */
	    if (this.char === ParserEND) throw this.error(new ParserError('Unexpected end-of-buffer'))
	    this.state.buf += this._buf[this.ii];
	  }
	  error (err) {
	    err.line = this.line;
	    err.col = this.col;
	    err.pos = this.pos;
	    return err
	  }
	  /* istanbul ignore next */
	  parseStart () {
	    throw new ParserError('Must declare a parseStart method')
	  }
	}
	Parser.END = ParserEND;
	Parser.Error = ParserError;
	parser = Parser;
	return parser;
}

var createDatetime;
var hasRequiredCreateDatetime;

function requireCreateDatetime () {
	if (hasRequiredCreateDatetime) return createDatetime;
	hasRequiredCreateDatetime = 1;
	createDatetime = value => {
	  const date = new Date(value);
	  /* istanbul ignore if */
	  if (isNaN(date)) {
	    throw new TypeError('Invalid Datetime')
	  } else {
	    return date
	  }
	};
	return createDatetime;
}

var formatNum;
var hasRequiredFormatNum;

function requireFormatNum () {
	if (hasRequiredFormatNum) return formatNum;
	hasRequiredFormatNum = 1;
	formatNum = (d, num) => {
	  num = String(num);
	  while (num.length < d) num = '0' + num;
	  return num
	};
	return formatNum;
}

var createDatetimeFloat;
var hasRequiredCreateDatetimeFloat;

function requireCreateDatetimeFloat () {
	if (hasRequiredCreateDatetimeFloat) return createDatetimeFloat;
	hasRequiredCreateDatetimeFloat = 1;
	const f = requireFormatNum();

	class FloatingDateTime extends Date {
	  constructor (value) {
	    super(value + 'Z');
	    this.isFloating = true;
	  }
	  toISOString () {
	    const date = `${this.getUTCFullYear()}-${f(2, this.getUTCMonth() + 1)}-${f(2, this.getUTCDate())}`;
	    const time = `${f(2, this.getUTCHours())}:${f(2, this.getUTCMinutes())}:${f(2, this.getUTCSeconds())}.${f(3, this.getUTCMilliseconds())}`;
	    return `${date}T${time}`
	  }
	}

	createDatetimeFloat = value => {
	  const date = new FloatingDateTime(value);
	  /* istanbul ignore if */
	  if (isNaN(date)) {
	    throw new TypeError('Invalid Datetime')
	  } else {
	    return date
	  }
	};
	return createDatetimeFloat;
}

var createDate;
var hasRequiredCreateDate;

function requireCreateDate () {
	if (hasRequiredCreateDate) return createDate;
	hasRequiredCreateDate = 1;
	const f = requireFormatNum();
	const DateTime = commonjsGlobal.Date;

	class Date extends DateTime {
	  constructor (value) {
	    super(value);
	    this.isDate = true;
	  }
	  toISOString () {
	    return `${this.getUTCFullYear()}-${f(2, this.getUTCMonth() + 1)}-${f(2, this.getUTCDate())}`
	  }
	}

	createDate = value => {
	  const date = new Date(value);
	  /* istanbul ignore if */
	  if (isNaN(date)) {
	    throw new TypeError('Invalid Datetime')
	  } else {
	    return date
	  }
	};
	return createDate;
}

var createTime;
var hasRequiredCreateTime;

function requireCreateTime () {
	if (hasRequiredCreateTime) return createTime;
	hasRequiredCreateTime = 1;
	const f = requireFormatNum();

	class Time extends Date {
	  constructor (value) {
	    super(`0000-01-01T${value}Z`);
	    this.isTime = true;
	  }
	  toISOString () {
	    return `${f(2, this.getUTCHours())}:${f(2, this.getUTCMinutes())}:${f(2, this.getUTCSeconds())}.${f(3, this.getUTCMilliseconds())}`
	  }
	}

	createTime = value => {
	  const date = new Time(value);
	  /* istanbul ignore if */
	  if (isNaN(date)) {
	    throw new TypeError('Invalid Datetime')
	  } else {
	    return date
	  }
	};
	return createTime;
}

var hasRequiredTomlParser;

function requireTomlParser () {
	if (hasRequiredTomlParser) return tomlParser.exports;
	hasRequiredTomlParser = 1;
	/* eslint-disable no-new-wrappers, no-eval, camelcase, operator-linebreak */
	tomlParser.exports = makeParserClass(requireParser());
	tomlParser.exports.makeParserClass = makeParserClass;

	class TomlError extends Error {
	  constructor (msg) {
	    super(msg);
	    this.name = 'TomlError';
	    /* istanbul ignore next */
	    if (Error.captureStackTrace) Error.captureStackTrace(this, TomlError);
	    this.fromTOML = true;
	    this.wrapped = null;
	  }
	}
	TomlError.wrap = err => {
	  const terr = new TomlError(err.message);
	  terr.code = err.code;
	  terr.wrapped = err;
	  return terr
	};
	tomlParser.exports.TomlError = TomlError;

	const createDateTime = requireCreateDatetime();
	const createDateTimeFloat = requireCreateDatetimeFloat();
	const createDate = requireCreateDate();
	const createTime = requireCreateTime();

	const CTRL_I = 0x09;
	const CTRL_J = 0x0A;
	const CTRL_M = 0x0D;
	const CTRL_CHAR_BOUNDARY = 0x1F; // the last non-character in the latin1 region of unicode, except DEL
	const CHAR_SP = 0x20;
	const CHAR_QUOT = 0x22;
	const CHAR_NUM = 0x23;
	const CHAR_APOS = 0x27;
	const CHAR_PLUS = 0x2B;
	const CHAR_COMMA = 0x2C;
	const CHAR_HYPHEN = 0x2D;
	const CHAR_PERIOD = 0x2E;
	const CHAR_0 = 0x30;
	const CHAR_1 = 0x31;
	const CHAR_7 = 0x37;
	const CHAR_9 = 0x39;
	const CHAR_COLON = 0x3A;
	const CHAR_EQUALS = 0x3D;
	const CHAR_A = 0x41;
	const CHAR_E = 0x45;
	const CHAR_F = 0x46;
	const CHAR_T = 0x54;
	const CHAR_U = 0x55;
	const CHAR_Z = 0x5A;
	const CHAR_LOWBAR = 0x5F;
	const CHAR_a = 0x61;
	const CHAR_b = 0x62;
	const CHAR_e = 0x65;
	const CHAR_f = 0x66;
	const CHAR_i = 0x69;
	const CHAR_l = 0x6C;
	const CHAR_n = 0x6E;
	const CHAR_o = 0x6F;
	const CHAR_r = 0x72;
	const CHAR_s = 0x73;
	const CHAR_t = 0x74;
	const CHAR_u = 0x75;
	const CHAR_x = 0x78;
	const CHAR_z = 0x7A;
	const CHAR_LCUB = 0x7B;
	const CHAR_RCUB = 0x7D;
	const CHAR_LSQB = 0x5B;
	const CHAR_BSOL = 0x5C;
	const CHAR_RSQB = 0x5D;
	const CHAR_DEL = 0x7F;
	const SURROGATE_FIRST = 0xD800;
	const SURROGATE_LAST = 0xDFFF;

	const escapes = {
	  [CHAR_b]: '\u0008',
	  [CHAR_t]: '\u0009',
	  [CHAR_n]: '\u000A',
	  [CHAR_f]: '\u000C',
	  [CHAR_r]: '\u000D',
	  [CHAR_QUOT]: '\u0022',
	  [CHAR_BSOL]: '\u005C'
	};

	function isDigit (cp) {
	  return cp >= CHAR_0 && cp <= CHAR_9
	}
	function isHexit (cp) {
	  return (cp >= CHAR_A && cp <= CHAR_F) || (cp >= CHAR_a && cp <= CHAR_f) || (cp >= CHAR_0 && cp <= CHAR_9)
	}
	function isBit (cp) {
	  return cp === CHAR_1 || cp === CHAR_0
	}
	function isOctit (cp) {
	  return (cp >= CHAR_0 && cp <= CHAR_7)
	}
	function isAlphaNumQuoteHyphen (cp) {
	  return (cp >= CHAR_A && cp <= CHAR_Z)
	      || (cp >= CHAR_a && cp <= CHAR_z)
	      || (cp >= CHAR_0 && cp <= CHAR_9)
	      || cp === CHAR_APOS
	      || cp === CHAR_QUOT
	      || cp === CHAR_LOWBAR
	      || cp === CHAR_HYPHEN
	}
	function isAlphaNumHyphen (cp) {
	  return (cp >= CHAR_A && cp <= CHAR_Z)
	      || (cp >= CHAR_a && cp <= CHAR_z)
	      || (cp >= CHAR_0 && cp <= CHAR_9)
	      || cp === CHAR_LOWBAR
	      || cp === CHAR_HYPHEN
	}
	const _type = Symbol('type');
	const _declared = Symbol('declared');

	const hasOwnProperty = Object.prototype.hasOwnProperty;
	const defineProperty = Object.defineProperty;
	const descriptor = {configurable: true, enumerable: true, writable: true, value: undefined};

	function hasKey (obj, key) {
	  if (hasOwnProperty.call(obj, key)) return true
	  if (key === '__proto__') defineProperty(obj, '__proto__', descriptor);
	  return false
	}

	const INLINE_TABLE = Symbol('inline-table');
	function InlineTable () {
	  return Object.defineProperties({}, {
	    [_type]: {value: INLINE_TABLE}
	  })
	}
	function isInlineTable (obj) {
	  if (obj === null || typeof (obj) !== 'object') return false
	  return obj[_type] === INLINE_TABLE
	}

	const TABLE = Symbol('table');
	function Table () {
	  return Object.defineProperties({}, {
	    [_type]: {value: TABLE},
	    [_declared]: {value: false, writable: true}
	  })
	}
	function isTable (obj) {
	  if (obj === null || typeof (obj) !== 'object') return false
	  return obj[_type] === TABLE
	}

	const _contentType = Symbol('content-type');
	const INLINE_LIST = Symbol('inline-list');
	function InlineList (type) {
	  return Object.defineProperties([], {
	    [_type]: {value: INLINE_LIST},
	    [_contentType]: {value: type}
	  })
	}
	function isInlineList (obj) {
	  if (obj === null || typeof (obj) !== 'object') return false
	  return obj[_type] === INLINE_LIST
	}

	const LIST = Symbol('list');
	function List () {
	  return Object.defineProperties([], {
	    [_type]: {value: LIST}
	  })
	}
	function isList (obj) {
	  if (obj === null || typeof (obj) !== 'object') return false
	  return obj[_type] === LIST
	}

	// in an eval, to let bundlers not slurp in a util proxy
	let _custom;
	try {
	  const utilInspect = eval("require('util').inspect");
	  _custom = utilInspect.custom;
	} catch (_) {
	  /* eval require not available in transpiled bundle */
	}
	/* istanbul ignore next */
	const _inspect = _custom || 'inspect';

	class BoxedBigInt {
	  constructor (value) {
	    try {
	      this.value = commonjsGlobal.BigInt.asIntN(64, value);
	    } catch (_) {
	      /* istanbul ignore next */
	      this.value = null;
	    }
	    Object.defineProperty(this, _type, {value: INTEGER});
	  }
	  isNaN () {
	    return this.value === null
	  }
	  /* istanbul ignore next */
	  toString () {
	    return String(this.value)
	  }
	  /* istanbul ignore next */
	  [_inspect] () {
	    return `[BigInt: ${this.toString()}]}`
	  }
	  valueOf () {
	    return this.value
	  }
	}

	const INTEGER = Symbol('integer');
	function Integer (value) {
	  let num = Number(value);
	  // -0 is a float thing, not an int thing
	  if (Object.is(num, -0)) num = 0;
	  /* istanbul ignore else */
	  if (commonjsGlobal.BigInt && !Number.isSafeInteger(num)) {
	    return new BoxedBigInt(value)
	  } else {
	    /* istanbul ignore next */
	    return Object.defineProperties(new Number(num), {
	      isNaN: {value: function () { return isNaN(this) }},
	      [_type]: {value: INTEGER},
	      [_inspect]: {value: () => `[Integer: ${value}]`}
	    })
	  }
	}
	function isInteger (obj) {
	  if (obj === null || typeof (obj) !== 'object') return false
	  return obj[_type] === INTEGER
	}

	const FLOAT = Symbol('float');
	function Float (value) {
	  /* istanbul ignore next */
	  return Object.defineProperties(new Number(value), {
	    [_type]: {value: FLOAT},
	    [_inspect]: {value: () => `[Float: ${value}]`}
	  })
	}
	function isFloat (obj) {
	  if (obj === null || typeof (obj) !== 'object') return false
	  return obj[_type] === FLOAT
	}

	function tomlType (value) {
	  const type = typeof value;
	  if (type === 'object') {
	    /* istanbul ignore if */
	    if (value === null) return 'null'
	    if (value instanceof Date) return 'datetime'
	    /* istanbul ignore else */
	    if (_type in value) {
	      switch (value[_type]) {
	        case INLINE_TABLE: return 'inline-table'
	        case INLINE_LIST: return 'inline-list'
	        /* istanbul ignore next */
	        case TABLE: return 'table'
	        /* istanbul ignore next */
	        case LIST: return 'list'
	        case FLOAT: return 'float'
	        case INTEGER: return 'integer'
	      }
	    }
	  }
	  return type
	}

	function makeParserClass (Parser) {
	  class TOMLParser extends Parser {
	    constructor () {
	      super();
	      this.ctx = this.obj = Table();
	    }

	    /* MATCH HELPER */
	    atEndOfWord () {
	      return this.char === CHAR_NUM || this.char === CTRL_I || this.char === CHAR_SP || this.atEndOfLine()
	    }
	    atEndOfLine () {
	      return this.char === Parser.END || this.char === CTRL_J || this.char === CTRL_M
	    }

	    parseStart () {
	      if (this.char === Parser.END) {
	        return null
	      } else if (this.char === CHAR_LSQB) {
	        return this.call(this.parseTableOrList)
	      } else if (this.char === CHAR_NUM) {
	        return this.call(this.parseComment)
	      } else if (this.char === CTRL_J || this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
	        return null
	      } else if (isAlphaNumQuoteHyphen(this.char)) {
	        return this.callNow(this.parseAssignStatement)
	      } else {
	        throw this.error(new TomlError(`Unknown character "${this.char}"`))
	      }
	    }

	    // HELPER, this strips any whitespace and comments to the end of the line
	    // then RETURNS. Last state in a production.
	    parseWhitespaceToEOL () {
	      if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
	        return null
	      } else if (this.char === CHAR_NUM) {
	        return this.goto(this.parseComment)
	      } else if (this.char === Parser.END || this.char === CTRL_J) {
	        return this.return()
	      } else {
	        throw this.error(new TomlError('Unexpected character, expected only whitespace or comments till end of line'))
	      }
	    }

	    /* ASSIGNMENT: key = value */
	    parseAssignStatement () {
	      return this.callNow(this.parseAssign, this.recordAssignStatement)
	    }
	    recordAssignStatement (kv) {
	      let target = this.ctx;
	      let finalKey = kv.key.pop();
	      for (let kw of kv.key) {
	        if (hasKey(target, kw) && (!isTable(target[kw]) || target[kw][_declared])) {
	          throw this.error(new TomlError("Can't redefine existing key"))
	        }
	        target = target[kw] = target[kw] || Table();
	      }
	      if (hasKey(target, finalKey)) {
	        throw this.error(new TomlError("Can't redefine existing key"))
	      }
	      // unbox our numbers
	      if (isInteger(kv.value) || isFloat(kv.value)) {
	        target[finalKey] = kv.value.valueOf();
	      } else {
	        target[finalKey] = kv.value;
	      }
	      return this.goto(this.parseWhitespaceToEOL)
	    }

	    /* ASSSIGNMENT expression, key = value possibly inside an inline table */
	    parseAssign () {
	      return this.callNow(this.parseKeyword, this.recordAssignKeyword)
	    }
	    recordAssignKeyword (key) {
	      if (this.state.resultTable) {
	        this.state.resultTable.push(key);
	      } else {
	        this.state.resultTable = [key];
	      }
	      return this.goto(this.parseAssignKeywordPreDot)
	    }
	    parseAssignKeywordPreDot () {
	      if (this.char === CHAR_PERIOD) {
	        return this.next(this.parseAssignKeywordPostDot)
	      } else if (this.char !== CHAR_SP && this.char !== CTRL_I) {
	        return this.goto(this.parseAssignEqual)
	      }
	    }
	    parseAssignKeywordPostDot () {
	      if (this.char !== CHAR_SP && this.char !== CTRL_I) {
	        return this.callNow(this.parseKeyword, this.recordAssignKeyword)
	      }
	    }

	    parseAssignEqual () {
	      if (this.char === CHAR_EQUALS) {
	        return this.next(this.parseAssignPreValue)
	      } else {
	        throw this.error(new TomlError('Invalid character, expected "="'))
	      }
	    }
	    parseAssignPreValue () {
	      if (this.char === CHAR_SP || this.char === CTRL_I) {
	        return null
	      } else {
	        return this.callNow(this.parseValue, this.recordAssignValue)
	      }
	    }
	    recordAssignValue (value) {
	      return this.returnNow({key: this.state.resultTable, value: value})
	    }

	    /* COMMENTS: #...eol */
	    parseComment () {
	      do {
	        if (this.char === Parser.END || this.char === CTRL_J) {
	          return this.return()
	        }
	      } while (this.nextChar())
	    }

	    /* TABLES AND LISTS, [foo] and [[foo]] */
	    parseTableOrList () {
	      if (this.char === CHAR_LSQB) {
	        this.next(this.parseList);
	      } else {
	        return this.goto(this.parseTable)
	      }
	    }

	    /* TABLE [foo.bar.baz] */
	    parseTable () {
	      this.ctx = this.obj;
	      return this.goto(this.parseTableNext)
	    }
	    parseTableNext () {
	      if (this.char === CHAR_SP || this.char === CTRL_I) {
	        return null
	      } else {
	        return this.callNow(this.parseKeyword, this.parseTableMore)
	      }
	    }
	    parseTableMore (keyword) {
	      if (this.char === CHAR_SP || this.char === CTRL_I) {
	        return null
	      } else if (this.char === CHAR_RSQB) {
	        if (hasKey(this.ctx, keyword) && (!isTable(this.ctx[keyword]) || this.ctx[keyword][_declared])) {
	          throw this.error(new TomlError("Can't redefine existing key"))
	        } else {
	          this.ctx = this.ctx[keyword] = this.ctx[keyword] || Table();
	          this.ctx[_declared] = true;
	        }
	        return this.next(this.parseWhitespaceToEOL)
	      } else if (this.char === CHAR_PERIOD) {
	        if (!hasKey(this.ctx, keyword)) {
	          this.ctx = this.ctx[keyword] = Table();
	        } else if (isTable(this.ctx[keyword])) {
	          this.ctx = this.ctx[keyword];
	        } else if (isList(this.ctx[keyword])) {
	          this.ctx = this.ctx[keyword][this.ctx[keyword].length - 1];
	        } else {
	          throw this.error(new TomlError("Can't redefine existing key"))
	        }
	        return this.next(this.parseTableNext)
	      } else {
	        throw this.error(new TomlError('Unexpected character, expected whitespace, . or ]'))
	      }
	    }

	    /* LIST [[a.b.c]] */
	    parseList () {
	      this.ctx = this.obj;
	      return this.goto(this.parseListNext)
	    }
	    parseListNext () {
	      if (this.char === CHAR_SP || this.char === CTRL_I) {
	        return null
	      } else {
	        return this.callNow(this.parseKeyword, this.parseListMore)
	      }
	    }
	    parseListMore (keyword) {
	      if (this.char === CHAR_SP || this.char === CTRL_I) {
	        return null
	      } else if (this.char === CHAR_RSQB) {
	        if (!hasKey(this.ctx, keyword)) {
	          this.ctx[keyword] = List();
	        }
	        if (isInlineList(this.ctx[keyword])) {
	          throw this.error(new TomlError("Can't extend an inline array"))
	        } else if (isList(this.ctx[keyword])) {
	          const next = Table();
	          this.ctx[keyword].push(next);
	          this.ctx = next;
	        } else {
	          throw this.error(new TomlError("Can't redefine an existing key"))
	        }
	        return this.next(this.parseListEnd)
	      } else if (this.char === CHAR_PERIOD) {
	        if (!hasKey(this.ctx, keyword)) {
	          this.ctx = this.ctx[keyword] = Table();
	        } else if (isInlineList(this.ctx[keyword])) {
	          throw this.error(new TomlError("Can't extend an inline array"))
	        } else if (isInlineTable(this.ctx[keyword])) {
	          throw this.error(new TomlError("Can't extend an inline table"))
	        } else if (isList(this.ctx[keyword])) {
	          this.ctx = this.ctx[keyword][this.ctx[keyword].length - 1];
	        } else if (isTable(this.ctx[keyword])) {
	          this.ctx = this.ctx[keyword];
	        } else {
	          throw this.error(new TomlError("Can't redefine an existing key"))
	        }
	        return this.next(this.parseListNext)
	      } else {
	        throw this.error(new TomlError('Unexpected character, expected whitespace, . or ]'))
	      }
	    }
	    parseListEnd (keyword) {
	      if (this.char === CHAR_RSQB) {
	        return this.next(this.parseWhitespaceToEOL)
	      } else {
	        throw this.error(new TomlError('Unexpected character, expected whitespace, . or ]'))
	      }
	    }

	    /* VALUE string, number, boolean, inline list, inline object */
	    parseValue () {
	      if (this.char === Parser.END) {
	        throw this.error(new TomlError('Key without value'))
	      } else if (this.char === CHAR_QUOT) {
	        return this.next(this.parseDoubleString)
	      } if (this.char === CHAR_APOS) {
	        return this.next(this.parseSingleString)
	      } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
	        return this.goto(this.parseNumberSign)
	      } else if (this.char === CHAR_i) {
	        return this.next(this.parseInf)
	      } else if (this.char === CHAR_n) {
	        return this.next(this.parseNan)
	      } else if (isDigit(this.char)) {
	        return this.goto(this.parseNumberOrDateTime)
	      } else if (this.char === CHAR_t || this.char === CHAR_f) {
	        return this.goto(this.parseBoolean)
	      } else if (this.char === CHAR_LSQB) {
	        return this.call(this.parseInlineList, this.recordValue)
	      } else if (this.char === CHAR_LCUB) {
	        return this.call(this.parseInlineTable, this.recordValue)
	      } else {
	        throw this.error(new TomlError('Unexpected character, expecting string, number, datetime, boolean, inline array or inline table'))
	      }
	    }
	    recordValue (value) {
	      return this.returnNow(value)
	    }

	    parseInf () {
	      if (this.char === CHAR_n) {
	        return this.next(this.parseInf2)
	      } else {
	        throw this.error(new TomlError('Unexpected character, expected "inf", "+inf" or "-inf"'))
	      }
	    }
	    parseInf2 () {
	      if (this.char === CHAR_f) {
	        if (this.state.buf === '-') {
	          return this.return(-Infinity)
	        } else {
	          return this.return(Infinity)
	        }
	      } else {
	        throw this.error(new TomlError('Unexpected character, expected "inf", "+inf" or "-inf"'))
	      }
	    }

	    parseNan () {
	      if (this.char === CHAR_a) {
	        return this.next(this.parseNan2)
	      } else {
	        throw this.error(new TomlError('Unexpected character, expected "nan"'))
	      }
	    }
	    parseNan2 () {
	      if (this.char === CHAR_n) {
	        return this.return(NaN)
	      } else {
	        throw this.error(new TomlError('Unexpected character, expected "nan"'))
	      }
	    }

	    /* KEYS, barewords or basic, literal, or dotted */
	    parseKeyword () {
	      if (this.char === CHAR_QUOT) {
	        return this.next(this.parseBasicString)
	      } else if (this.char === CHAR_APOS) {
	        return this.next(this.parseLiteralString)
	      } else {
	        return this.goto(this.parseBareKey)
	      }
	    }

	    /* KEYS: barewords */
	    parseBareKey () {
	      do {
	        if (this.char === Parser.END) {
	          throw this.error(new TomlError('Key ended without value'))
	        } else if (isAlphaNumHyphen(this.char)) {
	          this.consume();
	        } else if (this.state.buf.length === 0) {
	          throw this.error(new TomlError('Empty bare keys are not allowed'))
	        } else {
	          return this.returnNow()
	        }
	      } while (this.nextChar())
	    }

	    /* STRINGS, single quoted (literal) */
	    parseSingleString () {
	      if (this.char === CHAR_APOS) {
	        return this.next(this.parseLiteralMultiStringMaybe)
	      } else {
	        return this.goto(this.parseLiteralString)
	      }
	    }
	    parseLiteralString () {
	      do {
	        if (this.char === CHAR_APOS) {
	          return this.return()
	        } else if (this.atEndOfLine()) {
	          throw this.error(new TomlError('Unterminated string'))
	        } else if (this.char === CHAR_DEL || (this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I)) {
	          throw this.errorControlCharInString()
	        } else {
	          this.consume();
	        }
	      } while (this.nextChar())
	    }
	    parseLiteralMultiStringMaybe () {
	      if (this.char === CHAR_APOS) {
	        return this.next(this.parseLiteralMultiString)
	      } else {
	        return this.returnNow()
	      }
	    }
	    parseLiteralMultiString () {
	      if (this.char === CTRL_M) {
	        return null
	      } else if (this.char === CTRL_J) {
	        return this.next(this.parseLiteralMultiStringContent)
	      } else {
	        return this.goto(this.parseLiteralMultiStringContent)
	      }
	    }
	    parseLiteralMultiStringContent () {
	      do {
	        if (this.char === CHAR_APOS) {
	          return this.next(this.parseLiteralMultiEnd)
	        } else if (this.char === Parser.END) {
	          throw this.error(new TomlError('Unterminated multi-line string'))
	        } else if (this.char === CHAR_DEL || (this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I && this.char !== CTRL_J && this.char !== CTRL_M)) {
	          throw this.errorControlCharInString()
	        } else {
	          this.consume();
	        }
	      } while (this.nextChar())
	    }
	    parseLiteralMultiEnd () {
	      if (this.char === CHAR_APOS) {
	        return this.next(this.parseLiteralMultiEnd2)
	      } else {
	        this.state.buf += "'";
	        return this.goto(this.parseLiteralMultiStringContent)
	      }
	    }
	    parseLiteralMultiEnd2 () {
	      if (this.char === CHAR_APOS) {
	        return this.return()
	      } else {
	        this.state.buf += "''";
	        return this.goto(this.parseLiteralMultiStringContent)
	      }
	    }

	    /* STRINGS double quoted */
	    parseDoubleString () {
	      if (this.char === CHAR_QUOT) {
	        return this.next(this.parseMultiStringMaybe)
	      } else {
	        return this.goto(this.parseBasicString)
	      }
	    }
	    parseBasicString () {
	      do {
	        if (this.char === CHAR_BSOL) {
	          return this.call(this.parseEscape, this.recordEscapeReplacement)
	        } else if (this.char === CHAR_QUOT) {
	          return this.return()
	        } else if (this.atEndOfLine()) {
	          throw this.error(new TomlError('Unterminated string'))
	        } else if (this.char === CHAR_DEL || (this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I)) {
	          throw this.errorControlCharInString()
	        } else {
	          this.consume();
	        }
	      } while (this.nextChar())
	    }
	    recordEscapeReplacement (replacement) {
	      this.state.buf += replacement;
	      return this.goto(this.parseBasicString)
	    }
	    parseMultiStringMaybe () {
	      if (this.char === CHAR_QUOT) {
	        return this.next(this.parseMultiString)
	      } else {
	        return this.returnNow()
	      }
	    }
	    parseMultiString () {
	      if (this.char === CTRL_M) {
	        return null
	      } else if (this.char === CTRL_J) {
	        return this.next(this.parseMultiStringContent)
	      } else {
	        return this.goto(this.parseMultiStringContent)
	      }
	    }
	    parseMultiStringContent () {
	      do {
	        if (this.char === CHAR_BSOL) {
	          return this.call(this.parseMultiEscape, this.recordMultiEscapeReplacement)
	        } else if (this.char === CHAR_QUOT) {
	          return this.next(this.parseMultiEnd)
	        } else if (this.char === Parser.END) {
	          throw this.error(new TomlError('Unterminated multi-line string'))
	        } else if (this.char === CHAR_DEL || (this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I && this.char !== CTRL_J && this.char !== CTRL_M)) {
	          throw this.errorControlCharInString()
	        } else {
	          this.consume();
	        }
	      } while (this.nextChar())
	    }
	    errorControlCharInString () {
	      let displayCode = '\\u00';
	      if (this.char < 16) {
	        displayCode += '0';
	      }
	      displayCode += this.char.toString(16);

	      return this.error(new TomlError(`Control characters (codes < 0x1f and 0x7f) are not allowed in strings, use ${displayCode} instead`))
	    }
	    recordMultiEscapeReplacement (replacement) {
	      this.state.buf += replacement;
	      return this.goto(this.parseMultiStringContent)
	    }
	    parseMultiEnd () {
	      if (this.char === CHAR_QUOT) {
	        return this.next(this.parseMultiEnd2)
	      } else {
	        this.state.buf += '"';
	        return this.goto(this.parseMultiStringContent)
	      }
	    }
	    parseMultiEnd2 () {
	      if (this.char === CHAR_QUOT) {
	        return this.return()
	      } else {
	        this.state.buf += '""';
	        return this.goto(this.parseMultiStringContent)
	      }
	    }
	    parseMultiEscape () {
	      if (this.char === CTRL_M || this.char === CTRL_J) {
	        return this.next(this.parseMultiTrim)
	      } else if (this.char === CHAR_SP || this.char === CTRL_I) {
	        return this.next(this.parsePreMultiTrim)
	      } else {
	        return this.goto(this.parseEscape)
	      }
	    }
	    parsePreMultiTrim () {
	      if (this.char === CHAR_SP || this.char === CTRL_I) {
	        return null
	      } else if (this.char === CTRL_M || this.char === CTRL_J) {
	        return this.next(this.parseMultiTrim)
	      } else {
	        throw this.error(new TomlError("Can't escape whitespace"))
	      }
	    }
	    parseMultiTrim () {
	      // explicitly whitespace here, END should follow the same path as chars
	      if (this.char === CTRL_J || this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
	        return null
	      } else {
	        return this.returnNow()
	      }
	    }
	    parseEscape () {
	      if (this.char in escapes) {
	        return this.return(escapes[this.char])
	      } else if (this.char === CHAR_u) {
	        return this.call(this.parseSmallUnicode, this.parseUnicodeReturn)
	      } else if (this.char === CHAR_U) {
	        return this.call(this.parseLargeUnicode, this.parseUnicodeReturn)
	      } else {
	        throw this.error(new TomlError('Unknown escape character: ' + this.char))
	      }
	    }
	    parseUnicodeReturn (char) {
	      try {
	        const codePoint = parseInt(char, 16);
	        if (codePoint >= SURROGATE_FIRST && codePoint <= SURROGATE_LAST) {
	          throw this.error(new TomlError('Invalid unicode, character in range 0xD800 - 0xDFFF is reserved'))
	        }
	        return this.returnNow(String.fromCodePoint(codePoint))
	      } catch (err) {
	        throw this.error(TomlError.wrap(err))
	      }
	    }
	    parseSmallUnicode () {
	      if (!isHexit(this.char)) {
	        throw this.error(new TomlError('Invalid character in unicode sequence, expected hex'))
	      } else {
	        this.consume();
	        if (this.state.buf.length >= 4) return this.return()
	      }
	    }
	    parseLargeUnicode () {
	      if (!isHexit(this.char)) {
	        throw this.error(new TomlError('Invalid character in unicode sequence, expected hex'))
	      } else {
	        this.consume();
	        if (this.state.buf.length >= 8) return this.return()
	      }
	    }

	    /* NUMBERS */
	    parseNumberSign () {
	      this.consume();
	      return this.next(this.parseMaybeSignedInfOrNan)
	    }
	    parseMaybeSignedInfOrNan () {
	      if (this.char === CHAR_i) {
	        return this.next(this.parseInf)
	      } else if (this.char === CHAR_n) {
	        return this.next(this.parseNan)
	      } else {
	        return this.callNow(this.parseNoUnder, this.parseNumberIntegerStart)
	      }
	    }
	    parseNumberIntegerStart () {
	      if (this.char === CHAR_0) {
	        this.consume();
	        return this.next(this.parseNumberIntegerExponentOrDecimal)
	      } else {
	        return this.goto(this.parseNumberInteger)
	      }
	    }
	    parseNumberIntegerExponentOrDecimal () {
	      if (this.char === CHAR_PERIOD) {
	        this.consume();
	        return this.call(this.parseNoUnder, this.parseNumberFloat)
	      } else if (this.char === CHAR_E || this.char === CHAR_e) {
	        this.consume();
	        return this.next(this.parseNumberExponentSign)
	      } else {
	        return this.returnNow(Integer(this.state.buf))
	      }
	    }
	    parseNumberInteger () {
	      if (isDigit(this.char)) {
	        this.consume();
	      } else if (this.char === CHAR_LOWBAR) {
	        return this.call(this.parseNoUnder)
	      } else if (this.char === CHAR_E || this.char === CHAR_e) {
	        this.consume();
	        return this.next(this.parseNumberExponentSign)
	      } else if (this.char === CHAR_PERIOD) {
	        this.consume();
	        return this.call(this.parseNoUnder, this.parseNumberFloat)
	      } else {
	        const result = Integer(this.state.buf);
	        /* istanbul ignore if */
	        if (result.isNaN()) {
	          throw this.error(new TomlError('Invalid number'))
	        } else {
	          return this.returnNow(result)
	        }
	      }
	    }
	    parseNoUnder () {
	      if (this.char === CHAR_LOWBAR || this.char === CHAR_PERIOD || this.char === CHAR_E || this.char === CHAR_e) {
	        throw this.error(new TomlError('Unexpected character, expected digit'))
	      } else if (this.atEndOfWord()) {
	        throw this.error(new TomlError('Incomplete number'))
	      }
	      return this.returnNow()
	    }
	    parseNoUnderHexOctBinLiteral () {
	      if (this.char === CHAR_LOWBAR || this.char === CHAR_PERIOD) {
	        throw this.error(new TomlError('Unexpected character, expected digit'))
	      } else if (this.atEndOfWord()) {
	        throw this.error(new TomlError('Incomplete number'))
	      }
	      return this.returnNow()
	    }
	    parseNumberFloat () {
	      if (this.char === CHAR_LOWBAR) {
	        return this.call(this.parseNoUnder, this.parseNumberFloat)
	      } else if (isDigit(this.char)) {
	        this.consume();
	      } else if (this.char === CHAR_E || this.char === CHAR_e) {
	        this.consume();
	        return this.next(this.parseNumberExponentSign)
	      } else {
	        return this.returnNow(Float(this.state.buf))
	      }
	    }
	    parseNumberExponentSign () {
	      if (isDigit(this.char)) {
	        return this.goto(this.parseNumberExponent)
	      } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
	        this.consume();
	        this.call(this.parseNoUnder, this.parseNumberExponent);
	      } else {
	        throw this.error(new TomlError('Unexpected character, expected -, + or digit'))
	      }
	    }
	    parseNumberExponent () {
	      if (isDigit(this.char)) {
	        this.consume();
	      } else if (this.char === CHAR_LOWBAR) {
	        return this.call(this.parseNoUnder)
	      } else {
	        return this.returnNow(Float(this.state.buf))
	      }
	    }

	    /* NUMBERS or DATETIMES  */
	    parseNumberOrDateTime () {
	      if (this.char === CHAR_0) {
	        this.consume();
	        return this.next(this.parseNumberBaseOrDateTime)
	      } else {
	        return this.goto(this.parseNumberOrDateTimeOnly)
	      }
	    }
	    parseNumberOrDateTimeOnly () {
	      // note, if two zeros are in a row then it MUST be a date
	      if (this.char === CHAR_LOWBAR) {
	        return this.call(this.parseNoUnder, this.parseNumberInteger)
	      } else if (isDigit(this.char)) {
	        this.consume();
	        if (this.state.buf.length > 4) this.next(this.parseNumberInteger);
	      } else if (this.char === CHAR_E || this.char === CHAR_e) {
	        this.consume();
	        return this.next(this.parseNumberExponentSign)
	      } else if (this.char === CHAR_PERIOD) {
	        this.consume();
	        return this.call(this.parseNoUnder, this.parseNumberFloat)
	      } else if (this.char === CHAR_HYPHEN) {
	        return this.goto(this.parseDateTime)
	      } else if (this.char === CHAR_COLON) {
	        return this.goto(this.parseOnlyTimeHour)
	      } else {
	        return this.returnNow(Integer(this.state.buf))
	      }
	    }
	    parseDateTimeOnly () {
	      if (this.state.buf.length < 4) {
	        if (isDigit(this.char)) {
	          return this.consume()
	        } else if (this.char === CHAR_COLON) {
	          return this.goto(this.parseOnlyTimeHour)
	        } else {
	          throw this.error(new TomlError('Expected digit while parsing year part of a date'))
	        }
	      } else {
	        if (this.char === CHAR_HYPHEN) {
	          return this.goto(this.parseDateTime)
	        } else {
	          throw this.error(new TomlError('Expected hyphen (-) while parsing year part of date'))
	        }
	      }
	    }
	    parseNumberBaseOrDateTime () {
	      if (this.char === CHAR_b) {
	        this.consume();
	        return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerBin)
	      } else if (this.char === CHAR_o) {
	        this.consume();
	        return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerOct)
	      } else if (this.char === CHAR_x) {
	        this.consume();
	        return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerHex)
	      } else if (this.char === CHAR_PERIOD) {
	        return this.goto(this.parseNumberInteger)
	      } else if (isDigit(this.char)) {
	        return this.goto(this.parseDateTimeOnly)
	      } else {
	        return this.returnNow(Integer(this.state.buf))
	      }
	    }
	    parseIntegerHex () {
	      if (isHexit(this.char)) {
	        this.consume();
	      } else if (this.char === CHAR_LOWBAR) {
	        return this.call(this.parseNoUnderHexOctBinLiteral)
	      } else {
	        const result = Integer(this.state.buf);
	        /* istanbul ignore if */
	        if (result.isNaN()) {
	          throw this.error(new TomlError('Invalid number'))
	        } else {
	          return this.returnNow(result)
	        }
	      }
	    }
	    parseIntegerOct () {
	      if (isOctit(this.char)) {
	        this.consume();
	      } else if (this.char === CHAR_LOWBAR) {
	        return this.call(this.parseNoUnderHexOctBinLiteral)
	      } else {
	        const result = Integer(this.state.buf);
	        /* istanbul ignore if */
	        if (result.isNaN()) {
	          throw this.error(new TomlError('Invalid number'))
	        } else {
	          return this.returnNow(result)
	        }
	      }
	    }
	    parseIntegerBin () {
	      if (isBit(this.char)) {
	        this.consume();
	      } else if (this.char === CHAR_LOWBAR) {
	        return this.call(this.parseNoUnderHexOctBinLiteral)
	      } else {
	        const result = Integer(this.state.buf);
	        /* istanbul ignore if */
	        if (result.isNaN()) {
	          throw this.error(new TomlError('Invalid number'))
	        } else {
	          return this.returnNow(result)
	        }
	      }
	    }

	    /* DATETIME */
	    parseDateTime () {
	      // we enter here having just consumed the year and about to consume the hyphen
	      if (this.state.buf.length < 4) {
	        throw this.error(new TomlError('Years less than 1000 must be zero padded to four characters'))
	      }
	      this.state.result = this.state.buf;
	      this.state.buf = '';
	      return this.next(this.parseDateMonth)
	    }
	    parseDateMonth () {
	      if (this.char === CHAR_HYPHEN) {
	        if (this.state.buf.length < 2) {
	          throw this.error(new TomlError('Months less than 10 must be zero padded to two characters'))
	        }
	        this.state.result += '-' + this.state.buf;
	        this.state.buf = '';
	        return this.next(this.parseDateDay)
	      } else if (isDigit(this.char)) {
	        this.consume();
	      } else {
	        throw this.error(new TomlError('Incomplete datetime'))
	      }
	    }
	    parseDateDay () {
	      if (this.char === CHAR_T || this.char === CHAR_SP) {
	        if (this.state.buf.length < 2) {
	          throw this.error(new TomlError('Days less than 10 must be zero padded to two characters'))
	        }
	        this.state.result += '-' + this.state.buf;
	        this.state.buf = '';
	        return this.next(this.parseStartTimeHour)
	      } else if (this.atEndOfWord()) {
	        return this.returnNow(createDate(this.state.result + '-' + this.state.buf))
	      } else if (isDigit(this.char)) {
	        this.consume();
	      } else {
	        throw this.error(new TomlError('Incomplete datetime'))
	      }
	    }
	    parseStartTimeHour () {
	      if (this.atEndOfWord()) {
	        return this.returnNow(createDate(this.state.result))
	      } else {
	        return this.goto(this.parseTimeHour)
	      }
	    }
	    parseTimeHour () {
	      if (this.char === CHAR_COLON) {
	        if (this.state.buf.length < 2) {
	          throw this.error(new TomlError('Hours less than 10 must be zero padded to two characters'))
	        }
	        this.state.result += 'T' + this.state.buf;
	        this.state.buf = '';
	        return this.next(this.parseTimeMin)
	      } else if (isDigit(this.char)) {
	        this.consume();
	      } else {
	        throw this.error(new TomlError('Incomplete datetime'))
	      }
	    }
	    parseTimeMin () {
	      if (this.state.buf.length < 2 && isDigit(this.char)) {
	        this.consume();
	      } else if (this.state.buf.length === 2 && this.char === CHAR_COLON) {
	        this.state.result += ':' + this.state.buf;
	        this.state.buf = '';
	        return this.next(this.parseTimeSec)
	      } else {
	        throw this.error(new TomlError('Incomplete datetime'))
	      }
	    }
	    parseTimeSec () {
	      if (isDigit(this.char)) {
	        this.consume();
	        if (this.state.buf.length === 2) {
	          this.state.result += ':' + this.state.buf;
	          this.state.buf = '';
	          return this.next(this.parseTimeZoneOrFraction)
	        }
	      } else {
	        throw this.error(new TomlError('Incomplete datetime'))
	      }
	    }

	    parseOnlyTimeHour () {
	      /* istanbul ignore else */
	      if (this.char === CHAR_COLON) {
	        if (this.state.buf.length < 2) {
	          throw this.error(new TomlError('Hours less than 10 must be zero padded to two characters'))
	        }
	        this.state.result = this.state.buf;
	        this.state.buf = '';
	        return this.next(this.parseOnlyTimeMin)
	      } else {
	        throw this.error(new TomlError('Incomplete time'))
	      }
	    }
	    parseOnlyTimeMin () {
	      if (this.state.buf.length < 2 && isDigit(this.char)) {
	        this.consume();
	      } else if (this.state.buf.length === 2 && this.char === CHAR_COLON) {
	        this.state.result += ':' + this.state.buf;
	        this.state.buf = '';
	        return this.next(this.parseOnlyTimeSec)
	      } else {
	        throw this.error(new TomlError('Incomplete time'))
	      }
	    }
	    parseOnlyTimeSec () {
	      if (isDigit(this.char)) {
	        this.consume();
	        if (this.state.buf.length === 2) {
	          return this.next(this.parseOnlyTimeFractionMaybe)
	        }
	      } else {
	        throw this.error(new TomlError('Incomplete time'))
	      }
	    }
	    parseOnlyTimeFractionMaybe () {
	      this.state.result += ':' + this.state.buf;
	      if (this.char === CHAR_PERIOD) {
	        this.state.buf = '';
	        this.next(this.parseOnlyTimeFraction);
	      } else {
	        return this.return(createTime(this.state.result))
	      }
	    }
	    parseOnlyTimeFraction () {
	      if (isDigit(this.char)) {
	        this.consume();
	      } else if (this.atEndOfWord()) {
	        if (this.state.buf.length === 0) throw this.error(new TomlError('Expected digit in milliseconds'))
	        return this.returnNow(createTime(this.state.result + '.' + this.state.buf))
	      } else {
	        throw this.error(new TomlError('Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z'))
	      }
	    }

	    parseTimeZoneOrFraction () {
	      if (this.char === CHAR_PERIOD) {
	        this.consume();
	        this.next(this.parseDateTimeFraction);
	      } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
	        this.consume();
	        this.next(this.parseTimeZoneHour);
	      } else if (this.char === CHAR_Z) {
	        this.consume();
	        return this.return(createDateTime(this.state.result + this.state.buf))
	      } else if (this.atEndOfWord()) {
	        return this.returnNow(createDateTimeFloat(this.state.result + this.state.buf))
	      } else {
	        throw this.error(new TomlError('Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z'))
	      }
	    }
	    parseDateTimeFraction () {
	      if (isDigit(this.char)) {
	        this.consume();
	      } else if (this.state.buf.length === 1) {
	        throw this.error(new TomlError('Expected digit in milliseconds'))
	      } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
	        this.consume();
	        this.next(this.parseTimeZoneHour);
	      } else if (this.char === CHAR_Z) {
	        this.consume();
	        return this.return(createDateTime(this.state.result + this.state.buf))
	      } else if (this.atEndOfWord()) {
	        return this.returnNow(createDateTimeFloat(this.state.result + this.state.buf))
	      } else {
	        throw this.error(new TomlError('Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z'))
	      }
	    }
	    parseTimeZoneHour () {
	      if (isDigit(this.char)) {
	        this.consume();
	        // FIXME: No more regexps
	        if (/\d\d$/.test(this.state.buf)) return this.next(this.parseTimeZoneSep)
	      } else {
	        throw this.error(new TomlError('Unexpected character in datetime, expected digit'))
	      }
	    }
	    parseTimeZoneSep () {
	      if (this.char === CHAR_COLON) {
	        this.consume();
	        this.next(this.parseTimeZoneMin);
	      } else {
	        throw this.error(new TomlError('Unexpected character in datetime, expected colon'))
	      }
	    }
	    parseTimeZoneMin () {
	      if (isDigit(this.char)) {
	        this.consume();
	        if (/\d\d$/.test(this.state.buf)) return this.return(createDateTime(this.state.result + this.state.buf))
	      } else {
	        throw this.error(new TomlError('Unexpected character in datetime, expected digit'))
	      }
	    }

	    /* BOOLEAN */
	    parseBoolean () {
	      /* istanbul ignore else */
	      if (this.char === CHAR_t) {
	        this.consume();
	        return this.next(this.parseTrue_r)
	      } else if (this.char === CHAR_f) {
	        this.consume();
	        return this.next(this.parseFalse_a)
	      }
	    }
	    parseTrue_r () {
	      if (this.char === CHAR_r) {
	        this.consume();
	        return this.next(this.parseTrue_u)
	      } else {
	        throw this.error(new TomlError('Invalid boolean, expected true or false'))
	      }
	    }
	    parseTrue_u () {
	      if (this.char === CHAR_u) {
	        this.consume();
	        return this.next(this.parseTrue_e)
	      } else {
	        throw this.error(new TomlError('Invalid boolean, expected true or false'))
	      }
	    }
	    parseTrue_e () {
	      if (this.char === CHAR_e) {
	        return this.return(true)
	      } else {
	        throw this.error(new TomlError('Invalid boolean, expected true or false'))
	      }
	    }

	    parseFalse_a () {
	      if (this.char === CHAR_a) {
	        this.consume();
	        return this.next(this.parseFalse_l)
	      } else {
	        throw this.error(new TomlError('Invalid boolean, expected true or false'))
	      }
	    }

	    parseFalse_l () {
	      if (this.char === CHAR_l) {
	        this.consume();
	        return this.next(this.parseFalse_s)
	      } else {
	        throw this.error(new TomlError('Invalid boolean, expected true or false'))
	      }
	    }

	    parseFalse_s () {
	      if (this.char === CHAR_s) {
	        this.consume();
	        return this.next(this.parseFalse_e)
	      } else {
	        throw this.error(new TomlError('Invalid boolean, expected true or false'))
	      }
	    }

	    parseFalse_e () {
	      if (this.char === CHAR_e) {
	        return this.return(false)
	      } else {
	        throw this.error(new TomlError('Invalid boolean, expected true or false'))
	      }
	    }

	    /* INLINE LISTS */
	    parseInlineList () {
	      if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M || this.char === CTRL_J) {
	        return null
	      } else if (this.char === Parser.END) {
	        throw this.error(new TomlError('Unterminated inline array'))
	      } else if (this.char === CHAR_NUM) {
	        return this.call(this.parseComment)
	      } else if (this.char === CHAR_RSQB) {
	        return this.return(this.state.resultArr || InlineList())
	      } else {
	        return this.callNow(this.parseValue, this.recordInlineListValue)
	      }
	    }
	    recordInlineListValue (value) {
	      if (this.state.resultArr) {
	        const listType = this.state.resultArr[_contentType];
	        const valueType = tomlType(value);
	        if (listType !== valueType) {
	          throw this.error(new TomlError(`Inline lists must be a single type, not a mix of ${listType} and ${valueType}`))
	        }
	      } else {
	        this.state.resultArr = InlineList(tomlType(value));
	      }
	      if (isFloat(value) || isInteger(value)) {
	        // unbox now that we've verified they're ok
	        this.state.resultArr.push(value.valueOf());
	      } else {
	        this.state.resultArr.push(value);
	      }
	      return this.goto(this.parseInlineListNext)
	    }
	    parseInlineListNext () {
	      if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M || this.char === CTRL_J) {
	        return null
	      } else if (this.char === CHAR_NUM) {
	        return this.call(this.parseComment)
	      } else if (this.char === CHAR_COMMA) {
	        return this.next(this.parseInlineList)
	      } else if (this.char === CHAR_RSQB) {
	        return this.goto(this.parseInlineList)
	      } else {
	        throw this.error(new TomlError('Invalid character, expected whitespace, comma (,) or close bracket (])'))
	      }
	    }

	    /* INLINE TABLE */
	    parseInlineTable () {
	      if (this.char === CHAR_SP || this.char === CTRL_I) {
	        return null
	      } else if (this.char === Parser.END || this.char === CHAR_NUM || this.char === CTRL_J || this.char === CTRL_M) {
	        throw this.error(new TomlError('Unterminated inline array'))
	      } else if (this.char === CHAR_RCUB) {
	        return this.return(this.state.resultTable || InlineTable())
	      } else {
	        if (!this.state.resultTable) this.state.resultTable = InlineTable();
	        return this.callNow(this.parseAssign, this.recordInlineTableValue)
	      }
	    }
	    recordInlineTableValue (kv) {
	      let target = this.state.resultTable;
	      let finalKey = kv.key.pop();
	      for (let kw of kv.key) {
	        if (hasKey(target, kw) && (!isTable(target[kw]) || target[kw][_declared])) {
	          throw this.error(new TomlError("Can't redefine existing key"))
	        }
	        target = target[kw] = target[kw] || Table();
	      }
	      if (hasKey(target, finalKey)) {
	        throw this.error(new TomlError("Can't redefine existing key"))
	      }
	      if (isInteger(kv.value) || isFloat(kv.value)) {
	        target[finalKey] = kv.value.valueOf();
	      } else {
	        target[finalKey] = kv.value;
	      }
	      return this.goto(this.parseInlineTableNext)
	    }
	    parseInlineTableNext () {
	      if (this.char === CHAR_SP || this.char === CTRL_I) {
	        return null
	      } else if (this.char === Parser.END || this.char === CHAR_NUM || this.char === CTRL_J || this.char === CTRL_M) {
	        throw this.error(new TomlError('Unterminated inline array'))
	      } else if (this.char === CHAR_COMMA) {
	        return this.next(this.parseInlineTable)
	      } else if (this.char === CHAR_RCUB) {
	        return this.goto(this.parseInlineTable)
	      } else {
	        throw this.error(new TomlError('Invalid character, expected whitespace, comma (,) or close bracket (])'))
	      }
	    }
	  }
	  return TOMLParser
	}
	return tomlParser.exports;
}

var parsePrettyError;
var hasRequiredParsePrettyError;

function requireParsePrettyError () {
	if (hasRequiredParsePrettyError) return parsePrettyError;
	hasRequiredParsePrettyError = 1;
	parsePrettyError = prettyError;

	function prettyError (err, buf) {
	  /* istanbul ignore if */
	  if (err.pos == null || err.line == null) return err
	  let msg = err.message;
	  msg += ` at row ${err.line + 1}, col ${err.col + 1}, pos ${err.pos}:\n`;

	  /* istanbul ignore else */
	  if (buf && buf.split) {
	    const lines = buf.split(/\n/);
	    const lineNumWidth = String(Math.min(lines.length, err.line + 3)).length;
	    let linePadding = ' ';
	    while (linePadding.length < lineNumWidth) linePadding += ' ';
	    for (let ii = Math.max(0, err.line - 1); ii < Math.min(lines.length, err.line + 2); ++ii) {
	      let lineNum = String(ii + 1);
	      if (lineNum.length < lineNumWidth) lineNum = ' ' + lineNum;
	      if (err.line === ii) {
	        msg += lineNum + '> ' + lines[ii] + '\n';
	        msg += linePadding + '  ';
	        for (let hh = 0; hh < err.col; ++hh) {
	          msg += ' ';
	        }
	        msg += '^\n';
	      } else {
	        msg += lineNum + ': ' + lines[ii] + '\n';
	      }
	    }
	  }
	  err.message = msg + '\n';
	  return err
	}
	return parsePrettyError;
}

var parseString_1;
var hasRequiredParseString;

function requireParseString () {
	if (hasRequiredParseString) return parseString_1;
	hasRequiredParseString = 1;
	parseString_1 = parseString;

	const TOMLParser = requireTomlParser();
	const prettyError = requireParsePrettyError();

	function parseString (str) {
	  if (commonjsGlobal.Buffer && commonjsGlobal.Buffer.isBuffer(str)) {
	    str = str.toString('utf8');
	  }
	  const parser = new TOMLParser();
	  try {
	    parser.parse(str);
	    return parser.finish()
	  } catch (err) {
	    throw prettyError(err, str)
	  }
	}
	return parseString_1;
}

var parseAsync_1;
var hasRequiredParseAsync;

function requireParseAsync () {
	if (hasRequiredParseAsync) return parseAsync_1;
	hasRequiredParseAsync = 1;
	parseAsync_1 = parseAsync;

	const TOMLParser = requireTomlParser();
	const prettyError = requireParsePrettyError();

	function parseAsync (str, opts) {
	  if (!opts) opts = {};
	  const index = 0;
	  const blocksize = opts.blocksize || 40960;
	  const parser = new TOMLParser();
	  return new Promise((resolve, reject) => {
	    setImmediate(parseAsyncNext, index, blocksize, resolve, reject);
	  })
	  function parseAsyncNext (index, blocksize, resolve, reject) {
	    if (index >= str.length) {
	      try {
	        return resolve(parser.finish())
	      } catch (err) {
	        return reject(prettyError(err, str))
	      }
	    }
	    try {
	      parser.parse(str.slice(index, index + blocksize));
	      setImmediate(parseAsyncNext, index + blocksize, blocksize, resolve, reject);
	    } catch (err) {
	      reject(prettyError(err, str));
	    }
	  }
	}
	return parseAsync_1;
}

var parseStream_1;
var hasRequiredParseStream;

function requireParseStream () {
	if (hasRequiredParseStream) return parseStream_1;
	hasRequiredParseStream = 1;
	parseStream_1 = parseStream;

	const stream = require$$0;
	const TOMLParser = requireTomlParser();

	function parseStream (stm) {
	  if (stm) {
	    return parseReadable(stm)
	  } else {
	    return parseTransform()
	  }
	}

	function parseReadable (stm) {
	  const parser = new TOMLParser();
	  stm.setEncoding('utf8');
	  return new Promise((resolve, reject) => {
	    let readable;
	    let ended = false;
	    let errored = false;
	    function finish () {
	      ended = true;
	      if (readable) return
	      try {
	        resolve(parser.finish());
	      } catch (err) {
	        reject(err);
	      }
	    }
	    function error (err) {
	      errored = true;
	      reject(err);
	    }
	    stm.once('end', finish);
	    stm.once('error', error);
	    readNext();

	    function readNext () {
	      readable = true;
	      let data;
	      while ((data = stm.read()) !== null) {
	        try {
	          parser.parse(data);
	        } catch (err) {
	          return error(err)
	        }
	      }
	      readable = false;
	      /* istanbul ignore if */
	      if (ended) return finish()
	      /* istanbul ignore if */
	      if (errored) return
	      stm.once('readable', readNext);
	    }
	  })
	}

	function parseTransform () {
	  const parser = new TOMLParser();
	  return new stream.Transform({
	    objectMode: true,
	    transform (chunk, encoding, cb) {
	      try {
	        parser.parse(chunk.toString(encoding));
	      } catch (err) {
	        this.emit('error', err);
	      }
	      cb();
	    },
	    flush (cb) {
	      try {
	        this.push(parser.finish());
	      } catch (err) {
	        this.emit('error', err);
	      }
	      cb();
	    }
	  })
	}
	return parseStream_1;
}

var hasRequiredParse;

function requireParse () {
	if (hasRequiredParse) return parse.exports;
	hasRequiredParse = 1;
	parse.exports = requireParseString();
	parse.exports.async = requireParseAsync();
	parse.exports.stream = requireParseStream();
	parse.exports.prettyError = requireParsePrettyError();
	return parse.exports;
}

var stringify = {exports: {}};

var hasRequiredStringify;

function requireStringify () {
	if (hasRequiredStringify) return stringify.exports;
	hasRequiredStringify = 1;
	stringify.exports = stringify$1;
	stringify.exports.value = stringifyInline;

	function stringify$1 (obj) {
	  if (obj === null) throw typeError('null')
	  if (obj === void 0) throw typeError('undefined')
	  if (typeof obj !== 'object') throw typeError(typeof obj)

	  if (typeof obj.toJSON === 'function') obj = obj.toJSON();
	  if (obj == null) return null
	  const type = tomlType(obj);
	  if (type !== 'table') throw typeError(type)
	  return stringifyObject('', '', obj)
	}

	function typeError (type) {
	  return new Error('Can only stringify objects, not ' + type)
	}

	function arrayOneTypeError () {
	  return new Error("Array values can't have mixed types")
	}

	function getInlineKeys (obj) {
	  return Object.keys(obj).filter(key => isInline(obj[key]))
	}
	function getComplexKeys (obj) {
	  return Object.keys(obj).filter(key => !isInline(obj[key]))
	}

	function toJSON (obj) {
	  let nobj = Array.isArray(obj) ? [] : Object.prototype.hasOwnProperty.call(obj, '__proto__') ? {['__proto__']: undefined} : {};
	  for (let prop of Object.keys(obj)) {
	    if (obj[prop] && typeof obj[prop].toJSON === 'function' && !('toISOString' in obj[prop])) {
	      nobj[prop] = obj[prop].toJSON();
	    } else {
	      nobj[prop] = obj[prop];
	    }
	  }
	  return nobj
	}

	function stringifyObject (prefix, indent, obj) {
	  obj = toJSON(obj);
	  var inlineKeys;
	  var complexKeys;
	  inlineKeys = getInlineKeys(obj);
	  complexKeys = getComplexKeys(obj);
	  var result = [];
	  var inlineIndent = indent || '';
	  inlineKeys.forEach(key => {
	    var type = tomlType(obj[key]);
	    if (type !== 'undefined' && type !== 'null') {
	      result.push(inlineIndent + stringifyKey(key) + ' = ' + stringifyAnyInline(obj[key], true));
	    }
	  });
	  if (result.length > 0) result.push('');
	  var complexIndent = prefix && inlineKeys.length > 0 ? indent + '  ' : '';
	  complexKeys.forEach(key => {
	    result.push(stringifyComplex(prefix, complexIndent, key, obj[key]));
	  });
	  return result.join('\n')
	}

	function isInline (value) {
	  switch (tomlType(value)) {
	    case 'undefined':
	    case 'null':
	    case 'integer':
	    case 'nan':
	    case 'float':
	    case 'boolean':
	    case 'string':
	    case 'datetime':
	      return true
	    case 'array':
	      return value.length === 0 || tomlType(value[0]) !== 'table'
	    case 'table':
	      return Object.keys(value).length === 0
	    /* istanbul ignore next */
	    default:
	      return false
	  }
	}

	function tomlType (value) {
	  if (value === undefined) {
	    return 'undefined'
	  } else if (value === null) {
	    return 'null'
	  /* eslint-disable valid-typeof */
	  } else if (typeof value === 'bigint' || (Number.isInteger(value) && !Object.is(value, -0))) {
	    return 'integer'
	  } else if (typeof value === 'number') {
	    return 'float'
	  } else if (typeof value === 'boolean') {
	    return 'boolean'
	  } else if (typeof value === 'string') {
	    return 'string'
	  } else if ('toISOString' in value) {
	    return isNaN(value) ? 'undefined' : 'datetime'
	  } else if (Array.isArray(value)) {
	    return 'array'
	  } else {
	    return 'table'
	  }
	}

	function stringifyKey (key) {
	  var keyStr = String(key);
	  if (/^[-A-Za-z0-9_]+$/.test(keyStr)) {
	    return keyStr
	  } else {
	    return stringifyBasicString(keyStr)
	  }
	}

	function stringifyBasicString (str) {
	  return '"' + escapeString(str).replace(/"/g, '\\"') + '"'
	}

	function stringifyLiteralString (str) {
	  return "'" + str + "'"
	}

	function numpad (num, str) {
	  while (str.length < num) str = '0' + str;
	  return str
	}

	function escapeString (str) {
	  return str.replace(/\\/g, '\\\\')
	    .replace(/[\b]/g, '\\b')
	    .replace(/\t/g, '\\t')
	    .replace(/\n/g, '\\n')
	    .replace(/\f/g, '\\f')
	    .replace(/\r/g, '\\r')
	    /* eslint-disable no-control-regex */
	    .replace(/([\u0000-\u001f\u007f])/, c => '\\u' + numpad(4, c.codePointAt(0).toString(16)))
	    /* eslint-enable no-control-regex */
	}

	function stringifyMultilineString (str) {
	  let escaped = str.split(/\n/).map(str => {
	    return escapeString(str).replace(/"(?="")/g, '\\"')
	  }).join('\n');
	  if (escaped.slice(-1) === '"') escaped += '\\\n';
	  return '"""\n' + escaped + '"""'
	}

	function stringifyAnyInline (value, multilineOk) {
	  let type = tomlType(value);
	  if (type === 'string') {
	    if (multilineOk && /\n/.test(value)) {
	      type = 'string-multiline';
	    } else if (!/[\b\t\n\f\r']/.test(value) && /"/.test(value)) {
	      type = 'string-literal';
	    }
	  }
	  return stringifyInline(value, type)
	}

	function stringifyInline (value, type) {
	  /* istanbul ignore if */
	  if (!type) type = tomlType(value);
	  switch (type) {
	    case 'string-multiline':
	      return stringifyMultilineString(value)
	    case 'string':
	      return stringifyBasicString(value)
	    case 'string-literal':
	      return stringifyLiteralString(value)
	    case 'integer':
	      return stringifyInteger(value)
	    case 'float':
	      return stringifyFloat(value)
	    case 'boolean':
	      return stringifyBoolean(value)
	    case 'datetime':
	      return stringifyDatetime(value)
	    case 'array':
	      return stringifyInlineArray(value.filter(_ => tomlType(_) !== 'null' && tomlType(_) !== 'undefined' && tomlType(_) !== 'nan'))
	    case 'table':
	      return stringifyInlineTable(value)
	    /* istanbul ignore next */
	    default:
	      throw typeError(type)
	  }
	}

	function stringifyInteger (value) {
	  /* eslint-disable security/detect-unsafe-regex */
	  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '_')
	}

	function stringifyFloat (value) {
	  if (value === Infinity) {
	    return 'inf'
	  } else if (value === -Infinity) {
	    return '-inf'
	  } else if (Object.is(value, NaN)) {
	    return 'nan'
	  } else if (Object.is(value, -0)) {
	    return '-0.0'
	  }
	  var chunks = String(value).split('.');
	  var int = chunks[0];
	  var dec = chunks[1] || 0;
	  return stringifyInteger(int) + '.' + dec
	}

	function stringifyBoolean (value) {
	  return String(value)
	}

	function stringifyDatetime (value) {
	  return value.toISOString()
	}

	function isNumber (type) {
	  return type === 'float' || type === 'integer'
	}
	function arrayType (values) {
	  var contentType = tomlType(values[0]);
	  if (values.every(_ => tomlType(_) === contentType)) return contentType
	  // mixed integer/float, emit as floats
	  if (values.every(_ => isNumber(tomlType(_)))) return 'float'
	  return 'mixed'
	}
	function validateArray (values) {
	  const type = arrayType(values);
	  if (type === 'mixed') {
	    throw arrayOneTypeError()
	  }
	  return type
	}

	function stringifyInlineArray (values) {
	  values = toJSON(values);
	  const type = validateArray(values);
	  var result = '[';
	  var stringified = values.map(_ => stringifyInline(_, type));
	  if (stringified.join(', ').length > 60 || /\n/.test(stringified)) {
	    result += '\n  ' + stringified.join(',\n  ') + '\n';
	  } else {
	    result += ' ' + stringified.join(', ') + (stringified.length > 0 ? ' ' : '');
	  }
	  return result + ']'
	}

	function stringifyInlineTable (value) {
	  value = toJSON(value);
	  var result = [];
	  Object.keys(value).forEach(key => {
	    result.push(stringifyKey(key) + ' = ' + stringifyAnyInline(value[key], false));
	  });
	  return '{ ' + result.join(', ') + (result.length > 0 ? ' ' : '') + '}'
	}

	function stringifyComplex (prefix, indent, key, value) {
	  var valueType = tomlType(value);
	  /* istanbul ignore else */
	  if (valueType === 'array') {
	    return stringifyArrayOfTables(prefix, indent, key, value)
	  } else if (valueType === 'table') {
	    return stringifyComplexTable(prefix, indent, key, value)
	  } else {
	    throw typeError(valueType)
	  }
	}

	function stringifyArrayOfTables (prefix, indent, key, values) {
	  values = toJSON(values);
	  validateArray(values);
	  var firstValueType = tomlType(values[0]);
	  /* istanbul ignore if */
	  if (firstValueType !== 'table') throw typeError(firstValueType)
	  var fullKey = prefix + stringifyKey(key);
	  var result = '';
	  values.forEach(table => {
	    if (result.length > 0) result += '\n';
	    result += indent + '[[' + fullKey + ']]\n';
	    result += stringifyObject(fullKey + '.', indent, table);
	  });
	  return result
	}

	function stringifyComplexTable (prefix, indent, key, value) {
	  var fullKey = prefix + stringifyKey(key);
	  var result = '';
	  if (getInlineKeys(value).length > 0) {
	    result += indent + '[' + fullKey + ']\n';
	  }
	  return result + stringifyObject(fullKey + '.', indent, value)
	}
	return stringify.exports;
}

var hasRequiredToml;

function requireToml () {
	if (hasRequiredToml) return toml;
	hasRequiredToml = 1;
	toml.parse = requireParse();
	toml.stringify = requireStringify();
	return toml;
}

var tomlExports = requireToml();

const DEFAULT_NOTIFICATION_CONFIG = {
  enabled: false,
  deviceToken: "",
  threshold: 10,
  // 10 minutes
  cloudEndpoint: "https://api.claudehome.cn",
  channels: {},
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 8
  }
};
function validateNotificationConfig(config) {
  const errors = [];
  const warnings = [];
  if (config.threshold !== void 0) {
    if (config.threshold < 1) {
      errors.push({
        field: "threshold",
        message: "Threshold must be at least 1 minute",
        code: "THRESHOLD_TOO_LOW"
      });
    }
    if (config.threshold > 1440) {
      warnings.push("Threshold is set to more than 24 hours");
    }
  }
  if (config.channels?.feishu?.enabled) {
    if (!config.channels.feishu.webhookUrl) {
      errors.push({
        field: "channels.feishu.webhookUrl",
        message: "Feishu webhook URL is required when enabled",
        code: "FEISHU_WEBHOOK_REQUIRED"
      });
    } else if (!config.channels.feishu.webhookUrl.startsWith("https://")) {
      errors.push({
        field: "channels.feishu.webhookUrl",
        message: "Feishu webhook URL must use HTTPS",
        code: "FEISHU_WEBHOOK_INVALID"
      });
    }
  }
  if (config.channels?.wechat?.enabled) {
    if (!config.channels.wechat.corpId) {
      errors.push({
        field: "channels.wechat.corpId",
        message: "WeChat Work Corp ID is required when enabled",
        code: "WECHAT_CORPID_REQUIRED"
      });
    }
    if (!config.channels.wechat.agentId) {
      errors.push({
        field: "channels.wechat.agentId",
        message: "WeChat Work Agent ID is required when enabled",
        code: "WECHAT_AGENTID_REQUIRED"
      });
    }
    if (!config.channels.wechat.secret) {
      errors.push({
        field: "channels.wechat.secret",
        message: "WeChat Work Secret is required when enabled",
        code: "WECHAT_SECRET_REQUIRED"
      });
    }
  }
  if (config.channels?.email?.enabled) {
    if (!config.channels.email.address) {
      errors.push({
        field: "channels.email.address",
        message: "Email address is required when enabled",
        code: "EMAIL_ADDRESS_REQUIRED"
      });
    } else if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(config.channels.email.address)) {
      errors.push({
        field: "channels.email.address",
        message: "Invalid email address format",
        code: "EMAIL_ADDRESS_INVALID"
      });
    }
  }
  if (config.channels?.sms?.enabled) {
    if (!config.channels.sms.phone) {
      errors.push({
        field: "channels.sms.phone",
        message: "Phone number is required when enabled",
        code: "SMS_PHONE_REQUIRED"
      });
    } else if (!/^\d{10,15}$/.test(config.channels.sms.phone.replace(/\D/g, ""))) {
      errors.push({
        field: "channels.sms.phone",
        message: "Invalid phone number format",
        code: "SMS_PHONE_INVALID"
      });
    }
  }
  if (config.quietHours?.enabled) {
    if (config.quietHours.startHour < 0 || config.quietHours.startHour > 23) {
      errors.push({
        field: "quietHours.startHour",
        message: "Start hour must be between 0 and 23",
        code: "QUIET_HOURS_INVALID"
      });
    }
    if (config.quietHours.endHour < 0 || config.quietHours.endHour > 23) {
      errors.push({
        field: "quietHours.endHour",
        message: "End hour must be between 0 and 23",
        code: "QUIET_HOURS_INVALID"
      });
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

const CCJK_CONFIG_DIR = path__default.join(os__default.homedir(), ".ccjk");
const CONFIG_FILE_PATH = path__default.join(CCJK_CONFIG_DIR, "config.toml");
const SECRETS_FILE_PATH = path__default.join(CCJK_CONFIG_DIR, ".notification-secrets");
async function loadNotificationConfig() {
  try {
    if (!fs__default.existsSync(CCJK_CONFIG_DIR)) {
      fs__default.mkdirSync(CCJK_CONFIG_DIR, { recursive: true });
    }
    if (!fs__default.existsSync(CONFIG_FILE_PATH)) {
      return { ...DEFAULT_NOTIFICATION_CONFIG };
    }
    const configContent = fs__default.readFileSync(CONFIG_FILE_PATH, "utf-8");
    const config = tomlExports.parse(configContent);
    const notificationConfig = config.notification;
    if (!notificationConfig) {
      return { ...DEFAULT_NOTIFICATION_CONFIG };
    }
    const deviceToken = await loadDeviceToken();
    const quietHoursConfig = notificationConfig.quietHours || {};
    const defaultQuietHours = DEFAULT_NOTIFICATION_CONFIG.quietHours || {
      enabled: false,
      startHour: 22,
      endHour: 8,
      timezone: "local"
    };
    return {
      ...DEFAULT_NOTIFICATION_CONFIG,
      ...notificationConfig,
      deviceToken: deviceToken || notificationConfig.deviceToken || "",
      channels: {
        ...DEFAULT_NOTIFICATION_CONFIG.channels,
        ...notificationConfig.channels
      },
      quietHours: {
        enabled: quietHoursConfig.enabled ?? defaultQuietHours.enabled,
        startHour: quietHoursConfig.startHour ?? defaultQuietHours.startHour,
        endHour: quietHoursConfig.endHour ?? defaultQuietHours.endHour,
        timezone: quietHoursConfig.timezone ?? defaultQuietHours.timezone
      }
    };
  } catch (error) {
    console.error("Failed to load notification config:", error);
    return { ...DEFAULT_NOTIFICATION_CONFIG };
  }
}
async function loadDeviceToken() {
  try {
    if (!fs__default.existsSync(SECRETS_FILE_PATH)) {
      return null;
    }
    const secretsContent = fs__default.readFileSync(SECRETS_FILE_PATH, "utf-8");
    const secrets = JSON.parse(secretsContent);
    if (!secrets.deviceToken) {
      return null;
    }
    const decryptedToken = decryptToken(secrets.deviceToken);
    return decryptedToken;
  } catch {
    return null;
  }
}
async function saveNotificationConfig(config) {
  try {
    if (!fs__default.existsSync(CCJK_CONFIG_DIR)) {
      fs__default.mkdirSync(CCJK_CONFIG_DIR, { recursive: true });
    }
    let existingConfig = {};
    if (fs__default.existsSync(CONFIG_FILE_PATH)) {
      const configContent = fs__default.readFileSync(CONFIG_FILE_PATH, "utf-8");
      existingConfig = tomlExports.parse(configContent);
    }
    const notificationConfig = { ...config };
    if (notificationConfig.deviceToken) {
      await saveDeviceToken(notificationConfig.deviceToken);
      delete notificationConfig.deviceToken;
    }
    existingConfig.notification = {
      ...existingConfig.notification || {},
      ...notificationConfig
    };
    const tomlContent = tomlExports.stringify(existingConfig);
    writeFileAtomic(CONFIG_FILE_PATH, tomlContent);
  } catch (error) {
    throw new Error(`Failed to save notification config: ${error}`);
  }
}
async function saveDeviceToken(token) {
  try {
    const encryptedToken = encryptToken(token);
    let secrets = {};
    if (fs__default.existsSync(SECRETS_FILE_PATH)) {
      const secretsContent = fs__default.readFileSync(SECRETS_FILE_PATH, "utf-8");
      secrets = JSON.parse(secretsContent);
    }
    secrets.deviceToken = encryptedToken;
    secrets.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    writeFileAtomic(SECRETS_FILE_PATH, JSON.stringify(secrets, null, 2), {
      encoding: "utf-8",
      mode: 384
      // Owner read/write only
    });
  } catch (error) {
    throw new Error(`Failed to save device token: ${error}`);
  }
}
async function initializeNotificationConfig() {
  const existingConfig = await loadNotificationConfig();
  if (!existingConfig.deviceToken || !isValidTokenFormat(existingConfig.deviceToken)) {
    existingConfig.deviceToken = generateDeviceToken();
    await saveNotificationConfig(existingConfig);
  }
  return existingConfig;
}
async function updateNotificationConfig(updates) {
  const currentConfig = await loadNotificationConfig();
  const updatesQuietHours = updates.quietHours || {};
  const currentQuietHours = currentConfig.quietHours || {
    enabled: false,
    startHour: 22,
    endHour: 8,
    timezone: "local"
  };
  const newConfig = {
    ...currentConfig,
    ...updates,
    channels: {
      ...currentConfig.channels,
      ...updates.channels
    },
    quietHours: {
      enabled: updatesQuietHours.enabled ?? currentQuietHours.enabled,
      startHour: updatesQuietHours.startHour ?? currentQuietHours.startHour,
      endHour: updatesQuietHours.endHour ?? currentQuietHours.endHour,
      timezone: updatesQuietHours.timezone ?? currentQuietHours.timezone
    }
  };
  await saveNotificationConfig(newConfig);
  return newConfig;
}
async function enableChannel(channel, config) {
  const currentConfig = await loadNotificationConfig();
  currentConfig.channels[channel] = {
    ...config,
    enabled: true
  };
  await saveNotificationConfig(currentConfig);
}
async function disableChannel(channel) {
  const currentConfig = await loadNotificationConfig();
  if (currentConfig.channels[channel]) {
    currentConfig.channels[channel].enabled = false;
    await saveNotificationConfig(currentConfig);
  }
}
async function getEnabledChannels() {
  const config = await loadNotificationConfig();
  const enabledChannels = [];
  if (config.channels.feishu?.enabled) {
    enabledChannels.push("feishu");
  }
  if (config.channels.wechat?.enabled) {
    enabledChannels.push("wechat");
  }
  if (config.channels.email?.enabled) {
    enabledChannels.push("email");
  }
  if (config.channels.sms?.enabled) {
    enabledChannels.push("sms");
  }
  return enabledChannels;
}
async function validateCurrentConfig() {
  const config = await loadNotificationConfig();
  return validateNotificationConfig(config);
}
async function getConfigSummary() {
  const config = await loadNotificationConfig();
  const enabledChannels = await getEnabledChannels();
  return {
    enabled: config.enabled,
    deviceToken: maskToken(config.deviceToken),
    threshold: config.threshold,
    enabledChannels,
    quietHours: {
      enabled: config.quietHours?.enabled || false,
      hours: config.quietHours?.enabled ? `${config.quietHours.startHour}:00 - ${config.quietHours.endHour}:00` : void 0
    }
  };
}
const THRESHOLD_OPTIONS = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" }
];
async function setThreshold(minutes) {
  if (minutes < 1) {
    throw new Error("Threshold must be at least 1 minute");
  }
  await updateNotificationConfig({ threshold: minutes });
}
async function enableNotifications() {
  await updateNotificationConfig({ enabled: true });
}
async function disableNotifications() {
  await updateNotificationConfig({ enabled: false });
}

const DEFAULT_CLOUD_ENDPOINT = "https://api.claudehome.cn";
const REQUEST_TIMEOUT = 3e4;
const POLL_TIMEOUT = 6e4;
class CloudClient {
  static instance = null;
  endpoint = DEFAULT_CLOUD_ENDPOINT;
  deviceToken = "";
  isPolling = false;
  pollAbortController = null;
  constructor() {
  }
  /**
   * Get the singleton instance
   */
  static getInstance() {
    if (!CloudClient.instance) {
      CloudClient.instance = new CloudClient();
    }
    return CloudClient.instance;
  }
  /**
   * Initialize the cloud client
   */
  async initialize() {
    const config = await loadNotificationConfig();
    this.endpoint = config.cloudEndpoint || DEFAULT_CLOUD_ENDPOINT;
    this.deviceToken = config.deviceToken;
  }
  /**
   * Set the cloud endpoint
   */
  setEndpoint(endpoint) {
    this.endpoint = endpoint;
  }
  /**
   * Set the device token
   */
  setDeviceToken(token) {
    this.deviceToken = token;
  }
  // ==========================================================================
  // Device Registration
  // ==========================================================================
  /**
   * Register this device with the cloud service
   */
  async registerDevice(name) {
    const deviceInfo = getDeviceInfo();
    const config = await loadNotificationConfig();
    const channelsArray = this.convertChannelsToArray(config.channels);
    const request = {
      name: name || deviceInfo.name,
      platform: deviceInfo.platform,
      version: "1.0.0",
      // TODO: Get from package.json
      config: {
        channels: channelsArray,
        threshold: config.threshold
      }
    };
    const response = await this.request(
      "/device/register",
      {
        method: "POST",
        body: JSON.stringify(request)
      }
    );
    if (response.success && response.data) {
      await updateNotificationConfig({
        deviceToken: response.data.token
      });
      this.deviceToken = response.data.token;
      return response.data;
    }
    throw new Error(response.error || "Failed to register device");
  }
  /**
   * Get device info from cloud service
   */
  async getDeviceInfo() {
    const response = await this.request(
      "/device/info",
      { method: "GET" }
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to get device info");
  }
  /**
   * Update device channels on cloud service
   */
  async updateChannels(channels) {
    const channelsArray = this.convertChannelsToArray(channels);
    const response = await this.request(
      "/device/channels",
      {
        method: "PUT",
        body: JSON.stringify({ channels: channelsArray })
      }
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to update channels");
    }
  }
  // ==========================================================================
  // Notification Sending
  // ==========================================================================
  /**
   * Send a notification through the cloud service
   */
  async sendNotification(message, channels) {
    const config = await loadNotificationConfig();
    const targetChannels = channels || this.getEnabledChannelsFromConfig(config.channels);
    if (targetChannels.length === 0) {
      return [];
    }
    const title = message.title || this.generateTitle(message.type);
    const body = this.generateBody(message);
    const response = await this.request(
      "/notify",
      {
        method: "POST",
        body: JSON.stringify({
          type: message.type,
          title,
          body,
          task: message.task,
          channels: targetChannels,
          actions: message.actions,
          priority: message.priority
        })
      }
    );
    if (response.success && response.data) {
      return response.data.results;
    }
    return targetChannels.map((channel) => ({
      success: false,
      channel,
      sentAt: /* @__PURE__ */ new Date(),
      error: response.error || "Failed to send notification"
    }));
  }
  /**
   * Send a test notification
   */
  async sendTestNotification() {
    const response = await this.request(
      "/notify/test",
      { method: "POST" }
    );
    if (response.success && response.data) {
      return response.data.results;
    }
    throw new Error(response.error || "Failed to send test notification");
  }
  // ==========================================================================
  // Reply Polling
  // ==========================================================================
  /**
   * Start polling for replies
   *
   * @param onReply - Callback when a reply is received
   * @param onError - Callback when an error occurs
   */
  startPolling(onReply, onError) {
    if (this.isPolling) {
      return;
    }
    this.isPolling = true;
    this.pollLoop(onReply, onError);
  }
  /**
   * Stop polling for replies
   */
  stopPolling() {
    this.isPolling = false;
    if (this.pollAbortController) {
      this.pollAbortController.abort();
      this.pollAbortController = null;
    }
  }
  /**
   * Poll loop for replies
   */
  async pollLoop(onReply, onError) {
    while (this.isPolling) {
      try {
        const reply = await this.pollForReply();
        if (reply) {
          onReply(reply);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          break;
        }
        onError?.(error instanceof Error ? error : new Error(String(error)));
        await this.sleep(5e3);
      }
    }
  }
  /**
   * Poll for a single reply (long-polling)
   */
  async pollForReply() {
    this.pollAbortController = new AbortController();
    try {
      const response = await this.request(
        "/reply/poll",
        {
          method: "GET",
          signal: this.pollAbortController.signal,
          timeout: POLL_TIMEOUT
        }
      );
      if (response.success && response.data?.reply) {
        return {
          ...response.data.reply,
          timestamp: new Date(response.data.reply.timestamp)
        };
      }
      return null;
    } finally {
      this.pollAbortController = null;
    }
  }
  /**
   * Get reply for a specific notification
   */
  async getReply(notificationId) {
    const response = await this.request(
      `/reply/${notificationId}`,
      { method: "GET" }
    );
    if (response.success && response.data?.reply) {
      return {
        ...response.data.reply,
        timestamp: new Date(response.data.reply.timestamp)
      };
    }
    return null;
  }
  // ==========================================================================
  // HTTP Request Helper
  // ==========================================================================
  /**
   * Make an HTTP request to the cloud service
   */
  async request(path, options) {
    const url = `${this.endpoint}${path}`;
    const timeout = options.timeout || REQUEST_TIMEOUT;
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);
    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          "Content-Type": "application/json",
          "X-Device-Token": this.deviceToken
        },
        body: options.body,
        signal: options.signal || timeoutController.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          code: data.code
        };
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw error;
        }
        return {
          success: false,
          error: error.message,
          code: "NETWORK_ERROR"
        };
      }
      return {
        success: false,
        error: String(error),
        code: "UNKNOWN_ERROR"
      };
    }
  }
  // ==========================================================================
  // Utility Methods
  // ==========================================================================
  /**
   * Get enabled channels from config
   */
  getEnabledChannelsFromConfig(channels) {
    const enabledChannels = [];
    for (const [name, channelConfig] of Object.entries(channels)) {
      if (channelConfig?.enabled) {
        enabledChannels.push(name);
      }
    }
    return enabledChannels;
  }
  /**
   * Sleep for a specified duration
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Convert channels from object format to array format
   *
   * Converts from: { feishu: { enabled: true, webhookUrl: "..." } }
   * To: [{ type: "feishu", enabled: true, config: { webhookUrl: "..." } }]
   */
  convertChannelsToArray(channels) {
    const result = [];
    for (const [channelType, channelData] of Object.entries(channels)) {
      if (channelData && typeof channelData === "object") {
        const { enabled, ...config } = channelData;
        result.push({
          type: channelType,
          enabled: Boolean(enabled),
          config
        });
      }
    }
    return result;
  }
  /**
   * Generate notification title based on type
   */
  generateTitle(type) {
    const titles = {
      task_started: "Task Started",
      task_progress: "Task Progress",
      task_completed: "Task Completed",
      task_failed: "Task Failed",
      task_cancelled: "Task Cancelled",
      system: "System Notification"
    };
    return titles[type] || "Notification";
  }
  /**
   * Generate notification body from message
   */
  generateBody(message) {
    const { task } = message;
    const lines = [];
    lines.push(`**Task**: ${task.description}`);
    lines.push(`**Status**: ${task.status}`);
    if (task.duration) {
      const minutes = Math.floor(task.duration / 6e4);
      const seconds = Math.floor(task.duration % 6e4 / 1e3);
      lines.push(`**Duration**: ${minutes}m ${seconds}s`);
    }
    if (task.result) {
      lines.push(`**Result**: ${task.result}`);
    }
    if (task.error) {
      lines.push(`**Error**: ${task.error}`);
    }
    return lines.join("\n");
  }
  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance() {
    if (CloudClient.instance) {
      CloudClient.instance.stopPolling();
      CloudClient.instance = null;
    }
  }
}

async function notificationCommand(action = "menu", args) {
  switch (action) {
    case "config":
    case "configure":
      await runConfigWizard();
      break;
    case "status":
      await showStatus();
      break;
    case "test":
      await sendTestNotification();
      break;
    case "enable":
      await enableNotifications();
      console.log(ansis.green(`\u2705 ${i18n.t("notification:status.enabled")}`));
      break;
    case "disable":
      await disableNotifications();
      console.log(ansis.yellow(`\u23F8\uFE0F ${i18n.t("notification:status.disabled")}`));
      break;
    case "channels":
      await manageChannels();
      break;
    case "threshold":
      await configureThreshold();
      break;
    case "bind":
      await handleBind(args?.[0]);
      break;
    case "unbind":
      await handleUnbind();
      break;
    case "cloud-status":
      await showCloudStatus();
      break;
    case "local-config":
      await configureLocalNotification();
      break;
    case "local-test":
      await testLocalNotification();
      break;
    case "menu":
    default:
      await showNotificationMenu();
      break;
  }
}
async function showNotificationMenu() {
  const config = await loadNotificationConfig();
  const enabledChannels = await getEnabledChannels();
  const cloudBound = isDeviceBound();
  console.log("");
  console.log(ansis.bold.cyan(i18n.t("notification:menu.title")));
  console.log("");
  const statusText = config.enabled ? ansis.green(i18n.t("notification:status.enabled")) : ansis.yellow(i18n.t("notification:status.disabled"));
  console.log(`  ${ansis.dim(i18n.t("notification:menu.statusLabel"))} ${statusText}`);
  const cloudStatusText = cloudBound ? ansis.green(i18n.t("notification:cloud.bound")) : ansis.yellow(i18n.t("notification:cloud.notBound"));
  console.log(`  ${ansis.dim(i18n.t("notification:cloud.statusLabel"))} ${cloudStatusText}`);
  if (enabledChannels.length > 0) {
    const channelNames = enabledChannels.map((ch) => i18n.t(`notification:channels.${ch}`)).join(", ");
    console.log(`  ${ansis.dim(i18n.t("notification:menu.channelsLabel"))} ${channelNames}`);
  } else {
    console.log(`  ${ansis.dim(i18n.t("notification:menu.channelsLabel"))} ${ansis.yellow(i18n.t("notification:channels.noChannels"))}`);
  }
  console.log(`  ${ansis.dim(i18n.t("notification:menu.thresholdLabel"))} ${config.threshold} ${i18n.t("notification:config.threshold.minutes", { count: config.threshold })}`);
  console.log("");
  const choices = [];
  if (!cloudBound) {
    choices.push({ name: `\u{1F517} ${i18n.t("notification:cloud.bindDevice")}`, value: "bind" });
  } else {
    choices.push({ name: `\u2601\uFE0F  ${i18n.t("notification:cloud.viewStatus")}`, value: "cloud-status" });
  }
  choices.push({
    name: config.enabled ? `\u23F8\uFE0F  ${i18n.t("notification:menu.disable")}` : `\u25B6\uFE0F  ${i18n.t("notification:menu.enable")}`,
    value: config.enabled ? "disable" : "enable"
  });
  choices.push(
    { name: `\u2699\uFE0F  ${i18n.t("notification:menu.configWizard")}`, value: "config" },
    { name: `\u{1F4F1} ${i18n.t("notification:menu.manageChannels")}`, value: "channels" },
    { name: `\u{1F514} ${i18n.t("notification:local.menuTitle")}`, value: "local-config" },
    { name: `\u23F1\uFE0F  ${i18n.t("notification:menu.setThreshold")}`, value: "threshold" },
    { name: `\u{1F4CA} ${i18n.t("notification:menu.viewStatus")}`, value: "status" },
    { name: `\u{1F9EA} ${i18n.t("notification:menu.sendTest")}`, value: "test" }
  );
  if (cloudBound) {
    choices.push({ name: `\u{1F513} ${i18n.t("notification:cloud.unbindDevice")}`, value: "unbind" });
  }
  choices.push({ name: `\u2190 ${i18n.t("notification:menu.back")}`, value: "back" });
  const { action } = await inquirer.prompt([{
    type: "list",
    name: "action",
    message: i18n.t("notification:menu.selectAction"),
    choices
  }]);
  if (action === "back") {
    return;
  }
  await notificationCommand(action);
}
async function runConfigWizard() {
  console.log("");
  console.log(ansis.bold.cyan(i18n.t("notification:config.wizard.title")));
  console.log(ansis.dim(i18n.t("notification:config.wizard.welcome")));
  console.log("");
  console.log(ansis.yellow(i18n.t("notification:config.wizard.step1")));
  const config = await initializeNotificationConfig();
  console.log(ansis.green(i18n.t("notification:config.wizard.tokenGenerated", { token: maskToken(config.deviceToken) })));
  console.log("");
  console.log(ansis.yellow(i18n.t("notification:config.wizard.step2")));
  const channels = await selectChannels();
  console.log("");
  if (channels.length > 0) {
    console.log(ansis.yellow(i18n.t("notification:config.wizard.step3")));
    for (const channel of channels) {
      await configureChannel(channel);
    }
    console.log("");
  }
  console.log(ansis.yellow(i18n.t("notification:config.wizard.step4")));
  await configureThreshold();
  console.log("");
  console.log(ansis.yellow(i18n.t("notification:config.wizard.step5")));
  await updateNotificationConfig({ enabled: true });
  const { shouldTest } = await inquirer.prompt([{
    type: "confirm",
    name: "shouldTest",
    message: "\u662F\u5426\u53D1\u9001\u6D4B\u8BD5\u901A\u77E5?",
    default: true
  }]);
  if (shouldTest) {
    await sendTestNotification();
  }
  console.log("");
  console.log(ansis.bold.green(i18n.t("notification:config.wizard.complete")));
  console.log("");
}
async function selectChannels() {
  const choices = [
    { name: `\u{1F4F1} ${i18n.t("notification:channels.feishu")}`, value: "feishu" },
    { name: `\u{1F4AC} ${i18n.t("notification:channels.wechat")}`, value: "wechat" },
    { name: `\u{1F4E7} ${i18n.t("notification:channels.email")}`, value: "email" },
    { name: `\u{1F4F2} ${i18n.t("notification:channels.sms")}`, value: "sms" }
  ];
  const selected = [];
  for (const choice of choices) {
    const { enable } = await inquirer.prompt([{
      type: "confirm",
      name: "enable",
      message: `\u542F\u7528 ${choice.name}?`,
      default: false
    }]);
    if (enable) {
      selected.push(choice.value);
    }
  }
  return selected;
}
async function configureChannel(channel) {
  console.log("");
  console.log(ansis.green(`\u914D\u7F6E ${i18n.t(`notification:channels.${channel}`)}:`));
  switch (channel) {
    case "feishu":
      await configureFeishu();
      break;
    case "wechat":
      await configureWechat();
      break;
    case "email":
      await configureEmail();
      break;
    case "sms":
      await configureSms();
      break;
  }
}
async function configureFeishu() {
  const { webhookUrl } = await inquirer.prompt([{
    type: "input",
    name: "webhookUrl",
    message: i18n.t("notification:feishu.webhookUrl"),
    validate: (value) => {
      if (!value.startsWith("https://")) {
        return i18n.t("notification:errors.invalidWebhook");
      }
      return true;
    }
  }]);
  const { secret } = await inquirer.prompt([{
    type: "input",
    name: "secret",
    message: `${i18n.t("notification:feishu.secret")} (\u53EF\u9009\uFF0C\u76F4\u63A5\u56DE\u8F66\u8DF3\u8FC7):`
  }]);
  const config = {
    enabled: true,
    webhookUrl,
    ...secret && { secret }
  };
  await enableChannel("feishu", config);
  console.log(ansis.green(`\u2705 ${i18n.t("notification:channels.feishu")} ${i18n.t("notification:status.configured")}`));
}
async function configureWechat() {
  const { corpId } = await inquirer.prompt([{
    type: "input",
    name: "corpId",
    message: i18n.t("notification:wechat.corpId"),
    validate: (value) => !!value || i18n.t("notification:errors.invalidWebhook")
  }]);
  const { agentId } = await inquirer.prompt([{
    type: "input",
    name: "agentId",
    message: i18n.t("notification:wechat.agentId"),
    validate: (value) => !!value || i18n.t("notification:errors.invalidWebhook")
  }]);
  const { secret } = await inquirer.prompt([{
    type: "input",
    name: "secret",
    message: i18n.t("notification:wechat.secret"),
    validate: (value) => !!value || i18n.t("notification:errors.invalidWebhook")
  }]);
  const config = {
    enabled: true,
    corpId,
    agentId,
    secret
  };
  await enableChannel("wechat", config);
  console.log(ansis.green(`\u2705 ${i18n.t("notification:channels.wechat")} ${i18n.t("notification:status.configured")}`));
}
async function configureEmail() {
  const { address } = await inquirer.prompt([{
    type: "input",
    name: "address",
    message: i18n.t("notification:email.address"),
    validate: (value) => {
      if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(value)) {
        return i18n.t("notification:errors.invalidEmail");
      }
      return true;
    }
  }]);
  const config = {
    enabled: true,
    address
  };
  await enableChannel("email", config);
  console.log(ansis.green(`\u2705 ${i18n.t("notification:channels.email")} ${i18n.t("notification:status.configured")}`));
}
async function configureSms() {
  const { phone } = await inquirer.prompt([{
    type: "input",
    name: "phone",
    message: i18n.t("notification:sms.phone"),
    validate: (value) => {
      if (!/^\d{10,15}$/.test(value.replace(/\D/g, ""))) {
        return i18n.t("notification:errors.invalidPhone");
      }
      return true;
    }
  }]);
  const { countryCode } = await inquirer.prompt([{
    type: "input",
    name: "countryCode",
    message: i18n.t("notification:sms.countryCode"),
    default: "+86"
  }]);
  const config = {
    enabled: true,
    phone,
    countryCode
  };
  await enableChannel("sms", config);
  console.log(ansis.green(`\u2705 ${i18n.t("notification:channels.sms")} ${i18n.t("notification:status.configured")}`));
}
async function manageChannels() {
  const enabledChannels = await getEnabledChannels();
  console.log("");
  console.log(ansis.bold.cyan(i18n.t("notification:channels.title")));
  console.log("");
  if (enabledChannels.length === 0) {
    console.log(ansis.yellow(i18n.t("notification:channels.noChannels")));
  } else {
    console.log(i18n.t("notification:channels.enabledCount", { count: enabledChannels.length }));
    for (const channel of enabledChannels) {
      console.log(`  \u2705 ${i18n.t(`notification:channels.${channel}`)}`);
    }
  }
  console.log("");
  const { action } = await inquirer.prompt([{
    type: "list",
    name: "action",
    message: "\u9009\u62E9\u64CD\u4F5C:",
    choices: [
      { name: "\u2795 \u6DFB\u52A0\u6E20\u9053", value: "add" },
      { name: "\u2796 \u79FB\u9664\u6E20\u9053", value: "remove" },
      { name: "\u2190 \u8FD4\u56DE", value: "back" }
    ]
  }]);
  if (action === "back") {
    return;
  }
  if (action === "add") {
    const allChannels = ["feishu", "wechat", "email", "sms"];
    const availableChannels = allChannels.filter((ch) => !enabledChannels.includes(ch));
    if (availableChannels.length === 0) {
      console.log(ansis.yellow("\u6240\u6709\u6E20\u9053\u90FD\u5DF2\u542F\u7528"));
      return;
    }
    const { channel } = await inquirer.prompt([{
      type: "list",
      name: "channel",
      message: "\u9009\u62E9\u8981\u6DFB\u52A0\u7684\u6E20\u9053:",
      choices: availableChannels.map((ch) => ({
        name: i18n.t(`notification:channels.${ch}`),
        value: ch
      }))
    }]);
    await configureChannel(channel);
  } else if (action === "remove") {
    if (enabledChannels.length === 0) {
      console.log(ansis.yellow("\u6CA1\u6709\u5DF2\u542F\u7528\u7684\u6E20\u9053"));
      return;
    }
    const { channel } = await inquirer.prompt([{
      type: "list",
      name: "channel",
      message: "\u9009\u62E9\u8981\u79FB\u9664\u7684\u6E20\u9053:",
      choices: enabledChannels.map((ch) => ({
        name: i18n.t(`notification:channels.${ch}`),
        value: ch
      }))
    }]);
    await disableChannel(channel);
    console.log(ansis.green(`\u2705 \u5DF2\u79FB\u9664 ${i18n.t(`notification:channels.${channel}`)}`));
  }
}
async function configureThreshold() {
  const config = await loadNotificationConfig();
  console.log("");
  console.log(ansis.dim(i18n.t("notification:config.threshold.description")));
  console.log("");
  const { threshold } = await inquirer.prompt([{
    type: "list",
    name: "threshold",
    message: i18n.t("notification:config.threshold.title"),
    choices: [
      ...THRESHOLD_OPTIONS.map((opt) => ({
        name: opt.label,
        value: opt.value
      })),
      { name: i18n.t("notification:config.threshold.custom"), value: -1 }
    ],
    default: config.threshold
  }]);
  let finalThreshold = threshold;
  if (threshold === -1) {
    const { customValue } = await inquirer.prompt([{
      type: "input",
      name: "customValue",
      message: "\u8F93\u5165\u81EA\u5B9A\u4E49\u9608\u503C\uFF08\u5206\u949F\uFF09:",
      validate: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 1) {
          return "\u8BF7\u8F93\u5165\u5927\u4E8E 0 \u7684\u6570\u5B57";
        }
        return true;
      }
    }]);
    finalThreshold = Number.parseInt(customValue, 10);
  }
  await setThreshold(finalThreshold);
  console.log(ansis.green(`\u2705 \u9608\u503C\u5DF2\u8BBE\u7F6E\u4E3A ${finalThreshold} \u5206\u949F`));
}
async function showStatus() {
  const summary = await getConfigSummary();
  const validation = await validateCurrentConfig();
  console.log("");
  console.log(ansis.bold.cyan("\u{1F4CA} \u901A\u77E5\u7CFB\u7EDF\u72B6\u6001"));
  console.log("");
  const statusIcon = summary.enabled ? "\u2705" : "\u23F8\uFE0F";
  const statusText = summary.enabled ? ansis.green(i18n.t("notification:status.enabled")) : ansis.yellow(i18n.t("notification:status.disabled"));
  console.log(`  ${statusIcon} \u72B6\u6001: ${statusText}`);
  console.log(`  \u{1F511} \u8BBE\u5907\u4EE4\u724C: ${ansis.dim(summary.deviceToken)}`);
  console.log(`  \u23F1\uFE0F  \u9608\u503C: ${summary.threshold} \u5206\u949F`);
  console.log("");
  console.log(ansis.bold("  \u{1F4F1} \u901A\u77E5\u6E20\u9053:"));
  if (summary.enabledChannels.length === 0) {
    console.log(`     ${ansis.yellow(i18n.t("notification:channels.noChannels"))}`);
  } else {
    for (const channel of summary.enabledChannels) {
      console.log(`     \u2705 ${i18n.t(`notification:channels.${channel}`)}`);
    }
  }
  if (summary.quietHours.enabled) {
    console.log("");
    console.log(`  \u{1F319} \u514D\u6253\u6270: ${summary.quietHours.hours}`);
  }
  if (!validation.valid) {
    console.log("");
    console.log(ansis.bold.red("  \u26A0\uFE0F \u914D\u7F6E\u95EE\u9898:"));
    for (const error of validation.errors) {
      console.log(`     \u274C ${error.message}`);
    }
  }
  if (validation.warnings.length > 0) {
    console.log("");
    console.log(ansis.bold.yellow("  \u26A0\uFE0F \u8B66\u544A:"));
    for (const warning of validation.warnings) {
      console.log(`     \u26A0\uFE0F ${warning}`);
    }
  }
  console.log("");
}
async function sendTestNotification() {
  const enabledChannels = await getEnabledChannels();
  if (enabledChannels.length === 0) {
    console.log(ansis.yellow(i18n.t("notification:errors.noChannels")));
    return;
  }
  console.log("");
  console.log(ansis.green(i18n.t("notification:test.sending")));
  try {
    const client = CloudClient.getInstance();
    await client.initialize();
    const results = await client.sendTestNotification();
    console.log("");
    let hasSuccess = false;
    let hasFailure = false;
    for (const result of results) {
      const channelName = i18n.t(`notification:channels.${result.channel}`);
      if (result.success) {
        console.log(ansis.green(`\u2705 ${channelName}: ${i18n.t("notification:test.success")}`));
        hasSuccess = true;
      } else {
        console.log(ansis.red(`\u274C ${channelName}: ${result.error || i18n.t("notification:test.failed")}`));
        hasFailure = true;
      }
    }
    console.log("");
    if (hasSuccess) {
      console.log(ansis.dim(i18n.t("notification:test.checkDevice")));
    }
    if (hasFailure) {
      console.log(ansis.yellow(i18n.t("notification:test.partialFailure")));
    }
  } catch (error) {
    console.log("");
    console.log(ansis.red(`\u274C ${i18n.t("notification:errors.sendFailed")}`));
    if (error instanceof Error) {
      console.log(ansis.dim(error.message));
    }
    console.log("");
    console.log(ansis.yellow(i18n.t("notification:test.troubleshooting")));
    console.log(ansis.dim(`  1. ${i18n.t("notification:test.checkConnection")}`));
    console.log(ansis.dim(`  2. ${i18n.t("notification:test.checkConfig")}`));
    console.log(ansis.dim(`  3. ${i18n.t("notification:test.checkToken")}`));
  }
  console.log("");
}
async function handleBind(code) {
  console.log("");
  console.log(ansis.bold.cyan(i18n.t("notification:cloud.bindTitle")));
  console.log("");
  if (isDeviceBound()) {
    console.log(ansis.yellow(i18n.t("notification:cloud.alreadyBound")));
    console.log("");
    const { confirmRebind } = await inquirer.prompt([{
      type: "confirm",
      name: "confirmRebind",
      message: i18n.t("notification:cloud.confirmRebind"),
      default: false
    }]);
    if (!confirmRebind) {
      return;
    }
    unbindDevice();
  }
  let bindingCode = code;
  if (!bindingCode) {
    console.log(ansis.dim(i18n.t("notification:cloud.bindInstructions")));
    console.log("");
    const { inputCode } = await inquirer.prompt([{
      type: "input",
      name: "inputCode",
      message: i18n.t("notification:cloud.enterCode"),
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return i18n.t("notification:cloud.codeRequired");
        }
        if (value.trim().length < 4) {
          return i18n.t("notification:cloud.codeInvalid");
        }
        return true;
      }
    }]);
    bindingCode = inputCode.trim();
  }
  console.log("");
  console.log(ansis.green(i18n.t("notification:cloud.binding")));
  try {
    const result = await bindDevice(bindingCode);
    if (result.success) {
      console.log("");
      console.log(ansis.green(`\u2705 ${i18n.t("notification:cloud.bindSuccess")}`));
      console.log("");
      console.log(ansis.dim(i18n.t("notification:cloud.deviceId", { id: result.deviceId || "N/A" })));
      console.log("");
      const { sendTest } = await inquirer.prompt([{
        type: "confirm",
        name: "sendTest",
        message: i18n.t("notification:cloud.sendTestAfterBind"),
        default: true
      }]);
      if (sendTest) {
        await sendCloudTestNotification();
      }
    } else {
      console.log("");
      console.log(ansis.red(`\u274C ${i18n.t("notification:cloud.bindFailed")}`));
      console.log(ansis.dim(result.error || i18n.t("notification:cloud.unknownError")));
      console.log("");
      console.log(ansis.yellow(i18n.t("notification:cloud.bindTroubleshooting")));
      console.log(ansis.dim(`  1. ${i18n.t("notification:cloud.checkCode")}`));
      console.log(ansis.dim(`  2. ${i18n.t("notification:cloud.checkExpiry")}`));
      console.log(ansis.dim(`  3. ${i18n.t("notification:cloud.checkNetwork")}`));
    }
  } catch (error) {
    console.log("");
    console.log(ansis.red(`\u274C ${i18n.t("notification:cloud.bindError")}`));
    if (error instanceof Error) {
      console.log(ansis.dim(error.message));
    }
  }
  console.log("");
}
async function handleUnbind() {
  console.log("");
  if (!isDeviceBound()) {
    console.log(ansis.yellow(i18n.t("notification:cloud.notBoundYet")));
    console.log("");
    return;
  }
  const { confirmUnbind } = await inquirer.prompt([{
    type: "confirm",
    name: "confirmUnbind",
    message: i18n.t("notification:cloud.confirmUnbind"),
    default: false
  }]);
  if (!confirmUnbind) {
    console.log(ansis.dim(i18n.t("notification:cloud.unbindCancelled")));
    console.log("");
    return;
  }
  unbindDevice();
  console.log(ansis.green(`\u2705 ${i18n.t("notification:cloud.unbindSuccess")}`));
  console.log("");
}
async function showCloudStatus() {
  console.log("");
  console.log(ansis.bold.cyan(i18n.t("notification:cloud.statusTitle")));
  console.log("");
  const status = await getBindingStatus();
  if (!status.bound) {
    console.log(`  ${ansis.yellow("\u26A0\uFE0F")} ${i18n.t("notification:cloud.notBound")}`);
    console.log("");
    console.log(ansis.dim(i18n.t("notification:cloud.bindHint")));
    console.log("");
    return;
  }
  console.log(`  ${ansis.green("\u2705")} ${i18n.t("notification:cloud.bound")}`);
  console.log("");
  if (status.deviceId) {
    console.log(`  ${ansis.dim(i18n.t("notification:cloud.deviceIdLabel"))} ${status.deviceId}`);
  }
  if (status.deviceInfo) {
    console.log(`  ${ansis.dim(i18n.t("notification:cloud.deviceNameLabel"))} ${status.deviceInfo.name}`);
    console.log(`  ${ansis.dim(i18n.t("notification:cloud.platformLabel"))} ${status.deviceInfo.platform}`);
  }
  if (status.lastUsed) {
    const lastUsedDate = new Date(status.lastUsed);
    console.log(`  ${ansis.dim(i18n.t("notification:cloud.lastUsedLabel"))} ${lastUsedDate.toLocaleString()}`);
  }
  console.log("");
}
async function sendCloudTestNotification() {
  console.log("");
  console.log(ansis.green(i18n.t("notification:cloud.sendingTest")));
  try {
    const result = await sendNotification({
      title: i18n.t("notification:cloud.testTitle"),
      body: i18n.t("notification:cloud.testBody"),
      type: "success"
    });
    if (result.success) {
      console.log(ansis.green(`\u2705 ${i18n.t("notification:cloud.testSuccess")}`));
      console.log(ansis.dim(i18n.t("notification:cloud.checkPhone")));
    } else {
      console.log(ansis.red(`\u274C ${i18n.t("notification:cloud.testFailed")}`));
      console.log(ansis.dim(result.error || i18n.t("notification:cloud.unknownError")));
    }
  } catch (error) {
    console.log(ansis.red(`\u274C ${i18n.t("notification:cloud.testError")}`));
    if (error instanceof Error) {
      console.log(ansis.dim(error.message));
    }
  }
  console.log("");
}
async function configureLocalNotification() {
  const config = await loadLocalNotificationConfig();
  const shortcutsAvailable = await isShortcutsAvailable();
  console.log("");
  console.log(ansis.bold.cyan(i18n.t("notification:local.title")));
  console.log(ansis.dim(i18n.t("notification:local.description")));
  console.log("");
  console.log(ansis.bold(i18n.t("notification:local.currentStatus")));
  if (shortcutsAvailable) {
    const shortcutsStatus = config.shortcutName ? ansis.green(i18n.t("notification:status.enabled")) : ansis.yellow(i18n.t("notification:status.disabled"));
    console.log(`  \u{1F34E} ${i18n.t("notification:local.shortcuts.name")}: ${shortcutsStatus}`);
    if (config.shortcutName) {
      console.log(`     ${ansis.dim(i18n.t("notification:local.shortcuts.currentShortcut", { name: config.shortcutName }))}`);
    }
  } else {
    console.log(`  \u{1F34E} ${i18n.t("notification:local.shortcuts.name")}: ${ansis.dim(i18n.t("notification:local.shortcuts.notAvailable"))}`);
  }
  const barkStatus = config.barkUrl ? ansis.green(i18n.t("notification:status.enabled")) : ansis.yellow(i18n.t("notification:status.disabled"));
  console.log(`  \u{1F4F1} ${i18n.t("notification:local.bark.name")}: ${barkStatus}`);
  if (config.barkUrl) {
    console.log(`     ${ansis.dim(i18n.t("notification:local.bark.currentServer", { url: config.barkUrl }))}`);
  }
  console.log("");
  const choices = [];
  if (shortcutsAvailable) {
    choices.push({
      name: config.shortcutName ? `\u{1F34E} ${i18n.t("notification:local.shortcuts.configure")}` : `\u{1F34E} ${i18n.t("notification:local.shortcuts.enable")}`,
      value: "shortcuts"
    });
  }
  choices.push({
    name: config.barkUrl ? `\u{1F4F1} ${i18n.t("notification:local.bark.configure")}` : `\u{1F4F1} ${i18n.t("notification:local.bark.enable")}`,
    value: "bark"
  });
  choices.push(
    { name: `\u{1F9EA} ${i18n.t("notification:local.testLocal")}`, value: "test" },
    { name: `\u2190 ${i18n.t("notification:menu.back")}`, value: "back" }
  );
  const { action } = await inquirer.prompt([{
    type: "list",
    name: "action",
    message: i18n.t("notification:menu.selectAction"),
    choices
  }]);
  if (action === "back") {
    return;
  }
  switch (action) {
    case "shortcuts":
      await configureShortcuts();
      break;
    case "bark":
      await configureBark();
      break;
    case "test":
      await testLocalNotification();
      break;
  }
}
async function configureShortcuts() {
  console.log("");
  console.log(ansis.bold.cyan(i18n.t("notification:local.shortcuts.title")));
  console.log(ansis.dim(i18n.t("notification:local.shortcuts.description")));
  console.log("");
  console.log(ansis.dim(i18n.t("notification:local.shortcuts.scanning")));
  const shortcuts = await listShortcuts();
  if (shortcuts.length === 0) {
    console.log(ansis.yellow(i18n.t("notification:local.shortcuts.noShortcuts")));
    console.log(ansis.dim(i18n.t("notification:local.shortcuts.createHint")));
    console.log("");
    return;
  }
  console.log(ansis.green(i18n.t("notification:local.shortcuts.found", { count: shortcuts.length })));
  console.log("");
  const { shortcutName } = await inquirer.prompt([{
    type: "list",
    name: "shortcutName",
    message: i18n.t("notification:local.shortcuts.selectShortcut"),
    choices: [
      ...shortcuts.map((s) => ({ name: s, value: s })),
      { name: i18n.t("notification:local.shortcuts.enterManually"), value: "__manual__" },
      { name: i18n.t("notification:local.shortcuts.disable"), value: "__disable__" }
    ]
  }]);
  if (shortcutName === "__disable__") {
    await saveLocalNotificationConfig({ shortcutName: "" });
    console.log(ansis.yellow(`\u23F8\uFE0F ${i18n.t("notification:local.shortcuts.disabled")}`));
    return;
  }
  let finalShortcutName = shortcutName;
  if (shortcutName === "__manual__") {
    const { manualName } = await inquirer.prompt([{
      type: "input",
      name: "manualName",
      message: i18n.t("notification:local.shortcuts.enterName"),
      validate: (value) => !!value.trim() || i18n.t("notification:errors.required")
    }]);
    finalShortcutName = manualName.trim();
  }
  await saveLocalNotificationConfig({ shortcutName: finalShortcutName });
  console.log(ansis.green(`\u2705 ${i18n.t("notification:local.shortcuts.configured", { name: finalShortcutName })}`));
  const { shouldTest } = await inquirer.prompt([{
    type: "confirm",
    name: "shouldTest",
    message: i18n.t("notification:local.shortcuts.testNow"),
    default: true
  }]);
  if (shouldTest) {
    await testShortcutsNotification(finalShortcutName);
  }
}
async function configureBark() {
  console.log("");
  console.log(ansis.bold.cyan(i18n.t("notification:local.bark.title")));
  console.log(ansis.dim(i18n.t("notification:local.bark.description")));
  console.log("");
  const config = await loadLocalNotificationConfig();
  const { action } = await inquirer.prompt([{
    type: "list",
    name: "action",
    message: i18n.t("notification:menu.selectAction"),
    choices: [
      { name: i18n.t("notification:local.bark.configureServer"), value: "configure" },
      { name: i18n.t("notification:local.bark.disable"), value: "disable" },
      { name: `\u2190 ${i18n.t("notification:menu.back")}`, value: "back" }
    ]
  }]);
  if (action === "back") {
    return;
  }
  if (action === "disable") {
    await saveLocalNotificationConfig({ barkUrl: "" });
    console.log(ansis.yellow(`\u23F8\uFE0F ${i18n.t("notification:local.bark.disabled")}`));
    return;
  }
  const { barkUrl } = await inquirer.prompt([{
    type: "input",
    name: "barkUrl",
    message: i18n.t("notification:local.bark.enterUrl"),
    default: config.barkUrl || "https://api.day.app/your-key",
    validate: (value) => {
      if (!isValidBarkUrl(value)) {
        return i18n.t("notification:local.bark.invalidUrl");
      }
      return true;
    }
  }]);
  await saveLocalNotificationConfig({ barkUrl });
  console.log(ansis.green(`\u2705 ${i18n.t("notification:local.bark.configured")}`));
  const { shouldTest } = await inquirer.prompt([{
    type: "confirm",
    name: "shouldTest",
    message: i18n.t("notification:local.bark.testNow"),
    default: true
  }]);
  if (shouldTest) {
    await testBarkNotification(barkUrl);
  }
}
async function testLocalNotification() {
  const config = await loadLocalNotificationConfig();
  console.log("");
  console.log(ansis.green(i18n.t("notification:local.testing")));
  console.log("");
  let hasAnyEnabled = false;
  if (config.shortcutName) {
    hasAnyEnabled = true;
    await testShortcutsNotification(config.shortcutName);
  }
  if (config.barkUrl) {
    hasAnyEnabled = true;
    await testBarkNotification(config.barkUrl);
  }
  if (!hasAnyEnabled) {
    console.log(ansis.yellow(i18n.t("notification:local.noLocalEnabled")));
    console.log(ansis.dim(i18n.t("notification:local.configureFirst")));
  }
  console.log("");
}
async function testShortcutsNotification(shortcutName) {
  console.log(ansis.dim(`${i18n.t("notification:local.shortcuts.testing", { name: shortcutName })}...`));
  try {
    const service = await getLocalNotificationService();
    await service.sendShortcutNotification(shortcutName, {
      title: i18n.t("notification:local.testTitle"),
      body: i18n.t("notification:local.testBody")
    });
    console.log(ansis.green(`\u2705 ${i18n.t("notification:local.shortcuts.name")}: ${i18n.t("notification:test.success")}`));
  } catch (error) {
    console.log(ansis.red(`\u274C ${i18n.t("notification:local.shortcuts.name")}: ${error instanceof Error ? error.message : i18n.t("notification:test.failed")}`));
  }
}
async function testBarkNotification(barkUrl) {
  console.log(ansis.dim(`${i18n.t("notification:local.bark.testing")}...`));
  try {
    const service = await getLocalNotificationService();
    await service.sendBarkNotification(barkUrl, {
      title: i18n.t("notification:local.testTitle"),
      body: i18n.t("notification:local.testBody")
    });
    console.log(ansis.green(`\u2705 ${i18n.t("notification:local.bark.name")}: ${i18n.t("notification:test.success")}`));
  } catch (error) {
    console.log(ansis.red(`\u274C ${i18n.t("notification:local.bark.name")}: ${error instanceof Error ? error.message : i18n.t("notification:test.failed")}`));
  }
}

export { notificationCommand };
