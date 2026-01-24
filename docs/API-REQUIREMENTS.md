# CCJK Cloud API Requirements Document

**Version**: 1.0
**Date**: 2026-01-24
**Status**: Draft
**Priority**: High

---

## 📋 Executive Summary

This document outlines requirements for the CCJK Cloud API v8 (`https://api.claudehome.cn/api/v8/`) to improve compatibility with the CCJK client and provide better error messages for debugging.

---

## 🔍 Current Issues

### Issue 1: API Returns 400 Bad Request for Valid Requests

**Severity**: High
**Frequency**: 100% (all cloud setup attempts fail)

**Symptoms**:
```
[POST] "https://api.claudehome.cn/api/v8/analysis/projects": 400 Bad Request
```

**Client Request** (v8.0.8):
```json
{
  "projectRoot": "/Users/lu/shipin",
  "language": "en",
  "ccjkVersion": "8.0.8"
}
```

**Expected Behavior**: API should either:
1. Accept the request and return recommendations (even if empty/minimal)
2. Return a detailed error message explaining what's wrong

**Actual Behavior**: Returns 400 with no detailed error message in response body

---

### Issue 2: Missing Error Details in Response

**Problem**: When API returns an error, the response body doesn't include:
- Specific field that caused the error
- Expected format/value
- Error code or category
- Validation details

**Current Error Response** (assumed):
```json
{
  "error": "Bad Request"
}
```

