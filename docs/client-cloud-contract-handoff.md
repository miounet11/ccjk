# Client-Cloud Contract Handoff

> **Version**: 1.0.0
> **Date**: 2026-02-24
> **Owner**: Cloud Client Team
> **Audience**: Backend/Server Team

---

## 📋 Document Purpose

This document provides a complete reference of the client-side cloud API contracts for the CCJK Cloud Services. Server team can implement backend endpoints without reading client source code.

---

## 🌐 Endpoint Configuration

### Base URLs

```typescript
const CLOUD_ENDPOINTS = {
  MAIN: {
    BASE_URL: 'https://api.claudehome.cn',
    API_VERSION: '/api/v1',
  },
  PLUGINS: {
    BASE_URL: 'https://api.api.claudehome.cn',
    API_VERSION: '/v1',
  },
  REMOTE: {
    BASE_URL: 'https://remote-api.claudehome.cn',
    API_VERSION: '',
  },
}
```

### Version Strategy

- **v1**: Current stable version (preferred)
- **v8**: Legacy version (fallback for compatibility)
- Client automatically negotiates version (tries v1 first, falls back to v8 if available)

---

## 🔐 Authentication

### Header Format

```http
Authorization: Bearer <token>
User-Agent: CCJK/<version>
Content-Type: application/json
```

### Token Types

- **API Key**: Long-lived authentication token
- **Session Token**: Short-lived user session token

---

## 📡 API Endpoints

### 1. Project Analysis

**Endpoint**: `POST /api/v1/analysis/projects`
**Base URL**: MAIN
**Timeout**: 10 seconds

#### Request

```typescript
interface ProjectAnalysisRequest {
  projectRoot: string              // Project directory path
  language?: string                // UI language (en, zh-CN)
  ccjkVersion: string              // CCJK version
  dependencies?: Record<string, string>     // Production dependencies
  devDependencies?: Record<string, string>  // Dev dependencies
  frameworks?: string[]            // Detected frameworks
  languages?: string[]             // Detected languages
}
```

#### Response

```typescript
interface ProjectAnalysisResponse {
  requestId: string
  recommendations: Recommendation[]
  confidence: number               // 0-100
  insights?: {
    insights: string[]
    productivityImprovements: Array<{
      resource: string
      improvement: number
      reason: string
    }>
    nextRecommendations: string[]
  }
}

interface Recommendation {
  id: string                       // Unique identifier
  name: Record<string, string>     // Localized name
  description: Record<string, string>  // Localized description
  category: 'skill' | 'mcp' | 'agent' | 'hook'
  relevanceScore: number           // 0-1
  tags: string[]
}
```

#### Error Codes

- `400`: Invalid request (missing required fields)
- `401`: Authentication failed
- `429`: Rate limit exceeded
- `500`: Server error

---

### 2. Get Single Template

**Endpoint**: `GET /api/v1/templates/:id`
**Base URL**: MAIN
**Timeout**: 10 seconds

#### Request

```http
GET /api/v1/templates/react-design-patterns?language=en
```

#### Response

```typescript
interface TemplateResponse {
  id: string
  name: string
  description: string
  category: string
  content: string                  // Template content
  parameters?: TemplateParameter[]
  metadata?: {
    version: string
    author: string
    tags: string[]
  }
}

interface TemplateParameter {
  name: string
  type: 'string' | 'number' | 'boolean'
  required: boolean
  default?: string | number | boolean
  description?: string
}
```

---

### 3. Batch Template Download

**Endpoint**: `POST /api/v1/templates/batch`
**Base URL**: MAIN
**Timeout**: 15 seconds

#### Request

```typescript
interface BatchTemplateRequest {
  ids: string[]                    // Template IDs
  language?: string                // UI language
}
```

#### Response

```typescript
interface BatchTemplateResponse {
  templates: Record<string, TemplateResponse>
  missing?: string[]               // IDs not found
  errors?: Record<string, string>  // ID → error message
}
```

