# CCJK Cloud API Requirements — Backend Contract

> Generated: 2026-03-09 | CCJK v13.4.0 | Backend v8.2.0
>
> This document defines the complete API contract between CCJK CLI (client) and the cloud backend.
> Backend team should use this as the source of truth for endpoint implementation and verification.

---

## 1. Infrastructure

### Base URLs

| Endpoint | URL | Purpose |
|----------|-----|---------|
| **MAIN** | `https://api.claudehome.cn` | Core API (analysis, templates, telemetry, skills, hooks) |
| **PLUGINS** | `https://api.claudehome.cn` | Plugin marketplace (same host, different path prefix) |
| **REMOTE** | `https://remote-api.claudehome.cn` | Real-time features (notifications, WebSocket) |

All URLs are centralized in `src/constants.ts` → `CLOUD_ENDPOINTS`. Never hardcode URLs elsewhere.

### API Versioning

- Main API: `/api/v1/*` (primary), `/api/v8/*` (fallback for templates)
- Plugins API: `/v1/*`
- Remote API: `/api/v1/*`

### Client Headers

All requests include:

```
User-Agent: ccjk/{version}
X-CCJK-Version: {version}
X-Device-ID: {uuid}          # anonymous, auto-generated
Content-Type: application/json
```

Authenticated requests add:

```
Authorization: Bearer {token}
```

---

## 2. Health Check

### `GET /api/v1/health`

**Priority**: CRITICAL — client uses this to determine API availability

**Request**: No body

**Response** (200):
```json
{
  "status": "healthy",
  "version": "8.2.0",
  "timestamp": "2026-03-09T10:16:21.673Z",
  "message": "Service is operational"
}
```

**IMPORTANT**: Client calls `/api/v1/health`, NOT `/health`. The root `/health` currently returns 502 — either add a handler or redirect.

**Client behavior**: Cached for 5 minutes. If unhealthy, client falls back to local recommendations.

---

## 3. Project Analysis & Recommendations

### `POST /api/v1/specs`

Analyzes a project and returns relevant skill/MCP/agent/hook recommendations.

**Request**:
```json
{
  "projectRoot": "/path/to/project",
  "dependencies": { "react": "^18.0.0", "express": "^4.18.0" },
  "devDependencies": { "typescript": "^5.0.0", "vitest": "^1.0.0" },
  "gitRemote": "https://github.com/user/repo",
  "language": "typescript",
  "ccjkVersion": "13.4.0"
}
```

**Response** (200):
```json
{
  "requestId": "uuid",
  "recommendations": [
    {
      "id": "react-workflow",
      "name": { "en": "React Workflow", "zh-CN": "React 工作流" },
      "description": { "en": "React development tools", "zh-CN": "React 开发工具" },
      "category": "skill",
      "relevanceScore": 0.95,
      "installCommand": "ccjk config switch react",
      "config": {},
      "tags": ["react", "frontend"],
      "dependencies": []
    }
  ],
  "projectType": "react",
  "frameworks": ["react", "typescript"]
}
```

**`category` enum**: `"skill"` | `"mcp"` | `"agent"` | `"hook"`

**`relevanceScore`**: float 0.0 — 1.0

**Client behavior**: Cached for 7 days. Falls back to local project-type detection on failure.

---

## 4. Templates

### `GET /api/v1/templates/{id}?language={lang}`

Fetch a single template by ID.

**Response** (200):
```json
{
  "id": "basic-workflow",
  "type": "workflow",
  "name": { "en": "Basic Workflow", "zh-CN": "基础工作流" },
  "description": { "en": "...", "zh-CN": "..." },
  "content": "...",
  "version": "1.0.0",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-03-01T00:00:00Z"
}
```

**Client behavior**: Cached for 30 days. Falls back to local template on failure.

### `POST /api/v1/templates/batch`

Fetch multiple templates in one request.

**Request**:
```json
{
  "ids": ["template-1", "template-2"],
  "language": "en"
}
```

**Response** (200):
```json
{
  "requestId": "uuid",
  "templates": {
    "template-1": { /* TemplateResponse */ },
    "template-2": { /* TemplateResponse */ }
  },
  "notFound": []
}
```

### V8 Templates API (Fallback)

