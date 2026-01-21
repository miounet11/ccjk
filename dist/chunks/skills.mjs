import ansis from 'ansis';
import inquirer from 'inquirer';
import { i18n } from './index.mjs';
import { existsSync, unlinkSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'pathe';
import { CCJK_SKILLS_DIR } from './constants.mjs';
import { writeFileAtomic } from './fs-operations.mjs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'node:os';
import 'node:crypto';
import 'node:fs/promises';

const cloudSyncSkill = {
  id: "cloud-sync",
  name: {
    "en": "Cloud Sync",
    "zh-CN": "\u4E91\u540C\u6B65\u7BA1\u7406"
  },
  description: {
    "en": "Cross-device synchronization for configurations, skills, and workflows",
    "zh-CN": "\u8DE8\u8BBE\u5907\u540C\u6B65\u914D\u7F6E\u3001\u6280\u80FD\u548C\u5DE5\u4F5C\u6D41"
  },
  category: "devops",
  triggers: ["/sync", "/cloud", "/backup", "/restore"],
  enabled: true,
  version: "1.0.0",
  author: "CCJK Team",
  tags: ["cloud", "sync", "backup", "restore", "configuration"],
  template: `# Cloud Sync Management

## Overview

Cloud Sync provides seamless cross-device synchronization for your CCJK environment.
Keep your configurations, skills, and workflows in sync across all your development machines.

## Features

### Configuration Sync
- Synchronize CCJK settings across devices
- Preserve API configurations securely
- Sync MCP service configurations

### Skills Sync
- Share custom skills between machines
- Version control for skill updates
- Conflict resolution for concurrent edits

### Workflow Sync
- Sync workflow states and progress
- Share workflow templates
- Collaborative workflow management

### Conflict Resolution
- Intelligent merge for non-conflicting changes
- Manual resolution UI for conflicts
- Version history for rollback

## Commands

### Sync Status
\`\`\`bash
/sync status
\`\`\`
View current synchronization status, pending changes, and last sync time.

### Push Changes
\`\`\`bash
/sync push              # Push all pending changes
/sync push --config     # Push configuration only
/sync push --skills     # Push skills only
/sync push --workflows  # Push workflows only
\`\`\`

### Pull Changes
\`\`\`bash
/sync pull              # Pull all remote changes
/sync pull --force      # Force pull, overwrite local
/sync pull --merge      # Merge with local changes
\`\`\`

### Configure Cloud Storage
\`\`\`bash
/sync config                    # Interactive configuration
/sync config github             # Configure GitHub Gist
/sync config webdav             # Configure WebDAV
/sync config local              # Configure local folder sync
\`\`\`

### Backup Management
\`\`\`bash
/backup create                  # Create full backup
/backup create --name "v1.0"    # Create named backup
/backup list                    # List all backups
/backup restore <id>            # Restore from backup
/backup delete <id>             # Delete a backup
\`\`\`

### Conflict Management
\`\`\`bash
/sync conflicts                 # List all conflicts
/sync resolve <id> --local      # Keep local version
/sync resolve <id> --remote     # Keep remote version
/sync resolve <id> --merge      # Manual merge
\`\`\`

## Supported Cloud Storage

### GitHub Gist (Recommended)
- Free and reliable
- Version history built-in
- Easy to set up with personal access token

\`\`\`bash
/sync config github
# Enter your GitHub personal access token
# Token needs 'gist' scope
\`\`\`

### WebDAV
Compatible with:
- Nutstore (\u575A\u679C\u4E91)
- Nextcloud
- ownCloud
- Any WebDAV server

\`\`\`bash
/sync config webdav
# Enter WebDAV URL, username, and password
\`\`\`

### Local Folder
For manual sync via Dropbox, OneDrive, etc.

\`\`\`bash
/sync config local
# Enter path to sync folder
\`\`\`

## Usage Examples

### First-Time Setup
\`\`\`bash
# 1. Configure cloud storage
/sync config github

# 2. Push initial configuration
/sync push --all

# 3. Verify sync status
/sync status
\`\`\`

### Daily Workflow
\`\`\`bash
# Start of day: pull latest changes
/sync pull

# End of day: push your changes
/sync push
\`\`\`

### Handling Conflicts
\`\`\`bash
# Check for conflicts after pull
/sync conflicts

# Review and resolve each conflict
/sync resolve skill-123 --merge
\`\`\`

### Backup Before Major Changes
\`\`\`bash
# Create backup before risky operations
/backup create --name "before-upgrade"

# If something goes wrong
/backup restore before-upgrade
\`\`\`

## Security

### Sensitive Data Handling
- API keys are encrypted before sync
- OAuth tokens are never synced (re-authenticate on each device)
- Local encryption key derived from device-specific identifier

### Access Control
- GitHub: Uses personal access token with minimal scope
- WebDAV: Supports app-specific passwords
- All connections use HTTPS/TLS

## Best Practices

1. **Regular Syncing**: Sync at least daily to avoid large conflicts
2. **Named Backups**: Create named backups before major changes
3. **Review Conflicts**: Don't auto-resolve conflicts without review
4. **Secure Tokens**: Use app-specific passwords when available
5. **Test Restore**: Periodically test backup restoration

## Troubleshooting

### Sync Failed
\`\`\`bash
# Check connection
/sync status --verbose

# Force re-authentication
/sync config github --reauth
\`\`\`

### Conflicts Won't Resolve
\`\`\`bash
# Reset sync state
/sync reset

# Re-initialize from remote
/sync pull --force
\`\`\`

### Backup Corrupted
\`\`\`bash
# List all backups with integrity check
/backup list --verify

# Delete corrupted backup
/backup delete <corrupted-id>
\`\`\`
`
};

const marketplaceSkill = {
  id: "mcp-marketplace",
  name: {
    "en": "MCP Marketplace",
    "zh-CN": "MCP \u63D2\u4EF6\u5E02\u573A"
  },
  description: {
    "en": "Discover, install and manage MCP plugins",
    "zh-CN": "\u53D1\u73B0\u3001\u5B89\u88C5\u548C\u7BA1\u7406 MCP \u63D2\u4EF6"
  },
  category: "dev",
  triggers: ["/market", "/mcp", "/plugins", "/install"],
  enabled: true,
  version: "1.0.0",
  author: "CCJK Team",
  tags: ["mcp", "marketplace", "plugins", "extensions", "install"],
  template: `# MCP Marketplace Skill

## Overview

The MCP Marketplace provides a centralized hub for discovering, installing, and managing
Model Context Protocol (MCP) plugins. It integrates seamlessly with Claude Code and CCJK
to enhance your AI-assisted development workflow.

## Features

- **Browse Marketplace**: Discover trending and recommended plugins
- **Search Plugins**: Search by name, category, or tags
- **Install Management**: One-click install, update, and uninstall
- **Security Scanning**: Automatic security checks before installation
- **Dependency Resolution**: Automatic handling of plugin dependencies

## Commands

### Search Plugins
\`\`\`bash
# Search by keyword
ccjk market search <query>

# Search with filters
ccjk market search <query> --category ai-tools
ccjk market search <query> --tag productivity
\`\`\`

### Browse Marketplace
\`\`\`bash
# View trending plugins
ccjk market trending

# Browse by category
ccjk market browse --category dev-tools
ccjk market browse --category ai-tools
ccjk market browse --category data-processing
\`\`\`

### Install Plugins
\`\`\`bash
# Install a plugin
ccjk market install <plugin-id>

# Install specific version
ccjk market install <plugin-id>@1.2.0

# Install with dependencies
ccjk market install <plugin-id> --with-deps

# Force reinstall
ccjk market install <plugin-id> --force
\`\`\`

### Update Plugins
\`\`\`bash
# Update all plugins
ccjk market update

# Update specific plugin
ccjk market update <plugin-id>

# Check for updates
ccjk market check-updates
\`\`\`

### Manage Installed Plugins
\`\`\`bash
# List installed plugins
ccjk market list

# Show plugin details
ccjk market info <plugin-id>

# Uninstall plugin
ccjk market uninstall <plugin-id>

# Enable/disable plugin
ccjk market enable <plugin-id>
ccjk market disable <plugin-id>
\`\`\`

## Categories

### AI Tools
AI-enhanced functionality for code generation, analysis, and optimization.
- Code completion enhancers
- AI-powered refactoring
- Intelligent code review

### Development Tools
Tools to assist with coding and development workflows.
- Language servers
- Linters and formatters
- Build tool integrations

### Productivity Tools
Enhance your development efficiency.
- Task automation
- Snippet managers
- Documentation generators

### Data Processing
Data transformation and analysis tools.
- Data converters
- Schema validators
- API integrators

### Integrations
Third-party service integrations.
- Cloud service connectors
- Database integrations
- CI/CD tool bridges

## Security

All plugins undergo security scanning before installation:

### Security Checks
- **Permission Analysis**: Detects dangerous permission requests
- **Vulnerability Scanning**: Checks against known CVE databases
- **Code Pattern Analysis**: Identifies suspicious code patterns
- **Dependency Audit**: Scans dependencies for vulnerabilities

### Security Levels
- \`verified\` - Officially verified by CCJK team
- \`community\` - Community-reviewed plugin
- \`unverified\` - New or unreviewed plugin

### Skip Security (Not Recommended)
\`\`\`bash
ccjk market install <plugin-id> --skip-verification
\`\`\`

## Configuration

### Plugin Settings
\`\`\`bash
# Configure plugin
ccjk market config <plugin-id> --set key=value

# View plugin config
ccjk market config <plugin-id> --list

# Reset plugin config
ccjk market config <plugin-id> --reset
\`\`\`

### Global Settings
\`\`\`bash
# Set default registry
ccjk market registry set <url>

# Enable auto-updates
ccjk market settings --auto-update true

# Set security level
ccjk market settings --security-level strict
\`\`\`

## Plugin Development

### Create a Plugin
\`\`\`bash
ccjk market create <plugin-name>
\`\`\`

### Publish to Marketplace
\`\`\`bash
ccjk market publish
\`\`\`

### Plugin Manifest Example
\`\`\`json
{
  "packageId": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A useful MCP plugin",
  "author": "Your Name",
  "license": "MIT",
  "keywords": ["mcp", "plugin"],
  "mcpServer": {
    "command": "node",
    "args": ["dist/server.js"]
  }
}
\`\`\`

## Troubleshooting

### Installation Issues
\`\`\`bash
# Clear cache and retry
ccjk market cache clear
ccjk market install <plugin-id>

# Verbose installation
ccjk market install <plugin-id> --verbose
\`\`\`

### Dependency Conflicts
\`\`\`bash
# Check dependencies
ccjk market deps <plugin-id>

# Force resolve conflicts
ccjk market install <plugin-id> --force-deps
\`\`\`

### Rollback
\`\`\`bash
# Rollback to previous version
ccjk market rollback <plugin-id>

# Rollback to specific version
ccjk market rollback <plugin-id>@1.0.0
\`\`\`

## Best Practices

1. **Review Before Install**: Always check plugin ratings and reviews
2. **Keep Updated**: Regularly update plugins for security patches
3. **Minimal Plugins**: Only install plugins you actively use
4. **Backup Config**: Export your plugin configuration before major changes
5. **Report Issues**: Help improve the ecosystem by reporting bugs

## Integration with Claude Code

The marketplace integrates directly with Claude Code's MCP system:

\`\`\`bash
# Installed plugins are automatically available in Claude Code
claude --mcp-list  # Shows marketplace-installed plugins

# Plugins can be used in conversations
# Example: Using a database plugin
"Connect to my PostgreSQL database and show tables"
\`\`\`
`
};

const browserSkill = {
  id: "browser-automation",
  name: {
    "en": "Browser Automation",
    "zh-CN": "\u6D4F\u89C8\u5668\u81EA\u52A8\u5316"
  },
  description: {
    "en": "Zero-config headless browser automation for AI agents",
    "zh-CN": "\u96F6\u914D\u7F6E\u7684 AI \u4EE3\u7406\u6D4F\u89C8\u5668\u81EA\u52A8\u5316\u5DE5\u5177"
  },
  category: "dev",
  triggers: ["/browser", "/web", "/browse"],
  enabled: true,
  version: "1.0.0",
  author: "CCJK",
  tags: ["browser", "automation", "web", "scraping", "testing"],
  template: `# Browser Automation Skill

## Overview
This skill provides zero-config headless browser automation powered by agent-browser.

## Quick Start

### Open a URL
\`\`\`bash
ccjk browser open https://example.com
\`\`\`

### Get Page Snapshot (AI-optimized)
\`\`\`bash
ccjk browser snapshot -i    # Interactive elements only
ccjk browser snapshot -c    # Compact output
\`\`\`

### Interact with Elements
\`\`\`bash
ccjk browser click @e1           # Click by ref
ccjk browser fill @e2 "text"     # Fill input
ccjk browser get text @e3        # Get text content
\`\`\`

### Screenshots
\`\`\`bash
ccjk browser screenshot              # Viewport
ccjk browser screenshot --full       # Full page
ccjk browser screenshot output.png   # Custom path
\`\`\`

### Wait for Conditions
\`\`\`bash
ccjk browser wait 2000              # Wait 2 seconds
ccjk browser wait @e1               # Wait for element
ccjk browser wait --text "Success"  # Wait for text
\`\`\`

## Common Workflows

### Login Flow
\`\`\`bash
ccjk browser open https://app.example.com/login
ccjk browser snapshot -i
ccjk browser fill @e1 "username"
ccjk browser fill @e2 "password"
ccjk browser click @e3
ccjk browser wait --text "Dashboard"
\`\`\`

### Form Submission
\`\`\`bash
ccjk browser open https://example.com/form
ccjk browser snapshot -i
ccjk browser fill @e1 "John Doe"
ccjk browser fill @e2 "john@example.com"
ccjk browser click @e3  # Submit button
ccjk browser wait --text "Thank you"
\`\`\`

### Web Scraping
\`\`\`bash
ccjk browser open https://example.com/products
ccjk browser snapshot --json > products.json
\`\`\`

## Session Management

### Parallel Sessions
\`\`\`bash
ccjk browser --session s1 open site-a.com
ccjk browser --session s2 open site-b.com
ccjk browser session list
\`\`\`

## Debug Mode
\`\`\`bash
ccjk browser open example.com --headed  # Show browser window
\`\`\`

## Element References

The snapshot command returns elements with refs like \`@e1\`, \`@e2\`, etc.
Use these refs to interact with specific elements:

- \`@e1\` - First interactive element
- \`@e2\` - Second interactive element
- etc.

## Tips for AI Agents

1. Always run \`snapshot -i\` first to get interactive elements
2. Use refs from snapshot output for interactions
3. Wait for page loads with \`wait --text\` or \`wait @ref\`
4. Use \`--json\` for programmatic parsing
5. Close browser when done to free resources
`
};

const workflowSkill = {
  id: "workflow-automation",
  name: {
    "en": "Workflow Automation",
    "zh-CN": "\u5DE5\u4F5C\u6D41\u81EA\u52A8\u5316"
  },
  description: {
    "en": "Subagent-driven development workflow with two-stage review",
    "zh-CN": "Subagent \u9A71\u52A8\u7684\u4E24\u9636\u6BB5\u5BA1\u67E5\u5F00\u53D1\u5DE5\u4F5C\u6D41"
  },
  category: "dev",
  triggers: ["/workflow", "/wf", "/flow"],
  enabled: true,
  version: "1.0.0",
  author: "CCJK",
  tags: ["workflow", "subagent", "review", "automation", "ci"],
  template: `# Workflow Automation Skill

## Overview

This skill provides Subagent-driven development workflows with automatic two-stage review.
Inspired by Anthropic's Superpowers architecture for autonomous agent collaboration.

## Core Concepts

### Two-Stage Review
1. **Draft Stage**: Subagents work on tasks in parallel
2. **Review Stage**: Automated quality checks and validation
3. **Finalize Stage**: Merge approved changes

### Workflow States
- \`idle\` \u2192 \`planning\` \u2192 \`executing\` \u2192 \`reviewing\` \u2192 \`finalizing\` \u2192 \`completed\`

## Quick Start

### Create a Workflow
\`\`\`bash
ccjk workflow create "Implement user authentication"
\`\`\`

### Start Workflow Execution
\`\`\`bash
ccjk workflow start <workflow-id>
\`\`\`

### Check Workflow Status
\`\`\`bash
ccjk workflow status <workflow-id>
ccjk workflow list
\`\`\`

## Task Management

### Add Tasks to Workflow
\`\`\`bash
ccjk workflow task add <workflow-id> "Create login component"
ccjk workflow task add <workflow-id> "Add authentication API" --depends-on task-1
\`\`\`

### Task Priorities
\`\`\`bash
ccjk workflow task add <workflow-id> "Fix security bug" --priority critical
ccjk workflow task add <workflow-id> "Add tests" --priority high
\`\`\`

### View Task Dependencies
\`\`\`bash
ccjk workflow tasks <workflow-id> --graph
\`\`\`

## Subagent Scheduling

### Automatic Scheduling
The scheduler automatically:
- Assigns tasks to available subagents
- Respects task dependencies
- Balances workload across agents
- Handles failures with retry logic

### Manual Assignment
\`\`\`bash
ccjk workflow assign <task-id> <subagent-id>
\`\`\`

### View Subagent Status
\`\`\`bash
ccjk workflow agents
ccjk workflow agent <agent-id> --tasks
\`\`\`

## Review System

### Automatic Review
When tasks complete, the system automatically:
1. Runs requirement verification
2. Performs code quality checks
3. Validates test coverage
4. Checks for security issues

### Review Results
\`\`\`bash
ccjk workflow review <workflow-id>
ccjk workflow review <task-id> --detailed
\`\`\`

### Manual Review Override
\`\`\`bash
ccjk workflow approve <task-id>
ccjk workflow reject <task-id> --reason "Missing tests"
\`\`\`

## Quality Checks

### Built-in Checks
- **Naming Conventions**: camelCase, PascalCase validation
- **Code Structure**: Function length, nesting depth
- **Error Handling**: Try-catch coverage
- **Documentation**: JSDoc/TSDoc presence
- **Style**: Consistent formatting

### Custom Checks
\`\`\`bash
ccjk workflow check add "No console.log" --pattern "console\\.log"
ccjk workflow check add "Max file size" --max-lines 500
\`\`\`

## Workflow Templates

### Feature Development
\`\`\`bash
ccjk workflow create --template feature "Add dark mode"
\`\`\`

### Bug Fix
\`\`\`bash
ccjk workflow create --template bugfix "Fix login timeout"
\`\`\`

### Refactoring
\`\`\`bash
ccjk workflow create --template refactor "Migrate to TypeScript"
\`\`\`

## Events and Hooks

### Available Events
- \`workflow:created\`
- \`workflow:started\`
- \`task:assigned\`
- \`task:completed\`
- \`review:passed\`
- \`review:failed\`
- \`workflow:completed\`

### Add Hooks
\`\`\`bash
ccjk workflow hook add task:completed "npm test"
ccjk workflow hook add review:passed "npm run lint"
\`\`\`

## Best Practices

### 1. Break Down Large Tasks
Split complex features into smaller, independent tasks that can run in parallel.

### 2. Define Clear Dependencies
Use \`--depends-on\` to ensure tasks run in the correct order.

### 3. Set Appropriate Priorities
- \`critical\`: Security fixes, blocking issues
- \`high\`: Important features, bugs
- \`medium\`: Regular development
- \`low\`: Nice-to-have improvements

### 4. Review Before Merge
Always check review results before finalizing:
\`\`\`bash
ccjk workflow review <workflow-id> --summary
\`\`\`

### 5. Use Templates
Create custom templates for recurring workflow patterns.

## Integration with Git

### Automatic Branch Management
\`\`\`bash
ccjk workflow create "Feature X" --branch feature/x
\`\`\`

### Worktree Support
Each subagent can work in isolated git worktrees:
\`\`\`bash
ccjk workflow start <id> --worktree
\`\`\`

## Troubleshooting

### Stuck Workflow
\`\`\`bash
ccjk workflow diagnose <workflow-id>
ccjk workflow retry <task-id>
\`\`\`

### Cancel Workflow
\`\`\`bash
ccjk workflow cancel <workflow-id>
ccjk workflow cancel <workflow-id> --force
\`\`\`

### View Logs
\`\`\`bash
ccjk workflow logs <workflow-id>
ccjk workflow logs <task-id> --tail 100
\`\`\`
`
};

const BUILTIN_SKILLS = [
  cloudSyncSkill,
  browserSkill,
  marketplaceSkill,
  workflowSkill
];
let registry = null;
function ensureSkillsDir() {
  if (!existsSync(CCJK_SKILLS_DIR)) {
    mkdirSync(CCJK_SKILLS_DIR, { recursive: true });
  }
}
function getRegistry() {
  if (!registry) {
    registry = loadRegistry();
  }
  return registry;
}
function loadRegistry() {
  ensureSkillsDir();
  const skills = /* @__PURE__ */ new Map();
  const categories = /* @__PURE__ */ new Map();
  for (const skill of BUILTIN_SKILLS) {
    skills.set(skill.id, skill);
    const categorySkills = categories.get(skill.category) || [];
    categorySkills.push(skill.id);
    categories.set(skill.category, categorySkills);
  }
  const files = readdirSync(CCJK_SKILLS_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const content = readFileSync(join(CCJK_SKILLS_DIR, file), "utf-8");
      const skill = JSON.parse(content);
      skills.set(skill.id, skill);
      const categorySkills = categories.get(skill.category) || [];
      categorySkills.push(skill.id);
      categories.set(skill.category, categorySkills);
    } catch {
    }
  }
  return {
    skills,
    categories,
    lastUpdated: /* @__PURE__ */ new Date()
  };
}
function refreshRegistry() {
  registry = loadRegistry();
}
function getAllSkills() {
  return Array.from(getRegistry().skills.values());
}
function getSkill(id) {
  return getRegistry().skills.get(id);
}
function searchSkills(options) {
  let skills = getAllSkills();
  if (options.category) {
    skills = skills.filter((s) => s.category === options.category);
  }
  if (options.enabled !== void 0) {
    skills = skills.filter((s) => s.enabled === options.enabled);
  }
  if (options.tags && options.tags.length > 0) {
    skills = skills.filter(
      (s) => s.tags && options.tags.some((tag) => s.tags.includes(tag))
    );
  }
  if (options.query) {
    const query = options.query.toLowerCase();
    skills = skills.filter(
      (s) => s.id.toLowerCase().includes(query) || s.name.en.toLowerCase().includes(query) || s.name["zh-CN"].toLowerCase().includes(query) || s.triggers.some((t) => t.toLowerCase().includes(query))
    );
  }
  if (options.limit) {
    skills = skills.slice(0, options.limit);
  }
  return skills;
}
function addSkill(skill) {
  ensureSkillsDir();
  try {
    const filePath = join(CCJK_SKILLS_DIR, `${skill.id}.json`);
    writeFileAtomic(filePath, JSON.stringify(skill, null, 2));
    refreshRegistry();
    return {
      skillId: skill.id,
      success: true,
      path: filePath
    };
  } catch (error) {
    return {
      skillId: skill.id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
function removeSkill(id) {
  const filePath = join(CCJK_SKILLS_DIR, `${id}.json`);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
    refreshRegistry();
    return true;
  }
  return false;
}
function setSkillEnabled(id, enabled) {
  const skill = getSkill(id);
  if (!skill)
    return false;
  skill.enabled = enabled;
  addSkill(skill);
  return true;
}
const BATCH_TEMPLATES = {
  typescript: {
    category: "dev",
    skills: [
      {
        id: "ts-debug",
        name: { "en": "TypeScript Debug", "zh-CN": "TypeScript \u8C03\u8BD5" },
        description: { "en": "Debug TypeScript code", "zh-CN": "\u8C03\u8BD5 TypeScript \u4EE3\u7801" },
        triggers: ["/ts-debug", "/tsd"],
        templateFile: "ts-debug.md",
        tags: ["typescript", "debug"]
      },
      {
        id: "ts-refactor",
        name: { "en": "TypeScript Refactor", "zh-CN": "TypeScript \u91CD\u6784" },
        description: { "en": "Refactor TypeScript code", "zh-CN": "\u91CD\u6784 TypeScript \u4EE3\u7801" },
        triggers: ["/ts-refactor", "/tsr"],
        templateFile: "ts-refactor.md",
        tags: ["typescript", "refactor"]
      },
      {
        id: "ts-test",
        name: { "en": "TypeScript Test", "zh-CN": "TypeScript \u6D4B\u8BD5" },
        description: { "en": "Generate TypeScript tests", "zh-CN": "\u751F\u6210 TypeScript \u6D4B\u8BD5" },
        triggers: ["/ts-test", "/tst"],
        templateFile: "ts-test.md",
        tags: ["typescript", "testing"]
      },
      {
        id: "ts-type-check",
        name: { "en": "TypeScript Type Check", "zh-CN": "TypeScript \u7C7B\u578B\u68C0\u67E5" },
        description: { "en": "Fix TypeScript type errors", "zh-CN": "\u4FEE\u590D TypeScript \u7C7B\u578B\u9519\u8BEF" },
        triggers: ["/ts-type", "/tstc"],
        templateFile: "ts-type-check.md",
        tags: ["typescript", "types"]
      },
      {
        id: "ts-migrate",
        name: { "en": "TypeScript Migration", "zh-CN": "TypeScript \u8FC1\u79FB" },
        description: { "en": "Migrate JS to TypeScript", "zh-CN": "\u4ECE JS \u8FC1\u79FB\u5230 TypeScript" },
        triggers: ["/ts-migrate", "/tsm"],
        templateFile: "ts-migrate.md",
        tags: ["typescript", "migration"]
      }
    ]
  },
  python: {
    category: "dev",
    skills: [
      {
        id: "py-debug",
        name: { "en": "Python Debug", "zh-CN": "Python \u8C03\u8BD5" },
        description: { "en": "Debug Python code", "zh-CN": "\u8C03\u8BD5 Python \u4EE3\u7801" },
        triggers: ["/py-debug", "/pyd"],
        templateFile: "py-debug.md",
        tags: ["python", "debug"]
      },
      {
        id: "py-refactor",
        name: { "en": "Python Refactor", "zh-CN": "Python \u91CD\u6784" },
        description: { "en": "Refactor Python code", "zh-CN": "\u91CD\u6784 Python \u4EE3\u7801" },
        triggers: ["/py-refactor", "/pyr"],
        templateFile: "py-refactor.md",
        tags: ["python", "refactor"]
      },
      {
        id: "py-test",
        name: { "en": "Python Test", "zh-CN": "Python \u6D4B\u8BD5" },
        description: { "en": "Generate Python tests", "zh-CN": "\u751F\u6210 Python \u6D4B\u8BD5" },
        triggers: ["/py-test", "/pyt"],
        templateFile: "py-test.md",
        tags: ["python", "testing"]
      }
    ]
  },
  seo: {
    category: "seo",
    skills: [
      {
        id: "seo-meta",
        name: { "en": "SEO Meta Optimization", "zh-CN": "SEO \u5143\u6570\u636E\u4F18\u5316" },
        description: { "en": "Optimize meta tags for SEO", "zh-CN": "\u4F18\u5316 SEO \u5143\u6807\u7B7E" },
        triggers: ["/seo-meta", "/meta"],
        templateFile: "seo-meta.md",
        tags: ["seo", "meta"]
      },
      {
        id: "seo-sitemap",
        name: { "en": "Sitemap Generator", "zh-CN": "\u7AD9\u70B9\u5730\u56FE\u751F\u6210" },
        description: { "en": "Generate XML sitemap", "zh-CN": "\u751F\u6210 XML \u7AD9\u70B9\u5730\u56FE" },
        triggers: ["/sitemap", "/seo-sitemap"],
        templateFile: "seo-sitemap.md",
        tags: ["seo", "sitemap"]
      },
      {
        id: "seo-schema",
        name: { "en": "Schema Markup", "zh-CN": "\u7ED3\u6784\u5316\u6570\u636E\u6807\u8BB0" },
        description: { "en": "Add structured data markup", "zh-CN": "\u6DFB\u52A0\u7ED3\u6784\u5316\u6570\u636E\u6807\u8BB0" },
        triggers: ["/schema", "/seo-schema"],
        templateFile: "seo-schema.md",
        tags: ["seo", "schema"]
      },
      {
        id: "seo-cwv",
        name: { "en": "Core Web Vitals", "zh-CN": "\u6838\u5FC3\u7F51\u9875\u6307\u6807" },
        description: { "en": "Optimize Core Web Vitals", "zh-CN": "\u4F18\u5316\u6838\u5FC3\u7F51\u9875\u6307\u6807" },
        triggers: ["/cwv", "/seo-cwv"],
        templateFile: "seo-cwv.md",
        tags: ["seo", "performance"]
      }
    ]
  },
  devops: {
    category: "devops",
    skills: [
      {
        id: "devops-docker",
        name: { "en": "Docker Setup", "zh-CN": "Docker \u914D\u7F6E" },
        description: { "en": "Set up Docker configuration", "zh-CN": "\u914D\u7F6E Docker" },
        triggers: ["/docker", "/devops-docker"],
        templateFile: "devops-docker.md",
        tags: ["devops", "docker"]
      },
      {
        id: "devops-ci",
        name: { "en": "CI Pipeline", "zh-CN": "CI \u6D41\u6C34\u7EBF" },
        description: { "en": "Set up CI pipeline", "zh-CN": "\u914D\u7F6E CI \u6D41\u6C34\u7EBF" },
        triggers: ["/ci", "/devops-ci"],
        templateFile: "devops-ci.md",
        tags: ["devops", "ci"]
      },
      {
        id: "devops-deploy",
        name: { "en": "Deploy Script", "zh-CN": "\u90E8\u7F72\u811A\u672C" },
        description: { "en": "Create deployment script", "zh-CN": "\u521B\u5EFA\u90E8\u7F72\u811A\u672C" },
        triggers: ["/deploy", "/devops-deploy"],
        templateFile: "devops-deploy.md",
        tags: ["devops", "deploy"]
      },
      {
        id: "devops-monitor",
        name: { "en": "Monitoring Setup", "zh-CN": "\u76D1\u63A7\u914D\u7F6E" },
        description: { "en": "Set up monitoring", "zh-CN": "\u914D\u7F6E\u76D1\u63A7" },
        triggers: ["/monitor", "/devops-monitor"],
        templateFile: "devops-monitor.md",
        tags: ["devops", "monitoring"]
      }
    ]
  }
};
function createBatchSkills(options) {
  const results = [];
  if (options.lang) {
    const template = BATCH_TEMPLATES[options.lang];
    if (template) {
      for (const skillDef of template.skills) {
        const skill = {
          ...skillDef,
          category: template.category,
          enabled: true,
          version: "1.0.0",
          template: `# ${skillDef.name.en}

${skillDef.description.en}

This is a placeholder template.`
        };
        results.push(addSkill(skill));
      }
    }
  }
  if (options.seo) {
    const template = BATCH_TEMPLATES.seo;
    for (const skillDef of template.skills) {
      const skill = {
        ...skillDef,
        category: template.category,
        enabled: true,
        version: "1.0.0",
        template: `# ${skillDef.name.en}

${skillDef.description.en}

This is a placeholder template.`
      };
      results.push(addSkill(skill));
    }
  }
  if (options.devops) {
    const template = BATCH_TEMPLATES.devops;
    for (const skillDef of template.skills) {
      const skill = {
        ...skillDef,
        category: template.category,
        enabled: true,
        version: "1.0.0",
        template: `# ${skillDef.name.en}

${skillDef.description.en}

This is a placeholder template.`
      };
      results.push(addSkill(skill));
    }
  }
  return results;
}
function getBatchCategories() {
  return Object.keys(BATCH_TEMPLATES);
}

async function listSkills(options = {}) {
  console.log("");
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log(ansis.bold.cyan(`  ${i18n.t("skills:title.list")}`));
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log("");
  try {
    const skills = searchSkills({
      category: options.category,
      enabled: options.showDisabled ? void 0 : true
    });
    if (skills.length === 0) {
      console.log(ansis.yellow(`  ${i18n.t("skills:message.noSkills")}`));
      console.log("");
      console.log(ansis.dim(`  ${i18n.t("skills:hint.createSkill")}`));
      console.log(ansis.dim(`    ccjk skills create <name>`));
      console.log("");
      return;
    }
    const byCategory = /* @__PURE__ */ new Map();
    for (const skill of skills) {
      const categorySkills = byCategory.get(skill.category) || [];
      categorySkills.push(skill);
      byCategory.set(skill.category, categorySkills);
    }
    for (const [category, categorySkills] of byCategory) {
      console.log(ansis.bold.green(`  ${getCategoryIcon(category)} ${i18n.t(`skills:category.${category}`)}`));
      console.log("");
      for (const skill of categorySkills) {
        const statusIcon = skill.enabled ? ansis.green("\u2713") : ansis.dim("\u25CB");
        const name = skill.name[options.lang || "en"];
        const description = skill.description[options.lang || "en"];
        const triggers = skill.triggers.map((t) => ansis.green(t)).join(", ");
        console.log(`  ${statusIcon} ${ansis.bold(name)} ${ansis.dim(`(${skill.id})`)}`);
        console.log(`    ${ansis.dim(description)}`);
        console.log(`    ${ansis.dim(i18n.t("skills:label.triggers"))}: ${triggers}`);
        if (skill.tags && skill.tags.length > 0) {
          const tags = skill.tags.map((tag) => ansis.bgGray.white(` ${tag} `)).join(" ");
          console.log(`    ${tags}`);
        }
        console.log("");
      }
    }
    console.log(ansis.dim(`  ${i18n.t("skills:message.totalSkills", { count: skills.length })}`));
    console.log("");
  } catch (error) {
    console.error(ansis.red(`
  ${i18n.t("skills:error.listFailed")}: ${error}`));
    throw error;
  }
}
async function runSkill(skillName, options = {}) {
  console.log("");
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log(ansis.bold.cyan(`  ${i18n.t("skills:title.run")}`));
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log("");
  try {
    let skill = getSkill(skillName);
    if (!skill) {
      const allSkills = getAllSkills();
      skill = allSkills.find((s) => s.triggers.includes(skillName) || s.triggers.includes(`/${skillName}`));
    }
    if (!skill) {
      console.error(ansis.red(`  ${i18n.t("skills:error.skillNotFound", { name: skillName })}`));
      console.log("");
      console.log(ansis.dim(`  ${i18n.t("skills:hint.listSkills")}`));
      console.log(ansis.dim(`    ccjk skills list`));
      console.log("");
      return;
    }
    if (!skill.enabled) {
      console.warn(ansis.yellow(`  ${i18n.t("skills:warning.skillDisabled", { name: skill.name[options.lang || "en"] })}`));
      console.log("");
      console.log(ansis.dim(`  ${i18n.t("skills:hint.enableSkill")}`));
      console.log(ansis.dim(`    ccjk skills enable ${skill.id}`));
      console.log("");
      return;
    }
    console.log(ansis.bold(`  ${skill.name[options.lang || "en"]}`));
    console.log(ansis.dim(`  ${skill.description[options.lang || "en"]}`));
    console.log("");
    console.log(ansis.bold.green(`  ${i18n.t("skills:label.template")}:`));
    console.log("");
    console.log(ansis.dim("  \u2500".repeat(30)));
    console.log(skill.template.split("\n").map((line) => `  ${line}`).join("\n"));
    console.log(ansis.dim("  \u2500".repeat(30)));
    console.log("");
    console.log(ansis.green(`  \u2713 ${i18n.t("skills:message.skillExecuted")}`));
    console.log("");
    console.log(ansis.dim(`  ${i18n.t("skills:hint.copyTemplate")}`));
    console.log("");
  } catch (error) {
    console.error(ansis.red(`
  ${i18n.t("skills:error.runFailed")}: ${error}`));
    throw error;
  }
}
async function showSkillInfo(skillName, options = {}) {
  console.log("");
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log(ansis.bold.cyan(`  ${i18n.t("skills:title.info")}`));
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log("");
  try {
    const skill = getSkill(skillName);
    if (!skill) {
      console.error(ansis.red(`  ${i18n.t("skills:error.skillNotFound", { name: skillName })}`));
      console.log("");
      return;
    }
    const name = skill.name[options.lang || "en"];
    const description = skill.description[options.lang || "en"];
    const statusBadge = skill.enabled ? ansis.bgGreen.white(" ENABLED ") : ansis.bgRed.white(" DISABLED ");
    console.log(`${ansis.bold.green(`  ${name}`)} ${statusBadge}`);
    console.log(ansis.dim(`  ${description}`));
    console.log("");
    console.log(ansis.bold(`  ${i18n.t("skills:label.details")}:`));
    console.log(ansis.dim(`    ${i18n.t("skills:label.id")}: ${skill.id}`));
    console.log(ansis.dim(`    ${i18n.t("skills:label.version")}: ${skill.version}`));
    console.log(ansis.dim(`    ${i18n.t("skills:label.category")}: ${i18n.t(`skills:category.${skill.category}`)}`));
    if (skill.author) {
      console.log(ansis.dim(`    ${i18n.t("skills:label.author")}: ${skill.author}`));
    }
    console.log("");
    console.log(ansis.bold(`  ${i18n.t("skills:label.triggers")}:`));
    for (const trigger of skill.triggers) {
      console.log(ansis.green(`    ${trigger}`));
    }
    if (skill.tags && skill.tags.length > 0) {
      console.log("");
      console.log(ansis.bold(`  ${i18n.t("skills:label.tags")}:`));
      const tags = skill.tags.map((tag) => ansis.bgGray.white(` ${tag} `)).join(" ");
      console.log(`    ${tags}`);
    }
    if (skill.agents && skill.agents.length > 0) {
      console.log("");
      console.log(ansis.bold(`  ${i18n.t("skills:label.agents")}:`));
      for (const agent of skill.agents) {
        console.log(ansis.dim(`    - ${agent}`));
      }
    }
    console.log("");
    console.log(ansis.bold(`  ${i18n.t("skills:label.template")}:`));
    console.log(ansis.dim(`    ${skill.template.length} ${i18n.t("skills:label.characters")}`));
    console.log("");
  } catch (error) {
    console.error(ansis.red(`
  ${i18n.t("skills:error.infoFailed")}: ${error}`));
    throw error;
  }
}
async function createSkill(skillName, options = {}) {
  console.log("");
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log(ansis.bold.cyan(`  ${i18n.t("skills:title.create")}`));
  console.log(ansis.bold.cyan("\u2501".repeat(60)));
  console.log("");
  try {
    if (options.batch) {
      await createBatchSkillsInteractive(options);
      return;
    }
    const existing = getSkill(skillName);
    if (existing) {
      console.error(ansis.red(`  ${i18n.t("skills:error.skillExists", { name: skillName })}`));
      console.log("");
      return;
    }
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "nameEn",
        message: i18n.t("skills:prompt.nameEn"),
        default: skillName,
        validate: (input) => input.length > 0 || i18n.t("skills:error.nameRequired")
      },
      {
        type: "input",
        name: "nameZh",
        message: i18n.t("skills:prompt.nameZh"),
        default: skillName
      },
      {
        type: "input",
        name: "descriptionEn",
        message: i18n.t("skills:prompt.descriptionEn"),
        validate: (input) => input.length > 0 || i18n.t("skills:error.descriptionRequired")
      },
      {
        type: "input",
        name: "descriptionZh",
        message: i18n.t("skills:prompt.descriptionZh")
      },
      {
        type: "list",
        name: "category",
        message: i18n.t("skills:prompt.category"),
        choices: [
          { name: i18n.t("skills:category.git"), value: "git" },
          { name: i18n.t("skills:category.dev"), value: "dev" },
          { name: i18n.t("skills:category.testing"), value: "testing" },
          { name: i18n.t("skills:category.docs"), value: "docs" },
          { name: i18n.t("skills:category.review"), value: "review" },
          { name: i18n.t("skills:category.seo"), value: "seo" },
          { name: i18n.t("skills:category.devops"), value: "devops" },
          { name: i18n.t("skills:category.custom"), value: "custom" }
        ],
        default: options.category || "custom"
      },
      {
        type: "input",
        name: "triggers",
        message: i18n.t("skills:prompt.triggers"),
        default: `/${skillName}`,
        validate: (input) => input.length > 0 || i18n.t("skills:error.triggersRequired")
      },
      {
        type: "editor",
        name: "template",
        message: i18n.t("skills:prompt.template"),
        default: getDefaultTemplate(skillName, options.lang)
      }
    ]);
    const skill = {
      id: skillName,
      name: {
        "en": answers.nameEn,
        "zh-CN": answers.nameZh || answers.nameEn
      },
      description: {
        "en": answers.descriptionEn,
        "zh-CN": answers.descriptionZh || answers.descriptionEn
      },
      category: answers.category,
      triggers: answers.triggers.split(",").map((t) => t.trim()),
      template: answers.template,
      enabled: true,
      version: "1.0.0"
    };
    const result = addSkill(skill);
    if (result.success) {
      console.log(ansis.green(`
  \u2713 ${i18n.t("skills:message.skillCreated", { name: skill.name[options.lang || "en"] })}`));
      console.log(ansis.dim(`    ${i18n.t("skills:label.path")}: ${result.path}`));
      console.log("");
      console.log(ansis.dim(`  ${i18n.t("skills:hint.runSkill")}`));
      console.log(ansis.dim(`    ccjk skills run ${skillName}`));
      console.log("");
    } else {
      console.error(ansis.red(`
  ${i18n.t("skills:error.createFailed")}: ${result.error}`));
    }
  } catch (error) {
    console.error(ansis.red(`
  ${i18n.t("skills:error.createFailed")}: ${error}`));
    throw error;
  }
}
async function enableSkill(skillName, options = {}) {
  try {
    const skill = getSkill(skillName);
    if (!skill) {
      console.error(ansis.red(`  ${i18n.t("skills:error.skillNotFound", { name: skillName })}`));
      return;
    }
    if (skill.enabled) {
      console.log(ansis.yellow(`  ${i18n.t("skills:message.alreadyEnabled", { name: skill.name[options.lang || "en"] })}`));
      return;
    }
    const success = setSkillEnabled(skillName, true);
    if (success) {
      console.log(ansis.green(`  \u2713 ${i18n.t("skills:message.skillEnabled", { name: skill.name[options.lang || "en"] })}`));
    } else {
      console.error(ansis.red(`  ${i18n.t("skills:error.enableFailed")}`));
    }
  } catch (error) {
    console.error(ansis.red(`
  ${i18n.t("skills:error.enableFailed")}: ${error}`));
    throw error;
  }
}
async function disableSkill(skillName, options = {}) {
  try {
    const skill = getSkill(skillName);
    if (!skill) {
      console.error(ansis.red(`  ${i18n.t("skills:error.skillNotFound", { name: skillName })}`));
      return;
    }
    if (!skill.enabled) {
      console.log(ansis.yellow(`  ${i18n.t("skills:message.alreadyDisabled", { name: skill.name[options.lang || "en"] })}`));
      return;
    }
    const success = setSkillEnabled(skillName, false);
    if (success) {
      console.log(ansis.green(`  \u2713 ${i18n.t("skills:message.skillDisabled", { name: skill.name[options.lang || "en"] })}`));
    } else {
      console.error(ansis.red(`  ${i18n.t("skills:error.disableFailed")}`));
    }
  } catch (error) {
    console.error(ansis.red(`
  ${i18n.t("skills:error.disableFailed")}: ${error}`));
    throw error;
  }
}
async function deleteSkill(skillName, options = {}) {
  try {
    const skill = getSkill(skillName);
    if (!skill) {
      console.error(ansis.red(`  ${i18n.t("skills:error.skillNotFound", { name: skillName })}`));
      return;
    }
    const { confirm } = await inquirer.prompt({
      type: "confirm",
      name: "confirm",
      message: i18n.t("skills:prompt.confirmDelete", { name: skill.name[options.lang || "en"] }),
      default: false
    });
    if (!confirm) {
      console.log(ansis.yellow(`  ${i18n.t("skills:message.deleteCancelled")}`));
      return;
    }
    const success = removeSkill(skillName);
    if (success) {
      console.log(ansis.green(`  \u2713 ${i18n.t("skills:message.skillDeleted", { name: skill.name[options.lang || "en"] })}`));
    } else {
      console.error(ansis.red(`  ${i18n.t("skills:error.deleteFailed")}`));
    }
  } catch (error) {
    console.error(ansis.red(`
  ${i18n.t("skills:error.deleteFailed")}: ${error}`));
    throw error;
  }
}
async function skillsMenu(options = {}) {
  while (true) {
    console.log("");
    console.log(ansis.bold.cyan("\u2501".repeat(60)));
    console.log(ansis.bold.cyan(`  ${i18n.t("skills:menu.title")}`));
    console.log(ansis.bold.cyan("\u2501".repeat(60)));
    console.log("");
    const { action } = await inquirer.prompt({
      type: "list",
      name: "action",
      message: i18n.t("skills:menu.prompt"),
      choices: [
        { name: `\u{1F4CB} ${i18n.t("skills:menu.list")}`, value: "list" },
        { name: `\u25B6\uFE0F  ${i18n.t("skills:menu.run")}`, value: "run" },
        { name: `\u2139\uFE0F  ${i18n.t("skills:menu.info")}`, value: "info" },
        { name: `\u2795 ${i18n.t("skills:menu.create")}`, value: "create" },
        { name: `\u{1F4E6} ${i18n.t("skills:menu.batch")}`, value: "batch" },
        { name: `\u2705 ${i18n.t("skills:menu.enable")}`, value: "enable" },
        { name: `\u274C ${i18n.t("skills:menu.disable")}`, value: "disable" },
        { name: `\u{1F5D1}\uFE0F  ${i18n.t("skills:menu.delete")}`, value: "delete" },
        new inquirer.Separator(),
        { name: `\u{1F519} ${i18n.t("skills:menu.back")}`, value: "back" }
      ]
    });
    if (action === "back") {
      break;
    }
    try {
      switch (action) {
        case "list":
          await listSkills(options);
          break;
        case "run": {
          const { skillName } = await inquirer.prompt({
            type: "input",
            name: "skillName",
            message: i18n.t("skills:prompt.skillName")
          });
          await runSkill(skillName, options);
          break;
        }
        case "info": {
          const { skillName } = await inquirer.prompt({
            type: "input",
            name: "skillName",
            message: i18n.t("skills:prompt.skillName")
          });
          await showSkillInfo(skillName, options);
          break;
        }
        case "create": {
          const { skillName } = await inquirer.prompt({
            type: "input",
            name: "skillName",
            message: i18n.t("skills:prompt.newSkillName")
          });
          await createSkill(skillName, options);
          break;
        }
        case "batch":
          await createBatchSkillsInteractive(options);
          break;
        case "enable": {
          const { skillName } = await inquirer.prompt({
            type: "input",
            name: "skillName",
            message: i18n.t("skills:prompt.skillName")
          });
          await enableSkill(skillName, options);
          break;
        }
        case "disable": {
          const { skillName } = await inquirer.prompt({
            type: "input",
            name: "skillName",
            message: i18n.t("skills:prompt.skillName")
          });
          await disableSkill(skillName, options);
          break;
        }
        case "delete": {
          const { skillName } = await inquirer.prompt({
            type: "input",
            name: "skillName",
            message: i18n.t("skills:prompt.skillName")
          });
          await deleteSkill(skillName, options);
          break;
        }
      }
    } catch (error) {
      console.error(ansis.red(`
  ${i18n.t("common.error")}: ${error}`));
    }
    await inquirer.prompt({
      type: "input",
      name: "continue",
      message: i18n.t("common.pressEnterToContinue")
    });
  }
}
function getCategoryIcon(category) {
  const icons = {
    git: "\u{1F500}",
    dev: "\u{1F4BB}",
    testing: "\u{1F9EA}",
    docs: "\u{1F4DA}",
    review: "\u{1F440}",
    seo: "\u{1F50D}",
    devops: "\u{1F680}",
    custom: "\u2699\uFE0F"
  };
  return icons[category] || "\u{1F4E6}";
}
function getDefaultTemplate(skillName, lang) {
  const isZh = lang === "zh-CN";
  if (isZh) {
    return `# ${skillName}

## \u6280\u80FD\u63CF\u8FF0

\u8FD9\u662F\u4E00\u4E2A\u81EA\u5B9A\u4E49\u6280\u80FD\u6A21\u677F\u3002\u8BF7\u63CF\u8FF0\u8FD9\u4E2A\u6280\u80FD\u7684\u7528\u9014\u548C\u529F\u80FD\u3002

## \u4F7F\u7528\u573A\u666F

- \u573A\u666F 1
- \u573A\u666F 2
- \u573A\u666F 3

## \u6267\u884C\u6B65\u9AA4

1. \u7B2C\u4E00\u6B65
2. \u7B2C\u4E8C\u6B65
3. \u7B2C\u4E09\u6B65

## \u6CE8\u610F\u4E8B\u9879

- \u6CE8\u610F\u4E8B\u9879 1
- \u6CE8\u610F\u4E8B\u9879 2
`;
  }
  return `# ${skillName}

## Skill Description

This is a custom skill template. Please describe the purpose and functionality of this skill.

## Use Cases

- Use case 1
- Use case 2
- Use case 3

## Execution Steps

1. Step 1
2. Step 2
3. Step 3

## Notes

- Note 1
- Note 2
`;
}
async function createBatchSkillsInteractive(_options) {
  console.log(ansis.bold(`  ${i18n.t("skills:batch.title")}`));
  console.log("");
  const categories = getBatchCategories();
  const answers = await inquirer.prompt([
    {
      type: "checkbox",
      name: "categories",
      message: i18n.t("skills:batch.prompt"),
      choices: categories.map((cat) => ({
        name: i18n.t(`skills:batch.${cat}`),
        value: cat,
        checked: false
      }))
    }
  ]);
  if (answers.categories.length === 0) {
    console.log(ansis.yellow(`  ${i18n.t("skills:batch.noneSelected")}`));
    return;
  }
  console.log("");
  console.log(ansis.dim(`  ${i18n.t("skills:batch.creating")}...`));
  console.log("");
  const results = createBatchSkills({
    lang: answers.categories.includes("typescript") ? "typescript" : answers.categories.includes("python") ? "python" : void 0,
    seo: answers.categories.includes("seo"),
    devops: answers.categories.includes("devops")
  });
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(ansis.green(`  \u2713 ${i18n.t("skills:batch.created", { count: succeeded })}`));
  if (failed > 0) {
    console.log(ansis.red(`  \u2717 ${i18n.t("skills:batch.failed", { count: failed })}`));
  }
  console.log("");
}

export { createSkill, deleteSkill, disableSkill, enableSkill, listSkills, runSkill, showSkillInfo, skillsMenu };
