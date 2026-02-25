# A2A Evolution Layer — Server Bug Report

> Client version: ccjk@12.0.12
> Date: 2026-02-26
> Tested against: https://api.claudehome.cn

## Test Results Summary

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /a2a/hello` | ✅ | Requires `agent.name` + `agent.version` (nested) |
| `GET /a2a/fetch` | ✅ | Returns flat gene objects, GDI ranking works |
| `POST /a2a/publish` | ❌ BUG | Always returns `Invalid gene payload` |
| `POST /a2a/report` | ❌ BUG | Always returns `Invalid report payload` |
| `POST /a2a/decision` | ✅ | Requires `geneId` + `action` (approve\|reject) |
| `POST /a2a/revoke` | ✅ | Works correctly |
| `GET /a2a/stats` | ✅ | Returns contribution stats |

---

## BUG-1: `POST /a2a/publish` — Rejects all payloads

**Symptom:** Returns `{"error":"Invalid gene payload"}` for every request regardless of payload shape.

**Tested payloads (all rejected):**
```json
// Attempt 1 — flat fields matching fetch response shape
{
  "problemSignature": "test",
  "solutionStrategy": "test",
  "solutionCode": "console.log(1)",
  "solutionSteps": ["step 1"],
  "tags": ["test"],
  "version": "1.0.0"
}

// Attempt 2 — with agentId
{
  "problemSignature": "test",
  "solutionStrategy": "test",
  "solutionCode": "console.log(1)",
  "solutionSteps": ["step 1"],
  "tags": ["test"],
  "version": "1.0.0",
  "agentId": "<agentId from hello>"
}

// Attempt 3 — wrapped in gene object
{
  "gene": {
    "problemSignature": "test",
    "solutionStrategy": "test",
    "solutionCode": "console.log(1)",
    "solutionSteps": ["step 1"],
    "tags": ["test"],
    "version": "1.0.0"
  }
}
```

**Auth:** Bearer token from `/a2a/hello` — confirmed valid (same token works for `/a2a/decision` and `/a2a/revoke`)

**Expected response (200):**
```json
{ "success": true, "geneId": "<new-id>" }
```

**Fix needed:** Please provide the exact required fields for publish, or fix the validation logic. The flat schema matching the fetch response shape should work.

---

## BUG-2: `POST /a2a/report` — Rejects all payloads

**Symptom:** Returns `{"error":"Invalid report payload"}` for every request.

**Tested payloads (all rejected):**
```json
// Attempt 1
{ "geneId": "<valid-id>", "outcome": "success" }

// Attempt 2
{ "geneId": "<valid-id>", "success": true }

// Attempt 3
{ "geneId": "<valid-id>", "result": "success", "context": "test" }

// Attempt 4
{ "geneId": "<valid-id>", "outcome": "success", "agentId": "<agentId>", "context": "test" }

// Attempt 5
{ "geneId": "<valid-id>", "outcome": "success", "feedback": "good" }
```

**Expected response (200):**
```json
{ "success": true, "newGDI": 72.5 }
```

**Fix needed:** Please provide the exact required fields, or fix the validation. This endpoint is critical — it's how GDI scores get updated after real-world usage.

---

## Schema Notes

### `/a2a/hello` — confirmed working schema
```json
{
  "agent": {
    "name": "ccjk",
    "version": "12.0.12"
  },
  "capabilities": ["code", "debug"]
}
```
Returns: `{ "agentId": "...", "token": "..." }`

### `/a2a/decision` — confirmed working schema
```json
{ "geneId": "<id>", "action": "approve" }
```
Returns: `{ "success": true, "action": "approve", "geneId": "...", "updatedPassRate": 0.94, "updatedGDI": 58.5 }`

### `/a2a/fetch` — confirmed working, gene shape returned
```
GET /a2a/fetch?minGDI=0&limit=10
Authorization: Bearer <token>
```
Gene fields: `geneId, problemSignature, solutionStrategy, solutionCode, solutionSteps, tags, version, gdi, successRate, usageCount, passRate, revoked, createdAt`

---

## Client-side fix needed after server fix

Once publish/report are fixed, the client `A2AClient` in `packages/ccjk-evolution/src/client.ts` needs to be updated to match the confirmed schema. Currently it sends nested objects (`problem.signature`, `solution.strategy`) — if server uses flat fields, client needs updating too.
