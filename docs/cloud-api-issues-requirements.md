# CCJK Cloud API Issues & Requirements Document

**Generated**: 2026-01-24
**Version**: v8.1.3
**Status**: Requires Action

---

## Executive Summary

This document identifies critical issues between CCJK client (v8.1.3) and the cloud service API (`api.claudehome.cn`), categorized into:

| Category | Count | Priority |
|----------|-------|----------|
| API Endpoint Issues | 3 | 🔴 High |
| Client Code Issues | 2 | 🟡 Medium |
| Authentication Issues | 1 | 🔴 High |

---

## 1. API Endpoint Issues

### 1.1 Batch Template Fetch (400 Bad Request)

**Status**: 🔴 Critical

**Endpoint**:
```
POST https://api.claudehome.cn/api/v8/templates/batch
```

**Error Details**:
```javascript
{
  statusCode: 400,
  message: '//api.claudehome.cn/api/v8/templates/batch": 400 Bad Request'
}
```

**Stack Trace**:
```
at CloudClient.getBatchTemplates
at FallbackCloudClient.getBatchTemplates
at CloudSetupOrchestrator.downloadTemplates
```

**Possible Causes**:
1. Request body format mismatch
2. Missing required headers
3. Rate limiting
4. API endpoint not implemented on server

**Required Server Action**:
- [ ] Implement `/api/v8/templates/batch` endpoint
- [ ] Accept POST request with template IDs array
- [ ] Return templates in expected format

**Expected Request Format**:
```json
POST /api/v8/templates/batch
Content-Type: application/json

{
  "templates": ["template-id-1", "template-id-2"],
  "language": "en"
}
```

**Expected Response Format**:
```json
{
  "success": true,
  "data": {
    "template-id-1": { /* template content */ },
    "template-id-2": { /* template content */ }
  }
}
```

---

### 1.2 Single Template Fetch (404 Not Found)

**Status**: 🔴 Critical

**Endpoint**:
```
GET https://api.claudehome.cn/v1/templates/{templateId}?language=en
```

**Error Details**:
```javascript
{
  statusCode: 404,
  message: '//api.claudehome.cn/v1/templates/generic-git-workflow?language=en": 404 Not Found'
}
```

**Issues Identified**:
1. **API Version Inconsistency**: Using `/v1/` instead of `/api/v8/`
2. Template `generic-git-workflow` not found

**Required Server Action**:
- [ ] Ensure templates are accessible at both `/v1/` and `/api/v8/` endpoints
- [ ] Add `generic-git-workflow` template to database
- [ ] Implement backward compatibility for v1 endpoints

**Template List Required**:
```json
{
  "skills": [
    "generic-git-workflow",
    "code-review-workflow",
    "test-driven-development"
  ],
  "mcp": [
    "filesystem-mcp",
    "git-mcp",
    "github-mcp",
    "docker-mcp"
  ],
  "agents": [
    "fullstack-developer",
    "code-reviewer",
    "test-engineer"
  ]
}
```

---

### 1.3 Telemetry Upload (401 Unauthorized)

**Status**: 🔴 Critical

**Endpoint**:
```
POST https://api.claudehome.cn/api/v8/telemetry/installation
```

**Error Details**:
```javascript
{
  statusCode: 401,
  message: '//api.claudehome.cn/api/v8/telemetry/installation": 401 Unauthorized'
}
```

**Possible Causes**:
1. Missing authentication token
2. Invalid API key
3. Expired credentials

**Required Server Action**:
- [ ] Document authentication requirements
- [ ] Provide API key or token for CCJK client
- [ ] Consider making telemetry optional or public

**Required Client Action**:
- [ ] Add authentication header to telemetry requests
- [ ] Handle 401 gracefully (telemetry should be non-blocking)

---

## 2. Client Code Issues

### 2.1 Missing `getRecommendations` Method

**Status**: 🟡 Medium

**Error Details**:
```javascript
TypeError: client.getRecommendations is not a function
  at getCloudRecommendations (ccjk-agents.mjs:23:35)
  at ccjkAgents (ccjk-agents.mjs:205:33)
```

**Root Cause**:
The `CloudClient` class is missing the `getRecommendations` method that agents command tries to call.

**Required Client Fix**:
```typescript
// Add to CloudClient class
async getRecommendations(
  analysis: ProjectAnalysis,
  type: 'agents' | 'skills' | 'mcp' = 'agents'
): Promise<Recommendation[]> {
  return this.$fetch(`/api/v8/recommendations/${type}`, {
    method: 'POST',
    body: analysis
  })
}
```

**Fallback Behavior**:
- [ ] Implement local fallback when method is unavailable
- [ ] Use local template matching as backup

---

### 2.2 Agent Templates Directory Path

**Status**: 🟡 Medium

**Error Details**:
```
Agent templates directory not found: /home/templates/agents
```

