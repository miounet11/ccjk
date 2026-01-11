import type {
  AgentDefinition,
  GroupExport,
  GroupInstallResult,
  GroupRegistry,
  GroupSearchOptions,
  SubagentGroup,
} from './types'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'pathe'
import { CCJK_GROUPS_DIR } from '../constants'
import { writeFileAtomic } from '../utils/fs-operations'

const PREDEFINED_GROUPS: SubagentGroup[] = [
  // TypeScript Development Group
  {
    id: 'typescript-dev',
    name: { 'en': 'TypeScript Development', 'zh-CN': 'TypeScript 开发' },
    description: { 'en': 'Specialized agents for TypeScript development', 'zh-CN': 'TypeScript 开发专用代理' },
    category: 'language',
    version: '1.0.0',
    icon: '🔷',
    defaultEnabled: false,
    skills: ['ts-debug', 'ts-refactor', 'ts-test', 'ts-type-check', 'ts-migrate'],
    agents: [
      {
        id: 'ts-architect',
        name: 'TypeScript Architect',
        description: 'Designs TypeScript architecture, module structure, and type systems',
        model: 'sonnet',
        required: true,
        tags: ['typescript', 'architecture'],
        definition: `---
name: ts-architect
description: TypeScript architecture and type system expert
model: sonnet
---

# TypeScript Architect Agent

## CORE MISSION
Design robust TypeScript architectures with proper type safety, module organization, and scalable patterns.

## RESPONSIBILITIES
- Design type-safe API interfaces
- Create module structure and barrel exports
- Implement generic utility types
- Review type definitions for completeness
- Suggest TypeScript best practices

## ALLOWED ACTIONS
- Create/modify .ts and .tsx files
- Design type definitions
- Implement design patterns
- Review code architecture

## FORBIDDEN ACTIONS
- Do not modify test files (delegate to ts-tester)
- Do not handle runtime debugging (delegate to ts-debugger)
`,
      },
      {
        id: 'ts-debugger',
        name: 'TypeScript Debugger',
        description: 'Debugs TypeScript runtime issues and type errors',
        model: 'sonnet',
        required: true,
        tags: ['typescript', 'debug'],
        definition: `---
name: ts-debugger
description: TypeScript debugging and error resolution expert
model: sonnet
---

# TypeScript Debugger Agent

## CORE MISSION
Identify and resolve TypeScript compilation errors, runtime issues, and type mismatches.

## RESPONSIBILITIES
- Diagnose type errors
- Fix runtime exceptions
- Resolve module resolution issues
- Debug async/await problems
- Trace type inference failures

## ALLOWED ACTIONS
- Debug TypeScript code
- Fix type errors
- Add type assertions when needed
- Improve error handling
`,
      },
      {
        id: 'ts-tester',
        name: 'TypeScript Tester',
        description: 'Creates comprehensive TypeScript tests',
        model: 'haiku',
        required: false,
        tags: ['typescript', 'testing'],
        definition: `---
name: ts-tester
description: TypeScript testing specialist
model: haiku
---

# TypeScript Tester Agent

## CORE MISSION
Create comprehensive, type-safe tests for TypeScript codebases.

## RESPONSIBILITIES
- Write unit tests with proper typing
- Create integration tests
- Mock typed dependencies
- Test type guards and assertions
- Achieve high code coverage
`,
      },
    ],
  },

  // Python Development Group
  {
    id: 'python-dev',
    name: { 'en': 'Python Development', 'zh-CN': 'Python 开发' },
    description: { 'en': 'Specialized agents for Python development', 'zh-CN': 'Python 开发专用代理' },
    category: 'language',
    version: '1.0.0',
    icon: '🐍',
    defaultEnabled: false,
    skills: ['py-debug', 'py-refactor', 'py-test'],
    agents: [
      {
        id: 'py-architect',
        name: 'Python Architect',
        description: 'Designs Python architecture and package structure',
        model: 'sonnet',
        required: true,
        tags: ['python', 'architecture'],
        definition: `---
name: py-architect
description: Python architecture and design patterns expert
model: sonnet
---

# Python Architect Agent

## CORE MISSION
Design clean, Pythonic architectures with proper package structure and design patterns.

## RESPONSIBILITIES
- Design package/module structure
- Implement design patterns (Factory, Strategy, etc.)
- Create abstract base classes
- Design API interfaces
- Review architecture decisions
`,
      },
    ],
  },

  // SEO Team Group
  {
    id: 'seo-team',
    name: { 'en': 'SEO Team', 'zh-CN': 'SEO 团队' },
    description: { 'en': 'Complete SEO optimization team', 'zh-CN': '完整的 SEO 优化团队' },
    category: 'seo',
    version: '1.0.0',
    icon: '🔍',
    defaultEnabled: false,
    skills: ['seo-meta', 'seo-sitemap', 'seo-schema', 'seo-cwv'],
    agents: [
      {
        id: 'seo-meta-optimizer',
        name: 'Meta Tag Optimizer',
        description: 'Optimizes meta tags, titles, and descriptions for SEO',
        model: 'haiku',
        required: true,
        tags: ['seo', 'meta'],
        definition: `---
name: seo-meta-optimizer
description: SEO meta tag optimization specialist
model: haiku
---

# SEO Meta Optimizer Agent

## CORE MISSION
Optimize meta tags, titles, and descriptions for maximum search visibility.

## RESPONSIBILITIES
- Audit existing meta tags
- Write compelling title tags (50-60 chars)
- Create engaging meta descriptions (150-160 chars)
- Implement Open Graph tags
- Add Twitter Card meta tags
`,
      },
      {
        id: 'seo-content-analyst',
        name: 'Content Analyst',
        description: 'Analyzes content for SEO optimization opportunities',
        model: 'sonnet',
        required: true,
        tags: ['seo', 'content'],
        definition: `---
name: seo-content-analyst
description: SEO content analysis specialist
model: sonnet
---

# SEO Content Analyst Agent

## CORE MISSION
Analyze and optimize content for search engine visibility and user engagement.

## RESPONSIBILITIES
- Analyze keyword density
- Check heading hierarchy (H1-H6)
- Evaluate content structure
- Suggest internal linking
- Review image alt texts
`,
      },
      {
        id: 'seo-schema-expert',
        name: 'Schema Markup Expert',
        description: 'Implements structured data and schema markup',
        model: 'haiku',
        required: false,
        tags: ['seo', 'schema'],
        definition: `---
name: seo-schema-expert
description: Schema.org structured data specialist
model: haiku
---

# SEO Schema Expert Agent

## CORE MISSION
Implement proper Schema.org structured data for enhanced search results.

## RESPONSIBILITIES
- Add JSON-LD structured data
- Implement product schema
- Create article/blog schema
- Add organization schema
- Validate with Google Rich Results Test
`,
      },
    ],
  },

  // DevOps Team Group
  {
    id: 'devops-team',
    name: { 'en': 'DevOps Team', 'zh-CN': 'DevOps 团队' },
    description: { 'en': 'Complete DevOps and infrastructure team', 'zh-CN': '完整的 DevOps 和基础设施团队' },
    category: 'devops',
    version: '1.0.0',
    icon: '🚀',
    defaultEnabled: false,
    skills: ['devops-docker', 'devops-ci', 'devops-deploy', 'devops-monitor'],
    agents: [
      {
        id: 'devops-docker-expert',
        name: 'Docker Expert',
        description: 'Containerization and Docker configuration specialist',
        model: 'sonnet',
        required: true,
        tags: ['devops', 'docker'],
        definition: `---
name: devops-docker-expert
description: Docker and containerization specialist
model: sonnet
---

# Docker Expert Agent

## CORE MISSION
Create efficient, secure Docker configurations for applications.

## RESPONSIBILITIES
- Write optimized Dockerfiles
- Create docker-compose configurations
- Implement multi-stage builds
- Optimize image sizes
- Configure container networking
`,
      },
      {
        id: 'devops-ci-expert',
        name: 'CI/CD Expert',
        description: 'Continuous integration and deployment specialist',
        model: 'sonnet',
        required: true,
        tags: ['devops', 'ci', 'cd'],
        definition: `---
name: devops-ci-expert
description: CI/CD pipeline specialist
model: sonnet
---

# CI/CD Expert Agent

## CORE MISSION
Design and implement robust CI/CD pipelines for automated testing and deployment.

## RESPONSIBILITIES
- Create GitHub Actions workflows
- Set up GitLab CI pipelines
- Configure automated testing
- Implement deployment strategies
- Set up artifact management
`,
      },
    ],
  },

  // Security Team Group
  {
    id: 'security-team',
    name: { 'en': 'Security Team', 'zh-CN': '安全团队' },
    description: { 'en': 'Security audit and vulnerability assessment team', 'zh-CN': '安全审计和漏洞评估团队' },
    category: 'devops',
    version: '1.0.0',
    icon: '🔒',
    defaultEnabled: false,
    skills: [],
    agents: [
      {
        id: 'security-auditor',
        name: 'Security Auditor',
        description: 'Performs security audits and vulnerability assessments',
        model: 'opus',
        required: true,
        tags: ['security', 'audit'],
        definition: `---
name: security-auditor
description: Security audit and vulnerability assessment specialist
model: opus
---

# Security Auditor Agent

## CORE MISSION
Identify and report security vulnerabilities, ensuring code follows security best practices.

## RESPONSIBILITIES
- Audit code for OWASP Top 10 vulnerabilities
- Check for SQL injection risks
- Identify XSS vulnerabilities
- Review authentication implementations
- Check authorization logic
- Audit dependency security
- Review secrets management
`,
      },
    ],
  },
]

