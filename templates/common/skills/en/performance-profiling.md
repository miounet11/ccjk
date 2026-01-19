---
name: performance-profiling
description: Performance analysis and optimization recommendations
version: 1.0.0
author: CCJK
category: dev
triggers:
  - /perf
  - /performance
  - /profile
use_when:
  - "User wants performance analysis"
  - "Code is slow"
  - "Need to optimize performance"
  - "User mentions profiling"
auto_activate: false
priority: 6
difficulty: advanced
tags:
  - performance
  - optimization
  - profiling
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(node --prof *)
  - Bash(npm run *)
  - Bash(pnpm run *)
context: fork
user-invocable: true
---

# Performance Profiling Skill

## Overview

This skill provides comprehensive performance analysis and optimization recommendations for your codebase. It helps identify bottlenecks, memory issues, and provides actionable optimization strategies.

## Performance Analysis Checklist

### 1. Algorithm Complexity Analysis

**Big O Notation Review:**
- Identify loops and nested loops (O(n), O(n²), O(n³))
- Check recursive functions for exponential complexity
- Review sorting and searching algorithms
- Analyze data structure operations (arrays, objects, maps, sets)

**Red Flags:**
- Nested loops over large datasets
- Recursive functions without memoization
- Linear searches in hot paths
- Repeated array operations (filter, map, reduce chains)

### 2. Memory Usage Patterns

**Memory Profiling:**
- Check for memory leaks (event listeners, timers, closures)
- Analyze object retention and garbage collection
- Review large data structure allocations
- Monitor heap size growth over time

**Common Issues:**
- Unclosed database connections
- Unremoved event listeners
- Circular references
- Large in-memory caches without limits

### 3. I/O Operations

**File System:**
- Identify synchronous file operations (fs.readFileSync)
- Check for unnecessary file reads/writes
- Review file streaming vs. loading entire files
- Analyze temporary file cleanup

**Database:**
- Detect N+1 query problems
- Review missing indexes
- Check for full table scans
- Analyze connection pool usage

### 4. Network Requests

**HTTP/API Calls:**
- Identify sequential requests that could be parallel
- Check for missing request caching
- Review timeout configurations
- Analyze payload sizes

**Optimization Opportunities:**
- Implement request batching
- Add response caching (Redis, in-memory)
- Use HTTP/2 multiplexing
- Compress request/response payloads

### 5. Bundle Size Analysis

**Frontend Performance:**
- Analyze bundle size and composition
- Check for duplicate dependencies
- Review code splitting strategy
- Identify unused code (tree-shaking opportunities)

**Tools:**
- webpack-bundle-analyzer
- source-map-explorer
- Lighthouse CI

## Common Performance Issues

### 1. N+1 Query Problem

**Symptom:**
```javascript
// BAD: N+1 queries
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findAll({ where: { userId: user.id } });
}
```

**Solution:**
```javascript
// GOOD: Single query with join
const users = await User.findAll({
  include: [{ model: Post }]
});
```

### 2. Memory Leaks

**Common Causes:**
```javascript
// BAD: Event listener not removed
element.addEventListener('click', handler);
// Component unmounts but listener remains

// BAD: Timer not cleared
setInterval(() => { /* ... */ }, 1000);
// Component unmounts but timer continues

// BAD: Closure retaining large objects
function createHandler() {
  const largeData = new Array(1000000);
  return () => console.log(largeData.length);
}
```

**Solutions:**
```javascript
// GOOD: Cleanup event listeners
useEffect(() => {
  element.addEventListener('click', handler);
  return () => element.removeEventListener('click', handler);
}, []);

// GOOD: Clear timers
useEffect(() => {
  const timer = setInterval(() => { /* ... */ }, 1000);
  return () => clearInterval(timer);
}, []);

// GOOD: Avoid unnecessary closures
function createHandler() {
  return () => console.log('No large data retained');
}
```

### 3. Unnecessary Re-renders (React)

**Problem:**
```javascript
// BAD: Creates new object on every render
function Component() {
  const config = { theme: 'dark' }; // New object each time
  return <Child config={config} />;
}
```

**Solution:**
```javascript
// GOOD: Memoize objects
function Component() {
  const config = useMemo(() => ({ theme: 'dark' }), []);
  return <Child config={config} />;
}

// GOOD: Use React.memo for expensive components
const Child = React.memo(({ config }) => {
  // Expensive rendering logic
});
```

### 4. Large Bundle Sizes

**Issues:**
- Importing entire libraries for single functions
- No code splitting for routes
- Unoptimized images and assets
- Missing compression

**Solutions:**
```javascript
// BAD: Import entire library
import _ from 'lodash';

// GOOD: Import specific functions
import debounce from 'lodash/debounce';

// GOOD: Dynamic imports for code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## Profiling Tools Integration

### 1. Node.js Profiler

**CPU Profiling:**
```bash
# Generate CPU profile
node --prof app.js

# Process the profile
node --prof-process isolate-0x*.log > processed.txt

# Analyze the output for hot functions
```

**Heap Snapshot:**
```bash
# Take heap snapshot
node --inspect app.js
# Open chrome://inspect in Chrome
# Take heap snapshot in DevTools
```

### 2. Chrome DevTools

**Performance Tab:**
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Perform actions to profile
5. Stop recording
6. Analyze flame chart for bottlenecks

**Memory Tab:**
1. Take heap snapshots before/after actions
2. Compare snapshots to find leaks
3. Use Allocation Timeline for real-time monitoring

### 3. Lighthouse

**Run Lighthouse:**
```bash
# CLI
npm install -g lighthouse
lighthouse https://example.com --view

