# Hook Enforcement Tutorial | Hook 强制执行教程

Learn how to use CCJK's Hook Enforcement System to automatically enforce coding standards, best practices, and team conventions at three enforcement levels.

## 🎯 What You'll Learn

- Understanding enforcement levels (L1, L2, L3)
- Creating custom hooks
- Using built-in hooks
- Testing and debugging hooks
- Best practices for hook design

## 📚 Prerequisites

- CCJK v2.0 installed ([Installation Guide](../installation.md))
- Basic TypeScript knowledge
- Understanding of Git hooks (preferred)

## 🔍 Understanding Enforcement Levels

CCJK provides four enforcement levels:

### L0: Awareness
- **Purpose**: Informational suggestions
- **Behavior**: Shows suggestions, doesn't block anything
- **Use Case**: Style recommendations, best practices

```typescript
{
  level: EnforcementLevel.L0_AWARENESS,
  // Hook will show suggestions but not block
}
```

### L1: Recommended
- **Purpose**: Recommended practices
- **Behavior**: Warns but allows override with confirmation
- **Use Case**: Security warnings, performance suggestions

```typescript
{
  level: EnforcementLevel.L1_RECOMMENDED,
  // Hook shows warning but can be skipped
}
```

### L2: Strongly Recommended
- **Purpose**: Strongly recommended practices
- **Behavior**: Warns heavily, requires explicit confirmation to skip
- **Use Case**: Critical security issues, major code quality problems

```typescript
{
  level: EnforcementLevel.L2_STRONGLY_RECOMMENDED,
  // Hook strongly warns and requires confirmation
}
```

### L3: Mandatory
- **Purpose**: Non-negotiable requirements
- **Behavior**: Completely blocks if failed
- **Use Case**: Legal compliance, security requirements

```typescript
{
  level: EnforcementLevel.L3_MANDATORY,
  // Hook blocks until fixed
}
```

## 🚀 Creating Your First Hook

Let's create a hook that enforces commit message conventions.

### Step 1: Create Hook File

Create `.ccjk/hooks/commit-message.hook.ts`:

```typescript
import { HookEnforcer, EnforcementLevel } from '@ccjk/v2/hooks';

export default {
  id: 'commit-message',
  name: 'Commit Message Convention',
  description: 'Enforces conventional commit format',
  level: EnforcementLevel.L1_RECOMMENDED,

  matcher: {
    event: 'commit-msg',
    // Only trigger on commit message
  },

  async enforce(context) {
    const commitMessageFile = context.git.commitMessageFile;
    const commitMessage = await context.utils.readFile(commitMessageFile);

    // Conventional commit pattern
    const pattern = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{1,50}$/;

    if (!pattern.test(commitMessage)) {
      return {
        passed: false,
        message: `Commit message doesn't follow conventional format`,
        details: `
Expected format: type(scope): description
Types: feat, fix, docs, style, refactor, test, chore
Example: feat(auth): add login endpoint
        `.trim(),
        fix: {
          description: 'Show commit format guide',
          apply: async () => {
            console.log('📋 Commit Message Format:');
            console.log('type(scope): description');
            console.log('');
            console.log('Types:');
            console.log('  feat: New feature');
            console.log('  fix: Bug fix');
            console.log('  docs: Documentation');
            console.log('  style: Code style changes');
            console.log('  refactor: Code refactoring');
            console.log('  test: Test changes');
            console.log('  chore: Maintenance');
          }
        }
      };
    }

    return { passed: true };
  }
};
```

### Step 2: Register the Hook

```bash
# Register the hook
ccjk hooks register commit-message

# Test it
ccjk hooks test commit-message
```

### Step 3: Test with Git

```bash
# Try a bad commit message
echo "bad message" > temp.txt
git add temp.txt
git commit -m "bad message"

# Hook will trigger and warn
# Try again with proper format
git commit -m "feat: add temp file for testing"
```

## 🛠️ Advanced Hook Example

Let's create a more complex hook that checks for security vulnerabilities.

Create `.ccjk/hooks/security-vulnerabilities.hook.ts`:

```typescript
import { HookEnforcer, EnforcementLevel } from '@ccjk/v2/hooks';