---

### 4. Telemetry Submission

**Endpoint**: `POST /api/v1/telemetry/installation`
**Base URL**: MAIN
**Timeout**: 5 seconds (non-blocking)

#### Request

```typescript
interface UsageReport {
  requestId: string
  installation: {
    timestamp: number
    duration: number               // milliseconds
    selectedResources: Array<{
      id: string
      type: 'skill' | 'mcp' | 'agent' | 'hook'
      version: string
    }>
    skippedResources: string[]
    failedResources: Array<{
      id: string
      error: string
    }>
  }
  clientInfo: {
    ccjkVersion: string
    os: string                     // darwin, linux, win32
    nodeVersion: string
  }
  performance: {
    networkLatency: number
    cacheHit: boolean
    retryCount: number
  }
}
```

#### Response

```typescript
interface UsageReportResponse {
  success: boolean
  requestId: string
  message?: string
}
```

**Important**: Telemetry failures should NOT affect client operation. Server should accept telemetry with 202 Accepted even if processing fails.

---

### 5. Health Check

**Endpoint**: `GET /api/v1/health`
**Base URL**: MAIN
**Timeout**: 5 seconds

#### Response

```typescript
interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down'
  version: string
  timestamp: string
  services?: {
    database: 'ok' | 'down'
    cache: 'ok' | 'down'
  }
}
```

---

### 6. Plugin List

**Endpoint**: `GET /v1/plugins/list`
**Base URL**: PLUGINS
**Timeout**: 10 seconds

#### Request

```http
GET /v1/plugins/list?category=mcp&limit=50&offset=0
```

#### Response

```typescript
interface PluginListResponse {
  plugins: Plugin[]
  total: number
  hasMore: boolean
}

interface Plugin {
  id: string
  name: string
  description: string
  category: string
  version: string
  author: string
  downloads: number
  rating: number
}
```

---

### 7. Plugin Recommendations

**Endpoint**: `POST /v1/plugins/recommend`
**Base URL**: PLUGINS
**Timeout**: 10 seconds

#### Request

```typescript
interface PluginRecommendRequest {
  os: string                       // darwin, linux, win32
  codeTool: string                 // claude-code, codex, etc.
  projectType?: string
  frameworks?: string[]
}
```

#### Response

```typescript
interface PluginRecommendResponse {
  plugins: Plugin[]
  confidence: number
}
```

---

### 8. Skills List

**Endpoint**: `GET /v1/skills/list`
**Base URL**: PLUGINS
**Timeout**: 10 seconds

#### Request

```http
GET /v1/skills/list?category=workflow&limit=50
```

#### Response

```typescript
interface SkillListResponse {
  skills: Skill[]
  total: number
  hasMore: boolean
}

interface Skill {
  id: string
  name: string
  description: string
  category: string
  version: string
  author: string
  downloads: number
}
```

---

### 9. Skill Upload

**Endpoint**: `POST /v1/skills/upload`
**Base URL**: PLUGINS
**Timeout**: 30 seconds

#### Request

```typescript
interface SkillUploadRequest {
  name: string
  description: string
  category: string
  content: string                  // Base64 encoded
  metadata: {
    version: string
    author: string
    tags: string[]
  }
}
```

#### Response

```typescript
interface SkillUploadResponse {
  success: boolean
  skillId: string
  message?: string
}
```

---

### 10. Skill Download

**Endpoint**: `GET /v1/skills/download/:id`
**Base URL**: PLUGINS
**Timeout**: 30 seconds

#### Response

```typescript
interface SkillDownloadResponse {
  id: string
  name: string
  content: string                  // Base64 encoded
  metadata: {
    version: string
    author: string
    tags: string[]
  }
}
```

---

### 11. Notification Bind

**Endpoint**: `POST /bind/use`
**Base URL**: REMOTE
**Timeout**: 10 seconds

#### Request

```typescript
interface BindRequest {
  userId: string
  deviceId: string
  platform: string
}
```

