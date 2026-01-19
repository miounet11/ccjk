/**
 * MCP Cloud Integration - Complete Usage Examples
 * Demonstrates all major features of the system
 */

import {
  createMCPCloudManager,
  MCPCloudManager,
  UserProfile,
  getServiceBundles,
  getBundleById,
  getTop10Services,
} from './index';

/**
 * Example 1: Basic Setup and Initialization
 */
async function example1_BasicSetup() {
  console.log('=== Example 1: Basic Setup ===\n');

  // Create manager with custom config
  const manager = createMCPCloudManager({
    baseUrl: 'https://api.ccjk.dev/mcp',
    cacheEnabled: true,
    cacheTTL: 3600000, // 1 hour
    timeout: 30000,
    retries: 3,
  });

  // Initialize (fetches services from cloud)
  await manager.initialize();

  console.log('✓ Manager initialized successfully\n');
}

/**
 * Example 2: Service Discovery
 */
async function example2_ServiceDiscovery() {
  console.log('=== Example 2: Service Discovery ===\n');

  const manager = createMCPCloudManager();
  await manager.initialize();

  const browser = manager.getBrowser();

  // Get all services
  const allServices = await browser.browseAll();
  console.log(`Total services: ${allServices.length}`);

  // Get categories
  const categories = browser.getCategories();
  console.log(`Categories: ${categories.join(', ')}`);

  // Browse by category
  const dbServices = await browser.browseByCategory('Database');
  console.log(`\nDatabase services: ${dbServices.length}`);
  dbServices.forEach((service) => {
    console.log(`  - ${service.name} (${service.rating}/5)`);
  });

  // Get trending services
  const trending = await browser.browseTrending(5);
  console.log(`\nTop 5 Trending:`);
  trending.forEach((service, index) => {
    console.log(`  ${index + 1}. ${service.name} - ${service.downloads} downloads`);
  });

  // Get featured services
  const featured = browser.browseFeatured();
  console.log(`\nFeatured services: ${featured.length}\n`);
}

/**
 * Example 3: Advanced Search
 */
async function example3_AdvancedSearch() {
  console.log('=== Example 3: Advanced Search ===\n');

  const manager = createMCPCloudManager();
  await manager.initialize();

  const search = manager.getSearch();

  // Simple search
  const results = await search.search('database');
  console.log(`Search "database": ${results.length} results`);

  // Fuzzy search
  const fuzzyResults = await search.fuzzySearch('data base');
  console.log(`Fuzzy search "data base": ${fuzzyResults.length} results`);

  // Advanced search with filters
  const advanced = await search.advancedSearch({
    query: 'database',
    categories: ['Database'],
    minRating: 4.5,
    minDownloads: 10000,
    verified: true,
    trending: true,
  });

  console.log(`\nAdvanced search results: ${advanced.length}`);
  advanced.forEach((service) => {
    console.log(`  - ${service.name}`);
    console.log(`    Rating: ${service.rating}/5`);
    console.log(`    Downloads: ${service.downloads}`);
    console.log(`    Verified: ${service.verified ? 'Yes' : 'No'}`);
  });

  // Get search suggestions
  const suggestions = await search.getSuggestions('data', 5);
  console.log(`\nSuggestions for "data": ${suggestions.join(', ')}\n`);
}

/**
 * Example 4: Personalized Recommendations
 */
