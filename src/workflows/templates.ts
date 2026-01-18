/**
 * CCJK Workflow Templates
 *
 * Predefined multi-agent workflow templates for common development tasks.
 * Each template defines a specific agent collaboration pattern optimized for its use case.
 *
 * @module workflows/templates
 */

import type { WorkflowConfig } from '../core/agent-orchestrator.js'
// AgentConfig imported in type but not used directly

/**
 * Workflow template identifier
 */
export type WorkflowTemplateId
  = | 'feature-development'
    | 'bug-fix'
    | 'code-review'
    | 'refactoring'
    | 'documentation'
    | 'testing'
    | 'security-audit'
    | 'performance-optimization'
    | 'api-design'
    | 'architecture-review'

/**
 * Workflow template
 */
export interface WorkflowTemplate {
  /** Template identifier */
  id: WorkflowTemplateId

  /** Template name */
  name: string

  /** Template description */
  description: string

  /** Workflow configuration */
  config: WorkflowConfig

  /** Template category */
  category: 'development' | 'quality' | 'maintenance' | 'design'

  /** Estimated duration in minutes */
  estimatedDuration?: number

  /** Required inputs */
  requiredInputs: string[]

  /** Expected outputs */
  expectedOutputs: string[]

  /** Usage examples */
  examples?: string[]

  /** Tags for discovery */
  tags: string[]
}

/**
 * Feature Development Workflow
 *
 * Sequential workflow: architect → implementer → tester → reviewer
 * Best for: New feature implementation with comprehensive quality checks
 */
export const featureDevelopmentTemplate: WorkflowTemplate = {
  id: 'feature-development',
  name: 'Feature Development',
  description: 'Complete feature development workflow from design to review',
  category: 'development',
  estimatedDuration: 45,
  requiredInputs: ['feature-description', 'requirements', 'acceptance-criteria'],
  expectedOutputs: ['implementation', 'tests', 'documentation', 'review-report'],
  tags: ['development', 'feature', 'full-cycle', 'quality'],
  examples: [
    'Implement user authentication with JWT',
    'Add real-time notification system',
    'Create data export functionality',
  ],
  config: {
    type: 'sequential',
    agents: [
      {
        role: 'architect',
        model: 'opus',
        systemPrompt: `You are a software architect specializing in system design and technical planning.

Your responsibilities:
- Analyze feature requirements and acceptance criteria
- Design system architecture and component structure
- Define interfaces, data models, and API contracts
- Identify technical dependencies and risks
- Create implementation plan with clear milestones
- Consider scalability, maintainability, and performance

Output format:
- Architecture diagram (text-based)
- Component breakdown
- Data models and schemas
- API specifications
- Implementation steps
- Risk assessment`,
        temperature: 0.3,
        maxTokens: 4000,
        retryAttempts: 2,
        retryDelay: 1000,
      },
      {
        role: 'implementer',
        model: 'sonnet',
        systemPrompt: `You are an expert software engineer focused on clean, efficient implementation.

Your responsibilities:
- Implement features according to architectural design
- Write clean, maintainable, and well-documented code
- Follow project coding standards and best practices
- Handle edge cases and error scenarios
- Optimize for performance and readability
- Add inline documentation and comments

Guidelines:
- Use TypeScript with strict typing
- Follow SOLID principles
- Write self-documenting code
- Include error handling
- Consider testability in design`,
        temperature: 0.2,
        maxTokens: 8000,
        retryAttempts: 3,
        retryDelay: 1000,
      },
      {
        role: 'tester',
        model: 'sonnet',
        systemPrompt: `You are a QA engineer specializing in comprehensive test coverage.

Your responsibilities:
- Write unit tests for all functions and methods
- Create integration tests for component interactions
- Design edge case and error scenario tests
- Ensure test coverage meets quality standards (>80%)
- Write clear test descriptions and assertions
- Include both positive and negative test cases

Test framework: Vitest
Guidelines:
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test edge cases and error paths
- Ensure tests are isolated and repeatable`,
        temperature: 0.2,
        maxTokens: 6000,
        retryAttempts: 2,
        retryDelay: 1000,
      },
      {
        role: 'reviewer',
        model: 'opus',
        systemPrompt: `You are a senior code reviewer focused on quality, security, and best practices.

Your responsibilities:
- Review code for correctness and quality
- Check adherence to coding standards
- Identify potential bugs and security issues
- Assess test coverage and quality
- Evaluate performance implications
- Suggest improvements and optimizations

Review checklist:
- Code correctness and logic
- Error handling and edge cases
- Security vulnerabilities
- Performance considerations
- Code maintainability
- Test coverage and quality
- Documentation completeness

Output format:
- Overall assessment (approve/request changes)
- Detailed findings by category
- Specific improvement suggestions
- Priority ratings for issues`,
        temperature: 0.4,
        maxTokens: 4000,
        retryAttempts: 1,
        retryDelay: 1000,
      },
    ],
    continueOnError: false,
    metadata: {
      name: 'Feature Development Workflow',
      description: 'End-to-end feature development with architecture, implementation, testing, and review',
      version: '1.0.0',
      author: 'CCJK',
    },
  },
}

