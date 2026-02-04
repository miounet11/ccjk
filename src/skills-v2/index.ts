/**
 * CCJK Skills V2 - Cognitive Protocol System
 *
 * A revolutionary approach to AI skills that focuses on changing
 * how AI thinks rather than providing information.
 *
 * Core Philosophy:
 * - Skills are cognitive protocols, not knowledge bases
 * - Forced reasoning chains: L1 error → L3 constraints → L2 design
 * - Three-layer architecture: Language (L1), Design (L2), Domain (L3)
 */

// Parser
export {
  createSkill,
  Parser,
} from './parser.js'

// Router
export {
  createRouter,
  Router,
} from './router.js'

// Runtime
export {
  createRuntime,
  Runtime,
} from './runtime.js'

// Types
export * from './types.js'

// Re-export main interfaces for convenience
export type {
  CognitiveProtocol,
  ExecutionResult,
  Layer,
  ReasoningChain,
  RouterMatch,
  Skill,
} from './types.js'

/**
 * Example usage:
 *
 * ```typescript
 * import {
 *   Parser,
 *   Runtime,
 *   Router,
 *   createSkill,
 *   createRuntime,
 *   createRouter,
 * } from './skills-v2';
 *
 * // 1. Define a cognitive protocol
 * const dsl = `
 * protocol "Error Handling" {
 *   coreQuestion: "How should errors be handled in this context?"
 *
 *   layer L1 {
 *     transform "throw new Error" -> "Result<T, E>"
 *     rule "Avoid exceptions in functional code"
 *   }
 *
 *   layer L3 {
 *     constraint "All errors must be typed"
 *     validation "error instanceof KnownError"
 *     message "Use typed errors for better handling"
 *   }
 *
 *   layer L2 {
 *     pattern "Result Type"
 *     implementation "Use Result<T, E> for all fallible operations"
 *     examples: ["parse() -> Result<AST, ParseError>"]
 *   }
 *
 *   trace up {
 *     steps: ["Identify error type", "Map to domain error", "Wrap in result"]
 *   }
 *
 *   trace down {
 *     steps: ["Extract error info", "Format for user", "Log for debugging"]
 *   }
 * }
 * `;
 *
 * // 2. Parse the protocol
 * const parser = new Parser(dsl);
 * const ast = parser.parse();
 * const skill = createSkill(ast, dsl);
 *
 * // 3. Create runtime and router
 * const runtime = createRuntime({
 *   enforceReasoningChain: true,
 *   outputFormat: 'structured',
 * });
 *
 * const router = createRouter({
 *   minConfidence: 0.6,
 *   maxResults: 2,
 * });
 *
 * // 4. Register skill
 * router.register(skill);
 *
 * // 5. Execute skill
 * const result = await runtime.execute(skill, {
 *   code: "async function parse() { throw new Error('Invalid syntax'); }",
 * });
 *
 * console.log(result.reasoningChain);
 * // {
 * //   layer1: "Language level: 1 patterns detected, 0 issues found",
 * //   layer3: "Domain constraints: All constraints satisfied",
 * //   layer2: "Design pattern: Result Type applied"
 * // }
 * ```
 */