// In-memory registry
let registry: GroupRegistry | null = null

/**
 * Ensure groups directory exists
 */
export function ensureGroupsDir(): void {
  if (!existsSync(CCJK_GROUPS_DIR)) {
    mkdirSync(CCJK_GROUPS_DIR, { recursive: true })
  }
}

/**
 * Get the groups registry
 */
export function getRegistry(): GroupRegistry {
  if (!registry) {
    registry = loadRegistry()
  }
  return registry
}

/**
 * Load registry from disk
 */
function loadRegistry(): GroupRegistry {
  ensureGroupsDir()

  const groups = new Map<string, SubagentGroup>()
  const enabledGroups = new Set<string>()
  const registryFile = join(CCJK_GROUPS_DIR, 'registry.json')

  // Load registry file
  if (existsSync(registryFile)) {
    try {
      const data = JSON.parse(readFileSync(registryFile, 'utf-8'))
      for (const group of data.groups || []) {
        groups.set(group.id, group)
      }
      for (const id of data.enabled || []) {
        enabledGroups.add(id)
      }
    }
    catch {
      // Start fresh
    }
  }

  // Load predefined groups if registry is empty
  if (groups.size === 0) {
    for (const group of PREDEFINED_GROUPS) {
      groups.set(group.id, group)
      if (group.defaultEnabled) {
        enabledGroups.add(group.id)
      }
    }
    saveRegistry({ groups, enabledGroups, lastUpdated: new Date() })
  }

  return {
    groups,
    enabledGroups,
    lastUpdated: new Date(),
  }
}

