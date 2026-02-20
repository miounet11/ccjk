# FTS5 Full-Text Search Quick Start

Quick reference guide for using FTS5 full-text search in CCJK context persistence.

## Installation

FTS5 is built into SQLite and requires no additional dependencies. It's automatically enabled when you use `ContextPersistence`.

## Basic Usage

```typescript
import { getContextPersistence } from '@/context/persistence'

const persistence = getContextPersistence()

// Simple search
const results = persistence.searchContexts('authentication')

// Access results
results.forEach(result => {
  console.log(result.id)        // Context ID
  console.log(result.rank)      // BM25 score (lower = more relevant)
  console.log(result.snippet)   // Highlighted excerpt
  console.log(result.content)   // Full content
})
```

## Query Syntax Cheat Sheet

### Basic Queries
```typescript
// Single word
persistence.searchContexts('authentication')

// Multiple words (implicit OR)
persistence.searchContexts('database migration')

// Exact phrase
persistence.searchContexts('"user authentication"')
```

### Boolean Operators
```typescript
// AND - both terms required
persistence.searchContexts('JWT AND authentication')

// OR - either term required
persistence.searchContexts('API OR GraphQL')

// NOT - exclude term
persistence.searchContexts('security NOT deprecated')

// Complex - use parentheses
persistence.searchContexts('(auth OR security) AND JWT')
```

### Advanced Operators
```typescript
// NEAR - terms within 5 tokens
persistence.searchContexts('user NEAR/5 authentication')

// Prefix match
persistence.searchContexts('auth*')  // matches auth, authentication, authorize

// Column-specific search
persistence.searchContexts('content:authentication')
```

## Filtering and Sorting

```typescript
// Filter by project
persistence.searchContexts('API', {
  projectHash: 'project-123',
})

// Filter by time range
persistence.searchContexts('authentication', {
  startTime: Date.now() - 86400000,  // Last 24 hours
  endTime: Date.now(),
})

// Limit results
persistence.searchContexts('database', {
  limit: 20,
})

// Sort by different criteria
persistence.searchContexts('API', {
  sortBy: 'relevance',    // Default for search
  sortOrder: 'desc',
})

persistence.searchContexts('API', {
  sortBy: 'timestamp',    // Most recent first
  sortOrder: 'desc',
})

persistence.searchContexts('API', {
  sortBy: 'accessCount',  // Most accessed first
  sortOrder: 'desc',
})
```

## Hot/Warm/Cold Queries

Optimized queries for different access patterns:

```typescript
// Hot: frequently accessed, recently used (best for caching)
const hot = persistence.getHotContexts('project-123', 10)

// Warm: accessed multiple times but not recently
const warm = persistence.getWarmContexts('project-123', 10)

// Cold: rarely accessed (candidates for cleanup)
const cold = persistence.getColdContexts('project-123', 10)
```

## Common Use Cases

### 1. Search with Autocomplete
```typescript
function searchWithAutocomplete(query: string) {
  // Use prefix match for autocomplete
  const results = persistence.searchContexts(`${query}*`, {
    limit: 10,
    sortBy: 'relevance',
  })
  return results.map(r => ({
    id: r.id,
    title: r.snippet,
    preview: r.content.substring(0, 100),
  }))
}
```

### 2. Find Related Contexts
```typescript
function findRelated(contextId: string) {
  const context = persistence.getContext(contextId)
  if (!context) return []

  // Extract key terms from content
  const terms = extractKeyTerms(context.content)
  const query = terms.join(' OR ')

  return persistence.searchContexts(query, {
    limit: 5,
  }).filter(r => r.id !== contextId)
}
```

### 3. Cache Management
```typescript
function optimizeCache(projectHash: string, maxCacheSize: number) {
  // Load hot contexts into cache
  const hot = persistence.getHotContexts(projectHash, 50)
  hot.forEach(ctx => cache.set(ctx.id, ctx))

  // Evict cold contexts if cache is full
  if (cache.size > maxCacheSize) {
    const cold = persistence.getColdContexts(projectHash, 100)
    cold.forEach(ctx => cache.delete(ctx.id))
  }
}
```

### 4. Search with Filters
```typescript
function searchRecent(query: string, projectHash: string, days: number = 7) {
  const startTime = Date.now() - (days * 24 * 60 * 60 * 1000)

  return persistence.searchContexts(query, {
    projectHash,
    startTime,
    limit: 20,
    sortBy: 'relevance',
  })
}
```

