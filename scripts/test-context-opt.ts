#!/usr/bin/env tsx
/**
 * Manual test for context optimization
 */

import { ToolSandbox } from '../src/context/tool-sandbox';
import { SemanticCompressor } from '../src/context/semantic-compressor';
import { ContextOptimizer } from '../src/context/context-optimizer';

console.log('\n🧪 Testing Context Optimization\n');

// Test 1: ToolSandbox
console.log('1️⃣ Testing ToolSandbox...');
const sandbox = new ToolSandbox();

const largeJson = JSON.stringify(Array(100).fill({ id: 1, name: 'test', data: 'x'.repeat(100) }));
const result1 = sandbox.process({
  toolName: 'Read',
  raw: largeJson,
  size: largeJson.length
});

console.log(`   Original: ${result1.originalSize} bytes`);
console.log(`   Compressed: ${result1.summary.length} bytes`);
console.log(`   Ratio: ${(result1.compressionRatio * 100).toFixed(1)}%`);
console.log(`   ✅ ToolSandbox works\n`);

// Test 2: SemanticCompressor
console.log('2️⃣ Testing SemanticCompressor...');
const compressor = new SemanticCompressor();

const messages = Array(20).fill(null).map((_, i) => ([
  { role: 'user' as const, content: `User message ${i}: ${'x'.repeat(500)}` },
  { role: 'assistant' as const, content: `Assistant response ${i}: ${'y'.repeat(500)}` },
])).flat();

const compressed = compressor.compress(messages);
const stats = compressor.getStats(messages, compressed);

console.log(`   Original: ${stats.originalSize} bytes`);
console.log(`   Compressed: ${stats.compressedSize} bytes`);
console.log(`   Ratio: ${(stats.compressionRatio * 100).toFixed(1)}%`);
console.log(`   ✅ SemanticCompressor works\n`);

// Test 3: ContextOptimizer (without MemoryTree)
console.log('3️⃣ Testing ContextOptimizer...');
const optimizer = new ContextOptimizer({
  enabled: true,
  toolCompression: true,
  semanticCompression: true,
  memoryTree: false // Disable to avoid SQLite dependency
});

const testMessages = [
  { role: 'user', content: 'Test message' },
  { role: 'tool', tool_name: 'Read', content: 'x'.repeat(50000) },
  { role: 'assistant', content: 'Response' }
];

optimizer.optimizeContext(testMessages, 'test-session')
  .then(({ messages: optimized, metrics }) => {
    console.log(`   Original: ${metrics.originalSize} bytes`);
    console.log(`   Compressed: ${metrics.compressedSize} bytes`);
    console.log(`   Ratio: ${(metrics.compressionRatio * 100).toFixed(1)}%`);
    console.log(`   Latency: ${metrics.latencyMs}ms`);
    console.log(`   Tool results compressed: ${metrics.toolResultsCompressed}`);
    console.log(`   ✅ ContextOptimizer works\n`);

    optimizer.close();

    console.log('✅ All tests passed!\n');
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
