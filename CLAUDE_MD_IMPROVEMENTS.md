# CLAUDE.md Improvements - 2026-03-04

## Summary

Updated CLAUDE.md with recent features and clarifications based on v12.2.2 release and project memory.

## Changes Made

### 1. Updated Changelog
Added three recent releases:
- **v12.2.2** (2026-03-04): Slash command compatibility with CLI interceptor
- **v12.2.1** (2026-03-03): Smart routing and telemetry improvements
- **v12.1.0** (2026-03-02): Fast installation & hierarchical menu system

### 2. Enhanced Testing Strategy Section
Added missing test commands:
- V2 test suite (`pnpm test:v2:run`)
- Watch mode variants for all test types
- Coverage command pattern (`:coverage` suffix)
- Better formatting for clarity

### 3. Added Model Priority Documentation
New subsection under "Debugging Gotchas" explaining:
- Claude Code's config priority: `settings.model` > env vars
- How ccjk handles custom model configuration via env vars
- Automatic `settings.model` deletion to prevent override issues
- Context-aware model selection (Haiku/Sonnet/Opus)

### 4. Documented Brain Router Pattern
Added to "Key Patterns" section:
- CLI interceptor functionality (`cli-interceptor.ts`)
- Slash command compatibility (`/clear`, `/reset`)
- Auto-executor for brain router commands

### 5. Enhanced AI Usage Guidelines
Added two new guidelines:
- Ensure `settings.model` removal when configuring custom models
- Use CLI interceptor for brain router slash command compatibility

## Why These Changes Matter

1. **Changelog updates** keep the documentation current with recent releases
2. **Testing clarifications** help developers find the right test commands quickly
3. **Model priority docs** prevent a common configuration bug that breaks custom model selection
4. **Brain router docs** explain the new slash command compatibility feature
5. **AI guidelines** help future Claude instances avoid known pitfalls

## Files Modified

- `CLAUDE.md` - Main documentation file (5 sections updated)

## Verification

All changes maintain the existing structure and tone of CLAUDE.md. No breaking changes to documented patterns or workflows.
