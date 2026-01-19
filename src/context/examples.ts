/**
 * Context Optimization System - Usage Examples
 */

import {
  ContextManager,
  CompressionStrategy,
  ContextData,
} from './index';

/**
 * Example 1: Basic Usage
 */
async function basicUsage() {
  console.log('=== Example 1: Basic Usage ===\n');

  const manager = new ContextManager();

  const context: ContextData = {
    id: 'example-1',
    content: 'Hello world! This is a test. Hello world! This is a test.',
    timestamp: Date.now(),
  };

  // Compress
  const compressed = await manager.compress(context);

  console.log(`Original tokens: ${compressed.originalTokens}`);
  console.log(`Compressed tokens: ${compressed.compressedTokens}`);
  console.log(`Compression ratio: ${(compressed.compressionRatio * 100).toFixed(2)}%`);
  console.log(`Tokens saved: ${compressed.originalTokens - compressed.compressedTokens}`);

  // Decompress
  const decompressed = await manager.decompress(compressed);
  console.log(`\nDecompression successful: ${decompressed.success}`);
  console.log(`Content length: ${decompressed.content.length}\n`);
}

/**
 * Example 2: Strategy Comparison
 */
async function strategyComparison() {
  console.log('=== Example 2: Strategy Comparison ===\n');

  const manager = new ContextManager();

  const content = `
    This is a test document with repeated content.
    This is a test document with repeated content.
    We need to verify the compression functionality.
    We need to verify the compression functionality.
  `.repeat(5);

  const context: ContextData = {
    id: 'example-2',
    content,
    timestamp: Date.now(),
  };

  const strategies = [
    CompressionStrategy.CONSERVATIVE,
    CompressionStrategy.BALANCED,
    CompressionStrategy.AGGRESSIVE,
  ];

  for (const strategy of strategies) {
    const compressed = await manager.compress(context, { strategy, cache: false });

    console.log(`${strategy.toUpperCase()}:`);
    console.log(`  Compression ratio: ${(compressed.compressionRatio * 100).toFixed(2)}%`);
    console.log(`  Original: ${compressed.originalTokens} tokens`);
    console.log(`  Compressed: ${compressed.compressedTokens} tokens`);
    console.log(`  Saved: ${compressed.originalTokens - compressed.compressedTokens} tokens\n`);
  }
}

/**
 * Example 3: Cache Performance
 */
async function cachePerformance() {
  console.log('=== Example 3: Cache Performance ===\n');

  const manager = new ContextManager({
    enableCache: true,
    enableAnalytics: true,
  });

  const context: ContextData = {
    id: 'cached-context',
    content: 'Repeated content '.repeat(100),
    timestamp: Date.now(),
  };

  // First compression (cache miss)
  const start1 = Date.now();
  await manager.compress(context);
  const time1 = Date.now() - start1;

  // Second compression (cache hit)
  const start2 = Date.now();
  await manager.compress(context);
  const time2 = Date.now() - start2;

  console.log(`First compression (cache miss): ${time1}ms`);
  console.log(`Second compression (cache hit): ${time2}ms`);
  console.log(`Speedup: ${(time1 / time2).toFixed(2)}x\n`);

  const efficiency = manager.getCacheEfficiency();
  console.log(`Cache hit rate: ${(efficiency.hitRate * 100).toFixed(2)}%`);
  console.log(`Cache utilization: ${(efficiency.utilizationRate * 100).toFixed(2)}%\n`);
}

/**
 * Example 4: Batch Operations
 */
async function batchOperations() {
  console.log('=== Example 4: Batch Operations ===\n');

  const manager = new ContextManager();

  const contexts: ContextData[] = [];
  for (let i = 0; i < 10; i++) {
    contexts.push({
      id: `batch-${i}`,
      content: `Document ${i}: ${'Content '.repeat(50)}`,
      timestamp: Date.now(),
    });
  }

  // Batch compress
  const startCompress = Date.now();
  const compressed = await manager.compressBatch(contexts);
  const compressTime = Date.now() - startCompress;

  console.log(`Compressed ${compressed.length} contexts in ${compressTime}ms`);
  console.log(`Average time per context: ${(compressTime / compressed.length).toFixed(2)}ms`);

  // Calculate total savings
  const totalOriginal = compressed.reduce((sum, c) => sum + c.originalTokens, 0);
  const totalCompressed = compressed.reduce((sum, c) => sum + c.compressedTokens, 0);
  const totalSaved = totalOriginal - totalCompressed;

  console.log(`\nTotal original tokens: ${totalOriginal}`);
  console.log(`Total compressed tokens: ${totalCompressed}`);
  console.log(`Total saved: ${totalSaved} tokens`);
  console.log(`Average ratio: ${((1 - totalCompressed / totalOriginal) * 100).toFixed(2)}%\n`);

  // Batch decompress
  const startDecompress = Date.now();
  const decompressed = await manager.decompressBatch(compressed);
  const decompressTime = Date.now() - startDecompress;

  console.log(`Decompressed ${decompressed.length} contexts in ${decompressTime}ms`);
  console.log(`Average time per context: ${(decompressTime / decompressed.length).toFixed(2)}ms\n`);
}

