import process__default from 'node:process';
import ansis from 'ansis';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, unlinkSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'pathe';
import { CCJK_CLOUD_PLUGINS_DIR, CCJK_CLOUD_PLUGINS_CACHE_DIR, CCJK_CLOUD_PLUGINS_INSTALLED_DIR } from './constants.mjs';
import { i18n } from './index.mjs';
import { writeFileAtomic } from './fs-operations.mjs';
import { homedir } from 'node:os';
import { d as detectProject } from '../shared/ccjk.CBhIZiPz.mjs';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'node:crypto';
import 'node:fs/promises';

const CACHE_CONFIG = {
  /** Cache time-to-live: 24 hours in milliseconds */
  TTL: 24 * 60 * 60 * 1e3,
  /** Maximum number of plugins to cache */
  MAX_PLUGINS: 1e3,
  /** Cache version for compatibility tracking */
  VERSION: "1.0.0",
  /** Maximum size for individual plugin content (5MB) */
  MAX_CONTENT_SIZE: 5 * 1024 * 1024
};
const CACHE_BASE_DIR = join(homedir(), ".ccjk", "cloud-plugins", "cache");
class LocalPluginCache {
  cacheDir;
  cacheFile;
  contentDir;
  cache = null;
  constructor(cacheDir) {
    this.cacheDir = cacheDir || CACHE_BASE_DIR;
    this.cacheFile = join(this.cacheDir, "metadata.json");
    this.contentDir = join(this.cacheDir, "contents");
  }
  // ==========================================================================
  // Initialization
  // ==========================================================================
  /**
   * Ensure cache directory exists
   */
  ensureCacheDir() {
    try {
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
      }
      if (!existsSync(this.contentDir)) {
        mkdirSync(this.contentDir, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to create cache directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // ==========================================================================
  // Cache Metadata Operations
  // ==========================================================================
  /**
   * Load cache metadata from disk
   *
   * @returns Cache metadata or null if not found or invalid
   */
  loadCache() {
    try {
      if (!existsSync(this.cacheFile)) {
        return null;
      }
      const content = readFileSync(this.cacheFile, "utf-8");
      const cache = JSON.parse(content);
      if (!this.isValidCache(cache)) {
        console.warn("[LocalPluginCache] Invalid cache structure, ignoring");
        return null;
      }
      if (cache.version !== CACHE_CONFIG.VERSION) {
        console.warn(`[LocalPluginCache] Cache version mismatch (${cache.version} vs ${CACHE_CONFIG.VERSION}), ignoring`);
        return null;
      }
      this.cache = cache;
      return cache;
    } catch (error) {
      console.error("[LocalPluginCache] Failed to load cache:", error);
      return null;
    }
  }
  /**
   * Save cache metadata to disk
   *
   * Uses atomic write operation to prevent corruption
   *
   * @param cache - Cache metadata to save
   */
  saveCache(cache) {
    try {
      this.ensureCacheDir();
      if (!this.isValidCache(cache)) {
        throw new Error("Invalid cache structure");
      }
      if (cache.plugins.length > CACHE_CONFIG.MAX_PLUGINS) {
        console.warn(`[LocalPluginCache] Cache exceeds max plugins (${cache.plugins.length}), truncating`);
        cache.plugins = cache.plugins.slice(0, CACHE_CONFIG.MAX_PLUGINS);
        cache.totalPlugins = cache.plugins.length;
      }
      const content = JSON.stringify(cache, null, 2);
      writeFileAtomic(this.cacheFile, content, "utf-8");
      this.cache = cache;
    } catch (error) {
      throw new Error(`Failed to save cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Get cached plugins
   *
   * @returns Array of cached plugins
   */
  getCachedPlugins() {
    if (!this.cache) {
      this.cache = this.loadCache();
    }
    return this.cache?.plugins || [];
  }
  /**
   * Get a single cached plugin by ID
   *
   * @param id - Plugin ID
   * @returns Plugin or undefined if not found
   */
  getCachedPlugin(id) {
    const plugins = this.getCachedPlugins();
    return plugins.find((p) => p.id === id);
  }
  /**
   * Update cache with new plugin list
   *
   * @param plugins - New plugin list
   */
  updateCache(plugins) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const expiresAt = new Date(Date.now() + CACHE_CONFIG.TTL).toISOString();
    const cache = {
      version: CACHE_CONFIG.VERSION,
      plugins,
      createdAt: this.cache?.createdAt || now,
      expiresAt,
      lastUpdated: now,
      totalPlugins: plugins.length
    };
    this.saveCache(cache);
  }
  // ==========================================================================
  // Cache Expiration
  // ==========================================================================
  /**
   * Check if cache is expired
   *
   * @returns True if cache is expired or doesn't exist
   */
  isCacheExpired() {
    if (!this.cache) {
      this.cache = this.loadCache();
    }
    if (!this.cache) {
      return true;
    }
    const expiresAt = new Date(this.cache.expiresAt).getTime();
    const now = Date.now();
    return now >= expiresAt;
  }
  /**
   * Clear all cache data
   */
  clearCache() {
    try {
      if (existsSync(this.cacheFile)) {
        unlinkSync(this.cacheFile);
      }
      if (existsSync(this.contentDir)) {
        const files = readdirSync(this.contentDir);
        for (const file of files) {
          const filePath = join(this.contentDir, file);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        }
      }
      this.cache = null;
    } catch (error) {
      throw new Error(`Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // ==========================================================================
  // Plugin Content Caching
  // ==========================================================================
  /**
   * Cache plugin content to disk
   *
   * @param pluginId - Plugin ID
   * @param content - Plugin content (code/template)
   * @returns Path to cached content file
   */
  cachePluginContent(pluginId, content) {
    try {
      this.ensureCacheDir();
      const contentSize = Buffer.byteLength(content, "utf-8");
      if (contentSize > CACHE_CONFIG.MAX_CONTENT_SIZE) {
        throw new Error(`Content size (${contentSize} bytes) exceeds maximum (${CACHE_CONFIG.MAX_CONTENT_SIZE} bytes)`);
      }
      const safeId = this.sanitizeFilename(pluginId);
      const contentPath = join(this.contentDir, `${safeId}.txt`);
      writeFileAtomic(contentPath, content, "utf-8");
      return contentPath;
    } catch (error) {
      throw new Error(`Failed to cache plugin content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Get cached plugin content
   *
   * @param pluginId - Plugin ID
   * @returns Plugin content or null if not cached
   */
  getPluginContent(pluginId) {
    try {
      const safeId = this.sanitizeFilename(pluginId);
      const contentPath = join(this.contentDir, `${safeId}.txt`);
      if (!existsSync(contentPath)) {
        return null;
      }
      return readFileSync(contentPath, "utf-8");
    } catch (error) {
      console.error(`[LocalPluginCache] Failed to read plugin content: ${error}`);
      return null;
    }
  }
  /**
   * Remove cached plugin content
   *
   * @param pluginId - Plugin ID
   * @returns True if content was removed
   */
  removePluginContent(pluginId) {
    try {
      const safeId = this.sanitizeFilename(pluginId);
      const contentPath = join(this.contentDir, `${safeId}.txt`);
      if (existsSync(contentPath)) {
        unlinkSync(contentPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`[LocalPluginCache] Failed to remove plugin content: ${error}`);
      return false;
    }
  }
  // ==========================================================================
  // Cache Statistics
  // ==========================================================================
  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  getCacheStats() {
    if (!this.cache) {
      this.cache = this.loadCache();
    }
    const totalPlugins = this.cache?.totalPlugins || 0;
    const lastUpdated = this.cache?.lastUpdated || null;
    const expiresAt = this.cache?.expiresAt || null;
    const isExpired = this.isCacheExpired();
    let cacheSize = 0;
    let cachedContents = 0;
    try {
      if (existsSync(this.cacheFile)) {
        cacheSize += statSync(this.cacheFile).size;
      }
      if (existsSync(this.contentDir)) {
        const files = readdirSync(this.contentDir);
        for (const file of files) {
          const filePath = join(this.contentDir, file);
          if (existsSync(filePath)) {
            cacheSize += statSync(filePath).size;
            cachedContents++;
          }
        }
      }
    } catch (error) {
      console.error("[LocalPluginCache] Failed to calculate cache size:", error);
    }
    return {
      totalPlugins,
      cacheSize,
      lastUpdated,
      expiresAt,
      isExpired,
      cachedContents
    };
  }
  // ==========================================================================
  // Utility Methods
  // ==========================================================================
  /**
   * Validate cache structure
   *
   * @param cache - Cache to validate
   * @returns True if cache is valid
   */
  isValidCache(cache) {
    return cache && typeof cache === "object" && typeof cache.version === "string" && Array.isArray(cache.plugins) && typeof cache.createdAt === "string" && typeof cache.expiresAt === "string" && typeof cache.lastUpdated === "string" && typeof cache.totalPlugins === "number";
  }
  /**
   * Sanitize filename to prevent path traversal
   *
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  sanitizeFilename(filename) {
    return filename.replace(/[/\\]/g, "_").replace(/[^\w.-]/g, "_").substring(0, 255);
  }
}

const DEFAULT_CLOUD_API_URL = "https://api.claudehome.cn/api/v1/plugins";
const REQUEST_TIMEOUT = 3e4;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1e3;
const CACHE_TTL = 36e5;
class CloudRecommendationClient {
  baseUrl;
  apiKey;
  timeout;
  offlineMode;
  enableLogging;
  maxRetries;
  retryDelay;
  cache;
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_CLOUD_API_URL;
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || REQUEST_TIMEOUT;
    this.offlineMode = options.offlineMode || false;
    this.enableLogging = options.enableLogging || false;
    this.maxRetries = options.maxRetries || MAX_RETRY_ATTEMPTS;
    this.retryDelay = options.retryDelay || RETRY_DELAY;
    this.cache = /* @__PURE__ */ new Map();
  }
  // ==========================================================================
  // Public API Methods
  // ==========================================================================
  /**
   * Get personalized plugin recommendations
   *
   * @param context - Recommendation context with user preferences
   * @returns Recommended plugins with reasons and scores
   *
   * @example
   * ```typescript
   * const recommendations = await client.getRecommendations({
   *   codeToolType: 'claude-code',
   *   language: 'zh-CN',
   *   installedPlugins: ['git-workflow', 'test-runner'],
   *   limit: 10
   * })
   * ```
   */
  async getRecommendations(context) {
    this.log("Getting recommendations with context:", context);
    return this.request("/recommendations", {
      method: "POST",
      body: JSON.stringify(context)
    });
  }
  /**
   * Search plugins with filters and sorting
   *
   * @param params - Search parameters
   * @returns Matching plugins
   *
   * @example
   * ```typescript
   * const results = await client.searchPlugins({
   *   query: 'git',
   *   category: 'workflow',
   *   sortBy: 'downloads',
   *   sortDir: 'desc',
   *   limit: 20
   * })
   * ```
   */
  async searchPlugins(params) {
    this.log("Searching plugins with params:", params);
    return this.request("", {
      method: "GET",
      params
    });
  }
  /**
   * Get detailed information about a specific plugin
   *
   * @param id - Plugin ID
   * @returns Plugin details
   *
   * @example
   * ```typescript
   * const plugin = await client.getPlugin('git-workflow-pro')
   * ```
   */
  async getPlugin(id) {
    this.log("Getting plugin:", id);
    return this.request(`/plugins/${id}`, {
      method: "GET"
    });
  }
  /**
   * Get popular plugins
   *
   * @param limit - Maximum number of plugins to return
   * @returns Popular plugins
   *
   * @example
   * ```typescript
   * const popular = await client.getPopularPlugins(10)
   * ```
   */
  async getPopularPlugins(limit = 10) {
    this.log("Getting popular plugins, limit:", limit);
    return this.request("/popular", {
      method: "GET",
      params: { limit }
    });
  }
  /**
   * Get all plugin categories
   *
   * @returns Category information
   *
   * @example
   * ```typescript
   * const categories = await client.getCategories()
   * ```
   */
  async getCategories() {
    this.log("Getting categories");
    return this.request("/categories", {
      method: "GET"
    });
  }
  /**
   * Download a plugin
   *
   * @param id - Plugin ID
   * @returns Plugin download result with content
   *
   * @example
   * ```typescript
   * const download = await client.downloadPlugin('git-workflow-pro')
   * if (download.success && download.data) {
   *   const content = require('node:buffer').require('node:buffer').require('node:buffer').require('node:buffer').Buffer.from(download.data.content, 'base64')
   *   // Process plugin content
   * }
   * ```
   */
  async downloadPlugin(id) {
    this.log("Downloading plugin:", id);
    return this.request(`/plugins/${id}/download`, {
      method: "GET",
      skipCache: true
      // Always fetch fresh download
    });
  }
  /**
   * Upload a plugin (user contribution)
   *
   * @param plugin - Plugin metadata
   * @param content - Plugin content as Buffer
   * @returns Upload result with plugin ID
   *
   * @example
   * ```typescript
   * const result = await client.uploadPlugin(pluginMetadata, pluginContent)
   * if (result.success && result.data) {
   *   console.log('Plugin uploaded with ID:', result.data.id)
   * }
   * ```
   */
  async uploadPlugin(plugin, content) {
    this.log("Uploading plugin:", plugin.id);
    const payload = {
      plugin,
      content: content.toString("base64")
    };
    return this.request("/plugins/upload", {
      method: "POST",
      body: JSON.stringify(payload),
      skipCache: true
    });
  }
  // ==========================================================================
  // Cache Management
  // ==========================================================================
  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    this.log("Cache cleared");
  }
  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    const keysToDelete = [];
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
    this.log("Expired cache entries cleared");
  }
  /**
   * Set offline mode
   */
  setOfflineMode(enabled) {
    this.offlineMode = enabled;
    this.log("Offline mode:", enabled ? "enabled" : "disabled");
  }
  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================
  /**
   * Make an HTTP request to the cloud service
   */
  async request(endpoint, options = {}) {
    const url = this.buildUrl(endpoint, options.params);
    const cacheKey = `${options.method || "GET"}:${url}`;
    if (!options.skipCache && (options.method === "GET" || !options.method)) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.log("Cache hit:", cacheKey);
        return {
          success: true,
          data: cached,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    }
    if (this.offlineMode) {
      const cached = this.getFromCache(cacheKey);
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
        error: "Offline mode enabled and no cached data available",
        code: "OFFLINE_MODE"
      };
    }
    let lastError = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.log(`Request attempt ${attempt}/${this.maxRetries}:`, url);
        const response = await this.makeRequest(url, options);
        if (response.success && response.data && (options.method === "GET" || !options.method)) {
          this.setCache(cacheKey, response.data, CACHE_TTL);
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
      error: lastError?.message || "Request failed after all retries",
      code: "REQUEST_FAILED"
    };
  }
  /**
   * Make a single HTTP request
   */
  async makeRequest(url, options) {
    const timeout = options.timeout || this.timeout;
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);
    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: this.getHeaders(options.headers),
        body: options.body,
        signal: options.signal || timeoutController.signal
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
      return {
        ...data,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
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
   * Get request headers
   */
  getHeaders(customHeaders) {
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "CCJK-Cloud-Client/1.0",
      ...customHeaders
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }
  /**
   * Get data from cache
   */
  getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  /**
   * Set data in cache
   */
  setCache(key, data, ttl) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
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
      console.log("[CloudRecommendationClient]", ...args);
    }
  }
}

const PROJECT_DETECTORS = [
  {
    type: "nextjs",
    detect: (files, pkg) => files.includes("next.config.js") || files.includes("next.config.mjs") || files.includes("next.config.ts") || pkg?.dependencies?.next || pkg?.devDependencies?.next,
    recommendedCategories: ["dev", "seo", "performance"],
    recommendedTags: ["react", "nextjs", "ssr", "seo", "frontend"],
    priority: 10
  },
  {
    type: "nuxt",
    detect: (files, pkg) => files.includes("nuxt.config.js") || files.includes("nuxt.config.ts") || pkg?.dependencies?.nuxt || pkg?.devDependencies?.nuxt,
    recommendedCategories: ["dev", "seo", "performance"],
    recommendedTags: ["vue", "nuxt", "ssr", "seo", "frontend"],
    priority: 10
  },
  {
    type: "vue",
    detect: (files, pkg) => files.includes("vue.config.js") || files.includes("vite.config.ts") || files.includes("vite.config.js") || pkg?.dependencies?.vue || pkg?.devDependencies?.vue,
    recommendedCategories: ["dev", "testing", "performance"],
    recommendedTags: ["vue", "vite", "frontend", "spa"],
    priority: 9
  },
  {
    type: "react",
    detect: (_files, pkg) => pkg?.dependencies?.react || pkg?.devDependencies?.react,
    recommendedCategories: ["dev", "testing", "performance"],
    recommendedTags: ["react", "frontend", "spa"],
    priority: 9
  },
  {
    type: "angular",
    detect: (files, pkg) => files.includes("angular.json") || pkg?.dependencies?.["@angular/core"] || pkg?.devDependencies?.["@angular/core"],
    recommendedCategories: ["dev", "testing"],
    recommendedTags: ["angular", "frontend", "spa", "typescript"],
    priority: 9
  },
  {
    type: "node-backend",
    detect: (_files, pkg) => {
      const hasBackendFramework = pkg?.dependencies?.express || pkg?.dependencies?.fastify || pkg?.dependencies?.["@nestjs/core"] || pkg?.dependencies?.koa || pkg?.dependencies?.hono;
      const noFrontendFramework = !pkg?.dependencies?.react && !pkg?.dependencies?.vue && !pkg?.dependencies?.next && !pkg?.dependencies?.nuxt;
      return hasBackendFramework && noFrontendFramework;
    },
    recommendedCategories: ["dev", "testing", "devops", "security"],
    recommendedTags: ["nodejs", "backend", "api", "server"],
    priority: 8
  },
  {
    type: "python",
    detect: (files) => files.includes("requirements.txt") || files.includes("pyproject.toml") || files.includes("setup.py") || files.includes("Pipfile"),
    recommendedCategories: ["dev", "ai", "testing"],
    recommendedTags: ["python", "ml", "data", "backend"],
    priority: 8
  },
  {
    type: "django",
    detect: (files, _pkg) => files.includes("manage.py") || files.includes("requirements.txt"),
    recommendedCategories: ["dev", "testing", "security"],
    recommendedTags: ["python", "django", "backend", "web"],
    priority: 9
  },
  {
    type: "fastapi",
    detect: (files) => files.includes("requirements.txt"),
    recommendedCategories: ["dev", "testing", "docs"],
    recommendedTags: ["python", "fastapi", "backend", "api"],
    priority: 8
  },
  {
    type: "rust",
    detect: (files) => files.includes("Cargo.toml"),
    recommendedCategories: ["dev", "testing", "performance"],
    recommendedTags: ["rust", "systems", "performance"],
    priority: 7
  },
  {
    type: "go",
    detect: (files) => files.includes("go.mod"),
    recommendedCategories: ["dev", "testing", "devops"],
    recommendedTags: ["go", "golang", "backend", "microservices"],
    priority: 7
  },
  {
    type: "monorepo",
    detect: (files, pkg) => files.includes("pnpm-workspace.yaml") || files.includes("lerna.json") || files.includes("nx.json") || pkg?.workspaces != null,
    recommendedCategories: ["dev", "devops", "testing"],
    recommendedTags: ["monorepo", "workspace", "tooling"],
    priority: 6
  },
  {
    type: "docker",
    detect: (files) => files.includes("Dockerfile") || files.includes("docker-compose.yml"),
    recommendedCategories: ["devops", "testing"],
    recommendedTags: ["docker", "containers", "deployment"],
    priority: 5
  },
  {
    type: "typescript",
    detect: (files) => files.includes("tsconfig.json"),
    recommendedCategories: ["dev", "testing"],
    recommendedTags: ["typescript", "types", "tooling"],
    priority: 4
  }
];
class RecommendationEngine {
  cloudClient;
  cache;
  /**
   * Create a new recommendation engine
   *
   * @param cloudClient - Client for fetching cloud recommendations
   * @param cache - Local plugin cache
   */
  constructor(cloudClient, cache) {
    this.cloudClient = cloudClient;
    this.cache = cache;
  }
  /**
   * Get plugin recommendations for a project
   *
   * Analyzes the project and returns personalized plugin recommendations
   * with scoring, reasoning, and confidence levels.
   *
   * @param projectPath - Path to project directory (defaults to cwd)
   * @returns Recommendation result with scored plugins
   */
  async getRecommendations(projectPath) {
    const context = await this.detectProjectContext(projectPath || process__default.cwd());
    let recommendations = [];
    let source = "local";
    try {
      const cloudResult = await this.cloudClient.getRecommendations({
        codeToolType: "claude-code",
        language: context.language,
        installedPlugins: context.existingPlugins,
        limit: 20
      });
      if (cloudResult.success && cloudResult.data) {
        recommendations = cloudResult.data.plugins.map((plugin) => ({
          plugin,
          score: cloudResult.data.scores[plugin.id] || 50,
          reason: {
            "en": cloudResult.data.reasons[plugin.id] || "Recommended by cloud service",
            "zh-CN": cloudResult.data.reasons[plugin.id] || "\u4E91\u670D\u52A1\u63A8\u8350"
          },
          confidence: (cloudResult.data.scores[plugin.id] || 50) / 100,
          matchingTags: [],
          matchingCategories: [],
          isInstalled: context.existingPlugins?.includes(plugin.id) || false
        }));
        source = "cloud";
      }
    } catch {
      console.warn("Cloud recommendations unavailable, using local cache");
    }
    if (recommendations.length === 0) {
      const localResult = this.getLocalRecommendations(context);
      recommendations = localResult.recommendations;
      source = "local";
    }
    if (source === "cloud") {
      const localResult = this.getLocalRecommendations(context);
      recommendations = this.mergeRecommendations(
        { recommendations, context, totalEvaluated: 0, source: "cloud", timestamp: "" },
        localResult
      ).recommendations;
      source = "hybrid";
    }
    recommendations = this.filterInstalledPlugins(recommendations);
    recommendations.sort((a, b) => b.score - a.score);
    return {
      recommendations,
      context,
      totalEvaluated: recommendations.length,
      source,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Detect project context from directory
   *
   * Analyzes project files and structure to determine frameworks,
   * languages, tools, and recommended plugin categories.
   *
   * @param projectPath - Path to project directory
   * @returns Project context for recommendations
   */
  async detectProjectContext(projectPath) {
    const projectInfo = detectProject(projectPath);
    const files = existsSync(projectPath) ? readdirSync(projectPath) : [];
    let packageJson;
    try {
      const pkgPath = join(projectPath, "package.json");
      if (existsSync(pkgPath)) {
        packageJson = JSON.parse(readFileSync(pkgPath, "utf-8"));
      }
    } catch {
    }
    let detectedType;
    const recommendedCategories = [];
    const recommendedTags = [];
    const sortedDetectors = [...PROJECT_DETECTORS].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );
    for (const detector of sortedDetectors) {
      if (detector.detect(files, packageJson)) {
        if (!detectedType) {
          detectedType = detector.type;
        }
        recommendedCategories.push(...detector.recommendedCategories);
        recommendedTags.push(...detector.recommendedTags);
      }
    }
    const existingPlugins = [];
    return {
      projectType: detectedType || projectInfo.type,
      language: projectInfo.languages[0],
      frameworks: projectInfo.frameworks,
      languages: projectInfo.languages,
      buildTools: projectInfo.buildTools,
      testFrameworks: projectInfo.testFrameworks,
      hasTypeScript: projectInfo.hasTypeScript,
      hasDocker: projectInfo.hasDocker,
      hasMonorepo: projectInfo.hasMonorepo,
      packageManager: projectInfo.packageManager,
      cicd: projectInfo.cicd,
      rootDir: projectPath,
      recommendedCategories: [...new Set(recommendedCategories)],
      recommendedTags: [...new Set(recommendedTags)],
      existingPlugins
    };
  }
  /**
   * Generate local recommendations without cloud service
   *
   * Uses cached plugins and project context to generate recommendations
   * entirely offline.
   *
   * @param context - Project context
   * @returns Local recommendation result
   */
  getLocalRecommendations(context) {
    const allPlugins = this.cache.getCachedPlugins();
    const recommendations = [];
    for (const plugin of allPlugins) {
      const score = this.calculateRelevanceScore(plugin, context);
      if (score > 0) {
        const matchingTags = this.getMatchingTags(plugin, context);
        const matchingCategories = this.getMatchingCategories(plugin, context);
        const confidence = this.calculateConfidence(score, matchingTags.length, matchingCategories.length);
        const isInstalled = context.existingPlugins?.includes(plugin.id) || false;
        recommendations.push({
          plugin,
          score,
          reason: this.generateReason(plugin, context, matchingTags, matchingCategories),
          confidence,
          matchingTags,
          matchingCategories,
          isInstalled
        });
      }
    }
    return {
      recommendations: recommendations.sort((a, b) => b.score - a.score),
      context,
      totalEvaluated: allPlugins.length,
      source: "local",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Merge cloud and local recommendations
   *
   * Combines recommendations from both sources, deduplicates,
   * and re-scores based on combined signals.
   *
   * @param cloud - Cloud recommendations
   * @param local - Local recommendations
   * @returns Merged recommendation result
   */
  mergeRecommendations(cloud, local) {
    const merged = /* @__PURE__ */ new Map();
    for (const rec of cloud.recommendations) {
      merged.set(rec.plugin.id, rec);
    }
    for (const rec of local.recommendations) {
      const existing = merged.get(rec.plugin.id);
      if (existing) {
        existing.score = Math.round((existing.score + rec.score) / 2);
        existing.confidence = Math.max(existing.confidence, rec.confidence);
        existing.matchingTags = [.../* @__PURE__ */ new Set([...existing.matchingTags, ...rec.matchingTags])];
        existing.matchingCategories = [.../* @__PURE__ */ new Set([...existing.matchingCategories, ...rec.matchingCategories])];
      } else {
        merged.set(rec.plugin.id, rec);
      }
    }
    return {
      recommendations: Array.from(merged.values()).sort((a, b) => b.score - a.score),
      context: cloud.context,
      totalEvaluated: cloud.totalEvaluated + local.totalEvaluated,
      source: "hybrid",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Filter out already installed plugins
   *
   * @param recommendations - Plugin recommendations
   * @returns Filtered recommendations (non-installed only)
   */
  filterInstalledPlugins(recommendations) {
    return recommendations.filter((rec) => !rec.isInstalled);
  }
  /**
   * Calculate relevance score for a plugin
   *
   * Scores are based on:
   * - Category match (40 points)
   * - Tag match (30 points)
   * - Framework match (20 points)
   * - Language match (10 points)
   *
   * @param plugin - Plugin to score
   * @param context - Project context
   * @returns Relevance score (0-100)
   */
  calculateRelevanceScore(plugin, context) {
    let score = 0;
    if (context.recommendedCategories?.includes(plugin.category)) {
      score += 40;
    }
    const matchingTags = this.getMatchingTags(plugin, context);
    score += Math.min(matchingTags.length * 5, 30);
    if (context.frameworks) {
      for (const framework of context.frameworks) {
        if (plugin.tags.some((tag) => tag.toLowerCase().includes(framework.toLowerCase()))) {
          score += 10;
        }
      }
      score = Math.min(score, 60);
    }
    if (context.languages) {
      for (const lang of context.languages) {
        if (plugin.tags.some((tag) => tag.toLowerCase().includes(lang.toLowerCase()))) {
          score += 10;
          break;
        }
      }
    }
    return Math.min(score, 100);
  }
  /**
   * Get matching tags between plugin and context
   *
   * @param plugin - Plugin to check
   * @param context - Project context
   * @returns Array of matching tags
   */
  getMatchingTags(plugin, context) {
    const contextTags = context.recommendedTags || [];
    return plugin.tags.filter(
      (tag) => contextTags.some((ctag) => ctag.toLowerCase() === tag.toLowerCase())
    );
  }
  /**
   * Get matching categories between plugin and context
   *
   * @param plugin - Plugin to check
   * @param context - Project context
   * @returns Array of matching categories
   */
  getMatchingCategories(plugin, context) {
    const contextCategories = context.recommendedCategories || [];
    return contextCategories.includes(plugin.category) ? [plugin.category] : [];
  }
  /**
   * Calculate confidence level for recommendation
   *
   * Confidence is based on:
   * - Number of matching signals
   * - Score magnitude
   * - Plugin popularity (downloads, rating)
   *
   * @param score - Relevance score
   * @param matchingTagsCount - Number of matching tags
   * @param matchingCategoriesCount - Number of matching categories
   * @returns Confidence level (0-1)
   */
  calculateConfidence(score, matchingTagsCount, matchingCategoriesCount) {
    let confidence = score / 100;
    const signalCount = matchingTagsCount + matchingCategoriesCount;
    if (signalCount >= 3) {
      confidence += 0.1;
    }
    if (signalCount >= 5) {
      confidence += 0.1;
    }
    return Math.min(confidence, 1);
  }
  /**
   * Generate localized recommendation reason
   *
   * Creates human-readable explanation for why a plugin is recommended.
   *
   * @param _plugin - Recommended plugin (unused, reserved for future use)
   * @param context - Project context
   * @param matchingTags - Matching tags
   * @param matchingCategories - Matching categories
   * @returns Localized reason strings
   */
  generateReason(_plugin, context, matchingTags, matchingCategories) {
    const reasons = {
      "en": "",
      "zh-CN": ""
    };
    const reasonParts = { "en": [], "zh-CN": [] };
    if (context.projectType) {
      reasonParts.en.push(`Recommended for ${context.projectType} projects`);
      reasonParts["zh-CN"].push(`\u63A8\u8350\u7528\u4E8E ${context.projectType} \u9879\u76EE`);
    }
    if (matchingCategories.length > 0) {
      const categoryNames = matchingCategories.join(", ");
      reasonParts.en.push(`Matches ${categoryNames} category`);
      reasonParts["zh-CN"].push(`\u5339\u914D ${categoryNames} \u7C7B\u522B`);
    }
    if (matchingTags.length > 0) {
      const tagList = matchingTags.slice(0, 3).join(", ");
      reasonParts.en.push(`Relevant tags: ${tagList}`);
      reasonParts["zh-CN"].push(`\u76F8\u5173\u6807\u7B7E: ${tagList}`);
    }
    if (context.frameworks && context.frameworks.length > 0) {
      const frameworks = context.frameworks.slice(0, 2).join(", ");
      reasonParts.en.push(`Works with ${frameworks}`);
      reasonParts["zh-CN"].push(`\u9002\u7528\u4E8E ${frameworks}`);
    }
    reasons.en = reasonParts.en.join(". ");
    reasons["zh-CN"] = reasonParts["zh-CN"].join("\u3002");
    if (!reasons.en) {
      reasons.en = "General purpose plugin for your project";
      reasons["zh-CN"] = "\u9002\u7528\u4E8E\u60A8\u9879\u76EE\u7684\u901A\u7528\u63D2\u4EF6";
    }
    return reasons;
  }
  /**
   * Get recommendations based on tags
   *
   * @param tags - Tags to match
   * @returns Matching plugins
   */
  getTagBasedRecommendations(tags) {
    const allPlugins = this.cache.getCachedPlugins();
    return allPlugins.filter(
      (plugin) => tags.some((tag) => plugin.tags.includes(tag))
    );
  }
  /**
   * Get recommendations based on category
   *
   * @param category - Category to match
   * @returns Matching plugins
   */
  getCategoryBasedRecommendations(category) {
    const allPlugins = this.cache.getCachedPlugins();
    return allPlugins.filter((plugin) => plugin.category === category);
  }
}

let managerInstance = null;
function getCloudPluginManager() {
  if (!managerInstance) {
    managerInstance = new CloudPluginManager();
  }
  return managerInstance;
}
class CloudPluginManager {
  client;
  cache;
  engine;
  constructor() {
    this.ensureDirectories();
    this.client = new CloudRecommendationClient();
    this.cache = new LocalPluginCache();
    this.engine = new RecommendationEngine(this.client, this.cache);
  }
  /**
   * Ensure all required directories exist
   */
  ensureDirectories() {
    const dirs = [
      CCJK_CLOUD_PLUGINS_DIR,
      CCJK_CLOUD_PLUGINS_CACHE_DIR,
      CCJK_CLOUD_PLUGINS_INSTALLED_DIR
    ];
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }
  /**
   * Get plugin recommendations for current project
   */
  async getRecommendations(projectPath) {
    return this.engine.getRecommendations(projectPath);
  }
  /**
   * Search for plugins
   */
  async searchPlugins(params) {
    const cloudResult = await this.client.searchPlugins(params);
    if (cloudResult.success && cloudResult.data) {
      this.cache.updateCache(cloudResult.data);
      return cloudResult;
    }
    const cachedPlugins = this.cache.getCachedPlugins();
    let filtered = cachedPlugins;
    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.en.toLowerCase().includes(query) || p.name["zh-CN"].toLowerCase().includes(query) || p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    if (params.category) {
      filtered = filtered.filter((p) => p.category === params.category);
    }
    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter(
        (p) => params.tags.some((tag) => p.tags.includes(tag))
      );
    }
    if (params.sortBy) {
      filtered.sort((a, b) => {
        const order = params.order === "asc" ? 1 : -1;
        switch (params.sortBy) {
          case "downloads":
            return (a.downloads - b.downloads) * order;
          case "rating":
            return (a.rating - b.rating) * order;
          case "updated":
            return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * order;
          case "name":
            return a.name.en.localeCompare(b.name.en) * order;
          default:
            return 0;
        }
      });
    }
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);
    return {
      success: true,
      data: paged
    };
  }
  /**
   * Get plugin details
   */
  async getPlugin(id) {
    const cloudResult = await this.client.getPlugin(id);
    if (cloudResult.success && cloudResult.data) {
      return cloudResult;
    }
    const cached = this.cache.getCachedPlugin(id);
    if (cached) {
      return { success: true, data: cached };
    }
    return {
      success: false,
      error: i18n.t("cloudPlugins.errors.notFound")
    };
  }
  /**
   * Get popular plugins
   */
  async getPopularPlugins(limit = 10) {
    const cloudResult = await this.client.getPopularPlugins(limit);
    if (cloudResult.success && cloudResult.data) {
      this.cache.updateCache(cloudResult.data);
      return cloudResult;
    }
    const cached = this.cache.getCachedPlugins().sort((a, b) => b.downloads - a.downloads).slice(0, limit);
    return { success: true, data: cached };
  }
  /**
   * Get plugin categories
   */
  async getCategories() {
    return this.client.getCategories();
  }
  /**
   * Install a plugin
   */
  async installPlugin(id, options = {}) {
    const installDir = join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, id);
    if (existsSync(installDir) && !options.force) {
      return {
        pluginId: id,
        success: false,
        error: "Plugin already installed. Use --force to reinstall."
      };
    }
    if (options.dryRun) {
      return {
        pluginId: id,
        success: true,
        installedPath: installDir
      };
    }
    try {
      const pluginResult = await this.getPlugin(id);
      if (!pluginResult.success || !pluginResult.data) {
        return {
          pluginId: id,
          success: false,
          error: pluginResult.error || "Plugin not found"
        };
      }
      const plugin = pluginResult.data;
      const downloadResult = await this.client.downloadPlugin(id);
      if (!downloadResult.success || !downloadResult.data) {
        return {
          pluginId: id,
          success: false,
          error: downloadResult.error || "Failed to download plugin"
        };
      }
      if (existsSync(installDir)) {
        rmSync(installDir, { recursive: true });
      }
      mkdirSync(installDir, { recursive: true });
      writeFileAtomic(
        join(installDir, "plugin.json"),
        JSON.stringify(plugin, null, 2)
      );
      const content = Buffer.from(downloadResult.data.content, "base64").toString("utf-8");
      writeFileAtomic(join(installDir, "content.json"), content);
      const installedDeps = [];
      if (!options.skipDependencies && plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          const depResult = await this.installPlugin(dep, { skipDependencies: true });
          if (depResult.success) {
            installedDeps.push(dep);
          }
        }
      }
      return {
        pluginId: id,
        success: true,
        installedPath: installDir,
        dependencies: installedDeps
      };
    } catch (error) {
      return {
        pluginId: id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(id) {
    const installDir = join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, id);
    if (!existsSync(installDir)) {
      return {
        pluginId: id,
        success: false,
        error: "Plugin not installed"
      };
    }
    try {
      rmSync(installDir, { recursive: true });
      return {
        pluginId: id,
        success: true
      };
    } catch (error) {
      return {
        pluginId: id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Get installed plugins
   */
  getInstalledPlugins() {
    if (!existsSync(CCJK_CLOUD_PLUGINS_INSTALLED_DIR)) {
      return [];
    }
    const plugins = [];
    const dirs = readdirSync(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    for (const dir of dirs) {
      const metaPath = join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, dir, "plugin.json");
      if (existsSync(metaPath)) {
        try {
          const plugin = JSON.parse(readFileSync(metaPath, "utf-8"));
          plugins.push(plugin);
        } catch {
        }
      }
    }
    return plugins;
  }
  /**
   * Check if a plugin is installed
   */
  isPluginInstalled(id) {
    const installDir = join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, id);
    return existsSync(join(installDir, "plugin.json"));
  }
  /**
   * Update installed plugins
   */
  async updatePlugins(ids) {
    const installed = this.getInstalledPlugins();
    const toUpdate = ids ? installed.filter((p) => ids.includes(p.id)) : installed;
    const results = [];
    for (const plugin of toUpdate) {
      const cloudResult = await this.getPlugin(plugin.id);
      if (cloudResult.success && cloudResult.data) {
        const cloudPlugin = cloudResult.data;
        if (cloudPlugin.version !== plugin.version) {
          const result = await this.installPlugin(plugin.id, { force: true });
          results.push(result);
        } else {
          results.push({
            pluginId: plugin.id,
            success: true,
            installedPath: join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, plugin.id)
          });
        }
      }
    }
    return results;
  }
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getCacheStats();
  }
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clearCache();
  }
  /**
   * Refresh cache from cloud
   */
  async refreshCache() {
    const result = await this.client.getPopularPlugins(100);
    if (result.success && result.data) {
      this.cache.updateCache(result.data);
    }
  }
  /**
   * Get plugin info (alias for getPlugin with simplified return)
   */
  async getPluginInfo(id) {
    const result = await this.getPlugin(id);
    return result.success && result.data ? result.data : null;
  }
  /**
   * Get featured/popular plugins
   */
  async getFeaturedPlugins(limit = 10) {
    const result = await this.getPopularPlugins(limit);
    return result.success && result.data ? result.data : [];
  }
  /**
   * Update a single plugin
   */
  async updatePlugin(id) {
    if (!this.isPluginInstalled(id)) {
      return {
        success: false,
        pluginId: id,
        updated: false,
        error: "Plugin not installed"
      };
    }
    const installDir = join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, id);
    const metaPath = join(installDir, "plugin.json");
    let currentVersion = "0.0.0";
    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
      currentVersion = meta.version || "0.0.0";
    } catch {
    }
    const cloudResult = await this.getPlugin(id);
    if (!cloudResult.success || !cloudResult.data) {
      return {
        success: false,
        pluginId: id,
        updated: false,
        error: cloudResult.error || "Failed to fetch plugin info"
      };
    }
    const cloudPlugin = cloudResult.data;
    if (cloudPlugin.version === currentVersion) {
      return {
        success: true,
        pluginId: id,
        updated: false,
        oldVersion: currentVersion,
        newVersion: currentVersion
      };
    }
    const installResult = await this.installPlugin(id, { force: true });
    if (!installResult.success) {
      return {
        success: false,
        pluginId: id,
        updated: false,
        error: installResult.error
      };
    }
    return {
      success: true,
      pluginId: id,
      updated: true,
      oldVersion: currentVersion,
      newVersion: cloudPlugin.version
    };
  }
  /**
   * Update all installed plugins
   */
  async updateAllPlugins() {
    const installed = this.getInstalledPlugins();
    const results = [];
    for (const plugin of installed) {
      const result = await this.updatePlugin(plugin.id);
      results.push(result);
    }
    return results;
  }
}

function getPluginName(plugin) {
  const lang = i18n.language;
  return plugin.name[lang] || plugin.name.en || plugin.id;
}
function getPluginDescription(plugin) {
  const lang = i18n.language;
  return plugin.description[lang] || plugin.description.en || "";
}
async function pluginCommand(action = "list", args = [], options = {}) {
  const isZh = i18n.language === "zh-CN";
  try {
    switch (action) {
      case "list":
      case "ls":
      case "l":
        await listPlugins(options);
        break;
      case "install":
      case "i":
      case "add":
        if (args.length === 0) {
          console.log(ansis.red(isZh ? "\u274C \u8BF7\u6307\u5B9A\u8981\u5B89\u88C5\u7684\u63D2\u4EF6 ID" : "\u274C Please specify a plugin ID to install"));
          console.log(ansis.gray(isZh ? "\u7528\u6CD5: /plugin install <plugin-id>" : "Usage: /plugin install <plugin-id>"));
          process__default.exit(1);
        }
        await installPlugin(args[0], options);
        break;
      case "uninstall":
      case "remove":
      case "rm":
        if (args.length === 0) {
          console.log(ansis.red(isZh ? "\u274C \u8BF7\u6307\u5B9A\u8981\u5378\u8F7D\u7684\u63D2\u4EF6 ID" : "\u274C Please specify a plugin ID to uninstall"));
          console.log(ansis.gray(isZh ? "\u7528\u6CD5: /plugin uninstall <plugin-id>" : "Usage: /plugin uninstall <plugin-id>"));
          process__default.exit(1);
        }
        await uninstallPlugin(args[0]);
        break;
      case "search":
      case "s":
      case "find":
        if (args.length === 0) {
          console.log(ansis.red(isZh ? "\u274C \u8BF7\u6307\u5B9A\u641C\u7D22\u5173\u952E\u8BCD" : "\u274C Please specify a search query"));
          console.log(ansis.gray(isZh ? "\u7528\u6CD5: /plugin search <\u5173\u952E\u8BCD>" : "Usage: /plugin search <query>"));
          process__default.exit(1);
        }
        await searchPlugins(args.join(" "), options);
        break;
      case "info":
      case "show":
      case "details":
        if (args.length === 0) {
          console.log(ansis.red(isZh ? "\u274C \u8BF7\u6307\u5B9A\u63D2\u4EF6 ID" : "\u274C Please specify a plugin ID"));
          console.log(ansis.gray(isZh ? "\u7528\u6CD5: /plugin info <plugin-id>" : "Usage: /plugin info <plugin-id>"));
          process__default.exit(1);
        }
        await showPluginInfo(args[0]);
        break;
      case "update":
      case "upgrade":
        await updatePlugins(args[0]);
        break;
      case "categories":
      case "cats":
        await listCategories();
        break;
      case "featured":
      case "popular":
      case "trending":
        await showFeaturedPlugins();
        break;
      case "help":
      case "h":
      case "?":
        showHelp();
        break;
      default:
        console.log(ansis.red(isZh ? `\u274C \u672A\u77E5\u547D\u4EE4: ${action}` : `\u274C Unknown command: ${action}`));
        showHelp();
        process__default.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(ansis.red(`
\u274C ${isZh ? "\u9519\u8BEF" : "Error"}: ${errorMessage}`));
    if (options.verbose) {
      console.error(error);
    }
    process__default.exit(1);
  }
}
async function listPlugins(options) {
  const isZh = i18n.language === "zh-CN";
  const manager = getCloudPluginManager();
  console.log(ansis.green.bold(`
\u{1F4E6} ${isZh ? "\u5DF2\u5B89\u88C5\u7684\u63D2\u4EF6" : "Installed Plugins"}
`));
  const installed = manager.getInstalledPlugins();
  if (installed.length === 0) {
    console.log(ansis.gray(isZh ? "\u6682\u65E0\u5DF2\u5B89\u88C5\u7684\u63D2\u4EF6" : "No plugins installed"));
    console.log(ansis.gray(`
\u{1F4A1} ${isZh ? "\u4F7F\u7528 /plugin search <\u5173\u952E\u8BCD> \u641C\u7D22\u63D2\u4EF6" : "Use /plugin search <query> to find plugins"}`));
    return;
  }
  for (const plugin of installed) {
    console.log(`  ${ansis.green("\u25CF")} ${ansis.bold(getPluginName(plugin))} ${ansis.gray(`v${plugin.version}`)}`);
    console.log(`    ${ansis.gray(getPluginDescription(plugin))}`);
    if (options.verbose && plugin.author) {
      console.log(`    ${ansis.gray(`by ${plugin.author}`)}`);
    }
    console.log("");
  }
  console.log(ansis.gray(`${isZh ? "\u5171" : "Total"} ${installed.length} ${isZh ? "\u4E2A\u63D2\u4EF6" : "plugins"}`));
}
async function installPlugin(pluginId, options) {
  const isZh = i18n.language === "zh-CN";
  const manager = getCloudPluginManager();
  console.log(ansis.green(`
\u23F3 ${isZh ? "\u6B63\u5728\u83B7\u53D6\u63D2\u4EF6\u4FE1\u606F..." : "Fetching plugin info..."}`));
  const pluginInfo = await manager.getPluginInfo(pluginId);
  if (!pluginInfo) {
    console.log(ansis.red(`
\u274C ${isZh ? "\u63D2\u4EF6\u672A\u627E\u5230" : "Plugin not found"}: ${pluginId}`));
    console.log(ansis.gray(`
\u{1F4A1} ${isZh ? "\u4F7F\u7528 /plugin search <\u5173\u952E\u8BCD> \u641C\u7D22\u53EF\u7528\u63D2\u4EF6" : "Use /plugin search <query> to find available plugins"}`));
    const searchResult = await manager.searchPlugins({ query: pluginId, pageSize: 3 });
    if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
      console.log(ansis.yellow(`
${isZh ? "\u60A8\u662F\u5426\u5728\u627E:" : "Did you mean:"}`));
      for (const p of searchResult.data) {
        console.log(`  - ${ansis.green(p.id)} - ${getPluginName(p)}`);
      }
    }
    process__default.exit(1);
  }
  const isInstalled = manager.isPluginInstalled(pluginId);
  if (isInstalled && !options.force) {
    console.log(ansis.yellow(`
\u26A0\uFE0F ${isZh ? "\u63D2\u4EF6\u5DF2\u5B89\u88C5" : "Plugin already installed"}: ${getPluginName(pluginInfo)}`));
    console.log(ansis.gray(`\u{1F4A1} ${isZh ? "\u4F7F\u7528 --force \u5F3A\u5236\u91CD\u65B0\u5B89\u88C5" : "Use --force to reinstall"}`));
    return;
  }
  console.log(ansis.green.bold(`
\u{1F4E6} ${getPluginName(pluginInfo)}`));
  console.log(ansis.gray(`   ${getPluginDescription(pluginInfo)}`));
  console.log(ansis.gray(`   ${isZh ? "\u7248\u672C" : "Version"}: ${pluginInfo.version}`));
  if (pluginInfo.author) {
    console.log(ansis.gray(`   ${isZh ? "\u4F5C\u8005" : "Author"}: ${pluginInfo.author}`));
  }
  console.log("");
  console.log(ansis.green(`\u23F3 ${isZh ? "\u6B63\u5728\u5B89\u88C5..." : "Installing..."}`));
  const result = await manager.installPlugin(pluginId, {
    force: options.force
  });
  if (result.success) {
    console.log(ansis.green(`
\u2705 ${isZh ? "\u5B89\u88C5\u6210\u529F" : "Installation successful"}!`));
    console.log(ansis.gray(`   ${isZh ? "\u8DEF\u5F84" : "Path"}: ${result.installedPath}`));
    if (result.dependencies && result.dependencies.length > 0) {
      console.log(ansis.gray(`   ${isZh ? "\u4F9D\u8D56" : "Dependencies"}: ${result.dependencies.join(", ")}`));
    }
  } else {
    console.log(ansis.red(`
\u274C ${isZh ? "\u5B89\u88C5\u5931\u8D25" : "Installation failed"}: ${result.error}`));
    process__default.exit(1);
  }
}
async function uninstallPlugin(pluginId) {
  const isZh = i18n.language === "zh-CN";
  const manager = getCloudPluginManager();
  const isInstalled = manager.isPluginInstalled(pluginId);
  if (!isInstalled) {
    console.log(ansis.yellow(`
\u26A0\uFE0F ${isZh ? "\u63D2\u4EF6\u672A\u5B89\u88C5" : "Plugin not installed"}: ${pluginId}`));
    return;
  }
  console.log(ansis.green(`
\u23F3 ${isZh ? "\u6B63\u5728\u5378\u8F7D..." : "Uninstalling..."}`));
  const result = await manager.uninstallPlugin(pluginId);
  if (result.success) {
    console.log(ansis.green(`
\u2705 ${isZh ? "\u5378\u8F7D\u6210\u529F" : "Uninstallation successful"}!`));
  } else {
    console.log(ansis.red(`
\u274C ${isZh ? "\u5378\u8F7D\u5931\u8D25" : "Uninstallation failed"}: ${result.error}`));
    process__default.exit(1);
  }
}
async function searchPlugins(query, options) {
  const isZh = i18n.language === "zh-CN";
  const manager = getCloudPluginManager();
  console.log(ansis.green(`
\u{1F50D} ${isZh ? "\u641C\u7D22" : "Searching"}: "${query}"
`));
  const result = await manager.searchPlugins({ query, pageSize: 20 });
  if (!result.success || !result.data || result.data.length === 0) {
    console.log(ansis.yellow(isZh ? "\u672A\u627E\u5230\u5339\u914D\u7684\u63D2\u4EF6" : "No plugins found"));
    console.log(ansis.gray(`
\u{1F4A1} ${isZh ? "\u5C1D\u8BD5\u4F7F\u7528\u4E0D\u540C\u7684\u5173\u952E\u8BCD" : "Try different keywords"}`));
    return;
  }
  console.log(ansis.bold(isZh ? "\u641C\u7D22\u7ED3\u679C:" : "Search Results:"));
  console.log("");
  for (const plugin of result.data) {
    const installed = manager.isPluginInstalled(plugin.id);
    const statusIcon = installed ? ansis.green("\u25CF") : ansis.gray("\u25CB");
    console.log(`  ${statusIcon} ${ansis.bold(getPluginName(plugin))} ${ansis.gray(`(${plugin.id})`)} ${ansis.gray(`v${plugin.version}`)}`);
    console.log(`    ${ansis.gray(getPluginDescription(plugin))}`);
    if (options.verbose) {
      if (plugin.downloads) {
        console.log(`    ${ansis.gray(`\u2B07\uFE0F ${plugin.downloads.toLocaleString()} downloads`)}`);
      }
      if (plugin.rating) {
        console.log(`    ${ansis.gray(`\u2B50 ${plugin.rating.toFixed(1)}`)}`);
      }
    }
    console.log("");
  }
  console.log(ansis.gray(`${isZh ? "\u5171\u627E\u5230" : "Found"} ${result.data.length} ${isZh ? "\u4E2A\u63D2\u4EF6" : "plugins"}`));
  console.log(ansis.gray(`
\u{1F4A1} ${isZh ? "\u4F7F\u7528 /plugin install <id> \u5B89\u88C5\u63D2\u4EF6" : "Use /plugin install <id> to install a plugin"}`));
}
async function showPluginInfo(pluginId) {
  const isZh = i18n.language === "zh-CN";
  const manager = getCloudPluginManager();
  const plugin = await manager.getPluginInfo(pluginId);
  if (!plugin) {
    console.log(ansis.red(`
\u274C ${isZh ? "\u63D2\u4EF6\u672A\u627E\u5230" : "Plugin not found"}: ${pluginId}`));
    process__default.exit(1);
  }
  const installed = manager.isPluginInstalled(pluginId);
  console.log(ansis.green.bold(`
\u{1F4E6} ${getPluginName(plugin)}`));
  console.log(ansis.dim("\u2500".repeat(50)));
  console.log(`${ansis.bold(isZh ? "\u63CF\u8FF0" : "Description")}: ${getPluginDescription(plugin)}`);
  console.log(`${ansis.bold("ID")}: ${plugin.id}`);
  console.log(`${ansis.bold(isZh ? "\u7248\u672C" : "Version")}: ${plugin.version}`);
  console.log(`${ansis.bold(isZh ? "\u72B6\u6001" : "Status")}: ${installed ? ansis.green(isZh ? "\u5DF2\u5B89\u88C5" : "Installed") : ansis.gray(isZh ? "\u672A\u5B89\u88C5" : "Not installed")}`);
  if (plugin.author) {
    console.log(`${ansis.bold(isZh ? "\u4F5C\u8005" : "Author")}: ${plugin.author}`);
  }
  if (plugin.category) {
    console.log(`${ansis.bold(isZh ? "\u5206\u7C7B" : "Category")}: ${plugin.category}`);
  }
  if (plugin.tags && plugin.tags.length > 0) {
    console.log(`${ansis.bold(isZh ? "\u6807\u7B7E" : "Tags")}: ${plugin.tags.join(", ")}`);
  }
  if (plugin.downloads) {
    console.log(`${ansis.bold(isZh ? "\u4E0B\u8F7D\u91CF" : "Downloads")}: ${plugin.downloads.toLocaleString()}`);
  }
  if (plugin.rating) {
    console.log(`${ansis.bold(isZh ? "\u8BC4\u5206" : "Rating")}: \u2B50 ${plugin.rating.toFixed(1)}`);
  }
  console.log(ansis.dim("\u2500".repeat(50)));
  if (!installed) {
    console.log(ansis.gray(`
\u{1F4A1} ${isZh ? "\u4F7F\u7528 /plugin install" : "Use /plugin install"} ${pluginId} ${isZh ? "\u5B89\u88C5\u6B64\u63D2\u4EF6" : "to install this plugin"}`));
  }
}
async function updatePlugins(pluginId) {
  const isZh = i18n.language === "zh-CN";
  const manager = getCloudPluginManager();
  if (pluginId) {
    console.log(ansis.green(`
\u23F3 ${isZh ? "\u6B63\u5728\u66F4\u65B0" : "Updating"} ${pluginId}...`));
    const result = await manager.updatePlugin(pluginId);
    if (result.success) {
      if (result.updated) {
        console.log(ansis.green(`
\u2705 ${isZh ? "\u66F4\u65B0\u6210\u529F" : "Update successful"}! ${result.oldVersion} \u2192 ${result.newVersion}`));
      } else {
        console.log(ansis.gray(`
\u2713 ${isZh ? "\u5DF2\u662F\u6700\u65B0\u7248\u672C" : "Already up to date"}`));
      }
    } else {
      console.log(ansis.red(`
\u274C ${isZh ? "\u66F4\u65B0\u5931\u8D25" : "Update failed"}: ${result.error}`));
      process__default.exit(1);
    }
  } else {
    console.log(ansis.green(`
\u23F3 ${isZh ? "\u6B63\u5728\u68C0\u67E5\u66F4\u65B0..." : "Checking for updates..."}`));
    const results = await manager.updateAllPlugins();
    let updatedCount = 0;
    for (const result of results) {
      if (result.success && result.updated) {
        console.log(ansis.green(`  \u2705 ${result.pluginId}: ${result.oldVersion} \u2192 ${result.newVersion}`));
        updatedCount++;
      }
    }
    if (updatedCount === 0) {
      console.log(ansis.gray(`
\u2713 ${isZh ? "\u6240\u6709\u63D2\u4EF6\u5DF2\u662F\u6700\u65B0\u7248\u672C" : "All plugins are up to date"}`));
    } else {
      console.log(ansis.green(`
\u2705 ${isZh ? "\u5DF2\u66F4\u65B0" : "Updated"} ${updatedCount} ${isZh ? "\u4E2A\u63D2\u4EF6" : "plugins"}`));
    }
  }
}
async function listCategories() {
  const isZh = i18n.language === "zh-CN";
  const manager = getCloudPluginManager();
  console.log(ansis.green.bold(`
\u{1F4C2} ${isZh ? "\u63D2\u4EF6\u5206\u7C7B" : "Plugin Categories"}
`));
  const result = await manager.getCategories();
  if (!result.success || !result.data || result.data.length === 0) {
    console.log(ansis.gray(isZh ? "\u6682\u65E0\u5206\u7C7B\u4FE1\u606F" : "No categories available"));
    return;
  }
  for (const cat of result.data) {
    const name = isZh ? cat.name["zh-CN"] || cat.name.en : cat.name.en;
    console.log(`  \u{1F4E6} ${ansis.bold(name)} ${ansis.gray(`(${cat.count} ${isZh ? "\u4E2A\u63D2\u4EF6" : "plugins"})`)}`);
  }
}
async function showFeaturedPlugins() {
  const isZh = i18n.language === "zh-CN";
  const manager = getCloudPluginManager();
  console.log(ansis.green.bold(`
\u2B50 ${isZh ? "\u7CBE\u9009\u63D2\u4EF6" : "Featured Plugins"}
`));
  const featured = await manager.getFeaturedPlugins();
  if (!featured || featured.length === 0) {
    console.log(ansis.gray(isZh ? "\u6682\u65E0\u7CBE\u9009\u63D2\u4EF6" : "No featured plugins available"));
    return;
  }
  for (const plugin of featured) {
    const installed = manager.isPluginInstalled(plugin.id);
    const statusIcon = installed ? ansis.green("\u25CF") : ansis.gray("\u25CB");
    console.log(`  ${statusIcon} ${ansis.bold(getPluginName(plugin))} ${ansis.gray(`v${plugin.version}`)}`);
    console.log(`    ${ansis.gray(getPluginDescription(plugin))}`);
    console.log("");
  }
  console.log(ansis.gray(`
\u{1F4A1} ${isZh ? "\u4F7F\u7528 /plugin install <id> \u5B89\u88C5\u63D2\u4EF6" : "Use /plugin install <id> to install a plugin"}`));
}
function showHelp() {
  const isZh = i18n.language === "zh-CN";
  console.log(ansis.green.bold(`
\u{1F4E6} ${isZh ? "CCJK \u63D2\u4EF6\u7BA1\u7406" : "CCJK Plugin Manager"}
`));
  console.log(ansis.dim("\u2500".repeat(50)));
  console.log("");
  console.log(ansis.bold(isZh ? "\u7528\u6CD5:" : "Usage:"));
  console.log("  /plugin <command> [options]");
  console.log("");
  console.log(ansis.bold(isZh ? "\u547D\u4EE4:" : "Commands:"));
  console.log(`  ${ansis.green("list")}              ${isZh ? "\u5217\u51FA\u5DF2\u5B89\u88C5\u7684\u63D2\u4EF6" : "List installed plugins"}`);
  console.log(`  ${ansis.green("install")} <id>      ${isZh ? "\u5B89\u88C5\u63D2\u4EF6" : "Install a plugin"}`);
  console.log(`  ${ansis.green("uninstall")} <id>    ${isZh ? "\u5378\u8F7D\u63D2\u4EF6" : "Uninstall a plugin"}`);
  console.log(`  ${ansis.green("search")} <query>    ${isZh ? "\u641C\u7D22\u63D2\u4EF6" : "Search for plugins"}`);
  console.log(`  ${ansis.green("info")} <id>         ${isZh ? "\u663E\u793A\u63D2\u4EF6\u8BE6\u60C5" : "Show plugin details"}`);
  console.log(`  ${ansis.green("update")} [id]       ${isZh ? "\u66F4\u65B0\u63D2\u4EF6" : "Update plugin(s)"}`);
  console.log(`  ${ansis.green("categories")}        ${isZh ? "\u5217\u51FA\u63D2\u4EF6\u5206\u7C7B" : "List plugin categories"}`);
  console.log(`  ${ansis.green("featured")}          ${isZh ? "\u663E\u793A\u7CBE\u9009\u63D2\u4EF6" : "Show featured plugins"}`);
  console.log(`  ${ansis.green("help")}              ${isZh ? "\u663E\u793A\u5E2E\u52A9" : "Show this help"}`);
  console.log("");
  console.log(ansis.bold(isZh ? "\u793A\u4F8B:" : "Examples:"));
  console.log(`  /plugin search git          ${ansis.gray(isZh ? "# \u641C\u7D22 git \u76F8\u5173\u63D2\u4EF6" : "# Search for git plugins")}`);
  console.log(`  /plugin install code-simplifier  ${ansis.gray(isZh ? "# \u5B89\u88C5\u63D2\u4EF6" : "# Install a plugin")}`);
  console.log(`  /plugin info code-simplifier     ${ansis.gray(isZh ? "# \u67E5\u770B\u63D2\u4EF6\u8BE6\u60C5" : "# View plugin details")}`);
  console.log(`  /plugin update              ${ansis.gray(isZh ? "# \u66F4\u65B0\u6240\u6709\u63D2\u4EF6" : "# Update all plugins")}`);
  console.log("");
  console.log(ansis.dim("\u2500".repeat(50)));
  console.log(ansis.gray(`${isZh ? "\u63D2\u4EF6\u5E02\u573A" : "Plugin Marketplace"}: https://claudehome.cn/plugins`));
}
async function handlePluginCommand(args) {
  const action = args[0] || "list";
  const restArgs = args.slice(1);
  const options = {
    verbose: restArgs.includes("--verbose") || restArgs.includes("-v"),
    force: restArgs.includes("--force") || restArgs.includes("-f")
  };
  const versionIndex = restArgs.findIndex((a) => a === "--version" || a === "-V");
  if (versionIndex !== -1 && restArgs[versionIndex + 1]) {
    options.version = restArgs[versionIndex + 1];
  }
  const cleanArgs = restArgs.filter(
    (a) => !a.startsWith("-") && a !== options.version
  );
  await pluginCommand(action, cleanArgs, options);
}

export { handlePluginCommand, pluginCommand };
