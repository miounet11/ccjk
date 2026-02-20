# Context Compression System

Intelligent context compression for AI conversations using both rule-based and LLM-based approaches.

## Overview

The compression system provides two modes:

1. **Rule-based Compression** (synchronous, fast)
   - Uses pattern matching and text manipulation
   - 30-50% token reduction
   - <10ms processing time
   - Preserves code structure and key information
   - Partially reversible

2. **LLM-based Compression** (async, high quality)
   - Uses Claude Haiku for intelligent summarization
   - 40-60% token reduction
   - ~500ms processing time
   - Excellent semantic preservation
   - Lossy (not reversible)

## Usage

### Rule-based Compression

```typescript
import { SemanticCompression } from './compression/algorithms/semantic-compression'

const compressor = new SemanticCompression(0.5) // 0.5 = balanced aggressiveness

const result = compressor.compress(text)
console.log(`Reduced from ${result.originalSize} to ${result.compressedSize} chars`)

// Decompress (partial restoration)
const decompressed = compressor.decompress(result.compressed)
```

### LLM-based Compression

```typescript
import { SemanticCompression } from './compression/algorithms/semantic-compression'
import { createApiClient } from '../../utils/context/api-client'

const apiClient = createApiClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-haiku-20241022',
})

const compressor = new SemanticCompression(0.5, apiClient)

const result = await compressor.compressAsync(text)
console.log(`Compressed: ${result.compressed}`)
```

### Aggressiveness Levels

- **0.0 - 0.3**: Conservative - Preserves most details
- **0.3 - 0.7**: Balanced - Good compression with key info preserved
- **0.7 - 1.0**: Aggressive - Maximum compression, may lose details

```typescript
const conservative = new SemanticCompression(0.2)
const balanced = new SemanticCompression(0.5)
const aggressive = new SemanticCompression(0.8)
```

## Compression Strategies

### Conservative Strategy

```typescript
import { ConservativeStrategy } from './strategies/conservative'

const strategy = new ConservativeStrategy()
const result = strategy.compress(text)
```

- Minimal compression
- Preserves accuracy
- Best for sensitive content

### Balanced Strategy

```typescript
import { BalancedStrategy } from './strategies/balanced'

const strategy = new BalancedStrategy()
const result = strategy.compress(text)
```

- Moderate compression
- Good balance of size and accuracy
- Recommended for most use cases

### Aggressive Strategy

```typescript
import { AggressiveStrategy } from './strategies/aggressive'

const strategy = new AggressiveStrategy()
const result = strategy.compress(text)
```

- Maximum compression
- May lose some details
- Best for large contexts

## Benchmarking

Run the benchmark script to measure compression performance:

```bash
# Rule-based compression
npm run benchmark:compression

# LLM-based compression (requires API key)
ANTHROPIC_API_KEY=your_key npm run benchmark:compression
```

The benchmark tests compression on:
- Sample conversation contexts
- Actual source code files
- Various text sizes and types

## What Gets Preserved

### Always Preserved
- Function and variable names
- Code structure and syntax
- Key decisions and outcomes
- Error messages and solutions
- File paths and URLs
- Numbers and metrics
- Technical terms

### May Be Compressed
- Redundant whitespace
- Verbose explanations
- Filler words
- Common phrases
- Repeated content

### May Be Lost (Aggressive Mode)
- Detailed explanations
- Example code
- Background context
- Conversational elements

## Performance Characteristics

### Rule-based Compression

| Text Size | Processing Time | Compression Ratio |
|-----------|----------------|-------------------|
| 1KB       | <5ms           | 30-40%            |
| 10KB      | <10ms          | 35-45%            |
| 100KB     | <50ms          | 40-50%            |

### LLM-based Compression

| Text Size | Processing Time | Compression Ratio |
|-----------|----------------|-------------------|
| 1KB       | ~300ms         | 40-50%            |
| 10KB      | ~500ms         | 45-55%            |
| 100KB     | ~1000ms        | 50-60%            |

## Testing

Run compression quality tests:

```bash
npm test src/context/__tests__/compression-quality.test.ts
```

Tests verify:
- Code structure preservation
- Key information retention
- Compression ratios
- Decompression accuracy
- Edge case handling

## Best Practices

1. **Use rule-based for real-time compression**
   - Fast, synchronous
   - Good for interactive applications

2. **Use LLM-based for batch processing**
   - Higher quality
   - Better semantic understanding
   - Requires API key

3. **Choose appropriate aggressiveness**
   - Start with 0.5 (balanced)
   - Increase for larger contexts
   - Decrease for critical information

4. **Monitor compression ratios**
   - Run benchmarks regularly
   - Verify information preservation
   - Adjust aggressiveness as needed

5. **Handle errors gracefully**
   - LLM compression can fail (API errors)
   - Always have rule-based fallback
   - Log compression metrics

## Architecture

```
compression/
├── algorithms/
│   ├── semantic-compression.ts  # Main compression logic
│   ├── lz-compression.ts        # LZ-based compression
│   └── token-dedup.ts           # Token deduplication
├── strategies/
│   ├── conservative.ts          # Conservative strategy
│   ├── balanced.ts              # Balanced strategy
│   └── aggressive.ts            # Aggressive strategy
└── README.md                    # This file
```

## Future Improvements

- [ ] Add more compression algorithms (Brotli, Zstandard)
- [ ] Implement adaptive compression (auto-adjust aggressiveness)
- [ ] Add compression quality metrics
- [ ] Support streaming compression
- [ ] Add compression presets for different content types
- [ ] Implement multi-pass compression
- [ ] Add compression visualization tools

## References

- [Claude API Documentation](https://docs.anthropic.com/)
- [Token Estimation](../../utils/context/token-estimator.ts)
- [Benchmark Script](../../../scripts/benchmark-compression.ts)