async function example4_Recommendations() {
  console.log('=== Example 4: Personalized Recommendations ===\n');

  const manager = createMCPCloudManager();
  await manager.initialize();

  // Create user profile
  const userProfile: UserProfile = {
    id: 'user123',
    techStack: ['nodejs', 'typescript', 'react', 'postgresql', 'docker'],
    projectTypes: ['web', 'api', 'microservices'],
    usagePatterns: {
      postgres: 150,
      docker: 80,
      git: 200,
    },
    installedServices: ['filesystem', 'fetch', 'git'],
    preferences: {
      categories: ['Database', 'Cloud', 'DevOps'],
      tags: ['sql', 'containers', 'api'],
    },
    experience: 'advanced',
  };

  // Get personalized recommendations
  const recommended = await manager.getPersonalizedRecommendations(userProfile, 10);

  console.log('Personalized recommendations:');
  recommended.forEach((service, index) => {
    console.log(`\n${index + 1}. ${service.name}`);
    console.log(`   ${service.description}`);
    console.log(`   Categories: ${service.category.join(', ')}`);
    console.log(`   Rating: ${service.rating}/5`);
  });

  // Get service combinations
  const recommendations = manager.getRecommendations();
  const services = await manager.getRegistry().getAvailableServices();
  const combos = await recommendations.getServiceCombos(services, 'postgres');

  console.log(`\n\nService combinations with PostgreSQL:`);
  combos.forEach((combo) => {
    console.log(`\n- ${combo.name}`);
    console.log(`  ${combo.description}`);
    console.log(`  Services: ${combo.services.join(', ')}`);
    console.log(`  Use case: ${combo.useCase}`);
  });

  console.log('\n');
}

/**
 * Example 5: Service Installation
 */
async function example5_Installation() {
  console.log('=== Example 5: Service Installation ===\n');

  const manager = createMCPCloudManager();
  await manager.initialize();

  // Install single service
  console.log('Installing PostgreSQL...');
  const result = await manager.installService('postgres', {
    version: '1.6.0',
    global: true,
    autoConfig: true,
  });

  if (result.success) {
    console.log(`✓ PostgreSQL ${result.version} installed successfully`);
    console.log(`  Installed at: ${result.installedAt}`);
    if (result.configPath) {
      console.log(`  Config: ${result.configPath}`);
    }
  } else {
    console.error(`✗ Installation failed: ${result.error}`);
  }

  // Check installation status
  const installer = manager.getInstaller();
  const isInstalled = await installer.isInstalled('postgres');
  console.log(`\nPostgreSQL installed: ${isInstalled}`);

  // Get all installed services
  const installed = await installer.getInstalledServices();
  console.log(`\nInstalled services: ${installed.join(', ')}\n`);
}

/**
 * Example 6: Batch Installation
 */
async function example6_BatchInstallation() {
  console.log('=== Example 6: Batch Installation ===\n');

  const manager = createMCPCloudManager();
  await manager.initialize();

  const installer = manager.getInstaller();
  const registry = manager.getRegistry();

  // Get multiple services
  const serviceIds = ['filesystem', 'fetch', 'git'];
  const services = await Promise.all(
    serviceIds.map((id) => registry.getService(id))
  );

  // Install batch
  console.log('Installing multiple services...');
  const result = await installer.installBatch(
    services.filter((s) => s !== null),
    { global: true }
  );

  console.log(`\nBatch installation complete:`);
  console.log(`  Installed: ${result.installed.length}`);
  console.log(`  Failed: ${result.failed.length}`);
  console.log(`  Total time: ${result.totalTime}ms`);

  if (result.installed.length > 0) {
    console.log(`\n  Successfully installed:`);
    result.installed.forEach((id) => console.log(`    - ${id}`));
  }

  if (result.failed.length > 0) {
    console.log(`\n  Failed installations:`);
    result.failed.forEach((item) => {
      console.log(`    - ${item.serviceId}: ${item.error}`);
    });
  }

  console.log('\n');
}

/**
 * Example 7: Service Bundles
 */
async function example7_Bundles() {
  console.log('=== Example 7: Service Bundles ===\n');

  const manager = createMCPCloudManager();
  await manager.initialize();

  // Get all bundles
  const bundles = getServiceBundles();
  console.log(`Available bundles: ${bundles.length}\n`);

  // Show featured bundles
  bundles
    .filter((b) => b.featured)
    .forEach((bundle) => {
      console.log(`${bundle.icon} ${bundle.name}`);
      console.log(`  ${bundle.description}`);
      console.log(`  Services: ${bundle.services.length}`);
      console.log(`  Downloads: ${bundle.downloads}`);
      console.log(`  Rating: ${bundle.rating}/5\n`);
    });

  // Install a bundle
  const starterBundle = getBundleById('starter');
  if (starterBundle) {
    console.log(`Installing ${starterBundle.name}...`);

    for (const serviceRef of starterBundle.services) {
      if (serviceRef.required) {
        console.log(`  Installing ${serviceRef.serviceId}...`);
        const result = await manager.installService(serviceRef.serviceId);
        console.log(`    ${result.success ? '✓' : '✗'} ${serviceRef.serviceId}`);
      }
    }
  }

  console.log('\n');
}

