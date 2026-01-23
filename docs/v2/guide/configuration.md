# Configuration Guide | 配置指南

Complete guide to configuring CCJK v2.0 for your project needs.

## 📋 Table of Contents

- [Configuration File](#configuration-file)
- [Project Settings](#project-settings)
- [Hooks Configuration](#hooks-configuration)
- [Skills Configuration](#skills-configuration)
- [Agents Configuration](#agents-configuration)
- [Traceability Configuration](#traceability-configuration)
- [Environment Variables](#environment-variables)
- [Advanced Options](#advanced-options)

## 📄 Configuration File

The main configuration file is `ccjk.config.json` in your project root. Here's the complete structure:

```json
{
  "$schema": "https://ccjk.dev/schema/v2.0.0/config.json",
  "version": "2.0.0",
  "project": {
    "name": "your-project",
    "root": ".",
    "description": "Project description"
  },
  "hooks": {
    "enabled": true,
    "directory": ".ccjk/hooks",
    "enforcementLevel": "L2_STRONGLY_RECOMMENDED",
    "timeout": 30000,
    "parallel": true
  },
  "skills": {
    "enabled": true,
    "directory": ".ccjk/skills",
    "cache": {
      "enabled": true,
      "maxSize": 100,
      "ttl": 3600000
    }
  },
  "agents": {
    "enabled": true,
    "redis": {
      "host": "localhost",
      "port": 6379,
      "db": 0,
      "password": null,
      "tls": false
    },
    "maxConcurrent": 10
  },
  "traceability": {
    "enabled": true,
    "level": "full",
    "autoTrace": true,
    "gitIntegration": true,
    "storage": ".ccjk/traces"
  },
  "logging": {
    "level": "info",
    "file": ".ccjk/logs/ccjk.log",
    "maxSize": "10m",
    "maxFiles": 5
  }
}
```

## 🏗️ Project Settings

Configure project-specific settings.

```json
{
  "project": {
    "name": "your-project",
    "root": ".",
    "description": "Project description",
    "version": "1.0.0",
    "tags": ["typescript", "api", "backend"],
    "metadata": {
      "author": "Your Name",
      "license": "MIT",
      "repository": "https://github.com/user/repo"
    }
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name |
| `root` | string | Yes | Project root directory (relative to config) |
| `description` | string | No | Project description |
| `version` | string | No | Project version |
| `tags` | string[] | No | Project tags |
| `metadata` | object | No | Additional metadata |

## 🪝 Hooks Configuration

Configure the hook enforcement system.

```json
{
  "hooks": {
    "enabled": true,
    "directory": ".ccjk/hooks",
    "enforcementLevel": "L2_STRONGLY_RECOMMENDED",
    "timeout": 30000,
    "parallel": true,
    "failFast": false,
    "ignorePatterns": [
      "node_modules/**",
      "dist/**",
      "*.min.js"
    ]
  }
}
```

### Enforcement Levels

| Level | Description | Behavior |
|-------|-------------|----------|
| `L0_AWARENESS` | Informational | Show suggestions, don't block |
| `L1_RECOMMENDED` | Recommended | Warn but allow override |
| `L2_STRONGLY_RECOMMENDED` | Strongly Recommended | Warn heavily, require confirmation |
| `L3_MANDATORY` | Mandatory | Block if failed |

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | true | Enable hooks system |
| `directory` | string | ".ccjk/hooks" | Hooks directory |
| `enforcementLevel` | string | "L2_STRONGLY_RECOMMENDED" | Default enforcement level |
| `timeout` | number | 30000 | Hook execution timeout (ms) |
| `parallel` | boolean | true | Run hooks in parallel |
| `failFast` | boolean | false | Stop on first failure |
| `ignorePatterns` | string[] | [] | Files/directories to ignore |

## 🧠 Skills Configuration

Configure AI skills and caching.

```json
{
  "skills": {
    "enabled": true,
    "directory": ".ccjk/skills",
    "cache": {
      "enabled": true,
      "maxSize": 100,
      "ttl": 3600000
    },
    "defaultProtocol": "CHAIN_OF_THOUGHT",
    "maxTokens": 4096,
    "temperature": 0.7
  }
}
```

### Cognition Protocols

| Protocol | Description | Use Case |
|----------|-------------|----------|
| `CHAIN_OF_THOUGHT` | Sequential reasoning | Complex problems |
| `TREE_OF_THOUGHTS` | Branching exploration | Multiple solutions |
| `REFLEXION` | Self-reflection | Iterative improvement |
| `DEBATE` | Multiple perspectives | Decision making |

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | true | Enable skills system |
| `directory` | string | ".ccjk/skills" | Skills directory |
| `cache.enabled` | boolean | true | Enable caching |
| `cache.maxSize` | number | 100 | Max cached results |
| `cache.ttl` | number | 3600000 | Cache TTL (ms) |
| `defaultProtocol` | string | "CHAIN_OF_THOUGHT" | Default protocol |
| `maxTokens` | number | 4096 | Max tokens per skill |
| `temperature` | number | 0.7 | AI temperature (0-1) |

## 🤖 Agents Configuration

Configure multi-agent system.

```json
{
  "agents": {
    "enabled": true,
    "redis": {
      "host": "localhost",
      "port": 6379,
      "db": 0,
      "password": null,
      "tls": false,
      "retryStrategy": {
        "maxRetries": 3,
        "delay": 1000
      }
    },
    "maxConcurrent": 10,
    "timeout": 60000,
    "heartbeatInterval": 5000,
    "messageQueue": {
      "enabled": true,
      "maxSize": 1000
    }
  }
}
```

### Agent Roles

| Role | Description | Responsibilities |
|------|-------------|-------------------|
| `MONITOR` | Monitoring | Watch events, alert on issues |
| `ANALYZER` | Analysis | Process data, generate insights |
| `EXECUTOR` | Execution | Run tasks, perform actions |
| `COORDINATOR` | Coordination | Orchestrate other agents |

### Redis Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `host` | string | "localhost" | Redis host |
| `port` | number | 6379 | Redis port |
| `db` | number | 0 | Redis database number |
| `password` | string | null | Redis password |
| `tls` | boolean | false | Use TLS |

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | true | Enable agents system |
| `maxConcurrent` | number | 10 | Max concurrent agents |
| `timeout` | number | 60000 | Agent timeout (ms) |
| `heartbeatInterval` | number | 5000 | Heartbeat interval (ms) |

## 📊 Traceability Configuration

Configure code traceability system.

```json
{
  "traceability": {
    "enabled": true,
    "level": "full",
    "autoTrace": true,
    "gitIntegration": true,
    "storage": ".ccjk/traces",
    "commitLinkage": {
      "enabled": true,
      "autoLink": true,
      "linkFormat": "[Trace: {id}]"
    },
    "metadata": {
      "captureAuthor": true,
      "captureTimestamp": true,
      "captureBranch": true
    }
  }
}
```

### Traceability Levels

| Level | Description | Data Captured |
|-------|-------------|---------------|
| `minimal` | Minimal | Basic trace ID |
| `basic` | Basic | Trace ID + commit linkage |
| `standard` | Standard | Basic + metadata |
| `full` | Full | All data + decision docs |

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | true | Enable traceability |
| `level` | string | "full" | Traceability level |
| `autoTrace` | boolean | true | Auto-generate traces |
| `gitIntegration` | boolean | true | Integrate with Git |
| `storage` | string | ".ccjk/traces" | Trace data storage |

## 🔧 Environment Variables

Override configuration with environment variables.

### Core Settings

```bash
# Project
CCJK_PROJECT_NAME=my-project
CCJK_PROJECT_ROOT=/path/to/project

# Hooks
CCJK_HOOKS_ENABLED=true
CCJK_HOOKS_DIR=.ccjk/hooks
CCJK_HOOK_ENFORCEMENT=L2_STRONGLY_RECOMMENDED
CCJK_HOOK_TIMEOUT=30000

# Skills
CCJK_SKILLS_ENABLED=true
CCJK_SKILLS_DIR=.ccjk/skills
CCJK_SKILLS_CACHE_ENABLED=true
CCJK_SKILLS_MAX_TOKENS=4096

# Agents
CCJK_AGENTS_ENABLED=true
CCJK_REDIS_HOST=localhost
CCJK_REDIS_PORT=6379
CCJK_REDIS_PASSWORD=your-password

# Traceability
CCJK_TRACE_ENABLED=true
CCJK_TRACE_LEVEL=full
CCJK_AUTO_TRACE=true

# Logging
CCJK_LOG_LEVEL=info
CCJK_LOG_FILE=.ccjk/logs/ccjk.log
```

### Redis Connection String

You can also use a connection string:

```bash
CCJK_REDIS_URL=redis://user:password@localhost:6379/0

# With TLS
CCJK_REDIS_URL=rediss://user:password@localhost:6380/0

# Cloud Redis
CCJK_REDIS_URL=redis://your-redis-cloud-endpoint:6379
```

## ⚙️ Advanced Options

### Conditional Configuration

Use different configurations for different environments:

```bash
# Development
NODE_ENV=development ccjk init

# Production
NODE_ENV=production ccjk init
```

Load environment-specific config:

```json
{
  "extends": "./ccjk.config.base.json",
  "hooks": {
    "enforcementLevel": "L1_RECOMMENDED"
  }
}
```

### Profile-Based Configuration

Create multiple profiles:

```json
{
  "profiles": {
    "strict": {
      "hooks": {
        "enforcementLevel": "L3_MANDATORY"
      }
    },
    "lenient": {
      "hooks": {
        "enforcementLevel": "L0_AWARENESS"
      }
    }
  }
}
```

Use profile:

```bash
ccjk --profile=strict init
```

### Validation

Validate your configuration:

```bash
# Validate config file
ccjk config validate

# Show effective configuration
ccjk config show

# Show specific section
ccjk config show hooks
```

## 🔒 Security Configuration

### Sensitive Data

Never commit sensitive data:

```bash
# Use .env file for secrets
CCJK_REDIS_PASSWORD=secret123

# Add to .gitignore
echo ".env" >> .gitignore
```

### Hook Permissions

Control hook permissions:

```json
{
  "hooks": {
    "permissions": {
      "allowNetwork": false,
      "allowFileSystem": ["read"],
      "allowExec": []
    }
  }
}
```

## 🧪 Testing Configuration

Test your configuration:

```bash
# Run configuration check
ccjk doctor --verbose

# Test specific component
ccjk test hooks
ccjk test skills
ccjk test agents

# Dry-run initialization
ccjk init --dry-run
```

## 📚 Next Steps

- [Installation Guide](./installation.md) - Installation instructions
- [Quick Start](./getting-started.md) - Get started quickly
- [Best Practices](./best-practices.md) - Recommended patterns

## 🆘 Troubleshooting

See [Troubleshooting Guide](./troubleshooting.md) for common issues.