### 5. Multi-Criteria Search
```typescript
function advancedSearch({
  keywords,
  requiredTerms,
  excludedTerms,
  projectHash,
  limit = 20,
}: {
  keywords: string[]
  requiredTerms?: string[]
  excludedTerms?: string[]
  projectHash?: string
  limit?: number
}) {
  // Build query
  const parts: string[] = []

  if (keywords.length > 0) {
    parts.push(`(${keywords.join(' OR ')})`)
  }

  if (requiredTerms && requiredTerms.length > 0) {
    parts.push(...requiredTerms.map(t => `AND ${t}`))
  }

  if (excludedTerms && excludedTerms.length > 0) {
    parts.push(...excludedTerms.map(t => `NOT ${t}`))
  }

  const query = parts.join(' ')

  return persistence.searchContexts(query, {
    projectHash,
    limit,
    sortBy: 'relevance',
  })
}

// Usage
const results = advancedSearch({
  keywords: ['authentication', 'security'],
  requiredTerms: ['JWT'],
  excludedTerms: ['deprecated', 'legacy'],
  projectHash: 'project-123',
  limit: 10,
})
```

## Performance Tips

### ✅ Do
- Use specific queries: `'JWT authentication'` instead of `'the'`
- Apply limits: `{ limit: 20 }`
- Filter by project: `{ projectHash: 'project-123' }`
- Use hot/warm/cold queries for access patterns
- Clean up old contexts regularly

### ❌ Don't
- Search for very common words without other terms
- Omit limits on large datasets
- Use wildcards at the beginning: `'*auth'` (not supported)
- Search without filters on multi-project databases

## Troubleshooting

### No Results Found
```typescript
// Check if query is valid
const results = persistence.searchContexts('test')
if (results.length === 0) {
  // Try broader query
  const broader = persistence.searchContexts('test*')
  // Or check if contexts exist
  const all = persistence.getProjectContexts('project-123', { limit: 10 })
}
```

### Slow Search
```typescript
// Add more filters
const results = persistence.searchContexts('query', {
  projectHash: 'project-123',  // Reduce search space
  limit: 20,                    // Limit results
  startTime: recentTime,        // Filter by time
})

// Or clean up old data
persistence.cleanup(30 * 24 * 60 * 60 * 1000)  // 30 days
persistence.vacuum()
```

### Special Characters
```typescript
// Escape or simplify queries with special characters
const query = userInput.replace(/[^a-zA-Z0-9\s]/g, ' ')
const results = persistence.searchContexts(query)
```

## API Reference

### `searchContexts(query, options?)`
Full-text search with FTS5.

**Parameters:**
- `query: string` - Search query (supports FTS5 syntax)
- `options?: ContextQueryOptions` - Optional filters and sorting

**Returns:** `SearchResult[]` - Array of results with rank and snippet

### `getHotContexts(projectHash, limit)`
Get frequently accessed, recently used contexts.

**Parameters:**
- `projectHash: string` - Project identifier
- `limit: number` - Maximum results (default: 10)

**Returns:** `PersistedContext[]`

### `getWarmContexts(projectHash, limit)`
Get moderately accessed contexts.

**Parameters:**
- `projectHash: string` - Project identifier
- `limit: number` - Maximum results (default: 10)

**Returns:** `PersistedContext[]`

### `getColdContexts(projectHash, limit)`
Get rarely accessed contexts.

**Parameters:**
- `projectHash: string` - Project identifier
- `limit: number` - Maximum results (default: 10)

**Returns:** `PersistedContext[]`

## Examples Repository

See `/Users/lu/ccjk-public/src/context/__tests__/fts5-search.test.ts` for comprehensive examples.

## Benchmarks

Run performance benchmarks:
```bash
pnpm tsx scripts/benchmark-fts5-search.ts
```

Expected performance (M1 MacBook Pro):
- 100 contexts: 2-3ms per search
- 1000 contexts: 5-8ms per search
- 5000 contexts: 8-12ms per search

## Further Reading

- [Full Documentation](../src/context/PERSISTENCE.md)
- [Implementation Summary](../FTS5_IMPLEMENTATION_SUMMARY.md)
- [SQLite FTS5 Documentation](https://www.sqlite.org/fts5.html)
