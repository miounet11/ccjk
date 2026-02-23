# CCJK Cloud Client Module

The cloud client module provides a complete HTTP client for the CCJK Cloud API v1.0.0 with advanced features including caching, retry logic, telemetry, and fallback support.

## Features

- **Full API Coverage**: All 5 API endpoints (analyze, getTemplate, getBatch, report, health)
- **Intelligent Caching**: 7-day TTL for recommendations, 30-day TTL for templates
- **Exponential Backoff Retry**: 100ms → 200ms → 400ms → 800ms, max 3 retries
- **Anonymous Telemetry**: Batch reporting with opt-out support
- **Fallback Support**: Local recommendations when API is unavailable
- **Standardized Error Handling**: Unified error codes with localized messages
- **TypeScript**: Full type safety with comprehensive error handling

## Directory Structure

```
src/cloud-client/
├── index.ts          # Main exports and factory functions
├── types.ts          # All TypeScript interfaces and types
├── client.ts         # Core CloudClient class with HTTP methods
├── errors.ts         # Standardized error handling system
├── cache.ts          # Caching layer with filesystem persistence
├── retry.ts          # Exponential backoff retry logic
└── telemetry.ts      # Anonymous telemetry reporting
```

## Usage

### Basic Usage

```typescript
import { createCompleteCloudClient } from './src/cloud-client'

const client = createCompleteCloudClient({
  baseURL: 'https://api.claudehome.cn/v1',
  enableCache: true,
  enableRetry: true,
  enableTelemetry: true,
})

// Analyze project
const analysis = await client.analyzeProject({
  projectRoot: '/path/to/project',
  dependencies: { react: '^18.0.0' },
  language: 'en',
})

// Get template
const template = await client.getTemplate('basic-workflow', 'en')

// Health check
const health = await client.healthCheck()
```

### Advanced Usage

```typescript
import {
  CloudClient,
  CachedCloudClient,
  RetryableCloudClient,
  FallbackCloudClient,
  CloudCache,
  initializeTelemetry,
} from './src/cloud-client'

// Create base client
const baseClient = new CloudClient({
  baseURL: 'https://api.claudehome.cn/v1',
  timeout: 10000,
  version: '8.0.0',
})

// Add retry wrapper
const retryClient = new RetryableCloudClient(baseClient)

// Add cache wrapper
const cache = new CloudCache(baseClient.getConfig())
const cachedClient = new CachedCloudClient(retryClient.getClient(), cache)

// Add fallback wrapper
const fallbackClient = new FallbackCloudClient(cachedClient.getClient())

// Initialize telemetry
initializeTelemetry(baseClient)
```

## API Methods

### analyzeProject(request: ProjectAnalysisRequest)
Analyzes a project and returns personalized recommendations.

### getTemplate(id: string, language?: string)
Fetches a single template by ID with optional language support.

### getBatchTemplates(request: BatchTemplateRequest)
Fetches multiple templates in a single request.

### reportUsage(report: UsageReport)
Reports anonymous usage metrics to improve the service.

### healthCheck()
Checks the health status of the API.

## Configuration

```typescript
interface CloudClientConfig {
  baseURL: string                    // API base URL
  timeout?: number                   // Request timeout (default: 10000ms)
  version?: string                   // CCJK version (default: 8.0.0)
  enableCache?: boolean              // Enable caching (default: true)
  cacheDir?: string                  // Cache directory path
  enableRetry?: boolean              // Enable retry logic (default: true)
  maxRetries?: number                // Max retry attempts (default: 3)
  enableTelemetry?: boolean          // Enable telemetry (default: true)
  apiKey?: string                    // API key if required
}
```

## Error Handling

The module provides a standardized error handling system with localized messages.

### Error Codes

- `AUTH_ERROR`: Authentication failed (401/403)
- `RATE_LIMIT`: Rate limit exceeded (429)
- `SCHEMA_MISMATCH`: Response format validation failed
- `NETWORK_ERROR`: Network connection failed
- `TIMEOUT`: Request timeout
- `SERVER_ERROR`: Server error (5xx)
- `NOT_FOUND`: Resource not found (404)
- `API_ERROR`: Generic API error (4xx)
- `VALIDATION_ERROR`: Client-side validation error
- `UNKNOWN_ERROR`: Unknown error

### Usage Example

```typescript
import {
  CloudErrorFactory,
  handleCloudError,
  isRetryableError,
  isAuthError,
  getRetryDelay,
} from './src/cloud-client'

try {
  const result = await client.analyzeProject(request)
} catch (error) {
  // Convert to CloudError with context
  const cloudError = handleCloudError(error, 'project analysis')

  // Get localized message
  console.error(cloudError.getUserMessage('en'))

  // Check if retryable
  if (isRetryableError(cloudError)) {
    const delay = getRetryDelay(cloudError, attemptNumber)
    await sleep(delay)
    // retry...
  }

  // Check specific error types
  if (isAuthError(cloudError)) {
    // Handle authentication error
  }
}
```

### Error Factory

```typescript
// Create specific errors
const authError = CloudErrorFactory.auth('Invalid token')
const rateLimitError = CloudErrorFactory.rateLimit()
const networkError = CloudErrorFactory.network(originalError)
const timeoutError = CloudErrorFactory.timeout(10000)

// Create from HTTP status
const httpError = CloudErrorFactory.fromHttpStatus(404, 'Not found')
```

### Error Properties

```typescript
interface CloudError {
  code: CloudErrorCode           // Standard error code
  message: string                // Error message
  statusCode?: number            // HTTP status code
  isRetryable: boolean           // Whether error is retryable
  originalError?: unknown        // Original error object
  context?: Record<string, any>  // Additional context
  requestId?: string             // Request tracking ID

  // Methods
  getLocalizedMessage(lang?: string): string
  getUserMessage(lang?: string): string
  toJSON(): Record<string, any>
}
```

### Localized Messages

Error messages are automatically localized based on the i18n configuration:

```typescript
// English
cloudError.getLocalizedMessage('en')
// "Authentication failed. Please check your credentials."

// Chinese
cloudError.getLocalizedMessage('zh-CN')
// "认证失败，请检查您的凭据。"
```

## Telemetry

Telemetry is enabled by default but can be disabled:

```bash
export CCJK_TELEMETRY=false
```

Telemetry includes:
- Template downloads
- Recommendation interactions
- Analysis completions
- Error occurrences

All data is anonymous and used to improve the service.

## Caching

The cache system uses filesystem persistence with:
- In-memory cache for fast access
- Automatic expiry (7 days for recommendations, 30 days for templates)
- Cache directory: `.ccjk-cache` (configurable)

## Testing

Run the test to verify the implementation:

```bash
tsx test-cloud-client.ts
```

## Dependencies

- `ofetch`: HTTP client
- `consola`: Logging
- `ohash`: Object hashing for cache keys

All dependencies are already included in the project.