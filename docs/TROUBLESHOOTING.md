# CCJK Troubleshooting Guide

**Last Updated**: 2026-02-20

Common issues, misconceptions, and their solutions.

---

## 🤔 Common Misconceptions

### "Why doesn't `ccjk memory --enable` work?"

**Answer**: This command doesn't exist yet. The persistent memory feature is planned but not implemented.

**What you can do instead**:
- Use Claude Code's native memory via CLAUDE.md files in your project
- Use the `--ai-output-lang` flag during `ccjk init` to set AI language preferences
- Configure memory settings manually in `~/.claude/settings.json`

**Status**: Planned for future release

---

### "Where's my 30-50% token reduction?"

**Answer**: The compression code exists in `src/context/compression/` but is not integrated into the CLI yet.

**Why the disconnect?**:
- Compression algorithms are implemented
- No CLI command to enable/activate them
- No integration with Claude Code's context management
- Marketing got ahead of implementation

**What you can do**:
- Wait for official integration
- Monitor GitHub issues for updates
- Use Claude Code's native context management

**Status**: Code exists, integration pending

---

### "Setup takes way longer than 30 seconds"

**Answer**: Yes, that's expected. The "30 seconds" claim is misleading.

**Realistic timeline**:
- **First-time users**: 5-15 minutes
  - Reading prompts and options
  - Selecting MCP services
  - Configuring API keys
  - Choosing workflows
- **Experienced users**: 2-5 minutes
  - Skipping prompts with flags
  - Using presets
- **Non-interactive mode**: 30 seconds - 2 minutes
  - Using `--skip-prompt` and preset flags

**Tips for faster setup**:
```bash
# Use non-interactive mode with presets
ccjk init --skip-prompt --provider 302ai --api-key YOUR_KEY --mcp-services filesystem,puppeteer
```

---

### "Agent Teams doesn't work / does nothing"

**Possible causes**:

1. **Claude Code doesn't support it yet**
   - Agent Teams is an experimental Claude Code feature
   - CCJK just toggles the flag
   - Claude Code itself must support it

2. **Not enabled properly**
   ```bash
   # Check status
   ccjk agent-teams --status

   # Enable it
   ccjk agent-teams --on
   ```

3. **Claude Code version too old**
   - Update Claude Code: `ccjk update`
   - Check Claude Code version

**What CCJK actually does**:
- Sets `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json
- This is a Claude Code native feature, not a CCJK invention

---

### "Cloud sync isn't automatic"

**Answer**: Correct. Cloud sync requires manual setup and triggering.

**Setup steps**:
```bash
# 1. Configure provider
ccjk cloud enable --provider github-gist

# 2. Enter credentials when prompted

# 3. Manually sync
ccjk cloud sync
```

**Not automatic because**:
- Requires credentials (security)
- User should control when syncing happens
- Avoids unwanted data uploads

**Future plans**: Optional automatic sync with user consent

---

### "`ccjk compact` command not found"

**Answer**: This command doesn't exist. It was documented but never implemented.

**What you probably want**:
- Context compression (not implemented yet)
- Clear conversation history (use Claude Code's native clear)
- Clean up configs: `ccjk` → option 0 (cleanup)

**Workaround**: Use Claude Code's native conversation management

---

### "Where's the persistent memory?"

**Answer**: Not implemented yet. Only type definitions exist in the codebase.

**What exists**:
- `src/types/memory.ts` - Type definitions only
- No storage implementation
- No CLI commands
- No integration with Claude Code

**What you can use instead**:
- CLAUDE.md files in your project (Claude Code native)
- MEMORY.md files (Claude Code native)
- Project-specific instructions in settings.json

---

## 🐛 Actual Bugs and Issues

### MCP Services Not Working

**Symptoms**: MCP service installed but not available in Claude Code

**Solutions**:

1. **Check permissions**
   ```bash
   # Verify MCP config
   cat ~/.claude/claude_desktop_config.json

   # Check permissions in settings.json
   cat ~/.claude/settings.json | grep -A 20 permissions
   ```

2. **Restart Claude Code**
   - Close completely
   - Reopen
   - Check MCP status in Claude Code

3. **Verify service installation**
   ```bash
   ccjk mcp list
   ```

4. **Check service requirements**
   - Some services need API keys
   - Some need additional dependencies
   - Check service documentation

---

### API Configuration Not Saving

**Symptoms**: API key entered but not working

**Solutions**:

1. **Check file permissions**
   ```bash
   ls -la ~/.claude/settings.json
   # Should be readable/writable by user
   ```

2. **Verify JSON syntax**
   ```bash
   # Check for JSON errors
   cat ~/.claude/settings.json | python3 -m json.tool
   ```

3. **Use correct API type**
   ```bash
   # For API key
   ccjk init --api-type api_key

   # For auth token
   ccjk init --api-type auth_token

   # For CCR proxy
   ccjk init --api-type ccr_proxy
   ```

4. **Check API provider settings**
   - Verify API key is valid
   - Check API URL is correct
   - Confirm model names are accurate

---

### Workflows Not Appearing

**Symptoms**: Imported workflows don't show in Claude Code

**Solutions**:

1. **Check workflow installation**
   ```bash
   ls ~/.claude/workflows/
   ```

2. **Verify workflow format**
   - Must be .md files
   - Must have proper frontmatter
   - Must be in correct directory

3. **Restart Claude Code**
   - Workflows load on startup
   - Restart required after installation

4. **Reimport workflows**
   ```bash
   ccjk update
   ```

---

### "Command not found: ccjk"

**Symptoms**: `ccjk` command doesn't work after installation

**Solutions**:

1. **Use npx**
   ```bash
   npx ccjk
   ```

2. **Install globally**
   ```bash
   npm install -g ccjk
   ```

3. **Check PATH**
   ```bash
   echo $PATH
   # Should include npm global bin directory
   ```

4. **Use full path**
   ```bash
   # Find npm global bin
   npm bin -g

   # Use full path
   $(npm bin -g)/ccjk
   ```

---

## 🔧 Configuration Issues

### Multiple API Configurations Not Working

**Symptoms**: Can't switch between API providers

**Solutions**:

1. **Use config-switch command**
   ```bash
   ccjk config-switch
   ```

2. **List available configs**
   ```bash
   ccjk config-switch --list
   ```

3. **Create new config**
   ```bash
   ccjk init --provider <provider-name>
   ```

4. **Manually edit settings.json**
   - Backup first: `cp ~/.claude/settings.json ~/.claude/settings.json.backup`
   - Edit `apiConfigs` array
   - Validate JSON syntax

---

### CCR Proxy Not Connecting

**Symptoms**: CCR proxy configured but not working

**Solutions**:

1. **Verify CCR installation**
   ```bash
   ccr --version
   ```

2. **Check CCR config**
   ```bash
   cat ~/.ccr/config.json
   ```

3. **Test CCR connection**
   ```bash
   curl -X POST http://localhost:8787/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"model":"claude-3-5-sonnet-20241022","messages":[{"role":"user","content":"test"}]}'
   ```

4. **Restart CCR**
   ```bash
   # Stop CCR
   pkill -f ccr

   # Start CCR
   ccr start
   ```

---

## 🚀 Performance Issues

### "CCJK is slow"

**Common causes**:

1. **First-time initialization**
   - Downloads templates
   - Installs MCP services
   - Expected to be slower

2. **Network issues**
   - Downloading from npm
   - Fetching templates from GitHub
   - Check internet connection

3. **Large project detection**
   - Auto-detection scans project files
   - Can be slow in large repos
   - Use `--skip-prompt` to skip detection

**Solutions**:
```bash
# Skip auto-detection
ccjk init --skip-prompt