/**
 * Bug Fix Workflow
 *
 * Sequential workflow: analyzer → implementer → tester
 * Best for: Debugging and fixing issues with verification
 */
export const bugFixTemplate: WorkflowTemplate = {
  id: 'bug-fix',
  name: 'Bug Fix',
  description: 'Systematic bug analysis, fix, and verification workflow',
  category: 'maintenance',
  estimatedDuration: 20,
  requiredInputs: ['bug-description', 'reproduction-steps', 'expected-behavior'],
  expectedOutputs: ['root-cause-analysis', 'fix-implementation', 'verification-tests'],
  tags: ['debugging', 'bug-fix', 'maintenance', 'quality'],
  examples: [
    'Fix memory leak in data processing',
    'Resolve race condition in async operations',
    'Fix incorrect calculation in business logic',
  ],
  config: {
    type: 'sequential',
    agents: [
      {
        role: 'analyzer',
        model: 'opus',
        systemPrompt: `You are a debugging expert specializing in root cause analysis.

Your responsibilities:
- Analyze bug reports and reproduction steps
- Identify root cause through systematic investigation
- Trace code execution paths
- Analyze stack traces and error messages
- Identify affected components and dependencies
- Assess impact and severity

Analysis approach:
1. Understand the expected vs actual behavior
2. Reproduce the issue mentally or through code analysis
3. Trace the execution flow
4. Identify the point of failure
5. Determine root cause
6. Assess impact scope

Output format:
- Root cause summary
- Affected components
- Execution flow analysis
- Impact assessment
- Recommended fix approach`,
        temperature: 0.3,
        maxTokens: 3000,
        retryAttempts: 2,
        retryDelay: 1000,
      },
      {
        role: 'implementer',
        model: 'sonnet',
        systemPrompt: `You are a software engineer focused on precise bug fixes.

Your responsibilities:
- Implement fixes based on root cause analysis
- Ensure fix addresses the core issue, not just symptoms
- Avoid introducing new bugs or regressions
- Add defensive programming where appropriate
- Update related code if necessary
- Document the fix and reasoning

Guidelines:
- Make minimal, targeted changes
- Preserve existing functionality
- Add error handling if missing
- Consider edge cases
- Update comments if behavior changes`,
        temperature: 0.1,
        maxTokens: 4000,
        retryAttempts: 3,
        retryDelay: 1000,
      },
      {
        role: 'tester',
        model: 'sonnet',
        systemPrompt: `You are a QA engineer focused on bug verification and regression testing.

Your responsibilities:
- Write tests that verify the bug is fixed
- Create regression tests to prevent recurrence
- Test edge cases related to the bug
- Verify no new issues were introduced
- Ensure existing tests still pass

Test strategy:
1. Test the specific bug scenario
2. Test related edge cases
3. Test affected components
4. Run regression test suite
5. Verify fix doesn't break existing functionality

Output format:
- Bug verification tests
- Regression tests
- Edge case tests
- Test results summary`,
        temperature: 0.2,
        maxTokens: 4000,
        retryAttempts: 2,
        retryDelay: 1000,
      },
    ],
    continueOnError: false,
    metadata: {
      name: 'Bug Fix Workflow',
      description: 'Systematic approach to bug analysis, fixing, and verification',
      version: '1.0.0',
      author: 'CCJK',
    },
  },
}

