# Discovery Module

[Root](../../CLAUDE.md) > [src](../CLAUDE.md) > **discovery**

## Purpose

Project analyzer and skill/MCP matcher. Scans the current project's `package.json`, file structure, and git metadata to build a `ProjectProfile`, then recommends relevant skills and MCP services.

## Entry Points

- `src/discovery/index.ts` — exports `analyzeProject`, `matchSkills`, `matchMcpServices`, `getRecommendations`
- `src/discovery/project-analyzer.ts` — filesystem/package.json analysis
- `src/discovery/skill-matcher.ts` — recommendation logic
- `src/discovery/types.ts` — `ProjectProfile`, `SkillRecommendation`, `McpRecommendation`

## Module Structure

```
src/discovery/
├── project-analyzer.ts   # analyzeProject(root?) -> ProjectProfile
├── skill-matcher.ts      # matchSkills / matchMcpServices / getRecommendations
├── types.ts              # ProjectProfile, *Recommendation types
└── index.ts
```

## Key Types

```typescript
export interface ProjectProfile {
  language: string
  frameworks: string[]
  hasTests: boolean
  hasDocker: boolean
  gitRemote?: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

export interface SkillRecommendation {
  id: string
  relevanceScore: number
  reason: string
}

export interface McpRecommendation {
  serviceId: string
  relevanceScore: number
  reason: string
}
```

## Dependencies

- Internal: `src/config/mcp-services.ts`, `src/skills/`
- External: `fs-extra`, `pathe`

## Tests

- `tests/analyzers/analyzers.test.ts`

## Changelog

| Date | Change |
|------|--------|
| 2026-02-25 | CLAUDE.md created by init-architect |
