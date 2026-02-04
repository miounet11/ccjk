# Remaining TypeScript Errors

Total: 44 errors

## Commands Module (7 errors)

1. **src/commands/background.ts:15** - Import declaration conflicts with local declaration of 'listBackgroundTasks'
2. **src/commands/ccjk-all.ts:175** - 'language' does not exist in type 'Partial<CloudClientConfig>'
3. **src/commands/postmortem.ts:15** - Expression is not callable
4. **src/commands/registry.ts:177** - Property 'handler' does not exist
5. **src/commands/skill.ts:151** - No overload matches this call
6. **src/commands/skills.ts:606** - Property 'debug' is missing in SkillCategory
7. **src/commands/task.ts:21** - Expression is not callable

## Commands/Teleport (2 errors)

8. **src/commands/teleport.ts:12** - 'TeleportOptions' is not exported from remote-client
9. **src/commands/teleport.ts:361** - Cannot find module 'qrcode'

## Config Module (6 errors)

10. **src/config/migrator.ts:55** - Type 'null' is not assignable to type 'string | undefined'
11. **src/config/migrator.ts:264** - Type 'boolean | undefined' is not assignable to type 'boolean'
12. **src/config/migrator.ts:360** - Type 'boolean | undefined' is not assignable to type 'boolean'
13. **src/config/unified/credentials/index.ts:8** - Duplicate export 'CredentialStorageOptions'
14. **src/config/unified/migration/migrators.ts:66** - Expression is not callable
15. **src/config/unified/migration/migrators.ts:369** - Type 'string | null | undefined' not assignable

## Config/Schema (1 error)

16. **src/config/v3/schema-validator.ts:229** - Element implicitly has 'any' type

## Context Module (1 error)

17. **src/context/compact-advisor.ts:8** - Cannot find module './plan-persistence.js'

## Core Module (11 errors)

18. **src/core/config-cache.ts:13** - No exported member 'getHomeDir' from platform
19. **src/core/config-cache.ts:86** - 'ttl' is possibly 'undefined'
20. **src/core/config-cache.ts:125** - Object is possibly 'undefined'
21. **src/core/config-cache.ts:223** - Object is possibly 'undefined'
22. **src/core/config-cache.ts:240** - Object is possibly 'undefined'
23. **src/core/config-cache.ts:324** - Property 'mkdirpSync' does not exist
24. **src/core/error-boundary.ts:191** - Missing properties in ErrorCode Record
25. **src/core/lazy-loader.ts:155** - Cannot find name 'requestIdleCallback'
26. **src/core/lazy-loader.ts:156** - Cannot find name 'requestIdleCallback'
27. **src/core/task-output-tool.ts:213** - Parameter 'l' implicitly has 'any' type
28. **src/core/task-output-tool.ts:230** - Parameter 'l' implicitly has 'any' type

## Core/Task-Output (3 errors)

29. **src/core/task-output-tool.ts:255** - Type 'number | null' not assignable to 'number | undefined'
30. **src/core/task-output-tool.ts:321** - Parameter 'l' implicitly has 'any' type
31. **src/core/task-output-tool.ts:342** - Parameter 'l' implicitly has 'any' type

## Hooks Module (4 errors)

32. **src/hooks/hook-manager.ts:371** - Parameter 'h' implicitly has 'any' type
33. **src/hooks/hook-manager.ts:378** - Parameter 'h' implicitly has 'any' type
34. **src/hooks/hook-manager.ts:383** - Parameter 'h' implicitly has 'any' type
35. **src/hooks/hook-manager.ts:384** - Parameter 'h' implicitly has 'any' type

## MCP-Cloud Module (4 errors)

36. **src/mcp-cloud/examples.ts:471** - Property 'search' is private
37. **src/mcp-cloud/examples.ts:471** - Expression is not callable
38. **src/mcp-cloud/index.ts:24** - Duplicate identifier 'search'
39. **src/mcp-cloud/index.ts:113** - Duplicate identifier 'search'

## MCP-Cloud/Registry (1 error)

40. **src/mcp-cloud/registry/service-fetcher.ts:105** - Type 'unknown' not assignable to 'T'

## Orchestrator Module (1 error)

41. **src/orchestrator/lifecycle.ts:329** - TaskCondition type mismatch

## Utils Module (3 errors)

42. **src/utils/context/multi-head-compressor.ts:108** - Unused '@ts-expect-error' directive
43. **src/utils/context/multi-head-compressor.ts:122** - Unused '@ts-expect-error' directive
44. **src/utils/json-config.ts:94** - Expression is not callable

## Summary by Category

- Commands: 9 errors
- Config: 7 errors
- Core: 14 errors
- Hooks: 4 errors
- MCP-Cloud: 5 errors
- Orchestrator: 1 error
- Utils: 3 errors
- Context: 1 error

## Priority Fixes

### High Priority (Breaking Issues)
1. Missing module exports (teleport, context)
2. Duplicate identifiers (mcp-cloud search)
3. Missing dependencies (qrcode)

### Medium Priority (Type Safety)
1. Implicit any types (hooks, core)
2. Null/undefined handling (config, core)
3. Type mismatches (config, orchestrator)

### Low Priority (Code Quality)
1. Unused ts-expect-error directives
2. Non-callable expressions
