# Interview Module

**Last Updated**: Tue Jan 07 16:41:01 CST 2026

[Root](../../CLAUDE.md) > [src](../) > **interview**

## Module Responsibilities

Interview-Driven Development (IDD) system that surfaces hidden assumptions before code is written. Based on Anthropic's viral workflow (1.2M views).

## Entry Points

- `index.ts` - Module exports
- `engine.ts` - Interview engine with progress tracking (14KB)
- `question-categories.ts` - Question bank with 40+ questions (44KB)
- `spec-generator.ts` - SPEC.md file generation (17KB)
- `types.ts` - TypeScript type definitions (10KB)

## Key Features

- **Smart Project Detection**: Auto-detects webapp/api/saas/ecommerce
- **Progress Tracking**: Visual breadcrumbs and progress bar
- **Pause & Resume**: Save progress and continue later
- **Spec Generation**: Outputs comprehensive SPEC.md file

## Usage

```bash
ccjk interview             # Interactive interview
ccjk quick                 # Express mode (~10 questions)
ccjk deep                  # Deep dive (~40+ questions)

# In Claude Code
/ccjk:interview            # Start interview
/ccjk:interview --quick    # Quick mode
/ccjk:interview --deep     # Deep mode
```

## Related Files

- `../commands/` - CLI command integration
- `../i18n/` - Internationalization support
