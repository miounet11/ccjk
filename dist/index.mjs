import { exec, spawn } from 'node:child_process';
import { promises, createReadStream } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
export { j as config } from './chunks/config2.mjs';
import ansis from 'ansis';
export { p as platform } from './chunks/platform.mjs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import 'node:url';
import 'dayjs';
import 'inquirer';
import 'pathe';
import './chunks/constants.mjs';
import './chunks/index.mjs';
import 'node:process';
import 'i18next';
import 'i18next-fs-backend';
import './chunks/claude-config.mjs';
import './chunks/json-config.mjs';
import './chunks/fs-operations.mjs';
import 'node:crypto';
import 'node:fs/promises';
import 'tinyexec';

const execAsync$1 = promisify(exec);
class BaseCodeTool {
  config;
  configPath;
  constructor(initialConfig) {
    this.config = {
      name: this.getMetadata().name,
      ...initialConfig
    };
    this.configPath = this.getDefaultConfigPath();
  }
  /**
   * Get the default configuration path for this tool
   */
  getDefaultConfigPath() {
    const homeDir = os.homedir();
    const configDir = path.join(homeDir, ".ccjk", "tools");
    return path.join(configDir, `${this.getMetadata().name}.json`);
  }
  /**
   * Check if the tool is installed
   */
  async isInstalled() {
    try {
      const command = this.getInstallCheckCommand();
      const { stdout, stderr } = await execAsync$1(command);
      const version = this.parseVersion(stdout || stderr);
      return {
        installed: true,
        version,
        path: await this.findToolPath()
      };
    } catch (error) {
      return {
        installed: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Install the tool
   */
  async install() {
    try {
      const command = this.getInstallCommand();
      const { stdout, stderr } = await execAsync$1(command);
      return {
        success: true,
        output: stdout || stderr,
        exitCode: 0
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Installation failed",
        exitCode: 1
      };
    }
  }
  /**
   * Uninstall the tool
   */
  async uninstall() {
    try {
      const command = this.getUninstallCommand();
      const { stdout, stderr } = await execAsync$1(command);
      await this.removeConfigFile();
      return {
        success: true,
        output: stdout || stderr,
        exitCode: 0
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Uninstallation failed",
        exitCode: 1
      };
    }
  }
  /**
   * Get current configuration
   */
  async getConfig() {
    try {
      await this.loadConfig();
      return { ...this.config };
    } catch (error) {
      return { ...this.config };
    }
  }
  /**
   * Update configuration
   */
  async updateConfig(updates) {
    this.config = {
      ...this.config,
      ...updates
    };
    await this.saveConfig();
  }
  /**
   * Configure the tool with full config
   */
  async configure(config) {
    const isValid = await this.validateConfig(config);
    if (!isValid) {
      throw new Error("Invalid configuration");
    }
    this.config = { ...config };
    await this.saveConfig();
  }
  /**
   * Validate configuration
   */
  async validateConfig(config) {
    if (!config.name) {
      return false;
    }
    return true;
  }
  /**
   * Execute a command with the tool
   */
  async execute(command, args = []) {
    try {
      const fullCommand = this.buildCommand(command, args);
      const { stdout, stderr } = await execAsync$1(fullCommand, {
        env: { ...process.env, ...this.config.env }
      });
      return {
        success: true,
        output: stdout || stderr,
        exitCode: 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Execution failed",
        exitCode: error.code || 1
      };
    }
  }
  /**
   * Get tool version
   */
  async getVersion() {
    const status = await this.isInstalled();
    return status.version;
  }
  /**
   * Reset tool to default configuration
   */
  async reset() {
    this.config = {
      name: this.getMetadata().name
    };
    await this.removeConfigFile();
  }
  /**
   * Load configuration from file
   */
  async loadConfig() {
    try {
      const data = await promises.readFile(this.configPath, "utf-8");
      const loadedConfig = JSON.parse(data);
      this.config = { ...this.config, ...loadedConfig };
    } catch (error) {
    }
  }
  /**
   * Save configuration to file
   */
  async saveConfig() {
    try {
      const configDir = path.dirname(this.configPath);
      await promises.mkdir(configDir, { recursive: true });
      await promises.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }
  /**
   * Remove configuration file
   */
  async removeConfigFile() {
    try {
      await promises.unlink(this.configPath);
    } catch (error) {
    }
  }
  /**
   * Build command string from command and arguments
   */
  buildCommand(command, args) {
    const escapedArgs = args.map((arg) => {
      return arg.includes(" ") ? `"${arg}"` : arg;
    });
    return [command, ...escapedArgs].join(" ");
  }
  /**
   * Parse version from command output
   */
  parseVersion(output) {
    const patterns = [
      /version\s+(\d+\.\d+\.\d+)/i,
      /v?(\d+\.\d+\.\d+)/,
      /(\d+\.\d+\.\d+)/
    ];
    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return void 0;
  }
  /**
   * Find the tool's installation path
   */
  async findToolPath() {
    try {
      const { stdout } = await execAsync$1(`which ${this.getMetadata().name}`);
      return stdout.trim();
    } catch (error) {
      return void 0;
    }
  }
  /**
   * Create default capabilities object
   */
  createDefaultCapabilities() {
    return {
      supportsChat: false,
      supportsFileEdit: false,
      supportsCodeGen: false,
      supportsReview: false,
      supportsTesting: false,
      supportsDebugging: false
    };
  }
}

class AiderTool extends BaseCodeTool {
  getMetadata() {
    return {
      name: "aider",
      displayName: "Aider",
      description: "AI pair programming in your terminal",
      version: "1.0.0",
      homepage: "https://aider.chat",
      documentation: "https://aider.chat/docs",
      capabilities: {
        supportsChat: true,
        supportsFileEdit: true,
        supportsCodeGen: true,
        supportsReview: true,
        supportsTesting: false,
        supportsDebugging: true
      }
    };
  }
  getInstallCheckCommand() {
    return "aider --version";
  }
  getInstallCommand() {
    return "pip install aider-chat";
  }
  getUninstallCommand() {
    return "pip uninstall -y aider-chat";
  }
  /**
   * Start a chat session
   */
  async chat(prompt) {
    return this.execute("aider", ["--message", prompt]);
  }
  /**
   * Continue a chat session
   */
  async continueChat(message) {
    return this.execute("aider", ["--message", message]);
  }
  /**
   * End chat session
   */
  async endChat() {
    await this.execute("aider", ["--exit"]);
  }
  /**
   * Edit a file
   */
  async editFile(filePath, instructions) {
    return this.execute("aider", [filePath, "--message", instructions]);
  }
  /**
   * Edit multiple files
   */
  async editFiles(files, instructions) {
    return this.execute("aider", [...files, "--message", instructions]);
  }
}

class ClaudeCodeTool extends BaseCodeTool {
  getMetadata() {
    return {
      name: "claude-code",
      displayName: "Claude Code",
      description: "Anthropic's official CLI tool for Claude AI",
      version: "1.0.0",
      homepage: "https://claude.ai",
      documentation: "https://docs.anthropic.com/claude/docs",
      capabilities: {
        supportsChat: true,
        supportsFileEdit: true,
        supportsCodeGen: true,
        supportsReview: true,
        supportsTesting: true,
        supportsDebugging: true
      }
    };
  }
  getInstallCheckCommand() {
    return "claude --version";
  }
  getInstallCommand() {
    return "npm install -g @anthropic-ai/claude-code";
  }
  getUninstallCommand() {
    return "npm uninstall -g @anthropic-ai/claude-code";
  }
  /**
   * Start a chat session
   */
  async chat(prompt) {
    return this.execute("claude", ["chat", prompt]);
  }
  /**
   * Continue a chat session
   */
  async continueChat(message) {
    return this.execute("claude", ["continue", message]);
  }
  /**
   * End chat session
   */
  async endChat() {
    await this.execute("claude", ["exit"]);
  }
  /**
   * Edit a file
   */
  async editFile(filePath, instructions) {
    return this.execute("claude", ["edit", filePath, "--instructions", instructions]);
  }
  /**
   * Edit multiple files
   */
  async editFiles(files, instructions) {
    const fileArgs = files.flatMap((f) => ["--file", f]);
    return this.execute("claude", ["edit", ...fileArgs, "--instructions", instructions]);
  }
  /**
   * Generate code
   */
  async generateCode(prompt, outputPath) {
    const args = ["generate", prompt];
    if (outputPath) {
      args.push("--output", outputPath);
    }
    return this.execute("claude", args);
  }
}

class ClineTool extends BaseCodeTool {
  getMetadata() {
    return {
      name: "cline",
      displayName: "Cline",
      description: "Autonomous coding agent for VS Code",
      version: "1.0.0",
      homepage: "https://github.com/cline/cline",
      documentation: "https://github.com/cline/cline/wiki",
      capabilities: {
        supportsChat: true,
        supportsFileEdit: true,
        supportsCodeGen: true,
        supportsReview: true,
        supportsTesting: true,
        supportsDebugging: true
      }
    };
  }
  getInstallCheckCommand() {
    return "cline --version";
  }
  getInstallCommand() {
    return "npm install -g cline";
  }
  getUninstallCommand() {
    return "npm uninstall -g cline";
  }
  /**
   * Start a chat session
   */
  async chat(prompt) {
    return this.execute("cline", ["chat", prompt]);
  }
  /**
   * Continue a chat session
   */
  async continueChat(message) {
    return this.execute("cline", ["continue", message]);
  }
  /**
   * End chat session
   */
  async endChat() {
    await this.execute("cline", ["exit"]);
  }
  /**
   * Edit a file
   */
  async editFile(filePath, instructions) {
    return this.execute("cline", ["edit", filePath, "--instructions", instructions]);
  }
  /**
   * Edit multiple files
   */
  async editFiles(files, instructions) {
    const fileArgs = files.flatMap((f) => ["--file", f]);
    return this.execute("cline", ["edit", ...fileArgs, "--instructions", instructions]);
  }
  /**
   * Generate code
   */
  async generateCode(prompt, outputPath) {
    const args = ["generate", prompt];
    if (outputPath) {
      args.push("--output", outputPath);
    }
    return this.execute("cline", args);
  }
}

class CodexTool extends BaseCodeTool {
  getMetadata() {
    return {
      name: "codex",
      displayName: "OpenAI Codex",
      description: "OpenAI's code generation model",
      version: "1.0.0",
      homepage: "https://openai.com/codex",
      documentation: "https://platform.openai.com/docs",
      capabilities: {
        supportsChat: true,
        supportsFileEdit: false,
        supportsCodeGen: true,
        supportsReview: false,
        supportsTesting: false,
        supportsDebugging: false
      }
    };
  }
  getInstallCheckCommand() {
    return "codex --version";
  }
  getInstallCommand() {
    return "pip install openai-codex";
  }
  getUninstallCommand() {
    return "pip uninstall -y openai-codex";
  }
  /**
   * Generate code
   */
  async generateCode(prompt, outputPath) {
    const args = ["generate", prompt];
    if (outputPath) {
      args.push("--output", outputPath);
    }
    return this.execute("codex", args);
  }
}

class ContinueTool extends BaseCodeTool {
  getMetadata() {
    return {
      name: "continue",
      displayName: "Continue",
      description: "Open-source autopilot for software development",
      version: "1.0.0",
      homepage: "https://continue.dev",
      documentation: "https://continue.dev/docs",
      capabilities: {
        supportsChat: true,
        supportsFileEdit: true,
        supportsCodeGen: true,
        supportsReview: true,
        supportsTesting: true,
        supportsDebugging: true
      }
    };
  }
  getInstallCheckCommand() {
    return "continue --version";
  }
  getInstallCommand() {
    return "npm install -g continue";
  }
  getUninstallCommand() {
    return "npm uninstall -g continue";
  }
  /**
   * Start a chat session
   */
  async chat(prompt) {
    return this.execute("continue", ["chat", prompt]);
  }
  /**
   * Continue a chat session
   */
  async continueChat(message) {
    return this.execute("continue", ["chat", message]);
  }
  /**
   * End chat session
   */
  async endChat() {
    await this.execute("continue", ["exit"]);
  }
  /**
   * Generate code
   */
  async generateCode(prompt, outputPath) {
    const args = ["generate", prompt];
    if (outputPath) {
      args.push("--output", outputPath);
    }
    return this.execute("continue", args);
  }
}

class CursorTool extends BaseCodeTool {
  getMetadata() {
    return {
      name: "cursor",
      displayName: "Cursor",
      description: "AI-first code editor",
      version: "1.0.0",
      homepage: "https://cursor.sh",
      documentation: "https://cursor.sh/docs",
      capabilities: {
        supportsChat: true,
        supportsFileEdit: true,
        supportsCodeGen: true,
        supportsReview: true,
        supportsTesting: true,
        supportsDebugging: true
      }
    };
  }
  getInstallCheckCommand() {
    return "cursor --version";
  }
  getInstallCommand() {
    return 'echo "Please download Cursor from https://cursor.sh"';
  }
  getUninstallCommand() {
    return 'echo "Please uninstall Cursor manually"';
  }
  /**
   * Start a chat session
   */
  async chat(prompt) {
    return this.execute("cursor", ["chat", prompt]);
  }
  /**
   * Continue a chat session
   */
  async continueChat(message) {
    return this.execute("cursor", ["chat", message]);
  }
  /**
   * End chat session
   */
  async endChat() {
    await this.execute("cursor", ["exit"]);
  }
  /**
   * Edit a file
   */
  async editFile(filePath, instructions) {
    return this.execute("cursor", ["edit", filePath, "--instructions", instructions]);
  }
  /**
   * Edit multiple files
   */
  async editFiles(files, instructions) {
    const fileArgs = files.flatMap((f) => ["--file", f]);
    return this.execute("cursor", ["edit", ...fileArgs, "--instructions", instructions]);
  }
  /**
   * Generate code
   */
  async generateCode(prompt, outputPath) {
    const args = ["generate", prompt];
    if (outputPath) {
      args.push("--output", outputPath);
    }
    return this.execute("cursor", args);
  }
}

class ToolRegistry {
  static instance;
  tools;
  toolClasses;
  constructor() {
    this.tools = /* @__PURE__ */ new Map();
    this.toolClasses = /* @__PURE__ */ new Map();
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }
  /**
   * Register a tool class
   */
  registerToolClass(name, toolClass) {
    this.toolClasses.set(name.toLowerCase(), toolClass);
  }
  /**
   * Register a tool instance
   */
  registerTool(tool) {
    const metadata = tool.getMetadata();
    this.tools.set(metadata.name.toLowerCase(), tool);
  }
  /**
   * Get a tool instance by name
   */
  getTool(name) {
    const normalizedName = name.toLowerCase();
    if (this.tools.has(normalizedName)) {
      return this.tools.get(normalizedName);
    }
    const ToolClass = this.toolClasses.get(normalizedName);
    if (ToolClass) {
      const tool = new ToolClass();
      this.tools.set(normalizedName, tool);
      return tool;
    }
    return void 0;
  }
  /**
   * Get all registered tool names
   */
  getToolNames() {
    return Array.from(this.toolClasses.keys());
  }
  /**
   * Get all tool instances
   */
  getAllTools() {
    return Array.from(this.tools.values());
  }
  /**
   * Check if a tool is registered
   */
  hasTool(name) {
    return this.toolClasses.has(name.toLowerCase());
  }
  /**
   * Unregister a tool
   */
  unregisterTool(name) {
    const normalizedName = name.toLowerCase();
    this.tools.delete(normalizedName);
    this.toolClasses.delete(normalizedName);
  }
  /**
   * Clear all registered tools
   */
  clear() {
    this.tools.clear();
    this.toolClasses.clear();
  }
  /**
   * Get metadata for all registered tools
   */
  async getAllMetadata() {
    const metadata = [];
    for (const name of this.toolClasses.keys()) {
      const tool = this.getTool(name);
      if (tool) {
        metadata.push(tool.getMetadata());
      }
    }
    return metadata;
  }
}
function getRegistry() {
  return ToolRegistry.getInstance();
}

class ToolFactory {
  registry;
  constructor(registry) {
    this.registry = registry || ToolRegistry.getInstance();
  }
  /**
   * Create a tool instance by name
   */
  createTool(name, config) {
    const tool = this.registry.getTool(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found in registry. Available tools: ${this.registry.getToolNames().join(", ")}`);
    }
    if (config) {
      tool.configure({ name, ...config }).catch((err) => {
        console.warn(`Failed to configure tool '${name}':`, err);
      });
    }
    return tool;
  }
  /**
   * Create multiple tool instances
   */
  createTools(names) {
    return names.map((name) => this.createTool(name));
  }
  /**
   * Create all registered tools
   */
  createAllTools() {
    const names = this.registry.getToolNames();
    return this.createTools(names);
  }
  /**
   * Check if a tool can be created
   */
  canCreateTool(name) {
    return this.registry.hasTool(name);
  }
  /**
   * Get available tool names
   */
  getAvailableTools() {
    return this.registry.getToolNames();
  }
}
function createTool(name, config) {
  const factory = new ToolFactory();
  return factory.createTool(name, config);
}

function unique(arr) {
  return [...new Set(arr)];
}
function uniqueBy(arr, key) {
  const seen = /* @__PURE__ */ new Set();
  return arr.filter((item) => {
    const value = typeof key === "function" ? key(item) : item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}
function flatten$1(arr, depth = Infinity) {
  if (depth === 0)
    return arr;
  return arr.reduce((acc, val) => {
    if (Array.isArray(val)) {
      acc.push(...flatten$1(val, depth - 1));
    } else {
      acc.push(val);
    }
    return acc;
  }, []);
}
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function sampleSize(arr, size) {
  const shuffled = shuffle(arr);
  return shuffled.slice(0, Math.min(size, arr.length));
}
function partition(arr, predicate) {
  const truthy = [];
  const falsy = [];
  for (const item of arr) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }
  return [truthy, falsy];
}
function intersection(...arrays) {
  if (arrays.length === 0)
    return [];
  if (arrays.length === 1)
    return arrays[0];
  const [first, ...rest] = arrays;
  return first.filter((item) => rest.every((arr) => arr.includes(item)));
}
function union(...arrays) {
  return unique(flatten$1(arrays, 1));
}
function difference(arr, ...others) {
  const otherItems = new Set(flatten$1(others, 1));
  return arr.filter((item) => !otherItems.has(item));
}
function zip(...arrays) {
  const maxLength = Math.max(...arrays.map((arr) => arr.length));
  const result = [];
  for (let i = 0; i < maxLength; i++) {
    result.push(arrays.map((arr) => arr[i]));
  }
  return result;
}
function unzip(arr) {
  return zip(...arr);
}
function groupConsecutive(arr, predicate) {
  if (arr.length === 0)
    return [];
  const groups = [[arr[0]]];
  for (let i = 1; i < arr.length; i++) {
    const lastGroup = groups[groups.length - 1];
    const lastItem = lastGroup[lastGroup.length - 1];
    if (predicate(lastItem, arr[i])) {
      lastGroup.push(arr[i]);
    } else {
      groups.push([arr[i]]);
    }
  }
  return groups;
}
function take(arr, n) {
  return arr.slice(0, n);
}
function takeLast(arr, n) {
  return arr.slice(-n);
}
function drop(arr, n) {
  return arr.slice(n);
}
function dropLast(arr, n) {
  return arr.slice(0, -n);
}
function takeWhile(arr, predicate) {
  const result = [];
  for (const item of arr) {
    if (!predicate(item))
      break;
    result.push(item);
  }
  return result;
}
function dropWhile(arr, predicate) {
  let dropping = true;
  return arr.filter((item) => {
    if (dropping && predicate(item)) {
      return false;
    }
    dropping = false;
    return true;
  });
}
function findIndex(arr, predicate) {
  return arr.findIndex(predicate);
}
function findLastIndex(arr, predicate) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      return i;
    }
  }
  return -1;
}
function count(arr, item) {
  return arr.filter((x) => x === item).length;
}
function countBy(arr, predicate) {
  return arr.filter(predicate).length;
}
function sum(arr) {
  return arr.reduce((acc, val) => acc + val, 0);
}
function sumBy(arr, selector) {
  return arr.reduce((acc, item) => {
    const value = typeof selector === "function" ? selector(item) : item[selector];
    return acc + (typeof value === "number" ? value : 0);
  }, 0);
}
function average(arr) {
  return arr.length === 0 ? 0 : sum(arr) / arr.length;
}
function min(arr) {
  return arr.length === 0 ? void 0 : Math.min(...arr);
}
function max(arr) {
  return arr.length === 0 ? void 0 : Math.max(...arr);
}
function minBy(arr, selector) {
  if (arr.length === 0)
    return void 0;
  return arr.reduce((min2, item) => {
    const minValue = typeof selector === "function" ? selector(min2) : min2[selector];
    const itemValue = typeof selector === "function" ? selector(item) : item[selector];
    return itemValue < minValue ? item : min2;
  });
}
function maxBy(arr, selector) {
  if (arr.length === 0)
    return void 0;
  return arr.reduce((max2, item) => {
    const maxValue = typeof selector === "function" ? selector(max2) : max2[selector];
    const itemValue = typeof selector === "function" ? selector(item) : item[selector];
    return itemValue > maxValue ? item : max2;
  });
}
function sortBy(arr, selector, order = "asc") {
  const sorted = [...arr].sort((a, b) => {
    const aValue = typeof selector === "function" ? selector(a) : a[selector];
    const bValue = typeof selector === "function" ? selector(b) : b[selector];
    if (aValue < bValue)
      return order === "asc" ? -1 : 1;
    if (aValue > bValue)
      return order === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}
function isEmpty$1(arr) {
  return arr.length === 0;
}
function compact$1(arr) {
  return arr.filter((item) => !!item);
}
function range(start, end, step = 1) {
  if (end === void 0) {
    end = start;
    start = 0;
  }
  const result = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}
function rotate(arr, n) {
  const len = arr.length;
  if (len === 0)
    return arr;
  n = (n % len + len) % len;
  return [...arr.slice(n), ...arr.slice(0, n)];
}
function isEqual$1(arr1, arr2) {
  if (arr1.length !== arr2.length)
    return false;
  return arr1.every((item, index) => item === arr2[index]);
}

const index$6 = {
  __proto__: null,
  average: average,
  chunk: chunk,
  compact: compact$1,
  count: count,
  countBy: countBy,
  difference: difference,
  drop: drop,
  dropLast: dropLast,
  dropWhile: dropWhile,
  findIndex: findIndex,
  findLastIndex: findLastIndex,
  flatten: flatten$1,
  groupConsecutive: groupConsecutive,
  intersection: intersection,
  isEmpty: isEmpty$1,
  isEqual: isEqual$1,
  max: max,
  maxBy: maxBy,
  min: min,
  minBy: minBy,
  partition: partition,
  range: range,
  rotate: rotate,
  sample: sample,
  sampleSize: sampleSize,
  shuffle: shuffle,
  sortBy: sortBy,
  sum: sum,
  sumBy: sumBy,
  take: take,
  takeLast: takeLast,
  takeWhile: takeWhile,
  union: union,
  unique: unique,
  uniqueBy: uniqueBy,
  unzip: unzip,
  zip: zip
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1e3,
    backoff = 2,
    onRetry
  } = options;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        if (onRetry) {
          onRetry(lastError, attempt);
        }
        const waitTime = delay * backoff ** (attempt - 1);
        await sleep(waitTime);
      }
    }
  }
  throw lastError;
}
async function timeout(promise, ms, errorMessage = "Operation timed out") {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}
function debounce(fn, delay) {
  let timeoutId = null;
  let pendingPromise = null;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (!pendingPromise) {
      pendingPromise = new Promise((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            pendingPromise = null;
            timeoutId = null;
          }
        }, delay);
      });
    }
    return pendingPromise;
  };
}
function throttle(fn, delay) {
  let lastCall = 0;
  let pendingPromise = null;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      pendingPromise = fn(...args);
      return pendingPromise;
    }
    if (!pendingPromise) {
      pendingPromise = new Promise((resolve, reject) => {
        setTimeout(async () => {
          lastCall = Date.now();
          try {
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            pendingPromise = null;
          }
        }, delay - (now - lastCall));
      });
    }
    return pendingPromise;
  };
}
async function parallelLimit(tasks, limit) {
  const results = [];
  const executing = [];
  for (const [index, task] of tasks.entries()) {
    const promise = task().then((result) => {
      results[index] = result;
    });
    executing.push(promise);
    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }
  await Promise.all(executing);
  return results;
}
async function sequence(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}
async function allSettled(promises) {
  return Promise.allSettled(promises);
}
async function raceWithTimeout(promises, ms) {
  return timeout(Promise.race(promises), ms);
}
function memoize(fn, options = {}) {
  const cache = /* @__PURE__ */ new Map();
  const { keyGenerator = (...args) => JSON.stringify(args), ttl } = options;
  return (async (...args) => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);
    if (cached) {
      if (!ttl || Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }
      cache.delete(key);
    }
    const value = await fn(...args);
    cache.set(key, { value, timestamp: Date.now() });
    return value;
  });
}
function defer() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
async function waitFor(condition, options = {}) {
  const {
    timeout: timeoutMs = 5e3,
    interval = 100,
    timeoutMessage = "Condition not met within timeout"
  } = options;
  const startTime = Date.now();
  while (true) {
    const result = await condition();
    if (result)
      return;
    if (Date.now() - startTime >= timeoutMs) {
      throw new Error(timeoutMessage);
    }
    await sleep(interval);
  }
}
class Mutex {
  locked = false;
  queue = [];
  async acquire() {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }
  release() {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      resolve();
    } else {
      this.locked = false;
    }
  }
  async runExclusive(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
class Semaphore {
  permits;
  queue = [];
  constructor(permits) {
    this.permits = permits;
  }
  async acquire() {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }
  release() {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      resolve();
    } else {
      this.permits++;
    }
  }
  async runExclusive(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
async function batch(items, batchSize, processor) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch2 = items.slice(i, i + batchSize);
    const batchResults = await processor(batch2);
    results.push(...batchResults);
  }
  return results;
}
async function poll(fn, options = {}) {
  const { interval = 1e3, timeout: timeoutMs = 3e4, validate } = options;
  const startTime = Date.now();
  while (true) {
    const result = await fn();
    if (!validate || validate(result)) {
      return result;
    }
    if (Date.now() - startTime >= timeoutMs) {
      throw new Error("Polling timeout exceeded");
    }
    await sleep(interval);
  }
}

const index$5 = {
  __proto__: null,
  Mutex: Mutex,
  Semaphore: Semaphore,
  allSettled: allSettled,
  batch: batch,
  debounce: debounce,
  defer: defer,
  memoize: memoize,
  parallelLimit: parallelLimit,
  poll: poll,
  raceWithTimeout: raceWithTimeout,
  retry: retry,
  sequence: sequence,
  sleep: sleep,
  throttle: throttle,
  timeout: timeout,
  waitFor: waitFor
};

const execAsync = promisify(exec);
async function executeCommand(command, args = [], options = {}) {
  try {
    const fullCommand = buildCommand(command, args);
    const execOptions = {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      timeout: options.timeout,
      shell: options.shell,
      encoding: options.encoding || "utf8",
      maxBuffer: options.maxBuffer || 1024 * 1024 * 10
      // 10MB default
    };
    const { stdout, stderr } = await execAsync(fullCommand, execOptions);
    return {
      success: true,
      stdout: stdout.toString().trim(),
      stderr: stderr.toString().trim(),
      exitCode: 0
    };
  } catch (error) {
    return {
      success: false,
      stdout: error.stdout?.toString().trim() || "",
      stderr: error.stderr?.toString().trim() || "",
      exitCode: error.code || 1,
      error: error.message
    };
  }
}
function executeCommandStream(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const spawnOptions = {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: options.shell !== false
    };
    const child = spawn(command, args, spawnOptions);
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      if (options.onStdout) {
        options.onStdout(text);
      }
    });
    child.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      if (options.onStderr) {
        options.onStderr(text);
      }
    });
    child.on("close", (code) => {
      resolve({
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0,
        error: code !== 0 ? `Command exited with code ${code}` : void 0
      });
    });
    child.on("error", (error) => {
      resolve({
        success: false,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 1,
        error: error.message
      });
    });
    if (options.timeout) {
      setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 1,
          error: `Command timed out after ${options.timeout}ms`
        });
      }, options.timeout);
    }
  });
}
function buildCommand(command, args) {
  const escapedArgs = args.map(escapeArgument);
  return [command, ...escapedArgs].join(" ");
}
function escapeArgument(arg) {
  if (/[\s"'`$&|;<>(){}[\]\\]/.test(arg)) {
    const escaped = arg.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return arg;
}
async function commandExists(command) {
  const isWindows = process.platform === "win32";
  const checkCommand = isWindows ? "where" : "which";
  try {
    const result = await executeCommand(checkCommand, [command]);
    return result.success;
  } catch {
    return false;
  }
}
async function getCommandPath(command) {
  const isWindows = process.platform === "win32";
  const checkCommand = isWindows ? "where" : "which";
  try {
    const result = await executeCommand(checkCommand, [command]);
    if (result.success) {
      return result.stdout.split("\n")[0].trim();
    }
    return null;
  } catch {
    return null;
  }
}
function parseVersion(output) {
  const patterns = [
    /version\s+v?(\d+\.\d+\.\d+)/i,
    /v?(\d+\.\d+\.\d+)/,
    /(\d+\.\d+\.\d+)/
  ];
  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}
async function getCommandVersion(command, versionFlag = "--version") {
  try {
    const result = await executeCommand(command, [versionFlag]);
    if (result.success) {
      return parseVersion(result.stdout || result.stderr);
    }
    return null;
  } catch {
    return null;
  }
}
async function executeCommandSequence(commands) {
  const results = [];
  for (const cmd of commands) {
    const result = await executeCommand(
      cmd.command,
      cmd.args || [],
      cmd.options || {}
    );
    results.push(result);
    if (!result.success) {
      break;
    }
  }
  return results;
}
async function executeCommandParallel(commands) {
  const promises = commands.map(
    (cmd) => executeCommand(cmd.command, cmd.args || [], cmd.options || {})
  );
  return Promise.all(promises);
}

const index$4 = {
  __proto__: null,
  buildCommand: buildCommand,
  commandExists: commandExists,
  escapeArgument: escapeArgument,
  executeCommand: executeCommand,
  executeCommandParallel: executeCommandParallel,
  executeCommandSequence: executeCommandSequence,
  executeCommandStream: executeCommandStream,
  getCommandPath: getCommandPath,
  getCommandVersion: getCommandVersion,
  parseVersion: parseVersion
};

class ConfigManager {
  constructor(namespace, options = {}) {
    this.namespace = namespace;
    this.options = {
      configDir: options.configDir || this.getDefaultConfigDir(),
      fileName: options.fileName || `${namespace}.json`,
      createIfMissing: options.createIfMissing ?? true,
      validate: options.validate || (() => true)
    };
    this.configPath = path.join(this.options.configDir, this.options.fileName);
  }
  configPath;
  options;
  cache;
  /**
   * Get the default configuration directory
   */
  getDefaultConfigDir() {
    return path.join(os.homedir(), ".ccjk");
  }
  /**
   * Load configuration from file
   */
  async load() {
    try {
      const data = await promises.readFile(this.configPath, "utf-8");
      const config = JSON.parse(data);
      if (!this.options.validate(config)) {
        throw new Error("Configuration validation failed");
      }
      this.cache = config;
      return config;
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
  /**
   * Save configuration to file
   */
  async save(config) {
    if (!this.options.validate(config)) {
      throw new Error("Configuration validation failed");
    }
    await promises.mkdir(this.options.configDir, { recursive: true });
    await promises.writeFile(this.configPath, JSON.stringify(config, null, 2), "utf-8");
    this.cache = config;
  }
  /**
   * Update configuration (merge with existing)
   */
  async update(updates) {
    const current = await this.load() || {};
    const updated = { ...current, ...updates };
    await this.save(updated);
    return updated;
  }
  /**
   * Delete configuration file
   */
  async delete() {
    try {
      await promises.unlink(this.configPath);
      this.cache = void 0;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  /**
   * Check if configuration file exists
   */
  async exists() {
    try {
      await promises.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Get configuration path
   */
  getPath() {
    return this.configPath;
  }
  /**
   * Get cached configuration (without file I/O)
   */
  getCached() {
    return this.cache;
  }
  /**
   * Clear cache
   */
  clearCache() {
    this.cache = void 0;
  }
}
function createConfigManager(namespace, options) {
  return new ConfigManager(namespace, options);
}

class ConfigValidator {
  constructor(rules) {
    this.rules = rules;
  }
  /**
   * Validate a configuration object
   */
  validate(config) {
    const errors = [];
    for (const rule of this.rules) {
      const value = config[rule.field];
      if (rule.required && (value === void 0 || value === null)) {
        errors.push({
          field: String(rule.field),
          message: rule.message || `Field '${String(rule.field)}' is required`
        });
        continue;
      }
      if (value === void 0 || value === null) {
        continue;
      }
      if (rule.type) {
        const actualType = Array.isArray(value) ? "array" : typeof value;
        if (actualType !== rule.type) {
          errors.push({
            field: String(rule.field),
            message: rule.message || `Field '${String(rule.field)}' must be of type ${rule.type}`
          });
          continue;
        }
      }
      if (rule.validator && !rule.validator(value)) {
        errors.push({
          field: String(rule.field),
          message: rule.message || `Field '${String(rule.field)}' validation failed`
        });
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  /**
   * Validate and throw on error
   */
  validateOrThrow(config) {
    const result = this.validate(config);
    if (!result.valid) {
      const errorMessages = result.errors.map((e) => `${e.field}: ${e.message}`).join(", ");
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }
  }
}
function createValidator(rules) {
  return new ConfigValidator(rules);
}
const validators = {
  /**
   * Validate string is not empty
   */
  notEmpty: (value) => {
    return typeof value === "string" && value.trim().length > 0;
  },
  /**
   * Validate string matches pattern
   */
  pattern: (regex) => (value) => {
    return typeof value === "string" && regex.test(value);
  },
  /**
   * Validate number is in range
   */
  range: (min, max) => (value) => {
    return typeof value === "number" && value >= min && value <= max;
  },
  /**
   * Validate string length
   */
  length: (min, max) => (value) => {
    if (typeof value !== "string")
      return false;
    if (max !== void 0) {
      return value.length >= min && value.length <= max;
    }
    return value.length >= min;
  },
  /**
   * Validate value is one of allowed values
   */
  oneOf: (allowed) => (value) => {
    return allowed.includes(value);
  },
  /**
   * Validate email format
   */
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
    return typeof value === "string" && emailRegex.test(value);
  },
  /**
   * Validate URL format
   */
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  /**
   * Validate object has required keys
   */
  hasKeys: (keys) => (value) => {
    if (typeof value !== "object" || value === null)
      return false;
    return keys.every((key) => key in value);
  },
  /**
   * Validate array is not empty
   */
  notEmptyArray: (value) => {
    return Array.isArray(value) && value.length > 0;
  }
};

class BaseError extends Error {
  constructor(message, code, statusCode, details) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack
    };
  }
}
class ValidationError extends BaseError {
  constructor(message, details) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}
class NotFoundError extends BaseError {
  constructor(message, details) {
    super(message, "NOT_FOUND", 404, details);
  }
}
class UnauthorizedError extends BaseError {
  constructor(message, details) {
    super(message, "UNAUTHORIZED", 401, details);
  }
}
class ForbiddenError extends BaseError {
  constructor(message, details) {
    super(message, "FORBIDDEN", 403, details);
  }
}
class ConflictError extends BaseError {
  constructor(message, details) {
    super(message, "CONFLICT", 409, details);
  }
}
class TimeoutError extends BaseError {
  constructor(message, details) {
    super(message, "TIMEOUT", 408, details);
  }
}
class InternalError extends BaseError {
  constructor(message, details) {
    super(message, "INTERNAL_ERROR", 500, details);
  }
}
class ConfigurationError extends BaseError {
  constructor(message, details) {
    super(message, "CONFIGURATION_ERROR", 500, details);
  }
}
class NetworkError extends BaseError {
  constructor(message, details) {
    super(message, "NETWORK_ERROR", 503, details);
  }
}
function isErrorType(error, errorClass) {
  return error instanceof errorClass;
}
function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}
function getErrorStack(error) {
  if (error instanceof Error) {
    return error.stack;
  }
  return void 0;
}
function formatError(error) {
  if (error instanceof BaseError) {
    return {
      message: error.message,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      details: error.details
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
  }
  return {
    message: String(error)
  };
}
function wrapError(error, message, code) {
  const originalMessage = getErrorMessage(error);
  const fullMessage = `${message}: ${originalMessage}`;
  if (error instanceof BaseError) {
    return new BaseError(
      fullMessage,
      code || error.code,
      error.statusCode,
      error.details
    );
  }
  return new BaseError(fullMessage, code);
}
function tryCatch(fn) {
  try {
    const data = fn();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
async function tryCatchAsync(fn) {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
function assert$1(condition, message, ErrorClass = Error) {
  if (!condition) {
    throw new ErrorClass(message);
  }
}
function createErrorHandler(handlers, defaultHandler) {
  return (error) => {
    if (error instanceof BaseError && error.code && handlers[error.code]) {
      handlers[error.code](error);
    } else if (error instanceof Error && handlers[error.name]) {
      handlers[error.name](error);
    } else if (defaultHandler) {
      defaultHandler(error instanceof Error ? error : new Error(String(error)));
    } else {
      throw error;
    }
  };
}
class AggregateError extends BaseError {
  constructor(errors, message = "Multiple errors occurred") {
    super(message, "AGGREGATE_ERROR", 500, { errors });
    this.errors = errors;
  }
  static fromErrors(errors) {
    const message = `${errors.length} error(s) occurred: ${errors.map((e) => e.message).join(", ")}`;
    return new AggregateError(errors, message);
  }
}
async function retryWithErrorHandling(fn, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1e3,
    shouldRetry = () => true,
    onError
  } = options;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (onError) {
        onError(lastError, attempt);
      }
      if (attempt < maxAttempts && shouldRetry(lastError)) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw lastError;
      }
    }
  }
  throw lastError;
}

const index$3 = {
  __proto__: null,
  AggregateError: AggregateError,
  BaseError: BaseError,
  ConfigurationError: ConfigurationError,
  ConflictError: ConflictError,
  ForbiddenError: ForbiddenError,
  InternalError: InternalError,
  NetworkError: NetworkError,
  NotFoundError: NotFoundError,
  TimeoutError: TimeoutError,
  UnauthorizedError: UnauthorizedError,
  ValidationError: ValidationError,
  assert: assert$1,
  createErrorHandler: createErrorHandler,
  formatError: formatError,
  getErrorMessage: getErrorMessage,
  getErrorStack: getErrorStack,
  isErrorType: isErrorType,
  retryWithErrorHandling: retryWithErrorHandling,
  tryCatch: tryCatch,
  tryCatchAsync: tryCatchAsync,
  wrapError: wrapError
};

async function exists(filePath) {
  try {
    await promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}
async function isFile(filePath) {
  try {
    const stats = await promises.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}
async function isDirectory(filePath) {
  try {
    const stats = await promises.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
async function ensureDir(dirPath) {
  await promises.mkdir(dirPath, { recursive: true });
}
async function readFile(filePath, encoding = "utf-8") {
  return promises.readFile(filePath, encoding);
}
async function writeFile(filePath, content, encoding = "utf-8") {
  await ensureDir(path.dirname(filePath));
  await promises.writeFile(filePath, content, encoding);
}
async function appendFile(filePath, content, encoding = "utf-8") {
  await ensureDir(path.dirname(filePath));
  await promises.appendFile(filePath, content, encoding);
}
async function readJSON(filePath) {
  const content = await readFile(filePath);
  return JSON.parse(content);
}
async function writeJSON(filePath, data, pretty = true) {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  await writeFile(filePath, content);
}
async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await promises.copyFile(src, dest);
}
async function moveFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await promises.rename(src, dest);
}
async function deleteFile(filePath) {
  try {
    await promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
async function deleteDir(dirPath) {
  try {
    await promises.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
async function listFiles(dirPath, recursive = false) {
  const entries = await promises.readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      files.push(fullPath);
    } else if (entry.isDirectory() && recursive) {
      const subFiles = await listFiles(fullPath, true);
      files.push(...subFiles);
    }
  }
  return files;
}
async function listDirs(dirPath) {
  const entries = await promises.readdir(dirPath, { withFileTypes: true });
  const dirs = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      dirs.push(path.join(dirPath, entry.name));
    }
  }
  return dirs;
}
async function getFileSize$1(filePath) {
  const stats = await promises.stat(filePath);
  return stats.size;
}
async function getModifiedTime(filePath) {
  const stats = await promises.stat(filePath);
  return stats.mtime;
}
async function getCreatedTime(filePath) {
  const stats = await promises.stat(filePath);
  return stats.birthtime;
}
async function isReadable(filePath) {
  try {
    await promises.access(filePath, promises.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
async function isWritable(filePath) {
  try {
    await promises.access(filePath, promises.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
async function isExecutable(filePath) {
  try {
    await promises.access(filePath, promises.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
async function findFiles(dirPath, pattern, recursive = true) {
  const allFiles = await listFiles(dirPath, recursive);
  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  return allFiles.filter((file) => regex.test(file));
}
async function getDirSize(dirPath) {
  const files = await listFiles(dirPath, true);
  let totalSize = 0;
  for (const file of files) {
    try {
      totalSize += await getFileSize$1(file);
    } catch {
    }
  }
  return totalSize;
}
async function copyDir(src, dest) {
  await ensureDir(dest);
  const entries = await promises.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}
async function emptyDir(dirPath) {
  if (!await exists(dirPath)) {
    return;
  }
  const entries = await promises.readdir(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = await promises.stat(fullPath);
    if (stat.isDirectory()) {
      await deleteDir(fullPath);
    } else {
      await deleteFile(fullPath);
    }
  }
}

const index$2 = {
  __proto__: null,
  appendFile: appendFile,
  copyDir: copyDir,
  copyFile: copyFile,
  deleteDir: deleteDir,
  deleteFile: deleteFile,
  emptyDir: emptyDir,
  ensureDir: ensureDir,
  exists: exists,
  findFiles: findFiles,
  getCreatedTime: getCreatedTime,
  getDirSize: getDirSize,
  getFileSize: getFileSize$1,
  getModifiedTime: getModifiedTime,
  isDirectory: isDirectory,
  isExecutable: isExecutable,
  isFile: isFile,
  isReadable: isReadable,
  isWritable: isWritable,
  listDirs: listDirs,
  listFiles: listFiles,
  moveFile: moveFile,
  readFile: readFile,
  readJSON: readJSON,
  writeFile: writeFile,
  writeJSON: writeJSON
};

let Logger$1 = class Logger {
  level;
  silent;
  levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  constructor(options = {}) {
    this.level = options.level || "info";
    this.silent = options.silent || false;
  }
  shouldLog(level) {
    return !this.silent && this.levels[level] >= this.levels[this.level];
  }
  format(level, message, data) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const coloredPrefix = this.colorize(level, prefix);
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    return `${coloredPrefix} ${message}${dataStr}`;
  }
  /** MUD-style color scheme for log levels */
  colorize(level, text) {
    switch (level) {
      case "debug":
        return ansis.gray(text);
      case "info":
        return ansis.green(text);
      // MUD green for info
      case "warn":
        return ansis.yellow(text);
      case "error":
        return ansis.red(text);
    }
  }
  debug(message, data) {
    if (this.shouldLog("debug")) {
      console.log(this.format("debug", message, data));
    }
  }
  info(message, data) {
    if (this.shouldLog("info")) {
      console.log(this.format("info", message, data));
    }
  }
  warn(message, data) {
    if (this.shouldLog("warn")) {
      console.warn(this.format("warn", message, data));
    }
  }
  error(message, data) {
    if (this.shouldLog("error")) {
      console.error(this.format("error", message, data));
    }
  }
  setLevel(level) {
    this.level = level;
  }
  setSilent(silent) {
    this.silent = silent;
  }
};
const logger$1 = new Logger$1();

const logger$2 = {
  __proto__: null,
  Logger: Logger$1,
  logger: logger$1
};

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
const COLORS = {
  reset: "\x1B[0m",
  debug: "\x1B[36m",
  // Cyan
  info: "\x1B[32m",
  // Green
  warn: "\x1B[33m",
  // Yellow
  error: "\x1B[31m"
  // Red
};
class Logger {
  level;
  prefix;
  timestamp;
  colors;
  constructor(options = {}) {
    this.level = options.level || "info";
    this.prefix = options.prefix || "";
    this.timestamp = options.timestamp ?? true;
    this.colors = options.colors ?? true;
  }
  shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }
  formatMessage(level, message, ...args) {
    const parts = [];
    if (this.timestamp) {
      parts.push(`[${(/* @__PURE__ */ new Date()).toISOString()}]`);
    }
    if (this.prefix) {
      parts.push(`[${this.prefix}]`);
    }
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);
    let formatted = parts.join(" ");
    if (args.length > 0) {
      formatted += ` ${args.map((arg) => this.stringify(arg)).join(" ")}`;
    }
    if (this.colors && process.stdout.isTTY) {
      return `${COLORS[level]}${formatted}${COLORS.reset}`;
    }
    return formatted;
  }
  stringify(value) {
    if (typeof value === "string") {
      return value;
    }
    if (value instanceof Error) {
      return value.stack || value.message;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  debug(message, ...args) {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, ...args));
    }
  }
  info(message, ...args) {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, ...args));
    }
  }
  warn(message, ...args) {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, ...args));
    }
  }
  error(message, ...args) {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, ...args));
    }
  }
  setLevel(level) {
    this.level = level;
  }
  getLevel() {
    return this.level;
  }
}
function createLogger(options) {
  return new Logger(options);
}
const logger = createLogger();

function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item));
  }
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}
function deepMerge(target, source) {
  const output = { ...target };
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = output[key];
      if (isObject$1(sourceValue) && isObject$1(targetValue)) {
        output[key] = deepMerge(targetValue, sourceValue);
      } else {
        output[key] = sourceValue;
      }
    }
  }
  return output;
}
function isObject$1(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function get(obj, path, defaultValue) {
  const keys2 = path.split(".");
  let result = obj;
  for (const key of keys2) {
    if (result === null || result === void 0) {
      return defaultValue;
    }
    result = result[key];
  }
  return result !== void 0 ? result : defaultValue;
}
function set(obj, path, value) {
  const keys2 = path.split(".");
  const lastKey = keys2.pop();
  let current = obj;
  for (const key of keys2) {
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }
  current[lastKey] = value;
}
function has(obj, path) {
  const keys2 = path.split(".");
  let current = obj;
  for (const key of keys2) {
    if (current === null || current === void 0 || !(key in current)) {
      return false;
    }
    current = current[key];
  }
  return true;
}
function unset(obj, path) {
  const keys2 = path.split(".");
  const lastKey = keys2.pop();
  let current = obj;
  for (const key of keys2) {
    if (current === null || current === void 0 || !(key in current)) {
      return false;
    }
    current = current[key];
  }
  if (lastKey in current) {
    delete current[lastKey];
    return true;
  }
  return false;
}
function keys(obj, prefix = "") {
  const result = [];
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      result.push(fullKey);
      if (isObject$1(obj[key])) {
        result.push(...keys(obj[key], fullKey));
      }
    }
  }
  return result;
}
function values(obj) {
  return Object.values(obj);
}
function entries(obj) {
  return Object.entries(obj);
}
function pick(obj, keys2) {
  const result = {};
  for (const key of keys2) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
function omit(obj, keys2) {
  const result = { ...obj };
  for (const key of keys2) {
    delete result[key];
  }
  return result;
}
function filter(obj, predicate) {
  const result = {};
  for (const [key, value] of entries(obj)) {
    if (predicate(value, key)) {
      result[key] = value;
    }
  }
  return result;
}
function map(obj, mapper) {
  const result = {};
  for (const [key, value] of entries(obj)) {
    result[key] = mapper(value, key);
  }
  return result;
}
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}
function flatten(obj, prefix = "", separator = ".") {
  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}${separator}${key}` : key;
      if (isObject$1(obj[key]) && !Array.isArray(obj[key])) {
        Object.assign(result, flatten(obj[key], fullKey, separator));
      } else {
        result[fullKey] = obj[key];
      }
    }
  }
  return result;
}
function unflatten(obj, separator = ".") {
  const result = {};
  for (const [key, value] of entries(obj)) {
    set(result, key.replace(new RegExp(separator, "g"), "."), value);
  }
  return result;
}
function invert(obj) {
  const result = {};
  for (const [key, value] of entries(obj)) {
    result[value] = key;
  }
  return result;
}
function groupBy(arr, key) {
  const result = {};
  for (const item of arr) {
    const groupKey = typeof key === "function" ? key(item) : String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
  }
  return result;
}
function keyBy(arr, key) {
  const result = {};
  for (const item of arr) {
    const itemKey = typeof key === "function" ? key(item) : String(item[key]);
    result[itemKey] = item;
  }
  return result;
}
function isEqual(obj1, obj2) {
  if (obj1 === obj2)
    return true;
  if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length)
    return false;
  for (const key of keys1) {
    if (!keys2.includes(key) || !isEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  return true;
}
function compact(obj) {
  const result = {};
  for (const [key, value] of entries(obj)) {
    if (value !== null && value !== void 0) {
      result[key] = value;
    }
  }
  return result;
}
function deepFreeze(obj) {
  Object.freeze(obj);
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === "object" && value !== null) {
        deepFreeze(value);
      }
    }
  }
  return obj;
}
function merge(...objects) {
  return objects.reduce((acc, obj) => ({ ...acc, ...obj }), {});
}
function size(obj) {
  return Object.keys(obj).length;
}

const index$1 = {
  __proto__: null,
  compact: compact,
  deepClone: deepClone,
  deepFreeze: deepFreeze,
  deepMerge: deepMerge,
  entries: entries,
  filter: filter,
  flatten: flatten,
  get: get,
  groupBy: groupBy,
  has: has,
  invert: invert,
  isEmpty: isEmpty,
  isEqual: isEqual,
  keyBy: keyBy,
  keys: keys,
  map: map,
  merge: merge,
  omit: omit,
  pick: pick,
  set: set,
  size: size,
  unflatten: unflatten,
  unset: unset,
  values: values
};

function getPlatform() {
  const platform = os.platform();
  if (platform === "darwin" || platform === "linux" || platform === "win32") {
    return platform;
  }
  return "unknown";
}
function getArchitecture() {
  const arch = os.arch();
  if (arch === "x64" || arch === "arm64" || arch === "ia32") {
    return arch;
  }
  return "unknown";
}
function isMacOS() {
  return getPlatform() === "darwin";
}
function isLinux() {
  return getPlatform() === "linux";
}
function isWindows() {
  return getPlatform() === "win32";
}
function isUnix() {
  return isMacOS() || isLinux();
}
function getPlatformInfo() {
  return {
    platform: getPlatform(),
    architecture: getArchitecture(),
    release: os.release(),
    hostname: os.hostname(),
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem()
  };
}

function getHomeDir() {
  return os.homedir();
}
function getConfigDir(appName) {
  const home = getHomeDir();
  if (isWindows()) {
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    return appName ? path.join(appData, appName) : appData;
  }
  if (isMacOS()) {
    const configDir2 = path.join(home, "Library", "Application Support");
    return appName ? path.join(configDir2, appName) : configDir2;
  }
  const configDir = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  return appName ? path.join(configDir, appName) : configDir;
}
function getDataDir(appName) {
  const home = getHomeDir();
  if (isWindows()) {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    return appName ? path.join(localAppData, appName) : localAppData;
  }
  if (isMacOS()) {
    const dataDir2 = path.join(home, "Library", "Application Support");
    return appName ? path.join(dataDir2, appName) : dataDir2;
  }
  const dataDir = process.env.XDG_DATA_HOME || path.join(home, ".local", "share");
  return appName ? path.join(dataDir, appName) : dataDir;
}
function getCacheDir(appName) {
  const home = getHomeDir();
  if (isWindows()) {
    const temp = os.tmpdir();
    return appName ? path.join(temp, appName) : temp;
  }
  if (isMacOS()) {
    const cacheDir2 = path.join(home, "Library", "Caches");
    return appName ? path.join(cacheDir2, appName) : cacheDir2;
  }
  const cacheDir = process.env.XDG_CACHE_HOME || path.join(home, ".cache");
  return appName ? path.join(cacheDir, appName) : cacheDir;
}
function getTempDir(appName) {
  const temp = os.tmpdir();
  return appName ? path.join(temp, appName) : temp;
}

const DEFAULT_CHUNK_SIZE = 1024 * 1024;
async function processLargeFile(filePath, processor, options = {}) {
  const { chunkSize = DEFAULT_CHUNK_SIZE, encoding = "utf8" } = options;
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding });
    const chunks = [];
    let chunkIndex = 0;
    stream.on("data", (chunk) => {
      chunks.push(chunk);
      if (chunks.length * chunkSize >= chunkSize) {
        const combined = Buffer.concat(chunks);
        processor(combined, chunkIndex++);
        chunks.length = 0;
      }
    });
    stream.on("end", () => {
      if (chunks.length > 0) {
        const combined = Buffer.concat(chunks);
        processor(combined, chunkIndex);
      }
      resolve();
    });
    stream.on("error", reject);
  });
}
async function streamJSON(filePath, options = {}) {
  const chunks = [];
  await pipeline(
    createReadStream(filePath, { encoding: "utf8" }),
    new Transform({
      transform(chunk, _, callback) {
        chunks.push(chunk);
        callback();
      }
    }),
    async function writeToMemory(_, callback) {
      try {
        const content = Buffer.concat(chunks).toString("utf8");
        const data = JSON.parse(content);
        callback(null, data);
      } catch (error) {
        callback(error, null);
      }
    }
  );
  return null;
}
async function streamWriteJSON(filePath, data, options = {}) {
  await promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}
async function processLineByLine(filePath, processor) {
  const rl = await import('node:readline').createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Number.MAX_VALUE
    // Treat \r\n as single character
  });
  let index = 0;
  for await (const line of rl) {
    await Promise.resolve(processor(line, index++));
  }
  await rl.close();
}
async function getFileSize(filePath) {
  try {
    const stats = await promises.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}
async function countLines(filePath) {
  let count = 0;
  await processLineByLine(filePath, () => {
    count++;
  });
  return count;
}
async function batchProcessFiles(filePaths, processor, concurrency = 3) {
  const results = /* @__PURE__ */ new Map();
  const queue = [...filePaths];
  const processing = /* @__PURE__ */ new Set();
  const processNext = async () => {
    while (queue.length > 0 && processing.size < concurrency) {
      const file = queue.shift();
      processing.add(file);
      try {
        const result = await processor(file);
        results.set(file, result);
      } catch (error) {
        results.set(file, null);
      } finally {
        processing.delete(file);
      }
    }
  };
  const workers = Array.from({ length: Math.min(concurrency, queue.length) });
  for (let i = 0; i < workers.length; i++) {
    processNext().then(() => {
    });
  }
  await Promise.all(workers);
  return results;
}
async function isLargeFile(filePath, threshold = 1024 * 1024) {
  return await getFileSize(filePath) > threshold;
}
async function getFileInfo(filePath, options = {}) {
  const [size, lines] = await Promise.all([
    getFileSize(filePath),
    isLargeFile(filePath) ? countLines(filePath) : Promise.resolve(0)
  ]);
  return {
    path: filePath,
    size,
    lines,
    isLarge: size > (options.chunkSize || DEFAULT_CHUNK_SIZE),
    encoding: options.encoding || null
  };
}

function capitalize(str) {
  if (!str)
    return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function camelCase(str) {
  return str.replace(/^\w|[A-Z]|\b\w/g, (letter, index) => index === 0 ? letter.toLowerCase() : letter.toUpperCase()).replace(/\s+/g, "").replace(/[-_]/g, "");
}
function pascalCase(str) {
  return str.replace(/^\w|[A-Z]|\b\w/g, (letter) => letter.toUpperCase()).replace(/\s+/g, "").replace(/[-_]/g, "");
}
function snakeCase(str) {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_").replace(/^_/, "");
}
function kebabCase(str) {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-").replace(/^-/, "");
}
function constantCase(str) {
  return snakeCase(str).toUpperCase();
}
function truncate(str, length, suffix = "...") {
  if (str.length <= length)
    return str;
  return str.slice(0, length - suffix.length) + suffix;
}
function pad(str, length, char = " ", direction = "right") {
  if (str.length >= length)
    return str;
  const padLength = length - str.length;
  if (direction === "left") {
    return char.repeat(padLength) + str;
  } else if (direction === "right") {
    return str + char.repeat(padLength);
  } else {
    const leftPad = Math.floor(padLength / 2);
    const rightPad = padLength - leftPad;
    return char.repeat(leftPad) + str + char.repeat(rightPad);
  }
}
function trim(str) {
  return str.trim();
}
function trimStart(str) {
  return str.trimStart();
}
function trimEnd(str) {
  return str.trimEnd();
}
function split(str, delimiter) {
  return str.split(delimiter);
}
function join(arr, separator = "") {
  return arr.join(separator);
}
function replaceAll(str, search, replacement) {
  if (typeof search === "string") {
    return str.split(search).join(replacement);
  }
  return str.replace(new RegExp(search, "g"), replacement);
}
function startsWith(str, prefix) {
  return str.startsWith(prefix);
}
function endsWith(str, suffix) {
  return str.endsWith(suffix);
}
function contains(str, substring) {
  return str.includes(substring);
}
function countOccurrences(str, substring) {
  return str.split(substring).length - 1;
}
function reverse(str) {
  return str.split("").reverse().join("");
}
function removeWhitespace(str) {
  return str.replace(/\s+/g, "");
}
function normalizeWhitespace(str) {
  return str.replace(/\s+/g, " ").trim();
}
function words(str) {
  return str.match(/\b\w+\b/g) || [];
}
function wordCount(str) {
  return words(str).length;
}
function titleCase(str) {
  return str.toLowerCase().split(" ").map((word) => capitalize(word)).join(" ");
}
function sentenceCase(str) {
  return capitalize(str.toLowerCase());
}
function escapeHTML(str) {
  const htmlEscapes = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}
function unescapeHTML(str) {
  const htmlUnescapes = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'"
  };
  return str.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => htmlUnescapes[entity]);
}
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function randomString(length, charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
function slugify(str) {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function extractNumbers(str) {
  const matches = str.match(/-?\d+\.?\d*/g);
  return matches ? matches.map(Number) : [];
}
function template(str, values) {
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== void 0 ? String(values[key]) : match;
  });
}
function repeat(str, count) {
  return str.repeat(count);
}
function isBlank(str) {
  return !str || str.trim().length === 0;
}
function ensureSuffix(str, suffix) {
  return endsWith(str, suffix) ? str : str + suffix;
}
function ensurePrefix(str, prefix) {
  return startsWith(str, prefix) ? str : prefix + str;
}
function removePrefix(str, prefix) {
  return startsWith(str, prefix) ? str.slice(prefix.length) : str;
}
function removeSuffix(str, suffix) {
  return endsWith(str, suffix) ? str.slice(0, -suffix.length) : str;
}

const index = {
  __proto__: null,
  camelCase: camelCase,
  capitalize: capitalize,
  constantCase: constantCase,
  contains: contains,
  countOccurrences: countOccurrences,
  endsWith: endsWith,
  ensurePrefix: ensurePrefix,
  ensureSuffix: ensureSuffix,
  escapeHTML: escapeHTML,
  escapeRegExp: escapeRegExp,
  extractNumbers: extractNumbers,
  isBlank: isBlank,
  join: join,
  kebabCase: kebabCase,
  normalizeWhitespace: normalizeWhitespace,
  pad: pad,
  pascalCase: pascalCase,
  randomString: randomString,
  removePrefix: removePrefix,
  removeSuffix: removeSuffix,
  removeWhitespace: removeWhitespace,
  repeat: repeat,
  replaceAll: replaceAll,
  reverse: reverse,
  sentenceCase: sentenceCase,
  slugify: slugify,
  snakeCase: snakeCase,
  split: split,
  startsWith: startsWith,
  template: template,
  titleCase: titleCase,
  trim: trim,
  trimEnd: trimEnd,
  trimStart: trimStart,
  truncate: truncate,
  unescapeHTML: unescapeHTML,
  uuid: uuid,
  wordCount: wordCount,
  words: words
};

function validateArrayAccess(array, index) {
  if (!Array.isArray(array)) {
    return { valid: false, error: "Input is not an array" };
  }
  if (index < 0 || index >= array.length) {
    return { valid: false, error: `Index ${index} out of bounds for array of length ${array.length}` };
  }
  return { valid: true };
}
function safeArrayAccess(array, index, defaultValue) {
  const validation = validateArrayAccess(array, index);
  if (!validation.valid) {
    return defaultValue;
  }
  return array[index];
}
function validateObjectKeyAccess(obj, key) {
  if (!obj || typeof obj !== "object") {
    return { valid: false, error: "Input is not an object" };
  }
  if (!(key in obj)) {
    return { valid: false, error: `Key "${key}" not found in object` };
  }
  return { valid: true };
}
function safeObjectAccess(obj, key, defaultValue) {
  if (!obj || typeof obj !== "object") {
    return defaultValue;
  }
  return key in obj ? obj[key] : defaultValue;
}
function isValidEnvVarName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Environment variable name must be a non-empty string" };
  }
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
    return {
      valid: false,
      error: "Environment variable name must start with letter or underscore and contain only uppercase letters, numbers, and underscores"
    };
  }
  return { valid: true };
}
function sanitizeEnvValue(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.replace(/[\n\r\0]/g, "");
}
function isValidUrl(url) {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL must be a non-empty string" };
  }
  if (url.length > 2048) {
    return { valid: false, error: "URL is too long (max 2048 characters)" };
  }
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "URL must use http:// or https://" };
    }
    if (!parsed.hostname) {
      return { valid: false, error: "URL must have a valid hostname" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}
function isValidFilePath(path) {
  if (!path || typeof path !== "string") {
    return { valid: false, error: "Path must be a non-empty string" };
  }
  if (path.includes("..")) {
    return { valid: false, error: "Path contains directory traversal characters (..)" };
  }
  if (path.includes("\0")) {
    return { valid: false, error: "Path contains null bytes" };
  }
  return { valid: true };
}
function isValidPathEntry(entry) {
  if (!entry || typeof entry !== "string") {
    return { valid: false, error: "Path entry must be a non-empty string" };
  }
  if (entry.includes("..") || entry.includes("/") || entry.includes("\\")) {
    return { valid: false, error: "Path entry contains invalid characters" };
  }
  if (entry.includes("\0")) {
    return { valid: false, error: "Path entry contains null bytes" };
  }
  return { valid: true };
}
function validateUserInput(input, options = {}) {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Input must be a non-empty string" };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Input cannot be empty" };
  }
  const { minLength = 1, maxLength = 1e3, pattern, allowedChars } = options;
  if (trimmed.length < minLength) {
    return { valid: false, error: `Input must be at least ${minLength} characters` };
  }
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Input must not exceed ${maxLength} characters` };
  }
  if (pattern && !pattern.test(trimmed)) {
    return { valid: false, error: "Input contains invalid characters" };
  }
  if (allowedChars) {
    const allowedSet = new Set(allowedChars);
    for (const char of trimmed) {
      if (!allowedSet.has(char)) {
        return { valid: false, error: `Input contains disallowed character: ${char}` };
      }
    }
  }
  return { valid: true };
}
function sanitizeUserInput(input, maxLength = 1e3) {
  if (!input || typeof input !== "string") {
    return "";
  }
  return input.trim().slice(0, maxLength);
}
function isValidApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return { valid: false, error: "API key must be a non-empty string" };
  }
  if (apiKey.length < 10) {
    return { valid: false, error: "API key is too short" };
  }
  if (apiKey.length > 500) {
    return { valid: false, error: "API key is too long" };
  }
  if (/\s/.test(apiKey)) {
    return { valid: false, error: "API key contains whitespace" };
  }
  return { valid: true };
}
function formatApiKeyDisplay(apiKey) {
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 12) {
    return "***";
  }
  return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
}
function validateConfigStructure(config, schema) {
  if (!config || typeof config !== "object") {
    return { valid: false, error: "Config must be an object" };
  }
  const configObj = config;
  for (const [key, expectedType] of Object.entries(schema)) {
    if (!(key in configObj)) {
      return { valid: false, error: `Missing required field: ${key}` };
    }
    const value = configObj[key];
    const actualType = Array.isArray(value) ? "array" : typeof value;
    if (actualType !== expectedType) {
      return {
        valid: false,
        error: `Field "${key}" has wrong type. Expected ${expectedType}, got ${actualType}`
      };
    }
  }
  return { valid: true };
}
function validateArray(array, validator) {
  if (!Array.isArray(array)) {
    return { valid: false, error: "Input is not an array" };
  }
  for (let i = 0; i < array.length; i++) {
    const result = validator(array[i]);
    if (!result.valid) {
      return { valid: false, error: `Item at index ${i}: ${result.error}` };
    }
  }
  return { valid: true };
}
function isValidEnumValue(value, allowedValues) {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: `Invalid value. Must be one of: ${allowedValues.join(", ")}`
    };
  }
  return { valid: true };
}
function isValidPort(port) {
  if (typeof port !== "number" && typeof port !== "string") {
    return { valid: false, error: "Port must be a number or string" };
  }
  const portNum = typeof port === "string" ? Number.parseInt(port, 10) : port;
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    return { valid: false, error: "Port must be between 1 and 65535" };
  }
  return { valid: true };
}
function isValidHostname(hostname) {
  if (!hostname || typeof hostname !== "string") {
    return { valid: false, error: "Hostname must be a non-empty string" };
  }
  if (hostname.length > 253) {
    return { valid: false, error: "Hostname is too long (max 253 characters)" };
  }
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(hostname)) {
    return { valid: false, error: "Invalid hostname format" };
  }
  return { valid: true };
}