export default {
  id: 'security-vulnerabilities',
  name: 'Security Vulnerability Check',
  description: 'Scans for common security vulnerabilities',
  level: EnforcementLevel.L3_MANDATORY,

  matcher: {
    event: 'pre-commit',
    files: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java'],
    exclude: ['node_modules/**', 'test/**']
  },

  async enforce(context) {
    const vulnerabilities = [];
    const files = context.files.changed;

    for (const file of files) {
      const content = await context.utils.readFile(file);

      // Check for SQL injection
      if (content.includes('SELECT * FROM') && content.includes('+')) {
        vulnerabilities.push({
          file,
          line: this.findLine(content, 'SELECT * FROM'),
          type: 'SQL_INJECTION',
          severity: 'high',
          description: 'Potential SQL injection vulnerability'
        });
      }

      // Check for hardcoded secrets
      if (content.match(/(password|secret|key)\s*=\s*["'][^"']+["']/i)) {
        vulnerabilities.push({
          file,
          line: this.findLine(content, /(password|secret|key)\s*=/i),
          type: 'HARDCODED_SECRET',
          severity: 'critical',
          description: 'Hardcoded secret detected'
        });
      }

      // Check for XSS
      if (content.includes('innerHTML') && content.includes('user')) {
        vulnerabilities.push({
          file,
          line: this.findLine(content, 'innerHTML'),
          type: 'XSS',
          severity: 'high',
          description: 'Potential XSS vulnerability'
        });
      }
    }

    if (vulnerabilities.length > 0) {
      return {
        passed: false,
        message: `Found ${vulnerabilities.length} security vulnerabilities`,
        details: vulnerabilities.map(v =>
          `  ${v.severity.toUpperCase()}: ${v.type} in ${v.file}:${v.line}`
        ).join('\n'),
        fix: {
          description: 'View detailed security report',
          apply: async () => {
            console.log('🔒 Security Vulnerabilities Found:');
            vulnerabilities.forEach(v => {
              console.log(`\n${v.severity.toUpperCase()}: ${v.type}`);
              console.log(`  File: ${v.file}:${v.line}`);
              console.log(`  Description: ${v.description}`);
              console.log(`  Fix: ${this.getFixSuggestion(v.type)}`);
            });
          }
        }
      };
    }

    return { passed: true };
  },

  findLine(content: string, pattern: string | RegExp): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(pattern)) {
        return i + 1;
      }
    }
    return 0;
  },

  getFixSuggestion(type: string): string {
    const suggestions = {
      SQL_INJECTION: 'Use parameterized queries or ORM',
      HARDCODED_SECRET: 'Use environment variables or secret management',
      XSS: 'Sanitize user input before rendering'
    };
    return suggestions[type] || 'Review security best practices';
  }
};
```

## 🔧 Built-in Hooks

CCJK comes with several built-in hooks:

### Code Quality Hooks

```bash
# Enable built-in hooks
ccjk hooks enable builtin/code-quality
ccjk hooks enable builtin/security-scan
ccjk hooks enable builtin/dependency-check
```

### Available Built-in Hooks

| Hook ID | Description | Level |
|---------|-------------|-------|
| `builtin/code-quality` | ESLint, Prettier checks | L2 |
| `builtin/security-scan` | Basic security scanning | L3 |
| `builtin/dependency-check` | Check for vulnerable dependencies | L2 |
| `builtin/git-guard` | Git best practices | L1 |
| `builtin/license-check` | License compliance | L2 |

## 🧪 Testing Hooks

### Unit Testing

Create `.ccjk/hooks/__tests__/commit-message.test.ts`:

```typescript
import { testHook } from '@ccjk/v2/testing';
import commitMessageHook from '../commit-message.hook';

describe('commit-message hook', () => {
  it('should accept valid commit messages', async () => {
    const result = await testHook(commitMessageHook, {
      git: {
        commitMessageFile: 'temp/commit-msg'
      },
      utils: {
        readFile: async () => 'feat(auth): add login endpoint'
      }
    });

    expect(result.passed).toBe(true);
  });

  it('should reject invalid commit messages', async () => {
    const result = await testHook(commitMessageHook, {
      git: {
        commitMessageFile: 'temp/commit-msg'
      },
      utils: {
        readFile: async () => 'bad message'
      }
    });

    expect(result.passed).toBe(false);
    expect(result.message).toContain('conventional format');
  });
});
```

### Manual Testing

```bash
# Test specific hook
ccjk hooks test commit-message

