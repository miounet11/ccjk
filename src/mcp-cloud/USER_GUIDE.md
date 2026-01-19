# MCP Cloud Integration - User Guide

Complete guide to using the MCP Cloud Integration System.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Concepts](#basic-concepts)
3. [Service Discovery](#service-discovery)
4. [Installation](#installation)
5. [Service Management](#service-management)
6. [Bundles](#bundles)
7. [Updates](#updates)
8. [Analytics](#analytics)
9. [Advanced Usage](#advanced-usage)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

```bash
npm install ccjk
```

### First Steps

```typescript
import { createMCPCloudManager } from 'ccjk/mcp-cloud';

// Create manager
const manager = createMCPCloudManager();

// Initialize (fetches services from cloud)
await manager.initialize();

// You're ready to go!
```

## Basic Concepts

### Services

MCP services are packages that provide specific functionality:
- **File System** - File operations
- **HTTP Fetch** - HTTP requests
- **Database** - Data storage
- **Git** - Version control
- And many more...

### Registry

The registry manages all available services:
- Fetches from cloud
- Caches locally
- Auto-syncs periodically

### Bundles

Pre-configured collections of services for specific use cases:
- **Starter Bundle** - Essential services
- **Full Stack Bundle** - Complete toolkit
- **DevOps Bundle** - Infrastructure tools

## Service Discovery

### Browse All Services

```typescript
const browser = manager.getBrowser();

// Get all services
const allServices = await browser.browseAll();

// Get service count
const count = browser.getServiceCount();
console.log(`${count} services available`);
```

### Search Services

```typescript
const search = manager.getSearch();

// Simple search
const results = await search.search('database');

// Fuzzy search
const fuzzyResults = await search.fuzzySearch('data base');

// Advanced search
const advanced = await search.advancedSearch({
  query: 'database',
  categories: ['Database'],
  minRating: 4.5,
  verified: true,
});
```

### Browse by Category

```typescript
// Get all categories
const categories = browser.getCategories();

// Browse specific category
const dbServices = await browser.browseByCategory('Database');
```

### Browse Trending

```typescript
// Get trending services
const trending = await browser.browseTrending(10);

// Get featured services
const featured = browser.browseFeatured();

// Get new services
const newServices = browser.getNewServices();
```

### Get Service Details

```typescript
const service = await browser.getServiceDetails('postgres');

if (service) {
  console.log(`Name: ${service.name}`);
  console.log(`Description: ${service.description}`);
  console.log(`Version: ${service.version}`);
  console.log(`Rating: ${service.rating}/5`);
  console.log(`Downloads: ${service.downloads}`);
  console.log(`Categories: ${service.category.join(', ')}`);
  console.log(`Tags: ${service.tags.join(', ')}`);
}
```

## Installation

### Install Single Service

```typescript
// Basic installation
await manager.installService('filesystem');

// With options
await manager.installService('postgres', {
  version: '1.6.0',      // Specific version
  global: true,          // Global installation
  autoConfig: true,      // Auto-configure
  force: false,          // Force reinstall
});
```

### Install Multiple Services

```typescript
const installer = manager.getInstaller();
const registry = manager.getRegistry();

// Get services
const services = await Promise.all([
  registry.getService('filesystem'),
  registry.getService('fetch'),
  registry.getService('git'),
]);

// Install batch
const result = await installer.installBatch(
  services.filter(s => s !== null),
  { global: true }
);

console.log(`Installed: ${result.installed.length}`);
console.log(`Failed: ${result.failed.length}`);
```

### Check Installation Status

```typescript
const installer = manager.getInstaller();

// Check if installed
const isInstalled = await installer.isInstalled('postgres');

// Get all installed services
const installed = await installer.getInstalledServices();

// Verify installation
const verified = await installer.verifyInstallation('postgres');
```

## Service Management

### Get Installed Services

```typescript
const installer = manager.getInstaller();
const installed = await installer.getInstalledServices();

console.log('Installed services:');
installed.forEach(serviceId => {
  console.log(`- ${serviceId}`);
});
```

### Uninstall Service

```typescript
// Note: Uninstall functionality would be added to the installer
// For now, use npm directly:
// npm uninstall -g @modelcontextprotocol/server-{serviceId}
```

### Version Management

```typescript
import { VersionManager } from 'ccjk/mcp-cloud';

const versionManager = new VersionManager();
await versionManager.initialize();

// Get installed version
const version = await versionManager.getInstalledVersion('postgres');

// Get available versions
const versions = await versionManager.getAvailableVersions(
  '@modelcontextprotocol/server-postgres'
);

// Get latest version
const latest = await versionManager.getLatestVersion(
  '@modelcontextprotocol/server-postgres'
);

// Check for updates
const hasUpdate = await versionManager.hasUpdate(
  'postgres',
  '@modelcontextprotocol/server-postgres'
);
```

## Bundles

### Browse Bundles

```typescript
import { getServiceBundles, getFeaturedBundles } from 'ccjk/mcp-cloud';

// Get all bundles
const bundles = getServiceBundles();

// Get featured bundles
const featured = getFeaturedBundles();

// Get bundle by ID
const starterBundle = getBundleById('starter');
```

### Install Bundle

```typescript
import { getBundleById } from 'ccjk/mcp-cloud';

const bundle = getBundleById('starter');

if (bundle) {
  console.log(`Installing ${bundle.name}...`);
  console.log(`Services: ${bundle.services.length}`);

  // Install required services
  for (const serviceRef of bundle.services) {
    if (serviceRef.required) {
      const service = await manager.getRegistry().getService(serviceRef.serviceId);
      if (service) {
        const result = await manager.installService(serviceRef.serviceId);
        if (result.success) {
          console.log(`✓ ${serviceRef.serviceId} installed`);
        } else {
          console.error(`✗ ${serviceRef.serviceId} failed: ${result.error}`);
        }
      }
    }
  }
}
```

### Recommended Bundles

```typescript
import { getRecommendedBundles } from 'ccjk/mcp-cloud';

const installer = manager.getInstaller();
const installed = await installer.getInstalledServices();

// Get bundles that complement installed services
const recommended = getRecommendedBundles(installed);

console.log('Recommended bundles:');
recommended.forEach(bundle => {
  console.log(`- ${bundle.name}: ${bundle.description}`);
});
```

## Updates

### Check for Updates

```typescript
const updates = await manager.checkUpdates();

if (updates.length > 0) {
  console.log(`${updates.length} updates available:`);

  updates.forEach(update => {
    console.log(`\n${update.serviceId}:`);
    console.log(`  Current: ${update.currentVersion}`);
    console.log(`  Latest: ${update.latestVersion}`);
    console.log(`  Breaking: ${update.breaking ? 'Yes' : 'No'}`);
    console.log(`  Release Notes: ${update.releaseNotes}`);
  });
}
```

### Update Services

```typescript
const updateManager = manager.getUpdateManager();
const registry = manager.getRegistry();

// Update single service
const service = await registry.getService('postgres');
if (service) {
  const result = await updateManager.updateService(service);

  if (result.success) {
    console.log(`Updated from ${result.fromVersion} to ${result.toVersion}`);
  } else {
    console.error(`Update failed: ${result.error}`);
  }
}

// Auto-update all services
const services = await registry.getAvailableServices();
const results = await updateManager.autoUpdateAll(services);

console.log(`Updated ${results.filter(r => r.success).length} services`);
```

### Rollback

```typescript
const updateManager = manager.getUpdateManager();

// Rollback to previous version
const result = await updateManager.rollback('postgres');

if (result.success) {
  console.log(`Rolled back to ${result.toVersion}`);
} else {
  console.error(`Rollback failed: ${result.error}`);
}
```

### Update Statistics

```typescript
const updateManager = manager.getUpdateManager();
const services = await manager.getRegistry().getAvailableServices();

const stats = await updateManager.getUpdateStats(services);

console.log(`Total services: ${stats.total}`);
console.log(`Up to date: ${stats.upToDate}`);
console.log(`Needs update: ${stats.needsUpdate}`);
console.log(`Breaking changes: ${stats.breaking}`);
```

## Analytics

### Track Usage

```typescript
const analytics = manager.getAnalytics();

// Track service usage
analytics.trackUsage('postgres', 'query', {
  responseTime: 45,
  feature: 'select',
  success: true,
});

analytics.trackUsage('fetch', 'request', {
  responseTime: 120,
  feature: 'get',
  url: 'https://api.example.com',
});
```

### Get Usage Statistics

```typescript
const stats = analytics.getUsageStats('postgres');

console.log(`Service: ${stats.serviceId}`);
console.log(`Total calls: ${stats.totalCalls}`);
console.log(`Successful: ${stats.successfulCalls}`);
console.log(`Failed: ${stats.failedCalls}`);
console.log(`Avg response time: ${stats.averageResponseTime}ms`);
console.log(`Last used: ${stats.lastUsed}`);

console.log('\nMost used features:');
stats.mostUsedFeatures.forEach(feature => {
  console.log(`- ${feature.feature}: ${feature.count} times`);
});

console.log('\nDaily usage:');
stats.dailyUsage.forEach(day => {
  console.log(`- ${day.date}: ${day.calls} calls`);
});
```

### Performance Metrics

```typescript
const metrics = analytics.getPerformanceMetrics('postgres');

console.log(`Average response time: ${metrics.averageResponseTime}ms`);
console.log(`P50: ${metrics.p50ResponseTime}ms`);
console.log(`P95: ${metrics.p95ResponseTime}ms`);
console.log(`P99: ${metrics.p99ResponseTime}ms`);
console.log(`Error rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
console.log(`Uptime: ${(metrics.uptime * 100).toFixed(2)}%`);
```

### Satisfaction Score

```typescript
const score = analytics.getSatisfactionScore('postgres');
console.log(`Satisfaction score: ${score}/100`);

// Interpretation:
// 90-100: Excellent
// 80-89: Good
// 70-79: Fair
// 60-69: Poor
// <60: Very Poor
```

### Top Services

```typescript
const topServices = analytics.getTopServices(10);

console.log('Top 10 services by usage:');
topServices.forEach((item, index) => {
  console.log(`${index + 1}. ${item.serviceId}: ${item.calls} calls`);
});
```

### Export Analytics

```typescript
// Export to JSON file
await analytics.exportAnalytics('./analytics-report.json');

console.log('Analytics exported to analytics-report.json');
```

## Advanced Usage

### Custom User Profile

```typescript
const userProfile = {
  id: 'user123',
  techStack: ['nodejs', 'typescript', 'react', 'postgresql', 'docker'],
  projectTypes: ['web', 'api', 'microservices'],
  usagePatterns: {
    'postgres': 150,
    'docker': 80,
    'git': 200,
  },
  installedServices: ['filesystem', 'fetch', 'git', 'postgres'],
  preferences: {
    categories: ['Database', 'Cloud', 'DevOps'],
    tags: ['sql', 'containers', 'api'],
  },
  experience: 'advanced',
};

const recommended = await manager.getPersonalizedRecommendations(userProfile, 10);
```

### Service Combinations

```typescript
const recommendations = manager.getRecommendations();
const services = await manager.getRegistry().getAvailableServices();

// Get services that work well together
const combos = await recommendations.getServiceCombos(services, 'postgres');

console.log('Service combinations with PostgreSQL:');
combos.forEach(combo => {
  console.log(`\n${combo.name}:`);
  console.log(`  ${combo.description}`);
  console.log(`  Services: ${combo.services.join(', ')}`);
  console.log(`  Use case: ${combo.useCase}`);
  console.log(`  Popularity: ${combo.popularity}/100`);
});
```

### Trending Analysis

```typescript
const trending = manager.getTrending();
const services = await manager.getRegistry().getAvailableServices();

// Get trending services
const trendingServices = trending.getTrending(services, 10);

// Get rising stars
const risingStars = trending.getRisingStars(services, 5);

// Get trending by category
const trendingDB = trending.getTrendingByCategory(services, 'Database', 5);

// Get trending tags
const trendingTags = trending.getTrendingTags(services, 10);

// Get trending categories
const trendingCategories = trending.getTrendingCategories(services, 5);
```

### Custom Filters

```typescript
const search = manager.getSearch();

const results = await search.advancedSearch({
  query: 'database',
  categories: ['Database', 'Storage'],
  tags: ['sql', 'nosql'],
  minRating: 4.5,
  minDownloads: 10000,
  verified: true,
  trending: true,
  featured: false,
});
```

### Cache Management

```typescript
const registry = manager.getRegistry();

// Get sync status
const status = registry.getSyncStatus();
console.log(`Last sync: ${status.lastSync}`);
console.log(`Next sync: ${status.nextSync}`);
console.log(`Status: ${status.status}`);
console.log(`Services: ${status.servicesCount}`);

// Force sync
await registry.syncFromCloud();

// Clear cache
await registry.clearCache();
```

## Troubleshooting

### Service Not Found

```typescript
const service = await manager.getRegistry().getService('unknown-service');

if (!service) {
  console.error('Service not found');

  // Try searching
  const results = await manager.search('unknown-service');
  if (results.length > 0) {
    console.log('Did you mean:');
    results.forEach(s => console.log(`- ${s.name} (${s.id})`));
  }
}
```

### Installation Failed

```typescript
const result = await manager.installService('postgres');

if (!result.success) {
  console.error('Installation failed:', result.error);

  // Check warnings
  if (result.warnings && result.warnings.length > 0) {
    console.log('Warnings:');
    result.warnings.forEach(w => console.log(`- ${w}`));
  }

  // Check dependencies
  if (result.dependencies) {
    const failed = result.dependencies.filter(d => !d.installed);
    if (failed.length > 0) {
      console.log('Failed dependencies:');
      failed.forEach(d => console.log(`- ${d.name}@${d.version}`));
    }
  }
}
```

### Update Failed

```typescript
const updateManager = manager.getUpdateManager();
const service = await manager.getRegistry().getService('postgres');

if (service) {
  const result = await updateManager.updateService(service);

  if (!result.success) {
    console.error('Update failed:', result.error);

    // Rollback if available
    if (result.rollbackAvailable) {
      console.log('Rolling back...');
      const rollbackResult = await updateManager.rollback('postgres');

      if (rollbackResult.success) {
        console.log('Rollback successful');
      }
    }
  }
}
```

### Network Issues

```typescript
try {
  await manager.initialize();
} catch (error) {
  console.error('Failed to connect to cloud:', error);

  // Try using cached data
  const registry = manager.getRegistry();
  const services = await registry.getAvailableServices();

  if (services.length > 0) {
    console.log('Using cached data');
  } else {
    console.error('No cached data available');
  }
}
```

### Clear All Data

```typescript
// Clear cache
await manager.getRegistry().clearCache();

// Clear analytics
await manager.getAnalytics().clearAnalytics();

// Clear rollback points
import { RollbackManager } from 'ccjk/mcp-cloud';
const rollbackManager = new RollbackManager();
await rollbackManager.initialize();
await rollbackManager.clearAll();
```

## Best Practices

### 1. Initialize Once

```typescript
// Good
const manager = createMCPCloudManager();
await manager.initialize();

// Use manager throughout your application

// Bad
// Creating multiple instances
```

### 2. Handle Errors

```typescript
try {
  const result = await manager.installService('postgres');
  if (!result.success) {
    // Handle installation failure
  }
} catch (error) {
  // Handle unexpected errors
}
```

### 3. Use Caching

```typescript
// Enable caching for better performance
const manager = createMCPCloudManager({
  cacheEnabled: true,
  cacheTTL: 3600000, // 1 hour
});
```

### 4. Track Analytics

```typescript
const analytics = manager.getAnalytics();

// Track all service usage
analytics.trackUsage('postgres', 'query', {
  responseTime: 45,
  success: true,
});
```

### 5. Regular Updates

```typescript
// Check for updates weekly
setInterval(async () => {
  const updates = await manager.checkUpdates();
  if (updates.length > 0) {
    console.log(`${updates.length} updates available`);
  }
}, 7 * 24 * 60 * 60 * 1000); // 7 days
```

### 6. Use Bundles

```typescript
// Install bundles instead of individual services
import { getBundleById } from 'ccjk/mcp-cloud';

const bundle = getBundleById('fullstack');
// Install bundle services
```

### 7. Verify Installations

```typescript
const installer = manager.getInstaller();

// After installation
const result = await manager.installService('postgres');
if (result.success) {
  const verified = await installer.verifyInstallation('postgres');
  if (!verified) {
    console.warn('Installation verification failed');
  }
}
```

## Tips & Tricks

### Quick Service Lookup

```typescript
// Get service quickly
const service = await manager.getRegistry().getService('postgres');
```

### Batch Operations

```typescript
// Install multiple services efficiently
const serviceIds = ['filesystem', 'fetch', 'git'];
const services = await Promise.all(
  serviceIds.map(id => manager.getRegistry().getService(id))
);

await manager.getInstaller().installBatch(
  services.filter(s => s !== null)
);
```

### Search Suggestions

```typescript
const search = manager.getSearch();

// Get search suggestions as user types
const suggestions = await search.getSuggestions('data', 5);
console.log('Suggestions:', suggestions);
```

### Similar Services

```typescript
const search = manager.getSearch();

// Find similar services
const similar = await search.searchSimilar('postgres', 5);
console.log('Similar to PostgreSQL:');
similar.forEach(s => console.log(`- ${s.name}`));
```

## Next Steps

- Explore the [API Documentation](./API_DOCUMENTATION.md)
- Check out [Examples](./examples/)
- Read the [Architecture Guide](./ARCHITECTURE.md)
- Join our community on Discord

## Support

Need help?
- GitHub Issues: https://github.com/ccjk/issues
- Discord: https://discord.gg/ccjk
- Email: support@ccjk.dev