/**
 * Save registry to disk
 */
function saveRegistry(reg: GroupRegistry): void {
  ensureGroupsDir()
  const registryFile = join(CCJK_GROUPS_DIR, 'registry.json')
  const data = {
    groups: Array.from(reg.groups.values()),
    enabled: Array.from(reg.enabledGroups),
    lastUpdated: reg.lastUpdated.toISOString(),
  }
  writeFileAtomic(registryFile, JSON.stringify(data, null, 2))
}

/**
 * Refresh registry from disk
 */
export function refreshRegistry(): void {
  registry = loadRegistry()
}

/**
 * Get all groups
 */
export function getAllGroups(): SubagentGroup[] {
  return Array.from(getRegistry().groups.values())
}

/**
 * Get group by ID
 */
export function getGroup(id: string): SubagentGroup | undefined {
  return getRegistry().groups.get(id)
}

/**
 * Check if group is enabled
 */
export function isGroupEnabled(id: string): boolean {
  return getRegistry().enabledGroups.has(id)
}

/**
 * Search groups
 */
export function searchGroups(options: GroupSearchOptions): SubagentGroup[] {
  let groups = getAllGroups()

  if (options.category) {
    groups = groups.filter(g => g.category === options.category)
  }

  if (options.enabled !== undefined) {
    const enabledSet = getRegistry().enabledGroups
    groups = groups.filter(g =>
      options.enabled ? enabledSet.has(g.id) : !enabledSet.has(g.id),
    )
  }

  if (options.query) {
    const query = options.query.toLowerCase()
    groups = groups.filter(g =>
      g.id.toLowerCase().includes(query)
      || g.name.en.toLowerCase().includes(query)
      || g.name['zh-CN'].toLowerCase().includes(query),
    )
  }

  if (options.limit) {
    groups = groups.slice(0, options.limit)
  }

  return groups
}

