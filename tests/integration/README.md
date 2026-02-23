# Cloud API Integration Tests

## Overview

This directory contains integration tests for the CCJK Cloud API client. These tests verify the complete integration between the client and cloud services, including:

- **Project Analysis**: AI-powered project analysis and recommendations
- **Batch Templates**: Template download and caching
- **Telemetry**: Anonymous usage statistics reporting
- **Notifications**: Device binding, notification sending, and reply polling
- **Skills Marketplace**: Skills list, search, download, and upload
- **End-to-End Flows**: Complete setup workflows with fallback scenarios

## Test Structure

```
tests/integration/
├── cloud-api.test.ts              # Core API tests (analysis, templates, telemetry)
├── cloud-notifications.test.ts    # Notification system tests
├── cloud-skills.test.ts           # Skills marketplace tests
├── cloud-setup-e2e.test.ts        # End-to-end integration tests
└── README.md                      # This file
```

## Running Tests

### Run All Integration Tests

```bash
pnpm test:integration:run
```

### Run Tests in Watch Mode

```bash
pnpm test:integration
```

### Run Tests with UI

```bash
pnpm test:integration:ui
```

### Run Tests with Coverage

```bash
pnpm test:integration:coverage
```

### Run Specific Test File

```bash
pnpm test:integration:run cloud-api.test.ts
```

## Test Coverage

### Cloud API Tests (`cloud-api.test.ts`)

**Test Suites**: 4
**Test Cases**: 20+

- ✅ Project Analysis (5 tests)
  - Valid project analysis
  - Empty project handling
  - Timeout scenarios
  - API error responses
  - Network error handling

- ✅ Batch Templates (5 tests)
  - Successful batch download
  - Partial template availability
  - Invalid template IDs
  - Download timeout
  - Empty template list

- ✅ Telemetry (4 tests)
  - Successful upload
  - Non-blocking failure
  - Retry logic
  - Timeout handling

- ✅ Health Check (3 tests)
  - Healthy status
  - Degraded status
  - Unhealthy status

### Notification Tests (`cloud-notifications.test.ts`)

**Test Suites**: 4
**Test Cases**: 16+

- ✅ Device Binding (4 tests)
  - Valid binding code
  - Invalid code handling
  - Expired code handling
  - Network timeout

- ✅ Notification Sending (4 tests)
  - Successful send
  - Authentication failure
  - Delivery failure
  - Send timeout

- ✅ Reply Polling (4 tests)
  - Successful poll
  - No reply timeout
  - Authentication failure
  - Long-polling timeout

- ✅ Complete Flow (4 tests)
  - Bind → Notify → Poll flow
  - Failure at bind step
  - Failure at notify step
  - Error recovery

### Skills Tests (`cloud-skills.test.ts`)

**Test Suites**: 4
**Test Cases**: 16+

- ✅ Skills List (4 tests)
  - Retrieve skills list
  - Empty list handling
  - Authentication failure
  - Pagination

- ✅ Skills Download (4 tests)
  - Successful download
  - Skill not found
  - Download timeout
  - Corrupted content

- ✅ Skills Upload (4 tests)
  - Successful upload
  - Validation errors
  - Authentication failure
  - Duplicate names

- ✅ Search and Filtering (3 tests)
  - Keyword search
  - Tag filtering
  - No results handling

### E2E Tests (`cloud-setup-e2e.test.ts`)

**Test Suites**: 4
**Test Cases**: 10+

- ✅ Complete Setup Flow (3 tests)
  - Full cloud setup
  - Large project analysis
  - Report generation

- ✅ Fallback Scenarios (3 tests)
  - Cloud unavailable fallback
  - Network timeout fallback
  - Explicit local mode

- ✅ Error Recovery (2 tests)
  - Partial template failure
  - Installation failures

- ✅ Performance Benchmarks (2 tests)
  - Performance targets
  - Concurrent requests

## Test Helpers

The `tests/helpers/cloud-mock.ts` module provides utilities for mocking cloud API responses:

