/**
 * Smart Agent Generator
 *
 * Generates Claude Code compatible agents based on project analysis
 */

import type { GeneratedAgent, GenerationContext } from './types'
import consola from 'consola'
import { recommendAgentCategories } from './project-analyzer'

const logger = consola.withTag('agent-generator')

/**
 * Generate agents based on project analysis
 */
export async function generateAgents(context: GenerationContext): Promise<GeneratedAgent[]> {
  logger.info('Generating agents...')

  const recommendedCategories = recommendAgentCategories(context.analysis)
  const agents: GeneratedAgent[] = []

  // Filter categories based on preferences
  const categoriesToGenerate = filterCategories(recommendedCategories, context)

  logger.info(`Generating agents for categories: ${categoriesToGenerate.join(', ')}`)

  // Generate agents for each category
  for (const category of categoriesToGenerate) {
    const agent = await generateAgentForCategory(category, context)
    if (agent && !context.existingAgents.includes(agent.id)) {
      agents.push(agent)
    }
  }

  // Sort by priority
  agents.sort((a, b) => b.priority - a.priority)

  // Limit to max agents
  const limitedAgents = agents.slice(0, context.preferences.maxAgents)

  logger.success(`Generated ${limitedAgents.length} agents`)

  return limitedAgents
}

/**
 * Filter categories based on user preferences
 */
function filterCategories(categories: string[], context: GenerationContext): string[] {
  const { preferences } = context
  const filtered: string[] = []

  for (const category of categories) {
    // Check if category should be included
    if (category.includes('testing') && !preferences.includeTesting)
      continue
    if (category.includes('deployment') && !preferences.includeDeployment)
      continue
    if (category.includes('documentation') && !preferences.includeDocumentation)
      continue
    if (category.includes('security') && !preferences.includeSecurity)
      continue
    if (category.includes('performance') && !preferences.includePerformance)
      continue

    filtered.push(category)
  }

  // Add custom categories
  if (preferences.customCategories) {
    filtered.push(...preferences.customCategories)
  }

  return [...new Set(filtered)]
}

/**
 * Generate agent for specific category
 */
async function generateAgentForCategory(
  category: string,
  context: GenerationContext,
): Promise<GeneratedAgent | null> {
  const { analysis, preferences } = context

  // Get agent template for category
  const template = getAgentTemplate(category, analysis.projectType)
  if (!template) {
    logger.warn(`No template found for category: ${category}`)
    return null
  }

  // Build agent from template
  const agent: GeneratedAgent = {
    id: template.id,
    name: template.name,
    description: template.description,
    model: template.model || preferences.defaultModel,
    specialization: template.specialization,
    competencies: template.competencies,
    workflow: template.workflow,
    outputFormat: template.outputFormat,
    bestPractices: template.bestPractices,
    integrationPoints: template.integrationPoints,
    qualityStandards: template.qualityStandards,
    category,
    priority: template.priority,
    tags: buildTags(category, analysis),
    source: 'smart-analysis',
  }

  return agent
}

/**
 * Build tags for agent based on category and analysis
 */
function buildTags(category: string, analysis: any): string[] {
  const tags: string[] = [category]

  // Add project type
  tags.push(analysis.projectType)

  // Add languages
  tags.push(...analysis.languages.map((l: any) => l.language))

  // Add frameworks
  tags.push(...analysis.frameworks.map((f: any) => f.name.toLowerCase()))

  return [...new Set(tags)]
}

/**
 * Get agent template for category
 */