#### Response

```typescript
interface BindResponse {
  success: boolean
  bindId: string
  expiresAt: number                // Unix timestamp
}
```

---

### 12. Send Notification

**Endpoint**: `POST /notify`
**Base URL**: REMOTE
**Timeout**: 10 seconds

#### Request

```typescript
interface NotifyRequest {
  bindId: string
  title: string
  message: string
  priority: 'low' | 'normal' | 'high'
  data?: Record<string, any>
}
```

#### Response

```typescript
interface NotifyResponse {
  success: boolean
  notificationId: string
}
```

---

### 13. Poll Replies

**Endpoint**: `GET /reply/poll`
**Base URL**: REMOTE
**Timeout**: 30 seconds (long polling)

#### Request

```http
GET /reply/poll?bindId=<bindId>&since=<timestamp>
```

#### Response

```typescript
interface PollResponse {
  replies: Reply[]
  hasMore: boolean
}

interface Reply {
  id: string
  notificationId: string
  userId: string
  message: string
  timestamp: number
}
```

---

## 🔄 Retry Policy

### Client Retry Strategy

- **Max Attempts**: 3
- **Backoff**: Exponential (100ms, 200ms, 400ms)
- **Retryable Errors**: 5xx, network errors, timeouts
- **Non-Retryable**: 4xx (except 429)

### Rate Limiting

- **429 Response**: Client will retry after `Retry-After` header (seconds)
- **Default Backoff**: 60 seconds if header missing

---

## 🚨 Error Response Format

### Standard Error Response

```typescript
interface ErrorResponse {
  success: false
  error: string | {
    code: string
    message: string
    details?: any
  }
  code?: string
  timestamp?: string
}
```

### Error Codes

| Code | HTTP Status | Description | Retryable |
|------|-------------|-------------|----------|
| `AUTH_ERROR` | 401, 403 | Authentication failed | No |
| `RATE_LIMIT` | 429 | Rate limit exceeded | Yes |
| `SCHEMA_MISMATCH` | 400 | Invalid request format | No |
| `NETWORK_ERROR` | - | Network connectivity issue | Yes |
| `TIMEOUT` | 408 | Request timeout | Yes |
| `SERVER_ERROR` | 500-599 | Server error | Yes |
| `NOT_FOUND` | 404 | Resource not found | No |
| `VALIDATION_ERROR` | 400 | Validation failed | No |

---

## 📊 Performance Requirements

### Response Time Targets

| Endpoint | Target | Max |
|----------|--------|-----|
| Health Check | < 100ms | 5s |
| Project Analysis | < 500ms | 10s |
| Template Download | < 1s | 15s |
| Telemetry | < 200ms | 5s |
| Notifications | < 500ms | 10s |
| Skills List | < 300ms | 10s |

### Throughput Requirements

- **Analysis**: 100 req/s
- **Templates**: 500 req/s
- **Telemetry**: 1000 req/s (burst)
- **Skills**: 200 req/s

---

## 🔒 Security Requirements

### HTTPS Only

- All endpoints MUST use HTTPS
- HTTP requests should redirect to HTTPS

### CORS

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

### Rate Limiting

- **Per IP**: 1000 req/hour
- **Per User**: 10000 req/hour
- **Burst**: 100 req/minute

---

## 🧪 Testing

### Health Check

```bash
curl https://api.claudehome.cn/api/v1/health
```

### Project Analysis

```bash
curl -X POST https://api.claudehome.cn/api/v1/analysis/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectRoot": "/path/to/project",
    "ccjkVersion": "12.0.6",
    "language": "en"
  }'
```

---

## 📝 Changelog

### v1.0.0 (2026-02-24)

- Initial contract definition
- 13 endpoints documented
- Error codes standardized
- Performance targets defined

---

## 📞 Contact

**Client Team Lead**: Cloud Client Team
**Questions**: Create issue in CCJK repository
**Contract Updates**: Submit PR to this document