**Needed Error Response**:
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: projectType",
    "details": {
      "field": "projectType",
      "expected": "string (typescript, python, go, etc.)",
      "received": "null"
    },
    "requestId": "req_abc123"
  }
}
```

---

## 📝 API Requirements

### 1. Project Analysis Endpoint

**Endpoint**: `POST /api/v8/analysis/projects`

**Current Request Format** (from client):
```typescript
interface ProjectAnalysisRequest {
  projectRoot: string           // Required - Project directory path
  dependencies?: Record<string, string>  // Optional - Production dependencies
  devDependencies?: Record<string, string>  // Optional - Dev dependencies
  gitRemote?: string            // Optional - Git repository URL
  language?: string             // Optional - Client language (en, zh-CN, etc.)
  ccjkVersion?: string          // Optional - CCJK client version
}
```

**Current Response Format**:
```typescript
interface ProjectAnalysisResponse {
  requestId: string
  recommendations: Recommendation[]
  projectType?: string
  frameworks?: string[]
}
```

---

### 2. Requirements for Request Validation

#### 2.1 Minimal Acceptable Request

**Must Accept**:
```json
{
  "projectRoot": "/any/path"
}
```

Even with no other fields, API should:
- Return 200 OK
- Provide generic recommendations
- Include a clear requestId

**Should NOT**:
- Return 400 for minimal requests
- Require all optional fields
- Require dependencies to be present

#### 2.2 Project Types

**Supported Types** (expected by client):
- `typescript`
- `javascript`
- `python`
- `go`
- `rust`
- `java`
- `dotnet`
- `ruby`
- `php`
- `swift`
- `kotlin`
- `dart`
- `unknown` (for unrecognized projects)

**Requirements**:
- Must handle `unknown` project type
- Should provide recommendations even for unknown projects
- Should not reject requests based on project type

#### 2.3 Dependency Format

**Client Sends**:
```json
{
  "dependencies": {
    "package-name": "version",
    "react": "^18.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**Requirements**:
- Must accept empty objects `{}`
- Must accept `null` or undefined for these fields
- Should validate package names (alphanumeric, hyphens, underscores)
- Should validate version strings (semver, ranges, wildcards)

---

### 3. Error Response Requirements

#### 3.1 Error Response Format

**All Errors Must Include**:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "field_name",
      "issue": "description",
      "expected": "expected format",
      "received": "actual value"
    },
    "requestId": "unique_request_id",
    "timestamp": "2026-01-24T12:00:00Z"
  },
  "statusCode": 400
}
```

#### 3.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body |
| `MISSING_REQUIRED_FIELD` | 400 | Required field missing |
| `INVALID_FIELD_VALUE` | 400 | Field value format incorrect |
| `UNSUPPORTED_PROJECT_TYPE` | 400 | Project type not supported |
| `INVALID_DEPENDENCY_FORMAT` | 400 | Dependencies object malformed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

#### 3.3 Error Message Examples

**Missing Required Field**:
```json
{
  "error": {
    "code": "MISSING_REQUIRED_FIELD",
    "message": "The 'projectRoot' field is required",
    "details": {
      "field": "projectRoot",
      "expected": "string (absolute file path)",
      "received": null
    },
    "requestId": "req_abc123"
  }
}
```

**Invalid Project Type**:
```json
{
  "error": {
    "code": "INVALID_FIELD_VALUE",
    "message": "Project type 'cobol' is not supported",
    "details": {
      "field": "projectType",
      "expected": "one of: typescript, javascript, python, go, rust, java, unknown",
      "received": "cobol"
    },
    "requestId": "req_abc123"
  }
}
```

**Invalid Dependencies**:
```json
{
  "error": {
    "code": "INVALID_DEPENDENCY_FORMAT",
    "message": "Dependencies must be an object with package names as keys",
    "details": {
      "field": "dependencies",
      "expected": "{ \"package-name\": \"version\" }",
      "received": ["array", "format"]
    },
    "requestId": "req_abc123"
  }
}
```

---

## 🧪 Test Cases

### Test Case 1: Minimal Request (No Dependencies)

**Request**:
```json
{
  "projectRoot": "/Users/test/project"
}
```

**Expected Response**: 200 OK
```json
{
  "requestId": "req_test1",
  "recommendations": [],
  "projectType": "unknown"
}
```

**Acceptance Criteria**:
- ✅ Returns 200 OK
- ✅ Does NOT return 400
- ✅ Includes requestId
- ✅ Handles missing optional fields gracefully

---

### Test Case 2: Unknown Project Type

**Request**:
```json
{
  "projectRoot": "/path/to/custom-project",
  "projectType": "unknown"
}
```

**Expected Response**: 200 OK
```json
{
  "requestId": "req_test2",
  "recommendations": [
    {
      "id": "generic-git-workflow",
      "category": "workflow",
      "name": { "en": "Git Workflow", "zh-CN": "Git 工作流" },
      "relevanceScore": 0.5
    }
  ]
}
```

**Acceptance Criteria**:
- ✅ Returns generic recommendations
- ✅ Does NOT reject unknown project types
- ✅ Provides fallback/safe recommendations

---

### Test Case 3: Valid Project with Dependencies

**Request**:
```json
{
  "projectRoot": "/path/to/react-app",
  "projectType": "typescript",
  "language": "en",
  "ccjkVersion": "8.0.8",
  "dependencies": {
    "react": "^18.2.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

**Expected Response**: 200 OK
```json
{
  "requestId": "req_test3",
  "recommendations": [
    {
      "id": "react-patterns",
      "category": "workflow",
      "name": { "en": "React Best Practices" },
      "relevanceScore": 0.95
    },
    {
      "id": "ts-best-practices",
      "category": "workflow",
      "name": { "en": "TypeScript Best Practices" },
      "relevanceScore": 0.92
    }
  ],
  "projectType": "typescript",
  "frameworks": ["react"]
}
```

**Acceptance Criteria**:
- ✅ Returns relevant recommendations
- ✅ Higher relevance scores for matching dependencies
- ✅ Includes detected frameworks

---

### Test Case 4: Invalid Project Type

**Request**:
```json
{
  "projectRoot": "/path/to/project",
  "projectType": "invalid-type"
}
```

**Expected Response**: 400 Bad Request (with details)
```json
{
  "error": {
    "code": "INVALID_FIELD_VALUE",
    "message": "Project type 'invalid-type' is not supported",
    "details": {
      "field": "projectType",
      "expected": "one of: typescript, javascript, python, go, rust, java, unknown",
      "received": "invalid-type",
      "requestId": "req_test4"
    }
  }
}
```

**Acceptance Criteria**:
- ✅ Returns 400
- ✅ Includes specific error code
- ✅ Lists valid project types
- ✅ Shows received value

---

### Test Case 5: Empty Dependencies Object

**Request**:
```json
{
  "projectRoot": "/path/to/project",
  "dependencies": {},
  "devDependencies": {}
}
```

**Expected Response**: 200 OK
```json
{
  "requestId": "req_test5",
  "recommendations": []
}
```

**Acceptance Criteria**:
- ✅ Accepts empty dependency objects
- ✅ Does NOT return 400
- ✅ Returns empty or generic recommendations

---

## 🚀 Recommended Improvements

### 1. Add Request Debugging Endpoint

**Endpoint**: `POST /api/v8/analysis/validate`

**Purpose**: Validate request format without processing

**Request**: Same as `/analysis/projects`

**Response**:
```json
{
  "valid": true,
  "warnings": [],
  "estimatedProcessingTime": "1-2s"
}
```

Or for invalid requests:
```json
{
  "valid": false,
  "errors": [
    {
      "field": "projectType",
      "message": "Invalid value",
      "expected": ["typescript", "python", "unknown"]
    }
  ]
}
```

### 2. Enhanced Health Check

**Current**: `GET /api/v8/health`

**Enhanced Response**:
```json
{
  "status": "healthy",
  "version": "8.0.0",
  "endpoints": {
    "analysis": {
      "status": "operational",
      "avgResponseTime": "150ms"
    },
    "templates": {
      "status": "operational",
      "avgResponseTime": "80ms"
    }
  },
  "supportedProjectTypes": [
    "typescript", "javascript", "python", "go", "rust", "unknown"
  ],
  "apiVersion": "8.0.0",
  "timestamp": "2026-01-24T12:00:00Z"
}
```

### 3. Request ID in All Responses

**Requirement**: Every response must include a unique `requestId`

**Purpose**:
- Debugging
- Log correlation
- Support troubleshooting

**Format**: `req_<timestamp>_<random>` (e.g., `req_1706102400_abc123`)

### 4. Rate Limiting Information

**Add to Error Response**:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 100,
      "window": "60s",
      "retryAfter": "2026-01-24T12:01:00Z"
    },
    "requestId": "req_ratelimit1"
  }
}
```

### 5. CORS Headers

**Required Headers**:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 📊 Success Metrics

### Performance

| Metric | Target | Current |
|--------|--------|---------|
| Average response time | < 500ms | Unknown |
| 95th percentile | < 1s | Unknown |
| Error rate | < 1% | ~100% (blocking) |

### Reliability

| Metric | Target | Current |
|--------|--------|---------|
| Uptime | 99.9% | Unknown |
| Successful requests | > 99% | ~0% (400 errors) |

### Usability

| Metric | Target | Current |
|--------|--------|---------|
| Clear error messages | 100% | 0% (no details) |
| Request validation | Real-time | None |
| Debug info availability | 100% | 0% |

---

## 🎯 Implementation Priority

### Phase 1 (Critical - Week 1)

1. ✅ Fix 400 errors for minimal requests
2. ✅ Add detailed error responses
3. ✅ Include requestId in all responses
4. ✅ Handle `unknown` project type

### Phase 2 (Important - Week 2)

5. ✅ Validate all project types
6. ✅ Add request debugging endpoint
7. ✅ Enhanced health check
8. ✅ Improved CORS support

### Phase 3 (Nice to Have - Week 3-4)

9. ⚪ Rate limiting information
10. ⚪ Request/response logging
11. ⚪ Analytics dashboard
12. ⚪ Webhook notifications

---

## 📞 Contact & Support

**Client Version**: CCJK v8.0.8
**API Endpoint**: https://api.claudehome.cn/api/v8/
**Documentation**: https://api.claudehome.cn/docs/V8-CLIENT-INTEGRATION.md

**For Questions**:
- GitHub Issues: https://github.com/miounet11/ccjk/issues
- Email: 9248293@gmail.com

---

## 📅 Changelog

### 2026-01-24 - v1.0
- Initial requirements document
- Identified 2 critical issues
- Defined 5 test cases
- Outlined 3-phase implementation plan

---

**Status**: 📝 Ready for Backend Team Review
**Next Steps**: Backend team to review, estimate, and implement Phase 1 requirements
