import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextOptimizer } from '../../src/context/context-optimizer';
import { MemoryTree } from '../../src/context/memory-tree';
import { DecayScheduler } from '../../src/context/decay-scheduler';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = '/tmp/test-integration.db';

describe('Context Optimization Integration', () => {
  let optimizer: ContextOptimizer;
  let memoryTree: MemoryTree;

  beforeEach(() => {
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }

    // Enable all features for testing
    process.env.CCJK_CONTEXT_OPTIMIZATION = 'true';
    process.env.CCJK_TOOL_COMPRESSION = 'true';
    process.env.CCJK_SEMANTIC_COMPRESSION = 'true';
    process.env.CCJK_MEMORY_TREE = 'true';

    optimizer = new ContextOptimizer();
    memoryTree = new MemoryTree(TEST_DB);
  });

  afterEach(() => {
    optimizer.close();
    memoryTree.close();

    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }

    // Reset env
    delete process.env.CCJK_CONTEXT_OPTIMIZATION;
    delete process.env.CCJK_TOOL_COMPRESSION;
    delete process.env.CCJK_SEMANTIC_COMPRESSION;
    delete process.env.CCJK_MEMORY_TREE;
  });

  describe('End-to-end compression', () => {
    it('compresses 100-turn conversation', async () => {
      const sessionId = 'test-session';
      let messages: any[] = [];

      // Simulate 100 turns
      for (let i = 0; i < 100; i++) {
        messages.push(
          { role: 'user', content: `Question ${i}: How do I implement feature X?` },
          {
            role: 'tool',
            tool_name: 'Read',
            content: 'x'.repeat(50000) // 50KB tool result
          },
          { role: 'assistant', content: `Answer ${i}: Here's how to implement it...` }
        );

        const { messages: optimized, metrics } = await optimizer.optimizeContext(messages, sessionId);

        // Verify compression
        expect(metrics.compressionRatio).toBeGreaterThan(0.5);
        expect(metrics.latencyMs).toBeLessThan(200);

        messages = optimized;
      }

      // Final context should be manageable
      const finalSize = JSON.stringify(messages).length;
      const estimatedTokens = finalSize / 4; // rough estimate
      expect(estimatedTokens).toBeLessThan(150000);
    }, 30000); // 30s timeout
  });

  describe('Memory tree integration', () => {
    it('retrieves relevant context', async () => {
      // Add historical context
      memoryTree.addNode({
        content: 'User asked about authentication implementation',
        summary: 'Auth implementation discussion',
        confidence: 0.8,
        priority: 'P1',
        lastAccessed: new Date(),
        accessCount: 5
      });

      memoryTree.addNode({
        content: 'User asked about database schema',
        summary: 'Database schema discussion',
        confidence: 0.7,
        priority: 'P2',
        lastAccessed: new Date(),
        accessCount: 2
      });

      // Search for relevant context
      const results = memoryTree.search('authentication', 5);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].summary).toContain('Auth');
      expect(results[0].confidence).toBeGreaterThan(0.8); // Boosted after search
    });
  });

  describe('Decay scheduler', () => {
    it('reduces low-value memories', async () => {
      // Add old, unused memory
      memoryTree.addNode({
        content: 'Old discussion',
        summary: 'Old summary',
        confidence: 0.4,
        priority: 'P2',
        lastAccessed: new Date(Date.now() - 30 * 86400000), // 30 days ago
        accessCount: 0
      });

      const scheduler = new DecayScheduler(memoryTree);
      const { decayed, archived } = await scheduler.runNow();

      expect(decayed).toBeGreaterThan(0);
    });
  });

  describe('Tool result compression', () => {
    it('compresses large tool results', async () => {
      const messages = [
        { role: 'user', content: 'Read the file' },
        {
          role: 'tool',
          tool_name: 'Read',
          content: JSON.stringify(Array(1000).fill({ id: 1, data: 'x'.repeat(100) }))
        },
        { role: 'assistant', content: 'Here is the file content' }
      ];

      const { messages: optimized, metrics } = await optimizer.optimizeContext(messages, 'test');

      expect(metrics.toolResultsCompressed).toBe(1);
      expect(metrics.compressionRatio).toBeGreaterThan(0.8);

      // Tool result should be compressed
      const toolMsg = optimized.find(m => m.role === 'tool');
      expect(toolMsg.content.length).toBeLessThan(messages[1].content.length);
    });
  });

  describe('Graceful fallback', () => {
    it('returns original messages on error', async () => {
      const messages = [
        { role: 'user', content: 'Test' },
        { role: 'assistant', content: 'Response' }
      ];

      // Force error by closing optimizer
      optimizer.close();

      const { messages: result } = await optimizer.optimizeContext(messages, 'test');

      // Should return original messages
      expect(result).toEqual(messages);
    });
  });
});
