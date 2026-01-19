# CCJK Sandbox Mode Implementation Guide

## Overview

This document provides a comprehensive guide to the Sandbox Mode implementation for the CCJK project. The sandbox mode provides secure request/response handling with data masking, audit logging, rate limiting, and request isolation capabilities.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Implementation Details](#implementation-details)
4. [Usage Guide](#usage-guide)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Security Considerations](#security-considerations)
8. [Performance Optimization](#performance-optimization)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Sandbox Manager                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Configuration Layer                      │   │
│  │  - Enable/Disable                                     │   │
│  │  - Feature Toggles                                    │   │
│  │  - Rate Limits                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Data Masker  │  │ Rate Limiter │  │ Audit Logger │      │
│  │              │  │              │  │              │      │
│  │ - API Keys   │  │ - Sliding    │  │ - Requests   │      │
│  │ - Tokens     │  │   Window     │  │ - Responses  │      │
│  │ - Passwords  │  │ - Per-User   │  │ - Errors     │      │
│  │ - Secrets    │  │   Tracking   │  │ - JSONL      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Statistics & Monitoring                  │   │
│  │  - Request Count                                      │   │
│  │  - Response Count                                     │   │
│  │  - Error Count                                        │   │
│  │  - Rate Limit Hits                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Request → Rate Limiter → Data Masker → Audit Logger → Process
                ↓             ↓             ↓
            Check Limit   Mask Data    Log Entry
                ↓             ↓             ↓
            Allow/Deny    Masked Data   Audit File

Response → Data Masker → Audit Logger → Return
               ↓             ↓
           Mask Data    Log Entry
               ↓             ↓
           Masked Data   Audit File
```

---

## Core Components

### 1. SandboxManager (`src/sandbox/sandbox-manager.ts`)

**Purpose**: Central orchestrator for all sandbox operations.

**Key Features**:
- Enable/disable sandbox mode
- Configure sandbox features
- Process requests and responses
- Handle errors
- Manage statistics

**API**:
```typescript
class SandboxManager {
  // Lifecycle
  enable(config?: Partial<SandboxConfig>): Promise<void>
  disable(): void

  // Request/Response Processing
  processRequest(request: any, key?: string): Promise<ProcessResult>
  processResponse(response: any, requestId?: string): Promise<ProcessResult>
  handleError(error: Error, context?: any): Promise<ErrorResult>

  // Configuration
  updateConfig(config: Partial<SandboxConfig>): Promise<void>
  getStatus(): SandboxStatus

  // Audit Logs
  getAuditLogs(options?: AuditLogFilter): Promise<AuditLogEntry[]>
  clearAuditLogs(olderThan?: number): Promise<number>

  // Component Access
  getDataMasker(): DataMasker
  getRateLimiter(): RateLimiter
  getAuditLogger(): AuditLogger
}
```

### 2. DataMasker (`src/sandbox/data-masker.ts`)

**Purpose**: Mask sensitive information in requests and responses.

**Key Features**:
- Pattern-based sensitive field detection
- Configurable masking rules
- Support for nested objects and arrays
- URL parameter masking
- HTTP header masking

**Sensitive Patterns**:
- API keys: `apiKey`, `api_key`, `API-KEY`
- Passwords: `password`, `passwd`, `pass`
- Tokens: `token`, `authToken`, `accessToken`
- Secrets: `secret`, `clientSecret`
- Credentials: `credential`, `credentials`
- Authorization: `authorization`, `auth`, `bearer`

**API**:
```typescript
class DataMasker {
  // Field Masking
  maskSensitiveFields(data: any): any
  isSensitiveField(fieldName: string): boolean

  // String Masking
  maskApiKey(key: string): string
  maskEmail(email: string): string
  maskString(str: string, showFirst?: number, showLast?: number): string

  // Specialized Masking
  maskUrlParams(url: string): string
  maskHeaders(headers: Record<string, string>): Record<string, string>

  // Configuration
  updateOptions(options: Partial<MaskingOptions>): void
  getOptions(): MaskingOptions
}
```

### 3. RateLimiter (`src/sandbox/rate-limiter.ts`)

**Purpose**: Enforce rate limits using sliding window algorithm.

**Key Features**:
- Per-key rate limiting
- Sliding window algorithm
- Automatic cleanup of expired entries
- Quota tracking
- Statistics collection

**Algorithm**: Sliding Window
- Window size: 60 seconds (configurable)
- Tracks individual request timestamps
- Automatically removes expired requests
- Provides accurate rate limiting

**API**:
```typescript
class RateLimiter {
  // Rate Limiting
  checkLimit(key: string): boolean
  recordRequest(key: string): void
  getRemainingQuota(key: string): RateLimitQuota

  // Management
  reset(key: string): void
  resetAll(): void

  // Configuration
  updateConfig(maxRequests: number, windowMs?: number): void
  getConfig(): RateLimitConfig

  // Statistics
  getActiveKeys(): string[]
  getStats(): Record<string, RateLimitStats>
}
```

### 4. AuditLogger (`src/sandbox/audit-logger.ts`)

**Purpose**: Log all sandbox operations for audit and compliance.

**Key Features**:
- JSONL format for efficient storage
- Daily log rotation
- Type-based filtering
- Time-range queries
- Statistics generation

**Log Entry Types**:
- `request`: Incoming requests
- `response`: Outgoing responses
- `error`: Error events

**Storage Format**: JSONL (JSON Lines)
```
{"id":"uuid","type":"request","timestamp":1234567890,"data":{...}}
{"id":"uuid","type":"response","timestamp":1234567891,"data":{...}}
```

**API**:
```typescript
class AuditLogger {
  // Initialization
  initialize(): Promise<void>

  // Logging
  logRequest(request: any, metadata?: any): Promise<string>
  logResponse(response: any, metadata?: any): Promise<string>
  logError(error: Error, context?: any): Promise<string>

  // Retrieval
  getAuditLogs(options?: AuditLogFilter): Promise<AuditLogEntry[]>
  getStats(): Promise<AuditLogStats>

  // Management
  clearLogs(olderThan?: number): Promise<number>
  setEnabled(enabled: boolean): void
  isEnabled(): boolean
  getAuditDir(): string
}
```

---

## Implementation Details

### File Structure

```
src/
├── sandbox/
│   ├── sandbox-manager.ts      # Main orchestrator
│   ├── data-masker.ts          # Data masking logic
│   ├── rate-limiter.ts         # Rate limiting logic
│   └── audit-logger.ts         # Audit logging logic
├── commands/
│   └── sandbox.ts              # CLI command interface
├── types/
│   └── sandbox.ts              # TypeScript type definitions
└── i18n/
    └── locales/
        ├── en/
        │   └── sandbox.json    # English translations
        └── zh-CN/
            └── sandbox.json    # Chinese translations

tests/
└── unit/
    └── sandbox/
        ├── sandbox-manager.test.ts   # Manager tests
        ├── data-masker.test.ts       # Masker tests
        ├── rate-limiter.test.ts      # Limiter tests
        └── audit-logger.test.ts      # Logger tests
```

### Type Definitions

```typescript
// Sandbox Configuration
interface SandboxConfig {
  isolateRequests: boolean
  maskSensitiveData: boolean
  auditLog: boolean
  maxRequestsPerMinute: number
}

// Sandbox Status
interface SandboxStatus {
  enabled: boolean
  config: SandboxConfig
  stats: SandboxStats
}

// Statistics
interface SandboxStats {
  totalRequests: number
  totalResponses: number
  totalErrors: number
  rateLimitHits: number
}

// Process Result
interface ProcessResult {
  allowed: boolean
  requestId?: string
  responseId?: string
  maskedRequest?: any
  maskedResponse?: any
  rateLimited?: boolean
  remainingQuota?: number
}

// Audit Log Entry
interface AuditLogEntry {
  id: string
  type: 'request' | 'response' | 'error'
  timestamp: number
  data: any
  metadata?: any
  error?: {
    message: string
    stack?: string
    code?: string
  }
}
```

### Data Masking Implementation

**Pattern Detection**:
```typescript
private readonly sensitivePatterns = [
  /api[-_]?key/i,
  /password/i,
  /passwd/i,
  /pass/i,
  /token/i,
  /secret/i,
  /credential/i,
  /authorization/i,
  /auth/i,
  /bearer/i,
]
```

**Masking Strategy**:
- Show first N characters (default: 4)
- Show last N characters (default: 4)
- Replace middle with asterisks
- Example: `sk-1234567890abcdef` → `sk-1****cdef`

**Deep Object Traversal**:
```typescript
maskSensitiveFields(data: any): any {
  if (data === null || data === undefined) return data
  if (typeof data !== 'object') return data

  if (Array.isArray(data)) {
    return data.map(item => this.maskSensitiveFields(item))
  }

  const masked: any = {}
  for (const [key, value] of Object.entries(data)) {
    if (this.isSensitiveField(key)) {
      masked[key] = typeof value === 'string'
        ? this.maskString(value)
        : '[REDACTED]'
    } else {
      masked[key] = this.maskSensitiveFields(value)
    }
  }
  return masked
}
```

### Rate Limiting Implementation

**Sliding Window Algorithm**:
```typescript
checkLimit(key: string): boolean {
  const now = Date.now()
  const windowStart = now - this.windowMs

  // Get or create request list
  let requests = this.requests.get(key) || []

  // Remove expired requests
  requests = requests.filter(timestamp => timestamp > windowStart)

  // Update stored requests
  this.requests.set(key, requests)

  // Check if limit exceeded
  return requests.length < this.maxRequests
}
```

**Quota Calculation**:
```typescript
getRemainingQuota(key: string): RateLimitQuota {
  const now = Date.now()
  const windowStart = now - this.windowMs

  const requests = this.requests.get(key) || []
  const validRequests = requests.filter(t => t > windowStart)

  return {
    key,
    limit: this.maxRequests,
    remaining: Math.max(0, this.maxRequests - validRequests.length),
    resetAt: validRequests.length > 0
      ? validRequests[0] + this.windowMs
      : now + this.windowMs,
  }
}
```

### Audit Logging Implementation

**Log File Naming**:
```typescript
private getLogFileName(): string {
  const date = new Date().toISOString().split('T')[0]
  return join(this.auditDir, `audit-${date}.jsonl`)
}
```

**JSONL Writing**:
```typescript
private async writeLogEntry(entry: AuditLogEntry): Promise<void> {
  const logFile = this.getLogFileName()
  const logLine = JSON.stringify(entry) + '\n'
  await appendFile(logFile, logLine, 'utf-8')
}
```

**Log Reading with Filtering**:
```typescript
async getAuditLogs(options?: AuditLogFilter): Promise<AuditLogEntry[]> {
  const files = await readdir(this.auditDir)
  const logFiles = files.filter(f => f.startsWith('audit-') && f.endsWith('.jsonl'))

  let allLogs: AuditLogEntry[] = []

  for (const file of logFiles) {
    const content = await readFile(join(this.auditDir, file), 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    const logs = lines.map(line => JSON.parse(line))
    allLogs.push(...logs)
  }

  // Apply filters
  if (options?.type) {
    allLogs = allLogs.filter(log => log.type === options.type)
  }

  if (options?.startTime) {
    allLogs = allLogs.filter(log => log.timestamp >= options.startTime!)
  }

  if (options?.endTime) {
    allLogs = allLogs.filter(log => log.timestamp <= options.endTime!)
  }

  // Sort by timestamp descending
  allLogs.sort((a, b) => b.timestamp - a.timestamp)

  // Apply limit
  if (options?.limit) {
    allLogs = allLogs.slice(0, options.limit)
  }

  return allLogs
}
```

---

## Usage Guide

### CLI Commands

#### Enable Sandbox Mode

```bash
# Enable with default configuration
ccjk sandbox enable

# Enable with custom configuration
ccjk sandbox enable --isolate --mask --audit --rate-limit 100

# Enable with specific features
ccjk sandbox enable --mask --audit
```

#### Disable Sandbox Mode

```bash
ccjk sandbox disable
```

#### View Status

```bash
ccjk sandbox status
```

Output:
```
Sandbox Status: Enabled

Configuration:
  Request Isolation: Yes
  Data Masking: Yes
  Audit Logging: Yes
  Rate Limiting: 60 requests/minute

Statistics:
  Total Requests: 1,234
  Total Responses: 1,230
  Total Errors: 4
  Rate Limit Hits: 12
```

#### View Audit Logs

```bash
# View all logs
ccjk sandbox logs

# View recent logs
ccjk sandbox logs --limit 50

# View logs by type
ccjk sandbox logs --type request
ccjk sandbox logs --type response
ccjk sandbox logs --type error

# View logs in time range
ccjk sandbox logs --start "2024-01-01" --end "2024-01-31"
```

#### Clear Audit Logs

```bash
# Clear all logs
ccjk sandbox clear

# Clear logs older than 30 days
ccjk sandbox clear --older-than 30
```

### Programmatic Usage

#### Basic Usage

```typescript
import { SandboxManager } from './sandbox/sandbox-manager'

// Create manager
const manager = new SandboxManager('/path/to/audit/logs')

// Enable sandbox
await manager.enable({
  isolateRequests: true,
  maskSensitiveData: true,
  auditLog: true,
  maxRequestsPerMinute: 60,
})

// Process request
const request = {
  method: 'POST',
  url: '/api/data',
  apiKey: 'sk-1234567890abcdef',
  data: { username: 'john' },
}

const result = await manager.processRequest(request, 'user-123')

if (!result.allowed) {
  console.log('Request blocked by rate limiter')
  console.log(`Remaining quota: ${result.remainingQuota}`)
  return
}

console.log('Request ID:', result.requestId)
console.log('Masked request:', result.maskedRequest)

// Process response
const response = {
  status: 200,
  token: 'response-token-12345',
  data: { message: 'success' },
}

const resResult = await manager.processResponse(response, result.requestId)
console.log('Response ID:', resResult.responseId)
console.log('Masked response:', resResult.maskedResponse)

// Handle error
try {
  // ... some operation
} catch (error) {
  await manager.handleError(error, { requestId: result.requestId })
}

// Get status
const status = manager.getStatus()
console.log('Sandbox enabled:', status.enabled)
console.log('Total requests:', status.stats.totalRequests)

// Disable sandbox
manager.disable()
```

#### Advanced Usage

```typescript
// Custom data masking
const masker = manager.getDataMasker()
masker.updateOptions({
  showFirst: 2,
  showLast: 2,
  customPatterns: [/ssn/i, /credit[-_]?card/i],
})

// Rate limiter management
const limiter = manager.getRateLimiter()

// Check quota
const quota = limiter.getRemainingQuota('user-123')
console.log(`Remaining: ${quota.remaining}/${quota.limit}`)
console.log(`Resets at: ${new Date(quota.resetAt)}`)

// Reset specific user
limiter.reset('user-123')

// Get statistics
const stats = limiter.getStats()
for (const [key, stat] of Object.entries(stats)) {
  console.log(`${key}: ${stat.requests} requests, ${stat.remaining} remaining`)
}

// Audit log queries
const logger = manager.getAuditLogger()

// Get error logs
const errors = await logger.getAuditLogs({ type: 'error' })
console.log(`Total errors: ${errors.length}`)

// Get logs from last hour
const oneHourAgo = Date.now() - 3600000
const recentLogs = await logger.getAuditLogs({
  startTime: oneHourAgo,
  limit: 100,
})

// Get statistics
const logStats = await logger.getStats()
console.log('Total entries:', logStats.totalEntries)
console.log('By type:', logStats.byType)
console.log('Time range:', {
  oldest: new Date(logStats.oldestEntry),
  newest: new Date(logStats.newestEntry),
})
```

---

## Configuration

### Default Configuration

```typescript
const DEFAULT_CONFIG: SandboxConfig = {
  isolateRequests: true,
  maskSensitiveData: true,
  auditLog: true,
  maxRequestsPerMinute: 60,
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `isolateRequests` | boolean | true | Enable request isolation |
| `maskSensitiveData` | boolean | true | Enable data masking |
| `auditLog` | boolean | true | Enable audit logging |
| `maxRequestsPerMinute` | number | 60 | Rate limit per user |

### Masking Options

```typescript
interface MaskingOptions {
  showFirst: number      // Characters to show at start (default: 4)
  showLast: number       // Characters to show at end (default: 4)
  customPatterns: RegExp[] // Additional sensitive patterns
}
```

### Rate Limiting Options

```typescript
interface RateLimitConfig {
  maxRequests: number    // Max requests per window (default: 60)
  windowMs: number       // Window size in ms (default: 60000)
}
```

### Audit Log Options

```typescript
interface AuditLogFilter {
  type?: 'request' | 'response' | 'error'
  startTime?: number
  endTime?: number
  limit?: number
}
```

---

## Testing

### Test Coverage

The implementation includes comprehensive test suites:

1. **DataMasker Tests** (`tests/unit/sandbox/data-masker.test.ts`)
   - API key masking
   - Email masking
   - Sensitive field detection
   - Nested object masking
   - Array masking
   - URL parameter masking
   - HTTP header masking
   - Custom patterns

2. **RateLimiter Tests** (`tests/unit/sandbox/rate-limiter.test.ts`)
   - Rate limit enforcement
   - Sliding window algorithm
   - Per-key tracking
   - Quota calculation
   - Reset functionality
   - Statistics collection

3. **AuditLogger Tests** (`tests/unit/sandbox/audit-logger.test.ts`)
   - Log writing
   - Log reading
   - Filtering by type
   - Time range queries
   - Statistics generation
   - Log cleanup

4. **SandboxManager Tests** (`tests/unit/sandbox/sandbox-manager.test.ts`)
   - Enable/disable
   - Request processing
   - Response processing
   - Error handling
   - Configuration updates
   - Integration scenarios

### Running Tests

```bash
# Run all tests
pnpm test

# Run sandbox tests only
pnpm test sandbox

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Test Statistics

- **Total Test Cases**: 100+
- **Coverage Target**: 80%+
- **Test Types**: Unit, Integration, Edge Cases

---

## Security Considerations

### Data Protection

1. **Sensitive Data Masking**
   - All sensitive fields are automatically detected and masked
   - Configurable masking rules
   - Support for custom sensitive patterns
   - No sensitive data in logs

2. **Audit Trail**
   - Complete audit trail of all operations
   - Tamper-evident JSONL format
   - Daily log rotation
   - Secure storage location

3. **Rate Limiting**
   - Prevents abuse and DoS attacks
   - Per-user tracking
   - Configurable limits
   - Automatic cleanup

### Best Practices

1. **Enable All Features**
   ```typescript
   await manager.enable({
     isolateRequests: true,
     maskSensitiveData: true,
     auditLog: true,
     maxRequestsPerMinute: 60,
   })
   ```

2. **Regular Log Review**
   ```bash
   # Review error logs daily
   ccjk sandbox logs --type error --limit 100
   ```

3. **Monitor Rate Limits**
   ```typescript
   const stats = limiter.getStats()
   // Alert if any user hits rate limit frequently
   ```

4. **Secure Audit Directory**
   - Use restricted permissions (700)
   - Regular backups
   - Encryption at rest

5. **Custom Sensitive Patterns**
   ```typescript
   masker.updateOptions({
     customPatterns: [
       /ssn/i,
       /credit[-_]?card/i,
       /bank[-_]?account/i,
     ],
   })
   ```

### Compliance

The sandbox mode helps meet compliance requirements:

- **GDPR**: Data masking and audit trails
- **HIPAA**: Secure handling of sensitive data
- **PCI DSS**: Protection of payment information
- **SOC 2**: Audit logging and access controls

---

## Performance Optimization

### Memory Management

1. **Rate Limiter Cleanup**
   - Automatic removal of expired entries
   - Triggered on each `checkLimit()` call
   - Prevents memory leaks

2. **Audit Log Rotation**
   - Daily log files
   - Prevents single large files
   - Efficient querying

### Performance Characteristics

| Operation | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| Rate limit check | O(n) where n = requests in window | O(n) |
| Data masking | O(m) where m = object size | O(m) |
| Audit log write | O(1) | O(1) |
| Audit log read | O(k) where k = total entries | O(k) |

### Optimization Tips

1. **Adjust Rate Limit Window**
   ```typescript
   limiter.updateConfig(60, 30000) // 30-second window
   ```

2. **Limit Audit Log Queries**
   ```typescript
   await logger.getAuditLogs({ limit: 100 })
   ```

3. **Regular Log Cleanup**
   ```typescript
   // Clean logs older than 90 days
   const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000)
   await manager.clearAuditLogs(ninetyDaysAgo)
   ```

4. **Disable Unused Features**
   ```typescript
   await manager.enable({
     isolateRequests: false, // Disable if not needed
     maskSensitiveData: true,
     auditLog: true,
     maxRequestsPerMinute: 60,
   })
   ```

---

## Troubleshooting

### Common Issues

#### 1. Rate Limit Too Restrictive

**Problem**: Users hitting rate limits frequently

**Solution**:
```typescript
await manager.updateConfig({ maxRequestsPerMinute: 120 })
```

#### 2. Audit Logs Growing Too Large

**Problem**: Disk space consumed by audit logs

**Solution**:
```bash
# Clean old logs
ccjk sandbox clear --older-than 30
```

#### 3. Sensitive Data Not Masked

**Problem**: Custom sensitive fields not detected

**Solution**:
```typescript
const masker = manager.getDataMasker()
masker.updateOptions({
  customPatterns: [/your[-_]?custom[-_]?field/i],
})
```

#### 4. Performance Degradation

**Problem**: Slow request processing

**Solution**:
- Reduce rate limit window size
- Disable unused features
- Clean old audit logs
- Optimize data masking patterns

### Debug Mode

Enable debug logging:
```typescript
// Add to sandbox-manager.ts
private debug = process.env.SANDBOX_DEBUG === 'true'

private log(...args: any[]) {
  if (this.debug) {
    console.log('[Sandbox]', ...args)
  }
}
```

---

## Future Enhancements

### Planned Features

1. **Advanced Rate Limiting**
   - Token bucket algorithm
   - Burst allowance
   - Dynamic rate adjustment

2. **Enhanced Audit Logs**
   - Compression support
   - Remote log shipping
   - Real-time log streaming

3. **Data Masking**
   - ML-based sensitive data detection
   - Format-preserving encryption
   - Reversible masking for authorized users

4. **Monitoring & Alerts**
   - Real-time metrics dashboard
   - Alert on suspicious activity
   - Integration with monitoring tools

5. **Multi-tenancy**
   - Per-tenant configuration
   - Isolated audit logs
   - Tenant-specific rate limits

---

## Conclusion

The CCJK Sandbox Mode provides a comprehensive security layer for request/response handling with:

✅ **Data Protection**: Automatic masking of sensitive information
✅ **Audit Trail**: Complete logging of all operations
✅ **Rate Limiting**: Protection against abuse
✅ **Flexibility**: Configurable features and options
✅ **Performance**: Optimized algorithms and storage
✅ **Testing**: Comprehensive test coverage

For questions or issues, please refer to the test files or create an issue in the project repository.

---

**Last Updated**: 2024-01-20
**Version**: 1.0.0
**Author**: CCJK Development Team
