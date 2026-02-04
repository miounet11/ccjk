/**
 * CCJK Skills V2 - Example Cognitive Protocols
 *
 * This file contains example DSL definitions demonstrating the
 * cognitive protocol system in action.
 */

/**
 * Example 1: Error Handling Cognitive Protocol
 *
 * This protocol changes how AI thinks about error handling by enforcing
 * typed errors over exceptions and result types over try-catch.
 */
export const ERROR_HANDLING_PROTOCOL = JSON.stringify({
  name: 'Error Handling',
  coreQuestion: 'How should errors be handled in this context?',
  layers: [
    {
      layer: 'L1',
      transforms: [
        {
          from: 'throw new Error',
          to: 'Result<T, E>',
          rule: 'Avoid exceptions in functional code',
        },
      ],
    },
    {
      layer: 'L3',
      constraints: [
        {
          condition: 'All errors must be typed',
          validation: 'error instanceof KnownError',
          message: 'Use typed errors for better handling',
        },
      ],
    },
    {
      layer: 'L2',
      patterns: [
        {
          name: 'Result Type',
          implementation: 'Use Result<T, E> for all fallible operations',
          examples: [
            'parse() -> Result<AST, ParseError>',
            'fetch() -> Result<Data, NetworkError>',
          ],
        },
      ],
    },
  ],
  traces: [
    {
      direction: 'up',
      steps: ['Identify error type', 'Map to domain error', 'Wrap in result'],
    },
    {
      direction: 'down',
      steps: ['Extract error info', 'Format for user', 'Log for debugging'],
    },
  ],
  references: {
    'rust-result': 'https://doc.rust-lang.org/std/result/',
    'ts-result': 'https://github.com/supermacro/neverthrow',
  },
})

/**
 * Example 2: Async Programming Cognitive Protocol
 *
 * This protocol enforces disciplined async programming with proper
 * error handling and resource cleanup.
 */
export const ASYNC_PROGRAMMING_PROTOCOL = JSON.stringify({
  name: 'Async Programming',
  coreQuestion: 'How should async operations be structured?',
  layers: [
    {
      layer: 'L1',
      transforms: [
        {
          from: 'async/await',
          to: 'Task<T>',
          rule: 'Always handle async errors explicitly',
        },
      ],
    },
    {
      layer: 'L3',
      constraints: [
        {
          condition: 'All async operations must have timeout',
          validation: 'operation.timeout !== undefined',
          message: 'Async operations without timeout can hang forever',
        },
      ],
    },
    {
      layer: 'L2',
      patterns: [
        {
          name: 'Task-based Async',
          implementation: 'Use Task<T> monad for composable async operations',
          examples: [
            'fetchData() -> Task<Data>',
            'saveRecord() -> Task<void>',
          ],
        },
      ],
    },
  ],
  traces: [
    {
      direction: 'up',
      steps: ['Identify async boundary', 'Determine timeout strategy', 'Select error handling'],
    },
    {
      direction: 'down',
      steps: ['Setup timeout', 'Handle promise rejection', 'Cleanup resources'],
    },
  ],
  references: {
    'fp-ts-task': 'https://gcanti.github.io/fp-ts/modules/Task.ts.html',
    'task-parallel': 'https://github.com/fluture-js/Fluture',
  },
})

/**
 * Example 3: Type Safety Cognitive Protocol
 *
 * This protocol enforces strict type safety and prevents runtime type errors.
 */
export const TYPE_SAFETY_PROTOCOL = JSON.stringify({
  name: 'Type Safety',
  coreQuestion: 'How can we ensure type safety at compile time?',
  layers: [
    {
      layer: 'L1',
      transforms: [
        {
          from: 'any',
          to: 'unknown',
          rule: 'Never use \'any\' type',
        },
        {
          from: 'as',
          to: 'type guards',
          rule: 'Avoid unsafe type assertions',
        },
      ],
    },
    {
      layer: 'L3',
      constraints: [
        {
          condition: 'All user input must be validated',
          validation: 'typeof input === \'string\' || isUserInput(input)',
          message: 'Unvalidated user input is a security risk',
        },
      ],
    },
    {
      layer: 'L2',
      patterns: [
        {
          name: 'Type Guards & Validation',
          implementation: 'Use discriminated unions and type guards for runtime validation',
          examples: [
            'isUserInput(input: unknown): input is UserInput',
            'parseInput(data: unknown): Result<Parsed, ParseError>',
          ],
        },
      ],
    },
  ],
  traces: [
    {
      direction: 'up',
      steps: ['Identify unknown types', 'Define type guards', 'Add validation layer'],
    },
    {
      direction: 'down',
      steps: ['Validate input', 'Narrow types', 'Ensure exhaustiveness'],
    },
  ],
  references: {
    'ts-type-guards': 'https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types',
    'io-ts': 'https://github.com/gcanti/io-ts',
  },
})