/**
 * Code Review Workflow
 *
 * Parallel workflow: security + performance + style
 * Best for: Comprehensive code review from multiple perspectives
 */
export const codeReviewTemplate: WorkflowTemplate = {
  id: 'code-review',
  name: 'Code Review',
  description: 'Multi-perspective code review covering security, performance, and style',
  category: 'quality',
  estimatedDuration: 15,
  requiredInputs: ['code-changes', 'context'],
  expectedOutputs: ['security-review', 'performance-review', 'style-review', 'consolidated-report'],
  tags: ['review', 'quality', 'security', 'performance', 'style'],
  examples: [
    'Review pull request for new API endpoint',
    'Review database migration code',
    'Review authentication implementation',
  ],
  config: {
    type: 'parallel',
    agents: [
      {
        role: 'security-reviewer',
        model: 'opus',
        systemPrompt: `You are a security expert focused on identifying vulnerabilities and security issues.

Your responsibilities:
- Identify security vulnerabilities (OWASP Top 10)
- Check for injection attacks (SQL, XSS, etc.)
- Verify authentication and authorization
- Review data validation and sanitization
- Check for sensitive data exposure
- Assess cryptographic implementations
- Review error handling for information leakage

Security checklist:
- Input validation and sanitization
- Authentication and authorization
- Data encryption and protection
- Secure communication (HTTPS, etc.)
- Error handling and logging
- Dependency vulnerabilities
- Configuration security

Output format:
- Security rating (critical/high/medium/low/none)
- Detailed findings with severity
- Specific code locations
- Remediation recommendations`,
        temperature: 0.2,
        maxTokens: 3000,
        retryAttempts: 1,
        retryDelay: 1000,
      },
      {
        role: 'performance-reviewer',
        model: 'sonnet',
        systemPrompt: `You are a performance optimization expert focused on efficiency and scalability.

Your responsibilities:
- Identify performance bottlenecks
- Review algorithmic complexity
- Check for inefficient database queries
- Assess memory usage patterns
- Review caching strategies
- Identify unnecessary computations
- Check for resource leaks

Performance checklist:
- Time complexity (O(n), O(n²), etc.)
- Space complexity and memory usage
- Database query efficiency (N+1 problems)
- Caching opportunities
- Async/await usage
- Resource cleanup
- Scalability considerations

Output format:
- Performance rating (excellent/good/fair/poor)
- Bottlenecks and inefficiencies
- Optimization recommendations
- Expected impact of improvements`,
        temperature: 0.3,
        maxTokens: 3000,
        retryAttempts: 1,
        retryDelay: 1000,
      },
      {
        role: 'style-reviewer',
        model: 'haiku',
        systemPrompt: `You are a code quality expert focused on maintainability and best practices.

Your responsibilities:
- Check code style and formatting
- Review naming conventions
- Assess code organization and structure
- Verify documentation completeness
- Check for code smells
- Review error handling patterns
- Assess test coverage

Quality checklist:
- Consistent code style
- Clear and descriptive naming
- Proper code organization
- Adequate documentation
- DRY principle adherence
- SOLID principles
- Error handling completeness
- Test coverage

Output format:
- Style rating (excellent/good/needs-improvement)
- Style violations and inconsistencies
- Improvement suggestions
- Best practice recommendations`,
        temperature: 0.3,
        maxTokens: 2000,
        retryAttempts: 1,
        retryDelay: 1000,
      },
    ],
    maxParallel: 3,
    continueOnError: true,
    metadata: {
      name: 'Code Review Workflow',
      description: 'Parallel code review from security, performance, and style perspectives',
      version: '1.0.0',
      author: 'CCJK',
    },
  },
}

/**
 * Refactoring Workflow
 *
 * Sequential workflow: analyzer → planner → implementer → validator
 * Best for: Code refactoring with quality assurance
 */