/**
 * Enable a group
 */
export function enableGroup(id: string): boolean {
  const reg = getRegistry()
  if (!reg.groups.has(id))
    return false

  reg.enabledGroups.add(id)
  reg.lastUpdated = new Date()
  saveRegistry(reg)
  return true
}

/**
 * Disable a group
 */
export function disableGroup(id: string): boolean {
  const reg = getRegistry()
  if (!reg.groups.has(id))
    return false

  reg.enabledGroups.delete(id)
  reg.lastUpdated = new Date()
  saveRegistry(reg)
  return true
}

/**
 * Add a custom group
 */
export function addGroup(group: SubagentGroup): GroupInstallResult {
  const reg = getRegistry()

  try {
    reg.groups.set(group.id, group)
    if (group.defaultEnabled) {
      reg.enabledGroups.add(group.id)
    }
    reg.lastUpdated = new Date()
    saveRegistry(reg)

    return {
      groupId: group.id,
      success: true,
      installedAgents: group.agents.map(a => a.id),
      installedSkills: group.skills,
    }
  }
  catch (error) {
    return {
      groupId: group.id,
      success: false,
      installedAgents: [],
      installedSkills: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Remove a group
 */
export function removeGroup(id: string): boolean {
  const reg = getRegistry()
  if (!reg.groups.has(id))
    return false

  reg.groups.delete(id)
  reg.enabledGroups.delete(id)
  reg.lastUpdated = new Date()
  saveRegistry(reg)
  return true
}

/**
 * Export groups
 */
export function exportGroups(groupIds?: string[]): GroupExport {
  const groups = groupIds
    ? groupIds.map(id => getGroup(id)).filter(Boolean) as SubagentGroup[]
    : getAllGroups()

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    groups,
  }
}

/**
 * Import groups
 */
export function importGroups(data: GroupExport): GroupInstallResult[] {
  return data.groups.map(group => addGroup(group))
}

/**
 * Get all enabled agents from all enabled groups
 */
export function getEnabledAgents(): AgentDefinition[] {
  const reg = getRegistry()
  const agents: AgentDefinition[] = []

  for (const groupId of reg.enabledGroups) {
    const group = reg.groups.get(groupId)
    if (group) {
      agents.push(...group.agents)
    }
  }

  return agents
}

/**
 * Get all enabled skills from all enabled groups
 */
export function getEnabledSkillIds(): string[] {
  const reg = getRegistry()
  const skills: string[] = []

  for (const groupId of reg.enabledGroups) {
    const group = reg.groups.get(groupId)
    if (group) {
      skills.push(...group.skills)
    }
  }

  return [...new Set(skills)]
}

// =============================================================================
// PREDEFINED GROUPS
// =============================================================================
