import { existsSync, readFileSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname, basename } from 'pathe';
import { x } from 'tinyexec';
import { spawn } from 'node:child_process';

const DEFAULT_MIN_CONFIDENCE = 0.6;
const PATTERN_WEIGHT = 0.4;
const KEYWORD_WEIGHT = 0.3;
const CONTEXT_WEIGHT = 0.3;
class IntentEngine {
  rules = /* @__PURE__ */ new Map();
  contextCache = /* @__PURE__ */ new Map();
  cacheTTL = 5e3;
  // 5 seconds
  constructor() {
  }
  // ==========================================================================
  // Rule Management
  // ==========================================================================
  /**
   * Register an intent rule
   */
  registerRule(rule) {
    this.rules.set(rule.id, rule);
  }
  /**
   * Register multiple intent rules
   */
  registerRules(rules) {
    for (const rule of rules) {
      this.registerRule(rule);
    }
  }
  /**
   * Unregister an intent rule
   */
  unregisterRule(ruleId) {
    this.rules.delete(ruleId);
  }
  /**
   * Unregister all rules for a plugin
   */
  unregisterPluginRules(pluginId) {
    for (const [id, rule] of this.rules) {
      if (rule.pluginId === pluginId) {
        this.rules.delete(id);
      }
    }
  }
  /**
   * Get all registered rules
   */
  getRules() {
    return Array.from(this.rules.values());
  }
  // ==========================================================================
  // Intent Detection
  // ==========================================================================
  /**
   * Detect intent from user input and context
   *
   * @param userInput - User's input text
   * @param cwd - Current working directory
   * @returns Array of intent matches sorted by confidence
   */
  async detect(userInput, cwd) {
    const context = await this.buildContext(userInput, cwd);
    const matches = [];
    for (const rule of this.rules.values()) {
      const match = this.matchRule(rule, context);
      if (match && match.confidence >= (rule.minConfidence ?? DEFAULT_MIN_CONFIDENCE)) {
        matches.push(match);
      }
    }
    matches.sort((a, b) => {
      const confDiff = b.confidence - a.confidence;
      if (Math.abs(confDiff) > 0.1) {
        return confDiff;
      }
      const ruleA = this.rules.get(a.intentId);
      const ruleB = this.rules.get(b.intentId);
      return (ruleB?.priority ?? 0) - (ruleA?.priority ?? 0);
    });
    return matches;
  }
  /**
   * Get the best matching intent
   */
  async detectBest(userInput, cwd) {
    const matches = await this.detect(userInput, cwd);
    return matches.length > 0 ? matches[0] : null;
  }
  /**
   * Check if any intent should auto-execute
   */
  async detectAutoExecute(userInput, cwd) {
    const matches = await this.detect(userInput, cwd);
    return matches.find((m) => m.autoExecute && m.confidence >= 0.8) ?? null;
  }
  // ==========================================================================
  // Context Building
  // ==========================================================================
  /**
   * Build detection context from user input and environment
   */
  async buildContext(userInput, cwd) {
    const [gitStatus, projectType, activeSignals] = await Promise.all([
      this.detectGitStatus(cwd),
      this.detectProjectType(cwd),
      this.detectActiveSignals(cwd)
    ]);
    return {
      userInput,
      cwd,
      gitStatus,
      projectType,
      activeSignals
    };
  }
  /**
   * Detect git status
   */
  async detectGitStatus(cwd) {
    const isRepo = existsSync(join(cwd, ".git"));
    if (!isRepo) {
      return { isRepo: false, hasChanges: false, hasStaged: false };
    }
    try {
      const statusResult = await x("git", ["status", "--porcelain"], { nodeOptions: { cwd } });
      const hasChanges = statusResult.stdout.trim().length > 0;
      const stagedResult = await x("git", ["diff", "--cached", "--name-only"], { nodeOptions: { cwd } });
      const hasStaged = stagedResult.stdout.trim().length > 0;
      const branchResult = await x("git", ["branch", "--show-current"], { nodeOptions: { cwd } });
      const branch = branchResult.stdout.trim();
      const remoteResult = await x("git", ["remote", "get-url", "origin"], { nodeOptions: { cwd } });
      const remote = remoteResult.stdout.trim() || void 0;
      return { isRepo, hasChanges, hasStaged, branch, remote };
    } catch {
      return { isRepo, hasChanges: false, hasStaged: false };
    }
  }
  /**
   * Detect project type from files
   */
  async detectProjectType(cwd) {
    if (existsSync(join(cwd, "next.config.js")) || existsSync(join(cwd, "next.config.mjs")) || existsSync(join(cwd, "next.config.ts"))) {
      return "nextjs";
    }
    if (existsSync(join(cwd, "vue.config.js")) || existsSync(join(cwd, "vite.config.ts"))) {
      const pkgPath2 = join(cwd, "package.json");
      if (existsSync(pkgPath2)) {
        try {
          const pkg = await import(pkgPath2);
          if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
            return "vue";
          }
        } catch {
        }
      }
    }
    const pkgPath = join(cwd, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = await import(pkgPath);
        if (pkg.dependencies?.react || pkg.devDependencies?.react) {
          return "react";
        }
      } catch {
      }
    }
    if (existsSync(join(cwd, "tsconfig.json"))) {
      return "typescript";
    }
    if (existsSync(join(cwd, "package.json"))) {
      return "nodejs";
    }
    if (existsSync(join(cwd, "requirements.txt")) || existsSync(join(cwd, "pyproject.toml"))) {
      return "python";
    }
    if (existsSync(join(cwd, "Cargo.toml"))) {
      return "rust";
    }
    if (existsSync(join(cwd, "go.mod"))) {
      return "go";
    }
    return "unknown";
  }
  /**
   * Detect active context signals
   */
  async detectActiveSignals(cwd) {
    const signals = [];
    const gitStatus = await this.detectGitStatus(cwd);
    if (gitStatus.isRepo) {
      signals.push("git_is_repo");
      if (gitStatus.hasChanges)
        signals.push("git_has_changes");
      if (gitStatus.hasStaged)
        signals.push("git_has_staged");
      if (gitStatus.remote)
        signals.push("git_has_remote");
    }
    if (existsSync(join(cwd, "package.json")))
      signals.push("has_package_json");
    if (existsSync(join(cwd, "tsconfig.json")))
      signals.push("has_tsconfig");
    if (existsSync(join(cwd, "Dockerfile")) || existsSync(join(cwd, "docker-compose.yml")))
      signals.push("has_dockerfile");
    if (existsSync(join(cwd, "tests")) || existsSync(join(cwd, "__tests__")) || existsSync(join(cwd, "test"))) {
      signals.push("has_tests");
    }
    if (cwd.includes("/src") || existsSync(join(cwd, "src"))) {
      signals.push("in_src_directory");
    }
    return signals;
  }
  // ==========================================================================
  // Rule Matching
  // ==========================================================================
  /**
   * Match a single rule against context
   */
  matchRule(rule, context) {
    const matchedPatterns = [];
    const matchedSignals = [];
    let patternScore = 0;
    for (const pattern of rule.patterns) {
      try {
        const regex = new RegExp(pattern, "i");
        if (regex.test(context.userInput)) {
          matchedPatterns.push(pattern);
          patternScore += 1 / rule.patterns.length;
        }
      } catch {
        if (context.userInput.toLowerCase().includes(pattern.toLowerCase())) {
          matchedPatterns.push(pattern);
          patternScore += 1 / rule.patterns.length;
        }
      }
    }
    let keywordScore = 0;
    const inputLower = context.userInput.toLowerCase();
    for (const keyword of rule.keywords) {
      if (inputLower.includes(keyword.toLowerCase())) {
        keywordScore += 1 / rule.keywords.length;
      }
    }
    let contextScore = 0;
    if (rule.contextSignals.length > 0) {
      for (const signal of rule.contextSignals) {
        if (context.activeSignals.includes(signal)) {
          matchedSignals.push(signal);
          contextScore += 1 / rule.contextSignals.length;
        }
      }
    } else {
      contextScore = 1;
    }
    let fileBonus = 0;
    if (rule.filePatterns && rule.filePatterns.length > 0) {
      for (const pattern of rule.filePatterns) {
        if (existsSync(join(context.cwd, pattern))) {
          fileBonus += 0.1;
        }
      }
    }
    const confidence = Math.min(1, patternScore * PATTERN_WEIGHT + keywordScore * KEYWORD_WEIGHT + contextScore * CONTEXT_WEIGHT + fileBonus);
    if (patternScore === 0 && keywordScore === 0) {
      return null;
    }
    return {
      pluginId: rule.pluginId,
      intentId: rule.id,
      confidence,
      matchedPatterns,
      matchedSignals,
      suggestedAction: rule.name,
      autoExecute: rule.autoExecute && confidence >= 0.8
    };
  }
  // ==========================================================================
  // Cache Management
  // ==========================================================================
  /**
   * Clear context cache
   */
  clearCache() {
    this.contextCache.clear();
  }
  /**
   * Get cached value or compute
   */
  async getCachedOrCompute(key, compute) {
    const cached = this.contextCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.value;
    }
    const value = await compute();
    this.contextCache.set(key, { value, timestamp: Date.now() });
    return value;
  }
}
const DEFAULT_INTENT_RULES = [
  // Git Commit Intent
  {
    id: "intent:git-commit",
    name: { "en": "Git Commit", "zh-CN": "Git \u63D0\u4EA4" },
    patterns: [
      "\u63D0\u4EA4.*\u4EE3\u7801",
      "\u63D0\u4EA4.*\u66F4\u6539",
      "\u63D0\u4EA4.*\u4FEE\u6539",
      "commit.*changes",
      "commit.*code",
      "save.*changes",
      "\u4FDD\u5B58.*\u4FEE\u6539"
    ],
    keywords: ["commit", "\u63D0\u4EA4", "save", "push", "\u4FDD\u5B58"],
    contextSignals: ["git_is_repo", "git_has_changes"],
    filePatterns: [".git/"],
    priority: 90,
    pluginId: "git-helper",
    skillId: "smart-commit",
    autoExecute: false
  },
  // Code Review Intent
  {
    id: "intent:code-review",
    name: { "en": "Code Review", "zh-CN": "\u4EE3\u7801\u5BA1\u67E5" },
    patterns: [
      "\u5BA1\u67E5.*\u4EE3\u7801",
      "review.*code",
      "\u68C0\u67E5.*\u4EE3\u7801",
      "check.*code",
      "\u4EE3\u7801.*\u95EE\u9898"
    ],
    keywords: ["review", "\u5BA1\u67E5", "check", "\u68C0\u67E5", "lint"],
    contextSignals: ["git_has_changes", "in_src_directory"],
    priority: 85,
    pluginId: "code-reviewer",
    autoExecute: false
  },
  // Test Generation Intent
  {
    id: "intent:generate-tests",
    name: { "en": "Generate Tests", "zh-CN": "\u751F\u6210\u6D4B\u8BD5" },
    patterns: [
      "\u5199.*\u6D4B\u8BD5",
      "\u751F\u6210.*\u6D4B\u8BD5",
      "write.*test",
      "generate.*test",
      "create.*test",
      "\u6DFB\u52A0.*\u6D4B\u8BD5"
    ],
    keywords: ["test", "\u6D4B\u8BD5", "spec", "jest", "vitest"],
    contextSignals: ["has_package_json", "has_tests"],
    priority: 80,
    pluginId: "test-generator",
    autoExecute: false
  },
  // Documentation Intent
  {
    id: "intent:generate-docs",
    name: { "en": "Generate Documentation", "zh-CN": "\u751F\u6210\u6587\u6863" },
    patterns: [
      "\u5199.*\u6587\u6863",
      "\u751F\u6210.*\u6587\u6863",
      "write.*doc",
      "generate.*doc",
      "\u6DFB\u52A0.*\u6CE8\u91CA",
      "add.*comment"
    ],
    keywords: ["doc", "\u6587\u6863", "readme", "comment", "\u6CE8\u91CA"],
    contextSignals: ["in_src_directory"],
    priority: 75,
    pluginId: "doc-generator",
    autoExecute: false
  },
  // Deploy Intent
  {
    id: "intent:deploy",
    name: { "en": "Deploy", "zh-CN": "\u90E8\u7F72" },
    patterns: [
      "\u90E8\u7F72.*\u9879\u76EE",
      "\u90E8\u7F72.*\u5E94\u7528",
      "deploy.*project",
      "deploy.*app",
      "\u53D1\u5E03.*\u7EBF\u4E0A"
    ],
    keywords: ["deploy", "\u90E8\u7F72", "publish", "\u53D1\u5E03", "release"],
    contextSignals: ["has_package_json", "git_has_remote"],
    priority: 70,
    pluginId: "vercel-deploy",
    autoExecute: false
  },
  // Docker Intent
  {
    id: "intent:docker",
    name: { "en": "Docker Operations", "zh-CN": "Docker \u64CD\u4F5C" },
    patterns: [
      "\u521B\u5EFA.*dockerfile",
      "\u751F\u6210.*docker",
      "create.*dockerfile",
      "generate.*docker",
      "\u5BB9\u5668\u5316"
    ],
    keywords: ["docker", "container", "\u5BB9\u5668", "dockerfile"],
    contextSignals: ["has_package_json"],
    filePatterns: ["Dockerfile", "docker-compose.yml"],
    priority: 65,
    pluginId: "docker-helper",
    autoExecute: false
  },
  // Refactor Intent
  {
    id: "intent:refactor",
    name: { "en": "Refactor Code", "zh-CN": "\u91CD\u6784\u4EE3\u7801" },
    patterns: [
      "\u91CD\u6784.*\u4EE3\u7801",
      "\u4F18\u5316.*\u4EE3\u7801",
      "refactor.*code",
      "optimize.*code",
      "\u7B80\u5316.*\u4EE3\u7801",
      "simplify.*code"
    ],
    keywords: ["refactor", "\u91CD\u6784", "optimize", "\u4F18\u5316", "simplify", "\u7B80\u5316"],
    contextSignals: ["in_src_directory"],
    priority: 60,
    pluginId: "code-simplifier",
    autoExecute: false
  }
];
let engineInstance = null;
function getIntentEngine() {
  if (!engineInstance) {
    engineInstance = new IntentEngine();
    engineInstance.registerRules(DEFAULT_INTENT_RULES);
  }
  return engineInstance;
}