/**
 * Example 8: Updates and Rollbacks
 */
async function example8_Updates() {
  console.log('=== Example 8: Updates and Rollbacks ===\n');

  const manager = createMCPCloudManager();
  await manager.initialize();

  // Check for updates
  console.log('Checking for updates...');
  const updates = await manager.checkUpdates();

  if (updates.length > 0) {
    console.log(`\n${updates.length} updates available:\n`);

    updates.forEach((update) => {
      console.log(`${update.serviceId}:`);
      console.log(`  Current: ${update.currentVersion}`);
      console.log(`  Latest: ${update.latestVersion}`);
      console.log(`  Breaking: ${update.breaking ? 'Yes ⚠️' : 'No'}`);
      console.log(`  Release notes: ${update.releaseNotes}\n`);
    });

    // Update a service
    const updateManager = manager.getUpdateManager();
    const service = await manager.getRegistry().getService('postgres');

    if (service) {
      console.log('Updating PostgreSQL...');
      const result = await updateManager.updateService(service);

      if (result.success) {
        console.log(`✓ Updated from ${result.fromVersion} to ${result.toVersion}`);
        console.log(`  Rollback available: ${result.rollbackAvailable}`);
      } else {
        console.error(`✗ Update failed: ${result.error}`);

        // Rollback if available
        if (result.rollbackAvailable) {
          console.log('\nRolling back...');
          const rollbackResult = await updateManager.rollback('postgres');

          if (rollbackResult.success) {
            console.log(`✓ Rolled back to ${rollbackResult.toVersion}`);
          }
        }
      }
    }
  } else {
    console.log('All services are up to date!');
  }

  // Get update statistics
  const updateManager = manager.getUpdateManager();
  const services = await manager.getRegistry().getAvailableServices();
  const stats = await updateManager.getUpdateStats(services);

  console.log(`\nUpdate statistics:`);
  console.log(`  Total services: ${stats.total}`);
  console.log(`  Up to date: ${stats.upToDate}`);
  console.log(`  Needs update: ${stats.needsUpdate}`);
  console.log(`  Breaking changes: ${stats.breaking}\n`);
}

/**
 * Example 9: Analytics and Tracking
 */
async function example9_Analytics() {
  console.log('=== Example 9: Analytics and Tracking ===\n');

  const manager = createMCPCloudManager();
  await manager.initialize();

  const analytics = manager.getAnalytics();

  // Track usage
  console.log('Tracking service usage...');
  analytics.trackUsage('postgres', 'query', {
    responseTime: 45,
    feature: 'select',
    success: true,
  });

  analytics.trackUsage('postgres', 'query', {
    responseTime: 52,
    feature: 'insert',
    success: true,
  });

  analytics.trackUsage('fetch', 'request', {
    responseTime: 120,
    feature: 'get',
    url: 'https://api.example.com',
    success: true,
  });

  // Get usage statistics
  const stats = analytics.getUsageStats('postgres');
  console.log(`\nPostgreSQL usage statistics:`);
  console.log(`  Total calls: ${stats.totalCalls}`);
  console.log(`  Successful: ${stats.successfulCalls}`);
  console.log(`  Failed: ${stats.failedCalls}`);
  console.log(`  Success rate: ${((stats.successfulCalls / stats.totalCalls) * 100).toFixed(2)}%`);
  console.log(`  Avg response time: ${stats.averageResponseTime}ms`);
  console.log(`  Last used: ${stats.lastUsed}`);

  if (stats.mostUsedFeatures.length > 0) {
    console.log(`\n  Most used features:`);
    stats.mostUsedFeatures.forEach((feature) => {
      console.log(`    - ${feature.feature}: ${feature.count} times`);
    });
  }

  // Get performance metrics
  const metrics = analytics.getPerformanceMetrics('postgres');
  console.log(`\nPerformance metrics:`);
  console.log(`  Average: ${metrics.averageResponseTime}ms`);
  console.log(`  P50: ${metrics.p50ResponseTime}ms`);
  console.log(`  P95: ${metrics.p95ResponseTime}ms`);
  console.log(`  P99: ${metrics.p99ResponseTime}ms`);
  console.log(`  Error rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
  console.log(`  Uptime: ${(metrics.uptime * 100).toFixed(2)}%`);

  // Get satisfaction score
  const score = analytics.getSatisfactionScore('postgres');
  console.log(`\nSatisfaction score: ${score}/100`);

  // Get top services
  const topServices = analytics.getTopServices(5);
  console.log(`\nTop 5 services by usage:`);
  topServices.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.serviceId}: ${item.calls} calls`);
  });

  console.log('\n');
}

