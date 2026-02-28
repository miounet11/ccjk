/**
 * Example: Auto-Memory Bridge Integration
 *
 * This example shows how to use the auto-memory bridge to sync
 * Claude Code's auto-memory with CCJK Brain.
 */

import { AutoMemoryBridge, syncAutoMemoryToBrain } from '../src/brain/auto-memory-bridge.js';
import type { BrainSession } from '../src/brain/types.js';

// Mock session creator for examples
function createMockSession(projectPath: string): BrainSession {
  return {
    id: 'example-session',
    context: {
      facts: [],
      patterns: [],
      decisions: [],
      metadata: {},
    },
    metadata: {
      projectPath,
      createdAt: new Date().toISOString(),
    },
  };
}

// Example 1: Basic one-time sync
async function basicSync() {
  console.log('Example 1: Basic one-time sync');
  console.log('================================');

  const session = createMockSession('/Users/lu/ccjk-public');

  // Manually sync auto-memory
  await syncAutoMemoryToBrain(session);

  console.log('Facts from auto-memory:', session.context.facts.length);
  console.log('Patterns from auto-memory:', session.context.patterns.length);
  console.log('Decisions from auto-memory:', session.context.decisions.length);
  console.log('');
}

// Example 2: Periodic sync with bidirectional support
async function periodicSync() {
  console.log('Example 2: Periodic sync with bidirectional support');
  console.log('===================================================');

  const bridge = new AutoMemoryBridge({
    syncInterval: 60000, // Sync every 60 seconds
    bidirectional: true, // Enable two-way sync
  });

  const session = createMockSession('/Users/lu/ccjk-public');

  // Enable auto-sync
  await bridge.sync(session);
  bridge.startSync(session);

  console.log('Auto-sync enabled (every 60 seconds)');

  // Do some work...
  session.context.facts.push({
    key: 'New Feature',
    value: 'Implemented auto-memory bridge',
    confidence: 1.0,
  });

  console.log('Added new fact to Brain context');

  // Changes will be synced automatically every 60 seconds
  // Or manually trigger sync:
  await bridge.sync(session);
  console.log('Manual sync completed');

  // Cleanup
  bridge.stopSync();
  console.log('Auto-sync stopped');
  console.log('');
}

// Example 3: Read-only sync (default)
async function readOnlySync() {
  console.log('Example 3: Read-only sync');
  console.log('==========================');

  const bridge = new AutoMemoryBridge({
    syncInterval: 0, // No auto-sync
    bidirectional: false, // Read-only
  });

  const session = createMockSession('/Users/lu/ccjk-public');

  // One-time sync from auto-memory to Brain
  await bridge.sync(session);

  console.log('Loaded context from auto-memory (read-only)');
  console.log('Facts:', session.context.facts.length);
  console.log('Patterns:', session.context.patterns.length);
  console.log('Decisions:', session.context.decisions.length);
  console.log('');
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await basicSync();
      await periodicSync();
      await readOnlySync();

      console.log('✨ All examples completed successfully!');
    } catch (error) {
      console.error('Error running examples:', error);
      process.exit(1);
    }
  })();
}
