# ShenCha Module

**Last Updated**: Tue Jan 07 16:41:01 CST 2026

[Root](../../CLAUDE.md) > [src](../) > **shencha**

## Module Responsibilities

ShenCha is the world's first fully autonomous AI code auditor. It uses LLM-driven analysis to discover issues without predefined rules.

## Entry Points

- `index.ts` - Module exports
- `llm-scanner.ts` - AI-powered code scanning (8KB)
- `llm-decision.ts` - Decision making logic (7KB)
- `llm-fixer.ts` - Auto-fix generation (9KB)
- `llm-verifier.ts` - Fix verification (10KB)
- `async-executor.ts` - 72-hour cycle execution (12KB)
- `types.ts` - TypeScript type definitions (9KB)

## Audit Workflow

```
1️⃣  SCAN    → AI discovers issues (no predefined rules)
2️⃣  ANALYZE → Understands context and impact
3️⃣  FIX     → Generates and applies fixes automatically
4️⃣  VERIFY  → Confirms fixes work correctly
```

## Key Features

- **Autonomous Scanning**: No predefined rules, LLM discovers issues
- **Context-Aware Analysis**: Understands code context and impact
- **Auto-Fix Generation**: Generates and applies fixes
- **Verification**: Confirms fixes work correctly
- **72-Hour Cycles**: Runs continuously in background

## Related Files

- `../commands/` - CLI command integration
- `../types/` - Shared type definitions
