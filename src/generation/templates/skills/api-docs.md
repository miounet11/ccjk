# API Documentation Generator

Generate comprehensive API documentation from code with OpenAPI/Swagger format.

## Triggers

- **command**: `/api-docs` - Trigger with slash command
- **pattern**: `generate api docs` - Natural language trigger
- **pattern**: `生成API文档` - Chinese language trigger
- **pattern**: `document api` - Alternative trigger

## Actions

### Action 1: glob

Find all API route files.

```
Pattern: **/*{routes,api,controllers}*.{ts,js}
```

### Action 2: prompt

Analyze API endpoints and extract information.

```
Analyze the API code and extract:

1. **Endpoints**
   - HTTP method (GET, POST, PUT, DELETE, etc.)
   - Path/route
   - Path parameters
   - Query parameters

2. **Request Details**
   - Request body schema
   - Content type
   - Required fields
   - Validation rules

3. **Response Details**
   - Success response schema
   - Error responses
   - Status codes
   - Response examples

4. **Authentication**
   - Auth requirements
   - Required permissions
   - API key/token usage
```

### Action 3: prompt

Generate OpenAPI specification.

```
Generate OpenAPI 3.0 specification with:

1. **Info Section**
   - API title and description
   - Version
   - Contact information

2. **Paths**
   - All endpoints with full details
   - Request/response schemas
   - Examples
   - Security requirements

3. **Components**
   - Reusable schemas
   - Security schemes
   - Response objects

4. **Tags**
   - Logical grouping of endpoints

Format as valid OpenAPI 3.0 YAML.
```

### Action 4: write

Write the OpenAPI specification to file.

```
Write to: openapi.yaml
```

## Requirements

- **context**: api-project - Must have API routes

---

**Category:** documentation
**Priority:** 7
**Tags:** api, documentation, openapi, swagger, automation
**Source:** smart-analysis