/**
 * Example 5: Analytics and Reporting
 */
async function analyticsReporting() {
  console.log('=== Example 5: Analytics and Reporting ===\n');

  const manager = new ContextManager({
    enableAnalytics: true,
  });

  // Process multiple contexts
  for (let i = 0; i < 20; i++) {
    const context: ContextData = {
      id: `analytics-${i}`,
      content: `Test content ${i}: ${'Data '.repeat(30)}`,
      timestamp: Date.now(),
    };

    await manager.compress(context, {
      strategy: i % 3 === 0
        ? CompressionStrategy.AGGRESSIVE
        : i % 3 === 1
        ? CompressionStrategy.BALANCED
        : CompressionStrategy.CONSERVATIVE,
    });
  }

  // Get analytics
  const analytics = manager.getAnalytics();

  console.log('Analytics Summary:');
  console.log(`  Total tokens processed: ${analytics.totalTokens}`);
  console.log(`  Tokens saved: ${analytics.tokensSaved}`);
  console.log(`  Savings rate: ${(analytics.savingsRate * 100).toFixed(2)}%`);
  console.log(`  Total contexts: ${analytics.compressionStats.totalContexts}`);
  console.log(`  Avg compression time: ${analytics.performance.avgCompressionTime.toFixed(2)}ms\n`);

  // Get full report
  console.log(manager.getAnalyticsReport());
}

/**
 * Example 6: Estimation and Strategy Selection
 */
async function estimationExample() {
  console.log('=== Example 6: Estimation and Strategy Selection ===\n');

  const manager = new ContextManager();

  const testText = `
    function calculateTotal(items) {
      let total = 0;
      for (const item of items) {
        total += item.price * item.quantity;
      }
      return total;
    }
  `.repeat(10);

  // Estimate savings for each strategy
  console.log('Estimated savings by strategy:');

  for (const strategy of [
    CompressionStrategy.CONSERVATIVE,
    CompressionStrategy.BALANCED,
    CompressionStrategy.AGGRESSIVE,
  ]) {
    const estimate = await manager.estimateSavings(testText, strategy);

    console.log(`\n${strategy.toUpperCase()}:`);
    console.log(`  Original tokens: ${estimate.originalTokens}`);
    console.log(`  Estimated compressed: ${estimate.estimatedCompressedTokens}`);
    console.log(`  Estimated savings: ${estimate.estimatedSavings} tokens`);
    console.log(`  Estimated ratio: ${(estimate.estimatedRatio * 100).toFixed(2)}%`);
  }

  // Find best strategy
  const best = await manager.getBestStrategy(testText);
  console.log(`\nBest strategy: ${best.strategy}`);
  console.log(`Expected ratio: ${(best.ratio * 100).toFixed(2)}%`);
  console.log(`Expected tokens: ${best.tokens}\n`);
}

/**
 * Example 7: Real-world Use Case - API Response Caching
 */
async function apiResponseCaching() {
  console.log('=== Example 7: API Response Caching ===\n');

  const manager = new ContextManager({
    enableCache: true,
    defaultStrategy: CompressionStrategy.AGGRESSIVE,
  });

  // Simulate API response
  const apiResponse = {
    status: 'success',
    data: {
      users: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        profile: {
          bio: 'This is a user bio with some repeated content.',
          interests: ['coding', 'reading', 'gaming'],
        },
      })),
    },
    metadata: {
      timestamp: Date.now(),
      version: '1.0',
    },
  };

  const context: ContextData = {
    id: 'api-response-1',
    content: JSON.stringify(apiResponse),
    timestamp: Date.now(),
    metadata: { type: 'api-response' },
  };

  // Compress
  const compressed = await manager.compress(context);

  console.log('API Response Compression:');
  console.log(`  Original size: ${context.content.length} bytes`);
  console.log(`  Compressed size: ${compressed.compressed.length} bytes`);
  console.log(`  Original tokens: ${compressed.originalTokens}`);
  console.log(`  Compressed tokens: ${compressed.compressedTokens}`);
  console.log(`  Space saved: ${(compressed.compressionRatio * 100).toFixed(2)}%`);

  // Decompress and verify
  const decompressed = await manager.decompress(compressed);
  const restored = JSON.parse(decompressed.content);

  console.log(`\nDecompression successful: ${decompressed.success}`);
  console.log(`Users restored: ${restored.data.users.length}\n`);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await basicUsage();
    await strategyComparison();
    await cachePerformance();
    await batchOperations();
    await analyticsReporting();
    await estimationExample();
    await apiResponseCaching();

    console.log('=== All Examples Completed Successfully ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export examples
export {
  basicUsage,
  strategyComparison,
  cachePerformance,
  batchOperations,
  analyticsReporting,
  estimationExample,
  apiResponseCaching,
  runAllExamples,
};

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