# Use minimal setup
ccjk init --mcp-services false --workflows false
```

---

## 📚 Documentation Issues

### "Documentation doesn't match reality"

**Answer**: You're right. We're working on fixing this.

**Known issues**:
- Some commands documented but not implemented
- Feature claims ahead of implementation
- Examples may not work as shown

**What we're doing**:
- Created REALITY_CHECK.md to track discrepancies
- Updating documentation to match implementation
- Adding feature status indicators

**How you can help**:
- Report documentation issues on GitHub
- Check REALITY_CHECK.md for current status
- Contribute documentation fixes

---

## 🆘 Getting Help

### Before asking for help:

1. **Check this troubleshooting guide**
2. **Read REALITY_CHECK.md** for feature status
3. **Search GitHub issues**
4. **Check Claude Code documentation** (many issues are Claude Code, not CCJK)

### Where to get help:

- **GitHub Issues**: https://github.com/miounet11/ccjk/issues
- **Telegram**: https://t.me/ccjk_community
- **Discussions**: https://github.com/miounet11/ccjk/discussions

### When reporting issues:

Include:
```bash
# System info
uname -a
node --version
npm --version

# CCJK version
npx ccjk --version

# Config status
ls -la ~/.claude/
cat ~/.claude/settings.json | head -50

# Error messages (full output)
ccjk <command> 2>&1 | tee error.log
```

---

## 🔍 Diagnostic Commands

```bash
# Check CCJK installation
npx ccjk --version

# Check Claude Code config
cat ~/.claude/settings.json | python3 -m json.tool

# Check MCP services
cat ~/.claude/claude_desktop_config.json | python3 -m json.tool

# List installed workflows
ls -la ~/.claude/workflows/

# Check CCR status
ccr status

# Verify permissions
ls -la ~/.claude/

# Check for config conflicts
diff ~/.claude/settings.json ~/.claude/backup/settings.json.backup
```

---

## 📝 Common Error Messages

### "Error: EACCES: permission denied"

**Cause**: File permission issues

**Solution**:
```bash
# Fix permissions
chmod 644 ~/.claude/settings.json
chmod 755 ~/.claude/
```

### "Error: Invalid JSON"

**Cause**: Corrupted settings.json

**Solution**:
```bash
# Restore from backup
cp ~/.claude/backup/settings.json.backup ~/.claude/settings.json

# Or reinitialize
ccjk init --force
```

### "Error: Command not found"

**Cause**: Command doesn't exist or not in PATH

**Solution**:
- Check REALITY_CHECK.md for command status
- Use `npx ccjk` instead of `ccjk`
- Install globally: `npm install -g ccjk`

---

## 🎯 Best Practices

### For smooth operation:

1. **Always backup before major changes**
   ```bash
   cp ~/.claude/settings.json ~/.claude/settings.json.backup
   ```

2. **Use version control for configs**
   ```bash
   git init ~/.claude
   cd ~/.claude && git add . && git commit -m "backup"
   ```

3. **Test in non-interactive mode first**
   ```bash
   ccjk init --dry-run
   ```

4. **Keep CCJK updated**
   ```bash
   npm update -g ccjk
   ```

5. **Read release notes**
   - Check CHANGELOG.md before updating
   - Review breaking changes

---

**Last Updated**: 2026-02-20

**Feedback**: If this guide doesn't solve your issue, please open a GitHub issue with details.