/**
 * Example 10: Top 10 Services
 */
async function example10_Top10() {
  console.log('=== Example 10: Top 10 Services ===\n');

  const top10 = getTop10Services();

  console.log('Top 10 Recommended MCP Services:\n');

  top10.forEach((service, index) => {
    console.log(`${index + 1}. ${service.name}`);
    console.log(`   Package: ${service.package}`);
    console.log(`   Description: ${service.description}`);
    console.log(`   Rating: ${'⭐'.repeat(Math.round(service.rating))} (${service.rating}/5)`);
    console.log(`   Downloads: ${service.downloads.toLocaleString()}`);
    console.log(`   Categories: ${service.category.join(', ')}`);
    console.log(`   Trending: ${service.trending ? '🔥 Yes' : 'No'}`);
    console.log(`   Verified: ${service.verified ? '✓ Yes' : 'No'}\n`);
  });
}

/**
 * Example 11: Complete Workflow
 */
async function example11_CompleteWorkflow() {
  console.log('=== Example 11: Complete Workflow ===\n');

  // 1. Initialize
  console.log('Step 1: Initialize manager');
  const manager = createMCPCloudManager();
  await manager.initialize();
  console.log('✓ Initialized\n');

  // 2. Search for services
  console.log('Step 2: Search for database services');
  const results = await manager.search('database');
  console.log(`✓ Found ${results.length} services\n`);

  // 3. Get recommendations
  console.log('Step 3: Get personalized recommendations');
  const userProfile: UserProfile = {
    id: 'user123',
    techStack: ['nodejs', 'postgresql'],
    projectTypes: ['web'],
    usagePatterns: {},
    installedServices: [],
    preferences: {
      categories: ['Database'],
      tags: ['sql'],
    },
    experience: 'intermediate',
  };

  const recommended = await manager.getPersonalizedRecommendations(userProfile, 3);
  console.log(`✓ Got ${recommended.length} recommendations\n`);

  // 4. Install a service
  console.log('Step 4: Install PostgreSQL');
  const installResult = await manager.installService('postgres', {
    global: true,
    autoConfig: true,
  });
  console.log(`✓ Installation ${installResult.success ? 'successful' : 'failed'}\n`);

  // 5. Track usage
  console.log('Step 5: Track usage');
  const analytics = manager.getAnalytics();
  analytics.trackUsage('postgres', 'install', {
    version: installResult.version,
  });
  console.log('✓ Usage tracked\n');

  // 6. Check for updates
  console.log('Step 6: Check for updates');
  const updates = await manager.checkUpdates();
  console.log(`✓ ${updates.length} updates available\n`);

  console.log('Workflow complete!\n');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await example1_BasicSetup();
    await example2_ServiceDiscovery();
    await example3_AdvancedSearch();
    await example4_Recommendations();
    await example5_Installation();
    await example6_BatchInstallation();
    await example7_Bundles();
    await example8_Updates();
    await example9_Analytics();
    await example10_Top10();
    await example11_CompleteWorkflow();

    console.log('✓ All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export examples
export {
  example1_BasicSetup,
  example2_ServiceDiscovery,
  example3_AdvancedSearch,
  example4_Recommendations,
  example5_Installation,
  example6_BatchInstallation,
  example7_Bundles,
  example8_Updates,
  example9_Analytics,
  example10_Top10,
  example11_CompleteWorkflow,
  runAllExamples,
};

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
