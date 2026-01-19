---
name: agent-browser
description: Zero-config headless browser automation for AI agents
version: 1.0.0
author: Vercel Labs / CCJK
category: automation
triggers:
  - /browser
  - /web
  - /scrape
  - /test-ui
use_when:
  - "User needs web automation or browser control"
  - "User wants to scrape or interact with websites"
  - "User needs UI testing or screenshot capture"
  - "User mentions browser, web page, or website interaction"
auto_activate: true
priority: 8
difficulty: beginner
tags:
  - browser
  - automation
  - web
  - zero-config
  - ai-native
dependencies:
  - agent-browser
---

# Agent Browser - Zero-Config Web Automation

> **Philosophy**: AI-native, zero-config, ref-based interaction

Headless browser automation designed specifically for AI agents. Fast Rust CLI with Node.js fallback.

## Quick Start

```bash
# One-time setup (auto-detected, usually not needed)
agent-browser install

# Core workflow
agent-browser open <url>           # Navigate
agent-browser snapshot -i          # Get interactive elements with refs
agent-browser click @e1            # Click by ref
agent-browser fill @e2 "text"      # Fill by ref
agent-browser screenshot page.png  # Capture
agent-browser close                # Done
```

## Why Agent Browser?

| Feature | Agent Browser | Traditional MCP |
|---------|--------------|-----------------|
| Setup | Zero-config | Complex JSON config |
| Speed | Native Rust | Node.js overhead |
| AI-Native | Ref-based (@e1) | CSS selectors |
| Memory | Minimal | Heavy daemon |
| Learning | 5 minutes | Hours |

## Core Commands

### Navigation
```bash
agent-browser open example.com      # Open URL
agent-browser back                  # Go back
agent-browser forward               # Go forward
agent-browser reload                # Reload page
```

### Snapshot (AI-Optimized)
```bash
agent-browser snapshot              # Full accessibility tree
agent-browser snapshot -i           # Interactive elements only (recommended)
agent-browser snapshot -c           # Compact mode
agent-browser snapshot -d 3         # Limit depth
agent-browser snapshot -i -c        # Combine options
```

**Output Example:**
```
- heading "Example Domain" [ref=e1] [level=1]
- button "Submit" [ref=e2]
- textbox "Email" [ref=e3]
- link "Learn more" [ref=e4]
```

### Interaction (Ref-Based)
```bash
agent-browser click @e2             # Click element
agent-browser fill @e3 "email@test.com"  # Fill input
agent-browser hover @e4             # Hover element
agent-browser check @e5             # Check checkbox
agent-browser select @e6 "option"   # Select dropdown
```

### Get Information
```bash
agent-browser get text @e1          # Get text content
agent-browser get html @e1          # Get innerHTML
agent-browser get value @e3         # Get input value
agent-browser get title             # Page title
agent-browser get url               # Current URL
```

### Screenshots & PDF
```bash
agent-browser screenshot            # Viewport screenshot
agent-browser screenshot --full     # Full page
agent-browser screenshot page.png   # Save to file
agent-browser pdf report.pdf        # Save as PDF
```

### Wait Operations
```bash
agent-browser wait @e1              # Wait for element
agent-browser wait 2000             # Wait 2 seconds
agent-browser wait --text "Welcome" # Wait for text
agent-browser wait --load networkidle  # Wait for load
```

## Optimal AI Workflow

### Pattern 1: Simple Interaction
```bash
agent-browser open example.com
agent-browser snapshot -i --json    # Parse refs
agent-browser click @e2             # Execute action
```

### Pattern 2: Form Filling
```bash
agent-browser open login.example.com
agent-browser snapshot -i
agent-browser fill @e1 "username"
agent-browser fill @e2 "password"
agent-browser click @e3             # Submit button
agent-browser wait --text "Dashboard"
agent-browser snapshot -i           # Verify success
```

### Pattern 3: Data Extraction
```bash
agent-browser open data.example.com
agent-browser snapshot -i
agent-browser get text @e1          # Extract specific data
agent-browser screenshot data.png   # Visual record
```

### Pattern 4: Multi-Page Flow
```bash
agent-browser open shop.example.com
agent-browser snapshot -i
agent-browser click @e5             # Product link
agent-browser wait --load networkidle
agent-browser snapshot -i           # New page refs
agent-browser click @e2             # Add to cart
```

## Sessions (Parallel Browsers)

```bash
# Run multiple isolated sessions
agent-browser --session agent1 open site-a.com
agent-browser --session agent2 open site-b.com

# List sessions
agent-browser session list

# Each session has isolated:
# - Cookies & storage
# - Navigation history
# - Authentication state
```

## Advanced Features

### Semantic Locators (Fallback)
```bash
agent-browser find role button click --name "Submit"
agent-browser find label "Email" fill "test@test.com"
agent-browser find text "Sign In" click
```

### Network Control
```bash
agent-browser network requests              # View requests
agent-browser network route "**/api" --abort  # Block requests
agent-browser set offline on                # Offline mode
```

### Debug Mode
```bash
agent-browser open example.com --headed     # Show browser window
agent-browser console                       # View console logs
agent-browser errors                        # View page errors
agent-browser highlight @e1                 # Highlight element
```

## Integration Examples

### With Workflow Skill
```bash
# In /workflow execution phase
agent-browser open $TEST_URL
agent-browser snapshot -i
# AI analyzes snapshot, identifies test targets
agent-browser click @e2
agent-browser wait --text "Success"
```

### With TDD Skill
```bash
# E2E test execution
agent-browser open localhost:3000
agent-browser snapshot -i
agent-browser fill @e1 "test input"
agent-browser click @e2
agent-browser get text @e3  # Verify output
```

## Best Practices

1. **Always use `-i` flag** for snapshots (interactive elements only)
2. **Use refs (@e1)** instead of CSS selectors
3. **Re-snapshot after page changes** to get fresh refs
4. **Use `--json` flag** for programmatic parsing
5. **Combine with wait** for dynamic content

## Troubleshooting

```bash
# Browser not installed
agent-browser install

# Linux dependencies
agent-browser install --with-deps

# Debug issues
agent-browser open url --headed --debug
```

## Command Reference

| Command | Description |
|---------|-------------|
| `open <url>` | Navigate to URL |
| `snapshot [-i] [-c]` | Get accessibility tree |
| `click @ref` | Click element |
| `fill @ref "text"` | Fill input |
| `get text @ref` | Get text content |
| `screenshot [path]` | Take screenshot |
| `wait <ref\|ms\|--text>` | Wait for condition |
| `close` | Close browser |

---

**Zero-Config. AI-Native. Just Works.**