# Test with specific files
ccjk hooks test security-vulnerabilities --files src/auth.ts

# Run all hooks
ccjk hooks run

# Dry run (no actual enforcement)
ccjk hooks run --dry-run
```

## 📊 Hook Statistics

View hook performance and usage:

```bash
# Show statistics
ccjk hooks stats

# Show detailed logs
ccjk hooks logs --tail=100

# Export metrics
ccjk hooks export --format=json --output=hooks-metrics.json
```

## 🎨 Best Practices

### 1. Choose Appropriate Enforcement Level

```typescript
// Good: L1 for style issues
{
  id: 'code-style',
  level: EnforcementLevel.L1_RECOMMENDED,
  // Style issues shouldn't block commits
}

// Good: L3 for security
{
  id: 'security-check',
  level: EnforcementLevel.L3_MANDATORY,
  // Security issues must be fixed
}
```

### 2. Provide Clear Error Messages

```typescript
// Good
return {
  passed: false,
  message: 'TypeScript strict mode must be enabled',
  details: 'Add "strict": true to compilerOptions in tsconfig.json',
  fix: {
    description: 'Enable strict mode automatically',
    apply: async () => { /* fix code */ }
  }
};

// Avoid
return {
  passed: false,
  message: 'Failed' // Too vague
};
```

### 3. Use Appropriate Matchers

```typescript
// Good: Specific file patterns
matcher: {
  event: 'pre-commit',
  files: ['**/*.ts', '**/*.tsx'],
  exclude: ['node_modules/**', 'dist/**', '*.d.ts']
}

// Avoid: Too broad
matcher: {
  event: 'pre-commit',
  files: ['**/*'] // Will run on every file
}
```

### 4. Handle Errors Gracefully

```typescript
async enforce(context) {
  try {
    // Your logic
  } catch (error) {
    return {
      passed: false,
      message: 'Hook execution failed',
      details: error.message,
      // Don't crash the hook system
    };
  }
}
```

### 5. Keep Hooks Fast

```typescript
// Good: Check only changed files
async enforce(context) {
  const files = context.files.changed;
  // Only process changed files
}

// Avoid: Reading entire codebase
async enforce(context) {
  const allFiles = await context.utils.glob('**/*.ts');
  // Too slow for large projects
}
```

## 🔍 Debugging Hooks

### Enable Debug Mode

```bash
# Enable debug logging
export DEBUG=ccjk:hooks:*
ccjk hooks test commit-message
```

### Step-by-Step Debugging

```typescript
// Add debug logging
async enforce(context) {
  console.log('Hook triggered:', context.event);
  console.log('Files:', context.files);

  // Your logic with logging
}
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Hook not triggered | Check matcher configuration |
| Hook too slow | Reduce file scope, optimize logic |
| Hook fails silently | Add try-catch with logging |
| Hook blocks everything | Check enforcement level |

## 🎯 Practice Exercises

### Exercise 1: Package.json Validation
Create a hook that:
- Validates package.json structure
- Checks for required fields (name, version, description)
- Ensures no sensitive data (passwords, secrets)

### Exercise 2: API Documentation
Create a hook that:
- Checks if new API endpoints have documentation
- Validates OpenAPI spec format
- Ensures examples are provided

### Exercise 3: Performance Budget
Create a hook that:
- Checks bundle size on build
- Warns if size exceeds threshold
- Suggests optimization strategies

## 📚 Next Steps

- Learn about [Traceability Framework](./traceability.md)
- Explore [Skills DSL](./skills-dsl.md)
- Build [Agent Networks](./agents-network.md)
- Read [Best Practices](../best-practices.md)

## 🆘 Troubleshooting

### Hook Not Running
1. Check if hooks are enabled: `ccjk config show hooks`
2. Verify hook file location: `ls .ccjk/hooks/`
3. Check matcher configuration
4. Ensure hook is registered: `ccjk hooks list`

### Hook Too Slow
1. Reduce file patterns in matcher
2. Use `context.files.changed` instead of full scan
3. Add timeout configuration
4. Consider splitting into multiple hooks

### Hook Blocking Development
1. Temporarily disable: `ccjk hooks disable hook-id`
2. Lower enforcement level
3. Use `--no-verify` flag (not recommended)
4. Fix the underlying issue

Ready to learn about [Traceability](./traceability.md)? 🚀
