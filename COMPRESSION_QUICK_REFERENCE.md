# Compression Quick Reference

## Honest Metrics

| Method | Token Reduction | Processing Time | Use Case |
|--------|----------------|-----------------|----------|
| **Rule-based** | 30-50% | <10ms | Real-time, interactive |
| **LLM-based** | 40-60% | ~500ms | Batch, high quality |

## Usage

### Rule-Based (Synchronous)
```typescript
import { SemanticCompression } from './compression/algorithms/semantic-compression'

const compressor = new SemanticCompression(0.5) // 0.5 = balanced
const result = compressor.compress(text)
console.log(`Reduced ${result.originalSize} → ${result.compressedSize} chars`)
```

### LLM-Based (Async)
```typescript
import { createApiClient } from '../../utils/context/api-client'

const apiClient = createApiClient({ apiKey: process.env.ANTHROPIC_API_KEY })
const compressor = new SemanticCompression(0.5, apiClient)
const result = await compressor.compressAsync(text)
```

## Aggressiveness Levels

| Level | Range | Target Size | Reduction | Use Case |
|-------|-------|-------------|-----------|----------|
| Conservative | 0.0-0.3 | 60-70% | 30-40% | Critical code |
| Balanced | 0.3-0.7 | 40-60% | 40-60% | General use (default) |
| Aggressive | 0.7-1.0 | 30-40% | 60-70% | Large contexts |

## What Gets Preserved

✅ **Always**:
- Function/variable/file names
- Code structure and syntax
- Numbers, metrics, URLs
- Error messages and solutions
- Technical terms and decisions

🔄 **Compressed**:
- Redundant whitespace
- Verbose explanations
- Filler words
- Common phrases

⚠️ **May Be Lost** (Aggressive):
- Detailed explanations
- Example code
- Background context

## Testing

```bash
# Run benchmark
pnpm tsx scripts/benchmark-compression.ts

# Run tests
pnpm test src/context/__tests__/compression-quality.test.ts

# Check for "73%" claims
grep -r "73%" README.md docs/ | grep -v COMPRESSION
```

## Documentation Updated

- ✅ README.md
- ✅ docs/comparison-table.md
- ✅ docs/cta-section.md
- ✅ docs/faq.md
- ✅ docs/cloud-service-upgrade.md
- ✅ docs/readme-optimization.md
- ✅ docs/social-proof-content.md
- ✅ docs/testimonials.md

## Key Changes

**Before**: "73% token reduction" (misleading)
**After**: "30-50% (rule-based) or 40-60% (LLM-based)" (honest)

**Before**: String manipulation hacks
**After**: Proper LLM-based summarization

**Before**: No transparency
**After**: Clear documentation of methods and preservation