export const refactoringTemplate: WorkflowTemplate = {
  id: 'refactoring',
  name: 'Refactoring',
  description: 'Systematic code refactoring with analysis, planning, and validation',
  category: 'maintenance',
  estimatedDuration: 30,
  requiredInputs: ['code-to-refactor', 'refactoring-goals'],
  expectedOutputs: ['analysis-report', 'refactoring-plan', 'refactored-code', 'validation-report'],
  tags: ['refactoring', 'code-quality', 'maintenance', 'improvement'],
  examples: [
    'Refactor legacy authentication module',
    'Extract reusable components from monolithic code',
    'Improve error handling across the application',
  ],
  config: {
    type: 'sequential',
    agents: [
      {
        role: 'analyzer',
        model: 'opus',
        systemPrompt: `You are a code analysis expert specializing in identifying refactoring opportunities.

Your responsibilities:
- Analyze code structure and organization
- Identify code smells and anti-patterns
- Assess technical debt
- Find duplication and redundancy
- Evaluate complexity metrics
- Identify coupling and cohesion issues

Analysis focus:
- Code smells (long methods, large classes, etc.)
- SOLID principle violations
- DRY violations
- Tight coupling
- Low cohesion
- Complex conditionals
- Magic numbers and strings

Output format:
- Code quality assessment
- Identified issues by category
- Complexity metrics
- Refactoring opportunities
- Priority recommendations`,
        temperature: 0.3,
        maxTokens: 3000,
        retryAttempts: 2,
        retryDelay: 1000,
      },
      {
        role: 'planner',
        model: 'opus',
        systemPrompt: `You are a refactoring strategist focused on safe, incremental improvements.

Your responsibilities:
- Create detailed refactoring plan
- Define refactoring steps and order
- Identify risks and mitigation strategies
- Plan for backward compatibility
- Define success criteria
- Estimate effort and impact

Planning approach:
1. Prioritize refactoring opportunities
2. Break down into small, safe steps
3. Identify dependencies
4. Plan for testing at each step
5. Consider rollback strategies
6. Define validation criteria

Output format:
- Refactoring strategy
- Step-by-step plan
- Risk assessment
- Testing strategy
- Success criteria`,
        temperature: 0.3,
        maxTokens: 3000,
        retryAttempts: 2,
        retryDelay: 1000,
      },
      {
        role: 'implementer',
        model: 'sonnet',
        systemPrompt: `You are a refactoring specialist focused on safe, incremental code improvements.

Your responsibilities:
- Execute refactoring plan step by step
- Maintain functionality while improving structure
- Apply design patterns appropriately
- Improve naming and organization
- Reduce complexity and duplication
- Preserve or improve test coverage

Refactoring techniques:
- Extract method/function
- Extract class/module
- Rename for clarity
- Simplify conditionals
- Remove duplication
- Improve error handling
- Apply design patterns

Guidelines:
- Make small, incremental changes
- Verify tests pass after each step
- Preserve existing behavior
- Improve readability
- Reduce complexity`,
        temperature: 0.2,
        maxTokens: 8000,
        retryAttempts: 3,
        retryDelay: 1000,
      },
      {
        role: 'validator',
        model: 'sonnet',
        systemPrompt: `You are a quality assurance expert focused on refactoring validation.

Your responsibilities:
- Verify refactoring goals were achieved
- Ensure functionality is preserved
- Validate code quality improvements
- Check test coverage
- Assess maintainability improvements
- Identify any regressions

Validation checklist:
- All tests pass
- Functionality unchanged
- Code quality metrics improved
- Complexity reduced
- Duplication eliminated
- Better organization
- Improved readability

Output format:
- Validation summary
- Goals achievement assessment
- Quality metrics comparison
- Identified issues
- Recommendations`,
        temperature: 0.3,
        maxTokens: 3000,
        retryAttempts: 2,
        retryDelay: 1000,
      },
    ],
    continueOnError: false,
    metadata: {
      name: 'Refactoring Workflow',
      description: 'Systematic code refactoring with analysis, planning, implementation, and validation',
      version: '1.0.0',
      author: 'CCJK',
    },
  },
}

/**
 * Documentation Workflow
 *
 * Sequential workflow: analyzer → writer → reviewer
 * Best for: Creating comprehensive documentation
 */
