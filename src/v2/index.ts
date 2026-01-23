/**
 * CCJK 2.0 - Main Entry Point
 * 
 * This is the central entry point for all CCJK v2.0 modules.
 * It provides a unified API for importing and using all v2 features.
 *
 * @module ccjk-v2
 * @version 2.0.0
 */

// ============================================================================
// Core Modules
// ============================================================================

/**
 * Hook Enforcement System
 * 
 * Provides L1/L2/L3 enforcement levels for Hook execution.
 * - L1: Recommended (can be bypassed)
 * - L2: Strongly Recommended (requires reason)
 * - L3: Critical (cannot be bypassed in strict mode)
 * 
 * @example
 * ```typescript
 * import { HookEnforcer, EnforcementLevel } from '@ccjk/v2/hooks';
 * 
 * const enforcer = new HookEnforcer();
 * await enforcer.register({
 *   id: 'critical-hook',
 *   name: 'Critical Hook',
 *   level: EnforcementLevel.L3_CRITICAL,
 *   matcher: /rust|cargo/i,
 *   command: 'load-rust-skills'
 * });
 * ```
 */
export * from './hooks-v2/index.js';

/**
 * Brain System - Three-Layer Traceability
 * 
 * Implements automatic error tracing:
 * - L1: Surface error classification
 * - L3: Domain constraint identification
 * - L2: Design pattern matching
 * 
 * @example
 * ```typescript
 * import { TraceabilityAnalyzer } from '@ccjk/v2/brain';
 * 
 * const analyzer = new TraceabilityAnalyzer();
 * const analysis = await analyzer.analyze(error, { domain: 'web' });
 * console.log(analysis.chain.recommendedSolution);
 * ```
 */
export * from './brain-v2/index.js';

/**
 * Skills Cognitive Protocol DSL
 * 
 * Skills are cognitive protocols that change HOW AI thinks.
 * Features:
 * - JSON-based DSL parser
 * - Three-layer execution (L1→L3→L2)
 * - Reasoning chain enforcement
 * - Keyword-based routing
 * - Hot-reload capable
 * 
 * @example
 * ```typescript
 * import { Parser, Runtime, Router } from '@ccjk/v2/skills';
 * import { ERROR_HANDLING_PROTOCOL } from '@ccjk/v2/skills/examples';
 * 
 * const skill = createSkill(ERROR_HANDLING_PROTOCOL);
 * const runtime = createRuntime();
 * const result = await runtime.execute(skill, context);
 * ```
 */
export * from './skills-v2/index.js';

/**
 * Agents Network - Redis Communication Bus
 * 
 * Distributed agent communication system:
 * - Request-Response messaging
 * - Pub-Sub broadcasts
 * - Priority queues
 * - Message routing
 * - Agent registry with专业技能
 * 
 * @example
 * ```typescript
 * import { AgentRegistry, MessageBus } from '@ccjk/v2/agents';
 * 
 * const registry = new AgentRegistry();
 * await registry.register({
 *   agentId: 'code-agent',
 *   domains: ['code-generation', 'refactoring'],
 *   capabilities: ['typescript', 'rust', 'python']
 * });
 * 
 * const bus = new MessageBus();
 * await bus.send('test-agent', {
 *   type: 'request',
 *   payload: { task: 'generate-code' }
 * });
 * ```
 */
export * from './agents-v2/index.js';

/**
 * Dynamic Workflows - AI Generator
 * 
 * AI-driven workflow generation:
 * - Natural language to workflow
 * - Fragment-based composition
 * - 27+ reusable fragments
 * - Validation and optimization
 * - Anthropic Claude integration
 * 
 * @example
 * ```typescript
 * import { WorkflowGenerator, FragmentLibrary } from '@ccjk/v2/workflow';
 * 
 * const generator = new WorkflowGenerator();
 * const workflow = await generator.generate(
 *   'Create a TypeScript project with testing',
 *   { language: 'typescript', framework: 'vitest' }
 * );
 * ```
 */
export * from './workflow-v2/index.js';

/**
 * Actionbook - Precomputation Engine
 * 
 * Ultra-fast code analysis with precomputation:
 * - AST parsing and caching
 * - Symbol extraction
 * - Call graph generation
 * - Complexity analysis
 * - <10ms query latency
 * 
 * @example
 * ```typescript
 * import { ActionbookEngine } from '@ccjk/v2/actionbook';
 * 
 * const engine = new ActionbookEngine();
 * await engine.indexFile('src/main.ts');
 * 
 * const ast = await engine.queryAST('src/main.ts');
 * const symbols = await engine.querySymbols('src/main.ts');
 * ```
 */
export * from './actionbook/index.js';

// ============================================================================
// Version Info
// ============================================================================

export const CCJK_V2_VERSION = '2.0.0-alpha.1';
export const CCJK_V2_BUILD_DATE = new Date().toISOString();

/**
 * Get information about CCJK v2.0
 */
export function getInfo() {
  return {
    version: CCJK_V2_VERSION,
    buildDate: CCJK_V2_BUILD_DATE,
    modules: [
      'hooks-v2',
      'brain-v2',
      'skills-v2',
      'agents-v2',
      'workflow-v2',
      'actionbook',
    ],
    features: [
      'Hook enforcement (L1/L2/L3)',
      'Three-layer traceability',
      'Cognitive protocol DSL',
      'Redis agent communication',
      'AI workflow generation',
      'Actionbook precomputation',
    ],
  };
}

// ============================================================================
// Default Exports
// ============================================================================

export default {
  version: CCJK_V2_VERSION,
  getInfo,
};
