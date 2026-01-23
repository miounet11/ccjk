# Traceability Framework Tutorial | 追溯框架教程

Learn how to use CCJK's Traceability Framework to track code changes, maintain development history, and ensure full traceability from requirements to deployment.

## 🎯 What You'll Learn

- Understanding traceability levels
- Creating and managing traces
- Linking traces to commits
- Decision documentation
- Multi-level traceability

## 📚 Prerequisites

- CCJK v2.0 installed ([Installation Guide](../installation.md))
- Git knowledge (branching, commits)
- Basic command line skills

## 🔄 Understanding Traceability

### What is Traceability?

Traceability is the ability to track every code change from inception through deployment:

```
Requirement → Design → Implementation → Testing → Deployment
     ↓           ↓            ↓              ↓           ↓
   Trace ID    Trace ID    Trace ID      Trace ID    Trace ID
```

### Traceability Levels

| Level | Description | Data Captured |
|-------|-------------|---------------|
| **minimal** | Basic traceability | Trace ID only |
| **basic** | Commit linkage | Trace ID + commit links |
| **standard** | Metadata included | Basic + author, timestamp, branch |
| **full** | Complete trace | All data + decisions, reasoning |

## 🚀 Creating Your First Trace

### Step 1: Initialize a Trace

```bash
# Create a new trace
c cjk trace create \
  --id "user-auth" \
  --title "User Authentication System" \
  --description "Implement secure user authentication with JWT"
```

Expected output:
```
✓ Trace created: user-auth
  Title: User Authentication System
  ID: user-auth
  Created: 2026-01-23 10:30:45
  Status: active
```

### Step 2: Set Trace as Active

```bash
# Set as current trace
c cjk trace set user-auth

# Verify active trace
c cjk trace current
```

### Step 3: Work on the Feature

All commits will now include the trace ID:

```bash
# Make changes
echo "export function login() {}" > src/auth.ts
git add src/auth.ts
git commit -m "Add login function"
```

The commit is automatically enhanced:
```
Add login function

[Trace: user-auth]
[Author: developer]
[Date: 2026-01-23 10:35:12]
```

### Step 4: View Trace History

```bash
# Show trace details
c cjk trace show user-auth

# Show all commits in trace
c cjk trace commits user-auth

# Show trace summary
c cjk trace summary --format=tree
```

## 📊 Trace Data Model

### Trace Structure

```typescript
interface Trace {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'archived';

  // Metadata
  created: Date;
  updated: Date;
  author: string;
  branch: string;

  // Linked data
  commits: CommitLink[];
  decisions: Decision[];
  requirements: Requirement[];

  // Relationships
  parentTrace?: string;
  childTraces: string[];
  relatedTraces: string[];
}

interface CommitLink {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  branch: string;
  tags: string[];
}

interface Decision {
  id: string;
  timestamp: Date;
  author: string;
  context: string;
  reasoning: string;
  alternatives: string[];
}
}
```

## 🎯 Advanced Traceability

### Multi-Level Traceability

Organize traces hierarchically:

```bash
# Create parent trace
c cjk trace create \
  --id "payment-system" \
  --title "Payment Processing System"

# Create child traces
c cjk trace create \
  --id "payment-api" \
  --title "Payment API" \
  --parent "payment-system"

c cjk trace create \
  --id "payment-ui" \
  --title "Payment UI" \
  --parent "payment-system"

# View trace hierarchy
c cjk trace tree payment-system
```

Output:
```
payment-system (Payment Processing System)
├── payment-api (Payment API)
│   ├── [add-payment-endpoint]
│   ├── [add-refund-endpoint]
│   └── [add-validation]
└── payment-ui (Payment UI)
    ├── [create-payment-form]
    ├── [add-loading-states]
    └── [error-handling]
```

### Decision Documentation

Document decisions within traces:

```bash
# Add a decision to trace
c cjk trace decision add \
  --trace "user-auth" \
  --title "Use JWT for authentication" \
  --reasoning "JWT provides stateless authentication and scales well" \
  --alternatives "Session-based auth" "OAuth 2.0" "API keys"
```

View decisions:
```bash
# Show all decisions
c cjk trace decision list user-auth

# Show specific decision
c cjk trace decision show user-auth --id "jwt-choice"
```

### Requirement Linking

Link traces to requirements:

```bash
# Link requirement to trace
c cjk trace requirement add \
  --trace "user-auth" \
  --id "REQ-001" \
  --title "Users must authenticate before access" \
  --priority "high"
```

## 🔗 Git Integration

### Automatic Trace Injection

CCJK automatically injects trace information into commit messages:

```bash
# Before (your commit message)
git commit -m "Add login endpoint"

# After (automatic enhancement)
Add login endpoint

[Trace: user-auth]
[Author: developer]
[Date: 2026-01-23 10:35:12]
```

### Branch-Based Traces

Create separate traces per branch:

```bash
# Create feature branch
git checkout -b feature/user-auth

# Trace automatically switches to branch-specific trace
c cjk trace create --auto-branch
# Creates trace: feature-user-auth
```

### Trace Migration

Merge traces when merging branches:

```bash
# Merge branches
git checkout main
git merge feature/user-auth

# Merge traces
c cjk trace merge feature-user-auth --into main-auth
```

## 📈 Traceability Workflows

### Workflow 1: Feature Development

