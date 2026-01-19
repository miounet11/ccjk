---
name: documentation-gen
description: Automatic documentation generation for code and APIs
version: 1.0.0
author: CCJK
category: docs
triggers:
  - /docs
  - /doc
  - /document
  - /readme
use_when:
  - "User wants to generate documentation"
  - "Code needs documentation"
  - "User mentions README or docs"
  - "API documentation needed"
auto_activate: true
priority: 6
difficulty: beginner
tags:
  - documentation
  - readme
  - api-docs
  - jsdoc
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - LSP
context: inherit
user-invocable: true
---

# Documentation Generation Skill

## Overview

This skill provides comprehensive documentation generation capabilities for code, APIs, and projects. It helps create clear, maintainable documentation following industry best practices.

## Documentation Types

### 1. README.md Generation

Generate comprehensive project README files with:

- **Project Overview**: Clear description of what the project does
- **Installation Instructions**: Step-by-step setup guide
- **Usage Examples**: Practical code examples
- **API Reference**: Quick reference for main APIs
- **Contributing Guidelines**: How to contribute to the project
- **License Information**: Project licensing details

**Example Structure**:
```markdown
# Project Name

Brief description of the project.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
npm install project-name
\`\`\`

## Usage

\`\`\`javascript
import { feature } from 'project-name';

feature.doSomething();
\`\`\`

## API Reference

### `feature.doSomething(options)`

Description of the method.

**Parameters:**
- `options` (Object): Configuration options

**Returns:** Description of return value

## Contributing

Please read CONTRIBUTING.md for details.

## License

MIT License - see LICENSE file for details.
```

### 2. API Documentation

Generate detailed API documentation including:

- **Endpoint Descriptions**: Clear explanation of each endpoint
- **Request/Response Examples**: Sample requests and responses
- **Parameter Documentation**: All parameters with types and descriptions
- **Error Codes**: Possible error responses
- **Authentication**: Auth requirements and methods

**REST API Example**:
```markdown
## GET /api/users/:id

Retrieve a user by ID.

**Parameters:**
- `id` (string, required): User ID

**Response:**
\`\`\`json
{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com"
}
\`\`\`

**Error Responses:**
- `404 Not Found`: User does not exist
- `401 Unauthorized`: Invalid authentication token
```

### 3. JSDoc/TSDoc Comments

Generate inline code documentation:

**Function Documentation**:
```typescript
/**
 * Calculates the sum of two numbers.
 *
 * @param a - The first number
 * @param b - The second number
 * @returns The sum of a and b
 * @throws {TypeError} If parameters are not numbers
 *
 * @example
 * ```typescript
 * const result = add(5, 3);
 * console.log(result); // 8
 * ```
 */
function add(a: number, b: number): number {
  return a + b;
}
```

**Class Documentation**:
```typescript
/**
 * Represents a user in the system.
 *
 * @class User
 * @implements {IUser}
 *
 * @example
 * ```typescript
 * const user = new User('John', 'john@example.com');
 * user.greet(); // "Hello, I'm John"
 * ```
 */
class User implements IUser {
  /**
   * Creates a new User instance.
   *
   * @param name - The user's name
   * @param email - The user's email address
   */
  constructor(
    public name: string,
    public email: string
  ) {}

  /**
   * Returns a greeting message.
   *
   * @returns A personalized greeting
   */
  greet(): string {
    return `Hello, I'm ${this.name}`;
  }
}
```

### 4. Architecture Documentation

Document system architecture and design:

**Architecture Overview**:
```markdown
# System Architecture

## Overview

High-level description of the system architecture.

## Components

### Frontend
- **Technology**: React + TypeScript
- **State Management**: Redux Toolkit
- **Routing**: React Router

### Backend
- **Technology**: Node.js + Express
- **Database**: PostgreSQL
- **Cache**: Redis

### Infrastructure
- **Hosting**: AWS
- **CI/CD**: GitHub Actions
- **Monitoring**: DataDog

## Data Flow

\`\`\`mermaid
graph LR
    A[Client] --> B[API Gateway]
    B --> C[Backend Service]
    C --> D[Database]
    C --> E[Cache]
\`\`\`

## Security

- JWT-based authentication
- HTTPS encryption
- Rate limiting
- Input validation
```

### 5. CHANGELOG Generation

Generate and maintain changelog files:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature X
- New feature Y

### Changed
- Updated dependency Z to v2.0

### Fixed
- Bug fix for issue #123

## [1.2.0] - 2026-01-10

### Added
- Feature A with comprehensive tests
- Feature B with documentation

### Changed
- Improved performance of module C
- Updated UI components

### Deprecated
- Old API endpoint /v1/users (use /v2/users instead)

### Removed
- Deprecated feature D

### Fixed
- Critical bug in authentication flow
- Memory leak in background service