**Root Cause**:
Looking for templates in `/home/templates/agents` instead of npm package directory.

**Required Client Fix**:
```typescript
// Fix template path resolution
const agentsTemplatePath = path.join(
  __dirname,
  '../../templates/agents'
)
```

**Required Directory Structure**:
```
ccjk/
├── dist/
│   └── chunks/
└── templates/
    └── agents/
        ├── fullstack-developer.json
        ├── code-reviewer.json
        └── test-engineer.json
```

---

## 3. API Version Consolidation

### 3.1 Current State

| Component | API Version | Endpoint Pattern |
|-----------|-------------|------------------|
| Batch Templates | v8 | `/api/v8/templates/batch` |
| Single Template | v1 | `/v1/templates/{id}` |
| Recommendations | v8 | `/api/v8/recommendations` |
| Telemetry | v8 | `/api/v8/telemetry/installation` |

### 3.2 Required Standardization

**Target Pattern**: All endpoints should use `/api/v8/` prefix

| Endpoint | Current | Target |
|----------|---------|--------|
| Get Template | `/v1/templates/{id}` | `/api/v8/templates/{id}` |
| Batch Templates | `/api/v8/templates/batch` | ✅ Correct |
| Recommendations | `/api/v8/recommendations/{type}` | ✅ Correct |
| Telemetry | `/api/v8/telemetry/installation` | ✅ Correct |

---

## 4. Complete API Specification

### 4.1 Templates API

#### Get Single Template
```http
GET /api/v8/templates/{templateId}?language={language}

Response:
{
  "success": true,
  "data": {
    "id": "generic-git-workflow",
    "name": "Git Workflow",
    "description": "...",
    "content": "// template content",
    "language": "en"
  }
}
```

#### Get Batch Templates
```http
POST /api/v8/templates/batch

Request:
{
  "templates": ["id1", "id2"],
  "language": "en"
}

Response:
{
  "success": true,
  "data": {
    "id1": { /* template */ },
    "id2": { /* template */ }
  }
}
```

### 4.2 Recommendations API

#### Get Recommendations
```http
POST /api/v8/recommendations/{type}

Path Parameters:
  type: "skills" | "mcp" | "agents" | "hooks"

Request:
{
  "projectType": "typescript",
  "frameworks": ["react", "nextjs"],
  "languages": ["typescript", "javascript"],
  "confidence": 0.8
}

Response:
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "react-developer",
        "name": "React Developer",
        "confidence": 0.9,
        "skills": [...],
        "mcpServers": [...]
      }
    ]
  }
}
```

### 4.3 Telemetry API

#### Report Installation
```http
POST /api/v8/telemetry/installation

Headers:
  Authorization: Bearer {API_KEY}  # Optional

Request:
{
  "version": "8.1.3",
  "platform": "linux",
  "nodeVersion": "20.0.0",
  "timestamp": "2026-01-24T12:00:00Z",
  "features": {
    "skillsInstalled": 1,
    "mcpInstalled": 4,
    "agentsCreated": 0
  }
}

Response:
{
  "success": true
}
```

---

## 5. Priority Action Items

### Immediate (Server-Side)
1. 🔴 **Implement `/api/v8/templates/batch` endpoint**
2. 🔴 **Add missing templates to database** (generic-git-workflow, etc.)
3. 🔴 **Fix telemetry authentication** or make public
4. 🟡 **Standardize all endpoints to `/api/v8/` prefix**

### Immediate (Client-Side)
1. 🟡 **Add `getRecommendations` method to CloudClient**
2. 🟡 **Fix agent template path resolution**
3. 🟡 **Add proper authentication headers to telemetry**

### Follow-up
1. 🟢 **Implement template versioning**
2. 🟢 **Add API health check endpoint**
3. 🟢 **Create comprehensive error mapping**

---

## 6. Testing Checklist

### Pre-deployment Testing
- [ ] Test `/api/v8/templates/batch` with valid template IDs
- [ ] Test `/api/v8/templates/{id}` for all template types
- [ ] Test `/api/v8/recommendations/{type}` with various project types
- [ ] Test `/api/v8/telemetry/installation` authentication
- [ ] Test v1 endpoint backward compatibility

### Client Integration Testing
- [ ] Test cloud setup orchestrator end-to-end
- [ ] Test fallback behavior when cloud API fails
- [ ] Test agent creation with cloud recommendations
- [ ] Test skill installation with cloud templates

---

## 7. Contact & Coordination

**Server Team Action Items**:
- Review API specifications above
- Implement missing endpoints
- Provide authentication credentials for telemetry

**Client Team Action Items**:
- Fix CloudClient missing methods
- Correct template path resolution
- Add proper error handling

---

*Document ID: CCJK-CLOUD-API-ISSUES-001*
*Last Updated: 2026-01-24*