const DEFAULT_TIMEOUT = 3e4;
const MAX_TIMEOUT = 3e5;
const MAX_OUTPUT_SIZE = 1024 * 1024;
const SCRIPT_INTERPRETERS = {
  bash: ["bash", "-e"],
  node: ["node"],
  python: ["python3", "-u"],
  deno: ["deno", "run", "--allow-all"],
  bun: ["bun", "run"]
};
const SCRIPT_EXTENSIONS = {
  bash: [".sh", ".bash"],
  node: [".js", ".mjs", ".cjs"],
  python: [".py"],
  deno: [".ts", ".js"],
  bun: [".ts", ".js"]
};
class ScriptRunner {
  grantedPermissions = /* @__PURE__ */ new Set();
  runningProcesses = /* @__PURE__ */ new Map();
  constructor() {
    this.grantedPermissions.add("file:read");
    this.grantedPermissions.add("git:read");
    this.grantedPermissions.add("env:read");
  }
  // ==========================================================================
  // Permission Management
  // ==========================================================================
  /**
   * Grant a permission
   */
  grantPermission(permission) {
    this.grantedPermissions.add(permission);
  }
  /**
   * Grant multiple permissions
   */
  grantPermissions(permissions) {
    for (const p of permissions) {
      this.grantedPermissions.add(p);
    }
  }
  /**
   * Revoke a permission
   */
  revokePermission(permission) {
    this.grantedPermissions.delete(permission);
  }
  /**
   * Check if permission is granted
   */
  hasPermission(permission) {
    return this.grantedPermissions.has(permission);
  }
  /**
   * Check if all required permissions are granted
   */
  hasAllPermissions(permissions) {
    return permissions.every((p) => this.grantedPermissions.has(p));
  }
  /**
   * Get missing permissions
   */
  getMissingPermissions(required) {
    return required.filter((p) => !this.grantedPermissions.has(p));
  }
  // ==========================================================================
  // Script Execution
  // ==========================================================================
  /**
   * Execute a script
   *
   * @param script - Script definition
   * @param pluginPath - Path to the plugin directory
   * @param options - Execution options
   * @returns Script execution result
   */
  async execute(script, pluginPath, options = {}) {
    const startTime = Date.now();
    const missingPermissions = this.getMissingPermissions(script.permissions);
    if (missingPermissions.length > 0) {
      return {
        success: false,
        exitCode: -1,
        stdout: "",
        stderr: `Permission denied. Missing permissions: ${missingPermissions.join(", ")}`,
        duration: 0
      };
    }
    const scriptPath = join(pluginPath, script.path);
    if (!existsSync(scriptPath)) {
      return {
        success: false,
        exitCode: -1,
        stdout: "",
        stderr: `Script not found: ${scriptPath}`,
        duration: 0
      };
    }
    const interpreter = this.getInterpreter(script.type);
    if (!interpreter) {
      return {
        success: false,
        exitCode: -1,
        stdout: "",
        stderr: `Unsupported script type: ${script.type}`,
        duration: 0
      };
    }
    const args = [...interpreter.slice(1), scriptPath, ...options.args ?? script.defaultArgs ?? []];
    const command = interpreter[0];
    const env = this.buildEnvironment(script, options);
    const cwd = options.cwd ?? dirname(scriptPath);
    const timeout = Math.min(options.timeout ?? script.timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT);
    try {
      const result = await this.spawn(command, args, {
        cwd,
        env,
        timeout,
        stdin: options.stdin,
        captureOutput: options.captureOutput ?? true,
        background: options.background,
        scriptId: `${script.name}-${Date.now()}`
      });
      return {
        ...result,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        exitCode: -1,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }
  /**
   * Execute a script from raw content
   */
  async executeRaw(content, type, options = {}) {
    const startTime = Date.now();
    if (!this.hasPermission("shell:execute")) {
      return {
        success: false,
        exitCode: -1,
        stdout: "",
        stderr: "Permission denied. shell:execute permission required for raw script execution.",
        duration: 0
      };
    }
    const interpreter = this.getInterpreter(type);
    if (!interpreter) {
      return {
        success: false,
        exitCode: -1,
        stdout: "",
        stderr: `Unsupported script type: ${type}`,
        duration: 0
      };
    }
    if (type === "bash") {
      const args = ["-c", content, ...options.args ?? []];
      const timeout = Math.min(options.timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT);
      try {
        const result = await this.spawn("bash", args, {
          cwd: options.cwd,
          env: { ...process.env, ...options.env },
          timeout,
          stdin: options.stdin,
          captureOutput: options.captureOutput ?? true
        });
        return {
          ...result,
          duration: Date.now() - startTime
        };
      } catch (error) {
        return {
          success: false,
          exitCode: -1,
          stdout: "",
          stderr: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime
        };
      }
    }
    const tempPath = join(tmpdir(), `ccjk-script-${Date.now()}${SCRIPT_EXTENSIONS[type][0]}`);
    const { writeFileSync, unlinkSync } = await import('node:fs');
    try {
      writeFileSync(tempPath, content, "utf-8");
      const args = [...interpreter.slice(1), tempPath, ...options.args ?? []];
      const timeout = Math.min(options.timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT);
      const result = await this.spawn(interpreter[0], args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        timeout,
        stdin: options.stdin,
        captureOutput: options.captureOutput ?? true
      });
      return {
        ...result,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        exitCode: -1,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    } finally {
      try {
        unlinkSync(tempPath);
      } catch {
      }
    }
  }
  /**
   * Execute inline bash command
   */
  async bash(command, options = {}) {
    return this.executeRaw(command, "bash", options);
  }
  // ==========================================================================
  // Process Management
  // ==========================================================================
  /**
   * Kill a running script
   */
  kill(scriptId) {
    const process2 = this.runningProcesses.get(scriptId);
    if (process2) {
      process2.kill();
      this.runningProcesses.delete(scriptId);
      return true;
    }
    return false;
  }
  /**
   * Kill all running scripts
   */
  killAll() {
    for (const [id, process2] of this.runningProcesses) {
      process2.kill();
      this.runningProcesses.delete(id);
    }
  }
  /**
   * Get running script IDs
   */
  getRunningScripts() {
    return Array.from(this.runningProcesses.keys());
  }
  // ==========================================================================
  // Private Helpers
  // ==========================================================================
  /**
   * Get interpreter for script type
   */
  getInterpreter(type) {
    return SCRIPT_INTERPRETERS[type] ?? null;
  }
  /**
   * Build environment variables
   */
  buildEnvironment(script, options) {
    const env = {};
    if (this.hasPermission("env:read")) {
      const safeVars = ["PATH", "HOME", "USER", "SHELL", "LANG", "LC_ALL", "TERM", "NODE_ENV"];
      for (const key of safeVars) {
        if (process.env[key]) {
          env[key] = process.env[key];
        }
      }
    }
    if (script.env) {
      Object.assign(env, script.env);
    }
    if (options.env) {
      Object.assign(env, options.env);
    }
    env.CCJK_PLUGIN = "true";
    env.CCJK_VERSION = "2.0";
    return env;
  }
  /**
   * Spawn a process
   */
  spawn(command, args, options) {
    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      let killed = false;
      const proc = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: options.captureOutput ? ["pipe", "pipe", "pipe"] : "inherit",
        shell: false
      });
      if (options.scriptId) {
        this.runningProcesses.set(options.scriptId, {
          pid: proc.pid,
          kill: () => {
            killed = true;
            proc.kill("SIGTERM");
          }
        });
      }
      let timeoutId;
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          killed = true;
          proc.kill("SIGTERM");
          setTimeout(() => {
            if (!proc.killed) {
              proc.kill("SIGKILL");
            }
          }, 1e3);
        }, options.timeout);
      }
      if (options.stdin && proc.stdin) {
        proc.stdin.write(options.stdin);
        proc.stdin.end();
      }
      if (options.captureOutput) {
        proc.stdout?.on("data", (data) => {
          const chunk = data.toString();
          if (stdout.length + chunk.length <= MAX_OUTPUT_SIZE) {
            stdout += chunk;
          }
        });
        proc.stderr?.on("data", (data) => {
          const chunk = data.toString();
          if (stderr.length + chunk.length <= MAX_OUTPUT_SIZE) {
            stderr += chunk;
          }
        });
      }
      proc.on("close", (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (options.scriptId) {
          this.runningProcesses.delete(options.scriptId);
        }
        if (killed && code !== 0) {
          resolve({
            success: false,
            exitCode: code ?? -1,
            stdout,
            stderr: stderr || "Script was killed (timeout or manual)"
          });
        } else {
          resolve({
            success: code === 0,
            exitCode: code ?? 0,
            stdout,
            stderr
          });
        }
      });
      proc.on("error", (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (options.scriptId) {
          this.runningProcesses.delete(options.scriptId);
        }
        reject(error);
      });
      if (options.background) {
        resolve({
          success: true,
          exitCode: 0,
          stdout: `Background process started with PID: ${proc.pid}`,
          stderr: ""
        });
      }
    });
  }
}
let runnerInstance = null;
function getScriptRunner() {
  if (!runnerInstance) {
    runnerInstance = new ScriptRunner();
  }
  return runnerInstance;
}