### Security
- Patched vulnerability CVE-2026-1234

## [1.1.0] - 2025-12-15

...
```

## Documentation Templates

### Project README Template

```markdown
# [Project Name]

[Badges: build status, coverage, version, license]

[Brief one-line description]

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Examples](#examples)
- [Contributing](#contributing)
- [Testing](#testing)
- [Changelog](#changelog)
- [License](#license)

## Features

- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

## Installation

\`\`\`bash
# npm
npm install [package-name]

# yarn
yarn add [package-name]

# pnpm
pnpm add [package-name]
\`\`\`

## Quick Start

\`\`\`javascript
// Quick example to get started
import { feature } from '[package-name]';

const result = feature.doSomething();
console.log(result);
\`\`\`

## Usage

### Basic Usage

[Detailed usage instructions]

### Advanced Usage

[Advanced examples and patterns]

## API Reference

[Comprehensive API documentation]

## Configuration

[Configuration options and examples]

## Examples

[Multiple practical examples]

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Testing

\`\`\`bash
npm test
\`\`\`

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

[License Type] - see [LICENSE](LICENSE) file for details.
```

### API Endpoint Documentation Template

```markdown
## [METHOD] /api/endpoint

[Brief description of what this endpoint does]

### Authentication

[Required/Optional] - [Auth type: Bearer token, API key, etc.]

### Request

**Headers:**
\`\`\`
Content-Type: application/json
Authorization: Bearer {token}
\`\`\`

**Parameters:**
- `param1` (type, required/optional): Description
- `param2` (type, required/optional): Description

**Body:**
\`\`\`json
{
  "field1": "value1",
  "field2": "value2"
}
\`\`\`

### Response

**Success (200 OK):**
\`\`\`json
{
  "status": "success",
  "data": {
    "id": "123",
    "result": "value"
  }
}
\`\`\`

**Error Responses:**

- `400 Bad Request`: Invalid parameters
  \`\`\`json
  {
    "status": "error",
    "message": "Invalid parameter: param1"
  }
  \`\`\`

- `401 Unauthorized`: Authentication failed
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Example

\`\`\`bash
curl -X POST https://api.example.com/api/endpoint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"field1": "value1", "field2": "value2"}'
\`\`\`

### Rate Limiting

- Rate limit: 100 requests per minute
- Rate limit header: `X-RateLimit-Remaining`
```

### Component Documentation Template

```markdown
# ComponentName

[Brief description of the component]

## Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| prop1 | string | - | Yes | Description of prop1 |
| prop2 | number | 0 | No | Description of prop2 |
| onEvent | function | - | No | Callback function |

## Usage

\`\`\`tsx
import { ComponentName } from './ComponentName';

function App() {
  return (
    <ComponentName
      prop1="value"
      prop2={42}
      onEvent={(data) => console.log(data)}
    />
  );
}
\`\`\`

## Examples

### Basic Example

\`\`\`tsx
<ComponentName prop1="basic" />
\`\`\`

### Advanced Example

\`\`\`tsx
<ComponentName
  prop1="advanced"
  prop2={100}
  onEvent={(data) => {
    // Handle event
  }}
/>
\`\`\`

## Styling

[CSS classes, styling options, theming]

## Accessibility

[ARIA attributes, keyboard navigation, screen reader support]

## Browser Support

- Chrome: ✓
- Firefox: ✓
- Safari: ✓
- Edge: ✓
```

### Function Documentation Template

```typescript
/**
 * [Brief one-line description]
 *
 * [Detailed description of what the function does, including any important
 * behavior, side effects, or considerations]
 *
 * @param paramName - Description of the parameter
 * @param options - Configuration options
 * @param options.option1 - Description of option1
 * @param options.option2 - Description of option2
 *
 * @returns Description of the return value
 *
 * @throws {ErrorType} Description of when this error is thrown
 *
 * @example
 * Basic usage:
 * ```typescript
 * const result = functionName('value');
 * console.log(result); // Expected output
 * ```
 *
 * @example
 * Advanced usage with options:
 * ```typescript
 * const result = functionName('value', {
 *   option1: true,
 *   option2: 'custom'
 * });
 * ```
 *
 * @see {@link RelatedFunction} for related functionality
 * @since 1.0.0
 * @deprecated Use {@link NewFunction} instead
 */
```

## Best Practices

### 1. Clear and Concise Writing

- **Use Simple Language**: Avoid jargon unless necessary
- **Be Specific**: Provide concrete examples rather than abstract descriptions
- **Stay Focused**: Each section should have a single, clear purpose
- **Use Active Voice**: "The function returns" instead of "The value is returned"

### 2. Code Examples

- **Provide Working Examples**: All code examples should be runnable
- **Show Common Use Cases**: Cover the most frequent scenarios
- **Include Edge Cases**: Document unusual but important cases
- **Use Realistic Data**: Examples should reflect real-world usage

**Good Example**:
```typescript
// Good: Realistic, complete example
const user = await fetchUser('user-123');
if (user) {
  console.log(`Welcome, ${user.name}!`);
}
```

**Bad Example**:
```typescript
// Bad: Abstract, incomplete example
const x = func(y);
```

### 3. Usage Instructions

- **Step-by-Step**: Break complex processes into clear steps
- **Prerequisites**: List requirements before instructions
- **Expected Outcomes**: Describe what should happen
- **Troubleshooting**: Include common issues and solutions

**Example**:
```markdown
## Installation

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher

### Steps

1. Install the package:
   \`\`\`bash
   npm install package-name
   \`\`\`

2. Import in your code:
   \`\`\`typescript
   import { feature } from 'package-name';
   \`\`\`

3. Configure (optional):
   \`\`\`typescript
   feature.configure({ option: 'value' });
   \`\`\`

### Verification

Run the following to verify installation:
\`\`\`bash
npm list package-name
\`\`\`

### Troubleshooting

**Issue**: Installation fails with EACCES error
**Solution**: Run with sudo or fix npm permissions
```

### 4. Keep Documentation Updated

- **Version Documentation**: Tag docs with version numbers
- **Update with Code Changes**: Update docs when code changes
- **Review Regularly**: Periodic documentation audits
- **Deprecation Notices**: Clearly mark deprecated features

### 5. Structure and Organization

- **Logical Flow**: Organize from simple to complex
- **Table of Contents**: For longer documents
- **Cross-References**: Link related sections
- **Consistent Formatting**: Use consistent markdown style

### 6. Accessibility

- **Alt Text for Images**: Describe diagrams and screenshots
- **Semantic Headings**: Use proper heading hierarchy
- **Code Block Labels**: Specify language for syntax highlighting
- **Link Text**: Use descriptive link text, not "click here"

## Output Formats

### 1. Markdown

Primary format for most documentation:

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
`inline code`

- Bullet list
- Item 2

1. Numbered list
2. Item 2

[Link text](https://example.com)

![Image alt text](image.png)

\`\`\`language
code block
\`\`\`

> Blockquote

| Table | Header |
|-------|--------|
| Cell  | Cell   |
```

### 2. HTML (via tools)

For web-based documentation:

```html
<!DOCTYPE html>
<html>
<head>
  <title>API Documentation</title>
  <style>
    /* Documentation styles */
  </style>
</head>
<body>
  <nav><!-- Navigation --></nav>
  <main>
    <article>
      <!-- Documentation content -->
    </article>
  </main>
</body>
</html>
```

### 3. JSDoc Comments

For inline code documentation:

```typescript
/**
 * @module ModuleName
 * @description Module description
 */

/**
 * @typedef {Object} TypeName
 * @property {string} prop1 - Description
 * @property {number} prop2 - Description
 */

/**
 * @function functionName
 * @description Function description
 * @param {string} param - Parameter description
 * @returns {Promise<Result>} Return description
 */
```

## Workflow

### 1. Analyze Code

- Read source files to understand functionality
- Identify public APIs and interfaces
- Note important patterns and conventions
- Check for existing documentation

### 2. Generate Documentation

- Create appropriate documentation type
- Follow templates and best practices
- Include comprehensive examples
- Add cross-references

### 3. Review and Refine

- Verify accuracy of technical details
- Test all code examples
- Check for clarity and completeness
- Ensure consistent formatting

### 4. Integrate

- Place documentation in appropriate location
- Update table of contents and indexes
- Add to version control
- Notify team of updates

## Tips for Success

1. **Start with Why**: Explain the purpose before the details
2. **Show, Don't Just Tell**: Use examples liberally
3. **Think Like a User**: Write for your audience's knowledge level
4. **Be Consistent**: Use consistent terminology and formatting
5. **Keep It Current**: Documentation should match the code
6. **Make It Searchable**: Use clear headings and keywords
7. **Test Your Examples**: All code examples should work
8. **Get Feedback**: Have others review your documentation

## Common Pitfalls to Avoid

- **Assuming Knowledge**: Don't assume readers know context
- **Incomplete Examples**: Provide full, working examples
- **Outdated Information**: Keep docs in sync with code
- **Poor Organization**: Structure information logically
- **Missing Error Cases**: Document error handling
- **No Visual Aids**: Use diagrams where helpful
- **Inconsistent Style**: Maintain consistent formatting

## Resources

- [Markdown Guide](https://www.markdownguide.org/)
- [JSDoc Documentation](https://jsdoc.app/)
- [TypeDoc](https://typedoc.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [Write the Docs](https://www.writethedocs.org/)
