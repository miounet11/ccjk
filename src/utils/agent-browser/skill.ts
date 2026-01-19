/**
 * Browser Skill - 内置浏览器自动化技能
 *
 * 提供 /browser 命令的 skill 定义
 */

import type { CcjkSkill } from '../../skills/types'

/**
 * Browser Skill 定义
 */
export const browserSkill: CcjkSkill = {
  id: 'browser-automation',
  name: {
    'en': 'Browser Automation',
    'zh-CN': '浏览器自动化',
  },
  description: {
    'en': 'Zero-config headless browser automation for AI agents',
    'zh-CN': '零配置的 AI 代理浏览器自动化工具',
  },
  category: 'dev',
  triggers: ['/browser', '/web', '/browse'],
  enabled: true,
  version: '1.0.0',
  author: 'CCJK',
  tags: ['browser', 'automation', 'web', 'scraping', 'testing'],
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
`,
}

/**
 * 获取 browser skill 的 markdown 模板
 */
export function getBrowserSkillTemplate(): string {
  return browserSkill.template
}

/**
 * 获取 browser skill 定义
 */
export function getBrowserSkill(): CcjkSkill {
  return browserSkill
}
