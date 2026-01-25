# Brain Module Test Suite

## Overview

Complete test suite for the CCJK Brain module covering orchestration, agent dispatching, skill hot-reloading, and thinking mode functionality.

## Test Coverage

### 📁 orchestrator.test.ts (33 tests)
Tests for the BrainOrchestrator class that coordinates multiple AI agents.

**Normal Flow Tests:**
- ✓ Should dispatch tasks to correct agents
- ✓ Should create orchestration plan from task
- ✓ Should emit events during execution lifecycle
- ✓ Should register and unregister agents
- ✓ Should return orchestration result with metrics
- ✓ Should get current orchestrator state

**Agent Failure Handling:**
- ✓ Should handle agent failures gracefully
- ✓ Should track failed tasks in result
- ✓ Should include errors in orchestration result

**Task Priority:**
- ✓ Should respect task priorities (critical, normal, low)
- ✓ Should handle critical task failures appropriately

**Timeout Handling:**
- ✓ Should timeout long-running tasks
- ✓ Should use default timeout when not specified

**Orchestration Control:**
- ✓ Should pause/resume/cancel orchestration
- ✓ Should terminate all agents

**Fork Context (v3.8):**
- ✓ Should execute task in fork context
- ✓ Should throw error when fork context disabled
- ✓ Should cancel fork context
- ✓ Should get fork statistics and active forks

**Parallel Execution:**
- ✓ Should execute parallel forks
- ✓ Should throw error when dispatcher disabled

**Concurrent Execution:**
- ✓ Should handle multiple concurrent task executions
- ✓ Should respect max concurrent tasks limit

**Edge Cases:**
- ✓ Should handle empty input, no capabilities, many dependencies
- ✓ Should handle orchestrator with zero max tasks
- ✓ Should handle rapid pause/resume cycles

### 📁 agent-dispatcher.test.ts (43 tests)
Tests for the AgentDispatcher class that routes tasks to appropriate agents.

**Normal Flow:**
- ✓ Should create dispatcher with default options
- ✓ Should register/unregister cloud agents
- ✓ Should dispatch task based on skill configuration
- ✓ Should build dispatch config from skill file
- ✓ Should map agent types to roles correctly
- ✓ Should return undefined for unknown agent types
- ✓ Should get dispatcher statistics

**Parallel Dispatch:**
- ✓ Should dispatch multiple tasks in parallel
- ✓ Should respect maxParallel limit
- ✓ Should stop on error when configured
- ✓ Should aggregate results when configured

**Agent Selection:**
- ✓ Should select agent from cache when available
- ✓ Should create generic agent when cloud agent not found
- ✓ Should filter agents by criteria (capabilities, type, tool access)

**Tool Filtering:**
- ✓ Should extract disallowed tools from metadata
- ✓ Should return undefined when allowed_tools specified
- ✓ Should apply tool filtering to dispatch config

**Cache Management:**
- ✓ Should clear expired cached agents
- ✓ Should cleanup all resources

**Error Handling:**
- ✓ Should handle dispatch failure gracefully
- ✓ Should handle timeout during execution
- ✓ Should return error when no suitable agent found
- ✓ Should handle parallel execution errors

**Global Dispatcher:**
- ✓ Should get/create global dispatcher
- ✓ Should reset global dispatcher

**Concurrent Dispatch:**
- ✓ Should handle multiple concurrent dispatches
- ✓ Should update agent metrics after execution

**Edge Cases:**
- ✓ Should handle empty parallel execution
- ✓ Should handle skill with no agent specified
- ✓ Should handle skill with inherit context mode
- ✓ Should generate unique session IDs

### 📁 skill-hot-reload.test.ts (35 tests)
Tests for the SkillHotReload class that watches and reloads skill files automatically.

**Normal Flow:**
- ✓ Should create hot reload instance with default/custom options
- ✓ Should start/stop/restart watching for skill files
- ✓ Should dynamically add/remove watch paths
- ✓ Should get hot reload statistics
- ✓ Should get watched paths

**Event Handling:**
- ✓ Should emit add/change/unlink events
- ✓ Should emit ready event when watcher is ready
- ✓ Should trigger callback for events

**Error Handling:**
- ✓ Should emit error event on parse failure
- ✓ Should handle watcher errors
- ✓ Should handle stop when not running
- ✓ Should not start if already running

**File Detection:**
- ✓ Should detect SKILL.md and skill.md files
- ✓ Should detect .md files in skills directory
- ✓ Should ignore non-skill files

