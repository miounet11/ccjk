/**
 * Usage examples for the Unified Version Management System
 */

import { createVersionService } from './index';

/**
 * Example 1: Basic version check and update
 */
async function example1_BasicCheckAndUpdate() {
  console.log('\n=== Example 1: Basic Check and Update ===\n');

  const service = createVersionService();

  try {
    // Check version
    const info = await service.checkVersion('claude-code');

    console.log(`Tool: ${info.tool}`);
    console.log(`Current version: ${info.currentVersion || 'Not installed'}`);
    console.log(`Latest version: ${info.latestVersion}`);
    console.log(`Update available: ${info.updateAvailable}`);

    if (info.updateAvailable) {
      console.log('\nUpdate available! Starting update...');

      await service.updateTool('claude-code', undefined, {
        backup: true,
        onProgress: (status) => {
          console.log(`[${status.status}] ${status.message} - ${status.progress}%`);
        },
      });

      console.log('✅ Update completed successfully!');
    } else {
      console.log('✅ Already up to date!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await service.cleanup();
  }
}

/**
 * Example 2: Batch check multiple tools
 */
async function example2_BatchCheck() {
  console.log('\n=== Example 2: Batch Check Multiple Tools ===\n');

  const service = createVersionService();

  const tools = ['claude-code', 'aider', 'cursor', 'cline', 'continue', 'codex'];

  try {
    console.log(`Checking ${tools.length} tools...`);

    const result = await service.batchCheckVersions(tools);

    console.log(`\n✅ Completed in ${result.duration}ms`);
    console.log(`📊 Cache hits: ${result.cacheHits}`);
    console.log(`🌐 Network requests: ${result.networkRequests}`);
    console.log(
      `⚡ Efficiency: ${((result.cacheHits / tools.length) * 100).toFixed(1)}% cached`
    );

    console.log('\n📦 Results:');
    for (const [tool, info] of result.results) {
      const status = info.updateAvailable ? '🔄 Update available' : '✅ Up to date';
      console.log(
        `  ${tool}: ${info.currentVersion || 'N/A'} → ${info.latestVersion} ${status}`
      );
    }

    if (result.errors.size > 0) {
      console.log('\n❌ Errors:');
      for (const [tool, error] of result.errors) {
        console.log(`  ${tool}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await service.cleanup();
  }
}

/**
 * Example 3: Automated scheduled checks with auto-update
 */
async function example3_ScheduledChecks() {
  console.log('\n=== Example 3: Automated Scheduled Checks ===\n');

  const service = createVersionService();

  // Schedule checks for multiple tools
  service.scheduleCheck('claude-code', 3600000, true); // Every hour, auto-update
  service.scheduleCheck('aider', 7200000, false); // Every 2 hours, manual update
  service.scheduleCheck('cursor', 3600000, true);

  console.log('📅 Scheduled checks:');
  const schedules = service.getAllSchedules();
  for (const schedule of schedules) {
    console.log(
      `  ${schedule.tool}: Every ${schedule.interval / 1000}s, Auto-update: ${schedule.autoUpdate}`
    );
  }

  // Listen to events
  service.on('check-started', (event) => {
    console.log(`\n🔍 Checking ${event.tool}...`);
  });

  service.on('check-completed', (event) => {
    console.log(`✅ Check completed for ${event.tool}`);
  });

  service.on('update-available', (event) => {
    console.log(
      `🔄 Update available for ${event.tool}: ${event.data.currentVersion} → ${event.data.latestVersion}`
    );
  });

  service.on('update-started', (event) => {
    console.log(`⬇️  Starting update for ${event.tool}...`);
  });

  service.on('update-completed', (event) => {
    console.log(`✅ Update completed for ${event.tool}`);
  });

  service.on('update-failed', (event) => {
    console.error(`❌ Update failed for ${event.tool}: ${event.data.error}`);
  });

  // Start scheduler
  service.startScheduler();
  console.log('\n🚀 Scheduler started!');

  // Run for 10 seconds then stop
  await new Promise((resolve) => setTimeout(resolve, 10000));

  service.stopScheduler();
  console.log('\n⏹️  Scheduler stopped');

  await service.cleanup();
}

/**
 * Example 4: Cache optimization and statistics
 */
async function example4_CacheOptimization() {
  console.log('\n=== Example 4: Cache Optimization ===\n');

  const service = createVersionService({
    defaultCacheTtl: 1800000, // 30 minutes
    maxCacheSize: 50,
  });

  const tools = ['claude-code', 'aider', 'cursor'];

  try {
    // First check - will hit network
    console.log('First check (cold cache)...');
    await service.batchCheckVersions(tools);

    let stats = service.getStats();
    console.log(`Network requests: ${stats.networkRequests}`);

    // Second check - should use cache
    console.log('\nSecond check (warm cache)...');
    await service.batchCheckVersions(tools);

    stats = service.getStats();
    console.log(`Total checks: ${stats.totalChecks}`);
    console.log(`Cache hits: ${stats.cacheHits}`);
    console.log(`Network requests: ${stats.networkRequests}`);
    console.log(
      `Cache hit rate: ${((stats.cacheHits / stats.totalChecks) * 100).toFixed(1)}%`
    );

    // Cache statistics
    const cacheStats = service.getCacheStats();
    console.log('\n📊 Cache Statistics:');
    console.log(`  Size: ${cacheStats.size}/${cacheStats.maxSize}`);
    console.log(`  Hits: ${cacheStats.hits}`);
    console.log(`  Misses: ${cacheStats.misses}`);
    console.log(`  Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);

    // Prune expired entries
    const pruned = service.pruneCache();
    console.log(`\n🧹 Pruned ${pruned} expired entries`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await service.cleanup();
  }
}

/**
 * Example 5: Update with progress tracking
 */
async function example5_ProgressTracking() {
  console.log('\n=== Example 5: Update with Progress Tracking ===\n');

  const service = createVersionService();

  try {
    console.log('Starting update with progress tracking...\n');

    await service.updateTool('claude-code', undefined, {
      backup: true,
      onProgress: (status) => {
        const progressBar = '█'.repeat(Math.floor(status.progress / 5));
        const emptyBar = '░'.repeat(20 - Math.floor(status.progress / 5));

        switch (status.status) {
          case 'checking':
            console.log(`🔍 ${status.message}`);
            break;
          case 'downloading':
            console.log(
              `⬇️  [${progressBar}${emptyBar}] ${status.progress}% - ${status.message}`
            );
            break;
          case 'installing':
            console.log(
              `⚙️  [${progressBar}${emptyBar}] ${status.progress}% - ${status.message}`
            );
            break;
          case 'completed':
            console.log(`✅ ${status.message}`);
            break;
          case 'failed':
            console.error(`❌ ${status.message}: ${status.error}`);
            break;
        }
      },
    });

    console.log('\n🎉 Update completed successfully!');
  } catch (error) {
    console.error('\n❌ Update failed:', error);
  } finally {
    await service.cleanup();
  }
}

/**
 * Example 6: Backup management
 */
async function example6_BackupManagement() {
  console.log('\n=== Example 6: Backup Management ===\n');

  const service = createVersionService();

  try {
    const tool = 'claude-code';

    // List existing backups
    const backups = await service.listBackups(tool);
    console.log(`📦 Found ${backups.length} backups for ${tool}:`);
    for (const backup of backups) {
      console.log(`  - ${backup}`);
    }

    // Update with backup
    console.log('\n🔄 Updating with backup...');
    await service.updateTool(tool, undefined, {
      backup: true,
      onProgress: (status) => {
        if (status.status === 'checking' && status.message?.includes('backup')) {
          console.log(`💾 ${status.message}`);
        }
      },
    });

    // List backups after update
    const newBackups = await service.listBackups(tool);
    console.log(`\n📦 Now have ${newBackups.length} backups`);

    // Clean old backups (keep 5 most recent)
    const deleted = await service.cleanBackups(tool, 5);
    console.log(`\n🧹 Cleaned ${deleted} old backups`);

    const remainingBackups = await service.listBackups(tool);
    console.log(`📦 ${remainingBackups.length} backups remaining`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await service.cleanup();
  }
}

/**
 * Example 7: Configuration import/export
 */
async function example7_ConfigManagement() {
  console.log('\n=== Example 7: Configuration Management ===\n');

  const service = createVersionService();

  try {
    // Setup some schedules
    service.scheduleCheck('claude-code', 3600000, true);
    service.scheduleCheck('aider', 7200000, false);

    // Check some versions (populate cache)
    await service.batchCheckVersions(['claude-code', 'aider']);

    // Export configuration
    const exported = service.exportConfig();
    console.log('📤 Exported configuration:');
    console.log(exported.substring(0, 200) + '...');

    // Create new service and import
    const newService = createVersionService();
    newService.importConfig(exported);

    console.log('\n📥 Imported configuration to new service');

    const schedules = newService.getAllSchedules();
    console.log(`✅ Restored ${schedules.length} schedules`);

    const cacheStats = newService.getCacheStats();
    console.log(`✅ Restored cache with ${cacheStats.size} entries`);

    await newService.cleanup();
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await service.cleanup();
  }
}

/**
 * Example 8: Error handling and retry
 */
async function example8_ErrorHandling() {
  console.log('\n=== Example 8: Error Handling and Retry ===\n');

  const service = createVersionService({
    retryAttempts: 3,
    retryDelay: 1000,
  });

  try {
    console.log('Attempting to check non-existent tool...');

    try {
      await service.checkVersion('non-existent-tool', { force: true });
    } catch (error) {
      console.log(`❌ Check failed: ${error}`);
    }

    // Check statistics
    const stats = service.getStats();
    console.log(`\n📊 Statistics after failure:`);
    console.log(`  Total checks: ${stats.totalChecks}`);
    console.log(`  Failed checks: ${stats.failedChecks}`);

    // Try update with error handling
    console.log('\nAttempting update with error handling...');

    try {
      await service.updateTool('non-existent-tool');
    } catch (error) {
      console.log(`❌ Update failed: ${error}`);
      console.log('✅ Error handled gracefully');
    }
  } finally {
    await service.cleanup();
  }
}

/**
 * Example 9: Real-time monitoring
 */
async function example9_Monitoring() {
  console.log('\n=== Example 9: Real-time Monitoring ===\n');

  const service = createVersionService();

  // Setup monitoring
  setInterval(() => {
    const stats = service.getStats();
    const cacheStats = service.getCacheStats();

    console.log('\n📊 System Status:');
    console.log(`  Checks: ${stats.totalChecks} (${stats.failedChecks} failed)`);
    console.log(`  Cache: ${cacheStats.size} entries, ${(cacheStats.hitRate * 100).toFixed(1)}% hit rate`);
    console.log(`  Updates: ${stats.totalUpdates} (${stats.successfulUpdates} successful)`);
    console.log(`  Avg check time: ${stats.averageCheckTime.toFixed(2)}ms`);

    // Alert if cache hit rate is low
    if (cacheStats.hitRate < 0.5 && stats.totalChecks > 10) {
      console.log('⚠️  Warning: Low cache hit rate, consider increasing TTL');
    }
  }, 5000);

  // Run for 15 seconds
  await new Promise((resolve) => setTimeout(resolve, 15000));

  await service.cleanup();
}

/**
 * Example 10: Update all tools
 */
async function example10_UpdateAll() {
  console.log('\n=== Example 10: Update All Tools ===\n');

  const service = createVersionService();

  const tools = ['claude-code', 'aider', 'cursor'];

  try {
    console.log(`Checking for updates for ${tools.length} tools...\n`);

    // Get tools with updates
    const toolsWithUpdates = await service.getToolsWithUpdates(tools);

    console.log(`Found ${toolsWithUpdates.length} tools with updates:`);
    for (const tool of toolsWithUpdates) {
      console.log(`  - ${tool}`);
    }

    if (toolsWithUpdates.length > 0) {
      console.log('\nUpdating all tools...');

      const results = await service.updateAllTools(toolsWithUpdates, {
        backup: true,
      });

      console.log('\n📊 Update Results:');
      for (const [tool, success] of results) {
        console.log(`  ${tool}: ${success ? '✅ Success' : '❌ Failed'}`);
      }
    } else {
      console.log('\n✅ All tools are up to date!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await service.cleanup();
  }
}

// Run examples
async function runExamples() {
  console.log('🚀 Version Management System - Usage Examples\n');
  console.log('='.repeat(60));

  // Uncomment to run specific examples
  // await example1_BasicCheckAndUpdate();
  // await example2_BatchCheck();
  // await example3_ScheduledChecks();
  // await example4_CacheOptimization();
  // await example5_ProgressTracking();
  // await example6_BackupManagement();
  // await example7_ConfigManagement();
  // await example8_ErrorHandling();
  // await example9_Monitoring();
  // await example10_UpdateAll();

  console.log('\n' + '='.repeat(60));
  console.log('✅ Examples completed!');
}

// Export examples
export {
  example1_BasicCheckAndUpdate,
  example2_BatchCheck,
  example3_ScheduledChecks,
  example4_CacheOptimization,
  example5_ProgressTracking,
  example6_BackupManagement,
  example7_ConfigManagement,
  example8_ErrorHandling,
  example9_Monitoring,
  example10_UpdateAll,
  runExamples,
};

// Run if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}
