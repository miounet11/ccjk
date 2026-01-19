# Contributing to CCJK

Thank you for your interest in contributing to the Code Tools Abstraction Layer!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/ccjk.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`

## Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Build the project
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
src/
├── code-tools/
│   ├── core/           # Core abstractions
│   ├── adapters/       # Tool adapters
│   └── index.ts        # Main entry point
examples/               # Usage examples
docs/                   # Documentation
```

## Adding a New Tool

To add a new tool adapter:

1. Create adapter file in `src/code-tools/adapters/`:

```typescript
// src/code-tools/adapters/my-tool.ts
import { BaseCodeTool } from '../core/base-tool';
import { ToolMetadata } from '../core/types';

export class MyTool extends BaseCodeTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'my-tool',
      displayName: 'My Tool',
      description: 'Description of my tool',
      version: '1.0.0',
      homepage: 'https://my-tool.com',
      documentation: 'https://my-tool.com/docs',
      capabilities: {
        supportsChat: true,
        supportsFileEdit: false,
        supportsCodeGen: true,
        supportsReview: false,
        supportsTesting: false,
        supportsDebugging: false,
      },
    };
  }

  protected getInstallCheckCommand(): string {
    return 'my-tool --version';
  }

  protected getInstallCommand(): string {
    return 'npm install -g my-tool';
  }

  protected getUninstallCommand(): string {
    return 'npm uninstall -g my-tool';
  }
}
```

2. Register in `src/code-tools/index.ts`:

```typescript
import { MyTool } from './adapters/my-tool';
registry.registerToolClass('my-tool', MyTool);
```

3. Export from `src/code-tools/adapters/index.ts`:

```typescript
export * from './my-tool';
```

4. Add tests in `src/code-tools/adapters/__tests__/`:

```typescript
import { MyTool } from '../my-tool';

describe('MyTool', () => {
  it('should have correct metadata', () => {
    const tool = new MyTool();
    const metadata = tool.getMetadata();
    expect(metadata.name).toBe('my-tool');
  });
});
```

## Testing Guidelines

- Write tests for all new features
- Maintain 80%+ code coverage
- Use descriptive test names
- Test both success and error cases

```typescript
describe('MyFeature', () => {
  it('should do something successfully', async () => {
    // Arrange
    const tool = createTool('my-tool');

    // Act
    const result = await tool.doSomething();

    // Assert
    expect(result.success).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Test error cases
  });
});
```

## Code Style

- Use TypeScript
- Follow existing code style
- Run `npm run format` before committing
- Run `npm run lint` to check for issues

## Commit Messages

Follow conventional commits:

```
feat: add new tool adapter for XYZ
fix: resolve configuration loading issue
docs: update README with new examples
test: add tests for tool registry
refactor: simplify base tool implementation
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass: `npm test`
4. Update CHANGELOG.md
5. Submit PR with clear description

## Code Review

All PRs require:
- Passing tests
- Code review approval
- No merge conflicts
- Updated documentation

## Questions?

Open an issue or discussion on GitHub.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
