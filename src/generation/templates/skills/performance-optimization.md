# Performance Optimization

Analyze and optimize code performance with profiling and best practices.

## Triggers

- **command**: `/optimize` - Trigger with slash command
- **pattern**: `optimize performance` - Natural language trigger
- **pattern**: `优化性能` - Chinese language trigger
- **pattern**: `improve speed` - Alternative trigger

## Actions

### Action 1: prompt

Analyze code for performance issues.

```
Analyze the code for performance bottlenecks:

1. **Algorithm Complexity**
   - Time complexity (O(n), O(n²), etc.)
   - Space complexity
   - Nested loops
   - Recursive calls

2. **Data Structure Usage**
   - Inefficient data structures
   - Unnecessary data transformations
   - Large object copies

3. **React-Specific Issues** (if applicable)
   - Unnecessary re-renders
   - Missing memoization
   - Large component trees
   - Inefficient state updates

4. **Database/API Issues**
   - N+1 queries
   - Missing indexes
   - Unnecessary data fetching
   - No caching

5. **General Issues**
   - Synchronous blocking operations
   - Memory leaks
   - Large bundle sizes
   - Unoptimized images/assets
```

### Action 2: prompt

Generate optimized code.

```
Optimize the code with these techniques:

1. **Algorithm Optimization**
   - Use more efficient algorithms
   - Reduce time complexity
   - Optimize loops and iterations

2. **Caching**
   - Memoize expensive computations
   - Cache API responses
   - Use React.memo for components
   - Implement useMemo/useCallback

3. **Lazy Loading**
   - Code splitting
   - Dynamic imports
   - Lazy component loading
   - Virtual scrolling for long lists

4. **Data Structure Optimization**
   - Use appropriate data structures
   - Reduce data transformations
   - Use Set/Map for lookups

5. **Async Optimization**
   - Parallel async operations
   - Debounce/throttle events
   - Request batching

Provide:
- Optimized code
- Performance improvements (estimated)
- Benchmark comparisons
- Trade-offs and considerations
```

### Action 3: prompt

Generate performance testing code.

```
Generate performance tests to verify improvements:

1. Benchmark tests comparing before/after
2. Load testing scenarios
3. Memory profiling tests
4. Render performance tests (for React)

Use appropriate testing tools:
- Vitest for benchmarks
- React Testing Library for component tests
- Lighthouse for web performance
```

## Requirements

- **context**: code-file - Must have code to optimize

---

**Category:** performance
**Priority:** 7
**Tags:** performance, optimization, profiling, benchmarking
**Source:** smart-analysis