# Programmatic
npm install lighthouse
```

**Key Metrics:**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)

### 4. Additional Tools

**Backend:**
- `clinic.js` - Node.js performance profiling
- `autocannon` - HTTP load testing
- `0x` - Flamegraph profiler

**Frontend:**
- `react-devtools-profiler` - React component profiling
- `why-did-you-render` - Detect unnecessary re-renders
- `bundle-analyzer` - Webpack bundle analysis

## Optimization Strategies

### 1. Algorithm Optimization

**Strategy:**
- Replace O(n²) with O(n log n) or O(n)
- Use appropriate data structures (Map vs Object, Set vs Array)
- Implement caching/memoization for expensive calculations
- Consider lazy evaluation

**Example:**
```javascript
// BAD: O(n²) - nested loops
function findDuplicates(arr) {
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) duplicates.push(arr[i]);
    }
  }
  return duplicates;
}

// GOOD: O(n) - using Set
function findDuplicates(arr) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of arr) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }
  return Array.from(duplicates);
}
```

### 2. Caching Strategy

**Levels:**
1. **In-Memory Cache** - Fast, limited by RAM
2. **Redis Cache** - Shared across instances
3. **CDN Cache** - Edge caching for static assets
4. **Browser Cache** - HTTP caching headers

**Implementation:**
```javascript
// Simple in-memory cache with TTL
class Cache {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
}
```

### 3. Database Optimization

**Strategies:**
- Add indexes on frequently queried columns
- Use connection pooling
- Implement query result caching
- Optimize JOIN operations
- Use EXPLAIN to analyze query plans

**Example:**
```sql
-- Add index
CREATE INDEX idx_user_email ON users(email);

-- Analyze query
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

### 4. Lazy Loading

**Code Splitting:**
```javascript
// React lazy loading
const Dashboard = lazy(() => import('./Dashboard'));

// Route-based splitting
const routes = [
  {
    path: '/dashboard',
    component: lazy(() => import('./Dashboard'))
  }
];
```

**Image Lazy Loading:**
```html
<!-- Native lazy loading -->
<img src="image.jpg" loading="lazy" alt="Description">
```

### 5. Debouncing and Throttling

**Use Cases:**
- Search input (debounce)
- Scroll events (throttle)
- Window resize (throttle)
- API calls (debounce)

**Implementation:**
```javascript
// Debounce: Wait for pause in events
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Throttle: Limit execution rate
function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

## Performance Report Format

### Executive Summary

```markdown
## Performance Analysis Report

**Date:** [YYYY-MM-DD]
**Analyzed Files:** [Count]
**Critical Issues:** [Count]
**Optimization Opportunities:** [Count]

### Overall Performance Score: [X/10]

**Key Findings:**
1. [Most critical issue]
2. [Second most critical issue]
3. [Third most critical issue]
```

### Detailed Analysis

```markdown
## 1. Algorithm Complexity Issues

### Issue: [Description]
- **Location:** `path/to/file.js:123`
- **Current Complexity:** O(n²)
- **Impact:** High - Executed in hot path
- **Recommendation:** Use Map for O(n) lookup

**Before:**
\`\`\`javascript
[problematic code]
\`\`\`

**After:**
\`\`\`javascript
[optimized code]
\`\`\`

**Expected Improvement:** 10x faster for n=1000

---

## 2. Memory Issues

### Issue: [Description]
- **Location:** `path/to/file.js:456`
- **Type:** Memory leak - Event listener not removed
- **Impact:** Medium - Grows over time
- **Recommendation:** Add cleanup in useEffect

[Similar format for each issue]

---

## 3. Bundle Size Analysis

**Current Size:** 2.5 MB (uncompressed)
**Gzipped:** 850 KB

**Largest Dependencies:**
1. lodash - 500 KB (use lodash-es or specific imports)
2. moment - 300 KB (replace with date-fns or dayjs)
3. [other large deps]

**Recommendations:**
- Implement code splitting: -40% initial bundle
- Replace moment with dayjs: -280 KB
- Use lodash-es with tree-shaking: -400 KB

**Estimated Final Size:** 1.2 MB (-52%)

---

## 4. Network Performance

**Issues Found:**
- 15 sequential API calls (should be parallel)
- No request caching
- Large payload sizes (avg 200 KB)

**Recommendations:**
1. Use Promise.all() for parallel requests
2. Implement Redis caching for frequent queries
3. Add response compression (gzip)

**Expected Improvement:**
- API response time: -60%
- Server load: -40%

---

## Priority Action Items

### High Priority (Do First)
1. [ ] Fix N+1 query in user dashboard (10x speedup)
2. [ ] Add index on users.email column (5x speedup)
3. [ ] Remove memory leak in WebSocket handler

### Medium Priority (Do Next)
1. [ ] Implement code splitting for routes
2. [ ] Replace moment with dayjs
3. [ ] Add Redis caching for API responses

### Low Priority (Nice to Have)
1. [ ] Optimize image loading with lazy loading
2. [ ] Implement service worker for offline support
3. [ ] Add bundle size monitoring to CI

---

## Monitoring Recommendations

**Metrics to Track:**
- Response time (p50, p95, p99)
- Memory usage (heap size, GC frequency)
- Bundle size (track over time)
- Lighthouse scores (weekly)

**Tools to Implement:**
- Application Performance Monitoring (APM)
- Real User Monitoring (RUM)
- Synthetic monitoring for critical paths

---

## Conclusion

**Estimated Overall Improvement:**
- Response time: -50%
- Memory usage: -30%
- Bundle size: -52%
- User experience: Significantly improved

**Next Steps:**
1. Review and prioritize action items
2. Implement high-priority fixes
3. Set up performance monitoring
4. Schedule follow-up analysis in 2 weeks
```

## Usage Examples

### Example 1: Analyze Specific File

```
User: /perf analyze src/api/users.ts