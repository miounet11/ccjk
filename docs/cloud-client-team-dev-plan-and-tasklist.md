# Cloud Client Team Development Plan + Task List

> Version: v1.0
> Date: 2026-02-24
> Owner: Client Team Lead
> Scope: CCJK CLI + Cloud-facing client modules

---

## 1) Goal

Build a stable and contract-aligned cloud client layer for CCJK, so that cloud-powered setup, template download, recommendation, telemetry, notification, and sync features work consistently across environments.

Primary outcomes:
- One unified cloud endpoint strategy
- One unified API version strategy
- Stable fallback behavior (cloud down does not block user flow)
- Testable, observable, and release-safe client behavior

---

## 2) Current Gaps (from project audit)

1. API version fragmentation (`/api/v1`, `/api/v8`, `/v1`) in different modules.
2. ~~Domain fragmentation (`api.claudehome.cn`, `api.api.claudehome.cn`, `remote-api.claudehome.cn`).~~ **Fixed**: unified to `api.claudehome.cn` + `remote-api.claudehome.cn`.
3. Cloud setup path depends on template/recommendation APIs with inconsistent contracts.
4. Notification client depends on `/bind/use`, `/notify`, `/reply/poll`, but this chain is not contract-stabilized end-to-end.
5. Some modules are fallback-first, some are hard-fail, causing inconsistent UX.

---

## 3) Team Principles

- Contract-first: no endpoint call without typed request/response contract.
- Single source of truth for base URL + API version.
- Non-blocking telemetry and optional cloud features.
- Backward compatibility via adapter layer (not scattered hacks).
- Release gate must include typecheck + build + targeted cloud integration tests.

---

## 4) Delivery Milestones

## M0 (2-3 days): Baseline and freeze
- Freeze current cloud call map.
- Introduce a single `CloudEndpointResolver` abstraction.
- Add a compatibility matrix doc in code comments / docs.

## M1 (4-6 days): P0 stabilization
- Migrate core setup path to unified client gateway.
- Normalize error model and fallback behavior.
- Ensure telemetry never blocks setup/install.

## M2 (4-5 days): P1 features
- Complete notification chain integration.
- Complete skills/marketplace API consistency.
- Add integration tests for critical flows.

## M3 (2-3 days): hardening and handoff
- Add smoke test scripts for release.
- Publish client integration contract doc for server team.
- Tag release candidate.

---

## 5) Task List (Executable)

| ID | Priority | Module | Task | Deliverable | Acceptance Criteria | Dependency | Estimate |
|---|---|---|---|---|---|---|---|
| C-001 | P0 | `src/constants.ts` + cloud clients | Create unified endpoint config (`CLOUD_API_BASE`, `REMOTE_API_BASE`) and remove hard-coded scattered base URLs | Centralized endpoint config | No direct hard-coded cloud domain in active call path | None | 1d |
| C-002 | P0 | `src/cloud-client/*` | Build client gateway adapter: normalize `v1/v8` route mapping in one layer | `CloudApiGateway` abstraction | Core features call gateway only, not raw mixed paths | C-001 | 1.5d |
| C-003 | P0 | `src/orchestrators/cloud-setup-orchestrator.ts` | Route setup/analyze/templates/telemetry through gateway with strict types | Refactored setup path | `ccjk:all` cloud mode completes with graceful fallback when API missing | C-002 | 1.5d |
| C-004 | P0 | `src/cloud-client/types.ts` + templates types | Define canonical DTOs for templates/recommendations/telemetry and converter functions | DTO package + mappers | No `any` in core cloud flow responses | C-002 | 1d |
| C-005 | P0 | error handling | Standardize cloud error codes (`AUTH_ERROR`, `RATE_LIMIT`, `SCHEMA_MISMATCH`, etc.) | Shared error utility | User-facing messages are deterministic and localized | C-003 | 0.5d |
| C-006 | P0 | telemetry | Make telemetry fully non-blocking + retry budget + silent fail policy | Telemetry policy implementation | Setup/install result not affected by telemetry failure | C-003 | 0.5d |
| C-007 | P1 | `src/services/cloud-notification.ts` | Align notification calls to contract package and add response validation | Stable notification client | Bind/notify/reply success+failure paths all covered by tests | C-004 | 1d |
| C-008 | P1 | `src/services/cloud/skills-sync.ts` + marketplace clients | Unify skill sync/marketplace request styles and auth headers | Consistent skill cloud adapter | Skill list/get/upload/download use same auth and error handling conventions | C-001 | 1.5d |
| C-009 | P1 | tests | Add integration tests for 5 critical flows: analyze, batch templates, telemetry, notify, skills list | Test suite additions | CI can catch contract break before release | C-003,C-007,C-008 | 1.5d |
| C-010 | P2 | docs | Produce client-server contract quick reference for backend handoff | `docs/client-cloud-contract-handoff.md` | Server team can implement without reading client source | C-004 | 0.5d |

---

## 6) Definition of Done (Client)

A task is done only if all checks pass:
- Type-safe API request/response (no unsafe fallback in core path)
- `pnpm typecheck` passes
- `pnpm build` passes
- Added/updated tests for changed cloud path
- Changelog note added for any behavior change
- No new hard-coded cloud domain introduced

---

## 7) Risks and Mitigation

- Risk: server contract changes during implementation
  Mitigation: pin contract version + adapter compatibility layer.

- Risk: migration breaks legacy users
  Mitigation: feature flag (`CLOUD_CLIENT_V2=true`) and phased rollout.

- Risk: flaky network test failures
  Mitigation: deterministic mocks for CI + nightly real endpoint smoke test.

---

## 8) Suggested Sprint Assignment

- Sprint A (Week 1): C-001 ~ C-006 (all P0)
- Sprint B (Week 2): C-007 ~ C-009 (P1 + tests)
- Sprint C (Week 3): C-010 + stabilization + RC

---

## 9) Handoff Checklist to Server Team

Client team must provide:
- Final endpoint list (method/path/auth/request/response/error)
- Field-level schema (required/optional/defaults)
- Compatibility behavior (legacy alias paths)
- Timeout/retry policy
- Error code mapping table
