# Generation Module

[Root](../../CLAUDE.md) > [src](../CLAUDE.md) > **generation**

## Purpose

Smart agent and skill generation. Analyzes the current project (language, frameworks, dependencies), selects appropriate templates, and writes Claude Code-compatible agent/skill configuration files. Triggered by `ccjk init --smart`.

## Entry Points

- `src/generation/index.ts` — `smartGenerate()`, `smartGenerateAndInstall()`
- `src/generation/analyzer/` — `analyzeProject()`, `ProjectAnalyzer`
- `src/generation/selector/` — `selectTemplates()`, `TemplateSelector`
- `src/generation/generator/` — `generateConfigs()`, `writeConfigs()`, `ConfigGenerator`

## Module Structure

```
src/generation/
├── analyzer/
│   ├── project-analyzer.ts   # Detects language, frameworks, test setup
│   └── index.ts
├── selector/
│   ├── template-selector.ts  # Maps ProjectAnalysis -> TemplateSelection
│   └── index.ts
├── generator/
│   ├── config-generator.ts   # Renders templates -> GeneratedConfig
│   └── index.ts
├── templates/
│   ├── agents/               # Agent template markdown files
│   └── skills/               # Skill template markdown files
├── types.ts                  # ProjectAnalysis, TemplateSelection, GeneratedConfig
└── index.ts                  # smartGenerate / smartGenerateAndInstall
```

## Workflow

```typescript
// 3-step pipeline
const analysis  = await analyzeProject(projectRoot)   // Step 1
const selection = await selectTemplates(analysis)      // Step 2
const config    = await generateConfigs(selection)     // Step 3
await writeConfigs(config)                             // Step 4 (install)
```

## Key Types

```typescript
interface ProjectAnalysis {
  language: string
  frameworks: string[]
  testFramework?: string
  hasCI: boolean
  packageManager: string
}

interface GeneratedConfig {
  agents: AgentConfig[]
  skills: SkillConfig[]
  outputPaths: string[]
}
```

## Dependencies

- Internal: `src/discovery/`, `src/config/`, `src/utils/`
- External: `handlebars` (template rendering), `fs-extra`, `pathe`

## Tests

No dedicated test file yet. Covered via `tests/v2/integration/e2e-workflow.test.ts`.

## Changelog

| Date | Change |
|------|--------|
| 2026-02-25 | CLAUDE.md created by init-architect |