export const documentationTemplate: WorkflowTemplate = {
  id: 'documentation',
  name: 'Documentation',
  description: 'Comprehensive documentation generation with review',
  category: 'maintenance',
  estimatedDuration: 25,
  requiredInputs: ['code-or-feature', 'documentation-type'],
  expectedOutputs: ['documentation', 'examples', 'review-report'],
  tags: ['documentation', 'technical-writing', 'knowledge-sharing'],
  examples: [
    'Document new API endpoints',
    'Create user guide for feature',
    'Write technical architecture documentation',
  ],
  config: {
    type: 'sequential',
    agents: [
      {
        role: 'analyzer',
        model: 'sonnet',
        systemPrompt: `You are a technical analyst focused on understanding code and features for documentation.

Your responsibilities:
- Analyze code structure and functionality
- Identify key concepts and components
- Understand user workflows and use cases
- Extract important details and edge cases
- Identify documentation requirements
- Determine target audience

Analysis output:
- Component overview
- Key functionality
- User workflows
- Important details
- Documentation scope
- Target audience`,
        temperature: 0.3,
        maxTokens: 3000,
        retryAttempts: 2,
        retryDelay: 1000,
      },
      {
        role: 'writer',
        model: 'opus',
        systemPrompt: `You are a technical writer specializing in clear, comprehensive documentation.

Your responsibilities:
- Write clear, concise documentation
- Create practical examples
- Explain complex concepts simply
- Structure information logically
- Include code samples and diagrams
- Add troubleshooting guides

Documentation structure:
- Overview and purpose
- Getting started
- Detailed usage
- API reference (if applicable)
- Examples and tutorials
- Troubleshooting
- FAQ

Writing guidelines:
- Use clear, simple language
- Provide practical examples
- Include code snippets
- Add visual aids when helpful
- Consider different skill levels`,
        temperature: 0.4,
        maxTokens: 6000,
        retryAttempts: 2,
        retryDelay: 1000,
      },
      {
        role: 'reviewer',
        model: 'sonnet',
        systemPrompt: `You are a documentation reviewer focused on clarity, accuracy, and completeness.

Your responsibilities:
- Review documentation for accuracy
- Check clarity and readability
- Verify examples work correctly
- Ensure completeness
- Check formatting and structure
- Identify missing information

Review checklist:
- Technical accuracy
- Clarity and readability
- Example correctness
- Completeness
- Proper formatting
- Logical structure
- Grammar and spelling

Output format:
- Overall assessment
- Specific issues found
- Improvement suggestions
- Missing information`,
        temperature: 0.3,
        maxTokens: 3000,
        retryAttempts: 1,
        retryDelay: 1000,
      },
    ],
    continueOnError: false,
    metadata: {
      name: 'Documentation Workflow',
      description: 'Comprehensive documentation generation with analysis, writing, and review',
      version: '1.0.0',
      author: 'CCJK',
    },
  },
}

/**
 * All workflow templates
 */
