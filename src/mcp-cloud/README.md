# MCP Cloud Integration System

A comprehensive cloud-based MCP service integration system with dynamic service discovery, smart recommendations, one-click installation, and automatic updates.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Top 10 Recommended Services](#top-10-recommended-services)
- [Service Bundles](#service-bundles)
- [API Reference](#api-reference)
- [Cloud API](#cloud-api)
- [Examples](#examples)

## Overview

The MCP Cloud Integration System provides a unified platform for discovering, installing, and managing MCP (Model Context Protocol) services. It features:

- **Cloud-Based Registry** - Dynamic service fetching from the cloud
- **Smart Recommendations** - AI-powered service recommendations
- **One-Click Installation** - Seamless service installation
- **Service Bundles** - Pre-configured service packages
- **Auto-Updates** - Automatic service updates
- **Analytics** - Usage tracking and performance metrics
- **Marketplace UI** - Beautiful browsing experience

## Features

### 🌐 Cloud-Based Service Registry

- Fetch services dynamically from the cloud
- Local caching for offline access
- Automatic synchronization
- Real-time service updates

### 🔍 Advanced Search & Discovery

- Full-text search across services
- Fuzzy search with suggestions
- Category and tag filtering
- Similar service recommendations

### 🎯 Smart Recommendations

- Personalized service recommendations
- Tech stack analysis
- Usage pattern learning
- Service combinations

### 📦 One-Click Installation

- Seamless installation process
- Automatic dependency resolution
- Configuration management
- Rollback support

### 🔄 Auto-Update System

- Automatic update checking
- Version management
- Breaking change detection
- Rollback capability

### 📊 Analytics & Tracking

- Usage statistics
- Performance metrics
- Satisfaction scores
- Export capabilities

## Architecture

```
src/mcp-cloud/
├── types.ts                      # Core type definitions
├── index.ts                      # Main entry point
├── registry/
│   ├── cloud-registry.ts         # Cloud service registry
│   ├── service-fetcher.ts        # HTTP service fetcher
│   ├── cache-manager.ts          # Local caching
│   └── sync-scheduler.ts         # Auto-sync scheduler
├── marketplace/
│   ├── service-browser.ts        # Browse services
│   ├── search-engine.ts          # Search functionality
│   ├── recommendation-engine.ts  # Smart recommendations
│   ├── trending-tracker.ts       # Trending analysis
│   └── top-10-services.ts        # Top 10 curated list
├── installer/
│   ├── one-click-installer.ts    # One-click installation
│   ├── dependency-resolver.ts    # Dependency management
│   ├── version-manager.ts        # Version tracking
│   ├── rollback-manager.ts       # Rollback support
│   └── update-manager.ts         # Update management
├── bundles/
│   └── service-bundles.ts        # Pre-configured bundles
└── analytics/
    └── service-analytics.ts      # Usage analytics
```

## Installation

```bash
npm install ccjk
```

## Quick Start

### Basic Usage

```typescript
import { createMCPCloudManager } from 'ccjk/mcp-cloud';

// Create manager instance
const manager = createMCPCloudManager({
  baseUrl: 'https://api.ccjk.dev/mcp',
  cacheEnabled: true,
  cacheTTL: 3600000, // 1 hour
});

// Initialize
await manager.initialize();

// Search for services
const results = await manager.search('database');

// Get recommendations
const userProfile = {
  id: 'user123',
  techStack: ['nodejs', 'postgresql', 'docker'],
  projectTypes: ['web', 'api'],
  usagePatterns: {},
  installedServices: [],
  preferences: {
    categories: ['Database', 'Cloud'],
    tags: ['sql', 'storage'],
  },
  experience: 'intermediate',
};

const recommended = await manager.getPersonalizedRecommendations(userProfile);

// Install a service
await manager.installService('postgres', {
  version: '1.6.0',
  global: true,
  autoConfig: true,
});

// Check for updates
const updates = await manager.checkUpdates();
```

### Using Individual Components

```typescript
import { CloudMCPRegistry, ServiceBrowser, OneClickInstaller } from 'ccjk/mcp-cloud';

// Registry
const registry = new CloudMCPRegistry();
await registry.initialize();
const services = await registry.getAvailableServices();

// Browser
const browser = new ServiceBrowser(registry);
await browser.initialize();
const trending = await browser.browseTrending(10);

// Installer
const installer = new OneClickInstaller();
const service = await registry.getService('filesystem');
if (service) {
  await installer.installService(service);
}
```

## Top 10 Recommended Services

### 1. 🔍 File System (`@modelcontextprotocol/server-filesystem`)

**Essential for:** File operations, configuration management, data import/export

**Features:**
- Read and write files
- Directory operations
- Path resolution
- Symbolic link support

**Installation:**
```bash
npm install -g @modelcontextprotocol/server-filesystem
```

**Use Cases:**
- Configuration file management
- Log file processing
- Data import/export
- Project scaffolding

**Rating:** ⭐⭐⭐⭐⭐ (4.9/5) | **Downloads:** 50,000+

---

### 2. 🌐 HTTP Fetch (`@modelcontextprotocol/server-fetch`)

**Essential for:** API integration, web scraping, HTTP requests

**Features:**
- All HTTP methods (GET, POST, PUT, DELETE)
- Custom headers and authentication
- File downloads
- Timeout and retry logic

**Installation:**
```bash
npm install -g @modelcontextprotocol/server-fetch
```

**Use Cases:**
- API integration
- Web scraping
- Data fetching
- Webhook handling

**Rating:** ⭐⭐⭐⭐⭐ (4.8/5) | **Downloads:** 45,000+

---

### 3. 💾 SQLite (`@modelcontextprotocol/server-sqlite`)

**Essential for:** Local data storage, lightweight databases

**Features:**
- SQL query execution
- Table and index creation
- Transactions
- Data persistence

**Installation:**
```bash
npm install -g @modelcontextprotocol/server-sqlite
```

**Use Cases:**
- Local data storage
- Prototyping
- Embedded databases
- Testing

**Rating:** ⭐⭐⭐⭐⭐ (4.7/5) | **Downloads:** 38,000+

---

### 4. 🔧 Git (`@modelcontextprotocol/server-git`)

**Essential for:** Version control, repository management

**Features:**
- Commit, push, pull operations
- Branch management
- History and diffs
- Remote operations

**Installation:**
```bash
npm install -g @modelcontextprotocol/server-git
```

**Use Cases:**
- Version control
- Code collaboration
- Deployment automation
- Change tracking

**Rating:** ⭐⭐⭐⭐⭐ (4.8/5) | **Downloads:** 42,000+

---

### 5. 📊 PostgreSQL (`@modelcontextprotocol/server-postgres`)

**Essential for:** Production databases, enterprise applications

**Features:**
- Advanced SQL queries
- Transactions and rollbacks
- Stored procedures
- Connection pooling

**Installation:**
```bash
npm install -g @modelcontextprotocol/server-postgres
```

**Use Cases:**
- Production databases
- Complex queries
- Data analytics
- Enterprise applications

**Rating:** ⭐⭐⭐⭐⭐ (4.7/5) | **Downloads:** 35,000+

---

### 6. 🐳 Docker (`@modelcontextprotocol/server-docker`)

**Essential for:** Container management, DevOps workflows

**Features:**
- Build and run containers
- Image management
- Volume and network operations
- Docker Compose integration

**Installation:**
```bash
npm install -g @modelcontextprotocol/server-docker
```

**Use Cases:**
- Container orchestration
- Development environments
- CI/CD pipelines
- Microservices

**Rating:** ⭐⭐⭐⭐ (4.6/5) | **Downloads:** 32,000+

---

### 7. ☁️ AWS (`@modelcontextprotocol/server-aws`)

**Essential for:** Cloud infrastructure, AWS services

**Features:**
- S3 bucket operations
- Lambda function management
- EC2 instance control
- CloudWatch logs

**Installation:**
```bash
npm install -g @modelcontextprotocol/server-aws
```

**Use Cases:**
- Cloud infrastructure
- Serverless applications
- Storage management
- Cloud automation

**Rating:** ⭐⭐⭐⭐ (4.5/5) | **Downloads:** 28,000+

---

### 8. 🔐 GitHub (`@modelcontextprotocol/server-github`)

**Essential for:** Repository management, open source workflows

**Features:**
- Repository management
- Issues and pull requests
- Code search
- GitHub Actions

**Installation:**
```bash
npm install -g @modelcontextprotocol/server-github
```

**Use Cases:**
- Open source collaboration
- Issue tracking
- Code review
- CI/CD integration

**Rating:** ⭐⭐⭐⭐⭐ (4.8/5) | **Downloads:** 40,000+

---

### 9. 📝 Markdown (`@modelcontextprotocol/server-markdown`)

**Essential for:** Documentation, content management

**Features:**
- Markdown parsing
- HTML rendering
- Documentation generation
- Linting

**Installation:**
```bash
npm install -g @modelcontextprotocol/server-markdown
```

**Use Cases:**
- Documentation generation
- Content management
- README files
- Technical writing

**Rating:** ⭐⭐⭐⭐ (4.6/5) | **Downloads:** 25,000+

---

### 10. 🧪 Puppeteer (`@modelcontextprotocol/server-puppeteer`)

**Essential for:** Browser automation, testing

**Features:**
- Browser automation
- Screenshot capture
- PDF generation
- Web scraping

**Installation:**
```bash
npm install -g @modelcontextprotocol/server-puppeteer
```

**Use Cases:**
- Automated testing
- Screenshot capture
- PDF generation
- Web scraping

**Rating:** ⭐⭐⭐⭐⭐ (4.7/5) | **Downloads:** 30,000+

---

## Service Bundles

Pre-configured bundles for different use cases:

### 🚀 Starter Bundle
Perfect for beginners
- File System
- HTTP Fetch
- Git
- Markdown (optional)

```typescript
await manager.installService('starter-bundle');
```

### 💾 Database Developer Bundle
Complete database toolkit
- SQLite
- PostgreSQL
- File System
- Git (optional)

### ☁️ Cloud Developer Bundle
Cloud-native development
- AWS
- Docker
- Git
- GitHub (optional)

### 🧪 Testing Bundle
Automated testing tools
- Puppeteer
- File System
- HTTP Fetch
- Git (optional)

### 🎯 Full Stack Bundle
Everything for full-stack development
- File System
- HTTP Fetch
- Git
- PostgreSQL
- GitHub (optional)
- Docker (optional)

### ⚙️ DevOps Bundle
DevOps workflows
- Docker
- Git
- AWS
- File System
- GitHub (optional)

## API Reference

### MCPCloudManager

Main manager class for MCP Cloud Integration.

```typescript
class MCPCloudManager {
  constructor(config?: Partial<CloudAPIConfig>);

  // Initialize the manager
  async initialize(): Promise<void>;

  // Search for services
  async search(query: string): Promise<MCPService[]>;

  // Get personalized recommendations
  async getPersonalizedRecommendations(
    userProfile: UserProfile,
    limit?: number
  ): Promise<MCPService[]>;

  // Install a service
  async installService(
    serviceId: string,
    options?: InstallOptions
  ): Promise<InstallResult>;

  // Check for updates
  async checkUpdates(): Promise<UpdateInfo[]>;

  // Stop background processes
  stop(): void;

  // Get components
  getRegistry(): CloudMCPRegistry;
  getBrowser(): ServiceBrowser;
  getSearch(): SearchEngine;
  getRecommendations(): RecommendationEngine;
  getTrending(): TrendingTracker;
  getInstaller(): OneClickInstaller;
  getAnalytics(): ServiceAnalytics;
  getUpdateManager(): MCPUpdateManager;
}
```

### CloudMCPRegistry

Manages cloud service registry.

```typescript
class CloudMCPRegistry {
  constructor(config?: Partial<CloudAPIConfig>);

  async initialize(): Promise<void>;
  async syncFromCloud(): Promise<void>;
  async getAvailableServices(): Promise<MCPService[]>;
  async getService(id: string): Promise<MCPServiceDetail | null>;
  async searchServices(query: string, filters?: SearchFilters): Promise<MCPService[]>;
  async getByCategory(category: string): Promise<MCPService[]>;
  async getTrending(limit?: number): Promise<MCPService[]>;
  async getRecommended(userProfile: UserProfile, limit?: number): Promise<MCPService[]>;
  async getRatings(serviceId: string): Promise<ServiceRatings | null>;
  async getCategories(): Promise<string[]>;
  async getTags(): Promise<string[]>;
  getSyncStatus(): SyncStatus;
  async clearCache(): Promise<void>;
  stop(): void;
}
```

### ServiceBrowser

Browse and explore services.

```typescript
class ServiceBrowser {
  constructor(registry: CloudMCPRegistry);

  async initialize(): Promise<void>;
  async refreshState(): Promise<void>;
  async browseAll(filters?: SearchFilters): Promise<MCPService[]>;
  async browseByCategory(category: string): Promise<MCPService[]>;
  async browseTrending(limit?: number): Promise<MCPService[]>;
  browseFeatured(): MCPService[];
  async getServiceDetails(id: string): Promise<MCPServiceDetail | null>;
  getCategories(): string[];
  getTags(): string[];
  getState(): MarketplaceState;
  getServiceCount(): number;
  async getByTags(tags: string[]): Promise<MCPService[]>;
  getVerified(): MCPService[];
  getNewServices(): MCPService[];
  getPopular(limit?: number): MCPService[];
  getTopRated(limit?: number): MCPService[];
}
```

### OneClickInstaller

Install services with one click.

```typescript
class OneClickInstaller {
  async installService(
    service: MCPService,
    options?: InstallOptions
  ): Promise<InstallResult>;

  async installBatch(
    services: MCPService[],
    options?: InstallOptions
  ): Promise<BatchInstallResult>;

  async installBundle(
    services: MCPService[],
    options?: InstallOptions
  ): Promise<BatchInstallResult>;

  async isInstalled(serviceId: string): Promise<boolean>;
  async getInstalledServices(): Promise<string[]>;
  async verifyInstallation(serviceId: string): Promise<boolean>;
}
```

### ServiceAnalytics

Track and analyze service usage.

```typescript
class ServiceAnalytics {
  async initialize(): Promise<void>;

  trackUsage(
    serviceId: string,
    action: string,
    metadata?: Record<string, any>
  ): void;

  getUsageStats(serviceId: string): UsageStats;
  getPerformanceMetrics(serviceId: string): PerformanceMetrics;
  getSatisfactionScore(serviceId: string): number;
  getAllStats(): Map<string, UsageStats>;
  getTopServices(limit?: number): Array<{ serviceId: string; calls: number }>;
  async clearAnalytics(): Promise<void>;
  async exportAnalytics(outputPath: string): Promise<void>;
}
```

## Cloud API

### Base URL
```
https://api.ccjk.dev/mcp
```

### Endpoints

#### List All Services
```
GET /services
```

Response:
```json
[
  {
    "id": "filesystem",
    "name": "File System",
    "package": "@modelcontextprotocol/server-filesystem",
    "version": "2.1.0",
    "description": "Complete file system access...",
    "category": ["File System", "Core"],
    "tags": ["files", "directories", "io"],
    "rating": 4.9,
    "downloads": 50000,
    "trending": true,
    "verified": true
  }
]
```

#### Get Service Details
```
GET /services/:id
```

#### Get Trending Services
```
GET /services/trending?limit=10
```

#### Get Recommended Services
```
POST /services/recommended
Content-Type: application/json

{
  "userProfile": { ... },
  "limit": 10
}
```

#### Search Services
```
GET /services/search?q=database&category=Database&minRating=4.5
```

#### Get Service Ratings
```
GET /services/:id/ratings
```

#### Get Service Bundles
```
GET /bundles
```

## Examples

### Example 1: Search and Install

```typescript
import { createMCPCloudManager } from 'ccjk/mcp-cloud';

const manager = createMCPCloudManager();
await manager.initialize();

// Search for database services
const results = await manager.search('database');

console.log(`Found ${results.length} services`);

// Install PostgreSQL
const postgres = results.find(s => s.id === 'postgres');
if (postgres) {
  const result = await manager.installService('postgres', {
    version: '1.6.0',
    global: true,
    autoConfig: true,
  });

  if (result.success) {
    console.log('PostgreSQL installed successfully!');
  }
}
```

### Example 2: Get Recommendations

```typescript
const userProfile = {
  id: 'user123',
  techStack: ['nodejs', 'react', 'postgresql'],
  projectTypes: ['web', 'api'],
  usagePatterns: {},
  installedServices: ['filesystem', 'git'],
  preferences: {
    categories: ['Database', 'Cloud'],
    tags: ['sql', 'api'],
  },
  experience: 'intermediate',
};

const recommended = await manager.getPersonalizedRecommendations(userProfile, 5);

console.log('Recommended services:');
recommended.forEach(service => {
  console.log(`- ${service.name}: ${service.description}`);
});
```

### Example 3: Install Bundle

```typescript
import { getServiceBundles } from 'ccjk/mcp-cloud';

const bundles = getServiceBundles();
const starterBundle = bundles.find(b => b.id === 'starter');

if (starterBundle) {
  console.log(`Installing ${starterBundle.name}...`);

  for (const serviceRef of starterBundle.services) {
    if (serviceRef.required) {
      const service = await manager.getRegistry().getService(serviceRef.serviceId);
      if (service) {
        await manager.installService(serviceRef.serviceId);
      }
    }
  }
}
```

### Example 4: Check for Updates

```typescript
const updates = await manager.checkUpdates();

if (updates.length > 0) {
  console.log(`${updates.length} updates available:`);

  updates.forEach(update => {
    console.log(`- ${update.serviceId}: ${update.currentVersion} → ${update.latestVersion}`);
    if (update.breaking) {
      console.log('  ⚠️  Breaking change!');
    }
  });

  // Auto-update all
  const updateManager = manager.getUpdateManager();
  const services = await manager.getRegistry().getAvailableServices();
  await updateManager.autoUpdateAll(services);
}
```

### Example 5: Analytics

```typescript
const analytics = manager.getAnalytics();

// Track usage
analytics.trackUsage('postgres', 'query', {
  responseTime: 45,
  feature: 'select',
});

// Get statistics
const stats = analytics.getUsageStats('postgres');
console.log(`Total calls: ${stats.totalCalls}`);
console.log(`Success rate: ${(stats.successfulCalls / stats.totalCalls * 100).toFixed(2)}%`);
console.log(`Avg response time: ${stats.averageResponseTime}ms`);

// Get top services
const topServices = analytics.getTopServices(5);
console.log('Top 5 services:');
topServices.forEach((item, index) => {
  console.log(`${index + 1}. ${item.serviceId}: ${item.calls} calls`);
});
```

## Configuration

### CloudAPIConfig

```typescript
interface CloudAPIConfig {
  baseUrl: string;           // API base URL
  apiKey?: string;           // Optional API key
  timeout: number;           // Request timeout (ms)
  retries: number;           // Number of retries
  cacheEnabled: boolean;     // Enable caching
  cacheTTL: number;          // Cache TTL (ms)
}
```

### Default Configuration

```typescript
{
  baseUrl: 'https://api.ccjk.dev/mcp',
  timeout: 30000,
  retries: 3,
  cacheEnabled: true,
  cacheTTL: 3600000, // 1 hour
}
```

## Best Practices

1. **Initialize Once** - Create and initialize the manager once at application startup
2. **Use Caching** - Enable caching to reduce API calls
3. **Handle Errors** - Always handle installation and update errors
4. **Track Analytics** - Use analytics to understand service usage
5. **Regular Updates** - Check for updates regularly
6. **Use Bundles** - Install bundles for common use cases
7. **Verify Installations** - Verify installations after installing

## Troubleshooting

### Service Not Found
```typescript
const service = await manager.getRegistry().getService('unknown');
if (!service) {
  console.error('Service not found');
}
```

### Installation Failed
```typescript
const result = await manager.installService('postgres');
if (!result.success) {
  console.error('Installation failed:', result.error);

  // Check if rollback is available
  if (result.rollbackAvailable) {
    await manager.getUpdateManager().rollback('postgres');
  }
}
```

### Cache Issues
```typescript
// Clear cache if stale
await manager.getRegistry().clearCache();

// Force sync from cloud
await manager.getRegistry().syncFromCloud();
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues and questions, please open an issue on GitHub.
