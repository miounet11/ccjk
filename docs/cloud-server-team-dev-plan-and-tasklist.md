# Cloud Server Team Development Plan + Task List

> Version: v1.0
> Date: 2026-02-24
> Owner: Server Team Lead
> Scope: Cloud API + Remote API + Notification + Templates/Recommendations backend

---

## 1) Goal

Deliver a production-grade cloud backend that fully satisfies current CCJK client requirements with stable contracts, backward compatibility, and observability.

Primary outcomes:
- A unified, versioned API contract
- Full support for setup-critical endpoints (templates/recommendations/telemetry)
- Full support for remote and notification chains
- Clear auth model and error model

---

## 2) Current Gaps (from project audit)

1. Existing remote backend routes (`/auth`, `/v1/sessions`, `/v1/machines`) exist, but cloud setup APIs are not fully covered.
2. Missing or unstable endpoints in templates/recommendations/telemetry path break client cloud setup.
3. Notification endpoints expected by client (`/bind/use`, `/notify`, `/reply/poll`) are not fully aligned/implemented in current backend package.
4. API namespace/version/domain are fragmented.
5. Contract docs exist but are not enforced by OpenAPI + schema validation in runtime.

---

## 3) Architecture Decision (must freeze first)

- Public Cloud API base: choose one canonical domain (recommended: `https://api.claudehome.cn`).
- Remote API base: keep dedicated remote domain (`https://remote-api.claudehome.cn`) OR merge behind gateway.
- Versioning strategy: keep one primary (`/api/v1` or `/api/v8`) and maintain aliases for legacy clients.
- Use OpenAPI as source of truth + generated validators.

---

## 4) Endpoint Capability Matrix (Must-have)

## A. Setup-critical APIs (P0)
- `POST /api/{ver}/analysis/projects`
- `GET /api/{ver}/templates/{id}`
- `POST /api/{ver}/templates/batch`
- `POST /api/{ver}/telemetry/installation` (non-blocking semantics)
- `POST /api/{ver}/recommendations/{type}`

## B. Notification APIs (P1)
- `POST /bind/use`
- `POST /notify`
- `GET /reply/poll`

## C. Skills/Marketplace APIs (P1)
- `GET /skills`
- `GET /skills/{id}`
- `POST /skills`
- `PUT /skills/{id}`
- `DELETE /skills/{id}`
- marketplace/search/suggestions/trending endpoints used by client

## D. Remote APIs (already partial, complete compatibility) (P1)
- `/auth/register`, `/auth/login`, `/auth/verify`
- `/v1/sessions*`
- `/v1/machines*`
- `/health`

---

## 5) Task List (Executable)

| ID | Priority | Area | Task | Deliverable | Acceptance Criteria | Dependency | Estimate |
|---|---|---|---|---|---|---|---|
| S-001 | P0 | Contract | Publish OpenAPI spec for setup-critical endpoints | `openapi/cloud-core.yaml` | Client can generate typed SDK from spec | None | 1d |
| S-002 | P0 | API Gateway | Implement version aliasing and canonical routing (`v1/v8` compatibility) | Version router/middleware | Legacy and new paths return same payload semantics | S-001 | 1d |
| S-003 | P0 | Templates | Implement single + batch templates with strict schema and partial-not-found support | Templates endpoints | Batch endpoint returns `templates + notFound + requestId` | S-001 | 1.5d |
| S-004 | P0 | Recommendations | Implement project analysis + recommendations by type (`agents/skills/mcp/hooks`) | Reco service | Deterministic response schema, no nested malformed name fields | S-001 | 1.5d |
| S-005 | P0 | Telemetry | Implement telemetry ingestion with optional auth and safe fail policy | Telemetry endpoint + queue | Never blocks client workflow; server tolerates missing auth per policy | S-001 | 0.5d |
| S-006 | P1 | Notification | Implement `/bind/use`, `/notify`, `/reply/poll` with token lifecycle | Notification service | End-to-end bind→notify→reply works in integration test | S-001 | 1.5d |
| S-007 | P1 | Skills Cloud | Implement CRUD + list/filter/pagination for cloud skills | Skills service | Client skill sync path succeeds with auth + checksum fields | S-001 | 1.5d |
| S-008 | P1 | Marketplace | Implement marketplace/recommend/search/suggestion/trending endpoints | Marketplace APIs | Client cloud marketplace calls return schema-valid responses | S-001 | 1.5d |
| S-009 | P1 | Auth | Unify auth docs and headers (`Bearer`, device token rules) | Auth policy doc + middleware | No ambiguity between device and user token flows | S-002 | 0.5d |
| S-010 | P1 | Validation | Add runtime schema validation (request + response) | Validation middleware | Invalid payloads fail fast with unified error code | S-001 | 1d |
| S-011 | P2 | Observability | Add requestId, structured logs, endpoint SLA metrics, error dashboards | Logging/metrics dashboards | 95th latency + error rate visible per endpoint | S-003~S-010 | 1d |
| S-012 | P2 | QA | Add contract tests against client fixture payloads | Contract test suite | Client fixtures pass in CI before release | S-001~S-010 | 1d |
| S-013 | P2 | Release | Publish migration/compatibility guide and deprecation schedule | `docs/server-cloud-migration-guide.md` | Client and ops teams sign off rollout plan | S-002,S-012 | 0.5d |

---

## 6) Definition of Done (Server)

A task is done only if:
- Endpoint is documented in OpenAPI and implemented
- Request/response validated at runtime
- Unified error code format returned
- Integration tests pass for happy path + failure path
- Observability fields include `requestId`, `status`, `latencyMs`, `errorCode`

---

## 7) Unified Error Contract (recommended)

```json
{
  "success": false,
  "error": {
    "code": "SCHEMA_MISMATCH",
    "message": "Invalid field: name_en",
    "requestId": "req_xxx"
  }
}
```

Suggested code set:
- `INVALID_REQUEST`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `SCHEMA_MISMATCH`
- `INTERNAL_ERROR`
- `SERVICE_UNAVAILABLE`

---

## 8) Release Phasing

- Phase 1 (P0): setup-critical endpoints live + backward compatible routes
- Phase 2 (P1): notification + skills + marketplace complete
- Phase 3 (P2): observability hardening + contract CI gate + deprecation announcement

---

## 9) Handoff Checklist to Client Team

Server team must provide:
- Base URL and version policy (final)
- OpenAPI bundle
- Example payloads for each endpoint (EN + zh-CN fields where applicable)
- Auth matrix (which endpoint needs which token)
- Error and retry guidance
