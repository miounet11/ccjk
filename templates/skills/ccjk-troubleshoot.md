---
name: ccjk-troubleshoot
description: Diagnose and fix common CCJK issues
version: 1.0.0
author: CCJK Team
category: debugging
triggers:
  - /ccjk-troubleshoot
  - /ccjk-doctor
  - /fix-ccjk
use_when:
  - User has CCJK issues
  - When something isn't working
  - When diagnosing configuration problems
auto_activate: true
priority: 9
user_invocable: true
context: inherit
args:
  - name: area
    description: Area to troubleshoot (all, api, mcp, skills, workflows)
    required: false
    default: "all"
allowed_tools:
  - Read
  - Glob
  - Grep
  - Bash(ccjk *)
  - Bash(npx *)
  - Bash(cat *)
  - Bash(ls *)
  - Bash(node *)
  - Bash(npm *)
hooks:
  - type: SkillActivate
    command: "echo '🔍 Starting CCJK diagnostics...'"
timeout: 300
---

# CCJK Troubleshooting Skill

This skill diagnoses and fixes common CCJK issues systematically.

## Arguments

- `$0` - **area**: Area to troubleshoot (default: "all")
  - `all` - Check everything
  - `api` - API configuration issues
  - `mcp` - MCP service issues
  - `skills` - Skills system issues
  - `workflows` - Workflow issues

## Diagnostic Workflow

### Step 1: Environment Check

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check CCJK version
npx ccjk --version
```

**Expected**:
- Node.js >= 20.0.0
- npm >= 9.0.0
- CCJK latest version

### Step 2: Configuration Check

```bash
# Check Claude config exists
ls -la ~/.claude.json

# Check Claude directory
ls -la ~/.claude/

# Check MCP config
ls -la ~/.claude/claude_desktop_config.json
```

**Check for**:
- Valid JSON syntax
- Correct file permissions
- Required fields present

### Step 3: Area-Specific Diagnostics

#### API Issues (`$0` = "api")

1. **Check API configuration**:
   ```bash
   cat ~/.claude.json | grep -E "apiKey|apiUrl|model"
   ```

2. **Common API issues**:
   - Invalid API key format
   - Wrong API URL
   - Model not available
   - Rate limiting

3. **Fixes**:
   ```bash
   ccjk config api
   ```

#### MCP Issues (`$0` = "mcp")

1. **Run MCP doctor**:
   ```bash
   ccjk mcp doctor
   ```

2. **Check MCP config**:
   ```bash
   cat ~/.claude/claude_desktop_config.json
   ```

3. **Common MCP issues**:
   - Invalid JSON syntax
   - Missing dependencies
   - Wrong command paths
   - Environment variable issues

4. **Fixes**:
   ```bash
   # Reinstall problematic service
   ccjk mcp uninstall <service>
   ccjk mcp install <service>
   ```

#### Skills Issues (`$0` = "skills")

1. **Check skills directories**:
   ```bash
   ls -la ~/.claude/skills/
   ls -la .claude/skills/
   ```

2. **Validate skill files**:
   - Check YAML frontmatter syntax
   - Verify required fields
   - Check file extensions (.md)

3. **Common skills issues**:
   - Invalid YAML syntax
   - Missing required fields
   - Conflicting triggers
   - Permission issues

4. **Fixes**:
   ```bash
   # Reload skills
   ccjk skills reload

   # Check specific skill
   ccjk skill info <skill-name>
   ```

#### Workflow Issues (`$0` = "workflows")

1. **Check workflow directories**:
   ```bash
   ls -la ~/.claude/commands/
   ls -la ~/.claude/agents/
   ```

2. **Common workflow issues**:
   - Missing command files
   - Missing agent files
   - Invalid YAML frontmatter
   - Broken agent references

3. **Fixes**:
   ```bash
   # Reinstall workflows
   ccjk workflows install --force

   # Update workflows
   ccjk workflows update
   ```

### Step 4: Generate Report

After diagnostics, provide:

1. **Summary of issues found**
2. **Recommended fixes**
3. **Commands to run**
4. **Prevention tips**

## Quick Fixes

### Reset Everything

```bash
# Backup current config
ccjk config backup

# Reinitialize
npx ccjk init --force
```

### Fix Permissions

```bash
chmod 644 ~/.claude.json
chmod -R 755 ~/.claude/
```

### Clear Cache

```bash
rm -rf ~/.ccjk/cache/
```

## Example Usage

```
/ccjk-troubleshoot
/ccjk-troubleshoot api
/ccjk-troubleshoot mcp
/fix-ccjk skills
```