const PRIORITY_KEYWORDS = {
  critical: "critical",
  CRITICAL: "critical",
  \u5173\u952E: "critical",
  high: "high",
  HIGH: "high",
  \u9AD8: "high",
  medium: "medium",
  MEDIUM: "medium",
  \u4E2D: "medium",
  low: "low",
  LOW: "low",
  \u4F4E: "low"
};
class SkillParser {
  /**
   * Parse a SKILL.md file
   *
   * @param filePath - Path to SKILL.md file
   * @returns Parsed skill document
   */
  parse(filePath) {
    const content = readFileSync(filePath, "utf-8");
    return this.parseContent(content, dirname(filePath));
  }
  /**
   * Parse SKILL.md content
   *
   * @param content - Raw markdown content
   * @param basePath - Base path for resolving references
   * @returns Parsed skill document
   */
  parseContent(content, basePath) {
    const lines = content.split("\n");
    const title = this.extractTitle(lines);
    const description = this.extractDescription(lines);
    const applicability = this.extractApplicability(content);
    const sections = this.extractSections(content);
    const rules = this.extractRules(content, basePath);
    const examples = this.extractExamples(content);
    return {
      title,
      description,
      applicability,
      sections,
      rules,
      examples,
      rawContent: content
    };
  }
  /**
   * Parse a skill directory (SKILL.md + references/)
   *
   * @param dirPath - Path to skill directory
   * @returns Parsed skill document with references
   */
  parseDirectory(dirPath) {
    const skillPath = join(dirPath, "SKILL.md");
    if (!existsSync(skillPath)) {
      throw new Error(`SKILL.md not found in ${dirPath}`);
    }
    const skill = this.parse(skillPath);
    const references = this.loadReferences(dirPath);
    return {
      ...skill,
      references
    };
  }
  // ==========================================================================
  // Extraction Methods
  // ==========================================================================
  /**
   * Extract title from markdown
   */
  extractTitle(lines) {
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/);
      if (match) {
        return match[1].trim();
      }
    }
    return "Untitled Skill";
  }
  /**
   * Extract description from markdown
   */
  extractDescription(lines) {
    let inDescription = false;
    const descLines = [];
    for (const line of lines) {
      if (line.match(/^#\s+/)) {
        inDescription = true;
        continue;
      }
      if (line.match(/^##\s+/)) {
        break;
      }
      if (inDescription && line.trim()) {
        descLines.push(line);
      }
    }
    return descLines.join("\n").trim();
  }
  /**
   * Extract applicability section
   */
  extractApplicability(content) {
    const applicability = {
      taskTypes: [],
      fileTypes: [],
      contexts: []
    };
    const applicabilityMatch = content.match(
      /##\s*(?:When to Apply|Applicability|适用场景|何时使用)[^\n]*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    if (applicabilityMatch) {
      const section = applicabilityMatch[1];
      const taskMatches = section.matchAll(/[-*]\s*(.+)/g);
      for (const match of taskMatches) {
        const task = match[1].trim();
        if (task) {
          applicability.taskTypes.push(task);
        }
      }
    }
    const fileTypeMatch = content.match(
      /(?:file types?|文件类型)[:\s]*([^\n]+)/i
    );
    if (fileTypeMatch) {
      applicability.fileTypes = fileTypeMatch[1].split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    }
    return applicability;
  }
  /**
   * Extract sections from markdown
   */
  extractSections(content) {
    const sections = [];
    const lines = content.split("\n");
    let currentSection = null;
    let currentContent = [];
    let currentSubsections = [];
    for (const line of lines) {
      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        if (currentSection) {
          currentSection.content = currentContent.join("\n").trim();
          currentSection.subsections = currentSubsections.length > 0 ? currentSubsections : void 0;
          sections.push(currentSection);
        }
        currentSection = {
          title: h2Match[1].trim(),
          content: "",
          priority: this.detectPriority(h2Match[1])
        };
        currentContent = [];
        currentSubsections = [];
        continue;
      }
      const h3Match = line.match(/^###\s+(.+)$/);
      if (h3Match && currentSection) {
        currentSubsections.push({
          title: h3Match[1].trim(),
          content: "",
          // Will be filled by subsequent lines
          priority: this.detectPriority(h3Match[1])
        });
        continue;
      }
      if (currentSection) {
        currentContent.push(line);
      }
    }
    if (currentSection) {
      currentSection.content = currentContent.join("\n").trim();
      currentSection.subsections = currentSubsections.length > 0 ? currentSubsections : void 0;
      sections.push(currentSection);
    }
    return sections;
  }
  /**
   * Extract rules from markdown
   */
  extractRules(content, basePath) {
    const rules = [];
    const rulePattern = /###?\s*(?:`([a-z]+-\d+)`|(\w+-\d+))[:\s]*(.+?)(?=\n###?|\n##|$)/gs;
    let match;
    while ((match = rulePattern.exec(content)) !== null) {
      const id = match[1] || match[2];
      const titleAndContent = match[3];
      const titleMatch = titleAndContent.match(/^[:\s]*(.+)(?:\n|$)/);
      const title = titleMatch ? titleMatch[1].trim() : id;
      const category = id.split("-")[0];
      const priority = this.detectPriority(titleAndContent);
      const description = titleAndContent.replace(/^[:\s]*(.+)(?:\n|$)/, "").trim();
      let referencePath;
      if (basePath) {
        const refPath = join(basePath, "references", "rules", `${id}.md`);
        if (existsSync(refPath)) {
          referencePath = refPath;
        }
      }
      rules.push({
        id,
        title,
        category,
        priority,
        description,
        referencePath
      });
    }
    const numberedPattern = /(?:^|\n)(\d+)\.\s+\*\*(.+?)\*\*[:\s]*(.+?)(?=\n\d+\.|\n##|$)/gs;
    while ((match = numberedPattern.exec(content)) !== null) {
      const num = match[1];
      const title = match[2].trim();
      const description = match[3].trim();
      const id = `rule-${num.padStart(3, "0")}`;
      rules.push({
        id,
        title,
        category: "general",
        priority: this.detectPriority(description),
        description
      });
    }
    return rules;
  }
  /**
   * Extract code examples from markdown
   */
  extractExamples(content) {
    const examples = [];
    const examplePattern = /###?\s*(?:Example|示例|案例)[:\s]*(.+?)(?=\n###?|\n##|$)/gis;
    let match;
    while ((match = examplePattern.exec(content)) !== null) {
      const exampleContent = match[1];
      const inputMatch = exampleContent.match(/(?:Input|输入)[:\s]*(.+?)(?=Output|输出|$)/is);
      const outputMatch = exampleContent.match(/(?:Output|输出)[:\s]*(.+)$/is);
      if (inputMatch || outputMatch) {
        examples.push({
          title: "Example",
          input: inputMatch ? inputMatch[1].trim() : "",
          output: outputMatch ? outputMatch[1].trim() : ""
        });
      }
    }
    return examples;
  }
  /**
   * Extract code blocks from content
   */
  extractCodeBlocks(content) {
    const blocks = [];
    const codePattern = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = codePattern.exec(content)) !== null) {
      blocks.push({
        language: match[1] || "text",
        code: match[2].trim()
      });
    }
    return blocks;
  }
  /**
   * Load reference documents from references/ directory
   */
  loadReferences(dirPath) {
    const references = [];
    const refsPath = join(dirPath, "references");
    if (!existsSync(refsPath)) {
      return references;
    }
    const loadDir = (dir, prefix = "") => {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          loadDir(fullPath, `${prefix}${entry.name}/`);
        } else if (entry.name.endsWith(".md")) {
          const content = readFileSync(fullPath, "utf-8");
          const title = this.extractTitle(content.split("\n")) || basename(entry.name, ".md");
          references.push({
            path: `${prefix}${entry.name}`,
            title,
            content
          });
        }
      }
    };
    loadDir(refsPath);
    return references;
  }
  /**
   * Detect priority from text
   */
  detectPriority(text) {
    const lowerText = text.toLowerCase();
    for (const [keyword, priority] of Object.entries(PRIORITY_KEYWORDS)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return priority;
      }
    }
    return "medium";
  }
}
let parserInstance = null;
function getSkillParser() {
  if (!parserInstance) {
    parserInstance = new SkillParser();
  }
  return parserInstance;
}