/**
 * Example 4: Testing Cognitive Protocol
 *
 * This protocol enforces TDD and comprehensive testing strategies.
 */
export const TESTING_PROTOCOL = JSON.stringify({
  name: 'Testing',
  coreQuestion: 'How should we test this code?',
  layers: [
    {
      layer: 'L1',
      transforms: [
        {
          from: 'test',
          to: 'describe/it/expect',
          rule: 'Write tests before implementation',
        },
      ],
    },
    {
      layer: 'L3',
      constraints: [
        {
          condition: 'All code paths must be tested',
          validation: 'coverage.lines > 80',
          message: 'Untested code is broken code',
        },
      ],
    },
    {
      layer: 'L2',
      patterns: [
        {
          name: 'Test-Driven Development',
          implementation: 'Follow Red-Green-Refactor cycle',
          examples: [
            'Red: Write failing test',
            'Green: Make test pass',
            'Refactor: Improve code',
          ],
        },
      ],
    },
  ],
  traces: [
    {
      direction: 'up',
      steps: ['Identify behavior', 'Write test case', 'Run test (should fail)'],
    },
    {
      direction: 'down',
      steps: ['Implement minimal code', 'Run test (should pass)', 'Refactor if needed'],
    },
  ],
  references: {
    'tdd-best-practices': 'https://martinfowler.com/bliki/TestDrivenDevelopment.html',
    'testing-library': 'https://testing-library.com/docs/guiding-principles/',
  },
})

/**
 * Example 5: API Design Cognitive Protocol
 *
 * This protocol enforces RESTful API design principles.
 */
export const API_DESIGN_PROTOCOL = JSON.stringify({
  name: 'API Design',
  coreQuestion: 'How should this API be structured?',
  layers: [
    {
      layer: 'L1',
      transforms: [
        {
          from: 'GET /create-user',
          to: 'POST /users',
          rule: 'Use correct HTTP methods',
        },
        {
          from: 'POST /delete-user',
          to: 'DELETE /users/:id',
          rule: 'Use correct HTTP methods',
        },
      ],
    },
    {
      layer: 'L3',
      constraints: [
        {
          condition: 'All endpoints must be idempotent where appropriate',
          validation: 'method === \'GET\' || method === \'HEAD\' || method === \'PUT\' || method === \'DELETE\'',
          message: 'Non-idempotent operations must use POST or PATCH',
        },
      ],
    },
    {
      layer: 'L2',
      patterns: [
        {
          name: 'RESTful Design',
          implementation: 'Follow REST principles for resource-based APIs',
          examples: [
            'GET /users (list)',
            'GET /users/:id (detail)',
            'POST /users (create)',
            'PUT /users/:id (update)',
            'DELETE /users/:id (delete)',
          ],
        },
      ],
    },
  ],
  traces: [
    {
      direction: 'up',
      steps: ['Identify resources', 'Determine operations', 'Map to HTTP methods'],
    },
    {
      direction: 'down',
      steps: ['Define routes', 'Set status codes', 'Add error responses'],
    },
  ],
  references: {
    'rest-api-design': 'https://restfulapi.net/',
    'http-status-codes': 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status',
  },
})

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
 *   ERROR_HANDLING_PROTOCOL,
 *   ASYNC_PROGRAMMING_PROTOCOL,
 * } from './skills-v2';
 *
 * // Parse and register skills
 * const parser = new Parser(ERROR_HANDLING_PROTOCOL);
 * const errorHandlingSkill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL);
 *
 * const asyncParser = new Parser(ASYNC_PROGRAMMING_PROTOCOL);
 * const asyncSkill = createSkill(asyncParser.parse(), ASYNC_PROGRAMMING_PROTOCOL);
 *
 * // Create router and register skills
 * const router = createRouter();
 * router.register(errorHandlingSkill);
 * router.register(asyncSkill);
 *
 * // Find relevant skills for a query
 * const matches = router.findMatches("How to handle async errors?");
 *
 * // Execute the best match
 * const runtime = createRuntime({ enforceReasoningChain: true });
 * const result = await runtime.execute(matches[0].skill, {
 *   code: "async function fetchData() { throw new Error('Network error'); }"
 * });
 *
 * console.log(result.reasoningChain);
 * // L1: "Language level: async patterns detected, 0 issues found"
 * // L3: "Domain constraints: timeout constraint violated"
 * // L2: "Design pattern: Task-based async applied (Constraint violation required pattern adjustment)"
 * ```
 */