**Debounce:**
- ✓ Should debounce rapid file changes
- ✓ Should handle changes to different files independently

**Singleton/Factory:**
- ✓ Should get singleton instance
- ✓ Should create new instances with factory
- ✓ Should reset singleton instance
- ✓ Should start/stop with utility functions
- ✓ Should get stats with utility function

**Configuration:**
- ✓ Should use custom watch paths and ignore patterns
- ✓ Should configure auto-register behavior
- ✓ Should configure recursive watching

**Edge Cases:**
- ✓ Should handle no watch paths
- ✓ Should handle paths before starting
- ✓ Should handle manual file scan

### 📁 thinking-mode.test.ts (62 tests)
Tests for the ThinkingModeManager that manages Claude Code CLI thinking mode.

**Normal Flow:**
- ✓ Should create manager with default config
- ✓ Should load configuration from file
- ✓ Should merge defaults when config missing fields
- ✓ Should get current config
- ✓ Should enable/disable thinking mode
- ✓ Should get budget tokens and sub-agent reduction factor
- ✓ Should check if sub-agents inherit thinking mode
- ✓ Should get sub-agent budget
- ✓ Should check if always using thinking mode
- ✓ Should get thinking mode status

**Budget Token Management:**
- ✓ Should set valid budget tokens
- ✓ Should reject tokens below minimum (1000)
- ✓ Should reject tokens above maximum (200,000)
- ✓ Should accept boundary values
- ✓ Should calculate sub-agent budget correctly
- ✓ Should floor sub-agent budget calculation

**Sub-Agent Reduction:**
- ✓ Should set valid reduction factor (0.1-1.0)
- ✓ Should reject values outside range
- ✓ Should accept boundary values
- ✓ Should handle high precision values

**Model Support:**
- ✓ Should identify supported models (Opus 4.5+, Sonnet variants)
- ✓ Should identify unsupported models
- ✓ Should support partial model matching

**CLI Flags Generation:**
- ✓ Should generate flags when enabled
- ✓ Should return empty array when disabled
- ✓ Should include budget tokens in flags

**Configuration Management:**
- ✓ Should save configuration
- ✓ Should reset to defaults
- ✓ Should merge partial configuration

**Utility Functions:**
- ✓ Should get/reset global thinking manager
- ✓ Should determine when to use thinking mode
- ✓ Should not use thinking mode when disabled
- ✓ Should always use thinking mode when configured
- ✓ Should check model support
- ✓ Should create thinking settings

**Validation:**
- ✓ Should validate correct configuration
- ✓ Should validate budget tokens and reduction out of range
- ✓ Should return multiple validation errors
- ✓ Should validate empty configuration

**Legacy Migration:**
- ✓ Should migrate legacy settings (thinkingModeEnabled, thinkingBudget)
- ✓ Should use defaults when legacy settings incomplete
- ✓ Should return null when no legacy settings

**Status Display:**
- ✓ Should show enabled/disabled status summary
- ✓ Should show Chinese summary when i18n is zh-CN

**Edge Cases:**
- ✓ Should handle zero/negative/large values gracefully
- ✓ Should handle rounding edge cases
- ✓ Should handle boundary conditions

## Test Statistics

- **Total Test Files:** 4
- **Total Tests:** ~173 tests
- **Test Framework:** Vitest
- **Mock Strategy:** vi.mock for dependencies
- **Coverage Areas:** Normal flows, error handling, edge cases, concurrent scenarios

## Running Tests

Run all brain tests:
```bash
npx vitest run src/brain/__tests__/
```

Run specific test file:
```bash
npx vitest run src/brain/__tests__/orchestrator.test.ts
```

Watch mode for development:
```bash
npx vitest watch src/brain/__tests__/
```

## Key Testing Features

1. **Comprehensive Coverage:** Tests cover normal flows, boundary conditions, error scenarios, and concurrent operations
2. **Mock Strategy:** Heavy use of vi.mock to isolate units and avoid external dependencies
3. **Type Safety:** Full TypeScript types with proper casting for test data
4. **Event Testing:** Comprehensive event emitter testing for lifecycle events
5. **Async Testing:** Proper handling of async operations and Promises
6. **Singleton Testing:** Tests for singleton patterns and global state management
7. **Configuration Testing:** Extensive config loading/saving/migration tests

## Notes

- Some tests may fail in environments without proper file system mocking (e.g., writing to /test directory)
- The test suite is designed to be independent and not require external services
- Mock data is used throughout to ensure predictable test behavior
- Tests follow the AAA pattern (Arrange, Act, Assert) for clarity
