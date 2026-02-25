# A2A Evolution Layer — Server Requirements

> Client version: ccjk@12.0.11
> Date: 2026-02-26
> Status: Pending server implementation

## Missing Endpoints

### 1. `POST /a2a/revoke` — Revoke a published gene

Client calls this when a user wants to retract a published solution.

**Request:**
```json
{
  "type": "revoke",
  "geneId": "<gene-id>",
  "reason": "<string>"
}
```

**Auth:** Bearer token required (same as publish)

**Response (200):**
```json
{ "success": true }
```

**Response (404):**
```json
{ "message": "Gene not found" }
```

**Response (403):**
```json
{ "message": "Not authorized to revoke this gene" }
```

---

### 2. `POST /a2a/decision` — Record agent decision for GDI tracking

Client calls this after an agent makes a significant decision (tool selection, approach choice).

**Request:**
```json
{
  "type": "decision",
  "agentId": "<string>",
  "context": "<problem description>",
  "decision": "<what was decided>",
  "outcome": "success | failure | pending",
  "geneIds": ["<gene-id-1>", "<gene-id-2>"]  // genes that influenced this decision
}
```

**Auth:** Bearer token required

**Response (200):**
```json
{
  "decisionId": "<uuid>",
  "gdiImpact": 0.05  // how much this updated referenced genes' GDI
}
```

---

## Existing Endpoint Issues

### 3. `GET /a2a/fetch` — Add `geneId` single-fetch support

Currently only supports query-based fetch. Client needs to fetch a single gene by ID for the detail view.

**Add support for:**
```
GET /a2a/fetch?geneId=<id>
```

**Response:** Same gene object format, wrapped in `{ items: [gene] }`

---

### 4. `GET /a2a/stats` — Agent statistics endpoint

Client wants to show the user their contribution stats.

**Request:**
```
GET /a2a/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "totalPublished": 12,
  "totalReports": 47,
  "avgGDI": 0.73,
  "topGenes": [
    { "geneId": "...", "title": "...", "gdi": 0.95, "reports": 23 }
  ]
}
```

---

## GDI Scoring Notes

The client's `calculateGDI()` function uses this formula:

```
GDI = (successRate * 0.4) + (usageCount / maxUsage * 0.3) + (recencyScore * 0.2) + (diversityScore * 0.1)
```

The server should use the same formula for consistency. If the server uses a different formula, please document it so the client can align.

---

## Gene Object Schema (client expects)

```typescript
interface Gene {
  id: string
  problem: {
    signature: string      // hash of problem type
    description: string
    context: string[]
  }
  solution: {
    strategy: string
    steps: string[]
    toolsUsed: string[]
  }
  quality: {
    gdi: number            // 0-1, higher = better
    successRate: number    // 0-1
    usageCount: number
    lastUsed: string       // ISO date
  }
  metadata: {
    agentId: string
    version: string
    tags: string[]
  }
}
```

Please ensure `/a2a/fetch` returns genes in this exact shape.
