# Utils Directory

Comprehensive utility library organized into logical functional groups for better navigation and developer experience.

## Overview

The utils directory provides 80+ utility functions organized into 11 categories:

- **Config** - Configuration management and validation
- **Platform** - Platform detection and path utilities
- **Command** - Command execution utilities
- **File System** - File and directory operations
- **Validation** - Type checking and validation
- **String** - String manipulation and formatting
- **Object** - Object manipulation and transformation
- **Array** - Array manipulation and transformation
- **Async** - Asynchronous operation helpers
- **Error** - Error handling and custom error classes
- **Logger** - Simple logging utilities

## Installation

```typescript
import { config, platform, command, fs, validation, string, object, array, async, error, logger } from './utils';

// Or import specific utilities
import { ConfigManager, executeCommand, sleep, unique } from './utils';
```

## Categories

### 1. Config Utilities

Configuration management with validation and persistence.

```typescript
import { ConfigManager, createValidator, validators } from './utils';

// Create config manager
const config = new ConfigManager('my-app', {
  configDir: '~/.my-app',
  validate: (cfg) => cfg.apiKey !== undefined,
});

// Save and load
await config.save({ apiKey: 'secret', timeout: 5000 });
const loaded = await config.load();

// Update
await config.update({ timeout: 10000 });

// Validation
const validator = createValidator([
  { field: 'apiKey', required: true, type: 'string' },
  { field: 'timeout', type: 'number', validator: validators.range(1000, 60000) },
]);

const result = validator.validate({ apiKey: 'key', timeout: 5000 });
if (!result.valid) {
  console.error(result.errors);
}
```

**Key Features:**
- Persistent configuration storage
- Built-in validation
- Type-safe operations
- Caching support

### 2. Platform Utilities

Platform detection and path management.

```typescript
import { getPlatform, isMacOS, getConfigDir, getHomeDir } from './utils';

// Platform detection
const platform = getPlatform(); // 'darwin' | 'linux' | 'win32'
if (isMacOS()) {
  console.log('Running on macOS');
}

// Platform-specific paths
const configDir = getConfigDir('my-app'); // ~/.config/my-app on Linux
const homeDir = getHomeDir();
const cacheDir = getCacheDir('my-app');

// Platform info
const info = getPlatformInfo();
console.log(`Platform: ${info.platform}, CPUs: ${info.cpus}`);
```

**Key Features:**
- Cross-platform compatibility
- Standard directory locations
- Environment detection (CI, Docker)
- System information

### 3. Command Utilities

Execute shell commands with proper error handling.

```typescript
import { executeCommand, commandExists, getCommandVersion } from './utils';

// Execute command
const result = await executeCommand('git', ['status'], {
  cwd: '/path/to/repo',
  timeout: 5000,
});

if (result.success) {
  console.log(result.stdout);
} else {
  console.error(result.error);
}

// Check if command exists
if (await commandExists('docker')) {
  const version = await getCommandVersion('docker', '--version');
  console.log(`Docker version: ${version}`);
}

// Stream output
await executeCommandStream('npm', ['install'], {
  onStdout: (data) => console.log(data),
  onStderr: (data) => console.error(data),
});
```

**Key Features:**
- Promise-based API
- Timeout support
- Environment variables
- Streaming output
- Version parsing

### 4. File System Utilities

Simplified file system operations.

```typescript
import { exists, readFile, writeFile, readJSON, writeJSON, ensureDir } from './utils';

// Check existence
if (await exists('/path/to/file')) {
  const content = await readFile('/path/to/file');
}

// Write file (creates directory if needed)
await writeFile('/path/to/file', 'content');

// JSON operations
await writeJSON('/path/to/config.json', { key: 'value' });
const config = await readJSON('/path/to/config.json');

// Directory operations
await ensureDir('/path/to/dir');
const files = await listFiles('/path/to/dir', true); // recursive
await deleteDir('/path/to/dir');
```

**Key Features:**
- Async/await API
- Auto-create directories
- JSON helpers
- Recursive operations
- Safe error handling

### 5. Validation Utilities

Type checking and validation functions.

```typescript
import { isDefined, isString, isEmail, isURL, assertDefined } from './utils';

// Type checks
if (isString(value) && isEmail(value)) {
  console.log('Valid email');
}

// Assertions
assertDefined(config.apiKey, 'API key is required');

// Validation
if (isURL(input) && isPort(port)) {
  // Valid URL and port
}
```

**Key Features:**
- Type guards
- Common validators (email, URL, UUID, etc.)
- Assertion helpers
- Null/undefined checks

### 6. String Utilities

String manipulation and formatting.

```typescript
import { camelCase, slugify, truncate, template, uuid } from './utils';

// Case conversion
camelCase('hello-world'); // 'helloWorld'
pascalCase('hello-world'); // 'HelloWorld'
snakeCase('helloWorld'); // 'hello_world'
kebabCase('helloWorld'); // 'hello-world'

// Formatting
truncate('Long text...', 10); // 'Long te...'
slugify('Hello World!'); // 'hello-world'
template('Hello {name}!', { name: 'World' }); // 'Hello World!'

// Generation
const id = uuid(); // '550e8400-e29b-41d4-a716-446655440000'
```

**Key Features:**
- Case conversion (camelCase, snake_case, etc.)
- Truncation and padding
- Template strings
- UUID generation
- Slugification

### 7. Object Utilities

Object manipulation and transformation.

```typescript
import { deepClone, deepMerge, get, set, pick, omit, flatten } from './utils';

// Deep operations
const clone = deepClone(obj);
const merged = deepMerge(obj1, obj2);

// Nested access
const value = get(obj, 'user.profile.name', 'default');
set(obj, 'user.profile.age', 30);

// Selection
const subset = pick(obj, ['name', 'email']);
const rest = omit(obj, ['password', 'secret']);

// Transformation
const flat = flatten({ a: { b: { c: 1 } } }); // { 'a.b.c': 1 }
const nested = unflatten(flat);
```

