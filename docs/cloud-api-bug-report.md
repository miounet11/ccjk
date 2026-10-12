# Cloud API Bug Report

**Date**: 2026-02-26
**Client Version**: ccjk@12.0.10
**Test Base URLs**: `https://api.claudehome.cn`, `https://remote-api.claudehome.cn`

---

## Summary

| Category | Total | Working | Broken |
|----------|-------|---------|--------|
| Endpoints tested | 22 | 7 | 15 |
| Schema mismatches | - | - | 3 |
| Missing routes (404) | - | - | 12 |

---

## Working Endpoints ✅

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `https://api.claudehome.cn/api/v1/skills` | Returns skill list. Supports `?search=` and `?limit=` query params |
| `GET` | `https://api.claudehome.cn/api/v1/skills/:id` | Returns single skill by ID |
| `POST` | `https://api.claudehome.cn/api/v1/templates/batch` | Returns `{templates:[], notFound:[]}` — works but always returns empty (no data seeded?) |
| `POST` | `https://remote-api.claudehome.cn/api/v1/bind/use` | Route exists, schema validation active |
| `POST` | `https://remote-api.claudehome.cn/api/v1/notify` | Route exists, schema validation active |

---

## Bug 1: Missing Routes (404) — Server needs to implement these

These endpoints are called by the client but return Fastify's default 404 (route not registered):

### `api.claudehome.cn`

| Method | Expected Path | Client File | Error |
|--------|--------------|-------------|-------|
| `GET` | `/api/v1/health` | `client.ts:276` | `Route GET:/api/v1/health not found` |
| `POST` | `/api/v1/analysis/projects` | `client.ts:164` | Route exists but schema broken (see Bug 2) |
| `GET` | `/api/v1/templates/:id` | `client.ts:191` | `Route GET:/api/v1/templates/git-commit not found` |
| `GET` | `/api/v1/skills/search` | `marketplace-client.ts` | `Route GET:/api/v1/skills/search not found` |
| `GET` | `/api/v1/skills/search/suggestions` | `marketplace-client.ts` | 404 |
| `GET` | `/api/v1/skills/search/trending` | `marketplace-client.ts` | 404 |
| `GET` | `/api/v1/skills/marketplace` | `marketplace-client.ts` | 404 |
| `GET/POST` | `/api/v1/skills/:id/ratings` | `marketplace-client.ts` | 404 |
| `GET` | `/api/v1/users/:userId/skills` | `user-skills-api.ts` | 404 |
| `GET` | `/api/v1/users/:userId/quota` | `user-skills-api.ts` | 404 |
| `GET` | `/api/v1/users/:userId/recommendations` | `recommendations.ts` | 404 |
| `GET/POST` | `/api/v1/hooks/recommendations` | `hook-recommendations.ts` | 404 |
| `POST` | `/api/v1/telemetry/installation` | `client.ts:244` | Route exists but schema broken (see Bug 3) |

### `remote-api.claudehome.cn`

| Method | Expected Path | Client File | Error |
|--------|--------------|-------------|-------|
| `GET` | `/api/v1/reply/poll` | `gateway.ts` | `Route GET:/api/v1/reply/poll not found` |

---

## Bug 2: Schema Mismatch — `/api/v1/analysis/projects`

**Method**: `POST`
**Status**: `400 SCHEMA_MISMATCH`
**Error**: `"Invalid project analysis request"`

Client sends (from `types.ts` `ProjectAnalysisRequest`):
```json
{
  "projectRoot": "/test",
  "dependencies": { "typescript": "5.0.0" },
  "devDependencies": {},
  "language": "en",
  "ccjkVersion": "12.0.10",
  "platform": "darwin",
  "nodeVersion": "20.0.0"
}
```

Server rejects all variations tried. The server's required schema is unknown — it returns no field-level detail in the error, only `"Invalid project analysis request"`.

**Fix needed**: Either:
1. Server should accept the above shape, OR
2. Server should return which fields are missing/invalid (e.g. `"required fields: [x, y, z]"`) so client can adapt

---

## Bug 3: Schema Mismatch — `/api/v1/telemetry/installation`

**Method**: `POST`
**Status**: `400 SCHEMA_MISMATCH`
**Error**: `"Missing required telemetry fields"`

