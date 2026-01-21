const DEFAULT_CONFIG = {
  checkInterval: 5 * 60 * 1e3,
  // 5 minutes
  timeout: 1e4,
  // 10 seconds
  degradedLatencyThreshold: 2e3,
  // 2 seconds
  unhealthyLatencyThreshold: 5e3,
  // 5 seconds
  degradedSuccessRateThreshold: 0.8,
  // 80%
  unhealthySuccessRateThreshold: 0.5,
  // 50%
  maxConsecutiveFailures: 3
};
class ProviderHealthMonitor {
  healthData = /* @__PURE__ */ new Map();
  monitoringInterval = null;
  config;
  providers = [];
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  /**
   * Set providers to monitor
   */
  setProviders(providers) {
    this.providers = providers;
    for (const provider of providers) {
      if (!this.healthData.has(provider.id)) {
        this.healthData.set(provider.id, {
          providerId: provider.id,
          latency: 0,
          successRate: 1,
          lastCheck: 0,
          status: "unknown",
          consecutiveFailures: 0,
          totalRequests: 0,
          successfulRequests: 0
        });
      }
    }
  }
  /**
   * Check health of a single provider
   */
  async checkHealth(provider) {
    const startTime = Date.now();
    try {
      const baseUrl = provider.claudeCode?.baseUrl || provider.codex?.baseUrl;
      if (!baseUrl) {
        return {
          success: false,
          latency: 0,
          error: "No base URL configured",
          timestamp: Date.now()
        };
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      try {
        const response = await fetch(baseUrl, {
          method: "HEAD",
          signal: controller.signal,
          headers: {
            "User-Agent": "CCJK-Health-Monitor/1.0"
          }
        });
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        const success = response.ok || response.status === 404;
        return {
          success,
          latency,
          timestamp: Date.now()
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          return {
            success: false,
            latency: this.config.timeout,
            error: "Request timeout",
            timestamp: Date.now()
          };
        }
        return {
          success: false,
          latency: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now()
      };
    }
  }
  /**
   * Update health data based on check result
   */
  updateHealthData(providerId, result) {
    const health = this.healthData.get(providerId);
    if (!health) {
      return;
    }
    health.totalRequests++;
    if (result.success) {
      health.successfulRequests++;
      health.consecutiveFailures = 0;
    } else {
      health.consecutiveFailures++;
    }
    health.successRate = health.successfulRequests / health.totalRequests;
    if (result.success) {
      health.latency = health.latency === 0 ? result.latency : health.latency * 0.7 + result.latency * 0.3;
    }
    health.lastCheck = result.timestamp;
    health.status = this.determineStatus(health);
    this.healthData.set(providerId, health);
  }
  /**
   * Determine provider status based on health metrics
   */
  determineStatus(health) {
    if (health.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      return "unhealthy";
    }
    if (health.successRate < this.config.unhealthySuccessRateThreshold) {
      return "unhealthy";
    }
    if (health.successRate < this.config.degradedSuccessRateThreshold) {
      return "degraded";
    }
    if (health.successfulRequests > 0) {
      if (health.latency > this.config.unhealthyLatencyThreshold) {
        return "unhealthy";
      }
      if (health.latency > this.config.degradedLatencyThreshold) {
        return "degraded";
      }
    }
    return "healthy";
  }
  /**
   * Get health data for a specific provider
   */
  getProviderHealth(providerId) {
    return this.healthData.get(providerId);
  }
  /**
   * Get all healthy providers
   */
  getHealthyProviders() {
    return this.providers.filter((provider) => {
      const health = this.healthData.get(provider.id);
      return health && health.status === "healthy";
    });
  }
  /**
   * Get all providers sorted by health score
   */
  getProvidersByHealth() {
    return [...this.providers].sort((a, b) => {
      const healthA = this.healthData.get(a.id);
      const healthB = this.healthData.get(b.id);
      if (!healthA || !healthB) {
        return 0;
      }
      const scoreA = this.calculateHealthScore(healthA);
      const scoreB = this.calculateHealthScore(healthB);
      return scoreB - scoreA;
    });
  }
  /**
   * Calculate health score for a provider
   */
  calculateHealthScore(health) {
    const statusWeight = {
      healthy: 1,
      degraded: 0.6,
      unhealthy: 0.2,
      unknown: 0.5
    };
    const normalizedLatency = Math.max(0, 1 - health.latency / 1e4);
    return statusWeight[health.status] * 0.4 + health.successRate * 0.4 + normalizedLatency * 0.2;
  }
  /**
   * Get the best provider based on health metrics
   */
  getBestProvider() {
    const sortedProviders = this.getProvidersByHealth();
    return sortedProviders.length > 0 ? sortedProviders[0] : null;
  }
  /**
   * Start monitoring all providers
   */
  async startMonitoring() {
    if (this.monitoringInterval) {
      return;
    }
    await this.checkAllProviders();
    this.monitoringInterval = setInterval(async () => {
      await this.checkAllProviders();
    }, this.config.checkInterval);
  }
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  /**
   * Check health of all providers
   */
  async checkAllProviders() {
    const checks = this.providers.map(async (provider) => {
      const result = await this.checkHealth(provider);
      this.updateHealthData(provider.id, result);
    });
    await Promise.all(checks);
  }
  /**
   * Get all health data
   */
  getAllHealthData() {
    return new Map(this.healthData);
  }
  /**
   * Reset health data for a provider
   */
  resetProviderHealth(providerId) {
    const health = this.healthData.get(providerId);
    if (health) {
      health.consecutiveFailures = 0;
      health.totalRequests = 0;
      health.successfulRequests = 0;
      health.successRate = 1;
      health.latency = 0;
      health.status = "unknown";
      this.healthData.set(providerId, health);
    }
  }
  /**
   * Clear all health data
   */
  clearAllHealthData() {
    this.healthData.clear();
  }
}

export { ProviderHealthMonitor as P };