**Key Features:**
- Deep clone/merge
- Nested property access
- Pick/omit operations
- Flatten/unflatten
- Equality checks

### 8. Array Utilities

Array manipulation and transformation.

```typescript
import { unique, chunk, partition, intersection, sortBy, sum } from './utils';

// Deduplication
unique([1, 2, 2, 3]); // [1, 2, 3]
uniqueBy(users, 'id');

// Chunking
chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]

// Partitioning
const [evens, odds] = partition([1, 2, 3, 4], n => n % 2 === 0);

// Set operations
intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
union([1, 2], [2, 3]); // [1, 2, 3]
difference([1, 2, 3], [2]); // [1, 3]

// Math
sum([1, 2, 3, 4]); // 10
average([1, 2, 3, 4]); // 2.5
min([3, 1, 4]); // 1
max([3, 1, 4]); // 4

// Sorting
sortBy(users, 'age');
sortBy(users, u => u.name.length, 'desc');
```

**Key Features:**
- Deduplication
- Chunking and partitioning
- Set operations
- Math operations
- Sorting helpers
- Range generation

### 9. Async Utilities

Asynchronous operation helpers.

```typescript
import { sleep, retry, timeout, parallelLimit, Mutex, Semaphore } from './utils';

// Sleep
await sleep(1000);

// Retry with backoff
const result = await retry(
  async () => fetchData(),
  { maxAttempts: 3, delay: 1000, backoff: 2 }
);

// Timeout
const data = await timeout(fetchData(), 5000);

// Parallel with limit
const results = await parallelLimit(
  tasks.map(t => () => processTask(t)),
  5 // max 5 concurrent
);

// Mutex for exclusive access
const mutex = new Mutex();
await mutex.runExclusive(async () => {
  // Critical section
});

// Semaphore for limited concurrency
const semaphore = new Semaphore(3);
await semaphore.runExclusive(async () => {
  // Max 3 concurrent
});

// Wait for condition
await waitFor(() => isReady(), { timeout: 5000, interval: 100 });
```

**Key Features:**
- Sleep and delays
- Retry with exponential backoff
- Timeout handling
- Concurrency control
- Mutex and semaphore
- Debounce and throttle
- Memoization

### 10. Error Utilities

Error handling and custom error classes.

```typescript
import {
  BaseError,
  ValidationError,
  NotFoundError,
  TimeoutError,
  getErrorMessage,
  tryCatch,
  tryCatchAsync,
} from './utils';

// Custom errors
throw new ValidationError('Invalid input', { field: 'email' });
throw new NotFoundError('User not found', { userId: 123 });
throw new TimeoutError('Request timed out');

// Safe error handling
const result = tryCatch(() => JSON.parse(input));
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error.message);
}

// Async version
const asyncResult = await tryCatchAsync(async () => fetchData());

// Error formatting
const formatted = formatError(error);
console.log(formatted.message, formatted.code, formatted.statusCode);
```

**Key Features:**
- Custom error classes
- Error wrapping
- Safe try-catch wrappers
- Error formatting
- Type-safe error handling

### 11. Logger Utilities

Simple logging with levels and formatting.

```typescript
import { createLogger, logger } from './utils';

// Use default logger
logger.info('Application started');
logger.warn('Low memory');
logger.error('Failed to connect', error);
logger.debug('Debug info', { data });

// Create custom logger
const appLogger = createLogger({
  level: 'debug',
  prefix: 'MyApp',
  timestamp: true,
  colors: true,
});

appLogger.info('Custom logger message');
appLogger.setLevel('warn'); // Change level
```

**Key Features:**
- Multiple log levels
- Timestamps
- Color output
- Custom prefixes
- Configurable

## Usage Patterns

### Namespaced Imports

```typescript
import { config, platform, string, array } from './utils';

// Use namespaced
const manager = new config.ConfigManager('app');
const isUnix = platform.isUnix();
const slug = string.slugify('Hello World');
const unique = array.unique([1, 2, 2, 3]);
```

### Direct Imports

```typescript
import { ConfigManager, isUnix, slugify, unique } from './utils';

// Use directly
const manager = new ConfigManager('app');
const unix = isUnix();
const slug = slugify('Hello World');
const arr = unique([1, 2, 2, 3]);
```

## Testing

All utilities are fully tested with Jest:

```bash
npm test -- src/utils
```

Test coverage:
- Config: 95%+
- Platform: 90%+
- Command: 85%+
- File System: 90%+
- Validation: 95%+
- String: 95%+
- Object: 90%+
- Array: 95%+
- Async: 85%+
- Error: 90%+
- Logger: 85%+

## Performance

All utilities are optimized for performance:
- Zero dependencies (except Node.js built-ins)
- Minimal memory footprint
- Efficient algorithms
- Lazy evaluation where applicable

## Best Practices

1. **Use type-safe imports**: Import specific functions for better tree-shaking
2. **Handle errors**: Always handle potential errors from async operations
3. **Validate inputs**: Use validation utilities before processing data
4. **Use appropriate utilities**: Choose the right tool for the job
5. **Test your code**: Write tests using the provided utilities

## Migration Guide

If you have existing utility functions, migrate them gradually:

1. Identify similar utilities in this library
2. Replace one category at a time
3. Update imports
4. Run tests
5. Remove old utilities

## Contributing

When adding new utilities:

1. Place in appropriate category
2. Add TypeScript types
3. Write comprehensive tests
4. Update documentation
5. Follow existing patterns

## License

MIT
