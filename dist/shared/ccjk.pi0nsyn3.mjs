import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'pathe';

class WildcardPatternMatcher {
  patternCache = /* @__PURE__ */ new Map();
  maxCacheSize;
  cacheHits = 0;
  cacheMisses = 0;
  constructor(maxCacheSize = 1e3) {
    this.maxCacheSize = maxCacheSize;
  }
  /**
   * Compile a pattern to a regex and cache it
   */
  compilePattern(pattern) {
    const cached = this.patternCache.get(pattern);
    if (cached) {
      this.cacheHits++;
      return cached;
    }
    this.cacheMisses++;
    const compiled = this.analyzeAndCompile(pattern);
    if (this.patternCache.size >= this.maxCacheSize) {
      const firstKey = this.patternCache.keys().next().value;
      if (firstKey) {
        this.patternCache.delete(firstKey);
      }
    }
    this.patternCache.set(pattern, compiled);
    return compiled;
  }
  /**
   * Test if a target matches a pattern
   */
  match(pattern, target) {
    const compiled = this.compilePattern(pattern);
    return compiled.regex.test(target);
  }
  /**
   * Test if a target matches any of the given patterns
   */
  matchAny(patterns, target) {
    for (const pattern of patterns) {
      if (this.match(pattern, target)) {
        return { matched: true, pattern };
      }
    }
    return { matched: false };
  }
  /**
   * Get all patterns that match a target
   */
  getAllMatches(patterns, target) {
    return patterns.filter((pattern) => this.match(pattern, target));
  }
  /**
   * Clear the pattern cache
   */
  clearCache() {
    this.patternCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    return {
      size: this.patternCache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0
    };
  }
  /**
   * Analyze pattern type and compile to regex
   */
  analyzeAndCompile(pattern) {
    const wildcardPositions = [];
    let specificity = 0;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === "*" || pattern[i] === "?") {
        wildcardPositions.push(i);
      }
    }
    let type;
    const hasWildcards = wildcardPositions.length > 0;
    const hasDoubleWildcard = pattern.includes("**");
    if (!hasWildcards) {
      type = "exact" /* Exact */;
      specificity = 100;
    } else if (pattern.startsWith("mcp__") && pattern.includes("__*")) {
      type = "mcp" /* Mcp */;
      specificity = this.calculateMcpSpecificity(pattern);
    } else if (pattern.startsWith("Bash(") && pattern.includes(" ")) {
      type = "bash" /* Bash */;
      specificity = this.calculateBashSpecificity(pattern);
    } else if (hasDoubleWildcard) {
      type = "nested" /* Nested */;
      specificity = this.calculateNestedSpecificity(pattern, wildcardPositions);
    } else if (wildcardPositions.length === 1 && pattern.endsWith("*")) {
      type = "prefix" /* Prefix */;
      specificity = this.calculatePrefixSpecificity(pattern);
    } else if (wildcardPositions.length === 1 && pattern.startsWith("*")) {
      type = "suffix" /* Suffix */;
      specificity = this.calculateSuffixSpecificity(pattern);
    } else if (wildcardPositions.length > 1) {
      type = "complex" /* Complex */;
      specificity = this.calculateComplexSpecificity(pattern, wildcardPositions);
    } else {
      type = "middle" /* Middle */;
      specificity = this.calculateMiddleSpecificity(pattern, wildcardPositions[0]);
    }
    const regex = this.patternToRegex(pattern, type);
    const hash = this.generateHash(pattern);
    return {
      original: pattern,
      regex,
      type,
      wildcardPositions,
      specificity,
      hash
    };
  }
  /**
   * Convert pattern to regex based on type
   */
  patternToRegex(pattern, type) {
    let regexStr;
    switch (type) {
      case "mcp" /* Mcp */: {
        regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/__/g, "_{2}").replace(/\*/g, "[^_]*");
        break;
      }
      case "bash" /* Bash */: {
        regexStr = `^${this.escapeRegex(pattern).replace(/\*/g, ".*").replace(/\s+/g, "\\s+")}$`;
        break;
      }
      case "nested" /* Nested */: {
        regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
        if (pattern.endsWith("**")) {
          regexStr = `${pattern.slice(0, -2).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")}.*`;
        } else {
          regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
        }
        break;
      }
      default: {
        regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
        break;
      }
    }
    return new RegExp(`^${regexStr}$`, "i");
  }
  /**
   * Calculate specificity for MCP patterns
   */
  calculateMcpSpecificity(pattern) {
    const parts = pattern.split("__").length;
    if (pattern.endsWith("*")) {
      return 30 + parts * 10;
    }
    return 40 + parts * 15;
  }
  /**
   * Calculate specificity for Bash patterns
   */
  calculateBashSpecificity(pattern) {
    const match = pattern.match(/^Bash\((.*)\)$/);
    if (!match)
      return 20;
    const inner = match[1];
    if (!inner.includes("*")) {
      return 90;
    }
    const segments = inner.split(" ");
    let specificity = 30;
    for (const seg of segments) {
      if (seg && seg !== "*") {
        specificity += 15;
      } else if (seg === "*") {
        specificity += 5;
      }
    }
    return specificity;
  }
  /**
   * Calculate specificity for prefix patterns
   */
  calculatePrefixSpecificity(pattern) {
    const baseLen = pattern.length - 1;
    return Math.min(50 + baseLen, 80);
  }
  /**
   * Calculate specificity for suffix patterns
   */
  calculateSuffixSpecificity(_pattern) {
    return 45;
  }
  /**
   * Calculate specificity for middle wildcards
   */
  calculateMiddleSpecificity(pattern, pos) {
    const beforeLen = pos;
    const afterLen = pattern.length - pos - 1;
    return 40 + beforeLen + afterLen;
  }
  /**
   * Calculate specificity for complex patterns
   */
  calculateComplexSpecificity(pattern, positions) {
    const nonWildcard = pattern.length - positions.length;
    return 30 + nonWildcard * 2;
  }
  /**
   * Calculate specificity for nested path patterns
   */
  calculateNestedSpecificity(pattern, positions) {
    let score = 25;
    const segments = pattern.split("/").filter((s) => s && s !== "**");
    score += segments.length * 10;
    for (const seg of segments) {
      if (seg !== "**" && !seg.includes("*")) {
        score += 10;
      }
    }
    return Math.min(score, 95);
  }
  /**
   * Escape special regex characters
   */
  escapeRegex(str) {
    return str.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  /**
   * Generate a simple hash for the pattern
   */
  generateHash(pattern) {
    let hash = 0;
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  /**
   * Validate if a pattern string is well-formed
   */
  validatePattern(pattern) {
    if (!pattern || pattern.trim().length === 0) {
      return { valid: false, error: "Pattern cannot be empty" };
    }
    let parenDepth = 0;
    for (const char of pattern) {
      if (char === "(")
        parenDepth++;
      if (char === ")")
        parenDepth--;
      if (parenDepth < 0) {
        return { valid: false, error: "Unbalanced parentheses" };
      }
    }
    if (parenDepth !== 0) {
      return { valid: false, error: "Unbalanced parentheses" };
    }
    if (pattern.includes("***")) {
      return { valid: false, error: "Invalid wildcard sequence (***" };
    }
    if (pattern.startsWith("Bash(")) {
      if (!pattern.endsWith(")")) {
        return { valid: false, error: "Bash pattern must end with )" };
      }
      const inner = pattern.slice(5, -1);
      if (inner.length === 0) {
        return { valid: false, error: "Bash pattern cannot be empty" };
      }
    }
    if (pattern.startsWith("mcp__") && pattern.includes("__*")) {
      const parts = pattern.split("__");
      if (parts.length < 3) {
        return { valid: false, error: "MCP pattern must have at least 3 parts" };
      }
    }
    return { valid: true };
  }
  /**
   * Get pattern type as a human-readable string
   */
  getPatternType(pattern) {
    const compiled = this.compilePattern(pattern);
    return compiled.type;
  }
}
class WildcardPermissionRules {
  matcher;
  rules = [];
  config;
  beforeHooks = [];
  afterHooks = [];
  constructor(config = {}) {
    this.matcher = new WildcardPatternMatcher(config.maxCacheSize);
    this.config = {
      allowUnsandboxedCommands: false,
      disallowedTools: [],
      maxCacheSize: 1e3,
      enableDiagnostics: false,
      ...config
    };
    if (config.beforeCheck) {
      this.beforeHooks.push(config.beforeCheck);
    }
    if (config.afterCheck) {
      this.afterHooks.push(config.afterCheck);
    }
  }
  /**
   * Add a permission rule
   */
  addRule(rule) {
    const validation = this.matcher.validatePattern(rule.pattern);
    if (!validation.valid) {
      throw new Error(`Invalid pattern: ${validation.error}`);
    }
    const existingIndex = this.rules.findIndex(
      (r) => r.pattern === rule.pattern && r.type === rule.type
    );
    const newRule = {
      ...rule,
      createdAt: rule.createdAt ?? Date.now(),
      modifiedAt: Date.now(),
      enabled: rule.enabled ?? true,
      priority: rule.priority ?? this.calculateDefaultPriority(rule)
    };
    if (existingIndex >= 0) {
      this.rules[existingIndex] = {
        ...this.rules[existingIndex],
        ...newRule,
        createdAt: this.rules[existingIndex].createdAt
      };
    } else {
      this.rules.push(newRule);
      this.sortRulesByPriority();
    }
  }
  /**
   * Remove a permission rule
   */
  removeRule(pattern, type) {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter((rule) => {
      if (type && rule.type !== type) {
        return true;
      }
      return rule.pattern !== pattern;
    });
    return this.rules.length < initialLength;
  }
  /**
   * Check if a target is allowed
   */
  async checkPermission(target, context = {}) {
    const fullContext = {
      action: "check",
      target,
      timestamp: Date.now(),
      ...context
    };
    for (const hook of this.beforeHooks) {
      await hook(fullContext, { allowed: false, reason: "Checking..." });
    }
    let result;
    if (this.config.disallowedTools?.some((tool) => target.includes(tool))) {
      result = {
        allowed: false,
        reason: `Tool is in disallowed list: ${this.config.disallowedTools.join(", ")}`
      };
    } else {
      const denyRule = this.findMatchingRule(target, "deny");
      if (denyRule && denyRule.enabled !== false) {
        result = {
          allowed: false,
          matchedRule: denyRule,
          matchedPattern: denyRule.pattern,
          reason: `Denied by rule: ${denyRule.pattern}`,
          source: denyRule.source
        };
      } else {
        const allowRule = this.findMatchingRule(target, "allow");
        if (allowRule && allowRule.enabled !== false) {
          result = {
            allowed: true,
            matchedRule: allowRule,
            matchedPattern: allowRule.pattern,
            reason: `Allowed by rule: ${allowRule.pattern}`,
            source: allowRule.source
          };
        } else {
          result = {
            allowed: false,
            reason: "No matching allow rule found (default deny)"
          };
        }
      }
    }
    for (const hook of this.afterHooks) {
      await hook(fullContext, result);
    }
    return result;
  }
  /**
   * Find the highest priority matching rule for a target
   */
  findMatchingRule(target, type) {
    const matchingRules = this.rules.filter(
      (rule) => rule.type === type && rule.enabled !== false && this.matcher.match(rule.pattern, target)
    );
    if (matchingRules.length === 0) {
      return void 0;
    }
    if (matchingRules.length === 1) {
      return matchingRules[0];
    }
    return matchingRules.reduce((best, current) => {
      const bestCompiled = this.matcher.compilePattern(best.pattern);
      const currentCompiled = this.matcher.compilePattern(current.pattern);
      if (currentCompiled.specificity > bestCompiled.specificity) {
        return current;
      }
      return best;
    });
  }
  /**
   * Get all rules
   */
  getAllRules() {
    return [...this.rules];
  }
  /**
   * Get rules by type
   */
  getRulesByType(type) {
    return this.rules.filter((rule) => rule.type === type);
  }
  /**
   * Get rules by category
   */
  getRulesByCategory(category) {
    return this.rules.filter((rule) => rule.category === category);
  }
  /**
   * Clear all rules
   */
  clearRules() {
    this.rules = [];
  }
  /**
   * Test a pattern against sample targets
   */
  testPattern(pattern, targets) {
    const validation = this.matcher.validatePattern(pattern);
    if (!validation.valid) {
      return {
        pattern,
        matched: [],
        notMatched: [],
        errors: [validation.error],
        valid: false
      };
    }
    const matched = [];
    const notMatched = [];
    const errors = [];
    for (const target of targets) {
      try {
        if (this.matcher.match(pattern, target)) {
          matched.push(target);
        } else {
          notMatched.push(target);
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    return {
      pattern,
      matched,
      notMatched,
      errors,
      valid: errors.length === 0
    };
  }
  /**
   * Get diagnostics for a specific rule
   */
  getDiagnostics(rulePattern) {
    const rule = this.rules.find((r) => r.pattern === rulePattern);
    if (!rule) {
      return null;
    }
    const shadowedBy = [];
    const shadows = [];
    const conflicts = [];
    const suggestions = [];
    const ruleCompiled = this.matcher.compilePattern(rule.pattern);
    for (const other of this.rules) {
      if (other === rule)
        continue;
      const otherCompiled = this.matcher.compilePattern(other.pattern);
      if (other.type === rule.type) {
        if (otherCompiled.specificity < ruleCompiled.specificity) {
          if (this.matcher.match(other.pattern, rule.pattern)) {
            shadowedBy.push(other);
          }
        }
      }
      if (other.pattern === rule.pattern && other.type !== rule.type) {
        conflicts.push({
          rule: other,
          conflict: `Conflicting rule type: ${other.type} vs ${rule.type}`
        });
      }
    }
    if (shadowedBy.length > 0) {
      suggestions.push(`Rule is shadowed by ${shadowedBy.length} other rule(s) with higher priority`);
      suggestions.push("Consider increasing the priority of this rule");
      suggestions.push("Or remove/reduce the specificity of shadowing rules");
      for (const shadow of shadowedBy) {
        if (shadow.pattern === "*") {
          suggestions.push(`Remove or narrow the catch-all rule: ${shadow.pattern}`);
        }
      }
    }
    let reachable = true;
    const testTargets = this.generateTestTargets(rule.category);
    const testResult = this.testPattern(rule.pattern, testTargets);
    if (testResult.matched.length === 0 && testResult.notMatched.length === testTargets.length) {
      reachable = false;
      suggestions.push("Pattern does not match any common targets");
      suggestions.push("Verify the pattern syntax and expected resource format");
    }
    return {
      rule,
      reachable,
      shadowedBy,
      shadows,
      suggestions,
      conflicts
    };
  }
  /**
   * Get diagnostics for all rules
   */
  getAllDiagnostics() {
    return this.rules.map((rule) => this.getDiagnostics(rule.pattern)).filter((d) => d !== null);
  }
  /**
   * Get unreachable rules
   */
  getUnreachableRules() {
    return this.getAllDiagnostics().filter((d) => !d.reachable).map((d) => d.rule);
  }
  /**
   * Sort rules by priority (highest first)
   */
  sortRulesByPriority() {
    this.rules.sort((a, b) => {
      const priorityA = a.priority ?? this.calculateDefaultPriority(a);
      const priorityB = b.priority ?? this.calculateDefaultPriority(b);
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      const specificityA = this.matcher.compilePattern(a.pattern).specificity;
      const specificityB = this.matcher.compilePattern(b.pattern).specificity;
      return specificityB - specificityA;
    });
  }
  /**
   * Calculate default priority for a rule
   */
  calculateDefaultPriority(rule) {
    const compiled = this.matcher.compilePattern(rule.pattern);
    return compiled.specificity;
  }
  /**
   * Check if pattern1 is more general than pattern2
   */
  isMoreGeneralPattern(pattern1, pattern2) {
    const compiled1 = this.matcher.compilePattern(pattern1);
    const compiled2 = this.matcher.compilePattern(pattern2);
    return compiled1.specificity < compiled2.specificity;
  }
  /**
   * Generate test targets for a category
   */
  generateTestTargets(category) {
    const commonTargets = {
      bash: ["npm install", "npm test", "git status", "ls -la", "cat file.txt"],
      mcp: ["mcp__server__tool1", "mcp__server__tool2", "mcp__other__func"],
      filesystem: ["/path/to/file.txt", "/home/user/.bashrc", "/etc/config"],
      network: ["https://api.example.com", "https://github.com/*", "wss://socket.server"],
      tool: ["Read", "Write", "Edit", "Bash", "WebSearch"],
      command: ["init", "update", "doctor", "permissions"],
      workflow: ["sixStep", "featPlan", "bmad"],
      provider: ["302ai", "glm", "minimax", "kimi"],
      model: ["claude-opus", "claude-sonnet", "gpt-4"]
    };
    return commonTargets[category] || [];
  }
  /**
   * Add a before-check hook
   */
  addBeforeHook(hook) {
    this.beforeHooks.push(hook);
  }
  /**
   * Add an after-check hook
   */
  addAfterHook(hook) {
    this.afterHooks.push(hook);
  }
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.matcher.getCacheStats();
  }
  /**
   * Clear the pattern cache
   */
  clearCache() {
    this.matcher.clearCache();
  }
  /**
   * Import rules from configuration
   */
  importFromConfig(config, defaultSource = "config") {
    if (config.allow) {
      for (const pattern of config.allow) {
        try {
          this.addRule({
            type: "allow",
            pattern,
            category: this.inferCategory(pattern),
            source: defaultSource
          });
        } catch {
        }
      }
    }
    if (config.deny) {
      for (const pattern of config.deny) {
        try {
          this.addRule({
            type: "deny",
            pattern,
            category: this.inferCategory(pattern),
            source: defaultSource
          });
        } catch {
        }
      }
    }
  }
  /**
   * Export rules to configuration format
   */
  exportToConfig() {
    return {
      allow: this.rules.filter((r) => r.type === "allow").map((r) => r.pattern),
      deny: this.rules.filter((r) => r.type === "deny").map((r) => r.pattern)
    };
  }
  /**
   * Validate a pattern string (public wrapper)
   */
  validatePattern(pattern) {
    return this.matcher.validatePattern(pattern);
  }
  /**
   * Get pattern type (public wrapper)
   */
  getPatternType(pattern) {
    return this.matcher.getPatternType(pattern);
  }
  /**
   * Infer category from pattern
   */
  inferCategory(pattern) {
    if (pattern.startsWith("Bash(")) {
      return "bash";
    }
    if (pattern.startsWith("mcp__")) {
      return "mcp";
    }
    if (pattern.startsWith("http://") || pattern.startsWith("https://") || pattern.startsWith("ws://") || pattern.startsWith("wss://")) {
      return "network";
    }
    if (pattern.startsWith("/")) {
      return "filesystem";
    }
    if (["Read", "Write", "Edit", "Bash", "WebSearch"].includes(pattern)) {
      return "tool";
    }
    return "command";
  }
  /**
   * Match a pattern against a target string
   */
  match(pattern, target) {
    return this.matcher.match(pattern, target);
  }
  /**
   * Get statistics about the rules
   */
  getStats() {
    const byCategory = {};
    const bySource = {};
    for (const rule of this.rules) {
      byCategory[rule.category] = (byCategory[rule.category] || 0) + 1;
      bySource[rule.source] = (bySource[rule.source] || 0) + 1;
    }
    return {
      total: this.rules.length,
      allow: this.rules.filter((r) => r.type === "allow").length,
      deny: this.rules.filter((r) => r.type === "deny").length,
      enabled: this.rules.filter((r) => r.enabled !== false).length,
      disabled: this.rules.filter((r) => r.enabled === false).length,
      byCategory,
      bySource
    };
  }
}
let singletonInstance = null;
function getWildcardPermissionRules(config) {
  if (!singletonInstance) {
    singletonInstance = new WildcardPermissionRules(config);
  }
  return singletonInstance;
}
const SAMPLE_PATTERNS = {
  // Bash command patterns
  bash: [
    "Bash(npm *)",
    "Bash(npm install)",
    "Bash(npm test)",
    "Bash(git *)",
    "Bash(git status)",
    "Bash(* install)"
    // Any * install command
  ],
  // MCP tool patterns
  mcp: [
    "mcp__server__*",
    "mcp__filesystem__*",
    "mcp__github__*",
    "mcp__*__*"
    // Any MCP tool
  ],
  // Filesystem patterns
  filesystem: [
    "/home/user/*",
    "/home/user/**/*.txt",
    "*.md",
    "/tmp/*"
  ],
  // Network patterns
  network: [
    "https://api.example.com/*",
    "https://github.com/*",
    "wss://socket.example.com"
  ]
};

class PermissionManager {
  wildcardRules;
  configPath;
  settingsPath;
  legacyMode = false;
  constructor(configPath, settingsPath) {
    this.configPath = configPath || join(homedir(), ".ccjk", "permissions.json");
    this.settingsPath = settingsPath || join(homedir(), ".claude", "settings.json");
    const config = {
      maxCacheSize: 1e3,
      enableDiagnostics: true
    };
    this.wildcardRules = new WildcardPermissionRules(config);
    this.loadPermissions();
  }
  /**
   * Load permissions from config files
   * Loads from both legacy config and Claude Code settings.json
   */
  loadPermissions() {
    this.loadFromSettingsJson();
    this.loadFromLegacyConfig();
    this.loadFromClaudePermissions();
  }
  /**
   * Load permissions from Claude Code settings.json
   */
  loadFromSettingsJson() {
    try {
      if (!existsSync(this.settingsPath)) {
        return;
      }
      const content = readFileSync(this.settingsPath, "utf-8");
      const settings = JSON.parse(content);
      if (settings.experimental?.allowUnsandboxedCommands) {
        this.wildcardRules = getWildcardPermissionRules({
          allowUnsandboxedCommands: true
        });
      }
      if (settings.experimental?.disallowedTools) {
        this.wildcardRules = getWildcardPermissionRules({
          disallowedTools: settings.experimental.disallowedTools
        });
      }
      if (settings.chat?.alwaysApprove) {
        for (const pattern of settings.chat.alwaysApprove) {
          try {
            this.wildcardRules.addRule({
              type: "allow",
              pattern,
              category: this.inferCategory(pattern),
              source: "settings",
              description: "From chat.alwaysApprove"
            });
          } catch {
          }
        }
      }
    } catch {
    }
  }
  /**
   * Load from legacy CCJK config
   */
  loadFromLegacyConfig() {
    try {
      if (!existsSync(this.configPath)) {
        return;
      }
      const content = readFileSync(this.configPath, "utf-8");
      const config = JSON.parse(content);
      if (config.allow || config.deny) {
        this.wildcardRules.importFromConfig(config, "config");
        this.legacyMode = true;
      }
    } catch {
    }
  }
  /**
   * Load from Claude Code 2.0.70+ permissions format
   */
  loadFromClaudePermissions() {
    try {
      if (!existsSync(this.settingsPath)) {
        return;
      }
      const content = readFileSync(this.settingsPath, "utf-8");
      const settings = JSON.parse(content);
      if (settings.permissions) {
        this.wildcardRules.importFromConfig(settings.permissions, "settings");
      }
    } catch {
    }
  }
  /**
   * Save permissions to config files
   */
  savePermissions() {
    try {
      this.saveToSettingsJson();
      if (this.legacyMode) {
        this.saveToLegacyConfig();
      }
    } catch (error) {
      throw new Error(`Failed to save permissions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Save to Claude Code settings.json
   */
  saveToSettingsJson() {
    try {
      let settings = {};
      if (existsSync(this.settingsPath)) {
        const content = readFileSync(this.settingsPath, "utf-8");
        settings = JSON.parse(content);
      }
      const exported = this.wildcardRules.exportToConfig();
      settings.permissions = {
        allow: exported.allow,
        deny: exported.deny
      };
      writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save to settings.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Save to legacy CCJK config
   */
  saveToLegacyConfig() {
    try {
      const exported = this.wildcardRules.exportToConfig();
      writeFileSync(this.configPath, JSON.stringify(exported, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save to legacy config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Check if an action on a resource is permitted
   * @param action - The action to check (e.g., "read", "write", "execute")
   * @param resource - The resource identifier (e.g., "Bash(npm install)", "mcp__server__tool")
   * @returns Permission check result
   */
  async checkPermission(action, resource) {
    const context = {
      action,
      target: resource,
      timestamp: Date.now()
    };
    return await this.wildcardRules.checkPermission(resource, context);
  }
  /**
   * Legacy checkPermission method for backward compatibility
   */
  checkPermissionSync(action, resource) {
    const result = {
      allowed: false,
      reason: "Use async checkPermission for full wildcard support"
    };
    const target = `${resource}:${action}`;
    const denyRule = this.wildcardRules.findMatchingRule(target, "deny");
    if (denyRule) {
      return {
        allowed: false,
        matchedRule: denyRule,
        matchedPattern: denyRule.pattern,
        reason: `Denied by rule: ${denyRule.pattern}`,
        source: denyRule.source
      };
    }
    const allowRule = this.wildcardRules.findMatchingRule(target, "allow");
    if (allowRule) {
      return {
        allowed: true,
        matchedRule: allowRule,
        matchedPattern: allowRule.pattern,
        reason: `Allowed by rule: ${allowRule.pattern}`,
        source: allowRule.source
      };
    }
    return result;
  }
  /**
   * Match a pattern against a target string (legacy method)
   */
  matchPattern(pattern, target) {
    return this.wildcardRules.match(pattern, target);
  }
  /**
   * Add a permission rule
   */
  addPermission(permission) {
    this.wildcardRules.addRule({
      type: permission.type,
      pattern: permission.pattern,
      category: this.inferCategory(permission.pattern),
      source: "user",
      description: permission.description,
      priority: permission.pattern === "*" ? 0 : void 0
    });
    this.savePermissions();
  }
  /**
   * Add a wildcard permission rule (new API)
   */
  addRule(rule) {
    this.wildcardRules.addRule(rule);
    this.savePermissions();
  }
  /**
   * Remove a permission rule by pattern
   */
  removePermission(pattern, type) {
    const removed = this.wildcardRules.removeRule(pattern, type);
    if (removed) {
      this.savePermissions();
    }
    return removed;
  }
  /**
   * List all permissions (legacy format)
   */
  listPermissions(type, scope) {
    const rules = this.wildcardRules.getAllRules();
    let filtered = rules;
    if (type) {
      filtered = filtered.filter((r) => r.type === type);
    }
    return filtered.map((r) => ({
      type: r.type,
      pattern: r.pattern,
      scope: "global",
      description: r.description,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : void 0
    }));
  }
  /**
   * Get all wildcard rules
   */
  getAllRules() {
    return this.wildcardRules.getAllRules();
  }
  /**
   * Get rules by type
   */
  getRulesByType(type) {
    return this.wildcardRules.getRulesByType(type);
  }
  /**
   * Get rules by category
   */
  getRulesByCategory(category) {
    return this.wildcardRules.getRulesByCategory(category);
  }
  /**
   * Clear all permissions
   */
  clearPermissions(type) {
    if (type) {
      const rulesToRemove = this.wildcardRules.getRulesByType(type);
      for (const rule of rulesToRemove) {
        this.wildcardRules.removeRule(rule.pattern, rule.type);
      }
    } else {
      this.wildcardRules.clearRules();
    }
    this.savePermissions();
  }
  /**
   * Get permission statistics
   */
  getStats() {
    const stats = this.wildcardRules.getStats();
    return {
      total: stats.total,
      allow: stats.allow,
      deny: stats.deny
    };
  }
  /**
   * Export permissions to JSON (legacy format)
   */
  exportPermissions() {
    return this.wildcardRules.exportToConfig();
  }
  /**
   * Import permissions from JSON (legacy format)
   */
  importPermissions(config, merge = false) {
    if (!merge) {
      this.wildcardRules.clearRules();
    }
    this.wildcardRules.importFromConfig(config, "config");
    this.savePermissions();
  }
  /**
   * Test a pattern against sample targets
   */
  testPattern(pattern, targets) {
    const defaultTargets = [
      "npm install",
      "npm test",
      "git status",
      "mcp__server__tool",
      "Read",
      "Write",
      "Edit"
    ];
    return this.wildcardRules.testPattern(pattern, targets || defaultTargets);
  }
  /**
   * Get diagnostics for a specific rule
   */
  getDiagnostics(pattern) {
    return this.wildcardRules.getDiagnostics(pattern);
  }
  /**
   * Get diagnostics for all rules
   */
  getAllDiagnostics() {
    return this.wildcardRules.getAllDiagnostics();
  }
  /**
   * Get unreachable rules (rules that can never match)
   */
  getUnreachableRules() {
    return this.wildcardRules.getUnreachableRules();
  }
  /**
   * Add a before-check hook
   */
  addBeforeHook(hook) {
    this.wildcardRules.addBeforeHook(hook);
  }
  /**
   * Add an after-check hook
   */
  addAfterHook(hook) {
    this.wildcardRules.addAfterHook(hook);
  }
  /**
   * Set allowUnsandboxedCommands flag
   */
  setAllowUnsandboxedCommands(allow) {
    this.wildcardRules = getWildcardPermissionRules({
      allowUnsandboxedCommands: allow
    });
    this.updateSettingsExperimental({
      allowUnsandboxedCommands: allow
    });
  }
  /**
   * Set disallowed tools list
   */
  setDisallowedTools(tools) {
    this.wildcardRules = getWildcardPermissionRules({
      disallowedTools: tools
    });
    this.updateSettingsExperimental({
      disallowedTools: tools
    });
  }
  /**
   * Get current configuration
   */
  getConfig() {
    this.wildcardRules.getStats();
    return {
      disallowedTools: [],
      maxCacheSize: 1e3,
      enableDiagnostics: true
    };
  }
  /**
   * Search for rules by pattern
   */
  searchRules(query) {
    const lowerQuery = query.toLowerCase();
    return this.wildcardRules.getAllRules().filter(
      (rule) => rule.pattern.toLowerCase().includes(lowerQuery) || rule.description?.toLowerCase().includes(lowerQuery) || rule.category.toLowerCase().includes(lowerQuery)
    );
  }
  /**
   * Validate a pattern string
   */
  validatePattern(pattern) {
    return this.wildcardRules.validatePattern(pattern);
  }
  /**
   * Get pattern type
   */
  getPatternType(pattern) {
    return this.wildcardRules.getPatternType(pattern);
  }
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.wildcardRules.getCacheStats();
  }
  /**
   * Clear the pattern cache
   */
  clearCache() {
    this.wildcardRules.clearCache();
  }
  /**
   * Update experimental settings in settings.json
   */
  updateSettingsExperimental(updates) {
    try {
      let settings = {};
      if (existsSync(this.settingsPath)) {
        const content = readFileSync(this.settingsPath, "utf-8");
        settings = JSON.parse(content);
      }
      if (!settings.experimental) {
        settings.experimental = {};
      }
      Object.assign(settings.experimental, updates);
      writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to update settings.json:", error);
    }
  }
  /**
   * Infer category from pattern
   */
  inferCategory(pattern) {
    if (pattern.startsWith("Bash(")) {
      return "bash";
    }
    if (pattern.startsWith("mcp__")) {
      return "mcp";
    }
    if (pattern.startsWith("http://") || pattern.startsWith("https://") || pattern.startsWith("ws://") || pattern.startsWith("wss://")) {
      return "network";
    }
    if (pattern.startsWith("/")) {
      return "filesystem";
    }
    if (["Read", "Write", "Edit", "Bash", "WebSearch"].includes(pattern)) {
      return "tool";
    }
    if (["init", "update", "doctor", "permissions"].includes(pattern)) {
      return "command";
    }
    return "command";
  }
  /**
   * Get sample patterns for reference
   */
  static getSamplePatterns() {
    return SAMPLE_PATTERNS;
  }
}
let instance = null;
function getPermissionManager(configPath, settingsPath) {
  if (!instance) {
    instance = new PermissionManager(configPath, settingsPath);
  }
  return instance;
}

export { getPermissionManager as g };
