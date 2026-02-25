# Skills Module

[Root](../../CLAUDE.md) > [src](../CLAUDE.md) > **skills**

## Purpose

Skill registry, auto-trigger system, and intent detection. Skills are markdown-based prompt templates stored in `~/.claude/plugins/superpowers/skills/`. This module manages their lifecycle (add, remove, enable/disable, search) and provides context-aware auto-triggering.

## Entry Points

- `src/skills/index.ts` — full public API
- `src/skills/manager.ts` — `getSkill`, `addSkill`, `removeSkill`, `searchSkills`, `getAllSkills`
- `src/skills/auto-trigger.ts` — auto-trigger logic
- `src/skills/intent-detector.ts` — intent classification
- `src/skills/context-analyzer.ts` — context analysis for trigger decisions
- `src/skills/types.ts` — `Skill`, `SkillCategory`, `SkillRegistry`

## Module Structure

```
src/skills/
├── manager.ts            # CRUD + registry operations
├── auto-trigger.ts       # Watches context, fires skills automatically
├── intent-detector.ts    # Classifies user intent from input
├── context-analyzer.ts   # Analyzes conversation context
├── types.ts              # Skill, SkillCategory, SkillRegistry
└── index.ts
```

## Key API

```typescript
// Registry operations
getSkill(id: string): Skill | undefined
getAllSkills(): Skill[]
addSkill(skill: Skill): void
removeSkill(id: string): void
searchSkills(query: string): Skill[]
setSkillEnabled(id: string, enabled: boolean): void

// Built-in skills
getBuiltinSkills(): Skill[]
getBuiltinSkill(id: string): Skill | undefined
isBuiltinSkill(id: string): boolean

// Import/export
importSkills(path: string): Promise<void>
exportSkills(path: string): Promise<void>
```

## Anti-Aggression Rule

Skills must ONLY run when the user explicitly invokes them. The auto-trigger system is disabled by default (`auto.mcp = 0` in `src/config/migrator.ts`). Never enable auto-trigger without explicit user consent.

## Skill File Location

Skill files are NOT in the git repo. They come from the superpowers plugin at `~/.claude/plugins/superpowers/skills/`. The registry reads from that directory at runtime.

## Dependencies

- Internal: `src/brain/skill-registry.ts`, `src/brain/skill-parser.ts`, `src/i18n/`
- External: `gray-matter` (frontmatter parsing), `fs-extra`

## Tests

- `tests/skills/context-analyzer.test.ts`
- `tests/skills/intent-detector.test.ts`
- `tests/skills/auto-trigger.test.ts`
- `tests/commands/ccjk-skills.test.ts`

## Changelog

| Date | Change |
|------|--------|
| 2026-02-25 | CLAUDE.md created by init-architect |