export const workflowTemplates: Record<WorkflowTemplateId, WorkflowTemplate> = {
  'feature-development': featureDevelopmentTemplate,
  'bug-fix': bugFixTemplate,
  'code-review': codeReviewTemplate,
  'refactoring': refactoringTemplate,
  'documentation': documentationTemplate,
  'testing': {
    id: 'testing',
    name: 'Testing',
    description: 'Comprehensive test generation workflow',
    category: 'quality',
    estimatedDuration: 20,
    requiredInputs: ['code-to-test'],
    expectedOutputs: ['unit-tests', 'integration-tests', 'coverage-report'],
    tags: ['testing', 'quality', 'tdd'],
    config: {
      type: 'sequential',
      agents: [
        {
          role: 'test-planner',
          model: 'opus',
          systemPrompt: 'You are a test planning expert. Analyze code and create comprehensive test strategy.',
          temperature: 0.3,
          maxTokens: 3000,
        },
        {
          role: 'test-writer',
          model: 'sonnet',
          systemPrompt: 'You are a test engineer. Write comprehensive unit and integration tests.',
          temperature: 0.2,
          maxTokens: 6000,
        },
      ],
      metadata: {
        name: 'Testing Workflow',
        version: '1.0.0',
        author: 'CCJK',
      },
    },
  },
  'security-audit': {
    id: 'security-audit',
    name: 'Security Audit',
    description: 'Comprehensive security audit workflow',
    category: 'quality',
    estimatedDuration: 30,
    requiredInputs: ['code-or-system'],
    expectedOutputs: ['security-report', 'vulnerability-list', 'remediation-plan'],
    tags: ['security', 'audit', 'vulnerability'],
    config: {
      type: 'sequential',
      agents: [
        {
          role: 'security-auditor',
          model: 'opus',
          systemPrompt: 'You are a security auditor. Perform comprehensive security analysis.',
          temperature: 0.2,
          maxTokens: 4000,
        },
      ],
      metadata: {
        name: 'Security Audit Workflow',
        version: '1.0.0',
        author: 'CCJK',
      },
    },
  },
  'performance-optimization': {
    id: 'performance-optimization',
    name: 'Performance Optimization',
    description: 'Performance analysis and optimization workflow',
    category: 'maintenance',
    estimatedDuration: 35,
    requiredInputs: ['code-or-system', 'performance-metrics'],
    expectedOutputs: ['performance-analysis', 'optimization-plan', 'optimized-code'],
    tags: ['performance', 'optimization', 'efficiency'],
    config: {
      type: 'sequential',
      agents: [
        {
          role: 'performance-analyzer',
          model: 'opus',
          systemPrompt: 'You are a performance analyst. Identify bottlenecks and optimization opportunities.',
          temperature: 0.3,
          maxTokens: 3000,
        },
        {
          role: 'optimizer',
          model: 'sonnet',
          systemPrompt: 'You are a performance optimization expert. Implement optimizations.',
          temperature: 0.2,
          maxTokens: 6000,
        },
      ],
      metadata: {
        name: 'Performance Optimization Workflow',
        version: '1.0.0',
        author: 'CCJK',
      },
    },
  },
  'api-design': {
    id: 'api-design',
    name: 'API Design',
    description: 'RESTful API design and documentation workflow',
    category: 'design',
    estimatedDuration: 40,
    requiredInputs: ['api-requirements'],
    expectedOutputs: ['api-specification', 'implementation', 'documentation'],
    tags: ['api', 'design', 'rest', 'documentation'],
    config: {
      type: 'sequential',
      agents: [
        {
          role: 'api-designer',
          model: 'opus',
          systemPrompt: 'You are an API design expert. Design RESTful APIs following best practices.',
          temperature: 0.3,
          maxTokens: 4000,
        },
        {
          role: 'api-implementer',
          model: 'sonnet',
          systemPrompt: 'You are an API developer. Implement API endpoints according to specification.',
          temperature: 0.2,
          maxTokens: 6000,
        },
      ],
      metadata: {
        name: 'API Design Workflow',
        version: '1.0.0',
        author: 'CCJK',
      },
    },
  },
  'architecture-review': {
    id: 'architecture-review',
    name: 'Architecture Review',
    description: 'System architecture review and recommendations',
    category: 'design',
    estimatedDuration: 45,
    requiredInputs: ['architecture-documentation', 'system-requirements'],
    expectedOutputs: ['review-report', 'recommendations', 'improvement-plan'],
    tags: ['architecture', 'design', 'review', 'system-design'],
    config: {
      type: 'sequential',
      agents: [
        {
          role: 'architecture-reviewer',
          model: 'opus',
          systemPrompt: 'You are a system architect. Review architecture for scalability, maintainability, and best practices.',
          temperature: 0.3,
          maxTokens: 5000,
        },
      ],
      metadata: {
        name: 'Architecture Review Workflow',
        version: '1.0.0',
        author: 'CCJK',
      },
    },
  },
}

/**
 * Get workflow template by ID
 */
export function getWorkflowTemplate(id: WorkflowTemplateId): WorkflowTemplate | undefined {
  return workflowTemplates[id]
}

/**
 * Get all workflow templates
 */
export function getAllWorkflowTemplates(): WorkflowTemplate[] {
  return Object.values(workflowTemplates)
}

/**
 * Get workflow templates by category
 */
export function getWorkflowTemplatesByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return getAllWorkflowTemplates().filter(t => t.category === category)
}

/**
 * Search workflow templates by tags
 */
export function searchWorkflowTemplates(tags: string[]): WorkflowTemplate[] {
  return getAllWorkflowTemplates().filter(template =>
    tags.some(tag => template.tags.includes(tag)),
  )
}

/**
 * Get workflow template IDs
 */
export function getWorkflowTemplateIds(): WorkflowTemplateId[] {
  return Object.keys(workflowTemplates) as WorkflowTemplateId[]
}