When v1 template endpoints fail, client falls back to v8:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v8/templates?type={type}&language={lang}` | GET | List templates |
| `/api/v8/templates/{id}` | GET | Get single template |
| `/api/v8/templates` | POST | Batch fetch |
| `/api/v8/templates/search?q={query}` | GET | Search templates |

**Template types**: `skill` | `mcp` | `agent` | `hook`

---

## 5. Skills Marketplace

### `GET /api/v1/skills/marketplace`

List skills with pagination and filters.

**Query params**: `page`, `limit`, `category`, `sort`, `order` ("asc"/"desc")

**Response** (200):
```json
{
  "success": true,
  "data": {
    "skills": [ /* Skill objects */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### `GET /api/v1/skills/search`

**Query params**: `q` (search query), `page`, `limit`, `category`, `sort`, `order`

### `GET /api/v1/skills/search/suggestions`

Autocomplete suggestions.

**Query params**: `q` (partial query), `limit` (default 5)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "suggestions": ["suggestion1", "suggestion2"]
  }
}
```

### `GET /api/v1/skills/search/trending`

**Query params**: `limit` (default 10), `period` ("day"/"week"/"month")

**Response** (200):
```json
{
  "success": true,
  "data": {
    "keywords": [
      { "keyword": "react", "count": 150 }
    ]
  }
}
```

**Client cache**: Marketplace 5 min, suggestions 1 min, trending 10 min.

---

## 6. Skill Ratings

### `GET /api/v1/skills/{skillId}/ratings`

**Query params**: `page`, `limit`, `sort` ("newest"/"oldest"/"highest"/"lowest"/"helpful")

**Response** (200):
```json
{
  "success": true,
  "data": {
    "ratings": [ /* Rating objects */ ],
    "summary": {
      "averageRating": 4.5,
      "totalRatings": 42,
      "distribution": { "1": 2, "2": 1, "3": 5, "4": 10, "5": 24 }
    },
    "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
  }
}
```

### `POST /api/v1/skills/{skillId}/ratings`

**Auth**: Required (`Authorization: Bearer {token}`)

**Request**:
```json
{
  "userId": "user-uuid",
  "rating": 5,
  "review": "Great skill!"
}
```

**Error codes**: `DUPLICATE_RATING`, `SKILL_NOT_FOUND`, `UNAUTHORIZED`

---

## 7. User Skills (Authenticated)

All require `Authorization: Bearer {token}`.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/skills/user` | GET | List user's installed skills |
| `/api/v1/skills/user/install` | POST | Install skill `{ "skillId": "..." }` |
| `/api/v1/skills/user/uninstall` | POST | Uninstall skill `{ "skillId": "..." }` |
| `/api/v1/skills/user/{skillId}` | PATCH | Update skill config |
| `/api/v1/skills/user/quota` | GET | Get usage quota |
| `/api/v1/skills/user/recommendations` | GET | Personalized recommendations |

**Quota response**:
```json
{
  "success": true,
  "data": {
    "maxSkills": 50,
    "usedSkills": 12,
    "maxStorage": 104857600,
    "usedStorage": 5242880
  }
}
```

---

## 8. Plugin Marketplace

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/skills/recommendations` | POST | Get plugin recommendations by context |
| `/api/v1/skills` | GET | Search plugins (query params: `q`, `page`, `limit`, `category`) |
| `/api/v1/skills/{id}` | GET | Plugin details |
| `/api/v1/skills/popular` | GET | Popular plugins |
| `/api/v1/skills/categories` | GET | All categories |
| `/api/v1/skills/{id}/download` | GET | Download plugin package |
| `/api/v1/skills/upload` | POST | Upload user plugin (authenticated) |

**Recommendations request**:
```json
{
  "codeToolType": "claude-code",
  "language": "typescript",
  "installedPlugins": ["plugin-1", "plugin-2"],
  "projectContext": {}
}
```

**Client behavior**: All GET requests cached for 1 hour. Offline fallback to cached data.

---

## 9. Telemetry

### `POST /api/v1/usage/current`

Non-blocking, fire-and-forget. 5-second timeout. Never blocks client flow.

**Request**:
```json
{
  "reportId": "uuid",
  "metricType": "template_download",
  "timestamp": "2026-03-09T10:00:00Z",
  "ccjkVersion": "13.4.0",
  "nodeVersion": "v22.0.0",
  "platform": "darwin",
  "language": "en",
  "data": {}
}
```

**Metric types**: `template_download` | `recommendation_shown` | `recommendation_accepted` | `analysis_completed` | `error_occurred`

**Batching**: Client buffers up to 10 events, flushes every 30 seconds.

**Opt-out**: Client respects `CCJK_TELEMETRY=false` env var — no requests sent.

---

## 10. Device Registration & Sync

### `POST /api/v1/devices/register`

Anonymous device registration on first CCJK run.

**Request**:
```json
{
  "deviceId": "uuid",
  "fingerprint": "sha256-hash",
  "platform": "darwin",
  "osVersion": "25.3.0",
  "ccjkVersion": "13.4.0"
}
```

### `POST /api/v1/handshake`

Session handshake, negotiates feature flags and sync intervals.

**Headers**: `X-Device-ID: {uuid}`

**Request**:
```json
{
  "deviceId": "uuid",
  "ccjkVersion": "13.4.0",
  "platform": "darwin"
}
```

**Expected Response**:
```json
{
  "success": true,
  "featureFlags": {
    "silentUpgrade": true,
    "telemetryEnabled": true
  },
  "syncInterval": 1800000
}
```

### `POST /api/v1/sync`

Periodic background sync (default every 30 minutes).

**Request**:
```json
{
  "deviceId": "uuid",
  "platform": "darwin",
  "ccjkVersion": "13.4.0",
  "stats": {}
}
```

---

## 11. Cloud Sync (Sessions & Teleport)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/sessions/upload` | POST | Upload session for cross-device sync |
| `/api/v1/sessions/{id}` | GET | Download session |
| `/api/v1/sessions/{id}/status` | GET | Check session sync status |
| `/api/v1/sessions/{id}` | DELETE | Delete session |
| `/api/v1/sessions` | GET | List user's sessions |
| `/api/v1/attributions` | POST | Create attribution record |
| `/api/v1/attributions/{id}` | GET | Get attribution |

---

## 12. Hooks Sync

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/hooks` | GET | List available cloud hooks |
| `/api/v1/hooks/sync` | POST | Sync local hooks to cloud |
| `/api/v1/hooks/{id}` | GET | Get specific hook details |

---

## 13. Agents Sync

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/agents` | GET | List available agent templates |
| `/api/v1/agents/sync` | POST | Sync local agents to cloud |

---

## 14. CLAUDE.md Sync

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/claude-md/templates` | GET | Get CLAUDE.md templates |
| `/api/v1/claude-md/sync` | POST | Sync CLAUDE.md content |

---

## 15. Notifications (Remote API)

Base: `https://remote-api.claudehome.cn/api/v1`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/bind/use` | POST | Bind device for push notifications |
| `/api/v1/notify` | POST | Send notification to device |
| `/api/v1/reply/poll` | GET | Long-poll for replies (60s timeout) |

**Bind request**:
```json
{
  "deviceToken": "token",
  "deviceInfo": { "platform": "darwin", "version": "..." },
  "channels": ["feishu", "email"]
}
```

---

## 16. Provider Registry

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/providers` | GET | List available API providers |
| `/api/v1/providers` | POST | Register new provider |
| `/api/v1/providers/{id}` | GET | Get provider details |

---

## 17. Error Response Format

All error responses MUST follow this format (never return HTML):

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Standard HTTP status codes**:

| Code | Meaning | Client behavior |
|------|---------|-----------------|
| 400 | Bad request / validation error | No retry |
| 401 | Unauthorized (expired token) | No retry |
| 403 | Forbidden | No retry |
| 404 | Not found | No retry |
| 429 | Rate limited | Retry with 1s/2s/4s backoff |
| 500/502/503/504 | Server error | Retry 3x with 100ms/200ms/400ms backoff |

---

## 18. Client Retry & Caching Summary

### Retry Policy

| Condition | Max Retries | Backoff |
|-----------|-------------|---------|
| Network error | 3 | 100ms → 200ms → 400ms |
| 5xx server error | 3 | 100ms → 200ms → 400ms |
| 429 rate limit | 3 | 1000ms → 2000ms → 4000ms |
| 4xx client error | 0 | No retry |
| Timeout (10s default) | 3 | 100ms → 200ms → 400ms |

### Cache TTLs

| Resource | TTL |
|----------|-----|
| Project analysis | 7 days |
| Templates | 30 days |
| Health check | 5 minutes |
| Marketplace listing | 5 minutes |
| Search suggestions | 1 minute |
| Trending keywords | 10 minutes |
| Plugin catalog | 1 hour |

---

## 19. Known Issues & Backend Action Items

### MUST FIX

1. **`/health` root returns 502** — client fixed to use `/api/v1/health`, but add a redirect or handler at `/health` for legacy clients.

2. **All endpoints MUST return JSON** — never return nginx HTML error pages. Client JSON-parses all responses.

3. **Rate limiting should use `X-Device-ID`** — not IP-based. Many users share corporate proxy IPs.

### SHOULD IMPLEMENT

4. **Version negotiation** — respond with `X-Min-Version` header when a forced client update is needed.

5. **Feature flags in handshake** — the `featureFlags` in handshake response should control:
   - `silentUpgrade: boolean`
   - `telemetryEnabled: boolean`
   - `syncInterval: number` (milliseconds)
   - `minClientVersion: string`

6. **Graceful degradation** — all endpoints should return valid JSON even on internal errors.

### NICE TO HAVE

7. **ETag / If-None-Match** for template caching — reduce bandwidth.

8. **Plugin download checksums** — SHA256 hash in plugin metadata for integrity verification.

9. **WebSocket** for real-time notifications instead of long-polling.

---

## 20. Endpoint Verification Checklist

Please verify each endpoint and fill Status column:

| # | Endpoint | Method | Status |
|---|----------|--------|--------|
| 1 | `/api/v1/health` | GET | |
| 2 | `/api/v1/specs` | POST | |
| 3 | `/api/v1/templates/{id}` | GET | |
| 4 | `/api/v1/templates/batch` | POST | |
| 5 | `/api/v1/usage/current` | POST | |
| 6 | `/api/v1/devices/register` | POST | |
| 7 | `/api/v1/handshake` | POST | |
| 8 | `/api/v1/sync` | POST | |
| 9 | `/api/v1/skills/marketplace` | GET | |
| 10 | `/api/v1/skills/search` | GET | |
| 11 | `/api/v1/skills/search/suggestions` | GET | |
| 12 | `/api/v1/skills/search/trending` | GET | |
| 13 | `/api/v1/skills/{id}/ratings` | GET | |
| 14 | `/api/v1/skills/{id}/ratings` | POST | |
| 15 | `/api/v1/skills/user` | GET | |
| 16 | `/api/v1/skills/user/install` | POST | |
| 17 | `/api/v1/skills/user/uninstall` | POST | |
| 18 | `/api/v1/skills/user/quota` | GET | |
| 19 | `/api/v1/skills/user/recommendations` | GET | |
| 20 | `/api/v1/skills/recommendations` | POST | |
| 21 | `/api/v1/skills` | GET | |
| 22 | `/api/v1/skills/{id}` | GET | |
| 23 | `/api/v1/skills/popular` | GET | |
| 24 | `/api/v1/skills/categories` | GET | |
| 25 | `/api/v1/skills/{id}/download` | GET | |
| 26 | `/api/v1/skills/upload` | POST | |
| 27 | `/api/v1/hooks` | GET | |
| 28 | `/api/v1/hooks/sync` | POST | |
| 29 | `/api/v1/hooks/{id}` | GET | |
| 30 | `/api/v1/agents` | GET | |
| 31 | `/api/v1/agents/sync` | POST | |
| 32 | `/api/v1/claude-md/templates` | GET | |
| 33 | `/api/v1/claude-md/sync` | POST | |
| 34 | `/api/v1/sessions/upload` | POST | |
| 35 | `/api/v1/sessions/{id}` | GET | |
| 36 | `/api/v1/sessions/{id}/status` | GET | |
| 37 | `/api/v1/sessions/{id}` | DELETE | |
| 38 | `/api/v1/sessions` | GET | |
| 39 | `/api/v1/attributions` | POST | |
| 40 | `/api/v1/attributions/{id}` | GET | |
| 41 | `/api/v1/providers` | GET | |
| 42 | `/api/v1/providers` | POST | |
| 43 | `/api/v1/providers/{id}` | GET | |
| 44 | `remote: /api/v1/bind/use` | POST | |
| 45 | `remote: /api/v1/notify` | POST | |
| 46 | `remote: /api/v1/reply/poll` | GET | |
| 47 | `/api/v8/templates` | GET | |
| 48 | `/api/v8/templates/{id}` | GET | |
| 49 | `/api/v8/templates/search` | GET | |

**Total: 49 endpoints** — Status: OK / 404 / 500 / Not Implemented