### Mock Data Generators

```typescript
import {
  createMockAnalysisResponse,
  createMockBatchTemplateResponse,
  createMockRecommendation,
  createMockTemplate,
} from '../helpers/cloud-mock'

// Create mock analysis response
const analysis = createMockAnalysisResponse({
  projectType: 'typescript-react',
  frameworks: ['react', 'typescript'],
})

// Create mock template
const template = createMockTemplate({
  id: 'my-template',
  type: 'workflow',
})
```

### Mock Server

```typescript
import { MockCloudServer, createTestGateway } from '../helpers/cloud-mock'

// Create mock server
const mockServer = new MockCloudServer()

// Set mock response
mockServer.setResponse('analysis.projects', {
  success: true,
  data: createMockAnalysisResponse(),
})

// Simulate latency
mockServer.setLatency(1000) // 1 second delay

// Enable failures
mockServer.enableFailures(0.5) // 50% failure rate

// Create test gateway
const { gateway } = createTestGateway(mockServer)
```

### Assertion Helpers

```typescript
import {
  assertSuccessResponse,
  assertErrorResponse,
  waitFor,
} from '../helpers/cloud-mock'

// Assert success
const response = await gateway.request('health', { method: 'GET' })
assertSuccessResponse(response)
expect(response.data.status).toBe('healthy')

// Assert error
const errorResponse = await gateway.request('invalid', { method: 'GET' })
assertErrorResponse(errorResponse)
expect(errorResponse.code).toBe('NOT_FOUND')

// Wait for condition
await waitFor(() => mockServer.getRequestLog().length > 0, 5000)
```

## Environment Variables

Integration tests use the following environment variables (configured in `vitest.integration.config.ts`):

```bash
NODE_ENV=test
DATABASE_URL=postgresql://ccjk_user:ccjk_password@localhost:5433/ccjk_test
REDIS_URL=redis://localhost:6379/15
ELASTICSEARCH_URL=http://localhost:9200
LOG_LEVEL=error
```

## CI Integration

These tests are designed to run in CI environments:

- **Mock Mode**: Tests use mock servers by default, no real API calls
- **Isolated**: Each test suite is isolated and can run independently
- **Fast**: Tests complete within 30 seconds per suite
- **Deterministic**: No flaky tests, consistent results

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:integration:run
      - run: pnpm test:integration:coverage
```

## Performance Targets

Based on `src/orchestrators/CLAUDE.md`:

- Cloud connection: < 500ms
- Project analysis: < 2s
- Recommendation generation: < 1s
- Template download: < 3s
- Total setup time: < 10s

These targets are verified in the E2E performance benchmark tests.

## Troubleshooting

### Tests Timing Out

If tests are timing out, check:

1. Mock server latency settings
2. Test timeout configuration (default: 60s)
3. Network connectivity (if using real endpoints)

### Mock Server Not Responding

Ensure mock responses are set before making requests:

```typescript
// ❌ Wrong - no response set
const response = await gateway.request('health', { method: 'GET' })

// ✅ Correct - response set first
mockServer.setResponse('health', { success: true, data: {...} })
const response = await gateway.request('health', { method: 'GET' })
```

### Type Errors

Ensure all imports are correct:

```typescript
import type { CloudApiResponse } from '../../src/services/cloud/api-client'
import type { ProjectAnalysisResponse } from '../../src/cloud-client/types'
```

## Contributing

When adding new integration tests:

1. Follow the existing test structure
2. Use mock helpers from `tests/helpers/cloud-mock.ts`
3. Add both success and failure scenarios
4. Include timeout and error handling tests
5. Update this README with new test coverage
6. Ensure tests complete within 30 seconds

## Related Documentation

- [Cloud Client Documentation](../../src/cloud-client/README.md)
- [Orchestrator Documentation](../../src/orchestrators/CLAUDE.md)
- [API Types](../../src/cloud-client/types.ts)
- [Gateway Documentation](../../src/cloud-client/gateway.ts)
