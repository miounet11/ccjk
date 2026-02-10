/**
 * Skill & MCP Recommendation Matcher
 */
import type { McpRecommendation, ProjectProfile, SkillRecommendation } from './types'

const SKILL_RULES: Array<{
  tags: string[]
  skill: Omit<SkillRecommendation, 'matchScore'>
}> = [
  {
    tags: ['typescript', 'javascript', 'python', 'go', 'rust', 'ruby', 'java'],
    skill: { id: 'git-commit', name: 'Smart Git Commit', description: 'AI-powered conventional commit messages', reason: 'Every project needs good commits', category: 'git' },
  },
  {
    tags: ['typescript', 'javascript', 'python', 'go', 'rust'],
    skill: { id: 'code-review', name: 'Code Review', description: 'Two-phase deep code review', reason: 'Catch bugs before they ship', category: 'review' },
  },
  {
    tags: ['react', 'vue', 'svelte', 'angular', 'frontend'],
    skill: { id: 'component-gen', name: 'Component Generator', description: 'Generate UI components with tests', reason: 'Frontend framework detected', category: 'dev' },
  },
  {
    tags: ['express', 'fastify', 'koa', 'nestjs', 'hono', 'backend'],
    skill: { id: 'api-design', name: 'API Design', description: 'Design RESTful/GraphQL APIs', reason: 'Backend framework detected', category: 'dev' },
  },
  {
    tags: ['backend', 'fullstack'],
    skill: { id: 'security-audit', name: 'Security Audit', description: 'Check for common vulnerabilities', reason: 'Server-side code needs security review', category: 'review' },
  },
  {
    tags: ['vitest', 'jest', 'pytest', 'mocha'],
    skill: { id: 'tdd-workflow', name: 'TDD Workflow', description: 'Test-driven development cycle', reason: 'Test framework detected', category: 'testing' },
  },
  {
    tags: ['playwright', 'cypress'],
    skill: { id: 'e2e-helper', name: 'E2E Test Helper', description: 'Generate end-to-end tests', reason: 'E2E framework detected', category: 'testing' },
  },
  {
    tags: ['docker'],
    skill: { id: 'docker-optimize', name: 'Docker Optimizer', description: 'Optimize Dockerfile', reason: 'Docker detected', category: 'devops' },
  },
  {
    tags: ['ci'],
    skill: { id: 'ci-pipeline', name: 'CI Pipeline', description: 'Optimize CI/CD pipeline', reason: 'CI configuration detected', category: 'devops' },
  },
  {
    tags: ['cli-tool', 'cli'],
    skill: { id: 'cli-ux', name: 'CLI UX Design', description: 'Better CLI interfaces', reason: 'CLI tool detected', category: 'dev' },
  },
  {
    tags: ['monorepo'],
    skill: { id: 'monorepo-manage', name: 'Monorepo Manager', description: 'Manage packages and releases', reason: 'Monorepo detected', category: 'dev' },
  },
  {
    tags: ['typescript', 'javascript', 'python'],
    skill: { id: 'doc-gen', name: 'Documentation Generator', description: 'Generate API docs and README', reason: 'Good docs improve maintainability', category: 'docs' },
  },
  {
    tags: ['react', 'vue', 'nextjs', 'nuxt', 'frontend'],
    skill: { id: 'perf-audit', name: 'Performance Audit', description: 'Bundle size and Core Web Vitals', reason: 'Frontend performance matters', category: 'review' },
  },
  {
    tags: ['nextjs', 'nuxt', 'astro', 'fullstack'],
    skill: { id: 'fullstack-debug', name: 'Fullstack Debugger', description: 'Debug across client/server boundary', reason: 'Fullstack framework detected', category: 'debug' },
  },
]

const MCP_RULES: Array<{
  tags: string[]
  mcp: Omit<McpRecommendation, 'matchScore'>
}> = [
  {
    tags: ['typescript', 'javascript', 'python', 'go', 'rust', 'ruby', 'java'],
    mcp: { id: 'context7', name: 'Context7', description: 'Up-to-date library docs', reason: 'Essential for accurate API usage' },
  },
  {
    tags: ['playwright', 'frontend', 'fullstack'],
    mcp: { id: 'playwright', name: 'Playwright MCP', description: 'Browser automation', reason: 'Frontend/E2E project detected' },
  },
  {
    tags: ['backend', 'fullstack', 'express', 'fastify', 'nestjs'],
    mcp: { id: 'sqlite', name: 'SQLite MCP', description: 'Local database', reason: 'Backend project detected' },
  },
  {
    tags: ['typescript', 'javascript', 'python', 'go', 'rust'],
    mcp: { id: 'mcp-search', name: 'Web Search', description: 'Search for docs and solutions', reason: 'Quick access to online resources' },
  },
]

export function matchSkills(profile: ProjectProfile): SkillRecommendation[] {
  const results: SkillRecommendation[] = []
  const seen = new Set<string>()

  for (const rule of SKILL_RULES) {
    if (seen.has(rule.skill.id)) continue
    const matchingTags = rule.tags.filter(t => profile.tags.includes(t))
    if (matchingTags.length === 0) continue

    const matchScore = Math.min(100, Math.round((matchingTags.length / rule.tags.length) * 100) + 20)
    results.push({ ...rule.skill, matchScore })
    seen.add(rule.skill.id)
  }

  results.sort((a, b) => b.matchScore - a.matchScore)
  return results
}

export function matchMcpServices(profile: ProjectProfile): McpRecommendation[] {
  const results: McpRecommendation[] = []
  const seen = new Set<string>()

  for (const rule of MCP_RULES) {
    if (seen.has(rule.mcp.id)) continue
    const matchingTags = rule.tags.filter(t => profile.tags.includes(t))
    if (matchingTags.length === 0) continue

    const matchScore = Math.min(100, Math.round((matchingTags.length / rule.tags.length) * 100) + 20)
    results.push({ ...rule.mcp, matchScore })
    seen.add(rule.mcp.id)
  }

  results.sort((a, b) => b.matchScore - a.matchScore)
  return results
}

export function getRecommendations(profile: ProjectProfile): {
  skills: SkillRecommendation[]
  mcpServices: McpRecommendation[]
  summary: string
} {
  const skills = matchSkills(profile)
  const mcpServices = matchMcpServices(profile)

  const parts: string[] = []
  if (profile.language !== 'unknown') parts.push(profile.language)
  parts.push(...profile.frameworks.slice(0, 3))
  const stackDesc = parts.join(' + ') || 'your project'

  return {
    skills,
    mcpServices,
    summary: `Found ${skills.length} skills and ${mcpServices.length} MCP services for ${stackDesc}`,
  }
}