Client sends (from `types.ts` `UsageReport`):
```json
{
  "reportId": "test-001",
  "metricType": "analysis_completed",
  "timestamp": "2026-02-26T00:00:00Z",
  "ccjkVersion": "12.0.10",
  "nodeVersion": "20.0.0",
  "platform": "darwin",
  "language": "en",
  "data": {}
}
```

Server rejects all variations. Same issue — no field-level error detail.

**Fix needed**: Server should accept the above shape or return which fields are required.

---

## Bug 4: Schema Mismatch — `/api/v1/bind/use` (remote-api)

**Method**: `POST`
**Status**: `400 SCHEMA_MISMATCH`
**Error**: `"deviceToken is required"`

Client sends (from `gateway.ts`):
```json
{
  "code": "1234",
  "deviceInfo": { "name": "test-mac", "platform": "darwin" }
}
```

Server requires `deviceToken` field which is **not in the client's type definition**.

**Fix needed**: Client `gateway.ts` needs to send `deviceToken`. Server team should confirm the full required schema:
```json
{
  "code": "string",
  "deviceToken": "string",   // <-- missing from client
  "deviceInfo": { "name": "string", "platform": "string" }
}
```

---

## Bug 5: Schema Mismatch — `/api/v1/notify` (remote-api)

**Method**: `POST`
**Status**: `400 SCHEMA_MISMATCH`
**Error**: `"topic and targetDevice are required"`

Client sends:
```json
{ "title": "test", "body": "hello" }
```

Server requires `topic` and `targetDevice` fields which are **not in the client's payload**.

**Fix needed**: Client needs to send:
```json
{
  "topic": "string",         // <-- missing from client
  "targetDevice": "string",  // <-- missing from client
  "title": "string",
  "body": "string"
}
```

---

## Bug 6: Wrong Path — Skills Search

Client calls `/api/v1/skills/search?q=git` (404).
Actual working endpoint is `/api/v1/skills?search=git`.

**Fix needed**: Either:
1. Server adds `/api/v1/skills/search` as an alias, OR
2. Client `marketplace-client.ts` changes to use `/api/v1/skills?search=`

Recommend option 2 (client fix) since the working endpoint already supports search.

---

## Bug 7: Wrong Path — Skills Marketplace

Client calls `/api/v1/skills/marketplace` (404).
Actual working endpoint is `/api/v1/skills`.

**Fix needed**: Client `marketplace-client.ts` should call `/api/v1/skills` directly.

---

## Bug 8: Templates — Single Fetch Returns 404

`GET /api/v1/templates/:id` returns 404 for all IDs tested (`git-commit`, `code-review`).
`POST /api/v1/templates/batch` returns 200 but `notFound: [all ids]` — no templates are seeded.

**Fix needed**:
1. Server needs to register `GET /api/v1/templates/:id` route
2. Template data needs to be seeded in the database

---

## Bug 9: Remote API — Reply Poll Missing

`GET /remote-api.claudehome.cn/api/v1/reply/poll` returns 404.
This is the long-poll endpoint used by the remote control feature — without it, remote control is completely non-functional.

**Fix needed**: Server must implement `GET /api/v1/reply/poll?timeout=:ms` on `remote-api.claudehome.cn`.

---

## Priority Order for Server Team

| Priority | Bug | Impact |
|----------|-----|--------|
| P0 | Bug 9: `/reply/poll` missing | Remote control completely broken |
| P0 | Bug 4: `bind/use` schema | Remote control binding broken |
| P0 | Bug 5: `notify` schema | Remote notifications broken |
| P1 | Bug 1: `/api/v1/health` missing | Client health checks always fail |
| P1 | Bug 2: `analysis/projects` schema | Core analysis feature broken |
| P1 | Bug 3: `telemetry/installation` schema | Usage reporting broken |
| P2 | Bug 6 & 7: Skills path mismatch | Skills marketplace broken |
| P2 | Bug 8: Templates 404 | Template sync broken |
| P3 | All other missing user/hooks routes | Secondary features broken |

---

## Client-Side Fixes (can be done without server)

These can be fixed on the client side immediately:

1. **Skills search path**: `marketplace-client.ts` — change `/api/v1/skills/search?q=` to `/api/v1/skills?search=`
2. **Skills marketplace path**: `marketplace-client.ts` — change `/api/v1/skills/marketplace` to `/api/v1/skills`
3. **`bind/use` payload**: `gateway.ts` — add `deviceToken` field once server confirms the value source
4. **`notify` payload**: `gateway.ts` — add `topic` and `targetDevice` fields once server confirms schema
