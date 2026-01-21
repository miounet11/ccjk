import ansis from 'ansis';
import inquirer from 'inquirer';
import { i as getMcpService, a as readCodexConfig, j as applyCodexPlatformCommand, w as writeCodexConfig, M as MCP_SERVICE_CONFIGS } from '../chunks/codex.mjs';
import { ensureI18nInitialized, i18n } from '../chunks/index.mjs';
import { ClAUDE_CONFIG_FILE, CODEX_CONFIG_FILE } from '../chunks/constants.mjs';
import { r as readMcpConfig, a as buildMcpServerConfig, w as writeMcpConfig } from '../chunks/claude-config.mjs';
import { writeFileAtomic, exists } from '../chunks/fs-operations.mjs';
import { k as isWindows, m as getSystemRoot } from '../chunks/platform.mjs';
import { existsSync, unlinkSync, statSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'pathe';

const DEFAULT_API_URL = "https://api.api.claudehome.cn/v1/mcp-marketplace";
const REQUEST_TIMEOUT = 3e4;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1e3;
const DEFAULT_CACHE_TTL = 36e5;
const DEFAULT_THROTTLE_INTERVAL = 100;
const CACHE_VERSION = "1.0.0";
const CACHE_BASE_DIR = join(homedir(), ".ccjk", "mcp-marketplace", "cache");
class MarketplaceClient {
  baseUrl;
  apiKey;
  timeout;
  offlineMode;
  enableLogging;
  maxRetries;
  retryDelay;
  cacheTTL;
  enableDeduplication;
  throttleInterval;
  // In-memory cache
  memoryCache;
  // Pending requests for deduplication
  pendingRequests;
  // Last request timestamp for throttling
  lastRequestTime;
  // File-based cache
  cacheDir;
  cacheFile;
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_API_URL;
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || REQUEST_TIMEOUT;
    this.offlineMode = options.offlineMode || false;
    this.enableLogging = options.enableLogging || false;
    this.maxRetries = options.maxRetries || MAX_RETRY_ATTEMPTS;
    this.retryDelay = options.retryDelay || RETRY_DELAY;
    this.cacheTTL = options.cacheTTL || DEFAULT_CACHE_TTL;
    this.enableDeduplication = options.enableDeduplication !== false;
    this.throttleInterval = options.throttleInterval || DEFAULT_THROTTLE_INTERVAL;
    this.memoryCache = /* @__PURE__ */ new Map();
    this.pendingRequests = /* @__PURE__ */ new Map();
    this.lastRequestTime = 0;
    this.cacheDir = CACHE_BASE_DIR;
    this.cacheFile = join(this.cacheDir, "marketplace.json");
  }
  // ==========================================================================
  // Public API Methods
  // ==========================================================================
  /**
   * Search packages with filters and sorting
   */
  async search(options = {}) {
    this.log("Searching packages with options:", options);
    const params = this.buildSearchParams(options);
    const response = await this.request("/search", {
      method: "GET",
      params
    });
    if (response.success && response.data) {
      return response.data;
    }
    return {
      packages: [],
      total: 0,
      page: options.page || 1,
      limit: options.limit || 20,
      totalPages: 0,
      hasMore: false
    };
  }
  /**
   * Get detailed information about a specific package
   */
  async getPackage(id) {
    this.log("Getting package:", id);
    const encodedId = encodeURIComponent(id);
    const response = await this.request(`/packages/${encodedId}`, {
      method: "GET"
    });
    return response.success && response.data ? response.data : null;
  }
  /**
   * Get version history for a package
   */
  async getVersions(id) {
    this.log("Getting versions for package:", id);
    const encodedId = encodeURIComponent(id);
    const response = await this.request(`/packages/${encodedId}/versions`, {
      method: "GET"
    });
    return response.success && response.data ? response.data : [];
  }
  /**
   * Get trending/popular packages
   */
  async getTrending(limit = 10) {
    this.log("Getting trending packages, limit:", limit);
    const response = await this.request("/trending", {
      method: "GET",
      params: { limit }
    });
    return response.success && response.data ? response.data : [];
  }
  /**
   * Get personalized recommendations based on installed packages
   */
  async getRecommendations(installed) {
    this.log("Getting recommendations for installed packages:", installed);
    const response = await this.request("/recommendations", {
      method: "POST",
      body: JSON.stringify({ installed })
    });
    return response.success && response.data ? response.data : [];
  }
  /**
   * Get all available categories
   */
  async getCategories() {
    this.log("Getting categories");
    const response = await this.request("/categories", {
      method: "GET"
    });
    return response.success && response.data ? response.data : [];
  }
  /**
   * Check for updates for installed packages
   */
  async checkUpdates(installed) {
    this.log("Checking updates for", installed.length, "packages");
    const response = await this.request("/updates/check", {
      method: "POST",
      body: JSON.stringify({ packages: installed })
    });
    return response.success && response.data ? response.data : [];
  }
  // ==========================================================================
  // Cache Management
  // ==========================================================================
  /**
   * Clear all cached data (memory and file)
   */
  clearCache() {
    this.memoryCache.clear();
    this.pendingRequests.clear();
    try {
      if (existsSync(this.cacheFile)) {
        unlinkSync(this.cacheFile);
      }
    } catch (error) {
      this.log("Failed to clear file cache:", error);
    }
    this.log("Cache cleared");
  }
  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    const keysToDelete = [];
    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.memoryCache.delete(key));
    this.log("Cleared", keysToDelete.length, "expired cache entries");
  }
  /**
   * Get cache statistics
   */
  getCacheStats() {
    const fileCache = this.loadFileCache();
    let cacheSize = 0;
    try {
      if (existsSync(this.cacheFile)) {
        cacheSize = statSync(this.cacheFile).size;
      }
    } catch {
    }
    return {
      totalPackages: fileCache?.packages.length || 0,
      cacheSize,
      lastUpdated: fileCache?.lastUpdated || null,
      expiresAt: fileCache?.expiresAt || null,
      isExpired: this.isFileCacheExpired(),
      cachedCategories: fileCache?.categories.length || 0
    };
  }
  /**
   * Set offline mode
   */
  setOfflineMode(enabled) {
    this.offlineMode = enabled;
    this.log("Offline mode:", enabled ? "enabled" : "disabled");
  }
  // ==========================================================================
  // Private Request Methods
  // ==========================================================================
  /**
   * Make an HTTP request with caching, deduplication, and throttling
   */
  async request(endpoint, options = {}) {
    const url = this.buildUrl(endpoint, options.params);
    const cacheKey = `${options.method || "GET"}:${url}`;
    if (!options.skipCache && (options.method === "GET" || !options.method)) {
      const cached = this.getFromMemoryCache(cacheKey);
      if (cached) {
        this.log("Memory cache hit:", cacheKey);
        return {
          success: true,
          data: cached,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    }
    if (this.enableDeduplication && (options.method === "GET" || !options.method)) {
      const pending = this.pendingRequests.get(cacheKey);
      if (pending) {
        this.log("Deduplicating request:", cacheKey);
        return pending.promise;
      }
    }
    if (this.offlineMode) {
      const cached = this.getFromMemoryCache(cacheKey);
      if (cached) {
        this.log("Offline mode: returning cached data");
        return {
          success: true,
          data: cached,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return {
        success: false,
        error: {
          code: "OFFLINE_MODE",
          message: "Offline mode enabled and no cached data available"
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    await this.throttle();
    const requestPromise = this.executeRequest(url, options, cacheKey);
    if (this.enableDeduplication && (options.method === "GET" || !options.method)) {
      this.pendingRequests.set(cacheKey, {
        promise: requestPromise,
        timestamp: Date.now()
      });
      requestPromise.finally(() => {
        this.pendingRequests.delete(cacheKey);
      });
    }
    return requestPromise;
  }
  /**
   * Execute HTTP request with retry logic
   */
  async executeRequest(url, options, cacheKey) {
    let lastError = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.log(`Request attempt ${attempt}/${this.maxRetries}:`, url);
        const response = await this.makeRequest(url, options);
        if (response.success && response.data && (options.method === "GET" || !options.method)) {
          this.setMemoryCache(cacheKey, response.data, this.cacheTTL);
        }
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log(`Request failed (attempt ${attempt}):`, lastError.message);
        if (lastError.name === "AbortError") {
          break;
        }
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }
    return {
      success: false,
      error: {
        code: "REQUEST_FAILED",
        message: lastError?.message || "Request failed after all retries"
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Make a single HTTP request
   */
  async makeRequest(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: this.getHeaders(),
        body: options.body,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      this.lastRequestTime = Date.now();
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: `HTTP_${response.status}`,
            message: `HTTP ${response.status}: ${response.statusText}`
          },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return {
        ...data,
        success: true,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : String(error)
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  // ==========================================================================
  // Helper Methods
  // ==========================================================================
  /**
   * Build full URL with query parameters
   */
  buildUrl(endpoint, params) {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== void 0 && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      }
    }
    return url.toString();
  }
  /**
   * Build search parameters from options
   */
  buildSearchParams(options) {
    return {
      q: options.query,
      category: options.category,
      tags: options.tags,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      verified: options.verified,
      verificationStatus: options.verificationStatus,
      author: options.author,
      platform: options.platform,
      codeTool: options.codeTool,
      minRating: options.minRating,
      page: options.page || 1,
      limit: options.limit || 20
    };
  }
  /**
   * Get request headers
   */
  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "CCJK-MCP-Marketplace-Client/1.0"
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }
  /**
   * Throttle requests
   */
  async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const remaining = this.throttleInterval - elapsed;
    if (remaining > 0) {
      await this.sleep(remaining);
    }
  }
  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Log message (if logging is enabled)
   */
  log(...args) {
    if (this.enableLogging) {
      console.log("[MarketplaceClient]", ...args);
    }
  }
  // ==========================================================================
  // Memory Cache Methods
  // ==========================================================================
  /**
   * Get data from memory cache
   */
  getFromMemoryCache(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.data;
  }
  /**
   * Set data in memory cache
   */
  setMemoryCache(key, data, ttl) {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  // ==========================================================================
  // File Cache Methods
  // ==========================================================================
  /**
   * Ensure cache directory exists
   */
  ensureCacheDir() {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }
  /**
   * Load cache from file
   */
  loadFileCache() {
    try {
      if (!existsSync(this.cacheFile)) {
        return null;
      }
      const content = readFileSync(this.cacheFile, "utf-8");
      const cache = JSON.parse(content);
      if (cache.version !== CACHE_VERSION) {
        return null;
      }
      return cache;
    } catch {
      return null;
    }
  }
  /**
   * Save cache to file
   */
  saveFileCache(packages, categories) {
    try {
      this.ensureCacheDir();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const expiresAt = new Date(Date.now() + this.cacheTTL).toISOString();
      const cache = {
        version: CACHE_VERSION,
        packages,
        categories,
        createdAt: now,
        expiresAt,
        lastUpdated: now
      };
      writeFileAtomic(this.cacheFile, JSON.stringify(cache, null, 2), "utf-8");
    } catch (error) {
      this.log("Failed to save file cache:", error);
    }
  }
  /**
   * Check if file cache is expired
   */
  isFileCacheExpired() {
    const cache = this.loadFileCache();
    if (!cache) {
      return true;
    }
    const expiresAt = new Date(cache.expiresAt).getTime();
    return Date.now() >= expiresAt;
  }
}
let defaultClientInstance = null;
function getDefaultMarketplaceClient() {
  if (!defaultClientInstance) {
    defaultClientInstance = new MarketplaceClient();
  }
  return defaultClientInstance;
}

function detectActiveTool() {
  const hasClaudeConfig = exists(ClAUDE_CONFIG_FILE);
  const hasCodexConfig = exists(CODEX_CONFIG_FILE);
  if (hasClaudeConfig) {
    return "claude-code";
  }
  if (hasCodexConfig) {
    return "codex";
  }
  return "claude-code";
}
async function installMcpService(serviceId, tool, apiKey) {
  ensureI18nInitialized();
  const service = await getMcpService(serviceId);
  if (!service) {
    return {
      success: false,
      serviceId,
      serviceName: serviceId,
      error: i18n.t("mcp:installer.serviceNotFound", { id: serviceId })
    };
  }
  if (service.requiresApiKey && !apiKey) {
    const promptMessage = service.apiKeyPrompt || i18n.t("mcp:apiKeyPrompt");
    const { inputApiKey } = await inquirer.prompt([{
      type: "input",
      name: "inputApiKey",
      message: promptMessage,
      validate: (input) => !!input || i18n.t("api:keyRequired")
    }]);
    if (!inputApiKey) {
      return {
        success: false,
        serviceId,
        serviceName: service.name,
        error: i18n.t("mcp:installer.apiKeyRequired")
      };
    }
    apiKey = inputApiKey;
  }
  const targetTool = tool || detectActiveTool();
  try {
    if (targetTool === "codex") {
      await installMcpServiceForCodex(serviceId, service.config, apiKey, service.apiKeyEnvVar);
    } else {
      await installMcpServiceForClaudeCode(serviceId, service.config, apiKey, service.apiKeyEnvVar);
    }
    return {
      success: true,
      serviceId,
      serviceName: service.name
    };
  } catch (error) {
    return {
      success: false,
      serviceId,
      serviceName: service.name,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function installMcpServiceForClaudeCode(serviceId, baseConfig, apiKey, apiKeyEnvVar) {
  let config = readMcpConfig();
  if (!config) {
    config = { mcpServers: {} };
  }
  const serverConfig = buildMcpServerConfig(
    baseConfig,
    apiKey,
    apiKeyEnvVar ? `YOUR_${apiKeyEnvVar}` : "YOUR_API_KEY",
    apiKeyEnvVar
  );
  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  config.mcpServers[serviceId] = serverConfig;
  writeMcpConfig(config);
}
async function installMcpServiceForCodex(serviceId, baseConfig, apiKey, apiKeyEnvVar) {
  const existingConfig = readCodexConfig();
  let command = baseConfig.command || serviceId;
  let args = (baseConfig.args || []).map((arg) => String(arg));
  if (serviceId === "serena") {
    const idx = args.indexOf("--context");
    if (idx >= 0 && idx + 1 < args.length) {
      args[idx + 1] = "codex";
    } else {
      args.push("--context", "codex");
    }
  }
  const serviceConfig = { id: serviceId.toLowerCase(), command, args };
  applyCodexPlatformCommand(serviceConfig);
  command = serviceConfig.command;
  args = serviceConfig.args || [];
  const env = { ...baseConfig.env || {} };
  if (isWindows()) {
    const systemRoot = getSystemRoot();
    if (systemRoot) {
      env.SYSTEMROOT = systemRoot;
    }
  }
  if (apiKey && apiKeyEnvVar) {
    env[apiKeyEnvVar] = apiKey;
  }
  const newService = {
    id: serviceId.toLowerCase(),
    command,
    args,
    env: Object.keys(env).length > 0 ? env : void 0,
    startup_timeout_sec: 30
  };
  const existingServices = existingConfig?.mcpServices || [];
  const mergedMap = /* @__PURE__ */ new Map();
  for (const svc of existingServices) {
    mergedMap.set(svc.id.toLowerCase(), { ...svc });
  }
  mergedMap.set(newService.id, newService);
  const finalServices = Array.from(mergedMap.values());
  const configData = {
    model: existingConfig?.model || null,
    modelProvider: existingConfig?.modelProvider || null,
    providers: existingConfig?.providers || [],
    mcpServices: finalServices,
    otherConfig: existingConfig?.otherConfig || []
  };
  writeCodexConfig(configData);
}
async function uninstallMcpService(serviceId, tool) {
  ensureI18nInitialized();
  const targetTool = tool || detectActiveTool();
  try {
    if (targetTool === "codex") {
      await uninstallMcpServiceFromCodex(serviceId);
    } else {
      await uninstallMcpServiceFromClaudeCode(serviceId);
    }
    return {
      success: true,
      serviceId
    };
  } catch (error) {
    return {
      success: false,
      serviceId,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function uninstallMcpServiceFromClaudeCode(serviceId) {
  const config = readMcpConfig();
  if (!config || !config.mcpServers) {
    throw new Error(i18n.t("mcp:installer.noConfig"));
  }
  const normalizedId = serviceId.toLowerCase();
  const existingKey = Object.keys(config.mcpServers).find(
    (key) => key.toLowerCase() === normalizedId
  );
  if (!existingKey) {
    throw new Error(i18n.t("mcp:installer.serviceNotInstalled", { id: serviceId }));
  }
  delete config.mcpServers[existingKey];
  writeMcpConfig(config);
}
async function uninstallMcpServiceFromCodex(serviceId) {
  const existingConfig = readCodexConfig();
  if (!existingConfig || !existingConfig.mcpServices) {
    throw new Error(i18n.t("mcp:installer.noConfig"));
  }
  const normalizedId = serviceId.toLowerCase();
  const serviceIndex = existingConfig.mcpServices.findIndex(
    (svc) => svc.id.toLowerCase() === normalizedId
  );
  if (serviceIndex === -1) {
    throw new Error(i18n.t("mcp:installer.serviceNotInstalled", { id: serviceId }));
  }
  existingConfig.mcpServices.splice(serviceIndex, 1);
  writeCodexConfig(existingConfig);
}
async function listInstalledMcpServices(tool) {
  ensureI18nInitialized();
  const targetTool = tool || detectActiveTool();
  if (targetTool === "codex") {
    return listInstalledMcpServicesFromCodex();
  } else {
    return listInstalledMcpServicesFromClaudeCode();
  }
}
function listInstalledMcpServicesFromClaudeCode() {
  const config = readMcpConfig();
  if (!config || !config.mcpServers) {
    return [];
  }
  const services = [];
  for (const [id, serverConfig] of Object.entries(config.mcpServers)) {
    const knownService = MCP_SERVICE_CONFIGS.find(
      (s) => s.id.toLowerCase() === id.toLowerCase()
    );
    services.push({
      id,
      name: knownService?.id || id,
      command: serverConfig.command,
      args: serverConfig.args,
      url: serverConfig.url,
      type: serverConfig.type || "stdio"
    });
  }
  return services;
}
function listInstalledMcpServicesFromCodex() {
  const config = readCodexConfig();
  if (!config || !config.mcpServices) {
    return [];
  }
  const services = [];
  for (const svc of config.mcpServices) {
    const knownService = MCP_SERVICE_CONFIGS.find(
      (s) => s.id.toLowerCase() === svc.id.toLowerCase()
    );
    services.push({
      id: svc.id,
      name: knownService?.id || svc.id,
      command: svc.command,
      args: svc.args,
      type: "stdio"
    });
  }
  return services;
}
async function isMcpServiceInstalled(serviceId, tool) {
  const installedServices = await listInstalledMcpServices(tool);
  const normalizedId = serviceId.toLowerCase();
  return installedServices.some((svc) => svc.id.toLowerCase() === normalizedId);
}
async function displayInstalledMcpServices(tool) {
  ensureI18nInitialized();
  const targetTool = tool || detectActiveTool();
  const services = await listInstalledMcpServices(targetTool);
  if (services.length === 0) {
    console.log(ansis.yellow(i18n.t("mcp:installer.noServicesInstalled")));
    return;
  }
  console.log(ansis.green.bold(`
${i18n.t("mcp:installer.installedServices", { tool: targetTool })}
`));
  services.forEach((service, idx) => {
    console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(service.name)} ${ansis.dim(`[${service.id}]`)}`);
    if (service.command) {
      console.log(`   ${ansis.dim(`Command: ${service.command}`)}`);
    }
    if (service.url) {
      console.log(`   ${ansis.dim(`URL: ${service.url}`)}`);
    }
    console.log("");
  });
}

function getLocalFallbackServices() {
  return [
    // CCJK managed services (from mcp-services config)
    ...MCP_SERVICE_CONFIGS.map((svc) => ({
      name: svc.id,
      description: svc.id,
      // Will be replaced with i18n
      package: svc.config.command || svc.id,
      category: "ccjk",
      serviceId: svc.id,
      requiresApiKey: svc.requiresApiKey
    })),
    // External MCP servers from Awesome MCP Servers (fallback)
    { name: "Filesystem", description: "Secure file operations", package: "@modelcontextprotocol/server-filesystem", category: "core" },
    { name: "GitHub", description: "Repository management", package: "@modelcontextprotocol/server-github", category: "dev" },
    { name: "PostgreSQL", description: "Database operations", package: "@modelcontextprotocol/server-postgres", category: "database" },
    { name: "Puppeteer", description: "Browser automation", package: "@modelcontextprotocol/server-puppeteer", category: "automation" },
    { name: "Brave Search", description: "Web search", package: "@modelcontextprotocol/server-brave-search", category: "search" },
    { name: "Google Maps", description: "Location services", package: "@modelcontextprotocol/server-google-maps", category: "api" },
    { name: "Slack", description: "Team communication", package: "@modelcontextprotocol/server-slack", category: "communication" },
    { name: "Memory", description: "Knowledge graph", package: "@modelcontextprotocol/server-memory", category: "ai" }
  ];
}
function convertToMcpServer(pkg) {
  const lang = i18n.language;
  return {
    name: pkg.name,
    description: pkg.description[lang] || pkg.description.en,
    package: pkg.id,
    category: pkg.category,
    stars: pkg.rating,
    serviceId: pkg.id,
    requiresApiKey: pkg.permissions.some((p) => p.type === "env")
  };
}
async function mcpSearch(keyword, options = {}) {
  const client = getDefaultMarketplaceClient();
  try {
    const searchOptions = {
      query: keyword,
      category: options.category,
      verified: options.verified,
      sortBy: options.sortBy || "relevance",
      limit: options.limit || 50
    };
    const result = await client.search(searchOptions);
    if (result.packages.length === 0) {
      console.log(ansis.yellow(`
${i18n.t("mcp:market.noResults", { keyword })}`));
      return;
    }
    console.log(ansis.green.bold(`
${i18n.t("mcp:market.searchResults", { count: result.total, keyword })}
`));
    result.packages.forEach((pkg, idx) => {
      const lang = i18n.language;
      const verifiedBadge = pkg.verified ? ansis.green("\u2713") : ansis.dim("\u25CB");
      console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(pkg.name)} ${verifiedBadge} ${ansis.dim(`[${pkg.category}]`)}`);
      console.log(`   ${pkg.description[lang] || pkg.description.en}`);
      console.log(`   ${ansis.dim(`\u{1F4E5} ${pkg.downloads.toLocaleString()} | \u2B50 ${pkg.rating.toFixed(1)}/5.0`)}`);
      console.log(`   ${ansis.dim(pkg.id)}
`);
    });
    if (result.hasMore) {
      console.log(ansis.dim(`
${i18n.t("mcp:market.moreResults", { total: result.total, shown: result.packages.length })}`));
    }
  } catch {
    console.log(ansis.yellow(`
${i18n.t("mcp:market.apiUnavailable")}`));
    console.log(ansis.dim(i18n.t("mcp:market.usingLocalData")));
    const localServers = getLocalFallbackServices();
    const results = localServers.filter(
      (s) => s.name.toLowerCase().includes(keyword.toLowerCase()) || s.description.toLowerCase().includes(keyword.toLowerCase()) || s.category.toLowerCase().includes(keyword.toLowerCase())
    );
    if (results.length === 0) {
      console.log(ansis.yellow(`
${i18n.t("mcp:market.noResults", { keyword })}`));
      return;
    }
    console.log(ansis.green.bold(`
${i18n.t("mcp:market.searchResults", { count: results.length, keyword })}
`));
    results.forEach((server, idx) => {
      console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(server.name)} ${ansis.dim(`[${server.category}]`)}`);
      console.log(`   ${server.description}`);
      console.log(`   ${ansis.dim(server.package)}
`);
    });
  }
}
async function mcpTrending(options = {}) {
  const client = getDefaultMarketplaceClient();
  try {
    const trending = await client.getTrending(options.limit || 10);
    if (trending.length === 0) {
      console.log(ansis.yellow(`
${i18n.t("mcp:market.noTrending")}`));
      return;
    }
    console.log(ansis.green.bold(`
${i18n.t("mcp:market.trending")}
`));
    trending.forEach((pkg, idx) => {
      const lang = i18n.language;
      const verifiedBadge = pkg.verified ? ansis.green("\u2713") : ansis.dim("\u25CB");
      console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(pkg.name)} ${verifiedBadge} ${ansis.dim(`[${pkg.category}]`)}`);
      console.log(`   ${pkg.description[lang] || pkg.description.en}`);
      console.log(`   ${ansis.dim(`\u{1F4E5} ${pkg.downloads.toLocaleString()} | \u2B50 ${pkg.rating.toFixed(1)}/5.0 (${pkg.ratingCount} ${i18n.t("mcp:market.ratings")})`)}`);
      console.log(`   ${ansis.dim(pkg.id)}
`);
    });
  } catch {
    console.log(ansis.yellow(`
${i18n.t("mcp:market.apiUnavailable")}`));
    console.log(ansis.dim(i18n.t("mcp:market.usingLocalData")));
    console.log(ansis.green.bold(`
${i18n.t("mcp:market.trending")}
`));
    const localServers = getLocalFallbackServices();
    const trending = localServers.slice(0, options.limit || 5);
    trending.forEach((server, idx) => {
      console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(server.name)} ${ansis.dim(`[${server.category}]`)}`);
      console.log(`   ${server.description}`);
      console.log(`   ${ansis.dim(server.package)}
`);
    });
  }
}
async function mcpInstall(serverName, options = {}) {
  const client = getDefaultMarketplaceClient();
  let server = null;
  const localServers = getLocalFallbackServices();
  server = localServers.find((s) => s.name.toLowerCase() === serverName.toLowerCase()) || null;
  if (!server) {
    try {
      const pkg = await client.getPackage(serverName);
      if (pkg) {
        server = convertToMcpServer(pkg);
      }
    } catch {
    }
  }
  if (!server) {
    console.log(ansis.red(`
${i18n.t("mcp:market.serverNotFound", { name: serverName })}`));
    return;
  }
  if (server.serviceId) {
    const isInstalled = await isMcpServiceInstalled(server.serviceId, options.tool);
    if (isInstalled) {
      console.log(ansis.yellow(`
${i18n.t("mcp:installer.alreadyInstalled", { name: server.name })}`));
      return;
    }
    console.log(ansis.green(`
${i18n.t("mcp:market.installing", { name: server.name })}`));
    if (server.requiresApiKey) {
      console.log(ansis.dim(i18n.t("mcp:installer.requiresApiKey")));
    }
    console.log("");
    const { confirm } = await inquirer.prompt([{
      type: "confirm",
      name: "confirm",
      message: i18n.t("mcp:market.confirmInstall"),
      default: true
    }]);
    if (!confirm) {
      console.log(ansis.yellow(i18n.t("mcp:market.cancelled")));
      return;
    }
    const result = await installMcpService(server.serviceId, options.tool);
    if (result.success) {
      console.log(ansis.green(`
${i18n.t("mcp:market.installSuccess", { name: server.name })}`));
      console.log(ansis.dim(i18n.t("mcp:installer.restartRequired")));
    } else {
      console.log(ansis.red(`
${i18n.t("mcp:installer.installFailed", { name: server.name })}`));
      if (result.error) {
        console.log(ansis.dim(result.error));
      }
    }
  } else {
    console.log(ansis.green(`
${i18n.t("mcp:market.installing", { name: server.name })}`));
    console.log(ansis.dim(`Package: ${server.package}
`));
    const { confirm } = await inquirer.prompt([{
      type: "confirm",
      name: "confirm",
      message: i18n.t("mcp:market.confirmInstall"),
      default: true
    }]);
    if (!confirm) {
      console.log(ansis.yellow(i18n.t("mcp:market.cancelled")));
      return;
    }
    console.log(ansis.green(`
${i18n.t("mcp:market.installSuccess", { name: server.name })}`));
    console.log(ansis.dim(i18n.t("mcp:market.manualConfig")));
  }
}
async function mcpUninstall(serverName, options = {}) {
  const localServers = getLocalFallbackServices();
  const server = localServers.find((s) => s.name.toLowerCase() === serverName.toLowerCase());
  const serviceId = server?.serviceId || serverName;
  const isInstalled = await isMcpServiceInstalled(serviceId, options.tool);
  if (!isInstalled) {
    console.log(ansis.yellow(`
${i18n.t("mcp:installer.serviceNotInstalled", { id: serverName })}`));
    return;
  }
  const displayName = server?.name || serverName;
  const { confirm } = await inquirer.prompt([{
    type: "confirm",
    name: "confirm",
    message: i18n.t("mcp:market.confirmUninstall", { name: displayName }),
    default: false
  }]);
  if (!confirm) {
    console.log(ansis.yellow(i18n.t("mcp:market.cancelled")));
    return;
  }
  const result = await uninstallMcpService(serviceId, options.tool);
  if (result.success) {
    console.log(ansis.green(`
${i18n.t("mcp:installer.uninstallSuccess", { name: displayName })}`));
    console.log(ansis.dim(i18n.t("mcp:installer.restartRequired")));
  } else {
    console.log(ansis.red(`
${i18n.t("mcp:installer.uninstallFailed", { name: displayName })}`));
    if (result.error) {
      console.log(ansis.dim(result.error));
    }
  }
}
async function mcpList(options = {}) {
  await displayInstalledMcpServices(options.tool);
}

export { mcpList as a, mcpSearch as b, mcpUninstall as c, mcpTrending as d, mcpInstall as m };
