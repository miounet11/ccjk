# User Guide 📖

**How to Use CCJK Workflows and Styles**

> Complete guide for developers to get the most out of CCJK

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Using Workflows](#using-workflows)
3. [Customizing Styles](#customizing-styles)
4. [Quick Actions](#quick-actions)
5. [Advanced Usage](#advanced-usage)
6. [Tips & Tricks](#tips--tricks)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Getting Started

### Installation

```bash
# Install globally
npm install -g ccjk

# Or use with npx
npx ccjk
```

### First Run

When you first run CCJK, you'll see the setup wizard:

```bash
ccjk setup
```

Follow the prompts to:
1. Choose your role (student, professional, etc.)
2. Select favorite workflows
3. Pick output styles
4. Configure preferences

### Quick Start

After setup, just type:

```bash
ccjk
```

You'll see the Quick Actions panel with numbered options.

---

## Using Workflows

### Running a Workflow

**Method 1: Quick Actions (Recommended)**

```bash
ccjk
# Then type a number (1-10)
```

**Method 2: Direct Command**

```bash
ccjk <workflow-name> [options]
```

Examples:
```bash
ccjk quick-start react --typescript
ccjk bug-hunt --error-log ./logs/error.log
ccjk review --all --security
ccjk tdd user-authentication
```

**Method 3: Interactive Menu**

```bash
ccjk workflows
# Browse and select from full workflow list
```

### Workflow Options

Each workflow supports common options:

```bash
--verbose, -v      # Show detailed output
--dry-run          # Preview without making changes
--interactive, -i  # Interactive mode with prompts
--help, -h         # Show workflow-specific help
```

### Workflow Examples

#### 1. Quick Start Workflow

```bash
# Start a React project with TypeScript and Tailwind
ccjk quick-start react --typescript --tailwind

# Start a Node.js API with Express and MongoDB
ccjk quick-start node-api --express --mongodb

# Interactive mode (asks questions)
ccjk quick-start --interactive
```

#### 2. Bug Hunter Workflow

```bash
# Analyze error log
ccjk bug-hunt --error-log ./logs/error.log

# Analyze stack trace from clipboard
ccjk bug-hunt --stack-trace

# Auto-fix if possible
ccjk bug-hunt --auto-fix

# Performance debugging
ccjk bug-hunt --performance --profile
```

#### 3. Code Review Workflow

```bash
# Review all files
ccjk review --all

# Review specific files
ccjk review src/auth/*.ts

# Security-focused review
ccjk review --security --strict

# Review GitHub PR
ccjk review --pr 123 --github
```

#### 4. TDD Master Workflow

```bash
# Start TDD for a feature
ccjk tdd user-authentication

# Watch mode (re-run on changes)
ccjk tdd payment-processing --watch

# Target specific coverage
ccjk tdd --coverage 90
```

#### 5. Documentation Generator

```bash
# Generate all docs
ccjk docs generate

# API documentation only
ccjk docs generate --api --format markdown

# README with examples
ccjk docs generate --readme --examples

# Interactive mode
ccjk docs generate --interactive
```

#### 6. Refactoring Wizard

```bash
# Analyze and suggest refactorings
ccjk refactor src/legacy/*

# Aggressive refactoring
ccjk refactor --aggressive

# Fix specific code smell
ccjk refactor --smell "long-method" --auto-fix

# Apply design pattern
ccjk refactor --pattern "strategy" src/payment/
```

#### 7. Security Auditor

```bash
# Full security audit
ccjk security audit

# OWASP Top 10 check
ccjk security audit --owasp

# Check dependencies
ccjk security audit --dependencies

# Auto-fix vulnerabilities
ccjk security audit --fix-auto --severity high

# Generate PDF report
ccjk security audit --report pdf
```

#### 8. Performance Optimizer

```bash
# Profile and optimize
ccjk perf optimize

# With benchmarking
ccjk perf optimize --profile --benchmark

# Memory and CPU analysis
ccjk perf optimize --memory --cpu

# Database query optimization
ccjk perf optimize --database --queries
```

#### 9. API Designer

```bash
# Design new API
ccjk api design user-service

# Generate OpenAPI spec
ccjk api design --openapi

# Generate client SDK
ccjk api design --generate-sdk --language typescript

# Start mock server
ccjk api design --mock-server --port 3000
```

#### 10. Feature Planner

```bash
# Plan a feature
ccjk plan feature "user authentication"

# Detailed planning
ccjk plan feature "payment integration" --detailed

# With estimation
ccjk plan feature --estimate

# From GitHub issue
ccjk plan feature --from-issue 123 --github
```

---

## Customizing Styles

### Viewing Available Styles

```bash
ccjk styles list
```

### Selecting Styles

**Method 1: Interactive Selector**

```bash
ccjk styles select
```

Use arrow keys and space to select multiple styles.

**Method 2: Command Line**

```bash
ccjk styles set gamer-mode anime-character night-owl
```

**Method 3: Configuration File**

Edit `~/.ccjk/preferences.json`:

```json
{
  "outputStyles": ["gamer-mode", "anime-character", "night-owl"]
}
```

### Style Categories

#### Academic Styles
```bash
ccjk styles set professor-mode      # Formal, detailed
ccjk styles set research-paper       # Structured sections
ccjk styles set scientific-method    # Hypothesis-driven
```

#### Entertainment Styles
```bash
ccjk styles set gamer-mode          # Achievements, XP
ccjk styles set movie-director      # Cinematic narration
ccjk styles set anime-character     # Kawaii, dramatic
```

#### Programmer Favorites
```bash
ccjk styles set tech-bro            # Startup buzzwords
ccjk styles set hacker-style        # Matrix vibes
ccjk styles set cat-programmer      # Meow~ Purr-fect!
ccjk styles set unicorn-startup     # World-changing!
```

#### Special Styles
```bash
ccjk styles set minimalist          # Brief, efficient
ccjk styles set poetic-coder        # Code as poetry
ccjk styles set ramen-developer     # Food metaphors
ccjk styles set night-owl           # 3 AM coding
ccjk styles set circus-master       # Theatrical
```

### Recommended Combinations

```bash
# The Scholar (learning)
ccjk styles set professor-mode minimalist scientific-method

# The Gamer (fun)
ccjk styles set gamer-mode anime-character night-owl

# The Hacker (technical)
ccjk styles set hacker-style minimalist night-owl

# The Startup Founder (pitches)
ccjk styles set tech-bro unicorn-startup gamer-mode

# The Artist (creative)
ccjk styles set poetic-coder movie-director anime-character

# The Pragmatist (efficient)
ccjk styles set minimalist hacker-style scientific-method

# The Entertainer (demos)
ccjk styles set circus-master movie-director gamer-mode

# The Night Coder (late nights)
ccjk styles set night-owl cat-programmer ramen-developer
```

### Preview Styles

```bash
# Preview a style
ccjk styles preview gamer-mode

# Preview combination
ccjk styles preview gamer-mode anime-character

# Preview with example question
ccjk styles preview gamer-mode --example "How do I optimize this query?"
```

### Reset Styles

```bash
# Reset to defaults
ccjk styles reset

# Clear all styles
ccjk styles clear
```

---

## Quick Actions

### Number Shortcuts

When you see the Quick Actions panel, just type a number:

```
1 → Quick Start
2 → Bug Hunter
3 → Code Review
4 → TDD Master
5 → Docs Generator
6 → Refactoring Wizard
7 → Security Auditor
8 → Performance Optimizer
9 → API Designer
10 → Feature Planner
```

### Context Detection

CCJK automatically suggests workflows based on your input:

```bash
ccjk "I need to commit my changes"
# Suggests: Type '1' for Quick Start or use git commit

ccjk "There's a bug in my code"
# Suggests: Type '2' for Bug Hunter

ccjk "Review my pull request"
# Suggests: Type '3' for Code Review
```

### Help Commands

```bash
ccjk help           # Show all commands
ccjk workflows      # List all workflows
ccjk styles         # Manage styles
ccjk config         # Configuration
ccjk version        # Show version
ccjk update         # Check for updates
```

---

## Advanced Usage

### Chaining Workflows

```bash
# Review then refactor
ccjk review src/ && ccjk refactor src/

# TDD then docs
ccjk tdd user-auth && ccjk docs generate
```

### Custom Presets

Create custom workflow + style combinations:

```bash
# Save current configuration as preset
ccjk preset save my-workflow

# Load preset
ccjk preset load my-workflow

# List presets
ccjk preset list
```

### Scripting

Use CCJK in scripts:

```bash
#!/bin/bash

# Run security audit before deployment
ccjk security audit --quiet || exit 1

# Generate docs
ccjk docs generate --no-interactive

# Deploy
./deploy.sh
```

### CI/CD Integration

```yaml
# .github/workflows/ccjk.yml
name: CCJK Quality Checks

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install CCJK
        run: npm install -g ccjk
      - name: Code Review
        run: ccjk review --all --strict
      - name: Security Audit
        run: ccjk security audit --owasp
      - name: Performance Check
        run: ccjk perf optimize --benchmark
```

### Configuration Files

#### Global Config
`~/.ccjk/preferences.json`

```json
{
  "role": "professional",
  "favoriteWorkflows": ["bug-hunter", "code-review"],
  "outputStyles": ["minimalist", "hacker-style"],
  "theme": "default",
  "autoUpdate": true,
  "telemetry": false
}
```

#### Project Config
`.ccjk/config.json` (in project root)

```json
{
  "workflows": {
    "review": {
      "excludePaths": ["node_modules", "dist"],
      "strictMode": true
    },
    "security": {
      "severity": "high",
      "autoFix": false
    }
  },
  "styles": ["minimalist"],
  "outputDir": ".ccjk/reports"
}
```

---

## Tips & Tricks

### 1. Keyboard Shortcuts

```
Ctrl+C    - Cancel current operation
Ctrl+D    - Exit CCJK
↑/↓       - Navigate menus
Space     - Select/deselect
Enter     - Confirm
Esc       - Go back
```

### 2. Aliases

Add to your shell config (`.bashrc`, `.zshrc`):

```bash
alias bug='ccjk bug-hunt'
alias review='ccjk review'
alias tdd='ccjk tdd'
alias docs='ccjk docs generate'
alias sec='ccjk security audit'
alias perf='ccjk perf optimize'
```

### 3. Quick Style Switching

```bash
# Switch to fun mode
ccjk styles quick fun

# Switch to work mode
ccjk styles quick work

# Switch to learning mode
ccjk styles quick learn
```

### 4. Workflow History

```bash
# View recent workflows
ccjk history

# Re-run last workflow
ccjk history run last

# Re-run specific workflow from history
ccjk history run 3
```

### 5. Export Results

```bash
# Export to markdown
ccjk review --export markdown

# Export to JSON
ccjk security audit --export json

# Export to PDF
ccjk perf optimize --export pdf
```

### 6. Verbose Mode for Learning

```bash
# See what CCJK is doing
ccjk bug-hunt --verbose

# Explain each step
ccjk refactor --explain
```

### 7. Dry Run Before Execution

```bash
# Preview changes without applying
ccjk refactor --dry-run

# See what would be generated
ccjk docs generate --dry-run
```

---

## Troubleshooting

### Common Issues

#### 1. Command Not Found

```bash
# Reinstall globally
npm install -g ccjk

# Or use npx
npx ccjk
```

#### 2. Permission Errors

```bash
# Fix permissions
sudo chown -R $USER ~/.ccjk

# Or run with sudo (not recommended)
sudo ccjk
```

#### 3. Workflow Fails

```bash
# Run with verbose mode
ccjk <workflow> --verbose

# Check logs
cat ~/.ccjk/logs/latest.log

# Reset configuration
ccjk config reset
```

#### 4. Style Not Working

```bash
# List active styles
ccjk styles list --active

# Reset styles
ccjk styles reset

# Clear cache
ccjk cache clear
```

#### 5. Slow Performance

```bash
# Clear cache
ccjk cache clear

# Disable telemetry
ccjk config set telemetry false

# Use minimal theme
ccjk config set theme minimal
```

### Getting Help

```bash
# General help
ccjk help

# Workflow-specific help
ccjk <workflow> --help

# Style help
ccjk styles help

# Report issue
ccjk report-issue
```

### Debug Mode

```bash
# Enable debug mode
export CCJK_DEBUG=1
ccjk <command>

# View debug logs
cat ~/.ccjk/logs/debug.log
```

---

## FAQ

### General Questions

**Q: Is CCJK free?**
A: Yes, CCJK is open source and free to use.

**Q: Does CCJK work offline?**
A: Most workflows work offline. Some features (like AI-powered analysis) require internet.

**Q: Can I use CCJK in commercial projects?**
A: Yes, CCJK is MIT licensed.

**Q: How do I update CCJK?**
A: Run `npm update -g ccjk` or `ccjk update`

### Workflow Questions

**Q: Can I create custom workflows?**
A: Yes! See the Implementation Guide for details.

**Q: How long do workflows take?**
A: Most workflows complete in 5-30 minutes. Check the workflow description for estimates.

**Q: Can I cancel a running workflow?**
A: Yes, press Ctrl+C to cancel.

**Q: Are workflow results saved?**
A: Yes, results are saved in `.ccjk/reports/`

### Style Questions

**Q: Can I use multiple styles?**
A: Yes! Select 2-4 compatible styles for best results.

**Q: What if styles conflict?**
A: CCJK will warn you and suggest alternatives.

**Q: Can I create custom styles?**
A: Yes! See the Implementation Guide for details.

**Q: How do I disable styles?**
A: Run `ccjk styles clear` or `ccjk styles set minimalist`

### Configuration Questions

**Q: Where is configuration stored?**
A: Global config: `~/.ccjk/preferences.json`
   Project config: `.ccjk/config.json`

**Q: How do I reset configuration?**
A: Run `ccjk config reset`

**Q: Can I share configuration with my team?**
A: Yes! Commit `.ccjk/config.json` to your repository.

**Q: Does CCJK collect data?**
A: Only anonymous usage stats if you opt-in. Disable with `ccjk config set telemetry false`

### Technical Questions

**Q: What languages does CCJK support?**
A: JavaScript, TypeScript, Python, Go, Rust, Java, and more.

**Q: Does CCJK modify my code?**
A: Only workflows like Refactoring Wizard modify code. Others just analyze.

**Q: Can I use CCJK with Git?**
A: Yes! CCJK integrates well with Git workflows.

**Q: Does CCJK work with monorepos?**
A: Yes! Use project-specific config in each package.

---

## Examples Gallery

### Example 1: Complete Feature Development

```bash
# 1. Plan the feature
ccjk plan feature "user authentication"

# 2. Start with TDD
ccjk tdd user-authentication

# 3. Generate documentation
ccjk docs generate --api

# 4. Review code
ccjk review src/auth/

# 5. Security audit
ccjk security audit src/auth/

# 6. Performance check
ccjk perf optimize src/auth/
```

### Example 2: Bug Fix Workflow

```bash
# 1. Hunt the bug
ccjk bug-hunt --error-log ./logs/error.log

# 2. Fix and test
# ... make changes ...

# 3. Review changes
ccjk review src/fixed-file.ts

# 4. Generate tests
ccjk tdd --generate-tests
```

### Example 3: Code Quality Improvement

```bash
# 1. Review current state
ccjk review --all

# 2. Refactor problematic code
ccjk refactor src/legacy/

# 3. Security audit
ccjk security audit

# 4. Performance optimization
ccjk perf optimize

# 5. Update documentation
ccjk docs generate
```

### Example 4: New Project Setup

```bash
# 1. Quick start
ccjk quick-start react --typescript --tailwind

# 2. Set up API
ccjk api design user-service

# 3. Generate initial docs
ccjk docs generate --readme

# 4. Configure CI/CD
# ... add CCJK to CI pipeline ...
```

---

## Resources

### Documentation
- [Creative Design Package](./CREATIVE_DESIGN_PACKAGE.md)
- [Output Styles Gallery](./OUTPUT_STYLES_GALLERY.md)
- [Style Examples](./STYLE_EXAMPLES.md)
- [Interactive UI Design](./INTERACTIVE_UI_DESIGN.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)

### Community
- GitHub: [github.com/ccjk/ccjk](https://github.com/ccjk/ccjk)
- Discord: [discord.gg/ccjk](https://discord.gg/ccjk)
- Twitter: [@ccjk_dev](https://twitter.com/ccjk_dev)

### Support
- Issues: [github.com/ccjk/ccjk/issues](https://github.com/ccjk/ccjk/issues)
- Discussions: [github.com/ccjk/ccjk/discussions](https://github.com/ccjk/ccjk/discussions)
- Email: support@ccjk.dev

---

## Contributing

Want to contribute? We'd love your help!

1. Add new workflows
2. Create custom styles
3. Improve documentation
4. Report bugs
5. Suggest features

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Happy Coding! 🚀**

Made with ❤️ by the CCJK team

