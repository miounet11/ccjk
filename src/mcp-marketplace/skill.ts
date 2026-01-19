/**
 * MCP Marketplace Skill - MCP 插件市场技能
 *
 * 提供 /market, /mcp, /plugins, /install 命令的 skill 定义
 * 支持发现、安装和管理 MCP 插件
 */

import type { CcjkSkill } from '../skills/types'

/**
 * MCP Marketplace Skill 定义
 */
export const marketplaceSkill: CcjkSkill = {
  id: 'mcp-marketplace',
  name: {
    'en': 'MCP Marketplace',
    'zh-CN': 'MCP 插件市场',
  },
  description: {
    'en': 'Discover, install and manage MCP plugins',
    'zh-CN': '发现、安装和管理 MCP 插件',
  },
  category: 'dev',
  triggers: ['/market', '/mcp', '/plugins', '/install'],
  enabled: true,
  version: '1.0.0',
  author: 'CCJK Team',
  tags: ['mcp', 'marketplace', 'plugins', 'extensions', 'install'],
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
`,
}

/**
 * Get marketplace skill markdown template
 */
export function getMarketplaceSkillTemplate(): string {
  return marketplaceSkill.template
}

/**
 * Get marketplace skill definition
 */
export function getMarketplaceSkill(): CcjkSkill {
  return marketplaceSkill
}

/**
 * Register marketplace skill to the skill system
 * This function should be called during CCJK initialization
 */
export function registerMarketplaceSkill(): void {
  // The skill is registered as a built-in skill in the skills manager
  // by importing it in src/skills/manager.ts and adding to BUILTIN_SKILLS array
  // This function serves as a placeholder for any additional registration logic
}