function getAgentTemplate(category: string, projectType: string): Partial<GeneratedAgent> | null {
  const templates: Record<string, Partial<GeneratedAgent>> = {
    'code-generation': {
      id: 'code-generator',
      name: 'Code Generator',
      description: 'Specialized in generating high-quality, production-ready code',
      model: 'opus',
      specialization: 'Code generation, scaffolding, and boilerplate creation',
      competencies: [
        {
          name: 'Code Generation',
          description: 'Generate clean, maintainable code following best practices',
          skills: ['scaffolding', 'boilerplate', 'templates', 'code-patterns'],
        },
        {
          name: 'Framework Integration',
          description: 'Integrate with project frameworks and libraries',
          skills: ['framework-apis', 'library-usage', 'dependency-management'],
        },
      ],
      workflow: [
        {
          step: 1,
          name: 'Analyze Requirements',
          description: 'Understand what needs to be generated',
          inputs: ['user requirements', 'project context'],
          outputs: ['generation plan'],
        },
        {
          step: 2,
          name: 'Generate Code',
          description: 'Create code following project patterns',
          inputs: ['generation plan', 'project patterns'],
          outputs: ['generated code'],
        },
        {
          step: 3,
          name: 'Validate Output',
          description: 'Ensure code quality and correctness',
          inputs: ['generated code'],
          outputs: ['validated code'],
        },
      ],
      bestPractices: [
        'Follow project coding standards',
        'Use consistent naming conventions',
        'Add appropriate comments and documentation',
        'Ensure type safety',
        'Handle edge cases',
      ],
      priority: 10,
    },

    'code-review': {
      id: 'code-reviewer',
      name: 'Code Reviewer',
      description: 'Expert in code review, quality assurance, and best practices',
      model: 'opus',
      specialization: 'Code review, quality analysis, and improvement suggestions',
      competencies: [
        {
          name: 'Code Quality Analysis',
          description: 'Analyze code for quality, maintainability, and performance',
          skills: ['static-analysis', 'code-smells', 'anti-patterns', 'complexity-analysis'],
        },
        {
          name: 'Security Review',
          description: 'Identify security vulnerabilities and risks',
          skills: ['vulnerability-detection', 'security-best-practices', 'owasp-top-10'],
        },
      ],
      workflow: [
        {
          step: 1,
          name: 'Analyze Code',
          description: 'Review code structure and patterns',
          inputs: ['code files'],
          outputs: ['analysis report'],
        },
        {
          step: 2,
          name: 'Identify Issues',
          description: 'Find bugs, vulnerabilities, and improvements',
          inputs: ['analysis report'],
          outputs: ['issues list'],
        },
        {
          step: 3,
          name: 'Provide Recommendations',
          description: 'Suggest improvements and fixes',
          inputs: ['issues list'],
          outputs: ['recommendations'],
        },
      ],
      bestPractices: [
        'Focus on critical issues first',
        'Provide actionable feedback',
        'Suggest specific improvements',
        'Consider project context',
        'Balance perfectionism with pragmatism',
      ],
      priority: 9,
    },

    'testing': {
      id: 'test-engineer',
      name: 'Test Engineer',
      description: 'Specialized in test creation, automation, and quality assurance',
      model: 'sonnet',
      specialization: 'Test design, implementation, and automation',
      competencies: [
        {
          name: 'Test Design',
          description: 'Design comprehensive test strategies',
          skills: ['test-planning', 'test-cases', 'coverage-analysis'],
        },
        {
          name: 'Test Automation',
          description: 'Implement automated tests',
          skills: ['unit-tests', 'integration-tests', 'e2e-tests'],
        },
      ],
      workflow: [
        {
          step: 1,
          name: 'Analyze Code',
          description: 'Understand code to be tested',
          inputs: ['source code'],
          outputs: ['test plan'],
        },
        {
          step: 2,
          name: 'Write Tests',
          description: 'Create comprehensive test suite',
          inputs: ['test plan'],
          outputs: ['test files'],
        },
        {
          step: 3,
          name: 'Verify Coverage',
          description: 'Ensure adequate test coverage',
          inputs: ['test files'],
          outputs: ['coverage report'],
        },
      ],
      bestPractices: [
        'Aim for high test coverage',
        'Test edge cases',
        'Use descriptive test names',
        'Keep tests independent',
        'Mock external dependencies',
      ],
      priority: 8,
    },

    'frontend-development': {
      id: 'frontend-specialist',
      name: 'Frontend Specialist',
      description: 'Expert in frontend development, UI/UX, and modern frameworks',
      model: 'opus',
      specialization: 'Frontend architecture, component design, and user experience',
      competencies: [
        {
          name: 'Component Development',
          description: 'Build reusable, accessible components',
          skills: ['react', 'vue', 'component-patterns', 'accessibility'],
        },
        {
          name: 'State Management',
          description: 'Implement efficient state management',
          skills: ['redux', 'zustand', 'context-api', 'state-patterns'],
        },
      ],
      workflow: [
        {
          step: 1,
          name: 'Design Components',
          description: 'Plan component structure and props',
          inputs: ['requirements', 'design specs'],
          outputs: ['component design'],
        },
        {
          step: 2,
          name: 'Implement UI',
          description: 'Build components with styling',
          inputs: ['component design'],
          outputs: ['ui components'],
        },
        {
          step: 3,
          name: 'Optimize Performance',
          description: 'Ensure fast rendering and interactions',
          inputs: ['ui components'],
          outputs: ['optimized components'],
        },
      ],
      bestPractices: [
        'Use semantic HTML',
        'Ensure accessibility (WCAG)',
        'Optimize bundle size',
        'Implement responsive design',
        'Follow component best practices',
      ],
      priority: 9,
    },

    'backend-development': {
      id: 'backend-specialist',
      name: 'Backend Specialist',
      description: 'Expert in backend architecture, APIs, and data management',
      model: 'opus',
      specialization: 'Backend systems, API design, and database optimization',
      competencies: [
        {
          name: 'API Design',
          description: 'Design RESTful and GraphQL APIs',
          skills: ['rest', 'graphql', 'api-versioning', 'documentation'],
        },
        {
          name: 'Database Management',
          description: 'Optimize database queries and schema',
          skills: ['sql', 'nosql', 'orm', 'query-optimization'],
        },
      ],
      workflow: [
        {
          step: 1,
          name: 'Design Architecture',
          description: 'Plan backend structure and data flow',
          inputs: ['requirements'],
          outputs: ['architecture design'],
        },
        {
          step: 2,
          name: 'Implement APIs',
          description: 'Build endpoints and business logic',
          inputs: ['architecture design'],
          outputs: ['api implementation'],
        },
        {
          step: 3,
          name: 'Optimize Performance',
          description: 'Improve response times and scalability',
          inputs: ['api implementation'],
          outputs: ['optimized backend'],
        },
      ],
      bestPractices: [
        'Use proper HTTP status codes',
        'Implement authentication/authorization',
        'Validate input data',
        'Handle errors gracefully',
        'Document API endpoints',
      ],
      priority: 9,
    },

    'devops': {
      id: 'devops-engineer',
      name: 'DevOps Engineer',
      description: 'Specialized in CI/CD, deployment, and infrastructure',
      model: 'sonnet',
      specialization: 'Deployment automation, infrastructure as code, and monitoring',
      competencies: [
        {
          name: 'CI/CD Pipeline',
          description: 'Design and implement automated pipelines',
          skills: ['github-actions', 'gitlab-ci', 'jenkins', 'deployment-strategies'],
        },
        {
          name: 'Infrastructure Management',
          description: 'Manage cloud infrastructure and containers',
          skills: ['docker', 'kubernetes', 'terraform', 'cloud-platforms'],
        },
      ],
      workflow: [
        {
          step: 1,
          name: 'Design Pipeline',
          description: 'Plan CI/CD workflow',
          inputs: ['project requirements'],
          outputs: ['pipeline design'],
        },
        {
          step: 2,
          name: 'Implement Automation',
          description: 'Create deployment scripts',
          inputs: ['pipeline design'],
          outputs: ['automation scripts'],
        },
        {
          step: 3,
          name: 'Monitor Deployments',
          description: 'Set up monitoring and alerts',
          inputs: ['automation scripts'],
          outputs: ['monitoring setup'],
        },
      ],
      bestPractices: [
        'Automate everything possible',
        'Use infrastructure as code',
        'Implement blue-green deployments',
        'Monitor system health',
        'Maintain deployment documentation',
      ],
      priority: 7,
    },

    'security': {
      id: 'security-specialist',
      name: 'Security Specialist',
      description: 'Expert in security analysis, vulnerability detection, and best practices',
      model: 'opus',
      specialization: 'Security auditing, vulnerability assessment, and secure coding',
      competencies: [
        {
          name: 'Security Auditing',
          description: 'Identify security vulnerabilities',
          skills: ['owasp-top-10', 'penetration-testing', 'security-scanning'],
        },
        {
          name: 'Secure Coding',
          description: 'Implement security best practices',
          skills: ['input-validation', 'authentication', 'encryption', 'secure-apis'],
        },
      ],
      workflow: [
        {
          step: 1,
          name: 'Security Scan',
          description: 'Scan for vulnerabilities',
          inputs: ['codebase'],
          outputs: ['vulnerability report'],
        },
        {
          step: 2,
          name: 'Risk Assessment',
          description: 'Evaluate security risks',
          inputs: ['vulnerability report'],
          outputs: ['risk analysis'],
        },
        {
          step: 3,
          name: 'Remediation Plan',
          description: 'Provide security fixes',
          inputs: ['risk analysis'],
          outputs: ['remediation steps'],
        },
      ],
      bestPractices: [
        'Follow OWASP guidelines',
        'Implement defense in depth',
        'Use secure dependencies',
        'Regular security audits',
        'Encrypt sensitive data',
      ],
      priority: 8,
    },

    'documentation': {
      id: 'documentation-specialist',
      name: 'Documentation Specialist',
      description: 'Expert in technical writing, API documentation, and user guides',
      model: 'sonnet',
      specialization: 'Technical documentation, API docs, and knowledge management',
      competencies: [
        {
          name: 'Technical Writing',
          description: 'Create clear, comprehensive documentation',
          skills: ['markdown', 'api-docs', 'user-guides', 'tutorials'],
        },
        {
          name: 'Documentation Maintenance',
          description: 'Keep documentation up-to-date',
          skills: ['version-control', 'doc-generation', 'doc-testing'],
        },
      ],
      workflow: [
        {
          step: 1,
          name: 'Analyze Code',
          description: 'Understand functionality to document',
          inputs: ['source code'],
          outputs: ['documentation outline'],
        },
        {
          step: 2,
          name: 'Write Documentation',
          description: 'Create comprehensive docs',
          inputs: ['documentation outline'],
          outputs: ['documentation files'],
        },
        {
          step: 3,
          name: 'Review and Update',
          description: 'Ensure accuracy and completeness',
          inputs: ['documentation files'],
          outputs: ['final documentation'],
        },
      ],
      bestPractices: [
        'Use clear, simple language',
        'Include code examples',
        'Maintain consistent formatting',
        'Keep docs up-to-date',
        'Add diagrams where helpful',
      ],
      priority: 6,
    },

    'performance': {
      id: 'performance-optimizer',
      name: 'Performance Optimizer',
      description: 'Specialized in performance analysis and optimization',
      model: 'opus',
      specialization: 'Performance profiling, optimization, and monitoring',
      competencies: [
        {
          name: 'Performance Analysis',
          description: 'Identify performance bottlenecks',
          skills: ['profiling', 'benchmarking', 'metrics-analysis'],
        },
        {
          name: 'Optimization',
          description: 'Improve application performance',
          skills: ['code-optimization', 'caching', 'lazy-loading', 'bundle-optimization'],
        },
      ],
      workflow: [
        {
          step: 1,
          name: 'Profile Application',
          description: 'Measure current performance',
          inputs: ['application'],
          outputs: ['performance metrics'],
        },
        {
          step: 2,
          name: 'Identify Bottlenecks',
          description: 'Find performance issues',
          inputs: ['performance metrics'],
          outputs: ['bottleneck analysis'],
        },
        {
          step: 3,
          name: 'Optimize Code',
          description: 'Implement performance improvements',
          inputs: ['bottleneck analysis'],
          outputs: ['optimized code'],
        },
      ],
      bestPractices: [
        'Measure before optimizing',
        'Focus on critical paths',
        'Use caching strategically',
        'Optimize bundle size',
        'Monitor performance metrics',
      ],
      priority: 7,
    },
  }

  return templates[category] || null
}
