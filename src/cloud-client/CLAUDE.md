# Cloud Client Module

[Root](../../CLAUDE.md) > [src](../CLAUDE.md) > **cloud-client**

## Purpose

Remote API client for CCJK cloud services. Provides skills marketplace browsing/install, project-based recommendations, hook recommendations, ratings, telemetry, and template fetching. Wraps the base HTTP client with retry, caching, and local-fallback layers.

## Entry Points

- `src/cloud-client/index.ts` — full public API; use `createCompleteCloudClient()` for production
- `src/cloud-client/client.ts` — `CloudClient` base class
- `src/cloud-client/types.ts` — all shared types

## Module Structure

```
src/cloud-client/
├── client.ts                    # CloudClient — base HTTP client
├── cache.ts                     # CachedCloudClient + CloudCache
├── retry.ts                     # RetryableCloudClient + withRetry()
├── errors.ts                    # CloudError, CloudErrorCode, error helpers
├── recommendations.ts           # getCloudRecommendations / MCP / skill variants
├── hook-recommendations.ts      # getCloudRecommendedHooks, getCommunityHooks
├── ratings-api.ts               # createRating, getSkillRatings
├── skills-marketplace-api.ts    # skillsMarketplaceApi
├── skills-marketplace-types.ts  # Skill, SkillCategory, MarketplaceFilters, etc.
├── user-skills-api.ts           # getUserSkills, installSkill, uninstallSkill, quota
├── templates-client.ts          # TemplatesClient — v8 template fetching
├── telemetry.ts                 # TelemetryReporter, trackEvent, initializeTelemetry
├── dto.ts                       # DTO converters and validators
├── gateway.ts                   # API gateway routing
├── skills/
│   └── index.ts                 # Unified skills API re-exports
└── index.ts                     # createCompleteCloudClient() + all exports
```

## Client Composition

`createCompleteCloudClient()` stacks four layers:

```
FallbackCloudClient          <- local fallback when API is down
  └── CachedCloudClient      <- in-memory cache
        └── RetryableCloudClient  <- exponential backoff
              └── CloudClient    <- base HTTP client
```

## Key Interfaces

```typescript
// Base client
class CloudClient {
  analyzeProject(req: ProjectAnalysisRequest): Promise<ProjectAnalysisResponse>
  getTemplate(id: string, language?: string): Promise<TemplateResponse>
  getBatchTemplates(req: BatchTemplateRequest): Promise<BatchTemplateResponse>
  reportUsage(report: UsageReport): Promise<UsageReportResponse>
  healthCheck(): Promise<HealthCheckResponse>
}

// Skills marketplace
skillsMarketplaceApi.search(params: SearchParams): Promise<SearchResponse>
skillsMarketplaceApi.install(req: InstallSkillRequest): Promise<void>

// User skills
userSkillsApi.getUserSkills(): Promise<UserSkill[]>
userSkillsApi.installSkill(req): Promise<void>
userSkillsApi.getUserQuota(): Promise<Quota>
```

## Error Handling

```typescript
import { isRetryableError, isAuthError, isRateLimitError } from '../cloud-client'
// CloudError.code is a CloudErrorCode enum value
```

## Dependencies

- Internal: `src/utils/`, `src/i18n/`
- External: `ofetch` (HTTP), `consola` (logging)

## Tests

- `tests/cloud-client/dto.test.ts`
- `tests/cloud-client/skills.test.ts`
- `tests/cloud-client/notifications.test.ts`
- `tests/integration/cloud-api.test.ts`
- `tests/integration/cloud-skills.test.ts`
- `tests/daemon/cloud-client.test.ts`

## Changelog

| Date | Change |
|------|--------|
| 2026-02-25 | CLAUDE.md created by init-architect |
