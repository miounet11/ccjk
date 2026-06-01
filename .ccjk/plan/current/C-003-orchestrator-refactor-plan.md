# C-003: Cloud Setup Orchestrator Refactor Plan

> **Status**: Ready for Implementation
> **Priority**: P0
> **Estimated Time**: 1.5 days

---

## 🎯 Objective

Migrate `cloud-setup-orchestrator.ts` from direct `FallbackCloudClient` usage to the new `CloudApiGateway` with type-safe, version-negotiated API calls.

---

## 📊 Current State Analysis

### Direct Cloud API Calls

| Location | Method | Current Implementation | Issue |
|----------|--------|------------------------|-------|
| Line 188-192 | Constructor | `createCompleteCloudClient({ baseURL: 'https://api.ccjk.dev' })` | Hard-coded endpoint |
| Line 360 | `getCloudRecommendations()` | `this.cloudClient.analyzeProject(request)` | No version negotiation |
| Line 720 | `downloadTemplates()` | `this.cloudClient.getBatchTemplates({ ids, language })` | No fallback |
| Line 1006 | `uploadTelemetry()` | `this.cloudClient.reportUsage(telemetry)` | No error handling |

### Type Safety Issues

- `ProjectAnalysisRequest` uses `any` for some fields
- `BatchTemplateResponse` lacks validation
- Error responses not typed

---

## 🔧 Refactor Strategy

### Phase 1: Gateway Integration (Non-Breaking)

**Changes**:

1. **Import Gateway**
   ```typescript
   // Add to imports
   import { CloudApiGateway, createDefaultGateway } from '../cloud-client/gateway'
   ```

2. **Replace Client in Constructor**
   ```typescript
   // Before
   private cloudClient: FallbackCloudClient

   constructor(options: CloudSetupOptions = {}) {
     this.cloudClient = createCompleteCloudClient({
       baseURL: options.cloudEndpoint || 'https://api.ccjk.dev',
       enableCache: options.cacheStrategy !== 'disabled',
       version: CCJK_VERSION,
     })
   }

   // After
   private gateway: CloudApiGateway

   constructor(options: CloudSetupOptions = {}) {
     this.gateway = createDefaultGateway()
     // Auth token can be set later if needed
   }
   ```

3. **Update `getCloudRecommendations()` (Line 314-380)**
   ```typescript
   // Before
   const response = await this.cloudClient.analyzeProject(request)

   // After
   const response = await this.gateway.request<ProjectAnalysisResponse>(
     'analysis.projects',
     {
       method: 'POST',
       body: request,
     }
   )

   if (!response.success) {
     throw new Error(response.error || 'Analysis failed')
   }

   const data = response.data!
   ```

4. **Update `downloadTemplates()` (Line 702-735)**
   ```typescript
   // Before
   const response = await this.cloudClient.getBatchTemplates({
     ids: templateIds,
     language: options.lang,
   })

   // After
   const response = await this.gateway.request<BatchTemplateResponse>(
     'templates.batch',
     {
       method: 'POST',
       body: {
         ids: templateIds,
         language: options.lang,
       },
     }
   )

   if (!response.success) {
     throw new Error(response.error || 'Template download failed')
   }

   const templates = response.data!
   ```

5. **Update `uploadTelemetry()` (Line 968-1013)**
   ```typescript
   // Before
   await this.cloudClient.reportUsage(telemetry)

   // After
   const response = await this.gateway.request(
     'telemetry.installation',
     {
       method: 'POST',
       body: telemetry,
     }
   )

   if (!response.success) {
     this.logger.warn('Telemetry upload failed:', response.error)
   }
   ```

### Phase 2: Graceful Degradation

**Add Fallback Logic**:

```typescript
private async getCloudRecommendations(
  analysis: ProjectAnalysis,
  options: CloudSetupOptions,
): Promise<CloudRecommendations> {
  if (options.useCloud === false) {
    return this.getLocalRecommendations(analysis)
  }

  try {
    const response = await this.gateway.request<ProjectAnalysisResponse>(
      'analysis.projects',
      {
        method: 'POST',
        body: request,
        timeout: 10000, // 10s timeout
      }
    )

    if (!response.success) {
      this.logger.warn('Cloud API returned error:', response.error)
      return this.getLocalRecommendations(analysis)
    }

    return this.processCloudRecommendations(response.data!, analysis)
  }
  catch (error) {
    this.logger.warn('Cloud API unavailable, using local fallback')
    return this.getLocalRecommendations(analysis)
  }
}
```

---

## ✅ Acceptance Criteria

- [ ] All cloud API calls use `CloudApiGateway`
- [ ] No hard-coded endpoints in orchestrator
- [ ] Type-safe request/response handling
- [ ] Graceful fallback to local recommendations
- [ ] Telemetry failures don't block setup
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] Existing tests pass

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
describe('CloudSetupOrchestrator', () => {
  it('should use gateway for cloud calls', async () => {
    const gateway = createMockGateway()
    const orchestrator = new CloudSetupOrchestrator({ gateway })

    await orchestrator.executeCloudSetup({ useCloud: true })

    expect(gateway.request).toHaveBeenCalledWith('analysis.projects', ...)
  })

  it('should fallback to local on cloud failure', async () => {
    const gateway = createFailingGateway()
    const orchestrator = new CloudSetupOrchestrator({ gateway })

    const result = await orchestrator.executeCloudSetup({ useCloud: true })

    expect(result.source).toBe('local')
  })
})
```

### Integration Tests

- Test with real cloud endpoint (staging)
- Test with network timeout
- Test with invalid API responses
- Test telemetry non-blocking behavior

---

## 📦 Deliverables

1. ✅ Refactored `cloud-setup-orchestrator.ts`
2. ✅ Updated type definitions
3. ✅ Unit tests for gateway integration
4. ✅ Integration tests for fallback behavior
5. ✅ Migration guide for downstream consumers

---

## 🚨 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing integrations | High | Keep `FallbackCloudClient` as deprecated option |
| Cloud API contract changes | Medium | Use gateway's version negotiation |
| Performance regression | Low | Gateway adds minimal overhead (~5ms) |
| Test coverage gaps | Medium | Add comprehensive integration tests |

---

## 📝 Implementation Checklist

- [ ] Update imports
- [ ] Replace `cloudClient` with `gateway`
- [ ] Refactor `getCloudRecommendations()`
- [ ] Refactor `downloadTemplates()`
- [ ] Refactor `uploadTelemetry()`
- [ ] Add error handling
- [ ] Add fallback logic
- [ ] Update tests
- [ ] Run typecheck
- [ ] Run build
- [ ] Manual testing

---

## 🔗 Related Tasks

- **C-001**: Unified endpoint configuration (✅ Complete)
- **C-002**: CloudApiGateway implementation (✅ Complete)
- **C-004**: DTO type definitions (⏳ Next)
- **C-005**: Error handling standardization (⏳ Next)