const validation = {
  __proto__: null,
  formatApiKeyDisplay: formatApiKeyDisplay,
  isValidApiKey: isValidApiKey,
  isValidEnumValue: isValidEnumValue,
  isValidEnvVarName: isValidEnvVarName,
  isValidFilePath: isValidFilePath,
  isValidHostname: isValidHostname,
  isValidPathEntry: isValidPathEntry,
  isValidPort: isValidPort,
  isValidUrl: isValidUrl,
  safeArrayAccess: safeArrayAccess,
  safeObjectAccess: safeObjectAccess,
  sanitizeEnvValue: sanitizeEnvValue,
  sanitizeUserInput: sanitizeUserInput,
  validateArray: validateArray,
  validateArrayAccess: validateArrayAccess,
  validateConfigStructure: validateConfigStructure,
  validateObjectKeyAccess: validateObjectKeyAccess,
  validateUserInput: validateUserInput
};

function isDefined(value) {
  return value !== null && value !== void 0;
}
function isString(value) {
  return typeof value === "string";
}
function isNumber(value) {
  return typeof value === "number" && !isNaN(value);
}
function isBoolean(value) {
  return typeof value === "boolean";
}
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isArray(value) {
  return Array.isArray(value);
}
function isEmail(value) {
  const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
  return emailRegex.test(value);
}
function isURL(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
function assertDefined(value, message) {
  if (!isDefined(value)) {
    throw new Error(message || "Value is null or undefined");
  }
}
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

export { AiderTool, BaseCodeTool, BaseError, ClaudeCodeTool, ClineTool, CodexTool, ConfigManager, ConfigValidator, ConfigurationError, ContinueTool, CursorTool, InternalError, Logger, Mutex, NotFoundError, Semaphore, TimeoutError, ToolFactory, ToolRegistry, UnauthorizedError, ValidationError, index$6 as array, assert, assertDefined, index$5 as async, batchProcessFiles, camelCase, capitalize, chunk, index$4 as command, commandExists, copyFile, countLines, createConfigManager, createLogger, createTool, createValidator, debounce, deepClone, deepMerge, deleteDir, deleteFile, difference, ensureDir, index$3 as error, executeCommand, executeCommandStream, exists, flatten, flatten$1 as flattenArray, formatError, index$2 as fs, get, getArchitecture, getCacheDir, getCommandPath, getCommandVersion, getConfigDir, getDataDir, getErrorMessage, getFileInfo, getFileSize, getHomeDir, getPlatform, getPlatformInfo, getRegistry, getTempDir, has, intersection, isArray, isBoolean, isDefined, isDirectory, isEmail, isFile, isLargeFile, isLinux, isMacOS, isNumber, isObject, isString, isURL, isUnix, isWindows, kebabCase, listDirs, listFiles, logger, logger$2 as loggerUtils, moveFile, index$1 as object, omit, parallelLimit, partition, pascalCase, pick, processLargeFile, processLineByLine, readFile, readJSON, retry, sequence, set, shuffle, sleep, slugify, snakeCase, streamJSON, streamWriteJSON, index as string, template, throttle, timeout, truncate, tryCatch, tryCatchAsync, unflatten, union, unique, validation, validators, waitFor, wrapError, writeFile, writeJSON };
