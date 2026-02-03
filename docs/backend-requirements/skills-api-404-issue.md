# Backend Requirements: Skills API 404 Template Not Found Issue

## Issue Summary

When users attempt to install skills via the CCJK CLI, all skill template fetches fail with 404 errors. The skills recommendation API (V2) returns skill IDs that do not exist in the templates API (V1).

## System Architecture

The CCJK CLI uses a **two-stage API architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1: RECOMMENDATION (V2 API - Metadata Only)                │
│ Endpoint: GET https://api.claudehome.cn/v2/skills               │
│ Purpose: Get skill metadata for filtering and selection         │
│ Returns: { id, name, description, category, tags } (NO content) │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2: INSTALLATION (V1 API - Full Content)                   │
│ Endpoint: GET https://api.claudehome.cn/v1/templates/{id}       │
│ Purpose: Fetch full template content for installation           │
│ Returns: { id, name, description, content } (WITH content)      │
└─────────────────────────────────────────────────────────────────┘
```

## Error Details

```
Cloud API error in template fetch: skill_nsDoZrxNyLn4: 404 Not Found
GET https://api.claudehome.cn/api/v1/templates/skill_nsDoZrxNyLn4
```

### Affected Skill IDs (from user report)

| Skill ID | Skill Name | Status |
|----------|------------|--------|
| `skill_nsDoZrxNyLn4` | Code Refactor | 404 Not Found |
| `skill_3k8Ar146QsNh` | Import Organizer | 404 Not Found |
| `skill_NVFsru7IdsKD` | JSDoc Generator | 404 Not Found |
| `skill_A8lccokz1dFl` | Security Scanner | 404 Not Found |
| `skill_U0qUCzwYURSB` | Component Generator | 404 Not Found |
| `skill_0y47SW_1lO-W` | Test Generator | 404 Not Found |
| `skill_Ti_Njiu6PyKv` | Schema Generator | 404 Not Found |
| `tpl_VVvfHw7NA_qw` | TypeScript Best Practices | 404 Not Found |
| `tpl_uKPyj6viVGfg` | React Best Practices | 404 Not Found |
| `tpl_Ox4f9FJhul-A` | Component Generator | 404 Not Found |
| `tpl_l9SkEvoBkncY` | Schema Generator | 404 Not Found |
| `tpl_m2FEpjnJIXp8` | Test Generator | 404 Not Found |
| `tpl_GW52d3V_8CRm` | JSDoc Generator | 404 Not Found |
| `tpl_DhHFG_rbdOHk` | Code Refactor | 404 Not Found |

### Additional Error

| Skill ID | Skill Name | Status |
|----------|------------|--------|
| `ts-best-practices` | TypeScript Best Practices | Invalid SKILL.md format |

## Root Cause Analysis

### Current Data Flow

```
1. Client calls GET /v2/skills (V2 API)
   └── Returns list of skills with id field (e.g., "skill_nsDoZrxNyLn4")

2. Client uses skill.id as templatePath
   └── Calls GET /v1/templates/{skill.id} (V1 API)
   └── Returns 404 - template not found
```

### Problem

There is a **data synchronization issue between V2 and V1 APIs**:

1. **V2 API returns skill IDs** that don't exist in V1 templates collection
2. **Templates may have been deleted** from V1 but skill records remain in V2
3. **ID format mismatch**: V2 may return IDs in a format V1 doesn't recognize
4. **Missing ID fallback**: When V2 skill.id is undefined, client derives ID from name (e.g., "typescript-best-practices") which V1 doesn't have

### ID Mapping Issue

| V2 API Response | Client Derives | V1 API Expects | Result |
|-----------------|----------------|----------------|--------|
| `skill_123` | `skill_123` | `skill_123` | ✓ Works |
| `undefined` | `typescript-best-practices` | `skill_*` format | ✗ 404 |
| `skill_123` | `skill_123` | `tpl_123` | ✗ 404 |

## Expected Behavior

### API Contract

**GET /skills** or **GET /skills/recommend** should only return skills where:
- The `templateId` (or `id` if used as fallback) exists in the templates collection
- The template content is valid and passes schema validation

**GET /templates/:id** should:
- Return the template content if it exists
- Return 404 only for genuinely non-existent templates

## Required Backend Actions

### Immediate Fix (P0)

1. **Audit V2-V1 data consistency**
   - Query all skills from V2 database
   - For each skill.id, verify it exists in V1 templates collection
   - Generate a report of orphaned/mismatched records

2. **Synchronize V2 skills with V1 templates**
   - Option A: Delete V2 skill records that have no V1 template
   - Option B: Create missing V1 templates for existing V2 skills
   - Option C: Update V2 skill.id to match existing V1 template IDs

3. **Ensure V2 always returns valid skill.id**
   - V2 API should never return skills with null/undefined id
   - All returned IDs must exist in V1 templates

4. **Fix the `ts-best-practices` template**
   - This template exists but has invalid SKILL.md content
   - Validate and fix the markdown format

### Long-term Fix (P1)

1. **Unify V1 and V2 data sources**
   - Consider using a single source of truth for skills
   - V2 should query the same templates collection as V1
   - Or implement real-time sync between V2 skills and V1 templates

2. **Add cross-API validation on V2 skill listing**
   ```typescript
   // V2 /skills endpoint should validate against V1
   async function getSkills() {
     const skills = await v2Database.skills.findAll();

     // Filter out skills without valid V1 templates
     const validSkills = await Promise.all(
       skills.map(async (skill) => {
         const templateExists = await v1Database.templates.exists(skill.id);
         return templateExists ? skill : null;
       })
     );

     return validSkills.filter(Boolean);
   }
   ```

3. **Add health check endpoint**
   ```
   GET /api/v1/health/skills-integrity
   ```
   Returns:
   - Total V2 skills count
   - V2 skills with valid V1 templates
   - Orphaned V2 skills (no V1 template)
   - V1 templates without V2 skill record

4. **Implement webhook/event sync**
   - When V1 template is deleted → auto-delete V2 skill
   - When V2 skill is created → validate V1 template exists

## SKILL.md Format Reference

For the `ts-best-practices` validation error, the expected format is:

```markdown
---
name: Skill Name
description: Brief description
version: 1.0.0
author: Author Name
tags:
  - tag1
  - tag2
---

# Skill Title

## Description
...

## Usage
...
```

## Testing Verification

After fix, verify with:

```bash
# Should return only skills with valid templates
curl https://api.claudehome.cn/api/v1/skills

# Each returned skill's template should be fetchable
curl https://api.claudehome.cn/api/v1/templates/{skill.templateId}
```

## Contact

- **Reporter**: CCJK CLI User
- **Date**: 2026-02-02
- **Priority**: P0 (Blocking feature)
- **Affected Version**: CCJK v9.3.25