const PLUGINS_DIR = join(homedir(), ".ccjk", "plugins");
const SKILLS_DIR = join(homedir(), ".ccjk", "skills");
const AGENTS_DIR = join(homedir(), ".ccjk", "agents");
const CONFIG_FILE = join(homedir(), ".ccjk", "plugins.json");
class PluginManager {
  plugins = /* @__PURE__ */ new Map();
  agents = /* @__PURE__ */ new Map();
  eventHandlers = /* @__PURE__ */ new Set();
  initialized = false;
  constructor() {
    this.ensureDirectories();
  }
  // ==========================================================================
  // Initialization
  // ==========================================================================
  /**
   * Initialize the plugin manager
   */
  async initialize() {
    if (this.initialized)
      return;
    await this.loadInstalledPlugins();
    await this.loadInstalledAgents();
    this.registerAllIntents();
    this.initialized = true;
  }
  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    for (const dir of [PLUGINS_DIR, SKILLS_DIR, AGENTS_DIR]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }
  // ==========================================================================
  // Plugin Installation
  // ==========================================================================
  /**
   * Install a plugin from various sources
   *
   * @param source - Plugin source (cloud, github, local, npm)
   * @param options - Installation options
   */
  async install(source, options = {}) {
    const resolvedSource = typeof source === "string" ? this.resolveSource(source) : source;
    try {
      let result;
      switch (resolvedSource.type) {
        case "cloud":
          result = await this.installFromCloud(resolvedSource.url, options);
          break;
        case "github":
          result = await this.installFromGitHub(resolvedSource.repo, resolvedSource.ref, options);
          break;
        case "local":
          result = await this.installFromLocal(resolvedSource.path, options);
          break;
        case "npm":
          result = await this.installFromNpm(resolvedSource.package, options);
          break;
        default:
          return { success: false, pluginId: "", error: "Unknown source type" };
      }
      if (result.success) {
        this.emit({ type: "plugin:installed", pluginId: result.pluginId, version: result.version });
      }
      return result;
    } catch (error) {
      return {
        success: false,
        pluginId: "",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Install from GitHub (supports Vercel Agent Skills format)
   */
  async installFromGitHub(repo, ref, options = {}) {
    const parts = repo.split("/");
    if (parts.length < 2) {
      return { success: false, pluginId: "", error: "Invalid GitHub repo format" };
    }
    const owner = parts[0];
    const repoName = parts[1];
    const subPath = parts.slice(2).join("/");
    const targetDir = join(SKILLS_DIR, `${owner}-${repoName}${subPath ? `-${subPath.replace(/\//g, "-")}` : ""}`);
    if (existsSync(targetDir)) {
      if (options.force) {
        rmSync(targetDir, { recursive: true });
      } else {
        return { success: false, pluginId: "", error: "Plugin already installed. Use --force to reinstall." };
      }
    }
    try {
      const cloneUrl = `https://github.com/${owner}/${repoName}.git`;
      await x("git", ["clone", "--depth", "1", ...ref ? ["--branch", ref] : [], cloneUrl, targetDir]);
      if (subPath) {
        const subDir = join(targetDir, subPath);
        if (!existsSync(subDir)) {
          rmSync(targetDir, { recursive: true });
          return { success: false, pluginId: "", error: `Path ${subPath} not found in repo` };
        }
        const tempDir = `${targetDir}-temp`;
        await x("mv", [subDir, tempDir]);
        rmSync(targetDir, { recursive: true });
        await x("mv", [tempDir, targetDir]);
      }
      const plugin = await this.loadPluginFromDirectory(targetDir);
      if (!plugin) {
        rmSync(targetDir, { recursive: true });
        return { success: false, pluginId: "", error: "Invalid plugin format" };
      }
      this.plugins.set(plugin.manifest.id, plugin);
      this.registerPluginIntents(plugin);
      this.saveConfig();
      return {
        success: true,
        pluginId: plugin.manifest.id,
        version: plugin.manifest.version,
        path: targetDir
      };
    } catch (error) {
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true });
      }
      return {
        success: false,
        pluginId: "",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Install from local directory
   */
  async installFromLocal(path, options = {}) {
    if (!existsSync(path)) {
      return { success: false, pluginId: "", error: `Path not found: ${path}` };
    }
    const plugin = await this.loadPluginFromDirectory(path);
    if (!plugin) {
      return { success: false, pluginId: "", error: "Invalid plugin format" };
    }
    const targetDir = join(PLUGINS_DIR, plugin.manifest.id);
    if (existsSync(targetDir) && !options.force) {
      return { success: false, pluginId: "", error: "Plugin already installed. Use --force to reinstall." };
    }
    await x("cp", ["-r", path, targetDir]);
    this.plugins.set(plugin.manifest.id, { ...plugin, source: { type: "local", path: targetDir } });
    this.registerPluginIntents(plugin);
    this.saveConfig();
    return {
      success: true,
      pluginId: plugin.manifest.id,
      version: plugin.manifest.version,
      path: targetDir
    };
  }
  /**
   * Install from cloud registry
   */
  async installFromCloud(url, options = {}) {
    return { success: false, pluginId: "", error: "Cloud installation not yet implemented in v2" };
  }
  /**
   * Install from NPM
   */
  async installFromNpm(packageName, options = {}) {
    const targetDir = join(PLUGINS_DIR, packageName.replace(/\//g, "-"));
    try {
      await x("npm", ["pack", packageName, "--pack-destination", targetDir]);
      return { success: false, pluginId: "", error: "NPM installation not yet fully implemented" };
    } catch (error) {
      return {
        success: false,
        pluginId: "",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Resolve source string to PluginSource
   */
  resolveSource(source) {
    if (source.startsWith("github:") || source.match(/^[\w-]+\/[\w-]+/)) {
      const repo = source.replace("github:", "");
      return { type: "github", repo };
    }
    if (source.startsWith("npm:") || source.startsWith("@")) {
      const pkg = source.replace("npm:", "");
      return { type: "npm", package: pkg };
    }
    if (source.startsWith("/") || source.startsWith("./") || source.startsWith("~")) {
      const path = source.startsWith("~") ? source.replace("~", homedir()) : source;
      return { type: "local", path };
    }
    return { type: "cloud", url: source };
  }
  // ==========================================================================
  // Plugin Loading
  // ==========================================================================
  /**
   * Load plugin from directory
   */
  async loadPluginFromDirectory(dirPath) {
    const parser = getSkillParser();
    const manifestPath = join(dirPath, "plugin.json");
    const skillPath = join(dirPath, "SKILL.md");
    let manifest;
    if (existsSync(manifestPath)) {
      manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } else if (existsSync(skillPath)) {
      const skill2 = parser.parse(skillPath);
      manifest = this.generateManifestFromSkill(skill2, dirPath);
    } else {
      return null;
    }
    const skill = existsSync(skillPath) ? parser.parse(skillPath) : void 0;
    const scripts = this.loadScripts(dirPath);
    const intents = this.loadIntents(dirPath, manifest.id);
    return {
      manifest,
      skill,
      scripts,
      intents,
      source: { type: "local", path: dirPath }
    };
  }
  /**
   * Generate manifest from SKILL.md
   */
  generateManifestFromSkill(skill, dirPath) {
    const dirName = dirPath.split("/").pop() || "unknown";
    return {
      id: dirName,
      name: { "en": skill.title, "zh-CN": skill.title },
      description: { "en": skill.description, "zh-CN": skill.description },
      version: "1.0.0",
      author: { name: "Unknown" },
      category: "other",
      tags: [],
      permissions: ["file:read"],
      formatVersion: "2.0"
    };
  }
  /**
   * Load scripts from directory
   */
  loadScripts(dirPath) {
    const scripts = [];
    const scriptsDir = join(dirPath, "scripts");
    if (!existsSync(scriptsDir))
      return scripts;
    const entries = readdirSync(scriptsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = entry.name.substring(entry.name.lastIndexOf("."));
        let type = null;
        if ([".sh", ".bash"].includes(ext))
          type = "bash";
        else if ([".js", ".mjs"].includes(ext))
          type = "node";
        else if (ext === ".py")
          type = "python";
        if (type) {
          scripts.push({
            name: entry.name.replace(/\.[^.]+$/, ""),
            path: `scripts/${entry.name}`,
            type,
            permissions: ["shell:execute"]
          });
        }
      }
    }
    return scripts;
  }
  /**
   * Load intents from directory
   */
  loadIntents(dirPath, pluginId) {
    const intentsPath = join(dirPath, "intents", "intents.yaml");
    if (!existsSync(intentsPath))
      return void 0;
    return void 0;
  }
  /**
   * Load all installed plugins
   */
  async loadInstalledPlugins() {
    if (existsSync(PLUGINS_DIR)) {
      const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const plugin = await this.loadPluginFromDirectory(join(PLUGINS_DIR, entry.name));
          if (plugin) {
            this.plugins.set(plugin.manifest.id, plugin);
          }
        }
      }
    }
    if (existsSync(SKILLS_DIR)) {
      const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const plugin = await this.loadPluginFromDirectory(join(SKILLS_DIR, entry.name));
          if (plugin) {
            this.plugins.set(plugin.manifest.id, plugin);
          }
        }
      }
    }
  }
  // ==========================================================================
  // Intent Management
  // ==========================================================================
  /**
   * Register intents from all plugins
   */
  registerAllIntents() {
    const engine = getIntentEngine();
    for (const plugin of this.plugins.values()) {
      if (plugin.intents) {
        engine.registerRules(plugin.intents);
      }
    }
  }
  /**
   * Register intents from a single plugin
   */
  registerPluginIntents(plugin) {
    if (plugin.intents) {
      const engine = getIntentEngine();
      engine.registerRules(plugin.intents);
    }
  }
  /**
   * Detect intent and get matching plugins
   */
  async detectIntent(userInput, cwd) {
    const engine = getIntentEngine();
    return engine.detect(userInput, cwd);
  }
  /**
   * Execute based on detected intent
   */
  async executeIntent(match, cwd) {
    const plugin = this.plugins.get(match.pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${match.pluginId}`);
    }
    this.emit({ type: "plugin:activated", pluginId: match.pluginId, trigger: "intent" });
    if (plugin.scripts && plugin.scripts.length > 0) {
      const mainScript = plugin.scripts.find((s) => s.name === "main") || plugin.scripts[0];
      const runner = getScriptRunner();
      const pluginPath = plugin.source.type === "local" ? plugin.source.path : "";
      const result = await runner.execute(mainScript, pluginPath, { cwd });
      this.emit({ type: "intent:executed", match, result });
      return result;
    }
    if (plugin.skill) {
      this.emit({ type: "intent:executed", match, result: plugin.skill });
      return plugin.skill;
    }
    return null;
  }
  // ==========================================================================
  // Agent Management
  // ==========================================================================
  /**
   * Create an agent from skills and MCP servers
   */
  async createAgent(definition) {
    for (const skillRef of definition.skills) {
      if (!this.plugins.has(skillRef.pluginId)) {
        throw new Error(`Skill not found: ${skillRef.pluginId}`);
      }
    }
    const agentPath = join(AGENTS_DIR, `${definition.id}.json`);
    writeFileSync(agentPath, JSON.stringify(definition, null, 2));
    this.agents.set(definition.id, definition);
    this.emit({ type: "agent:created", agentId: definition.id });
  }
  /**
   * Get an agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }
  /**
   * List all agents
   */
  listAgents() {
    return Array.from(this.agents.values());
  }
  /**
   * Load installed agents
   */
  async loadInstalledAgents() {
    if (!existsSync(AGENTS_DIR))
      return;
    const entries = readdirSync(AGENTS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".json")) {
        const content = readFileSync(join(AGENTS_DIR, entry.name), "utf-8");
        const agent = JSON.parse(content);
        this.agents.set(agent.id, agent);
      }
    }
  }
  // ==========================================================================
  // Plugin Management
  // ==========================================================================
  /**
   * Uninstall a plugin
   */
  async uninstall(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin)
      return false;
    if (plugin.source.type === "local") {
      rmSync(plugin.source.path, { recursive: true });
    }
    const engine = getIntentEngine();
    engine.unregisterPluginRules(pluginId);
    this.plugins.delete(pluginId);
    this.saveConfig();
    this.emit({ type: "plugin:uninstalled", pluginId });
    return true;
  }
  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }
  /**
   * List all installed plugins
   */
  listPlugins() {
    return Array.from(this.plugins.values());
  }
  /**
   * Check for updates
   */
  async checkUpdates() {
    return [];
  }
  // ==========================================================================
  // Script Execution
  // ==========================================================================
  /**
   * Execute a plugin script
   */
  async executeScript(pluginId, scriptName, options = {}) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    const script = plugin.scripts?.find((s) => s.name === scriptName);
    if (!script) {
      throw new Error(`Script not found: ${scriptName}`);
    }
    const runner = getScriptRunner();
    const pluginPath = plugin.source.type === "local" ? plugin.source.path : "";
    this.emit({ type: "script:started", pluginId, scriptName });
    const result = await runner.execute(script, pluginPath, options);
    this.emit({ type: "script:completed", pluginId, scriptName, result });
    return result;
  }
  /**
   * Grant permission to script runner
   */
  grantPermission(permission) {
    const runner = getScriptRunner();
    runner.grantPermission(permission);
  }
  // ==========================================================================
  // Event System
  // ==========================================================================
  /**
   * Subscribe to plugin events
   */
  on(handler) {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  /**
   * Emit an event
   */
  emit(event) {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("Event handler error:", error);
      }
    }
  }
  // ==========================================================================
  // Configuration
  // ==========================================================================
  /**
   * Save configuration
   */
  saveConfig() {
    const config = {
      plugins: Array.from(this.plugins.entries()).map(([id, p]) => ({
        id,
        source: p.source,
        version: p.manifest.version
      })),
      agents: Array.from(this.agents.keys())
    };
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }
}
let managerInstance = null;
async function getPluginManager() {
  if (!managerInstance) {
    managerInstance = new PluginManager();
    await managerInstance.initialize();
  }
  return managerInstance;
}

export { getPluginManager as g };
