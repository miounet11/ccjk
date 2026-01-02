# API Design Best Practices Template

## RESTful API Design

### Resource Naming Conventions

```
✅ Good:
GET    /users                 # List users
GET    /users/{id}            # Get specific user
POST   /users                 # Create user
PUT    /users/{id}            # Replace user
PATCH  /users/{id}            # Update user
DELETE /users/{id}            # Delete user

GET    /users/{id}/orders     # User's orders
GET    /orders/{id}/items     # Order's items

❌ Bad:
GET    /getUsers
GET    /user/fetch/{id}
POST   /createUser
GET    /users/{id}/getOrders
```

### Query Parameters

```
# Pagination
GET /users?page=2&limit=20

# Filtering
GET /users?status=active&role=admin

# Sorting
GET /users?sort=created_at:desc,name:asc

# Field selection
GET /users?fields=id,name,email

# Search
GET /users?search=john

# Combined
GET /users?status=active&sort=name:asc&page=1&limit=10
```

### Response Format

```typescript
// Success Response
interface SuccessResponse<T> {
  success: true
  data: T
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

// Error Response
interface ErrorResponse {
  success: false
  error: {
    code: string           // Machine-readable code
    message: string        // Human-readable message
    details?: Array<{
      field?: string
      message: string
    }>
  }
}
```

### Example Responses

```json
// GET /users - Success
{
  "success": true,
  "data": [
    { "id": "1", "name": "John", "email": "john@example.com" }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}

// POST /users - Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ]
  }
}
```

## HTTP Status Codes

```
2xx Success:
  200 OK              - GET, PUT, PATCH success
  201 Created         - POST success
  204 No Content      - DELETE success

4xx Client Error:
  400 Bad Request     - Invalid syntax
  401 Unauthorized    - No/invalid authentication
  403 Forbidden       - Authenticated but not authorized
  404 Not Found       - Resource doesn't exist
  409 Conflict        - Resource conflict (duplicate)
  422 Unprocessable   - Validation error
  429 Too Many        - Rate limit exceeded

5xx Server Error:
  500 Internal Error  - Server failure
  502 Bad Gateway     - Upstream failure
  503 Unavailable     - Service overloaded
  504 Gateway Timeout - Upstream timeout
```

## Authentication

### JWT Token Structure

```typescript
// Access Token (short-lived: 15min)
interface AccessToken {
  sub: string        // User ID
  email: string
  role: string
  iat: number        // Issued at
  exp: number        // Expiration
}

// Refresh Token (long-lived: 7 days)
interface RefreshToken {
  sub: string
  jti: string        // Token ID (for revocation)
  iat: number
  exp: number
}
```

### Auth Flow

```
1. Login
POST /auth/login
{ "email": "...", "password": "..." }
→ { "accessToken": "...", "refreshToken": "..." }

2. Access Protected Resource
GET /users
Authorization: Bearer <accessToken>

3. Refresh Token
POST /auth/refresh
{ "refreshToken": "..." }
→ { "accessToken": "...", "refreshToken": "..." }

4. Logout
POST /auth/logout
{ "refreshToken": "..." }
```

## Rate Limiting

```typescript
// Response Headers
{
  'X-RateLimit-Limit': '100',        // Max requests per window
  'X-RateLimit-Remaining': '95',     // Remaining requests
  'X-RateLimit-Reset': '1640000000', // Window reset timestamp
  'Retry-After': '60'                // Seconds until retry (on 429)
}
```

## Versioning

```
# URL Path (Recommended)
/api/v1/users
/api/v2/users

# Header
Accept: application/vnd.api+json;version=1

# Query Parameter
/api/users?version=1
```

## OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: My API
  version: 1.0.0
  description: API for managing resources

servers:
  - url: https://api.example.com/v1

paths:
  /users:
    get:
      summary: List users
      tags: [Users]
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'

    post:
      summary: Create user
      tags: [Users]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUser'
      responses:
        '201':
          description: Created
        '422':
          description: Validation error

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
          format: email
      required: [id, name, email]

    CreateUser:
      type: object
      properties:
        name:
          type: string
          minLength: 1
        email:
          type: string
          format: email
        password:
          type: string
          minLength: 8
      required: [name, email, password]
```

## Best Practices Checklist

- [ ] Use nouns for resources, not verbs
- [ ] Use plural nouns (/users not /user)
- [ ] Use proper HTTP methods
- [ ] Return appropriate status codes
- [ ] Implement pagination for lists
- [ ] Support filtering and sorting
- [ ] Use consistent error format
- [ ] Implement rate limiting
- [ ] Version your API
- [ ] Document with OpenAPI
