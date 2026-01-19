# MCP Cloud Integration - API Documentation

Complete API reference for the MCP Cloud Integration System.

## Table of Contents

1. [Core Types](#core-types)
2. [MCPCloudManager](#mcpcloudmanager)
3. [CloudMCPRegistry](#cloudmcpregistry)
4. [ServiceBrowser](#servicebrowser)
5. [SearchEngine](#searchengine)
6. [RecommendationEngine](#recommendationengine)
7. [TrendingTracker](#trendingtracker)
8. [OneClickInstaller](#oneclickinstaller)
9. [VersionManager](#versionmanager)
10. [RollbackManager](#rollbackmanager)
11. [MCPUpdateManager](#mcpupdatemanager)
12. [ServiceAnalytics](#serviceanalytics)
13. [Service Bundles](#service-bundles)

---

## Core Types

### MCPService

Represents an MCP service.

```typescript
interface MCPService {
  id: string;                    // Unique service identifier
  name: string;                  // Display name
  package: string;               // NPM package name
  version: string;               // Current version
  description: string;           // Service description
  category: string[];            // Categories
  tags: string[];                // Tags for search
  author: string;                // Author name
  homepage: string;              // Homepage URL
  repository: string;            // Repository URL
  license: string;               // License type
  downloads: number;             // Download count
  rating: number;                // Rating (0-5)
  reviews: number;               // Number of reviews
  trending: boolean;             // Is trending
  featured: boolean;             // Is featured
  dependencies: string[];        // Dependencies
  compatibility: {
    node: string;                // Node version requirement
    os: string[];                // Supported OS
  };
  installation: {
    command: string;             // Install command
    config: any;                 // Default config
  };
  examples: string[];            // Usage examples
  documentation: string;         // Documentation URL
  lastUpdated: string;           // Last update date
  verified: boolean;             // Is verified
}
```

### MCPServiceDetail

Extended service information.

```typescript
interface MCPServiceDetail extends MCPService {
  readme: string;                // README content
  changelog: string;             // Changelog
  screenshots: string[];         // Screenshot URLs
  videos: string[];              // Video URLs
  tutorials: string[];           // Tutorial URLs
  useCases: string[];            // Use cases
  integrations: string[];        // Integrations
  pricing?: {
    free: boolean;
    plans?: Array<{
      name: string;
      price: number;
      features: string[];
    }>;
  };
  support: {
    email?: string;
    discord?: string;
    github?: string;
    documentation?: string;
  };
  metrics: {
    responseTime: number;
    uptime: number;
    errorRate: number;
  };
}
```

### UserProfile

User profile for recommendations.

```typescript
interface UserProfile {
  id: string;                              // User ID
  techStack: string[];                     // Technologies used
  projectTypes: string[];                  // Project types
  usagePatterns: Record<string, number>;   // Service usage counts
  installedServices: string[];             // Installed services
  preferences: {
    categories: string[];                  // Preferred categories
    tags: string[];                        // Preferred tags
  };
  experience: 'beginner' | 'intermediate' | 'advanced';
}
```

### SearchFilters

Search and filter options.

```typescript
interface SearchFilters {
  categories?: string[];         // Filter by categories
  tags?: string[];               // Filter by tags
  minRating?: number;            // Minimum rating
  minDownloads?: number;         // Minimum downloads
  verified?: boolean;            // Only verified
  trending?: boolean;            // Only trending
  featured?: boolean;            // Only featured
  compatibility?: {
    node?: string;
    os?: string[];
  };
  license?: string[];            // Filter by license
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;                // Result limit
  offset?: number;               // Result offset
}
```

### InstallOptions

Installation options.

```typescript
interface InstallOptions {
  version?: string;              // Specific version
  global?: boolean;              // Global installation
  dev?: boolean;                 // Dev dependency
  force?: boolean;               // Force reinstall
  skipDependencies?: boolean;    // Skip dependencies
  configPath?: string;           // Config file path
  autoConfig?: boolean;          // Auto-configure
}
```

### InstallResult

Installation result.

```typescript
interface InstallResult {
  success: boolean;              // Success status
  serviceId: string;             // Service ID
  version: string;               // Installed version
  installedAt: string;           // Installation timestamp
  configPath?: string;           // Config file path
  error?: string;                // Error message
  warnings?: string[];           // Warnings
  dependencies?: Array<{
    name: string;
    version: string;
    installed: boolean;
  }>;
}
```

### UpdateInfo

Update information.

```typescript
interface UpdateInfo {
  serviceId: string;             // Service ID
  currentVersion: string;        // Current version
  latestVersion: string;         // Latest version
  releaseNotes: string;          // Release notes
  breaking: boolean;             // Breaking change
  size: number;                  // Update size
  publishedAt: string;           // Publish date
}
```

### UpdateResult

Update result.

```typescript
interface UpdateResult {
  success: boolean;              // Success status
  serviceId: string;             // Service ID
  fromVersion: string;           // Previous version
  toVersion: string;             // New version
  updatedAt: string;             // Update timestamp
  error?: string;                // Error message
  warnings?: string[];           // Warnings
  rollbackAvailable: boolean;    // Rollback available
}
```

### UsageStats

Service usage statistics.

```typescript
interface UsageStats {
  serviceId: string;             // Service ID
  totalCalls: number;            // Total calls
  successfulCalls: number;       // Successful calls
  failedCalls: number;           // Failed calls
  averageResponseTime: number;   // Avg response time (ms)
  lastUsed: string;              // Last used timestamp
  mostUsedFeatures: Array<{
    feature: string;
    count: number;
  }>;
  dailyUsage: Array<{
    date: string;
    calls: number;
  }>;
}
```

### PerformanceMetrics

Service performance metrics.

```typescript
interface PerformanceMetrics {
  serviceId: string;             // Service ID
  averageResponseTime: number;   // Average (ms)
  p50ResponseTime: number;       // 50th percentile (ms)
  p95ResponseTime: number;       // 95th percentile (ms)
  p99ResponseTime: number;       // 99th percentile (ms)
  errorRate: number;             // Error rate (0-1)
  uptime: number;                // Uptime (0-1)
  lastChecked: string;           // Last check timestamp
}
```

---

## MCPCloudManager

Main manager class for MCP Cloud Integration.

### Constructor

```typescript
constructor(config?: Partial<CloudAPIConfig>)
```

**Parameters:**
- `config` - Optional cloud API configuration

**Example:**
```typescript
const manager = new MCPCloudManager({
  baseUrl: 'https://api.ccjk.dev/mcp',
  cacheEnabled: true,
  cacheTTL: 3600000,
});
```

### initialize()

Initialize the manager.

```typescript
async initialize(): Promise<void>
```

**Example:**
```typescript
await manager.initialize();
```

### search()

Search for services.

```typescript
async search(query: string): Promise<MCPService[]>
```

**Parameters:**
- `query` - Search query

**Returns:** Array of matching services

**Example:**
```typescript
const results = await manager.search('database');
```

### getPersonalizedRecommendations()

Get personalized service recommendations.

```typescript
async getPersonalizedRecommendations(
  userProfile: UserProfile,
  limit?: number
): Promise<MCPService[]>
```

**Parameters:**
- `userProfile` - User profile
- `limit` - Maximum results (default: 10)

**Returns:** Array of recommended services

**Example:**
```typescript
const recommended = await manager.getPersonalizedRecommendations(userProfile, 5);
```

### installService()

Install a service.

```typescript
async installService(
  serviceId: string,
  options?: InstallOptions
): Promise<InstallResult>
```

**Parameters:**
- `serviceId` - Service identifier
- `options` - Installation options

**Returns:** Installation result

**Example:**
```typescript
const result = await manager.installService('postgres', {
  version: '1.6.0',
  global: true,
});
```

### checkUpdates()

Check for service updates.

```typescript
async checkUpdates(): Promise<UpdateInfo[]>
```

**Returns:** Array of available updates

**Example:**
```typescript
const updates = await manager.checkUpdates();
```

### stop()

Stop background processes.

```typescript
stop(): void
```

**Example:**
```typescript
manager.stop();
```

### Getters

```typescript
getRegistry(): CloudMCPRegistry
getBrowser(): ServiceBrowser
getSearch(): SearchEngine
getRecommendations(): RecommendationEngine
getTrending(): TrendingTracker
getInstaller(): OneClickInstaller
getAnalytics(): ServiceAnalytics
getUpdateManager(): MCPUpdateManager
```

---

## CloudMCPRegistry

Manages cloud service registry.

### Constructor

```typescript
constructor(config?: Partial<CloudAPIConfig>)
```

### initialize()

```typescript
async initialize(): Promise<void>
```

### syncFromCloud()

Sync services from cloud.

```typescript
async syncFromCloud(): Promise<void>
```

### getAvailableServices()

Get all available services.

```typescript
async getAvailableServices(): Promise<MCPService[]>
```

### getService()

Get service by ID.

```typescript
async getService(id: string): Promise<MCPServiceDetail | null>
```

### searchServices()

Search services with filters.

```typescript
async searchServices(
  query: string,
  filters?: SearchFilters
): Promise<MCPService[]>
```

### getByCategory()

Get services by category.

```typescript
async getByCategory(category: string): Promise<MCPService[]>
```

### getTrending()

Get trending services.

```typescript
async getTrending(limit?: number): Promise<MCPService[]>
```

### getRecommended()

Get recommended services.

```typescript
async getRecommended(
  userProfile: UserProfile,
  limit?: number
): Promise<MCPService[]>
```

### getRatings()

Get service ratings.

```typescript
async getRatings(serviceId: string): Promise<ServiceRatings | null>
```

### getCategories()

Get all categories.

```typescript
async getCategories(): Promise<string[]>
```

### getTags()

Get all tags.

```typescript
async getTags(): Promise<string[]>
```

### getSyncStatus()

Get sync status.

```typescript
getSyncStatus(): SyncStatus
```

### clearCache()

Clear local cache.

```typescript
async clearCache(): Promise<void>
```

### stop()

Stop sync scheduler.

```typescript
stop(): void
```

---

## ServiceBrowser

Browse and explore services.

### Constructor

```typescript
constructor(registry: CloudMCPRegistry)
```

### initialize()

```typescript
async initialize(): Promise<void>
```

### refreshState()

Refresh marketplace state.

```typescript
async refreshState(): Promise<void>
```

### browseAll()

Browse all services.

```typescript
async browseAll(filters?: SearchFilters): Promise<MCPService[]>
```

### browseByCategory()

Browse by category.

```typescript
async browseByCategory(category: string): Promise<MCPService[]>
```

### browseTrending()

Browse trending services.

```typescript
async browseTrending(limit?: number): Promise<MCPService[]>
```

### browseFeatured()

Browse featured services.

```typescript
browseFeatured(): MCPService[]
```

### getServiceDetails()

Get service details.

```typescript
async getServiceDetails(id: string): Promise<MCPServiceDetail | null>
```

### getCategories()

Get all categories.

```typescript
getCategories(): string[]
```

### getTags()

Get all tags.

```typescript
getTags(): string[]
```

### getState()

Get marketplace state.

```typescript
getState(): MarketplaceState
```

### getServiceCount()

Get service count.

```typescript
getServiceCount(): number
```

### getByTags()

Get services by tags.

```typescript
async getByTags(tags: string[]): Promise<MCPService[]>
```

### getVerified()

Get verified services.

```typescript
getVerified(): MCPService[]
```

### getNewServices()

Get new services (last 30 days).

```typescript
getNewServices(): MCPService[]
```

### getPopular()

Get popular services.

```typescript
getPopular(limit?: number): MCPService[]
```

### getTopRated()

Get top rated services.

```typescript
getTopRated(limit?: number): MCPService[]
```

---

## SearchEngine

Advanced search functionality.

### Constructor

```typescript
constructor(registry: CloudMCPRegistry)
```

### search()

Search with filters.

```typescript
async search(query: string, filters?: SearchFilters): Promise<MCPService[]>
```

### fuzzySearch()

Fuzzy search.

```typescript
async fuzzySearch(query: string): Promise<MCPService[]>
```

### searchByCategory()

Search by categories.

```typescript
async searchByCategory(categories: string[]): Promise<MCPService[]>
```

### searchByTags()

Search by tags.

```typescript
async searchByTags(tags: string[]): Promise<MCPService[]>
```

### advancedSearch()

Advanced search with multiple criteria.

```typescript
async advancedSearch(criteria: {
  query?: string;
  categories?: string[];
  tags?: string[];
  minRating?: number;
  minDownloads?: number;
  verified?: boolean;
  trending?: boolean;
  featured?: boolean;
}): Promise<MCPService[]>
```

### getSuggestions()

Get search suggestions.

```typescript
async getSuggestions(query: string, limit?: number): Promise<string[]>
```

### searchByAuthor()

Search by author.

```typescript
async searchByAuthor(author: string): Promise<MCPService[]>
```

### searchSimilar()

Search similar services.

```typescript
async searchSimilar(serviceId: string, limit?: number): Promise<MCPService[]>
```

### getPopularSearches()

Get popular searches.

```typescript
getPopularSearches(): string[]
```

---

## RecommendationEngine

Smart service recommendations.

### analyzeProfile()

Analyze user profile.

```typescript
analyzeProfile(user: UserProfile): string[]
```

### getPersonalizedRecommendations()

Get personalized recommendations.

```typescript
async getPersonalizedRecommendations(
  services: MCPService[],
  userProfile: UserProfile,
  limit?: number
): Promise<MCPService[]>
```

### getServiceCombos()

Get service combinations.

```typescript
async getServiceCombos(
  services: MCPService[],
  baseService: string
): Promise<ServiceCombo[]>
```

### getTrendingInCategory()

Get trending in category.

```typescript
async getTrendingInCategory(
  services: MCPService[],
  category: string,
  limit?: number
): Promise<MCPService[]>
```

### getComplementaryServices()

Get complementary services.

```typescript
async getComplementaryServices(
  services: MCPService[],
  installedServices: string[]
): Promise<MCPService[]>
```

### getBeginnerFriendly()

Get beginner-friendly services.

```typescript
async getBeginnerFriendly(
  services: MCPService[],
  limit?: number
): Promise<MCPService[]>
```

---

## TrendingTracker

Track and analyze trending services.

### trackPopularity()

Track service popularity.

```typescript
trackPopularity(serviceId: string, score: number): void
```

### calculateTrendingScore()

Calculate trending score.

```typescript
calculateTrendingScore(service: MCPService): number
```

### getTrending()

Get trending services.

```typescript
getTrending(services: MCPService[], limit?: number): MCPService[]
```

### getRisingStars()

Get rising stars.

```typescript
getRisingStars(services: MCPService[], limit?: number): MCPService[]
```

### getTrendingByCategory()

Get trending by category.

```typescript
getTrendingByCategory(
  services: MCPService[],
  category: string,
  limit?: number
): MCPService[]
```

### predictTrending()

Predict future trending.

```typescript
predictTrending(services: MCPService[], limit?: number): MCPService[]
```

### getTrendingTags()

Get trending tags.

```typescript
getTrendingTags(services: MCPService[], limit?: number): string[]
```

### getTrendingCategories()

Get trending categories.

```typescript
getTrendingCategories(services: MCPService[], limit?: number): string[]
```

---

## OneClickInstaller

One-click service installation.

### installService()

Install a service.

```typescript
async installService(
  service: MCPService,
  options?: InstallOptions
): Promise<InstallResult>
```

### installBatch()

Install multiple services.

```typescript
async installBatch(
  services: MCPService[],
  options?: InstallOptions
): Promise<BatchInstallResult>
```

### installBundle()

Install a bundle.

```typescript
async installBundle(
  services: MCPService[],
  options?: InstallOptions
): Promise<BatchInstallResult>
```

### isInstalled()

Check if service is installed.

```typescript
async isInstalled(serviceId: string): Promise<boolean>
```

### getInstalledServices()

Get installed services.

```typescript
async getInstalledServices(): Promise<string[]>
```

### verifyInstallation()

Verify installation.

```typescript
async verifyInstallation(serviceId: string): Promise<boolean>
```

---

## VersionManager

Manage service versions.

### initialize()

```typescript
async initialize(): Promise<void>
```

### registerInstallation()

Register installation.

```typescript
async registerInstallation(
  serviceId: string,
  version: string,
  configPath?: string
): Promise<void>
```

### unregisterInstallation()

Unregister installation.

```typescript
async unregisterInstallation(serviceId: string): Promise<void>
```

### getInstalledVersion()

Get installed version.

```typescript
async getInstalledVersion(serviceId: string): Promise<string | null>
```

### getInstalledServices()

Get installed services.

```typescript
async getInstalledServices(): Promise<string[]>
```

### getAvailableVersions()

Get available versions.

```typescript
async getAvailableVersions(packageName: string): Promise<string[]>
```

### getLatestVersion()

Get latest version.

```typescript
async getLatestVersion(packageName: string): Promise<string | null>
```

### hasUpdate()

Check if update available.

```typescript
async hasUpdate(serviceId: string, packageName: string): Promise<boolean>
```

### getUpdateInfo()

Get update information.

```typescript
async getUpdateInfo(
  serviceId: string,
  packageName: string
): Promise<{
  hasUpdate: boolean;
  currentVersion: string | null;
  latestVersion: string | null;
}>
```

---

## RollbackManager

Manage installation rollbacks.

### initialize()

```typescript
async initialize(): Promise<void>
```

### createRollbackPoint()

Create rollback point.

```typescript
async createRollbackPoint(
  serviceId: string,
  version: string,
  configPath?: string
): Promise<void>
```

### rollback()

Rollback to previous version.

```typescript
async rollback(serviceId: string): Promise<RollbackResult>
```

### hasRollbackPoint()

Check if rollback available.

```typescript
hasRollbackPoint(serviceId: string): boolean
```

### clearRollbackPoints()

Clear rollback points.

```typescript
async clearRollbackPoints(serviceId: string): Promise<void>
```

### clearAll()

Clear all rollback points.

```typescript
async clearAll(): Promise<void>
```

---

## MCPUpdateManager

Manage service updates.

### initialize()

```typescript
async initialize(): Promise<void>
```

### checkUpdates()

Check for updates.

```typescript
async checkUpdates(services: MCPService[]): Promise<UpdateInfo[]>
```

### autoUpdateAll()

Auto-update all services.

```typescript
async autoUpdateAll(services: MCPService[]): Promise<UpdateResult[]>
```

### updateService()

Update specific service.

```typescript
async updateService(
  service: MCPService,
  version?: string
): Promise<UpdateResult>
```

### rollback()

Rollback update.

```typescript
async rollback(serviceId: string): Promise<RollbackResult>
```

### scheduleAutoUpdate()

Schedule automatic updates.

```typescript
scheduleAutoUpdate(
  services: MCPService[],
  interval?: number
): NodeJS.Timeout
```

### getUpdateStats()

Get update statistics.

```typescript
async getUpdateStats(services: MCPService[]): Promise<{
  total: number;
  upToDate: number;
  needsUpdate: number;
  breaking: number;
}>
```

---

## ServiceAnalytics

Track and analyze service usage.

### initialize()

```typescript
async initialize(): Promise<void>
```

### trackUsage()

Track service usage.

```typescript
trackUsage(
  serviceId: string,
  action: string,
  metadata?: Record<string, any>
): void
```

### getUsageStats()

Get usage statistics.

```typescript
getUsageStats(serviceId: string): UsageStats
```

### getPerformanceMetrics()

Get performance metrics.

```typescript
getPerformanceMetrics(serviceId: string): PerformanceMetrics
```

### getSatisfactionScore()

Get satisfaction score.

```typescript
getSatisfactionScore(serviceId: string): number
```

### getAllStats()

Get all statistics.

```typescript
getAllStats(): Map<string, UsageStats>
```

### getTopServices()

Get top services by usage.

```typescript
getTopServices(limit?: number): Array<{ serviceId: string; calls: number }>
```

### clearAnalytics()

Clear analytics data.

```typescript
async clearAnalytics(): Promise<void>
```

### exportAnalytics()

Export analytics data.

```typescript
async exportAnalytics(outputPath: string): Promise<void>
```

---

## Service Bundles

### getServiceBundles()

Get all service bundles.

```typescript
function getServiceBundles(): ServiceBundle[]
```

### getBundleById()

Get bundle by ID.

```typescript
function getBundleById(id: string): ServiceBundle | null
```

### getBundlesByCategory()

Get bundles by category.

```typescript
function getBundlesByCategory(category: string): ServiceBundle[]
```

### getFeaturedBundles()

Get featured bundles.

```typescript
function getFeaturedBundles(): ServiceBundle[]
```

### getPopularBundles()

Get popular bundles.

```typescript
function getPopularBundles(limit?: number): ServiceBundle[]
```

### getRecommendedBundles()

Get recommended bundles.

```typescript
function getRecommendedBundles(installedServices: string[]): ServiceBundle[]
```

---

## Factory Functions

### createMCPCloudManager()

Create MCP Cloud Manager instance.

```typescript
function createMCPCloudManager(
  config?: Partial<CloudAPIConfig>
): MCPCloudManager
```

**Example:**
```typescript
const manager = createMCPCloudManager({
  baseUrl: 'https://api.ccjk.dev/mcp',
  cacheEnabled: true,
});
```

---

## Error Handling

All async methods may throw errors. Always use try-catch:

```typescript
try {
  await manager.installService('postgres');
} catch (error) {
  console.error('Installation failed:', error);
}
```

Common error types:
- Network errors (fetch failures)
- Installation errors (npm failures)
- Configuration errors (invalid config)
- Not found errors (service not found)

---

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import {
  MCPCloudManager,
  MCPService,
  UserProfile,
  InstallOptions,
  InstallResult,
} from 'ccjk/mcp-cloud';
```

---

## Version Compatibility

- Node.js: >= 16.0.0
- TypeScript: >= 4.5.0
- NPM: >= 7.0.0

---

## License

MIT