```bash
# 1. Create trace for feature
c cjk trace create \
  --id "new-feature" \
  --title "Feature Name" \
  --description "Feature description"

# 2. Set as active
c cjk trace set new-feature

# 3. Develop and commit (trace auto-included)
git commit -m "Implement feature"

# 4. Add decisions
c cjk trace decision add --trace new-feature ...

# 5. Complete trace
c cjk trace complete new-feature
```

### Workflow 2: Bug Fix

```bash
# 1. Create trace for bug
c cjk trace create \
  --id "bug-123" \
  --title "Fix authentication bug" \
  --type "bugfix" \
  --bug-id "JIRA-123"

# 2. Link to issue tracker
c cjk trace link \
  --id "bug-123" \
  --url "https://jira.example.com/browse/JIRA-123"

# 3. Fix and commit
git commit -m "Fix authentication error"

# 4. Mark as resolved
c cjk trace resolve bug-123
```

### Workflow 3: Hotfix

```bash
# 1. Create hotfix trace
c cjk trace create \
  --id "hotfix-001" \
  --title "Critical security fix" \
  --priority "critical" \
  --type "hotfix"

# 2. Apply fix (auto-tracked)
git commit -m "Fix security vulnerability"

# 3. Deploy immediately (trace included)
c cjk trace deploy hotfix-001 --environment production
```

## 🔍 Query and Analysis

### Search Traces

```bash
# Search by title
c cjk trace search --title "authentication"

# Search by date range
c cjk trace list --from 2026-01-01 --to 2026-01-31

# Search by status
c cjk trace list --status completed

# Search by author
c cjk trace list --author developer
```

### Analyze Trace Data

```bash
# Show statistics
c cjk trace stats

# Show time distribution
c cjk trace timeline --format=chart

# Show trace velocity
c cjk trace velocity --period=week
```

### Export Trace Data

```bash
# Export as JSON
c cjk trace export --id user-auth --format=json --output trace.json

# Export as Markdown report
c cjk trace export --id user-auth --format=markdown --output report.md

# Export all traces
c cjk trace export-all --format=csv --output traces.csv
```

## 🎨 Best Practices

### 1. Consistent Trace IDs

```bash
# Good: Descriptive and consistent
c cjk trace create --id "user-auth-v2" --title "User Authentication V2"

# Avoid: Too generic
c cjk trace create --id "feature" --title "Feature"
```

### 2. Complete Documentation

```bash
# Always add description
c cjk trace create \
  --id "payment-api" \
  --title "Payment API" \
  --description "Implement REST API for payment processing with Stripe integration"

# Document decisions
c cjk trace decision add \
  --trace "payment-api" \
  --title "Use Stripe for payments" \
  --reasoning "Market leader, good documentation, excellent support"
```

### 3. Regular Updates

```bash
# Update trace status
c cjk trace update user-auth --status in-progress

# Add notes
c cjk trace note add \
  --trace user-auth \
  "Discovered performance issue with token refresh"
```

### 4. Use Trace Relationships

```bash
# Link related traces
c cjk trace link \
  --id "user-auth" \
  --related "password-reset" "mfa-setup"
```

### 5. Archive Completed Traces

```bash
# Mark trace as completed
c cjk trace complete user-auth

# Archive old traces
c cjk trace archive --before 2025-12-31

# Keep only recent traces active
c cjk trace list --status active
```

## 🧪 Testing Traceability

### Test Trace Creation

```typescript
import { TraceManager } from '@ccjk/v2/traceability';

describe('Trace Manager', () => {
  it('should create trace with metadata', async () => {
    const trace = await TraceManager.create({
      id: 'test-trace',
      title: 'Test Trace',
      description: 'Test description'
    });

    expect(trace.id).toBe('test-trace');
    expect(trace.status).toBe('active');
  });
});
```

### Test Commit Linkage

```bash
# Test trace injection
git commit -m "Test commit" --dry-run

# Check if trace ID is included
git log -1 | grep "Trace:"
```

## 🔍 Debugging

### Enable Debug Logging

```bash
# Enable traceability debug logs
export DEBUG=ccjk:traceability:*
c cjk trace create --id test --title "Test"
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Trace ID not in commit | Check Git hooks are installed |
| Duplicate trace IDs | Use unique IDs per trace |
| Lost trace history | Use `ccjk trace recover` |
| Trace too large | Split into child traces |

## 🎯 Practice Exercises

### Exercise 1: Feature Lifecycle
Create complete trace for a feature:
1. Create trace for new API endpoint
2. Document design decisions
3. Link commits to trace
4. Add requirements
5. Mark as completed

### Exercise 2: Multi-Trace Project
Organize a project with multiple traces:
1. Create parent trace for project
2. Create child traces for features
3. Link related traces
4. Export trace hierarchy

### Exercise 3: Bug Fix Workflow
Create bug fix trace:
1. Create trace with bug report link
2. Document root cause analysis
3. Track fix commits
4. Verify fix with linked tests

## 📚 Next Steps

- Learn about [Skills DSL](./skills-dsl.md)
- Explore [Agent Networks](./agents-network.md)
- Read [Best Practices](../best-practices.md)
- Check [API Reference](../api-reference/README.md)

## 🆘 Troubleshooting

### Trace Not Appearing in Commits
1. Check Git hooks: `ls .git/hooks/ccjk-*`
2. Verify trace is active: `ccjk trace current`
3. Check configuration: `ccjk config show traceability`

### Lost Trace History
1. Use recovery: `ccjk trace recover --id trace-id`
2. Check backup: `ls .ccjk/traces/backup/`
3. Restore from export: `ccjk trace import trace.json`

Ready to learn about [Skills DSL](./skills-dsl.md)? 🚀
