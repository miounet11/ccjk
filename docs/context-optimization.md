# Context Optimization System

## Quick Start

```bash
# Enable context optimization
export CCJK_CONTEXT_OPTIMIZATION=true
export CCJK_TOOL_COMPRESSION=true

# View configuration
ccjk context-opt config
```

## Features

### 1. Tool Result Compression (90%+ reduction)

自动压缩工具输出，保留关键信息：

```typescript
// Before: 50KB JSON array
[{id: 1, data: '...'}, {id: 2, data: '...'}, ...] // 1000 items

// After: 2KB summary
{
  _type: 'array',
  length: 1000,
  sample: [{id: 1}, {id: 2}, {id: 3}],
  schema: { id: 'number', data: 'string' }
}
```

### 2. Semantic Message Compression

压缩历史消息，保留最近对话：

```typescript
// Keeps recent 5 messages intact
// Compresses older messages:
// - User: Extract intent + entities
// - Assistant: Extract decisions + code blocks
```

### 3. Memory Tree (Optional)

持久化记忆系统，需要 SQLite：

```bash
# Enable memory tree
export CCJK_MEMORY_TREE=true

# View statistics
ccjk context-opt stats

# Search memory
ccjk context-opt search "authentication"

# Run decay
ccjk context-opt decay --dry-run
```

## Configuration

### Environment Variables

```bash
# Master switch (default: false)
CCJK_CONTEXT_OPTIMIZATION=true

# Tool compression (default: true when optimization enabled)
CCJK_TOOL_COMPRESSION=true

# Semantic compression (default: false)
CCJK_SEMANTIC_COMPRESSION=true

# Memory tree - requires SQLite (default: false)
CCJK_MEMORY_TREE=true

# Max context tokens (default: 150000)
CCJK_MAX_CONTEXT_TOKENS=150000

# Compression timeout in ms (default: 50)
CCJK_COMPRESSION_TIMEOUT=50
```

### Recommended Settings

**Minimal** (no dependencies):
```bash
CCJK_CONTEXT_OPTIMIZATION=true
CCJK_TOOL_COMPRESSION=true
```

**Full** (requires SQLite):
```bash
CCJK_CONTEXT_OPTIMIZATION=true
CCJK_TOOL_COMPRESSION=true
CCJK_SEMANTIC_COMPRESSION=true
CCJK_MEMORY_TREE=true
```

## CLI Commands

```bash
# Show configuration
ccjk context-opt config

# Memory tree commands (requires CCJK_MEMORY_TREE=true)
ccjk context-opt stats              # View statistics
ccjk context-opt search "query"     # Search memory
ccjk context-opt decay              # Run decay
ccjk context-opt decay --dry-run    # Preview decay
```

## Programmatic Usage

```typescript
import { ContextOptimizer } from '@/context';

const optimizer = new ContextOptimizer({
  enabled: true,
  toolCompression: true,
  semanticCompression: false,
  memoryTree: false
});

// Optimize context
const { messages, metrics } = await optimizer.optimizeContext(
  conversationMessages,
  sessionId
);

console.log(`Compressed: ${metrics.compressionRatio * 100}%`);
console.log(`Latency: ${metrics.latencyMs}ms`);
```

## Performance

| Component | Compression | Latency |
|-----------|-------------|----------|
| ToolSandbox | 90-95% | <50ms |
| SemanticCompressor | 60-80% | <100ms |
| Combined | 85-95% | <150ms |

## Troubleshooting

### SQLite not available

If you see errors about `better-sqlite3`, disable memory tree:

```bash
export CCJK_MEMORY_TREE=false
```

Tool compression and semantic compression work without SQLite.

### High latency

```bash
# Reduce timeout
export CCJK_COMPRESSION_TIMEOUT=30

# Disable semantic compression
export CCJK_SEMANTIC_COMPRESSION=false
```

### Low compression ratio

```bash
# Enable all features
export CCJK_SEMANTIC_COMPRESSION=true
```

## Safety

- **Graceful fallback**: Returns original messages on error
- **Opt-in**: All features disabled by default
- **Timeout protection**: Prevents hanging
- **No data loss**: Original messages preserved

## Architecture

```
ContextOptimizer
├── ToolSandbox (no dependencies)
│   └── Compresses tool results 90%+
├── SemanticCompressor (no dependencies)
│   └── Compresses message history 60-80%
└── MemoryTree (requires SQLite)
    └── Persistent memory with FTS5 search
```
